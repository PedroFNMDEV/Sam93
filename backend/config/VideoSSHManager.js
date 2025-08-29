const SSHManager = require('./SSHManager');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class VideoSSHManager {
    constructor() {
        this.tempDir = '/tmp/video-cache';
        this.maxCacheSize = 500 * 1024 * 1024; // 500MB - reduzido para ser mais eficiente
        this.cacheCleanupInterval = 30 * 60 * 1000; // 30 minutos
        this.downloadQueue = new Map();
        this.streamingMode = 'proxy'; // 'download' ou 'proxy'
        
        this.initializeTempDir();
        this.startCleanupTimer();
    }

    async initializeTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
            console.log(`📁 Diretório temporário criado: ${this.tempDir}`);
        } catch (error) {
            console.error('Erro ao criar diretório temporário:', error);
        }
    }

    startCleanupTimer() {
        setInterval(() => {
            this.cleanupOldFiles();
        }, this.cacheCleanupInterval);
    }

    async cleanupOldFiles() {
        try {
            const files = await fs.readdir(this.tempDir);
            const now = Date.now();
            const maxAge = 60 * 60 * 1000; // 1 hora

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`🗑️ Arquivo temporário removido: ${file}`);
                }
            }
        } catch (error) {
            console.error('Erro na limpeza de arquivos temporários:', error);
        }
    }

    async listVideosFromServer(serverId, userLogin, folderName = null) {
        try {
            // Nova estrutura: /home/streaming/[usuario]
            const basePath = `/home/streaming/${userLogin}`;
            const searchPath = folderName ? `${basePath}/${folderName}` : basePath;
            
            // Comando para listar apenas arquivos de vídeo recursivamente
            const command = `find "${searchPath}" -type f \\( -iname "*.mp4" -o -iname "*.avi" -o -iname "*.mov" -o -iname "*.wmv" -o -iname "*.flv" -o -iname "*.webm" -o -iname "*.mkv" \\) -exec ls -la {} \\; 2>/dev/null || echo "NO_VIDEOS"`;
            
            const result = await SSHManager.executeCommand(serverId, command);
            
            if (result.stdout.includes('NO_VIDEOS')) {
                return [];
            }

            const videos = [];
            const lines = result.stdout.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                if (line.includes('total ') || !line.trim()) continue;
                
                const parts = line.trim().split(/\s+/);
                if (parts.length < 9) continue;
                
                const permissions = parts[0];
                const size = parseInt(parts[4]) || 0;
                const fullPath = parts.slice(8).join(' ');
                const fileName = path.basename(fullPath);
                const relativePath = fullPath.replace(`/home/streaming/`, '');
                const folderPath = path.dirname(relativePath);
                const fileExtension = path.extname(fileName).toLowerCase();
                
                // Extrair duração e bitrate do vídeo via ffprobe
                let duration = 0;
                let videoBitrate = 0;
                let videoFormat = fileExtension.substring(1);
                try {
                    const probeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${fullPath}" 2>/dev/null || echo "NO_PROBE"`;
                    const probeResult = await SSHManager.executeCommand(serverId, probeCommand);
                    
                    if (!probeResult.stdout.includes('NO_PROBE')) {
                        const probeData = JSON.parse(probeResult.stdout);
                        
                        if (probeData.format) {
                            duration = Math.floor(parseFloat(probeData.format.duration) || 0);
                            videoBitrate = Math.floor(parseInt(probeData.format.bit_rate) / 1000) || 0; // Converter para kbps
                        }
                        
                        if (probeData.streams) {
                            const videoStream = probeData.streams.find(s => s.codec_type === 'video');
                            if (videoStream && videoStream.codec_name) {
                                videoFormat = videoStream.codec_name;
                                // Se não conseguiu bitrate do format, tentar do stream de vídeo
                                if (!videoBitrate && videoStream.bit_rate) {
                                    videoBitrate = Math.floor(parseInt(videoStream.bit_rate) / 1000) || 0;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Não foi possível obter informações de ${fileName}`);
                }

                // Verificar se é MP4 e se bitrate está dentro do limite
                const isMP4 = fileExtension === '.mp4';
                const userBitrateLimit = 2500; // Será obtido do contexto do usuário
                const needsConversion = !isMP4 || (videoBitrate > 0 && videoBitrate > userBitrateLimit);
                
                // Nome do arquivo MP4 (sempre MP4 após conversão)
                const mp4FileName = fileName.replace(/\.[^/.]+$/, '.mp4');
                const mp4Path = fullPath.replace(/\.[^/.]+$/, '.mp4');
                
                videos.push({
                    id: Buffer.from(fullPath).toString('base64'), // ID único baseado no caminho
                    nome: fileName,
                    path: relativePath,
                    fullPath: fullPath,
                    mp4Path: mp4Path,
                    mp4FileName: mp4FileName,
                    is_mp4: isMP4,
                    needs_conversion: needsConversion,
                    bitrate_video: videoBitrate,
                    bitrate_original: videoBitrate, // Bitrate original do arquivo
                    formato_original: videoFormat,
                    can_use: !needsConversion,
                    folder: folderPath.replace(`${userLogin}/`, '') || 'root',
                    size: size,
                    duration: duration,
                    permissions: permissions,
                    lastModified: new Date().toISOString(), // Seria melhor extrair do ls
                    serverId: serverId,
                    userLogin: userLogin,
                    mp4Url: `/content/${relativePath.replace(fileName, mp4FileName)}`,
                    originalFormat: fileExtension,
                    user_bitrate_limit: userBitrateLimit
                });
            }

            console.log(`📹 Encontrados ${videos.length} vídeos no servidor para ${userLogin}`);
            
            // Sincronizar com banco de dados
            await this.syncVideosWithDatabase(videos, userLogin, serverId);
            
            return videos;
            
        } catch (error) {
            console.error('Erro ao listar vídeos do servidor:', error);
            return [];
        }
    }

    async syncVideosWithDatabase(videos, userLogin, serverId) {
        try {
            const db = require('./database');
            
            console.log(`🔄 Sincronizando ${videos.length} vídeos com banco de dados...`);
            
            for (const video of videos) {
                try {
                    // Verificar se vídeo já existe na tabela videos
                    const [existingRows] = await db.execute(
                        'SELECT id FROM videos WHERE caminho = ?',
                        [video.fullPath]
                    );
                    
                    if (existingRows.length === 0) {
                        // Buscar código do cliente baseado no userLogin
                        const [clienteRows] = await db.execute(
                            'SELECT codigo_cliente FROM streamings WHERE usuario = ? OR email LIKE ? LIMIT 1',
                            [userLogin, `${userLogin}@%`]
                        );
                        
                        const codigoCliente = clienteRows.length > 0 ? clienteRows[0].codigo_cliente : null;
                        
                        // Buscar ID da pasta baseado no nome
                        const [pastaRows] = await db.execute(
                            'SELECT id FROM folders WHERE user_id = ? AND nome_sanitizado = ? LIMIT 1',
                            [codigoCliente, video.folder === 'root' ? 'default' : video.folder]
                        );
                        
                        const pastaId = pastaRows.length > 0 ? pastaRows[0].id : null;
                        
                        // Inserir novo vídeo na tabela videos
                        const duracao = this.formatDuration(video.duration);
                        const relativePath = video.path.replace('/home/streaming/', ''); // Garantir formato correto
                        
                        // Verificar se é MP4 e codec compatível para determinar compatibilidade
                        const isMP4 = video.is_mp4;
                        const codecCompatible = ['h264', 'h265', 'hevc'].includes(video.formato_original?.toLowerCase());
                        const bitrateExceedsLimit = (video.bitrate_video || 0) > 2500; // Usar limite padrão ou do usuário
                        
                        let compatibilityStatus = 'sim';
                        
                        // Se não é MP4 ou codec não é H264/H265, precisa conversão
                        if (!isMP4 || !codecCompatible) {
                          compatibilityStatus = 'nao';
                        }
                        // Se bitrate excede limite, precisa conversão
                        else if (bitrateExceedsLimit) {
                          compatibilityStatus = 'nao';
                        }
                        // Se é MP4 com H264/H265 e dentro do limite, está otimizado
                        else if (isMP4 && codecCompatible && !bitrateExceedsLimit) {
                          compatibilityStatus = 'otimizado';
                        }
                        
                        await db.execute(
                            `INSERT INTO videos (
                                nome, url, caminho, duracao, tamanho_arquivo,
                                codigo_cliente, pasta, bitrate_video, formato_original,
                                largura, altura, is_mp4, compativel, codec_video
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '1920', '1080', ?, ?, ?)`,
                            [
                                video.nome,
                                `streaming/${relativePath}`,
                                video.fullPath,
                                video.duration,
                                video.size,
                                codigoCliente,
                                pastaId,
                                video.bitrate_video || 0,
                                video.formato_original || 'unknown',
                                video.is_mp4 ? 1 : 0,
                                compatibilityStatus,
                                video.formato_original || 'unknown'
                            ]
                        );
                        
                        console.log(`✅ Vídeo sincronizado no banco: ${video.nome}`);
                    } else {
                        // Atualizar informações se necessário
                        await db.execute(
                            'UPDATE videos SET tamanho_arquivo = ?, duracao = ?, codec_video = ?, formato_original = ? WHERE caminho = ?',
                            [video.size, video.duration, video.formato_original || 'unknown', video.formato_original || 'unknown', video.fullPath]
                        );
                    }
                } catch (videoError) {
                    console.warn(`Erro ao sincronizar vídeo ${video.nome}:`, videoError.message);
                }
            }
            
            // Recalcular espaço usado por pasta
            await this.recalculateFolderSpace(userLogin);
            
        } catch (error) {
            console.error('Erro na sincronização com banco:', error);
        }
    }

    async recalculateFolderSpace(userLogin) {
        try {
            const db = require('./database');
            
            // Buscar todas as pastas do usuário na nova tabela
            const [folderRows] = await db.execute(
                `SELECT f.id, f.nome_sanitizado, f.user_id, f.servidor_id 
                 FROM folders f
                 JOIN streamings s ON f.user_id = s.codigo_cliente
                 WHERE s.usuario = ? OR s.email LIKE ?`,
                [userLogin, `${userLogin}@%`]
            );
            
            for (const folder of folderRows) {
                const serverId = folder.servidor_id || 1;
                const folderName = folder.nome_sanitizado;
                
                // Calcular espaço real no servidor
                let realServerSizeMB = 0;
                try {
                    const SSHManager = require('./SSHManager');
                    const folderPath = `/home/streaming/${userLogin}/${folderName}`;
                    const sizeCommand = `du -sb "${folderPath}" 2>/dev/null | cut -f1 || echo "0"`;
                    const sizeResult = await SSHManager.executeCommand(serverId, sizeCommand);
                    const folderSizeBytes = parseInt(sizeResult.stdout.trim()) || 0;
                    realServerSizeMB = Math.ceil(folderSizeBytes / (1024 * 1024));
                } catch (serverError) {
                    console.warn(`Erro ao calcular tamanho real da pasta ${folderName}:`, serverError.message);
                }
                
                // Calcular espaço usado baseado nos vídeos na tabela videos
                const [spaceRows] = await db.execute(
                    `SELECT COALESCE(SUM(CEIL(tamanho_arquivo / (1024 * 1024))), 0) as used_mb
                     FROM videos 
                     WHERE pasta = ? AND codigo_cliente = ?`,
                    [folder.id, folder.user_id]
                );
                
                const usedMB = spaceRows[0]?.used_mb || 0;
                
                // Usar o maior valor entre servidor real e banco de dados
                const finalUsedMB = Math.max(realServerSizeMB, usedMB);
                
                // Atualizar espaço usado na pasta
                await db.execute(
                    'UPDATE folders SET espaco_usado = ? WHERE id = ?',
                    [finalUsedMB, folder.id]
                );
                
                console.log(`📊 Espaço recalculado para pasta ${folder.nome_sanitizado}: ${finalUsedMB}MB (Servidor: ${realServerSizeMB}MB, DB: ${usedMB}MB)`);
            }
            
        } catch (error) {
            console.error('Erro ao recalcular espaço das pastas:', error);
        }
    }

    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Obter login do usuário
    async getUserLogin(userId) {
        try {
            const db = require('./database');
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
    async downloadVideoToTemp(serverId, remotePath, videoId) {
        try {
            // Verificar se já está sendo baixado
            if (this.downloadQueue.has(videoId)) {
                return this.downloadQueue.get(videoId);
            }

            const fileName = path.basename(remotePath);
            const localPath = path.join(this.tempDir, `${videoId}_${fileName}`);
            
            // Verificar se arquivo já existe localmente
            try {
                const stats = await fs.stat(localPath);
                const age = Date.now() - stats.mtime.getTime();
                
                // Se arquivo tem menos de 30 minutos, usar o cache
                if (age < 30 * 60 * 1000) {
                    console.log(`📦 Usando vídeo em cache: ${fileName}`);
                    return {
                        success: true,
                        localPath: localPath,
                        cached: true
                    };
                }
            } catch (error) {
                // Arquivo não existe, continuar com download
            }

            console.log(`⬇️ Iniciando download de ${fileName} via SSH...`);

            // Criar promise para o download
            const downloadPromise = new Promise(async (resolve, reject) => {
                try {
                    const { conn } = await SSHManager.getConnection(serverId);
                    
                    conn.sftp((err, sftp) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const readStream = sftp.createReadStream(remotePath);
                        const writeStream = require('fs').createWriteStream(localPath);
                        
                        let downloadedBytes = 0;
                        let lastProgressTime = Date.now();
                        
                        readStream.on('data', (chunk) => {
                            downloadedBytes += chunk.length;
                            
                            // Log de progresso a cada 5MB ou 5 segundos
                            const now = Date.now();
                            if (downloadedBytes % (5 * 1024 * 1024) === 0 || now - lastProgressTime > 5000) {
                                console.log(`📥 Download ${fileName}: ${Math.round(downloadedBytes / 1024 / 1024)}MB`);
                                lastProgressTime = now;
                            }
                        });

                        readStream.on('error', (error) => {
                            console.error(`Erro no download de ${fileName}:`, error);
                            // Limpar arquivo parcial
                            fs.unlink(localPath).catch(() => {});
                            reject(error);
                        });

                        writeStream.on('error', (error) => {
                            console.error(`Erro ao escrever ${fileName}:`, error);
                            fs.unlink(localPath).catch(() => {});
                            reject(error);
                        });

                        writeStream.on('finish', () => {
                            console.log(`✅ Download concluído: ${fileName} (${Math.round(downloadedBytes / 1024 / 1024)}MB)`);
                            resolve({
                                success: true,
                                localPath: localPath,
                                downloadedBytes: downloadedBytes,
                                cached: false
                            });
                        });

                        // Configurar timeout para downloads grandes
                        readStream.setTimeout(300000); // 5 minutos
                        readStream.pipe(writeStream);
                    });
                } catch (error) {
                    reject(error);
                }
            });

            // Adicionar à fila de downloads
            this.downloadQueue.set(videoId, downloadPromise);
            
            const result = await downloadPromise;
            
            // Remover da fila após conclusão
            this.downloadQueue.delete(videoId);
            
            return result;
            
        } catch (error) {
            console.error('Erro no download do vídeo:', error);
            this.downloadQueue.delete(videoId);
            throw error;
        }
    }

    async getVideoStream(serverId, remotePath, videoId) {
        try {
            // Verificar se deve usar modo proxy ou download
            const fileSize = await this.getFileSize(serverId, remotePath);
            
            // Para arquivos pequenos (< 50MB), fazer download
            // Para arquivos grandes, usar proxy direto
            if (fileSize < 50 * 1024 * 1024) {
                console.log(`📥 Arquivo pequeno (${this.formatFileSize(fileSize)}), fazendo download...`);
                const downloadResult = await this.downloadVideoToTemp(serverId, remotePath, videoId);
                
                if (downloadResult.success) {
                    return {
                        success: true,
                        type: 'local',
                        path: downloadResult.localPath,
                        cached: downloadResult.cached
                    };
                }
            } else {
                console.log(`🔄 Arquivo grande (${this.formatFileSize(fileSize)}), usando streaming direto...`);
                return {
                    success: true,
                    type: 'proxy',
                    remotePath: remotePath,
                    serverId: serverId
                };
            }
            
            // Fallback para proxy se download falhar
            return {
                success: true,
                type: 'proxy',
                remotePath: remotePath,
                serverId: serverId
            };
            
        } catch (error) {
            console.error('Erro ao obter stream do vídeo:', error);
            throw new Error('Não foi possível acessar o vídeo');
        }
    }

    async getFileSize(serverId, remotePath) {
        try {
            const command = `stat -c%s "${remotePath}" 2>/dev/null || echo "0"`;
            const result = await SSHManager.executeCommand(serverId, command);
            return parseInt(result.stdout.trim()) || 0;
        } catch (error) {
            console.error('Erro ao obter tamanho do arquivo:', error);
            return 0;
        }
    }

    // Método otimizado para streaming direto via proxy
    async createProxyStream(serverId, remotePath) {
        try {
            // Retornar informações para o proxy usar
            return {
                success: true,
                type: 'proxy',
                serverId: serverId,
                remotePath: remotePath,
                streamUrl: `/api/videos-ssh/proxy-stream/${Buffer.from(remotePath).toString('base64')}`
            };
        } catch (error) {
            console.error('Erro ao criar proxy stream:', error);
            throw error;
        }
    }

    async createSSHVideoStream(serverId, remotePath) {
        // Implementação de streaming direto via SSH usando pipes
        try {
            const { conn } = await SSHManager.getConnection(serverId);
            
            return new Promise((resolve, reject) => {
                conn.exec(`cat "${remotePath}"`, (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve({
                        success: true,
                        type: 'ssh_stream',
                        stream: stream
                    });
                });
            });
        } catch (error) {
            console.error('Erro no streaming SSH:', error);
            throw error;
        }
    }

    async getVideoInfo(serverId, remotePath) {
        try {
            // Obter informações detalhadas do vídeo via SSH
            const commands = [
                `ls -la "${remotePath}"`,
                `ffprobe -v quiet -print_format json -show_format -show_streams "${remotePath}" 2>/dev/null || echo "NO_FFPROBE"`
            ];

            const results = await Promise.all(
                commands.map(cmd => SSHManager.executeCommand(serverId, cmd))
            );

            const lsResult = results[0];
            const ffprobeResult = results[1];

            // Parsear informações básicas do ls
            const lsParts = lsResult.stdout.trim().split(/\s+/);
            const size = parseInt(lsParts[4]) || 0;
            const fileName = path.basename(remotePath);

            let videoInfo = {
                name: fileName,
                size: size,
                duration: 0,
                width: 0,
                height: 0,
                bitrate: 0,
                codec: 'unknown',
                format: path.extname(fileName).toLowerCase().substring(1)
            };

            // Parsear informações do ffprobe se disponível
            if (!ffprobeResult.stdout.includes('NO_FFPROBE')) {
                try {
                    const ffprobeData = JSON.parse(ffprobeResult.stdout);
                    
                    if (ffprobeData.format) {
                        videoInfo.duration = Math.floor(parseFloat(ffprobeData.format.duration) || 0);
                        videoInfo.bitrate = Math.floor(parseInt(ffprobeData.format.bit_rate) / 1000) || 0;
                    }

                    if (ffprobeData.streams) {
                        const videoStream = ffprobeData.streams.find(s => s.codec_type === 'video');
                        if (videoStream) {
                            videoInfo.width = videoStream.width || 0;
                            videoInfo.height = videoStream.height || 0;
                            videoInfo.codec = videoStream.codec_name || 'unknown';
                        }
                    }
                } catch (parseError) {
                    console.warn('Erro ao parsear dados do ffprobe:', parseError);
                }
            }

            return videoInfo;
            
        } catch (error) {
            console.error('Erro ao obter informações do vídeo:', error);
            return null;
        }
    }

    async deleteVideoFromServer(serverId, remotePath) {
        try {
            await SSHManager.deleteFile(serverId, remotePath);
            
            // Também remover do cache local se existir
            const videoId = Buffer.from(remotePath).toString('base64');
            const fileName = path.basename(remotePath);
            const localPath = path.join(this.tempDir, `${videoId}_${fileName}`);
            
            try {
                await fs.unlink(localPath);
                console.log(`🗑️ Arquivo removido do cache: ${fileName}`);
            } catch (error) {
                // Arquivo não estava em cache, ignorar
            }
            
            return { success: true };
        } catch (error) {
            console.error('Erro ao deletar vídeo do servidor:', error);
            throw error;
        }
    }

    async getCacheStatus() {
        try {
            const files = await fs.readdir(this.tempDir);
            let totalSize = 0;
            const fileDetails = [];

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                
                fileDetails.push({
                    name: file,
                    size: stats.size,
                    lastAccessed: stats.atime,
                    age: Date.now() - stats.mtime.getTime()
                });
            }

            return {
                totalFiles: files.length,
                totalSize: totalSize,
                maxSize: this.maxCacheSize,
                usagePercentage: (totalSize / this.maxCacheSize) * 100,
                files: fileDetails
            };
        } catch (error) {
            console.error('Erro ao obter status do cache:', error);
            return {
                totalFiles: 0,
                totalSize: 0,
                maxSize: this.maxCacheSize,
                usagePercentage: 0,
                files: []
            };
        }
    }

    async clearCache() {
        try {
            const files = await fs.readdir(this.tempDir);
            
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                await fs.unlink(filePath);
            }
            
            console.log(`🧹 Cache limpo: ${files.length} arquivos removidos`);
            return { success: true, removedFiles: files.length };
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            throw error;
        }
    }

    // Método para verificar se um vídeo está disponível para streaming
    async checkVideoAvailability(serverId, remotePath) {
        try {
            const fileInfo = await SSHManager.getFileInfo(serverId, remotePath);
            
            if (!fileInfo.exists) {
                return {
                    available: false,
                    reason: 'Arquivo não encontrado no servidor'
                };
            }

            // Verificar se é um arquivo de vídeo válido
            const videoExtensions = [
                '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
                '.3gp', '.3g2', '.ts', '.mpg', '.mpeg', '.ogv', '.m4v', '.asf'
            ];
            const extension = path.extname(remotePath).toLowerCase();
            
            if (!videoExtensions.includes(extension)) {
                return {
                    available: false,
                    reason: 'Formato de arquivo não suportado'
                };
            }

            // Verificar se arquivo não está corrompido (tamanho > 0)
            if (fileInfo.size === 0) {
                return {
                    available: false,
                    reason: 'Arquivo vazio ou corrompido'
                };
            }

            return {
                available: true,
                size: fileInfo.size,
                info: fileInfo
            };
            
        } catch (error) {
            console.error('Erro ao verificar disponibilidade do vídeo:', error);
            return {
                available: false,
                reason: 'Erro ao acessar servidor'
            };
        }
    }

    // Método para obter thumbnail do vídeo
    async generateVideoThumbnail(serverId, remotePath, videoId) {
        try {
            const thumbnailName = `${videoId}_thumb.jpg`;
            const localThumbnailPath = path.join(this.tempDir, thumbnailName);
            
            // Verificar se thumbnail já existe
            try {
                await fs.access(localThumbnailPath);
                return {
                    success: true,
                    thumbnailPath: localThumbnailPath,
                    cached: true
                };
            } catch (error) {
                // Thumbnail não existe, gerar
            }

            // Gerar thumbnail via SSH usando ffmpeg
            const tempRemoteThumbnail = `/tmp/${thumbnailName}`;
            const ffmpegCommand = `ffmpeg -i "${remotePath}" -ss 00:00:10 -vframes 1 -q:v 2 -s 320x180 "${tempRemoteThumbnail}" -y 2>/dev/null && echo "THUMB_OK" || echo "THUMB_ERROR"`;
            
            const result = await SSHManager.executeCommand(serverId, ffmpegCommand);
            
            if (result.stdout.includes('THUMB_OK')) {
                // Baixar thumbnail para local
                await SSHManager.uploadFile(serverId, tempRemoteThumbnail, localThumbnailPath);
                
                // Limpar thumbnail temporário do servidor
                await SSHManager.executeCommand(serverId, `rm -f "${tempRemoteThumbnail}"`);
                
                return {
                    success: true,
                    thumbnailPath: localThumbnailPath,
                    cached: false
                };
            } else {
                throw new Error('Falha ao gerar thumbnail');
            }
            
        } catch (error) {
            console.error('Erro ao gerar thumbnail:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // Método para verificar integridade de vídeos
    async checkVideoIntegrity(serverId, remotePath) {
        try {
            // Verificar se arquivo existe e não está corrompido
            const ffprobeCommand = `ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "${remotePath}" 2>/dev/null || echo "ERROR"`;
            const result = await SSHManager.executeCommand(serverId, ffprobeCommand);
            
            if (result.stdout.includes('ERROR') || result.stdout.trim() === '0') {
                return {
                    valid: false,
                    reason: 'Arquivo corrompido ou não é um vídeo válido'
                };
            }
            
            return {
                valid: true,
                packets: parseInt(result.stdout.trim()) || 0
            };
        } catch (error) {
            return {
                valid: false,
                reason: 'Erro ao verificar integridade'
            };
        }
    }

    // Método para converter vídeo para MP4
    async convertVideoToMp4(serverId, inputPath, outputPath) {
        try {
            // Verificar se arquivo MP4 já existe
            const mp4Exists = await this.checkFileExists(serverId, outputPath);
            if (mp4Exists) {
                console.log(`✅ Arquivo MP4 já existe: ${outputPath}`);
                return { success: true, alreadyExists: true };
            }

            console.log(`🔄 Convertendo vídeo para MP4: ${inputPath} -> ${outputPath}`);
            
            // Comando FFmpeg para conversão otimizada
            const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}" -y 2>/dev/null && echo "CONVERSION_SUCCESS" || echo "CONVERSION_ERROR"`;
            
            const result = await SSHManager.executeCommand(serverId, ffmpegCommand);
            
            if (result.stdout.includes('CONVERSION_SUCCESS')) {
                console.log(`✅ Conversão concluída: ${outputPath}`);
                
                // Definir permissões do arquivo convertido
                await SSHManager.executeCommand(serverId, `chmod 644 "${outputPath}"`);
                
                return { success: true, converted: true };
            } else {
                console.error(`❌ Erro na conversão: ${inputPath}`);
                return { success: false, error: 'Falha na conversão FFmpeg' };
            }
            
        } catch (error) {
            console.error('Erro ao converter vídeo:', error);
            return { success: false, error: error.message };
        }
    }

    // Método para verificar se arquivo existe
    async checkFileExists(serverId, filePath) {
        try {
            const command = `test -f "${filePath}" && echo "EXISTS" || echo "NOT_EXISTS"`;
            const result = await SSHManager.executeCommand(serverId, command);
            return result.stdout.includes('EXISTS');
        } catch (error) {
            return false;
        }
    }

    // Método para obter URL de streaming otimizada
    async getOptimizedStreamUrl(serverId, remotePath, userLogin) {
        try {
            // Verificar se é arquivo MP4 ou precisa de conversão
            const fileExtension = path.extname(remotePath).toLowerCase();
            const needsConversion = !['.mp4'].includes(fileExtension);
            
            let finalPath = remotePath;
            if (needsConversion) {
                finalPath = remotePath.replace(/\.[^/.]+$/, '.mp4');
                // Verificar se conversão já foi feita
                const mp4Exists = await this.checkFileExists(serverId, finalPath);
                if (!mp4Exists) {
                    await this.convertVideoToMp4(serverId, remotePath, finalPath);
                }
            }
            
            const fileName = path.basename(finalPath);
            const relativePath = finalPath.replace('/usr/local/WowzaStreamingEngine/content/', '');
            
            // Construir URLs baseadas no ambiente
            const isProduction = process.env.NODE_ENV === 'production';
            const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
            
            // URL direta do Wowza (porta 6980 para VOD) 
            const directUrl = `http://${wowzaHost}:6980/content/${relativePath}`;
            
            // URL HLS correta com formato Wowza
            const hlsUrl = `http://${wowzaHost}:1935/vod/_definst_/mp4:${relativePath}/playlist.m3u8`;
            
            // URL via proxy do backend
            const proxyUrl = `/content/${relativePath}`;
            
            return {
                direct: directUrl,
                hls: hlsUrl,
                proxy: proxyUrl,
                ssh: `/api/videos-ssh/stream/${Buffer.from(finalPath).toString('base64')}`
            };
        } catch (error) {
            console.error('Erro ao gerar URLs:', error);
            return null;
        }
    }

    // Método para limpar arquivos órfãos
    async cleanupOrphanedFiles(serverId, userLogin) {
        try {
            const userPath = `/usr/local/WowzaStreamingEngine/content/${userLogin}`;
            
            // Encontrar arquivos temporários ou corrompidos
            const cleanupCommand = `find "${userPath}" -type f \\( -name "*.tmp" -o -name "*.part" -o -size 0 \\) -delete 2>/dev/null || true`;
            await SSHManager.executeCommand(serverId, cleanupCommand);
            
            // Remover diretórios vazios
            const removeDirsCommand = `find "${userPath}" -type d -empty -delete 2>/dev/null || true`;
            await SSHManager.executeCommand(serverId, removeDirsCommand);
            
            console.log(`🧹 Limpeza concluída para usuário ${userLogin}`);
            return { success: true };
        } catch (error) {
            console.error('Erro na limpeza:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new VideoSSHManager();