const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/transmission-settings - Lista configurações de transmissão
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT 
        ts.codigo as id,
        ts.nome,
        ts.codigo_logo as id_logo,
        ts.logo_posicao,
        ts.logo_opacidade,
        ts.logo_tamanho,
        ts.logo_margem_x,
        ts.logo_margem_y,
        ts.embaralhar_videos,
        ts.repetir_playlist,
        ts.transicao_videos,
        ts.resolucao,
        ts.fps,
        ts.bitrate,
        ts.titulo_padrao,
        ts.descricao_padrao,
        l.nome as logo_nome,
        l.arquivo as logo_url
       FROM transmission_settings ts
       LEFT JOIN logos l ON ts.codigo_logo = l.codigo
       WHERE ts.codigo_stm = ?
       ORDER BY ts.nome`,
      [userId]
    );

    const settings = rows.map(row => ({
      ...row,
      embaralhar_videos: row.embaralhar_videos === 1,
      repetir_playlist: row.repetir_playlist === 1,
      logo: row.logo_nome ? {
        id: row.id_logo,
        nome: row.logo_nome,
        url: row.logo_url
      } : null
    }));

    res.json(settings);
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações', details: err.message });
  }
});

// POST /api/transmission-settings - Cria configuração
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      nome,
      id_logo,
      logo_posicao,
      logo_opacidade,
      logo_tamanho,
      logo_margem_x,
      logo_margem_y,
      embaralhar_videos,
      repetir_playlist,
      transicao_videos,
      resolucao,
      fps,
      bitrate,
      titulo_padrao,
      descricao_padrao
    } = req.body;

    const userId = req.user.id;

    if (!nome) {
      return res.status(400).json({ error: 'Nome da configuração é obrigatório' });
    }

    const [result] = await db.execute(
      `INSERT INTO transmission_settings (
        codigo_stm, nome, codigo_logo, logo_posicao, logo_opacidade,
        logo_tamanho, logo_margem_x, logo_margem_y, embaralhar_videos,
        repetir_playlist, transicao_videos, resolucao, fps, bitrate,
        titulo_padrao, descricao_padrao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, nome, id_logo || null, logo_posicao || 'top-right',
        logo_opacidade || 80, logo_tamanho || 'medium', logo_margem_x || 20,
        logo_margem_y || 20, embaralhar_videos ? 1 : 0, repetir_playlist ? 1 : 0,
        transicao_videos || 'fade', resolucao || '1080p', fps || 30,
        bitrate || 2500, titulo_padrao || '', descricao_padrao || ''
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Configuração criada com sucesso'
    });
  } catch (err) {
    console.error('Erro ao criar configuração:', err);
    res.status(500).json({ error: 'Erro ao criar configuração', details: err.message });
  }
});

// DELETE /api/transmission-settings/:id - Remove configuração
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const settingId = req.params.id;
    const userId = req.user.id;

    const [result] = await db.execute(
      'DELETE FROM transmission_settings WHERE codigo = ? AND codigo_stm = ?',
      [settingId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    res.json({ success: true, message: 'Configuração removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover configuração:', err);
    res.status(500).json({ error: 'Erro ao remover configuração', details: err.message });
  }
});

module.exports = router;