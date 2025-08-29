const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginInput = email; // Pode ser email ou usuário

    if (!loginInput || !password) {
      return res.status(400).json({ error: 'Email/usuário e senha são obrigatórios' });
    }

    // Buscar primeiro em revendas
    let [rows] = await db.execute(
      'SELECT codigo, nome, email, usuario, senha, streamings, espectadores, bitrate, espaco, status, "revenda" as tipo FROM revendas WHERE (email = ? OR usuario = ?) AND status = 1',
      [loginInput, loginInput]
    );

    // Se não encontrou em revendas, buscar em streamings
    if (rows.length === 0) {
      [rows] = await db.execute(
        `SELECT 
          s.codigo, 
          s.identificacao as nome, 
          s.email, 
          s.usuario,
          s.senha, 
          1 as streamings, 
          s.espectadores, 
          s.bitrate, 
          s.espaco, 
          s.status,
          "streaming" as tipo,
          s.codigo_cliente,
          s.codigo_servidor
         FROM streamings s 
         WHERE (s.email = ? OR s.usuario = ?) AND s.status = 1`,
        [loginInput, loginInput]
      );
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = rows[0];

    if (user.status !== 1) {
      return res.status(401).json({ error: 'Conta desativada' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.senha);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último acesso baseado no tipo de usuário
    if (user.tipo === 'revenda') {
      await db.execute(
        'UPDATE revendas SET ultimo_acesso_data = NOW(), ultimo_acesso_ip = ? WHERE codigo = ?',
        [req.ip, user.codigo]
      );
    } else {
      await db.execute(
        'UPDATE streamings SET ultima_atividade = NOW() WHERE codigo = ?',
        [user.codigo]
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user.codigo, 
        email: user.email,
        usuario: user.usuario,
        tipo: user.tipo,
        codigo_cliente: user.codigo_cliente || null,
        codigo_servidor: user.codigo_servidor || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.codigo,
        nome: user.nome,
        email: user.email,
        usuario: user.usuario,
        tipo: user.tipo,
        streamings: user.streamings,
        espectadores: user.espectadores,
        bitrate: user.bitrate,
        espaco: user.espaco,
        codigo_cliente: user.codigo_cliente || null,
        codigo_servidor: user.codigo_servidor || null
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/register

// POST /api/auth/forgot-password

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', expired: true });
      }
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    let rows = [];
    
    // Buscar baseado no tipo de usuário
    if (decoded.tipo === 'revenda') {
      [rows] = await db.execute(
        'SELECT codigo, nome, email, usuario, streamings, espectadores, bitrate, espaco, status, "revenda" as tipo FROM revendas WHERE codigo = ?',
        [decoded.userId]
      );
    } else if (decoded.tipo === 'streaming') {
      [rows] = await db.execute(
        `SELECT 
          s.codigo, 
          s.identificacao as nome, 
          s.email, 
          s.usuario,
          1 as streamings, 
          s.espectadores, 
          s.bitrate, 
          s.espaco, 
          s.status,
          "streaming" as tipo,
          s.codigo_cliente,
          s.codigo_servidor
         FROM streamings s 
         WHERE s.codigo_cliente = ?`,
        [decoded.userId]
      );
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = rows[0];
    
    // Verificar se usuário está ativo
    if (user.status !== 1) {
      return res.status(401).json({ error: 'Conta desativada' });
    }
    
    res.json({
      id: user.codigo_cliente || user.codigo,
      nome: user.nome,
      email: user.email,
      usuario: user.usuario,
      tipo: user.tipo,
      streamings: user.streamings,
      espectadores: user.espectadores,
      bitrate: user.bitrate,
      espaco: user.espaco,
      codigo_cliente: user.codigo_cliente || null,
      codigo_servidor: user.codigo_servidor || null
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;