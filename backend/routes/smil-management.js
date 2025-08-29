const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const PlaylistSMILService = require('../services/PlaylistSMILService');

const router = express.Router();

// GET /api/smil-management/status - Verificar status do arquivo SMIL do usuário
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

        // Verificar se arquivo SMIL existe
        const smilExists = await PlaylistSMILService.checkSMILExists(serverId, userLogin);

        // Buscar estatísticas das playlists
        const [playlistStats] = await db.execute(
            `SELECT 
                COUNT(*) as total_playlists,
                SUM(total_videos) as total_videos
             FROM playlists 
             WHERE codigo_stm = ?`,
            [userId]
        );

        res.json({
            success: true,
            user_login: userLogin,
            server_id: serverId,
            smil_exists: smilExists,
            smil_path: `/home/streaming/${userLogin}/playlists_agendamentos.smil`,
            playlist_stats: playlistStats[0] || { total_playlists: 0, total_videos: 0 }
        });

    } catch (error) {
        console.error('Erro ao verificar status SMIL:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status do arquivo SMIL',
            details: error.message
        });
    }
});

// POST /api/smil-management/generate - Gerar arquivo SMIL
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
        const { force_regenerate = false } = req.body;

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );
        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Verificar se já existe (se não for regeneração forçada)
        if (!force_regenerate) {
            const smilExists = await PlaylistSMILService.checkSMILExists(serverId, userLogin);
            if (smilExists) {
                return res.json({
                    success: true,
                    message: 'Arquivo SMIL já existe',
                    smil_path: `/home/streaming/${userLogin}/playlists_agendamentos.smil`,
                    regenerated: false
                });
            }
        }

        // Gerar arquivo SMIL
        const result = await PlaylistSMILService.generateUserSMIL(userId, userLogin, serverId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Arquivo SMIL gerado com sucesso',
                smil_path: result.smil_path,
                playlists_count: result.playlists_count,
                total_videos: result.total_videos,
                regenerated: force_regenerate
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || result.message
            });
        }

    } catch (error) {
        console.error('Erro ao gerar arquivo SMIL:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar arquivo SMIL',
            details: error.message
        });
    }
});

// DELETE /api/smil-management/remove - Remover arquivo SMIL
router.delete('/remove', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );
        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Remover arquivo SMIL
        const result = await PlaylistSMILService.removeUserSMIL(serverId, userLogin);

        if (result.success) {
            res.json({
                success: true,
                message: 'Arquivo SMIL removido com sucesso'
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Erro ao remover arquivo SMIL:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao remover arquivo SMIL',
            details: error.message
        });
    }
});

// POST /api/smil-management/generate-all - Gerar SMIL para todos os usuários (admin)
router.post('/generate-all', authMiddleware, async (req, res) => {
    try {
        // Verificar se usuário tem permissão (apenas revendas ou admin)
        if (req.user.tipo !== 'revenda') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado. Apenas revendas podem executar esta ação.'
            });
        }

        // Gerar SMIL para todos os usuários
        const result = await PlaylistSMILService.generateAllUsersSMIL();

        res.json({
            success: result.success,
            message: result.success ? 
                `Arquivos SMIL gerados: ${result.success_count}/${result.total_users} usuários` :
                'Erro ao gerar arquivos SMIL',
            total_users: result.total_users,
            success_count: result.success_count,
            results: result.results,
            error: result.error
        });

    } catch (error) {
        console.error('Erro ao gerar SMIL para todos os usuários:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// GET /api/smil-management/content/:userLogin - Visualizar conteúdo do arquivo SMIL
router.get('/content/:userLogin', authMiddleware, async (req, res) => {
    try {
        const { userLogin } = req.params;
        const userId = req.user.id;
        
        // Verificar se usuário tem acesso
        const userLoginAuth = req.user.usuario || `user_${userId}`;
        if (userLogin !== userLoginAuth && req.user.tipo !== 'revenda') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }

        // Buscar servidor do usuário
        const [serverRows] = await db.execute(
            'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
            [userId]
        );
        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

        // Ler conteúdo do arquivo SMIL
        const smilPath = `/home/streaming/${userLogin}/playlists_agendamentos.smil`;
        const SSHManager = require('../config/SSHManager');
        
        try {
            const readCommand = `cat "${smilPath}" 2>/dev/null || echo "FILE_NOT_FOUND"`;
            const result = await SSHManager.executeCommand(serverId, readCommand);
            
            if (result.stdout.includes('FILE_NOT_FOUND')) {
                return res.status(404).json({
                    success: false,
                    error: 'Arquivo SMIL não encontrado'
                });
            }

            res.setHeader('Content-Type', 'application/xml');
            res.send(result.stdout);

        } catch (sshError) {
            console.error('Erro ao ler arquivo SMIL:', sshError);
            res.status(500).json({
                success: false,
                error: 'Erro ao ler arquivo SMIL do servidor'
            });
        }

    } catch (error) {
        console.error('Erro ao obter conteúdo SMIL:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

module.exports = router;