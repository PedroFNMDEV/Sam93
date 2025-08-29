const fs = require('fs');
const path = require('path');
const SSHManager = require('../config/SSHManager');

class VideoStreamingService {
    constructor() {
        this.buffer = 102400; // 100KB buffer como no PHP
        this.supportedFormats = [
            'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo',
            'video/wmv', 'video/x-ms-wmv', 'video/flv', 'video/x-flv',
            'video/webm', 'video/mkv', 'video/x-matroska', 'video/3gpp',
            'video/3gpp2', 'video/mp2t', 'video/mpeg', 'video/ogg'
        ];
    }

    // Método principal para streaming de vídeo com suporte a Range requests
    async streamVideo(req, res, videoPath, serverId) {
        try {
            console.log(`🎥 Iniciando streaming de vídeo: ${videoPath}`);

            // Verificar se arquivo existe no servidor
            const fileInfo = await SSHManager.getFileInfo(serverId, videoPath);
            if (!fileInfo.exists) {
                return this.sendError(res, 404, 'Vídeo não encontrado no servidor');
            }

            const fileSize = fileInfo.size || 0;
            if (fileSize === 0) {
                return this.sendError(res, 404, 'Arquivo de vídeo vazio ou corrompido');
            }

            // Configurar headers básicos
            this.setBasicHeaders(res, videoPath, fileSize);

            // Processar Range request se presente
            const range = req.headers.range;
            if (range) {
                return await this.handleRangeRequest(req, res, videoPath, serverId, fileSize, range);
            } else {
                return await this.handleFullFileRequest(res, videoPath, serverId, fileSize);
            }

        } catch (error) {
            console.error('❌ Erro no streaming de vídeo:', error);
            return this.sendError(res, 500, 'Erro interno no streaming de vídeo');
        }
    }

    // Configurar headers básicos para streaming
    setBasicHeaders(res, videoPath, fileSize) {
        const extension = path.extname(videoPath).toLowerCase();
        
        // Definir Content-Type baseado na extensão
        let contentType = 'video/mp4'; // Default
        switch (extension) {
            case '.mp4': contentType = 'video/mp4'; break;
            case '.avi': contentType = 'video/x-msvideo'; break;
            case '.mov': contentType = 'video/quicktime'; break;
            case '.wmv': contentType = 'video/x-ms-wmv'; break;
            case '.flv': contentType = 'video/x-flv'; break;
            case '.webm': contentType = 'video/webm'; break;
            case '.mkv': contentType = 'video/x-matroska'; break;
            case '.3gp': contentType = 'video/3gpp'; break;
            case '.ts': contentType = 'video/mp2t'; break;
            case '.mpg':
            case '.mpeg': contentType = 'video/mpeg'; break;
            case '.ogv': contentType = 'video/ogg'; break;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 dias
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

        // Headers de expiração
        const expires = new Date(Date.now() + 2592000000); // 30 dias
        res.setHeader('Expires', expires.toUTCString());
        
        // Last-Modified (simulado)
        const lastModified = new Date();
        res.setHeader('Last-Modified', lastModified.toUTCString());
    }

    // Processar requisições com Range (streaming parcial)
    async handleRangeRequest(req, res, videoPath, serverId, fileSize, rangeHeader) {
        try {
            console.log(`📊 Processando Range request: ${rangeHeader}`);

            // Parse do header Range
            const ranges = this.parseRangeHeader(rangeHeader, fileSize);
            if (!ranges || ranges.length === 0) {
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return this.sendError(res, 416, 'Range Not Satisfiable');
            }

            // Usar apenas o primeiro range (HTTP/1.1 permite múltiplos, mas simplificamos)
            const { start, end } = ranges[0];
            const chunkSize = end - start + 1;

            console.log(`📊 Range: ${start}-${end}/${fileSize} (${chunkSize} bytes)`);

            // Headers para resposta parcial
            res.status(206); // Partial Content
            res.setHeader('Content-Length', chunkSize);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);

            // Stream do arquivo via SSH
            await this.streamFileChunk(res, videoPath, serverId, start, chunkSize);

        } catch (error) {
            console.error('❌ Erro no Range request:', error);
            return this.sendError(res, 500, 'Erro no streaming parcial');
        }
    }

