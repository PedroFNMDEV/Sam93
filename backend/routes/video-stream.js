const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const VideoStreamingService = require('../services/VideoStreamingService');
const SSHManager = require('../config/SSHManager');
const db = require('../config/database');

const router = express.Router();

// GET /api/video-stream/ssh/:videoId - Stream de vídeo via SSH com Range support
router.get('/ssh/:videoId', authMiddleware, async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

        // Decodificar videoId (base64)
        let relativePath;
        try {
            relativePath = Buffer.from(videoId, 'base64').toString('utf-8');
        } catch (decodeError) {
            return res.status(400).json({ error: 'ID de vídeo inválido' });
        }

        console.log(`🎥 Solicitação de stream SSH: ${relativePath} para usuário ${userLogin}`);

        // Verificar se o caminho pertence ao usuário
        if (!relativePath.includes(`${userLogin}/`)) {
            return res.status(403).json({ error: 'Acesso negado ao vídeo' });
        }

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Construir caminho completo no servidor
        const fullPath = `/usr/local/WowzaStreamingEngine/content/${relativePath}`;

        // Verificar se é formato de vídeo válido
        if (!VideoStreamingService.isValidVideoFormat(fullPath)) {
            return res.status(400).json({ 
                error: 'Formato de arquivo não suportado',
                details: 'Apenas arquivos de vídeo são permitidos'
            });
        }

        // Verificar compatibilidade do vídeo
        const compatibility = await VideoStreamingService.checkVideoCompatibility(
            fullPath, 
            serverId, 
            req.user.bitrate || 2500
        );

        // Se vídeo não é compatível, tentar conversão automática
        if (!compatibility.compatible && compatibility.needs_conversion) {
            const convertedPath = fullPath.replace(/\.[^/.]+$/, '.mp4');
            
            // Verificar se versão convertida já existe
            const convertedExists = await SSHManager.getFileInfo(serverId, convertedPath);
            
            if (!convertedExists.exists) {
                console.log(`🔄 Vídeo não compatível, iniciando conversão: ${fullPath}`);
                
                // Iniciar conversão em background
                VideoStreamingService.convertVideo(fullPath, convertedPath, serverId, {
                    bitrate: Math.min(compatibility.current_bitrate || 2500, req.user.bitrate || 2500),
                    resolution: '1920x1080',
                    quality: 'fast'
                }).then(conversionResult => {
                    if (conversionResult.success) {
                        console.log(`✅ Conversão concluída em background: ${convertedPath}`);
                    } else {
                        console.error(`❌ Erro na conversão em background: ${conversionResult.error}`);
                    }
                }).catch(conversionError => {
                    console.error('Erro na conversão em background:', conversionError);
                });
                
                // Por enquanto, servir arquivo original
                console.log(`⚠️ Servindo arquivo original enquanto conversão está em andamento`);
            } else {
                // Usar arquivo convertido
                console.log(`✅ Usando arquivo convertido: ${convertedPath}`);
                return await VideoStreamingService.streamVideo(req, res, convertedPath, serverId);
            }
        }

        // Stream do vídeo (original ou convertido)
        await VideoStreamingService.streamVideo(req, res, fullPath, serverId);

    } catch (error) {
        console.error('❌ Erro no stream SSH:', error);
        return res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
});

// GET /api/video-stream/info/:videoId - Informações do vídeo
router.get('/info/:videoId', authMiddleware, async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

        // Decodificar videoId
        let relativePath;
        try {
            relativePath = Buffer.from(videoId, 'base64').toString('utf-8');
        } catch (decodeError) {
            return res.status(400).json({ error: 'ID de vídeo inválido' });
        }

        // Verificar acesso
        if (!relativePath.includes(`${userLogin}/`)) {
            return res.status(403).json({ error: 'Acesso negado ao vídeo' });
        }

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
        const fullPath = `/usr/local/WowzaStreamingEngine/content/${relativePath}`;

        // Obter informações detalhadas
        const videoInfo = await VideoStreamingService.getVideoInfo(fullPath, serverId);
        
        if (!videoInfo) {
            return res.status(404).json({ error: 'Vídeo não encontrado' });
        }

        // Verificar compatibilidade
        const compatibility = await VideoStreamingService.checkVideoCompatibility(
            fullPath, 
            serverId, 
            req.user.bitrate || 2500
        );

        // Gerar URLs de streaming
        const pathParts = relativePath.split('/');
        const userFolder = pathParts[0];
        const folderName = pathParts[1];
        const fileName = pathParts[2];

        const streamingUrls = VideoStreamingService.generateStreamingUrls(
            userFolder, 
            folderName, 
            fileName, 
            serverId
        );

        res.json({
            success: true,
            video_info: {
                ...videoInfo,
                compatibility,
                streaming_urls: streamingUrls
            }
        });

    } catch (error) {
        console.error('Erro ao obter informações do vídeo:', error);
        res.status(500).json({ 
            error: 'Erro ao obter informações do vídeo',
            details: error.message 
        });
    }
});

