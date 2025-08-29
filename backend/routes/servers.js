const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        codigo as id,
        nome,
        ip,
        dominio,
        porta_ssh,
        limite_streamings,
        streamings_ativas,
        load_cpu,
        trafego_rede_atual,
        tipo_servidor,
        status,
        data_atualizacao,
        ultima_sincronizacao
       FROM wowza_servers 
       WHERE status = 'ativo'
       ORDER BY streamings_ativas ASC, load_cpu ASC, nome`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar servidores', details: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const serverId = req.params.id;
    const [rows] = await db.execute(
      `SELECT 
        codigo as id,
        nome,
        ip,
        dominio,
        porta_ssh,
        limite_streamings,
        streamings_ativas,
        load_cpu,
        trafego_rede_atual,
        trafego_mes,
        tipo_servidor,
        status,
        data_criacao,
        data_atualizacao,
        ultima_sincronizacao
       FROM wowza_servers 
       WHERE codigo = ?`,
      [serverId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar servidor', details: err.message });
  }
});

router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    const [stats] = await db.execute(
      `SELECT 
        COUNT(*) as total_servidores,
        SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as servidores_ativos,
        SUM(streamings_ativas) as total_streamings_ativas,
        SUM(limite_streamings) as capacidade_total,
        AVG(load_cpu) as load_medio,
        SUM(trafego_rede_atual) as trafego_total
       FROM wowza_servers`
    );
    const [serverDetails] = await db.execute(
      `SELECT 
        codigo as id,
        nome,
        ip,
        dominio,
        streamings_ativas,
        limite_streamings,
        load_cpu,
        status,
        tipo_servidor,
        ROUND((streamings_ativas / limite_streamings) * 100, 2) as utilizacao_percentual
       FROM wowza_servers 
       ORDER BY utilizacao_percentual DESC`
    );
    res.json({
      overview: stats[0],
      servers: serverDetails
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas', details: err.message });
  }
});

module.exports = router;