    // Processar requisição de arquivo completo
    async handleFullFileRequest(res, videoPath, serverId, fileSize) {
        try {
            console.log(`📁 Streaming arquivo completo: ${fileSize} bytes`);

            res.setHeader('Content-Length', fileSize);
            
            // Stream do arquivo completo via SSH
            await this.streamFullFile(res, videoPath, serverId);

        } catch (error) {
            console.error('❌ Erro no streaming completo:', error);
            return this.sendError(res, 500, 'Erro no streaming completo');
        }
    }

    // Parse do header Range
    parseRangeHeader(rangeHeader, fileSize) {
        try {
            // Formato: "bytes=start-end"
            const ranges = [];
            const rangeSpec = rangeHeader.replace(/bytes=/, '');
            
            // Suporte a múltiplos ranges (separados por vírgula)
            const rangeList = rangeSpec.split(',');
            
            for (const range of rangeList) {
                const rangeParts = range.trim().split('-');
                let start = parseInt(rangeParts[0]) || 0;
                let end = parseInt(rangeParts[1]) || (fileSize - 1);

                // Validar range
                if (start >= fileSize || end >= fileSize || start > end) {
                    continue; // Range inválido, pular
                }

                // Casos especiais
                if (rangeParts[0] === '') {
                    // Formato "-500" (últimos 500 bytes)
                    start = Math.max(0, fileSize - parseInt(rangeParts[1]));
                    end = fileSize - 1;
                } else if (rangeParts[1] === '') {
                    // Formato "500-" (do byte 500 até o final)
                    end = fileSize - 1;
                }

                ranges.push({ start, end });
            }

            return ranges;
        } catch (error) {
            console.error('Erro ao parsear Range header:', error);
            return null;
        }
    }

    // Stream de chunk específico via SSH
    async streamFileChunk(res, videoPath, serverId, start, chunkSize) {
        try {
            const { conn } = await SSHManager.getConnection(serverId);

            // Comando otimizado para ler chunk específico
            const command = `dd if="${videoPath}" bs=1 skip=${start} count=${chunkSize} 2>/dev/null`;

            conn.exec(command, (err, stream) => {
                if (err) {
                    console.error('Erro ao executar comando SSH:', err);
                    return this.sendError(res, 500, 'Erro ao acessar arquivo no servidor');
                }

                // Configurar timeout para streams grandes
                stream.setTimeout(60000); // 60 segundos

                // Pipe do stream SSH para a resposta HTTP
                stream.pipe(res);

                stream.on('error', (streamErr) => {
                    console.error('Erro no stream SSH:', streamErr);
                    if (!res.headersSent) {
                        this.sendError(res, 500, 'Erro durante o streaming');
                    }
                });

                stream.on('end', () => {
                    console.log(`✅ Chunk streaming concluído: ${start}-${start + chunkSize - 1}`);
                });
            });

        } catch (error) {
            console.error('Erro no streaming de chunk:', error);
            throw error;
        }
    }

    // Stream de arquivo completo via SSH
    async streamFullFile(res, videoPath, serverId) {
        try {
            const { conn } = await SSHManager.getConnection(serverId);

            // Para arquivos grandes, usar comando otimizado
            const command = `cat "${videoPath}"`;

            conn.exec(command, (err, stream) => {
                if (err) {
                    console.error('Erro ao executar comando SSH:', err);
                    return this.sendError(res, 500, 'Erro ao acessar arquivo no servidor');
                }

                // Configurar timeout para arquivos grandes
                stream.setTimeout(120000); // 2 minutos

                // Pipe do stream SSH para a resposta HTTP
                stream.pipe(res);

                stream.on('error', (streamErr) => {
                    console.error('Erro no stream SSH:', streamErr);
                    if (!res.headersSent) {
                        this.sendError(res, 500, 'Erro durante o streaming');
                    }
                });

                stream.on('end', () => {
                    console.log(`✅ Streaming completo concluído: ${videoPath}`);
                });
            });

        } catch (error) {
            console.error('Erro no streaming completo:', error);
            throw error;
        }
    }

