const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

class SSHManager {
    constructor() {
        this.connections = new Map();
        this.lastErrorLogged = 0;
        this.operationQueue = new Map(); // Fila de operações para evitar duplicatas
        this.cooldownPeriod = 5000; // 5 segundos de cooldown entre operações similares
    }

    // Gerar chave única para operação
    generateOperationKey(operation, ...params) {
        return `${operation}_${params.join('_')}`;
    }

    // Verificar se operação está em cooldown
    isOperationInCooldown(operationKey) {
        const lastExecution = this.operationQueue.get(operationKey);
        if (lastExecution && Date.now() - lastExecution < this.cooldownPeriod) {
            console.log(`⏳ Operação ${operationKey} em cooldown, ignorando...`);
            return true;
        }
        return false;
    }

    // Marcar operação como executada
    markOperationExecuted(operationKey) {
        this.operationQueue.set(operationKey, Date.now());
    }

    async getConnection(serverId) {
        try {
            const db = require('./database');

            // Verificar cooldown para conexões
            const cooldownKey = `connection_${serverId}`;
            // Remover cooldown para conexões críticas
            // if (this.isOperationInCooldown(cooldownKey)) {
            //   const [serverRows] = await db.execute(
            //     'SELECT ip, porta_ssh FROM wowza_servers WHERE codigo = ? AND status = "ativo"',
            //     [serverId]
            //   );
            //   if (serverRows.length > 0) {
            //     const server = serverRows[0];
            //     const connectionKey = `${server.ip}:${server.porta_ssh}`;
            //     if (this.connections.has(connectionKey)) {
            //       return this.connections.get(connectionKey);
            //     }
            //   }
            // }

            // Buscar dados do servidor no banco
            const [serverRows] = await db.execute(
                'SELECT ip, porta_ssh, senha_root FROM wowza_servers WHERE codigo = ? AND status = "ativo"',
                [serverId]
            );

            if (serverRows.length === 0) {
                throw new Error('Servidor não encontrado ou inativo');
            }

            const server = serverRows[0];
            const connectionKey = `${server.ip}:${server.porta_ssh}`;

            // Reaproveitar conexão ativa se já existir
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                if (existingConn.conn && existingConn.connected) {
                    return existingConn;
                }
                // Remover conexão inválida
                this.connections.delete(connectionKey);
            }

            // Criar nova conexão SSH
            const conn = new Client();

            return await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout ao conectar no servidor ${server.ip}`));
                }, 35000);

                conn.on('ready', () => {
                    clearTimeout(timeout);
                    console.log(`✅ Conectado via SSH ao servidor ${server.ip}`);

                    const connectionData = {
                        conn,
                        server,
                        connected: true,
                        lastUsed: new Date()
                    };

                    this.connections.set(connectionKey, connectionData);
                    this.markOperationExecuted(cooldownKey);
                    resolve(connectionData);
                });

                conn.on('error', (err) => {
                    clearTimeout(timeout);
                    console.error(`❌ Erro SSH para ${server.ip}:`, err.message);
                    reject(err);
                });

                conn.on('close', () => {
                    console.log(`🔌 Conexão SSH fechada para ${server.ip}`);
                    this.connections.delete(connectionKey);
                });

                conn.connect({
                    host: server.ip,
                    port: server.porta_ssh || 22,
                    username: 'root',
                    password: server.senha_root,
                    readyTimeout: 30000,
                    keepaliveInterval: 30000
                });
            });
        } catch (error) {
            console.error('Erro ao obter conexão SSH:', error.message);
            throw error;
        }
    }

    async executeCommand(serverId, command) {
        try {
            const { conn } = await this.getConnection(serverId);

            return new Promise((resolve, reject) => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    let stdout = '';
                    let stderr = '';

                    stream.on('close', (code, signal) => {
                        if (code === 0) {
                            resolve({ success: true, stdout, stderr, code });
                        } else {
                            reject(new Error(`Comando falhou com código ${code}: ${stderr}`));
                        }
                    });

                    stream.on('data', (data) => {
                        stdout += data.toString();
                    });

                    stream.stderr.on('data', (data) => {
                        stderr += data.toString();
                    });
                });
            });
        } catch (error) {
            console.error('Erro ao executar comando SSH:', error);
            throw error;
        }
    }

    async uploadFile(serverId, localPath, remotePath) {
        try {
            const { conn } = await this.getConnection(serverId);

            return new Promise((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Criar diretório remoto se não existir
                    const remoteDir = path.dirname(remotePath);
                    sftp.mkdir(remoteDir, { mode: 0o755 }, (mkdirErr) => {
                        // Ignorar erro se diretório já existir

                        sftp.fastPut(localPath, remotePath, (uploadErr) => {
                            if (uploadErr) {
                                reject(uploadErr);
                                return;
                            }

                            // Definir permissões do arquivo
                            sftp.chmod(remotePath, 0o644, (chmodErr) => {
                                if (chmodErr) {
                                    console.warn('Aviso: Não foi possível definir permissões:', chmodErr);
                                }

                                resolve({ success: true, remotePath });
                            });
                        });
                    });
                });
            });
        } catch (error) {
            console.error('Erro ao fazer upload via SSH:', error);
            throw error;
        }
    }

    async createUserDirectory(serverId, userLogin) {
        try {
            // Verificar cooldown para criação de diretório
            const operationKey = this.generateOperationKey('createUserDirectory', serverId, userLogin);
            // Remover cooldown para criação de diretórios críticos
            // if (this.isOperationInCooldown(operationKey)) {
            //   console.log(`⏭️ Pulando criação de diretório (cooldown): ${userLogin}`);
            //   return { success: true, userDir: `/home/streaming/${userLogin}` };
            // }

            // Nova estrutura: /home/streaming/[usuario]
            const userDir = `/home/streaming/${userLogin}`;

            // Verificar se diretório já existe antes de criar
            const checkResult = await this.executeCommand(serverId, `test -d "${userDir}" && echo "EXISTS" || echo "NOT_EXISTS"`);
            if (checkResult.stdout.includes('EXISTS')) {
                console.log(`✅ Diretório já existe: ${userDir}`);
                this.markOperationExecuted(operationKey);
                return { success: true, userDir };
            }

            const commands = [
                `mkdir -p ${userDir}`,
                `mkdir -p ${userDir}/recordings`,
                `mkdir -p ${userDir}/logos`,
                `chown -R streaming:streaming ${userDir} || true`,
                `chmod -R 755 ${userDir} || true`
            ];

            for (const command of commands) {
                try {
                    const result = await this.executeCommand(serverId, command);
                    if (result.stderr) {
                        console.warn(`⚠️ Aviso no comando "${command}": ${result.stderr}`);
                    }
                } catch (cmdError) {
                    console.warn(`⚠️ Erro no comando "${command}": ${cmdError.message}`);
                    // Continuar mesmo com erros de permissão
                }
            }

            console.log(`✅ Estrutura de diretório verificada/criada para usuário ${userLogin}`);

            this.markOperationExecuted(operationKey);

            return { success: true, userDir };
        } catch (error) {
            console.error(`Erro ao criar diretório para usuário ${userLogin}:`, error);
            throw error;
        }
    }

    async createUserFolder(serverId, userLogin, folderName) {
        try {
            // Verificar cooldown para criação de pasta
            const operationKey = this.generateOperationKey('createUserFolder', serverId, userLogin, folderName);
            // Remover cooldown para criação de pastas críticas
            // if (this.isOperationInCooldown(operationKey)) {
            //   console.log(`⏭️ Pulando criação de pasta (cooldown): ${folderName}`);
            //   return { success: true, folderPath: `/home/streaming/${userLogin}/${folderName}` };
            // }

            // Estrutura correta: /home/streaming/[usuario]/[pasta]
            const folderPath = `/home/streaming/${userLogin}/${folderName}`;

            // Verificar se pasta já existe
            const checkResult = await this.executeCommand(serverId, `test -d "${folderPath}" && echo "EXISTS" || echo "NOT_EXISTS"`);
            if (checkResult.stdout.includes('EXISTS')) {
                console.log(`✅ Pasta já existe: ${folderPath}`);
                this.markOperationExecuted(operationKey);
                return { success: true, folderPath };
            }

            const commands = [
                `mkdir -p ${folderPath}`,
                `chmod 755 ${folderPath}`,
                `chown streaming:streaming ${folderPath} 2>/dev/null || true`
            ];

            for (const command of commands) {
                try {
                    const result = await this.executeCommand(serverId, command);
                    if (result.stderr) {
                        console.warn(`⚠️ Aviso: ${result.stderr}`);
                    }
                } catch (cmdError) {
                    console.warn(`⚠️ Erro: ${cmdError.message}`);
                    // Continuar mesmo com erros de permissão
                }
            }

            // Verificar se pasta foi criada (sem aguardar)
            const finalCheckResult = await this.executeCommand(serverId, `test -d "${folderPath}" && echo "EXISTS" || echo "NOT_EXISTS"`);

            if (!finalCheckResult.stdout.includes('EXISTS')) {
                throw new Error(`Pasta não foi criada: ${folderPath}`);
            }

            console.log(`✅ Pasta ${folderName} criada: ${folderPath}`);
            this.markOperationExecuted(operationKey);

            return { success: true, folderPath };
        } catch (error) {
            console.error(`Erro ao criar pasta ${folderName}:`, error);
            throw error;
        }
    }

    // Criar estrutura completa do usuário (streaming + wowza)
    async createCompleteUserStructure(serverId, userLogin, userConfig) {
        try {
            // Verificar cooldown para estrutura completa
            const operationKey = this.generateOperationKey('createCompleteUserStructure', serverId, userLogin);
            // Verificar se estrutura já existe antes de criar
            const userDir = `/home/streaming/${userLogin}`;
            const dirExists = await this.checkDirectoryExists(serverId, userDir);
            
            if (dirExists) {
              console.log(`✅ Estrutura já existe para usuário: ${userLogin}`);
              return { success: true };
            }

            console.log(`🏗️ Criando estrutura completa para usuário: ${userLogin}`);

            // Criar apenas estrutura básica de streaming
            await this.createUserDirectory(serverId, userLogin);

            this.markOperationExecuted(operationKey);
            return { success: true };

        } catch (error) {
            console.error(`Erro ao criar estrutura completa para ${userLogin}:`, error);
            throw error;
        }
    }

    // Verificar estrutura completa do usuário
    async checkCompleteUserStructure(serverId, userLogin) {
        try {
            // Verificar cooldown para verificação de estrutura
            const operationKey = this.generateOperationKey('checkCompleteUserStructure', serverId, userLogin);
            // Sempre verificar estrutura real sem cooldown
            // if (this.isOperationInCooldown(operationKey)) {
            //   // Retornar resultado em cache se disponível
            //   return {
            //     streaming_directory: true,
            //     complete: true
            //   };
            // }

            // Verificar estrutura de streaming
            const streamingPath = `/home/streaming/${userLogin}`;
            const streamingExists = await this.checkDirectoryExists(serverId, streamingPath);

            this.markOperationExecuted(operationKey);

            return {
                streaming_directory: streamingExists,
                complete: streamingExists
            };

        } catch (error) {
            console.error(`Erro ao verificar estrutura completa do usuário ${userLogin}:`, error);
            return {
                streaming_directory: false,
                complete: false,
                error: error.message
            };
        }
    }

    async checkDirectoryExists(serverId, dirPath) {
        try {
            // Cache simples para verificações de diretório
            const cacheKey = `dir_exists_${serverId}_${dirPath}`;
            const cached = this.operationQueue.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < 30000) { // Cache por 30s
                return cached.result;
            }

            // Escapar o caminho para evitar problemas
            const safePath = dirPath.replace(/(["\s'$`\\])/g, '\\$1');
            const command = `test -d "${safePath}" && echo "EXISTS" || echo "NOT_EXISTS"`;

            const result = await this.executeCommand(serverId, command);
            const exists = result.stdout.includes('EXISTS');

            // Salvar no cache
            this.operationQueue.set(cacheKey, {
                timestamp: Date.now(),
                result: exists
            });

            return exists;
        } catch (error) {
            console.warn(`Erro ao verificar diretório ${dirPath}:`, error.message);
            return false;
        }
    }

    // Limpar cache periodicamente
    startCacheCleanup() {
        if (this.cacheCleanupInterval) return; // evita criar interval duplicado

        this.cacheCleanupInterval = setInterval(() => {
            const now = Date.now();

            for (const [key, value] of this.operationQueue.entries()) {
                if (typeof value === 'object' && value.timestamp && now - value.timestamp > 60000) {
                    this.operationQueue.delete(key);
                } else if (typeof value === 'number' && now - value > this.cooldownPeriod * 2) {
                    this.operationQueue.delete(key);
                }
            }
        }, 60000); // limpar a cada minuto
    }

    // Método otimizado para verificar e obter informações de pasta
    async getFolderInfo(serverId, folderPath) {
        try {
            // Cache para informações de pasta
            const cacheKey = `folder_info_${serverId}_${folderPath}`;
            const cached = this.operationQueue.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 15000) { // Cache por 15 segundos
                return cached.result;
            }

            // Comando combinado para verificar existência e obter informações
            const command = `if [ -d "${folderPath}" ]; then echo "EXISTS"; find "${folderPath}" -type f | wc -l; du -sb "${folderPath}" 2>/dev/null | cut -f1 || echo "0"; else echo "NOT_EXISTS"; fi`;
            const result = await this.executeCommand(serverId, command);

            const lines = result.stdout.trim().split('\n');

            let folderInfo;
            if (lines[0] === 'EXISTS') {
                const fileCount = parseInt(lines[1]) || 0;
                const sizeBytes = parseInt(lines[2]) || 0;

                folderInfo = {
                    exists: true,
                    file_count: fileCount,
                    size_bytes: sizeBytes,
                    size_mb: Math.ceil(sizeBytes / (1024 * 1024)),
                    path: folderPath
                };
            } else {
                folderInfo = {
                    exists: false,
                    file_count: 0,
                    size_bytes: 0,
                    size_mb: 0,
                    path: folderPath
                };
            }

            // Salvar no cache
            this.operationQueue.set(cacheKey, {
                timestamp: Date.now(),
                result: folderInfo
            });

            return folderInfo;
        } catch (error) {
            console.warn(`Erro ao obter informações da pasta ${folderPath}:`, error.message);
            return {
                exists: false,
                error: error.message,
                path: folderPath
            };
        }
    }

    async deleteFile(serverId, remotePath) {
        try {
            const command = `rm -f "${remotePath}"`;
            await this.executeCommand(serverId, command);

            console.log(`✅ Arquivo removido: ${remotePath}`);
            return { success: true };
        } catch (error) {
            console.error(`Erro ao remover arquivo ${remotePath}:`, error);
            throw error;
        }
    }

    async listFiles(serverId, remotePath) {
        try {
            const command = `ls -la "${remotePath}"`;
            const result = await this.executeCommand(serverId, command);

            return { success: true, files: result.stdout };
        } catch (error) {
            console.error(`Erro ao listar arquivos em ${remotePath}:`, error);
            throw error;
        }
    }

    async getFileInfo(serverId, remotePath) {
        try {
            const command = `stat "${remotePath}" 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS"`;
            const result = await this.executeCommand(serverId, command);

            if (result.stdout.includes('NOT_EXISTS')) {
                return { exists: false };
            }

            // Se existe, obter informações detalhadas
            const detailsCommand = `ls -la "${remotePath}" 2>/dev/null`;
            const detailsResult = await this.executeCommand(serverId, detailsCommand);

            return {
                exists: true,
                info: detailsResult.stdout,
                size: this.extractFileSize(detailsResult.stdout),
                permissions: this.extractPermissions(detailsResult.stdout)
            };
        } catch (error) {
            return { exists: false };
        }
    }

    extractFileSize(lsOutput) {
        try {
            const parts = lsOutput.trim().split(/\s+/);
            return parseInt(parts[4]) || 0;
        } catch (error) {
            return 0;
        }
    }

    extractPermissions(lsOutput) {
        try {
            const parts = lsOutput.trim().split(/\s+/);
            return parts[0] || '';
        } catch (error) {
            return '';
        }
    }

    closeConnection(serverId) {
        try {
            const db = require('./database');
            db.execute('SELECT ip, porta_ssh FROM wowza_servers WHERE codigo = ?', [serverId])
                .then(([serverRows]) => {
                    if (serverRows.length > 0) {
                        const server = serverRows[0];
                        const connectionKey = `${server.ip}:${server.porta_ssh}`;

                        if (this.connections.has(connectionKey)) {
                            const { conn } = this.connections.get(connectionKey);
                            conn.end();
                            this.connections.delete(connectionKey);
                            console.log(`🔌 Conexão SSH fechada para ${server.ip}`);
                        }
                    }
                });
        } catch (error) {
            console.error('Erro ao fechar conexão SSH:', error);
        }
    }

    closeAllConnections() {
        for (const [key, { conn }] of this.connections) {
            try {
                conn.end();
                console.log(`🔌 Conexão SSH fechada: ${key}`);
            } catch (error) {
                console.error(`Erro ao fechar conexão ${key}:`, error);
            }
        }
        this.connections.clear();
    }
}

module.exports = new SSHManager();