// POST /api/video-stream/convert/:videoId - Converter vídeo
router.post('/convert/:videoId', authMiddleware, async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
        const { bitrate, resolution, quality = 'fast' } = req.body;

        // Validar parâmetros
        const userBitrateLimit = req.user.bitrate || 2500;
        const targetBitrate = Math.min(bitrate || userBitrateLimit, userBitrateLimit);

        if (targetBitrate > userBitrateLimit) {
            return res.status(400).json({ 
                error: `Bitrate solicitado (${bitrate} kbps) excede o limite do plano (${userBitrateLimit} kbps)` 
            });
        }

        // Decodificar videoId
        let relativePath;
        try {
            relativePath = Buffer.from(videoId, 'base64').toString('utf-8');
        } catch (decodeError) {
            return res.status(400).json({ error: 'ID de vídeo inválido' });
        }

        // Verificar acesso
        if (!relativePath.includes(`${userLogin}/`)) {
            return res.status(403).json({ error: 'Acesso negado ao vídeo' });
        }

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
        const inputPath = `/usr/local/WowzaStreamingEngine/content/${relativePath}`;
        const outputPath = inputPath.replace(/\.[^/.]+$/, `_${targetBitrate}kbps.mp4`);

        // Iniciar conversão
        const conversionResult = await VideoStreamingService.convertVideo(
            inputPath, 
            outputPath, 
            serverId, 
            {
                bitrate: targetBitrate,
                resolution: resolution || '1920x1080',
                quality: quality
            }
        );

        if (conversionResult.success) {
            // Gerar URLs para o arquivo convertido
            const pathParts = relativePath.split('/');
            const userFolder = pathParts[0];
            const folderName = pathParts[1];
            const originalFileName = pathParts[2];
            const convertedFileName = originalFileName.replace(/\.[^/.]+$/, `_${targetBitrate}kbps.mp4`);

            const streamingUrls = VideoStreamingService.generateStreamingUrls(
                userFolder, 
                folderName, 
                convertedFileName, 
                serverId
            );

            res.json({
                success: true,
                message: conversionResult.already_exists ? 
                    'Arquivo convertido já existia' : 
                    'Conversão concluída com sucesso',
                conversion_result: conversionResult,
                streaming_urls: streamingUrls,
                converted_file: {
                    path: outputPath,
                    bitrate: targetBitrate,
                    resolution: resolution || '1920x1080'
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Erro na conversão',
                details: conversionResult.error
            });
        }

    } catch (error) {
        console.error('Erro ao converter vídeo:', error);
        res.status(500).json({ 
            error: 'Erro ao converter vídeo',
            details: error.message 
        });
    }
});

// GET /api/video-stream/thumbnail/:videoId - Gerar/obter thumbnail
router.get('/thumbnail/:videoId', authMiddleware, async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
        const { time = '00:00:10' } = req.query;

        // Decodificar videoId
        let relativePath;
        try {
            relativePath = Buffer.from(videoId, 'base64').toString('utf-8');
        } catch (decodeError) {
            return res.status(400).json({ error: 'ID de vídeo inválido' });
        }

        // Verificar acesso
        if (!relativePath.includes(`${userLogin}/`)) {
            return res.status(403).json({ error: 'Acesso negado ao vídeo' });
        }

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
        const videoPath = `/usr/local/WowzaStreamingEngine/content/${relativePath}`;
        const thumbnailPath = videoPath.replace(/\.[^/.]+$/, '_thumb.jpg');

        // Gerar thumbnail
        const thumbnailResult = await VideoStreamingService.generateThumbnail(
            videoPath, 
            thumbnailPath, 
            serverId, 
            time
        );

        if (thumbnailResult.success) {
            // Stream da thumbnail
            await VideoStreamingService.streamVideo(req, res, thumbnailPath, serverId);
        } else {
            res.status(500).json({
                success: false,
                error: 'Erro ao gerar thumbnail',
                details: thumbnailResult.error
            });
        }

    } catch (error) {
        console.error('Erro ao gerar thumbnail:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar thumbnail',
            details: error.message 
        });
    }
});