    // Gerar URLs de streaming otimizadas
    generateStreamingUrls(userLogin, folderName, fileName, serverId = null) {
        const isProduction = process.env.NODE_ENV === 'production';
        const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
        const wowzaUser = 'admin';
        const wowzaPassword = 'FK38Ca2SuE6jvJXed97VMn';
        
        // Garantir que arquivo é MP4
        const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');
        
        return {
            // URL direta do Wowza (seguindo padrão do video.php)
            direct: `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:6980/content/${userLogin}/${folderName}/${finalFileName}`,
            
            // URL HLS do Wowza (seguindo padrão do video.php)
            hls: `http://${wowzaHost}:1935/${userLogin}/_definst_/mp4:${folderName}/${finalFileName}/playlist.m3u8`,
            
            // URL VOD para download
            vod: `http://${wowzaHost}:1935/vod/_definst_/mp4:${userLogin}/${folderName}/${finalFileName}/playlist.m3u8`,
            
            // URL via backend (com autenticação)
            backend: `/content/${userLogin}/${folderName}/${finalFileName}`,
            
            // URL para streaming via SSH
            ssh_stream: `/api/video-stream/ssh/${Buffer.from(`${userLogin}/${folderName}/${finalFileName}`).toString('base64')}`,
            
            // URL para player iframe (seguindo padrão do video.php)
            iframe: `/api/players/iframe?login=${userLogin}&vod=${folderName}/${finalFileName}&aspectratio=16:9&player_type=1`,
            
            // Metadados
            metadata: {
                user: userLogin,
                folder: folderName,
                file: finalFileName,
                original_file: fileName,
                server_id: serverId,
                format: 'mp4',
                streaming_path: `/home/streaming/${userLogin}/${folderName}/${finalFileName}`,
                wowza_app: userLogin,
                wowza_host: wowzaHost
            }
        };
    }

