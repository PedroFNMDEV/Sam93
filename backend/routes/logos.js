const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const SSHManager = require('../config/SSHManager');

const router = express.Router();

// Configuração do multer para upload temporário de logos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Upload temporário local primeiro
      const tempDir = '/tmp/logo-uploads';
      await fs.mkdir(tempDir, { recursive: true });
      
      cb(null, tempDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Sanitizar nome do arquivo
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
    
    cb(null, `${Date.now()}_${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

// GET /api/logos - Lista logos do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

    const [rows] = await db.execute(
      `SELECT 
        codigo as id,
        nome,
        arquivo as url,
        tamanho,
        tipo_arquivo,
        data_upload as created_at
       FROM logos 
       WHERE (codigo_stm = ? OR codigo_stm IN (
         SELECT codigo_cliente FROM streamings WHERE codigo = ?
       ))
       ORDER BY data_upload DESC`,
      [userId, userId]
    );

    // Ajustar URLs para serem acessíveis via HTTP
    const logos = rows.map(logo => ({
      ...logo,
      url: logo.url ? `/${userEmail}/logos/${path.basename(logo.url)}` : null
    }));

    res.json(logos);
  } catch (err) {
    console.error('Erro ao buscar logos:', err);
    res.status(500).json({ error: 'Erro ao buscar logos', details: err.message });
  }
});

// POST /api/logos - Upload de logo
router.post('/', authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { nome } = req.body;
    const userId = req.user.id;
    const userLogin = req.user.usuario || (req.user.email ? req.user.email.split('@')[0] : `user_${userId}`);

    if (!nome) {
      return res.status(400).json({ error: 'Nome da logo é obrigatório' });
    }

    // Buscar servidor do usuário
    const [serverRows] = await db.execute(
      'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
      [userId]
    );

    const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;

    try {
      // Garantir que o diretório do usuário existe no servidor
      await SSHManager.createCompleteUserStructure(serverId, userLogin, {
        bitrate: req.user.bitrate || 2500,
        espectadores: req.user.espectadores || 100,
        status_gravando: 'nao'
      });
      
      // Criar pasta de logos na nova estrutura
      await SSHManager.createUserFolder(serverId, userLogin, 'logos');
      
      // Nova estrutura: /home/streaming/[usuario]/logos/
      const remotePath = `/home/streaming/${userLogin}/logos/${req.file.filename}`;
      
      // Upload do arquivo via SSH
      await SSHManager.uploadFile(serverId, req.file.path, remotePath);
      
      // Remover arquivo temporário local
      await fs.unlink(req.file.path);
      
      console.log(`✅ Logo ${nome} enviada para ${remotePath}`);
      
    } catch (uploadError) {
      console.error('Erro no upload SSH da logo:', uploadError);
      // Remover arquivo temporário em caso de erro
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ 
        error: 'Erro ao enviar logo para o servidor',
        details: uploadError.message 
      });
    }

    // Caminho relativo para salvar no banco (nova estrutura)
    const relativePath = `streaming/${userLogin}/logos/${req.file.filename}`;
    // Inserir logo na tabela
    const [result] = await db.execute(
      `INSERT INTO logos (
        codigo_stm, nome, arquivo, tamanho, tipo_arquivo, data_upload
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, nome, relativePath, req.file.size, req.file.mimetype]
    );

    res.status(201).json({
      id: result.insertId,
      nome: nome,
      url: `/content/streaming/${userLogin}/logos/${req.file.filename}`,
      tamanho: req.file.size,
      tipo_arquivo: req.file.mimetype
    });
  } catch (err) {
    console.error('Erro no upload da logo:', err);
    // Remover arquivo temporário em caso de erro
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Erro no upload da logo', details: err.message });
  }
});

// DELETE /api/logos/:id - Remove logo
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const logoId = req.params.id;
    const userId = req.user.id;
    const userLogin = req.user.usuario || `user_${userId}`;

    // Buscar logo
    const [logoRows] = await db.execute(
      'SELECT arquivo FROM logos WHERE codigo = ? AND codigo_stm = ?',
      [logoId, userId]
    );

    if (logoRows.length === 0) {
      return res.status(404).json({ error: 'Logo não encontrada' });
    }

    const logo = logoRows[0];

    // Buscar servidor do usuário
    const [serverRows] = await db.execute(
      'SELECT servidor_id FROM folders WHERE user_id = ? LIMIT 1',
      [userId]
    );

    const serverId = serverRows.length > 0 ? serverRows[0].servidor_id : 1;
    // Remover arquivo físico
    try {
      // Nova estrutura: /home/streaming/[usuario]/logos/
      const remotePath = `/home/streaming/${userLogin}/logos/${path.basename(logo.arquivo)}`;
      await SSHManager.deleteFile(serverId, remotePath);
      console.log(`✅ Logo removida do servidor: ${remotePath}`);
    } catch (fileError) {
      console.warn('Erro ao remover arquivo físico:', fileError.message);
    }

    // Remover do banco
    await db.execute(
      'DELETE FROM logos WHERE codigo = ?',
      [logoId]
    );

    res.json({ success: true, message: 'Logo removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover logo:', err);
    res.status(500).json({ error: 'Erro ao remover logo', details: err.message });
  }
});

module.exports = router;