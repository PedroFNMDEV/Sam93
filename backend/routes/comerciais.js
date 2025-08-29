const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/comerciais - Lista configurações de comerciais
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT 
        codigo as id,
        codigo_playlist as id_playlist,
        codigo_pasta_comerciais as id_folder_comerciais,
        quantidade_comerciais,
        intervalo_videos,
        ativo
       FROM comerciais_config 
       WHERE (codigo_stm = ? OR codigo_stm IN (
         SELECT codigo_cliente FROM streamings WHERE codigo = ?
       ))
       ORDER BY codigo`,
      [userId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar comerciais:', err);
    res.status(500).json({ error: 'Erro ao buscar comerciais', details: err.message });
  }
});

// POST /api/comerciais - Cria configuração de comerciais
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      id_playlist,
      id_folder_comerciais,
      quantidade_comerciais,
      intervalo_videos,
      ativo
    } = req.body;

    const userId = req.user.id;

    if (!id_playlist || !id_folder_comerciais) {
      return res.status(400).json({ error: 'Playlist e pasta de comerciais são obrigatórios' });
    }

    const [result] = await db.execute(
      `INSERT INTO comerciais_config (
        codigo_stm, codigo_playlist, codigo_pasta_comerciais,
        quantidade_comerciais, intervalo_videos, ativo
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, id_playlist, id_folder_comerciais, quantidade_comerciais || 1, intervalo_videos || 3, ativo ? 1 : 0]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Configuração de comerciais criada com sucesso'
    });
  } catch (err) {
    console.error('Erro ao criar comerciais:', err);
    res.status(500).json({ error: 'Erro ao criar comerciais', details: err.message });
  }
});

// PUT /api/comerciais/:id - Atualiza configuração de comerciais
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const comercialId = req.params.id;
    const userId = req.user.id;
    const { ativo, quantidade_comerciais, intervalo_videos } = req.body;

    // Verificar se configuração pertence ao usuário
    const [comercialRows] = await db.execute(
      'SELECT codigo FROM comerciais_config WHERE codigo = ? AND codigo_stm = ?',
      [comercialId, userId]
    );

    if (comercialRows.length === 0) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    // Atualizar configuração
    const updates = [];
    const values = [];

    if (typeof ativo !== 'undefined') {
      updates.push('ativo = ?');
      values.push(ativo ? 1 : 0);
    }

    if (quantidade_comerciais) {
      updates.push('quantidade_comerciais = ?');
      values.push(quantidade_comerciais);
    }

    if (intervalo_videos) {
      updates.push('intervalo_videos = ?');
      values.push(intervalo_videos);
    }

    if (updates.length > 0) {
      values.push(comercialId);
      await db.execute(
        `UPDATE comerciais_config SET ${updates.join(', ')} WHERE codigo = ?`,
        values
      );
    }

    res.json({ success: true, message: 'Configuração atualizada com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar comerciais:', err);
    res.status(500).json({ error: 'Erro ao atualizar comerciais', details: err.message });
  }
});

// DELETE /api/comerciais/:id - Remove configuração de comerciais
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const comercialId = req.params.id;
    const userId = req.user.id;

    // Verificar se configuração pertence ao usuário
    const [comercialRows] = await db.execute(
      'SELECT codigo FROM comerciais_config WHERE codigo = ? AND codigo_stm = ?',
      [comercialId, userId]
    );

    if (comercialRows.length === 0) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    // Remover configuração
    await db.execute(
      'DELETE FROM comerciais_config WHERE codigo = ?',
      [comercialId]
    );

    res.json({ success: true, message: 'Configuração removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover comerciais:', err);
    res.status(500).json({ error: 'Erro ao remover comerciais', details: err.message });
  }
});

module.exports = router;