    // Verificar se vídeo precisa de conversão
    async checkVideoCompatibility(videoPath, serverId, userBitrateLimit = 2500) {
        try {
            // Obter informações do vídeo via ffprobe
            const probeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}" 2>/dev/null || echo "NO_PROBE"`;
            const probeResult = await SSHManager.executeCommand(serverId, probeCommand);
            
            if (probeResult.stdout.includes('NO_PROBE')) {
                return {
                    compatible: false,
                    needs_conversion: true,
                    reason: 'Não foi possível analisar o arquivo',
                    current_bitrate: 0,
                    format: 'unknown'
                };
            }

            const probeData = JSON.parse(probeResult.stdout);
            const extension = path.extname(videoPath).toLowerCase();
            const isMP4 = extension === '.mp4';
            
            let videoBitrate = 0;
            let videoFormat = extension.substring(1);
            
            // Extrair bitrate do vídeo
            if (probeData.format && probeData.format.bit_rate) {
                videoBitrate = Math.floor(parseInt(probeData.format.bit_rate) / 1000); // Converter para kbps
            }
            
            // Se não conseguiu do format, tentar do stream de vídeo
            if (!videoBitrate && probeData.streams) {
                const videoStream = probeData.streams.find(s => s.codec_type === 'video');
                if (videoStream && videoStream.bit_rate) {
                    videoBitrate = Math.floor(parseInt(videoStream.bit_rate) / 1000);
                }
                if (videoStream && videoStream.codec_name) {
                    videoFormat = videoStream.codec_name;
                }
            }

            const bitrateExceedsLimit = videoBitrate > userBitrateLimit;
            const needsConversion = !isMP4 || bitrateExceedsLimit;

            return {
                compatible: isMP4 && !bitrateExceedsLimit,
                needs_conversion: needsConversion,
                is_mp4: isMP4,
                current_bitrate: videoBitrate,
                format: videoFormat,
                bitrate_exceeds_limit: bitrateExceedsLimit,
                user_bitrate_limit: userBitrateLimit,
                file_size: fileInfo.size,
                reason: needsConversion ? 
                    (bitrateExceedsLimit ? `Bitrate ${videoBitrate} kbps excede limite de ${userBitrateLimit} kbps` : 
                     !isMP4 ? `Formato ${extension} precisa ser convertido para MP4` : '') : 
                    'Arquivo compatível'
            };
        } catch (error) {
            console.error('Erro ao verificar compatibilidade:', error);
            return {
                compatible: false,
                needs_conversion: true,
                reason: 'Erro ao analisar arquivo',
                current_bitrate: 0,
                format: 'unknown'
            };
        }
    }

    // Converter vídeo para formato compatível
    async convertVideo(inputPath, outputPath, serverId, options = {}) {
        try {
            const {
                bitrate = 2500,
                resolution = '1920x1080',
                quality = 'fast',
                audio_bitrate = 128
            } = options;

            console.log(`🔄 Iniciando conversão: ${inputPath} -> ${outputPath}`);
            console.log(`⚙️ Configurações: ${bitrate}kbps, ${resolution}, qualidade: ${quality}`);

            // Verificar se arquivo de saída já existe
            const outputExists = await SSHManager.getFileInfo(serverId, outputPath);
            if (outputExists.exists) {
                console.log(`✅ Arquivo convertido já existe: ${outputPath}`);
                return { success: true, already_exists: true, output_path: outputPath };
            }

            // Comando FFmpeg otimizado
            const [width, height] = resolution.split('x');
            const ffmpegCommand = `ffmpeg -i "${inputPath}" ` +
                `-c:v libx264 -preset ${quality} -crf 23 ` +
                `-b:v ${bitrate}k -maxrate ${bitrate}k -bufsize ${bitrate * 2}k ` +
                `-vf scale=${width}:${height} ` +
                `-c:a aac -b:a ${audio_bitrate}k ` +
                `-movflags +faststart ` +
                `"${outputPath}" -y 2>/dev/null && echo "CONVERSION_SUCCESS" || echo "CONVERSION_ERROR"`;

            const conversionResult = await SSHManager.executeCommand(serverId, ffmpegCommand);

            if (conversionResult.stdout.includes('CONVERSION_SUCCESS')) {
                console.log(`✅ Conversão concluída: ${outputPath}`);
                
                // Definir permissões corretas
                await SSHManager.executeCommand(serverId, `chmod 644 "${outputPath}"`);
                
                return { 
                    success: true, 
                    converted: true, 
                    output_path: outputPath,
                    original_path: inputPath
                };
            } else {
                console.error(`❌ Erro na conversão FFmpeg: ${inputPath}`);
                return { 
                    success: false, 
                    error: 'Falha na conversão FFmpeg',
                    details: conversionResult.stderr || 'Erro desconhecido'
                };
            }

        } catch (error) {
            console.error('Erro na conversão de vídeo:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // Gerar thumbnail do vídeo
    async generateThumbnail(videoPath, thumbnailPath, serverId, timeOffset = '00:00:10') {
        try {
            console.log(`📸 Gerando thumbnail: ${videoPath} -> ${thumbnailPath}`);

            // Verificar se thumbnail já existe
            const thumbExists = await SSHManager.getFileInfo(serverId, thumbnailPath);
            if (thumbExists.exists) {
                return { success: true, already_exists: true, thumbnail_path: thumbnailPath };
            }

            // Comando FFmpeg para gerar thumbnail
            const ffmpegCommand = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 -s 320x180 "${thumbnailPath}" -y 2>/dev/null && echo "THUMB_SUCCESS" || echo "THUMB_ERROR"`;

            const result = await SSHManager.executeCommand(serverId, ffmpegCommand);

            if (result.stdout.includes('THUMB_SUCCESS')) {
                console.log(`✅ Thumbnail gerada: ${thumbnailPath}`);
                return { 
                    success: true, 
                    generated: true, 
                    thumbnail_path: thumbnailPath 
                };
            } else {
                console.error(`❌ Erro ao gerar thumbnail: ${videoPath}`);
                return { 
                    success: false, 
                    error: 'Falha ao gerar thumbnail' 
                };
            }

        } catch (error) {
            console.error('Erro ao gerar thumbnail:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // Obter informações detalhadas do vídeo
    async getVideoInfo(videoPath, serverId) {
        try {
            // Comando para obter informações básicas e detalhadas
            const commands = [
                `ls -la "${videoPath}"`,
                `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}" 2>/dev/null || echo "NO_FFPROBE"`
            ];

            const results = await Promise.all(
                commands.map(cmd => SSHManager.executeCommand(serverId, cmd))
            );

            const lsResult = results[0];
            const ffprobeResult = results[1];

            // Parse das informações básicas
            const lsParts = lsResult.stdout.trim().split(/\s+/);
            const fileSize = parseInt(lsParts[4]) || 0;
            const fileName = path.basename(videoPath);
            const extension = path.extname(fileName).toLowerCase();

            let videoInfo = {
                name: fileName,
                path: videoPath,
                size: fileSize,
                extension: extension,
                duration: 0,
                width: 0,
                height: 0,
                bitrate: 0,
                video_codec: 'unknown',
                audio_codec: 'unknown',
                format: extension.substring(1),
                is_mp4: extension === '.mp4',
                created: new Date().toISOString(),
                compatible: false
            };

            // Parse das informações do FFprobe
            if (!ffprobeResult.stdout.includes('NO_FFPROBE')) {
                try {
                    const ffprobeData = JSON.parse(ffprobeResult.stdout);

                    if (ffprobeData.format) {
                        videoInfo.duration = Math.floor(parseFloat(ffprobeData.format.duration) || 0);
                        videoInfo.bitrate = Math.floor(parseInt(ffprobeData.format.bit_rate) / 1000) || 0;
                    }

                    if (ffprobeData.streams) {
                        const videoStream = ffprobeData.streams.find(s => s.codec_type === 'video');
                        const audioStream = ffprobeData.streams.find(s => s.codec_type === 'audio');

                        if (videoStream) {
                            videoInfo.width = videoStream.width || 0;
                            videoInfo.height = videoStream.height || 0;
                            videoInfo.video_codec = videoStream.codec_name || 'unknown';
                            
                            // Se não conseguiu bitrate do format, usar do stream
                            if (!videoInfo.bitrate && videoStream.bit_rate) {
                                videoInfo.bitrate = Math.floor(parseInt(videoStream.bit_rate) / 1000) || 0;
                            }
                        }

                        if (audioStream) {
                            videoInfo.audio_codec = audioStream.codec_name || 'unknown';
                        }
                    }
                } catch (parseError) {
                    console.warn('Erro ao parsear dados do FFprobe:', parseError);
                }
            }

            // Determinar compatibilidade
            videoInfo.compatible = videoInfo.is_mp4 && videoInfo.bitrate > 0;

            return videoInfo;

        } catch (error) {
            console.error('Erro ao obter informações do vídeo:', error);
            return null;
        }
    }

    // Método auxiliar para enviar erros
    sendError(res, statusCode, message) {
        if (!res.headersSent) {
            res.status(statusCode).json({ 
                error: message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Método para validar formato de vídeo
    isValidVideoFormat(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        const validExtensions = [
            '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
            '.3gp', '.3g2', '.ts', '.mpg', '.mpeg', '.ogv', '.m4v', '.asf'
        ];
        return validExtensions.includes(extension);
    }

    // Método para estimar tamanho após conversão
    estimateConvertedSize(originalSize, originalBitrate, targetBitrate) {
        if (!originalBitrate || originalBitrate === 0) {
            // Se não sabemos o bitrate original, usar estimativa conservadora
            return Math.floor(originalSize * 0.7); // 70% do tamanho original
        }

        // Calcular proporcionalmente baseado no bitrate
        const ratio = targetBitrate / originalBitrate;
        return Math.floor(originalSize * ratio);
    }

    // Método para limpar arquivos temporários de conversão
    async cleanupTempFiles(serverId, userLogin, maxAge = 3600000) { // 1 hora
        try {
            const tempPath = `/usr/local/WowzaStreamingEngine/content/${userLogin}/temp`;
            
            // Comando para encontrar e remover arquivos temporários antigos
            const cleanupCommand = `find "${tempPath}" -type f \\( -name "*.tmp" -o -name "*.part" \\) -mmin +60 -delete 2>/dev/null || true`;
            
            await SSHManager.executeCommand(serverId, cleanupCommand);
            console.log(`🧹 Limpeza de arquivos temporários concluída para ${userLogin}`);
            
            return { success: true };
        } catch (error) {
            console.error('Erro na limpeza de arquivos temporários:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new VideoStreamingService();