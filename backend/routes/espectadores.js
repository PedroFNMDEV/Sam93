const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/espectadores - Lista espectadores
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodo = '24h' } = req.query;

    let whereClause = 'WHERE codigo_stm = ?';
    const params = [userId];

    // Filtrar por período
    switch (periodo) {
      case '1h':
        whereClause += ' AND (atualizacao >= DATE_SUB(NOW(), INTERVAL 1 HOUR) OR data >= DATE_SUB(NOW(), INTERVAL 1 HOUR))';
        break;
      case '24h':
        whereClause += ' AND (atualizacao >= DATE_SUB(NOW(), INTERVAL 24 HOUR) OR data >= DATE_SUB(NOW(), INTERVAL 24 HOUR))';
        break;
      case '7d':
        whereClause += ' AND (atualizacao >= DATE_SUB(NOW(), INTERVAL 7 DAY) OR data >= DATE_SUB(NOW(), INTERVAL 7 DAY))';
        break;
      case '30d':
        whereClause += ' AND (atualizacao >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR data >= DATE_SUB(NOW(), INTERVAL 30 DAY))';
        break;
    }

    // Buscar espectadores
    const [espectadores] = await db.execute(
      `SELECT 
        codigo as id,
        MD5(ip) as ip_hash,
        pais_nome as pais,
        cidade,
        latitude,
        longitude,
        player as dispositivo,
        '' as navegador,
        '' as resolucao,
        TIMESTAMPDIFF(SECOND, COALESCE(atualizacao, data), NOW()) as tempo_visualizacao,
        (TIMESTAMPDIFF(MINUTE, COALESCE(atualizacao, data), NOW()) < 5) as ativo,
        COALESCE(atualizacao, data) as created_at,
        COALESCE(atualizacao, data) as ultima_atividade
       FROM espectadores_conectados 
       ${whereClause}
       ORDER BY atualizacao DESC`,
      params
    );

    // Calcular estatísticas
    const total = espectadores.length;
    const ativos = espectadores.filter(e => e.ativo).length;
    
    const paises = {};
    const cidades = {};
    const dispositivos = {};
    let tempoTotal = 0;

    espectadores.forEach(e => {
      paises[e.pais] = (paises[e.pais] || 0) + 1;
      cidades[e.cidade] = (cidades[e.cidade] || 0) + 1;
      dispositivos[e.dispositivo] = (dispositivos[e.dispositivo] || 0) + 1;
      tempoTotal += e.tempo_visualizacao;
    });

    const tempoMedio = total > 0 ? Math.floor(tempoTotal / total) : 0;

    const estatisticas = {
      total,
      ativos,
      paises,
      cidades,
      dispositivos,
      navegadores: {},
      tempoMedio
    };

    res.json({ espectadores, estatisticas });
  } catch (err) {
    console.error('Erro ao buscar espectadores:', err);
    res.status(500).json({ error: 'Erro ao buscar espectadores', details: err.message });
  }
});

// GET /api/espectadores/mapa - Dados para mapa
router.get('/mapa', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodo = '24h' } = req.query;

    let whereClause = 'WHERE codigo_stm = ?';
    const params = [userId];

    switch (periodo) {
      case '1h':
        whereClause += ' AND atualizacao >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
        break;
      case '24h':
        whereClause += ' AND atualizacao >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        break;
      case '7d':
        whereClause += ' AND atualizacao >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        whereClause += ' AND atualizacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
    }

    const [rows] = await db.execute(
      `SELECT 
        latitude,
        longitude,
        pais_nome as pais,
        cidade,
        COUNT(*) as count,
        SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, atualizacao, NOW()) < 5 THEN 1 ELSE 0 END) as ativos,
        COUNT(DISTINCT ip) as ips
       FROM espectadores_conectados 
       ${whereClause}
       AND latitude != '0.0' AND longitude != '0.0'
       GROUP BY latitude, longitude, pais_nome, cidade`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar dados do mapa:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do mapa', details: err.message });
  }
});

// GET /api/espectadores/tempo-real - Dados em tempo real
router.get('/tempo-real', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [espectadores] = await db.execute(
      `SELECT 
        codigo as id,
        ip,
        pais_nome as pais,
        cidade,
        player as dispositivo,
        atualizacao
       FROM espectadores_conectados 
       WHERE codigo_stm = ? 
       AND TIMESTAMPDIFF(MINUTE, atualizacao, NOW()) < 5
       ORDER BY atualizacao DESC`,
      [userId]
    );

    const espectadoresAtivos = espectadores.length;
    const transmissaoAtiva = espectadoresAtivos > 0; // Simplificado

    res.json({
      espectadoresAtivos,
      transmissaoAtiva,
      espectadores,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao buscar dados em tempo real:', err);
    res.status(500).json({ error: 'Erro ao buscar dados em tempo real', details: err.message });
  }
});

// GET /api/espectadores/historico - Histórico de audiência
router.get('/historico', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodo = '24h', intervalo = '1h' } = req.query;

    let dateFormat = '%Y-%m-%d %H:00:00';
    let whereClause = 'WHERE codigo_stm = ?';
    const params = [userId];

    switch (periodo) {
      case '1h':
        dateFormat = '%Y-%m-%d %H:%i:00';
        whereClause += ' AND data >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
        break;
      case '24h':
        whereClause += ' AND data >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        break;
      case '7d':
        whereClause += ' AND data >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        whereClause += ' AND data >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
    }

    const [rows] = await db.execute(
      `SELECT 
        DATE_FORMAT(data, '${dateFormat}') as timestamp,
        COUNT(DISTINCT ip) as espectadores,
        AVG(tempo_conectado) as tempoMedio
       FROM estatisticas 
       ${whereClause}
       GROUP BY DATE_FORMAT(data, '${dateFormat}')
       ORDER BY timestamp`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico', details: err.message });
  }
});

module.exports = router;