const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const SSHManager = require('./SSHManager');
const db = require('./database');

class YouTubeDownloader {
    constructor() {
        this.activeDownloads = new Map();
        this.downloadQueue = [];
        this.maxConcurrentDownloads = 2;
        this.tempDir = '/tmp/youtube-downloads';
        
        this.initializeTempDir();
        this.startQueueProcessor();
    }

    async initializeTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
            console.log(`📁 Diretório temporário criado: ${this.tempDir}`);
        } catch (error) {
            console.error('Erro ao criar diretório temporário:', error);
        }
    }

    // Validar URL do YouTube
    validateYouTubeUrl(url) {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /^(https?:\/\/)?(www\.)?(youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /^(https?:\/\/)?(www\.)?(youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^(https?:\/\/)?(www\.)?(youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
        ];

        return patterns.some(pattern => pattern.test(url));
    }

    // Extrair ID do vídeo
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    // Obter informações do vídeo
    async getVideoInfo(url) {
        try {
            console.log(`📋 Obtendo informações do vídeo: ${url}`);

            const ytDlpProcess = spawn('yt-dlp', [
                '--print-json',
                '--no-download',
                '--format', 'best[ext=mp4]/best',
                '--no-playlist',
                url
            ]);

            let stdout = '';
            let stderr = '';

            ytDlpProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlpProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    ytDlpProcess.kill();
                    reject(new Error('Timeout ao obter informações do vídeo (>30s)'));
                }, 30000);

                ytDlpProcess.on('close', (code) => {
                    clearTimeout(timeout);
                    
                    if (code === 0 && stdout) {
                        try {
                            const info = JSON.parse(stdout.trim());
                            
                            // Sanitizar título
                            const sanitizedTitle = (info.title || 'Video do YouTube')
                                .replace(/[^a-zA-Z0-9\s\-_]/g, '')
                                .replace(/\s+/g, '_')
                                .substring(0, 100);

                            resolve({
                                id: info.id || this.extractVideoId(url) || 'unknown',
                                title: info.title || 'Video do YouTube',
                                sanitized_title: sanitizedTitle,
                                duration: info.duration || 0,
                                filesize: info.filesize || info.filesize_approx || 0,
                                ext: info.ext || 'mp4',
                                uploader: info.uploader || 'Unknown',
                                upload_date: info.upload_date || '',
                                view_count: info.view_count || 0,
                                description: info.description || '',
                                thumbnail: info.thumbnail || '',
                                webpage_url: info.webpage_url || url
                            });
                        } catch (parseError) {
                            reject(new Error('Erro ao analisar informações do vídeo'));
                        }
                    } else {
                        const errorMsg = stderr.includes('Video unavailable') ? 'Vídeo não disponível ou foi removido' :
                                       stderr.includes('Private video') ? 'Vídeo privado' :
                                       stderr.includes('Sign in to confirm') ? 'Vídeo requer confirmação de idade' :
                                       stderr.includes('This video is not available') ? 'Vídeo não disponível na sua região' :
                                       stderr.includes('Requested format is not available') ? 'Formato solicitado não disponível' :
                                       'Erro ao acessar vídeo do YouTube';
                        reject(new Error(errorMsg));
                    }
                });

                ytDlpProcess.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`Erro no yt-dlp: ${error.message}`));
                });
            });

        } catch (error) {
            console.error('Erro ao obter informações do vídeo:', error);
            throw error;
        }
    }

    // Baixar vídeo
    async downloadVideo(userId, url, destinationFolder, options = {}) {
        try {
            const {
                quality = 'best[height<=1080]',
                format = 'mp4',
                audio_quality = 'best'
            } = options;

            // Verificar se download já está ativo
            if (this.activeDownloads.has(userId)) {
                throw new Error('Já existe um download ativo para este usuário');
            }

            // Obter informações do vídeo
            const videoInfo = await this.getVideoInfo(url);
            
            // Verificar tamanho estimado
            const estimatedSizeMB = Math.ceil((videoInfo.filesize || 50 * 1024 * 1024) / (1024 * 1024));
            
            // Buscar dados da pasta
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
            const availableSpace = folderData.espaco - folderData.espaco_usado;

            if (estimatedSizeMB > availableSpace) {
                throw new Error(`Arquivo muito grande (${estimatedSizeMB}MB). Espaço disponível: ${availableSpace}MB.`);
            }

            const userLogin = await this.getUserLogin(userId);
            const fileName = `${videoInfo.sanitized_title}_${videoInfo.id}.mp4`;
            const tempFilePath = path.join(this.tempDir, `${userId}_${fileName}`);
            const remotePath = `/home/streaming/${userLogin}/${folderName}/${fileName}`;

            console.log(`⬇️ Iniciando download: ${videoInfo.title}`);
            console.log(`📁 Arquivo temporário: ${tempFilePath}`);
            console.log(`📤 Destino final: ${remotePath}`);

            // Marcar download como ativo
            const downloadData = {
                url: url,
                videoInfo: videoInfo,
                fileName: fileName,
                tempFilePath: tempFilePath,
                remotePath: remotePath,
                startTime: new Date(),
                status: 'downloading',
                progress: 0,
                serverId: serverId,
                folderId: destinationFolder,
                folderName: folderName
            };

            this.activeDownloads.set(userId, downloadData);

            // Iniciar download com yt-dlp
            const ytDlpArgs = [
                '--format', `${quality}[ext=mp4]/best[ext=mp4]/best`,
                '--output', tempFilePath,
                '--no-playlist',
                '--extract-flat', 'false',
                '--write-info-json',
                '--write-thumbnail',
                '--embed-metadata',
                '--add-metadata',
                '--no-warnings',
                url
            ];

            const downloadProcess = spawn('yt-dlp', ytDlpArgs, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            downloadData.process = downloadProcess;

            downloadProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`📊 yt-dlp output: ${output.trim()}`);
                
                // Extrair progresso se disponível
                const progressMatch = output.match(/(\d+\.?\d*)%/);
                if (progressMatch) {
                    downloadData.progress = parseFloat(progressMatch[1]);
                }
            });

            downloadProcess.stderr.on('data', (data) => {
                const output = data.toString();
                console.log(`📊 yt-dlp stderr: ${output.trim()}`);
                
                // Extrair progresso do stderr também
                const progressMatch = output.match(/(\d+\.?\d*)%/);
                if (progressMatch) {
                    downloadData.progress = parseFloat(progressMatch[1]);
                }
            });

            downloadProcess.on('close', async (code) => {
                try {
                    if (code === 0) {
                        console.log(`✅ Download concluído: ${fileName}`);
                        downloadData.status = 'uploading';
                        
                        // Verificar se arquivo foi criado
                        const stats = await fs.stat(tempFilePath);
                        const fileSizeMB = Math.ceil(stats.size / (1024 * 1024));
                        
                        console.log(`📊 Arquivo baixado: ${fileName} (${fileSizeMB}MB)`);

                        // Garantir estrutura no servidor
                        await SSHManager.createCompleteUserStructure(serverId, userLogin, {
                            bitrate: 2500,
                            espectadores: 100,
                            status_gravando: 'nao'
                        });
                        
                        await SSHManager.createUserFolder(serverId, userLogin, folderName);

                        // Upload para servidor via SSH
                        await SSHManager.uploadFile(serverId, tempFilePath, remotePath);
                        
                        // Remover arquivo temporário
                        await fs.unlink(tempFilePath);
                        
                        console.log(`📤 Arquivo enviado para servidor: ${remotePath}`);

                        // Salvar no banco de dados
                        const relativePath = `${userLogin}/${folderName}/${fileName}`;
                        
                        const [result] = await db.execute(
                            `INSERT INTO videos (
                                nome, url, caminho, duracao, tamanho_arquivo,
                                codigo_cliente, pasta, bitrate_video, formato_original,
                                largura, altura, is_mp4, compativel, origem
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mp4', 1920, 1080, 1, 'sim', 'youtube')`,
                            [
                                videoInfo.title,
                                `streaming/${relativePath}`,
                                remotePath,
                                videoInfo.duration,
                                stats.size,
                                userId,
                                destinationFolder,
                                2500 // Bitrate padrão para vídeos do YouTube
                            ]
                        );

                        // Atualizar espaço usado na pasta
                        await db.execute(
                            'UPDATE streamings SET espaco_usado = espaco_usado + ? WHERE codigo = ?',
                            [fileSizeMB, destinationFolder]
                        );

                        downloadData.status = 'completed';
                        downloadData.videoId = result.insertId;
                        downloadData.finalSize = stats.size;

                        console.log(`💾 Vídeo salvo no banco com ID: ${result.insertId}`);
                        
                    } else {
                        console.error(`❌ Erro no download (código ${code})`);
                        downloadData.status = 'error';
                        downloadData.error = `Download falhou com código ${code}`;
                        
                        // Limpar arquivo temporário se existir
                        await fs.unlink(tempFilePath).catch(() => {});
                    }
                } catch (processError) {
                    console.error('Erro no processamento pós-download:', processError);
                    downloadData.status = 'error';
                    downloadData.error = processError.message;
                    
                    // Limpar arquivo temporário
                    await fs.unlink(tempFilePath).catch(() => {});
                }
            });

            downloadProcess.on('error', async (error) => {
                console.error('❌ Erro no processo yt-dlp:', error);
                downloadData.status = 'error';
                downloadData.error = error.message;
                
                await fs.unlink(tempFilePath).catch(() => {});
            });

            return {
                success: true,
                download_id: `${userId}_${Date.now()}`,
                video_info: videoInfo,
                estimated_size_mb: estimatedSizeMB
            };

        } catch (error) {
            // Remover do mapa se deu erro
            this.activeDownloads.delete(userId);
            throw error;
        }
    }

    // Obter status do download
    getDownloadStatus(userId) {
        const downloadData = this.activeDownloads.get(userId);
        
        if (!downloadData) {
            return {
                downloading: false,
                status: 'idle'
            };
        }

        const uptime = Math.floor((new Date().getTime() - downloadData.startTime.getTime()) / 1000);

        return {
            downloading: downloadData.status === 'downloading' || downloadData.status === 'uploading',
            status: downloadData.status,
            progress: downloadData.progress || 0,
            filename: downloadData.fileName,
            video_title: downloadData.videoInfo?.title,
            uptime: uptime,
            error: downloadData.error || null,
            final_size: downloadData.finalSize || null,
            video_id: downloadData.videoId || null
        };
    }

    // Cancelar download
    async cancelDownload(userId) {
        const downloadData = this.activeDownloads.get(userId);
        
        if (!downloadData) {
            return {
                success: true,
                message: 'Nenhum download ativo encontrado'
            };
        }

        try {
            // Finalizar processo se estiver rodando
            if (downloadData.process && downloadData.process.pid) {
                process.kill(downloadData.process.pid, 'SIGTERM');
                console.log(`🛑 Download cancelado - PID: ${downloadData.process.pid}`);
            }

            // Limpar arquivo temporário
            if (downloadData.tempFilePath) {
                await fs.unlink(downloadData.tempFilePath).catch(() => {});
            }

            // Remover do mapa
            this.activeDownloads.delete(userId);

            return {
                success: true,
                message: 'Download cancelado com sucesso'
            };

        } catch (error) {
            console.error('Erro ao cancelar download:', error);
            return {
                success: false,
                error: error.message
            };
        }
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

    // Processar fila de downloads
    startQueueProcessor() {
        setInterval(() => {
            // Limpar downloads antigos (mais de 1 hora)
            const now = new Date();
            const maxAge = 60 * 60 * 1000; // 1 hora

            for (const [userId, downloadData] of this.activeDownloads) {
                if (now.getTime() - downloadData.startTime.getTime() > maxAge) {
                    console.log(`🧹 Removendo download expirado para usuário ${userId}`);
                    
                    // Finalizar processo se ainda estiver rodando
                    if (downloadData.process && downloadData.process.pid) {
                        try {
                            process.kill(downloadData.process.pid, 'SIGTERM');
                        } catch (error) {
                            // Processo já finalizado
                        }
                    }
                    
                    // Limpar arquivo temporário
                    if (downloadData.tempFilePath) {
                        fs.unlink(downloadData.tempFilePath).catch(() => {});
                    }
                    
                    this.activeDownloads.delete(userId);
                }
            }
        }, 5 * 60 * 1000); // A cada 5 minutos
    }

    // Limpar todos os downloads (para shutdown)
    async stopAllDownloads() {
        console.log('🛑 Finalizando todos os downloads ativos...');
        
        for (const [userId, downloadData] of this.activeDownloads) {
            try {
                if (downloadData.process && downloadData.process.pid) {
                    process.kill(downloadData.process.pid, 'SIGTERM');
                }
                
                if (downloadData.tempFilePath) {
                    await fs.unlink(downloadData.tempFilePath).catch(() => {});
                }
            } catch (error) {
                console.error(`Erro ao finalizar download do usuário ${userId}:`, error);
            }
        }
        
        this.activeDownloads.clear();
    }

    // Obter lista de downloads recentes
    async getRecentDownloads(userId, limit = 10) {
        try {
            const [rows] = await db.execute(
                `SELECT 
                    id, nome, duracao, tamanho_arquivo, data_upload
                 FROM videos 
                 WHERE codigo_cliente = ? AND origem = 'youtube'
                 ORDER BY data_upload DESC 
                 LIMIT ?`,
                [userId, limit]
            );

            return rows.map(video => ({
                id: video.id,
                nome: video.nome,
                duracao: video.duracao,
                tamanho_mb: Math.ceil(video.tamanho_arquivo / (1024 * 1024)),
                data_download: video.data_upload
            }));

        } catch (error) {
            console.error('Erro ao obter downloads recentes:', error);
            return [];
        }
    }
}

module.exports = new YouTubeDownloader();