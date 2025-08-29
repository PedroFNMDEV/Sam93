const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const SSHManager = require('../config/SSHManager');
const WowzaConfigManager = require('../config/WowzaConfigManager');

const router = express.Router();

// GET /api/user-wowza-setup/status - Verificar status da estrutura do usuário
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            `SELECT servidor_id FROM folders 
             WHERE (user_id = ? OR user_id IN (
               SELECT codigo_cliente FROM streamings WHERE codigo = ?
             )) LIMIT 1`,
            [userId, userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Verificar estrutura completa
        const structureStatus = await SSHManager.checkCompleteUserStructure(serverId, userLogin);

        // Verificar se arquivo SMIL existe
        const PlaylistSMILService = require('../services/PlaylistSMILService');
        const smilExists = await PlaylistSMILService.checkSMILExists(serverId, userLogin);

        res.json({
            success: true,
            user_login: userLogin,
            server_id: serverId,
            structure_status: structureStatus,
            smil_exists: smilExists,
            paths: {
                streaming_base: `/home/streaming/${userLogin}`,
                wowza_config: `/usr/local/WowzaStreamingEngine-4.8.0/conf/${userLogin}`,
                recordings: `/home/streaming/${userLogin}/recordings`,
                smil_file: `/home/streaming/${userLogin}/playlists_agendamentos.smil`,
                ftpquota: `/home/streaming/${userLogin}/.ftpquota`
            }
        });

    } catch (error) {
        console.error('Erro ao verificar status da estrutura:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status da estrutura',
            details: error.message
        });
    }
});

// POST /api/user-wowza-setup/create - Criar estrutura completa do usuário
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
        const { force_recreate = false } = req.body;

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            `SELECT servidor_id FROM folders 
             WHERE (user_id = ? OR user_id IN (
               SELECT codigo_cliente FROM streamings WHERE codigo = ?
             )) LIMIT 1`,
            [userId, userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Verificar se já existe
        if (!force_recreate) {
            const structureStatus = await SSHManager.checkCompleteUserStructure(serverId, userLogin);
            if (structureStatus.complete) {
                return res.json({
                    success: true,
                    message: 'Estrutura já existe e está completa',
                    structure_status: structureStatus
                });
            }
        }

        // Criar estrutura completa
        const userConfig = {
            bitrate: req.user.bitrate || 2500,
            espectadores: req.user.espectadores || 100,
            status_gravando: 'nao'
        };

        await SSHManager.createCompleteUserStructure(serverId, userLogin, userConfig);

        // Verificar se foi criado com sucesso
        const finalStatus = await SSHManager.checkCompleteUserStructure(serverId, userLogin);

        // Gerar arquivo SMIL inicial
        const PlaylistSMILService = require('../services/PlaylistSMILService');
        const smilResult = await PlaylistSMILService.generateUserSMIL(userId, userLogin, serverId);

        res.json({
            success: true,
            message: 'Estrutura criada com sucesso',
            user_login: userLogin,
            server_id: serverId,
            structure_status: finalStatus,
            config_applied: userConfig,
            smil_generated: smilResult.success,
            smil_info: smilResult.success ? {
                path: smilResult.smil_path,
                playlists: smilResult.playlists_count,
                videos: smilResult.total_videos
            } : null
        });

    } catch (error) {
        console.error('Erro ao criar estrutura do usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar estrutura do usuário',
            details: error.message
        });
    }
});