// GET /api/video-stream/urls/:userLogin/:folderName/:fileName - Gerar URLs de streaming
router.get('/urls/:userLogin/:folderName/:fileName', authMiddleware, async (req, res) => {
    try {
        const { userLogin, folderName, fileName } = req.params;
        const userId = req.user.id;
        const userEmail = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

        // Verificar se usuário tem acesso
        if (userLogin !== userEmail) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Gerar URLs de streaming
        const streamingUrls = VideoStreamingService.generateStreamingUrls(
            userLogin, 
            folderName, 
            fileName, 
            serverId
        );

        // Verificar se arquivo existe
        const fullPath = `/usr/local/WowzaStreamingEngine/content/${userLogin}/${folderName}/${fileName}`;
        const fileInfo = await SSHManager.getFileInfo(serverId, fullPath);

        if (!fileInfo.exists) {
            return res.status(404).json({ 
                error: 'Arquivo não encontrado',
                urls: streamingUrls // Retornar URLs mesmo assim para debug
            });
        }

        // Obter informações de compatibilidade
        const compatibility = await VideoStreamingService.checkVideoCompatibility(
            fullPath, 
            serverId, 
            req.user.bitrate || 2500
        );

        res.json({
            success: true,
            urls: streamingUrls,
            file_info: {
                exists: true,
                size: fileInfo.size,
                compatibility: compatibility
            },
            server_info: {
                id: serverId,
                dynamic: true
            }
        });

    } catch (error) {
        console.error('Erro ao gerar URLs de streaming:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar URLs de streaming',
            details: error.message 
        });
    }
});

// POST /api/video-stream/batch-convert - Conversão em lote
router.post('/batch-convert', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userLogin = req.user.usuario || `user_${userId}`;
        const { video_paths, bitrate, resolution, quality = 'fast' } = req.body;

        if (!video_paths || !Array.isArray(video_paths) || video_paths.length === 0) {
            return res.status(400).json({ 
                error: 'Lista de vídeos é obrigatória' 
            });
        }

        const userBitrateLimit = req.user.bitrate || 2500;
        const targetBitrate = Math.min(bitrate || userBitrateLimit, userBitrateLimit);

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        const results = [];

        for (const relativePath of video_paths) {
            try {
                // Verificar se caminho pertence ao usuário
                if (!relativePath.includes(`${userLogin}/`)) {
                    results.push({
                        path: relativePath,
                        success: false,
                        error: 'Acesso negado'
                    });
                    continue;
                }

                const inputPath = `/usr/local/WowzaStreamingEngine/content/${relativePath}`;
                const outputPath = inputPath.replace(/\.[^/.]+$/, `_${targetBitrate}kbps.mp4`);

                // Iniciar conversão
                const conversionResult = await VideoStreamingService.convertVideo(
                    inputPath, 
                    outputPath, 
                    serverId, 
                    {
                        bitrate: targetBitrate,
                        resolution: resolution || '1920x1080',
                        quality: quality
                    }
                );

                results.push({
                    path: relativePath,
                    success: conversionResult.success,
                    output_path: conversionResult.success ? outputPath : null,
                    error: conversionResult.error || null,
                    already_exists: conversionResult.already_exists || false
                });

            } catch (videoError) {
                results.push({
                    path: relativePath,
                    success: false,
                    error: videoError.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;

        res.json({
            success: true,
            message: `${successCount} de ${video_paths.length} conversões processadas`,
            results: results,
            target_bitrate: targetBitrate,
            target_resolution: resolution || '1920x1080'
        });

    } catch (error) {
        console.error('Erro na conversão em lote:', error);
        res.status(500).json({ 
            error: 'Erro na conversão em lote',
            details: error.message 
        });
    }
});

// DELETE /api/video-stream/cleanup/:userLogin - Limpeza de arquivos temporários
router.delete('/cleanup/:userLogin', authMiddleware, async (req, res) => {
    try {
        const { userLogin } = req.params;
        const userId = req.user.id;
        const userLoginAuth = req.user.usuario || `user_${userId}`;

        // Verificar se usuário tem acesso
        if (userLogin !== userLoginAuth) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Executar limpeza
        const cleanupResult = await VideoStreamingService.cleanupTempFiles(serverId, userLogin);

        res.json({
            success: cleanupResult.success,
            message: cleanupResult.success ? 
                'Limpeza de arquivos temporários concluída' : 
                'Erro na limpeza de arquivos temporários',
            error: cleanupResult.error || null
        });

    } catch (error) {
        console.error('Erro na limpeza:', error);
        res.status(500).json({ 
            error: 'Erro na limpeza',
            details: error.message 
        });
    }
});

module.exports = router;