const { Client } = require('basic-ftp');
const fs = require('fs').promises;
const path = require('path');
const SSHManager = require('./SSHManager');
const db = require('./database');

class FTPManager {
    constructor() {
        this.activeConnections = new Map();
        this.activeMigrations = new Map();
        this.connectionTimeout = 30 * 60 * 1000; // 30 minutos
        
        this.startCleanupTimer();
    }

    // Conectar ao servidor FTP
    async connect(userId, connectionData) {
        try {
            const { ip, usuario, senha, porta = 21 } = connectionData;
            
            console.log(`🔌 Conectando ao FTP: ${usuario}@${ip}:${porta}`);

            const client = new Client();
            client.ftp.timeout = 30000;

            await client.access({
                host: ip,
                port: porta,
                user: usuario,
                password: senha,
                secure: false
            });

            console.log(`✅ Conectado ao FTP com sucesso`);

            // Salvar conexão
            this.activeConnections.set(userId, {
                client: client,
                connectionData: connectionData,
                connectedAt: new Date(),
                lastUsed: new Date()
            });

            return {
                success: true,
                message: 'Conectado com sucesso'
            };

        } catch (error) {
            console.error('❌ Erro na conexão FTP:', error);
            
            let errorMessage = 'Erro ao conectar ao servidor FTP';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Conexão recusada. Verifique IP e porta.';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'Servidor não encontrado. Verifique o IP.';
            } else if (error.code === 530) {
                errorMessage = 'Usuário ou senha incorretos.';
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage = 'Timeout na conexão. Servidor pode estar offline.';
            }

            throw new Error(errorMessage);
        }
    }

    // Obter conexão ativa ou reconectar
    async getConnection(userId) {
        const connectionInfo = this.activeConnections.get(userId);
        
        if (!connectionInfo) {
            throw new Error('Conexão FTP não encontrada. Conecte-se novamente.');
        }

        // Verificar se conexão ainda está válida
        try {
            await connectionInfo.client.ensureDir('/');
            connectionInfo.lastUsed = new Date();
            return connectionInfo.client;
        } catch (error) {
            console.log('🔄 Reconectando ao FTP...');
            
            // Reconectar
            const newClient = new Client();
            newClient.ftp.timeout = 30000;
            
            await newClient.access(connectionInfo.connectionData);
            
            // Atualizar conexão
            connectionInfo.client = newClient;
            connectionInfo.lastUsed = new Date();
            this.activeConnections.set(userId, connectionInfo);
            
            return newClient;
        }
    }

    // Listar arquivos de um diretório
    async listDirectory(userId, directoryPath) {
        try {
            const client = await this.getConnection(userId);
            
            console.log(`📁 Listando diretório: ${directoryPath}`);
            
            const fileList = await client.list(directoryPath);
            
            const files = fileList.map(file => {
                const fullPath = path.posix.join(directoryPath, file.name);
                const isVideo = file.type === 1 && /\.(mp4|avi|mov|wmv|flv|webm|mkv|3gp|ts|mpg|mpeg|ogv|m4v)$/i.test(file.name);
                
                return {
                    name: file.name,
                    type: file.type === 2 ? 'directory' : 'file',
                    path: fullPath,
                    size: file.size || 0,
                    isVideo: isVideo,
                    modifiedAt: file.modifiedAt || new Date(),
                    permissions: file.permissions || 0
                };
            });

            // Adicionar entrada para diretório pai (se não for raiz)
            if (directoryPath !== '/') {
                const parentPath = path.posix.dirname(directoryPath);
                files.unshift({
                    name: '..',
                    type: 'directory',
                    path: parentPath,
                    size: 0,
                    isVideo: false,
                    modifiedAt: new Date(),
                    permissions: 0
                });
            }

            return {
                success: true,
                files: files,
                currentPath: directoryPath,
                videoCount: files.filter(f => f.isVideo).length
            };

        } catch (error) {
            console.error('❌ Erro ao listar diretório:', error);
            throw new Error(`Erro ao acessar diretório: ${error.message}`);
        }
    }

    // Escanear diretório recursivamente
    async scanDirectoryRecursive(userId, directoryPath, maxDepth = 5) {
        try {
            const client = await this.getConnection(userId);
            
            console.log(`🔍 Escaneando recursivamente: ${directoryPath}`);
            
            const videos = [];
            const scannedDirs = new Set();
            
            const scanDirectory = async (currentPath, depth = 0) => {
                if (depth > maxDepth || scannedDirs.has(currentPath)) {
                    return;
                }
                
                scannedDirs.add(currentPath);
                
                try {
                    const fileList = await client.list(currentPath);
                    
                    for (const file of fileList) {
                        if (file.name === '.' || file.name === '..') continue;
                        
                        const fullPath = path.posix.join(currentPath, file.name);
                        
                        if (file.type === 2) { // Diretório
                            await scanDirectory(fullPath, depth + 1);
                        } else if (file.type === 1) { // Arquivo
                            const isVideo = /\.(mp4|avi|mov|wmv|flv|webm|mkv|3gp|ts|mpg|mpeg|ogv|m4v)$/i.test(file.name);
                            
                            if (isVideo) {
                                videos.push({
                                    name: file.name,
                                    path: fullPath,
                                    size: file.size || 0,
                                    directory: currentPath,
                                    modifiedAt: file.modifiedAt || new Date(),
                                    extension: path.extname(file.name).toLowerCase()
                                });
                            }
                        }
                    }
                } catch (dirError) {
                    console.warn(`⚠️ Erro ao escanear ${currentPath}:`, dirError.message);
                }
            };

            await scanDirectory(directoryPath);
            
            console.log(`📊 Scan recursivo concluído: ${videos.length} vídeos em ${scannedDirs.size} diretórios`);

            return {
                success: true,
                videos: videos,
                total_videos: videos.length,
                scanned_directories: scannedDirs.size,
                max_depth_reached: scannedDirs.size >= Math.pow(10, maxDepth)
            };

        } catch (error) {
            console.error('❌ Erro no scan recursivo:', error);
            throw new Error(`Erro ao escanear diretório: ${error.message}`);
        }
    }

    // Migrar arquivos
    async migrateFiles(userId, files, destinationFolder) {
        try {
            // Verificar se já existe migração ativa
            if (this.activeMigrations.has(userId)) {
                throw new Error('Já existe uma migração em andamento');
            }

            const client = await this.getConnection(userId);
            
            // Buscar dados da pasta de destino
            const [folderRows] = await db.execute(
                'SELECT identificacao, codigo_servidor, espaco, espaco_usado FROM streamings WHERE codigo = ? AND codigo_cliente = ?',
                [destinationFolder, userId]
            );

            if (folderRows.length === 0) {
                throw new Error('Pasta de destino não encontrada');
            }

            const folderData = folderRows[0];
            const folderName = folderData.identificacao;
            const serverId = folderData.codigo_servidor || 1;
            const userLogin = await this.getUserLogin(userId);

            // Verificar espaço disponível
            const availableSpace = folderData.espaco - folderData.espaco_usado;
            const estimatedTotalSize = files.length * 50; // Estimativa

            if (estimatedTotalSize > availableSpace) {
                throw new Error(`Espaço insuficiente. Necessário: ~${estimatedTotalSize}MB, Disponível: ${availableSpace}MB`);
            }

            // Inicializar dados da migração
            const migrationData = {
                files: files,
                startTime: new Date(),
                status: 'migrating',
                completed: 0,
                errors: [],
                totalSize: 0,
                destinationFolder: destinationFolder,
                folderName: folderName,
                serverId: serverId,
                userLogin: userLogin
            };

            this.activeMigrations.set(userId, migrationData);

            // Garantir estrutura no servidor
            await SSHManager.createCompleteUserStructure(serverId, userLogin, {
                bitrate: 2500,
                espectadores: 100,
                status_gravando: 'nao'
            });
            
            await SSHManager.createUserFolder(serverId, userLogin, folderName);

            // Processar arquivos em background
            this.processMigrationFiles(userId, migrationData, client);

            return {
                success: true,
                migration_id: `${userId}_${Date.now()}`,
                total_files: files.length,
                estimated_time: `${Math.ceil(files.length * 2)} minutos`
            };

        } catch (error) {
            this.activeMigrations.delete(userId);
            throw error;
        }
    }

    // Processar arquivos da migração
    async processMigrationFiles(userId, migrationData, client) {
        const { files, serverId, userLogin, folderName, destinationFolder } = migrationData;
        
        for (let i = 0; i < files.length; i++) {
            const filePath = files[i];
            
            try {
                console.log(`📥 Migrando arquivo ${i + 1}/${files.length}: ${filePath}`);
                
                const fileName = path.basename(filePath);
                const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                const tempFilePath = `/tmp/ftp_${userId}_${Date.now()}_${sanitizedFileName}`;
                const remotePath = `/home/streaming/${userLogin}/${folderName}/${sanitizedFileName}`;

                // Download do arquivo via FTP
                await client.downloadTo(tempFilePath, filePath);
                
                // Verificar se arquivo foi baixado
                const stats = await fs.stat(tempFilePath);
                const fileSizeMB = Math.ceil(stats.size / (1024 * 1024));
                
                console.log(`📊 Arquivo baixado: ${sanitizedFileName} (${fileSizeMB}MB)`);

                // Upload para servidor via SSH
                await SSHManager.uploadFile(serverId, tempFilePath, remotePath);
                
                // Remover arquivo temporário
                await fs.unlink(tempFilePath);
                
                console.log(`📤 Arquivo enviado para servidor: ${remotePath}`);

                // Salvar no banco de dados
                const relativePath = `streaming/${userLogin}/${folderName}/${sanitizedFileName}`;
                
                await db.execute(
                    `INSERT INTO videos (
                        nome, url, caminho, duracao, tamanho_arquivo,
                        codigo_cliente, pasta, bitrate_video, formato_original,
                        largura, altura, is_mp4, compativel, origem
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1920, 1080, ?, 'sim', 'ftp')`,
                    [
                        fileName,
                        relativePath,
                        remotePath,
                        0, // Duração será calculada depois se necessário
                        stats.size,
                        userId,
                        destinationFolder,
                        2500, // Bitrate padrão
                        path.extname(fileName).substring(1),
                        path.extname(fileName).toLowerCase() === '.mp4' ? 1 : 0
                    ]
                );

                migrationData.completed++;
                migrationData.totalSize += fileSizeMB;
                
                console.log(`✅ Arquivo migrado com sucesso: ${fileName}`);

            } catch (fileError) {
                console.error(`❌ Erro ao migrar ${filePath}:`, fileError);
                migrationData.errors.push(`Erro ao migrar ${path.basename(filePath)}: ${fileError.message}`);
            }
        }

        // Atualizar espaço usado na pasta
        if (migrationData.totalSize > 0) {
            try {
                await db.execute(
                    'UPDATE streamings SET espaco_usado = espaco_usado + ? WHERE codigo = ?',
                    [migrationData.totalSize, destinationFolder]
                );
            } catch (dbError) {
                console.error('Erro ao atualizar espaço usado:', dbError);
            }
        }

        // Finalizar migração
        migrationData.status = 'completed';
        migrationData.endTime = new Date();
        
        console.log(`🎉 Migração concluída: ${migrationData.completed}/${files.length} arquivos, ${migrationData.totalSize}MB`);
        
        // Fechar conexão FTP
        try {
            client.close();
        } catch (error) {
            // Ignorar erros ao fechar
        }
    }

    // Obter status da migração
    getMigrationStatus(userId) {
        const migrationData = this.activeMigrations.get(userId);
        
        if (!migrationData) {
            return {
                migrating: false,
                status: 'idle'
            };
        }

        const uptime = Math.floor((new Date().getTime() - migrationData.startTime.getTime()) / 1000);
        const progress = migrationData.files.length > 0 ? 
            Math.round((migrationData.completed / migrationData.files.length) * 100) : 0;

        return {
            migrating: migrationData.status === 'migrating',
            status: migrationData.status,
            progress: progress,
            completed: migrationData.completed,
            total: migrationData.files.length,
            errors: migrationData.errors || [],
            uptime: uptime,
            total_size: migrationData.totalSize || 0,
            estimated_remaining: migrationData.status === 'migrating' ? 
                Math.ceil((migrationData.files.length - migrationData.completed) * 2) : 0
        };
    }

    // Cancelar migração
    async cancelMigration(userId) {
        const migrationData = this.activeMigrations.get(userId);
        
        if (!migrationData) {
            return {
                success: true,
                message: 'Nenhuma migração ativa encontrada'
            };
        }

        try {
            // Marcar como cancelada
            migrationData.status = 'cancelled';
            migrationData.endTime = new Date();
            
            console.log(`🛑 Migração cancelada para usuário ${userId}`);

            return {
                success: true,
                message: 'Migração cancelada com sucesso'
            };

        } catch (error) {
            console.error('Erro ao cancelar migração:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Desconectar FTP
    async disconnect(userId) {
        try {
            const connectionInfo = this.activeConnections.get(userId);
            
            if (connectionInfo && connectionInfo.client) {
                try {
                    connectionInfo.client.close();
                } catch (error) {
                    // Ignorar erros ao fechar
                }
            }
            
            this.activeConnections.delete(userId);
            
            return {
                success: true,
                message: 'Desconectado do FTP'
            };

        } catch (error) {
            console.error('Erro ao desconectar FTP:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Obter login do usuário
    async getUserLogin(userId) {
        try {
            const [userRows] = await db.execute(
                'SELECT usuario, email FROM streamings WHERE codigo_cliente = ? LIMIT 1',
                [userId]
            );

            if (userRows.length > 0 && userRows[0].usuario) {
                return userRows[0].usuario;
            } else if (userRows.length > 0 && userRows[0].email) {
                return userRows[0].email.split('@')[0];
            }

            return `user_${userId}`;
        } catch (error) {
            console.error('Erro ao obter login do usuário:', error);
            return `user_${userId}`;
        }
    }

    // Timer de limpeza
    startCleanupTimer() {
        setInterval(() => {
            const now = new Date();

            // Limpar conexões antigas
            for (const [userId, connectionInfo] of this.activeConnections) {
                if (now.getTime() - connectionInfo.lastUsed.getTime() > this.connectionTimeout) {
                    try {
                        connectionInfo.client.close();
                    } catch (error) {
                        // Ignorar erros
                    }
                    this.activeConnections.delete(userId);
                    console.log(`🧹 Conexão FTP expirada removida para usuário ${userId}`);
                }
            }

            // Limpar migrações antigas
            for (const [userId, migrationData] of this.activeMigrations) {
                if (migrationData.status !== 'migrating' && 
                    now.getTime() - migrationData.startTime.getTime() > this.connectionTimeout) {
                    this.activeMigrations.delete(userId);
                    console.log(`🧹 Dados de migração expirados removidos para usuário ${userId}`);
                }
            }
        }, 10 * 60 * 1000); // A cada 10 minutos
    }

    // Limpar todas as conexões (para shutdown)
    async closeAllConnections() {
        console.log('🛑 Fechando todas as conexões FTP...');
        
        for (const [userId, connectionInfo] of this.activeConnections) {
            try {
                if (connectionInfo.client) {
                    connectionInfo.client.close();
                }
            } catch (error) {
                console.error(`Erro ao fechar conexão FTP do usuário ${userId}:`, error);
            }
        }
        
        this.activeConnections.clear();
        this.activeMigrations.clear();
    }
}

module.exports = new FTPManager();