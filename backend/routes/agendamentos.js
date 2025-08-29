const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/agendamentos - Lista agendamentos do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mesAno } = req.query; // formato: YYYY-MM

    let query = `
      SELECT 
        pa.codigo as id,
        pa.data,
        pa.codigo_playlist as id_playlist,
        p.nome as nome_playlist_principal,
        pa.shuffle,
        pa.frequencia,
        pa.finalizacao,
        pa.codigo_playlist_finalizacao,
        pf.nome as nome_playlist_finalizacao,
        CONCAT(pa.data, ' ', LPAD(pa.hora, 2, '0'), ':', LPAD(pa.minuto, 2, '0'), ':00') as inicio,
        pa.dias as dias_semana
      FROM playlists_agendamentos pa
      LEFT JOIN playlists p ON pa.codigo_playlist = p.id
      LEFT JOIN playlists pf ON pa.codigo_playlist_finalizacao = pf.id
      WHERE (pa.codigo_stm = ? OR pa.codigo_stm IN (
        SELECT codigo_cliente FROM streamings WHERE codigo = ?
      ))
    `;

    const params = [userId, userId];

    if (mesAno) {
      query += ' AND DATE_FORMAT(pa.data, "%Y-%m") = ?';
      params.push(mesAno);
    }

    query += ' ORDER BY pa.data, pa.hora, pa.minuto';

    const [rows] = await db.execute(query, params);

    // Processar dados para o formato esperado
    const agendamentos = rows.map(row => ({
      ...row,
      shuffle: row.shuffle === 'sim' ? 'sim' : 'nao',
      finalizacao: row.finalizacao === 'repetir' ? 'nao' : 'sim',
      dias_semana: row.dias_semana ? row.dias_semana.split(',').map(d => parseInt(d)) : []
    }));

    res.json(agendamentos);
  } catch (err) {
    console.error('Erro ao buscar agendamentos:', err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos', details: err.message });
  }
});

// POST /api/agendamentos - Cria novo agendamento
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      data,
      id_playlist,
      shuffle,
      frequencia,
      finalizacao,
      id_playlist_finalizacao,
      inicio,
      dias_semana
    } = req.body;

    const userId = req.user.id;

    if (!data || !id_playlist || !inicio) {
      return res.status(400).json({ error: 'Data, playlist e horário de início são obrigatórios' });
    }

    // Extrair hora e minuto do início
    const inicioDate = new Date(inicio);
    const hora = inicioDate.getHours().toString().padStart(2, '0');
    const minuto = inicioDate.getMinutes().toString().padStart(2, '0');

    // Mapear frequência
    const frequenciaMap = {
      'diariamente': 1,
      'dias_da_semana': 2,
      'uma_vez': 3
    };

    const frequenciaValue = frequenciaMap[frequencia] || 3;

    // Processar dias da semana
    const diasString = dias_semana && Array.isArray(dias_semana) ? dias_semana.join(',') : '';

    const [result] = await db.execute(
      `INSERT INTO playlists_agendamentos (
        codigo_stm, codigo_playlist, frequencia, data, hora, minuto,
        dias, shuffle, finalizacao, codigo_playlist_finalizacao, servidor_relay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
      [
        userId,
        id_playlist,
        frequenciaValue,
        data,
        hora,
        minuto,
        diasString,
        shuffle ? 'sim' : 'nao',
        finalizacao ? 'playlist' : 'repetir',
        id_playlist_finalizacao || 0
      ]
    );

    // Atualizar arquivo SMIL do usuário após criar agendamento
    try {
      const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${req.user.id}`;
      const [serverRows] = await db.execute(
        'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );
      const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
      
      const PlaylistSMILService = require('../services/PlaylistSMILService');
      await PlaylistSMILService.updateUserSMIL(req.user.id, userLogin, serverId);
      console.log(`✅ Arquivo SMIL atualizado após criar agendamento para usuário ${userLogin} em /home/streaming/${userLogin}/playlists_agendamentos.smil`);
    } catch (smilError) {
      console.warn('Erro ao atualizar arquivo SMIL:', smilError.message);
    }

    res.status(201).json({
      id: result.insertId,
      message: 'Agendamento criado com sucesso'
    });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro ao criar agendamento', details: err.message });
  }
});

// DELETE /api/agendamentos/:id - Remove agendamento
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const agendamentoId = req.params.id;
    const userId = req.user.id;

    // Verificar se agendamento pertence ao usuário
    const [agendamentoRows] = await db.execute(
      'SELECT codigo FROM playlists_agendamentos WHERE codigo = ? AND codigo_stm = ?',
      [agendamentoId, userId]
    );

    if (agendamentoRows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Remover agendamento
    await db.execute(
      'DELETE FROM playlists_agendamentos WHERE codigo = ?',
      [agendamentoId]
    );

    // Atualizar arquivo SMIL do usuário após remover agendamento
    try {
      const userLogin = req.user.usuario || (req.user.email ? req.user.email.split('@')[0] : `user_${req.user.id}`);
      const [serverRows] = await db.execute(
        'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );
      const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
      
      const PlaylistSMILService = require('../services/PlaylistSMILService');
      await PlaylistSMILService.updateUserSMIL(req.user.id, userLogin, serverId);
    } catch (smilError) {
      console.warn('Erro ao atualizar arquivo SMIL:', smilError.message);
    }

    res.json({ success: true, message: 'Agendamento removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover agendamento:', err);
    res.status(500).json({ error: 'Erro ao remover agendamento', details: err.message });
  }
});

module.exports = router;