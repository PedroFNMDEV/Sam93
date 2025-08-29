const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const PlaylistSMILService = require('../services/PlaylistSMILService');

const router = express.Router();

// GET /api/playlists - Lista playlists do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT id, nome, total_videos, duracao_total 
       FROM playlists 
       WHERE (codigo_stm = ? OR codigo_stm IN (
         SELECT codigo_cliente FROM streamings WHERE codigo = ?
       )) 
       ORDER BY id`,
      [userId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar playlists:', err);
    res.status(500).json({ error: 'Erro ao buscar playlists', details: err.message });
  }
});

// POST /api/playlists - Cria nova playlist
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome da playlist é obrigatório' });
    
    const userId = req.user.id;

    const [result] = await db.execute(
      'INSERT INTO playlists (nome, codigo_stm, data_criacao) VALUES (?, ?, NOW())',
      [nome, userId]
    );

    const [newPlaylist] = await db.execute(
      'SELECT id, nome FROM playlists WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newPlaylist[0]);
  } catch (err) {
    console.error('Erro ao criar playlist:', err);
    res.status(500).json({ error: 'Erro ao criar playlist', details: err.message });
  }
});

// GET /api/playlists/:id/videos - Lista vídeos da playlist
router.get('/:id/videos', authMiddleware, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user.id;

    // Verificar se playlist pertence ao usuário
    const [playlistRows] = await db.execute(
      'SELECT id FROM playlists WHERE id = ? AND codigo_stm = ?',
      [playlistId, userId]
    );

    if (playlistRows.length === 0) {
      return res.status(404).json({ error: 'Playlist não encontrada' });
    }

    const [rows] = await db.execute(
      `SELECT 
        v.id,
        0 as ordem,
        v.nome,
        v.url,
        v.duracao
       FROM videos v
       WHERE v.playlist_id = ?
       ORDER BY v.id`,
      [playlistId]
    );

    // Ajustar URLs para serem acessíveis
    const videos = rows.map(video => ({
      id: video.id,
      ordem: video.ordem,
      videos: {
        id: video.id,
        nome: video.nome,
        url: video.url,
        duracao: video.duracao
      }
    }));

    res.json(videos);
  } catch (err) {
    console.error('Erro ao buscar vídeos da playlist:', err);
    res.status(500).json({ error: 'Erro ao buscar vídeos da playlist', details: err.message });
  }
});

// PUT /api/playlists/:id - Atualiza playlist
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { nome, videos } = req.body;
    const userId = req.user.id;

    // Verificar se playlist pertence ao usuário
    const [playlistRows] = await db.execute(
      'SELECT id FROM playlists WHERE id = ? AND codigo_stm = ?',
      [playlistId, userId]
    );

    if (playlistRows.length === 0) {
      return res.status(404).json({ error: 'Playlist não encontrada' });
    }

    // Atualizar nome da playlist
    if (nome) {
      await db.execute(
        'UPDATE playlists SET nome = ? WHERE id = ?',
        [nome, playlistId]
      );
    }

    // Atualizar vídeos se fornecidos
    if (videos && Array.isArray(videos)) {
      // Limpar playlist_id dos vídeos atuais
      await db.execute(
        'UPDATE videos SET playlist_id = NULL WHERE playlist_id = ?',
        [playlistId]
      );

      // Atualizar vídeos selecionados com o playlist_id
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        await db.execute(
          'UPDATE videos SET playlist_id = ? WHERE id = ?',
          [playlistId, video.id]
        );
      }

      // Atualizar estatísticas da playlist
      const [stats] = await db.execute(
        `SELECT 
          COUNT(*) as total_videos,
          SUM(duracao) as duracao_total
         FROM videos 
         WHERE playlist_id = ?`,
        [playlistId]
      );

      if (stats.length > 0) {
        await db.execute(
          'UPDATE playlists SET total_videos = ?, duracao_total = ? WHERE id = ?',
          [stats[0].total_videos, stats[0].duracao_total || 0, playlistId]
        );
      }

      // Atualizar arquivo SMIL do usuário
      try {
        const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${req.user.id}`;
        const [serverRows] = await db.execute(
          'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
          [req.user.id]
        );
        const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
        
        await PlaylistSMILService.updateUserSMIL(req.user.id, userLogin, serverId);
        console.log(`✅ Arquivo SMIL atualizado para usuário ${userLogin} em /home/streaming/${userLogin}/playlists_agendamentos.smil`);
      } catch (smilError) {
        console.warn('Erro ao atualizar arquivo SMIL:', smilError.message);
      }
    }

    res.json({ success: true, message: 'Playlist atualizada com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar playlist:', err);
    res.status(500).json({ error: 'Erro ao atualizar playlist', details: err.message });
  }
});

// DELETE /api/playlists/:id - Remove playlist
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user.id;

    // Verificar se playlist pertence ao usuário
    const [playlistRows] = await db.execute(
      'SELECT id FROM playlists WHERE id = ? AND codigo_stm = ?',
      [playlistId, userId]
    );

    if (playlistRows.length === 0) {
      return res.status(404).json({ error: 'Playlist não encontrada' });
    }

    // Verificar se playlist está sendo usada em agendamentos
    const [agendamentoRows] = await db.execute(
      'SELECT codigo FROM playlists_agendamentos WHERE codigo_playlist = ?',
      [playlistId]
    );

    if (agendamentoRows.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir playlist que está sendo usada em agendamentos',
        details: 'Remova os agendamentos que usam esta playlist antes de excluí-la'
      });
    }

    // Limpar playlist_id dos vídeos
    await db.execute(
      'UPDATE videos SET playlist_id = NULL WHERE playlist_id = ?',
      [playlistId]
    );

    // Remover playlist
    await db.execute(
      'DELETE FROM playlists WHERE id = ?',
      [playlistId]);
  // Atualizar arquivo SMIL do usuário após remoção
  try {
    const userLogin = req.user.usuario || (req.user.email ? req.user.email.split('@')[0] : `user_${req.user.id}`);
    const [serverRows] = await db.execute(
      'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
    
    await PlaylistSMILService.updateUserSMIL(req.user.id, userLogin, serverId);
  } catch (smilError) {
    console.warn('Erro ao atualizar arquivo SMIL:', smilError.message);
  };
    res.json({ success: true, message: 'Playlist removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover playlist:', err);
    res.status(500).json({ error: 'Erro ao remover playlist', details: err.message });
  }
});
// POST /api/playlists/generate-smil - Gerar arquivo SMIL manualmente
router.post('/generate-smil', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.usuario || `user_${userId}`;
    
    // Buscar servidor do usuário
    const [serverRows] = await db.execute(
      'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

    // Gerar arquivo SMIL
    const result = await PlaylistSMILService.generateUserSMIL(userId, userLogin, serverId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Arquivo SMIL gerado com sucesso',
        smil_path: result.smil_path,
        playlists_count: result.playlists_count,
        total_videos: result.total_videos
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    console.error('Erro ao gerar SMIL:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;