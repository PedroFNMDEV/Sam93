const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const SSHManager = require('../config/SSHManager');

const router = express.Router();

// GET /api/dados-conexao/obs-config - Configuração para OBS
router.get('/obs-config', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
    
    // Buscar configurações do usuário
    const [userConfigRows] = await db.execute(
      `SELECT 
        bitrate, espectadores, espaco, espaco_usado, aplicacao,
        status_gravando, transcoder, transcoder_qualidades, codigo_servidor
       FROM streamings 
       WHERE (codigo_cliente = ? OR codigo = ?) AND status = 1 LIMIT 1`,
      [userId, userId]
    );

    if (userConfigRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Configurações do usuário não encontradas' 
      });
    }

    const userConfig = userConfigRows[0];
    
    // Buscar servidor do usuário através das pastas
    const [serverRows] = await db.execute(
      'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : (userConfig.codigo_servidor || 1);

    // Buscar informações do servidor
    const [wowzaServerRows] = await db.execute(
      `SELECT 
        codigo, nome, limite_streamings, streamings_ativas, 
        load_cpu, tipo_servidor, status
       FROM wowza_servers 
       WHERE codigo = ?`,
      [serverId]
    );

    const serverInfo = wowzaServerRows.length > 0 ? wowzaServerRows[0] : null;

    // Verificar se há bitrate solicitado na requisição
    const requestedBitrate = req.query.bitrate ? parseInt(req.query.bitrate) : null;
    const maxBitrate = userConfig.bitrate || 2500;
    const allowedBitrate = requestedBitrate ? Math.min(requestedBitrate, maxBitrate) : maxBitrate;

    // Garantir que o diretório do usuário existe no servidor (sem cooldown)
    try {
      const userPath = `/home/streaming/${userLogin}`;
      const pathExists = await SSHManager.checkDirectoryExists(serverId, userPath);
      
      if (!pathExists) {
        console.log(`📁 Criando estrutura para usuário ${userLogin} no servidor ${serverId}`);
        await SSHManager.createCompleteUserStructure(serverId, userLogin, {
          bitrate: userConfig.bitrate || 2500,
          espectadores: userConfig.espectadores || 100,
          status_gravando: userConfig.status_gravando || 'nao'
        });
      }
    } catch (dirError) {
      console.warn('Aviso: Erro ao verificar/criar diretório do usuário:', dirError.message);
    }

    // Verificar limites e gerar avisos
    const warnings = [];
    if (requestedBitrate && requestedBitrate > maxBitrate) {
      warnings.push(`Bitrate solicitado (${requestedBitrate} kbps) excede o limite do plano (${maxBitrate} kbps). Será limitado automaticamente.`);
    }
    if (serverInfo && serverInfo.streamings_ativas >= serverInfo.limite_streamings * 0.9) {
      warnings.push('Servidor próximo do limite de capacidade');
    }
    if (serverInfo && serverInfo.load_cpu > 80) {
      warnings.push('Servidor com alta carga de CPU');
    }
    
    const usedSpace = userConfig.espaco_usado || 0;
    const totalSpace = userConfig.espaco || 1000;
    const storagePercentage = Math.round((usedSpace / totalSpace) * 100);
    
    if (storagePercentage > 90) {
      warnings.push('Espaço de armazenamento quase esgotado');
    }

    res.json({
      success: true,
      obs_config: {
        rtmp_url: `rtmp://samhost.wcore.com.br:1935/${userLogin}`,
        stream_key: `${userLogin}_live`,
        hls_url: `http://samhost.wcore.com.br:1935/${userLogin}/${userLogin}_live/playlist.m3u8`,
        max_bitrate: allowedBitrate,
        max_viewers: userConfig.espectadores,
        recording_enabled: userConfig.status_gravando === 'sim',
        recording_path: `/home/streaming/${userLogin}/recordings/`
      },
      user_limits: {
        bitrate: {
          max: maxBitrate,
          requested: requestedBitrate || maxBitrate,
          allowed: allowedBitrate
        },
        viewers: {
          max: userConfig.espectadores || 100
        },
        storage: {
          max: totalSpace,
          used: usedSpace,
          available: totalSpace - usedSpace,
          percentage: storagePercentage
        }
      },
      warnings: warnings,
      server_info: serverInfo,
      wowza_status: warnings.some(w => w.includes('Wowza API indisponível')) ? 'degraded' : 'online'
    });
  } catch (error) {
    console.error('Erro ao obter configuração OBS:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;