// POST /api/user-wowza-setup/migrate - Migrar vídeos para nova estrutura
router.post('/migrate', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            `SELECT servidor_id FROM folders 
             WHERE (user_id = ? OR user_id IN (
               SELECT codigo_cliente FROM streamings WHERE codigo = ?
             )) LIMIT 1`,
            [userId, userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Buscar vídeos do usuário no banco
        const [videoRows] = await db.execute(
            `SELECT id, nome, caminho, pasta FROM videos 
             WHERE codigo_cliente = ? AND caminho LIKE '%WowzaStreamingEngine%'`,
            [userId]
        );

        if (videoRows.length === 0) {
            return res.json({
                success: true,
                message: 'Nenhum vídeo para migrar',
                migrated_count: 0
            });
        }

        // Buscar dados das pastas
        const [folderRows] = await db.execute(
            'SELECT id, nome_sanitizado FROM folders WHERE user_id = ?',
            [userId]
        );

        const folderMap = {};
        folderRows.forEach(folder => {
            folderMap[folder.id] = folder.nome_sanitizado;
        });

        let migratedCount = 0;
        const errors = [];

        for (const video of videoRows) {
            try {
                const folderName = folderMap[video.pasta] || 'default';
                const fileName = path.basename(video.caminho);
                
                // Migrar vídeo para nova estrutura
                const migrationResult = await WowzaConfigManager.migrateVideoToNewStructure(
                    serverId, 
                    userLogin, 
                    folderName, 
                    video.caminho, 
                    fileName
                );

                if (migrationResult.success) {
                    // Atualizar caminho no banco
                    const newRelativePath = `streaming/${userLogin}/${folderName}/${fileName}`;
                    await db.execute(
                        'UPDATE videos SET caminho = ?, url = ? WHERE id = ?',
                        [migrationResult.newPath, `${userLogin}/${folderName}/${fileName}`, video.id]
                    );

                    migratedCount++;
                    console.log(`✅ Vídeo migrado: ${video.nome}`);
                } else {
                    errors.push(`Erro ao migrar ${video.nome}: ${migrationResult.error}`);
                }

            } catch (videoError) {
                errors.push(`Erro ao migrar ${video.nome}: ${videoError.message}`);
            }
        }

        // Atualizar arquivo SMIL após migração
        try {
            const PlaylistSMILService = require('../services/PlaylistSMILService');
            await PlaylistSMILService.updateUserSMIL(userId, userLogin, serverId);
            console.log(`✅ Arquivo SMIL atualizado após migração para usuário ${userLogin}`);
        } catch (smilError) {
            console.warn('Erro ao atualizar SMIL após migração:', smilError.message);
        }

        res.json({
            success: true,
            message: `Migração concluída: ${migratedCount} vídeos migrados`,
            migrated_count: migratedCount,
            total_videos: videoRows.length,
            errors: errors
        });

    } catch (error) {
        console.error('Erro na migração:', error);
        res.status(500).json({
            success: false,
            error: 'Erro na migração de vídeos',
            details: error.message
        });
    }
});

// GET /api/user-wowza-setup/urls/:folderName/:fileName - Gerar URLs para nova estrutura
router.get('/urls/:folderName/:fileName', authMiddleware, async (req, res) => {
    try {
        const { folderName, fileName } = req.params;
        const userId = req.user.id;
        const userLogin = req.user.usuario || `user_${userId}`;

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            `SELECT servidor_id FROM folders 
             WHERE (user_id = ? OR user_id IN (
               SELECT codigo_cliente FROM streamings WHERE codigo = ?
             )) LIMIT 1`,
            [userId, userId]
        );

        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Gerar URLs usando nova estrutura
        const urls = WowzaConfigManager.buildVideoUrls(userLogin, folderName, fileName, serverId);

        // Verificar se arquivo existe na nova estrutura
        const fullPath = `/home/streaming/${userLogin}/${folderName}/${fileName}`;
        const fileInfo = await SSHManager.getFileInfo(serverId, fullPath);

        res.json({
            success: true,
            urls: urls,
            file_info: {
                exists: fileInfo.exists,
                size: fileInfo.size,
                path: fullPath
            },
            structure_info: {
                streaming_path: `/home/streaming/${userLogin}`,
                wowza_app: userLogin,
                wowza_config: `/usr/local/WowzaStreamingEngine-4.8.0/conf/${userLogin}`
            }
        });

    } catch (error) {
        console.error('Erro ao gerar URLs:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar URLs',
            details: error.message
        });
    }
});

module.exports = router;