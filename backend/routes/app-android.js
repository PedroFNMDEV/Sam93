const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const tempDir = '/tmp/app-android-uploads';
      await fs.mkdir(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
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
      'image/jpeg', 'image/jpg', 'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

// GET /api/app-android - Listar apps do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT 
        codigo as id,
        package,
        DATE_FORMAT(data, '%d/%m/%Y %H:%i:%s') as data,
        hash,
        zip,
        compilado,
        status,
        aviso
       FROM apps 
       WHERE codigo_stm = ?
       ORDER BY data DESC`,
      [userId]
    );

    res.json({
      success: true,
      apps: rows.map(app => ({
        ...app,
        compilado: app.compilado === 'sim'
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar apps:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar apps' 
    });
  }
});

// GET /api/app-android/config - Buscar configurações do app
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT 
        app_nome as webtv_nome,
        app_email,
        app_whatsapp,
        app_url_facebook,
        app_url_instagram,
        app_url_twitter,
        app_url_site,
        app_cor_texto,
        app_cor_menu_claro,
        app_cor_menu_escuro,
        app_url_chat,
        app_tela_inicial
       FROM streamings 
       WHERE codigo_cliente = ?`,
      [userId]
    );

    if (rows.length > 0) {
      res.json({
        success: true,
        config: {
          ...rows[0],
          app_tela_inicial: rows[0].app_tela_inicial || 1
        }
      });
    } else {
      res.json({
        success: true,
        config: null
      });
    }

  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar configurações' 
    });
  }
});

// POST /api/app-android/create - Criar novo app
router.post('/create', authMiddleware, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'icone', maxCount: 1 },
  { name: 'fundo', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
    
    const {
      webtv_nome, webtv_facebook, webtv_twitter, webtv_site, webtv_descricao,
      versao, tema, servidor, login, idioma_painel
    } = req.body;

    if (!webtv_nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome da TV é obrigatório'
      });
    }

    if (!req.files || !req.files['logo'] || !req.files['icone'] || !req.files['fundo']) {
      return res.status(400).json({
        success: false,
        error: 'Logo, ícone e fundo são obrigatórios'
      });
    }

    // Simular processo de criação do app
    const packageName = `com.stmvideo.webtv.${userLogin.toLowerCase()}`;
    const hash = `${userLogin}_${Date.now()}`;
    const zipFile = `${hash}.zip`;

    console.log(`Criando app Android para ${webtv_nome}...`);
    console.log(`Package: ${packageName}`);
    console.log(`Versão: ${versao}`);

    // Simular compilação e assinatura
    const compilationSuccess = Math.random() > 0.1; // 90% de sucesso

    if (compilationSuccess) {
      // Inserir app no banco
      await db.execute(
        `INSERT INTO apps (
          codigo_stm, package, data, hash, zip, compilado, status
        ) VALUES (?, ?, NOW(), ?, ?, 'sim', 1)`,
        [userId, packageName, hash, zipFile]
      );

      // Atualizar configurações do streaming
      await db.execute(
        `UPDATE streamings SET 
         app_nome = ?, 
         app_url_logo = ?, 
         app_url_icone = ?, 
         app_url_background = ?
         WHERE codigo_cliente = ?`,
        [
          webtv_nome,
          `/app/logo-${userLogin}.png`,
          `/app/icone-${userLogin}.png`,
          `/app/background-${userLogin}.jpg`,
          userId
        ]
      );

      res.json({
        success: true,
        message: 'App Android criado com sucesso',
        app_data: {
          package: packageName,
          version: versao,
          zip_file: zipFile
        }
      });
    } else {
      // Simular erro de compilação
      await db.execute(
        `INSERT INTO apps (
          codigo_stm, package, data, hash, zip, compilado, status, aviso
        ) VALUES (?, ?, NOW(), ?, ?, 'nao', 2, ?)`,
        [userId, packageName, hash, zipFile, 'Erro na compilação do app']
      );

      res.status(500).json({
        success: false,
        error: 'Erro na compilação do app'
      });
    }

    // Limpar arquivos temporários
    if (req.files) {
      for (const fieldname in req.files) {
        const files = req.files[fieldname];
        for (const file of files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }

  } catch (error) {
    console.error('Erro ao criar app:', error);
    
    // Limpar arquivos temporários em caso de erro
    if (req.files) {
      for (const fieldname in req.files) {
        const files = req.files[fieldname];
        for (const file of files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao criar app' 
    });
  }
});

// PUT /api/app-android/configure - Configurar app existente
router.put('/configure', authMiddleware, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'fundo', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.usuario || (req.user.email ? req.user.email.split('@')[0] : `user_${userId}`);
    
    const {
      app_email, app_whatsapp, app_url_facebook, app_url_instagram,
      app_url_twitter, app_url_site, app_cor_texto, app_cor_menu_claro,
      app_cor_menu_escuro, app_tela_inicial, ativar_chat
    } = req.body;

    // Processar WhatsApp (remover caracteres especiais)
    const cleanWhatsapp = (app_whatsapp || '')
      .replace(/[+\s()]/g, '');

    const chatUrl = ativar_chat ? `/app/chat/${userLogin}` : '';

    // Atualizar configurações
    await db.execute(
      `UPDATE streamings SET 
       app_email = ?, app_whatsapp = ?, app_url_facebook = ?, 
       app_url_instagram = ?, app_url_twitter = ?, app_url_site = ?,
       app_cor_texto = ?, app_cor_menu_claro = ?, app_cor_menu_escuro = ?,
       app_url_chat = ?, app_tela_inicial = ?
       WHERE codigo_cliente = ?`,
      [
        app_email || '', cleanWhatsapp, app_url_facebook || '',
        app_url_instagram || '', app_url_twitter || '', app_url_site || '',
        app_cor_texto || '#000000', app_cor_menu_claro || '#FFFFFF', 
        app_cor_menu_escuro || '#000000', chatUrl, app_tela_inicial || 1,
        userId
      ]
    );

    // Processar uploads opcionais
    if (req.files) {
      if (req.files['logo']) {
        console.log(`Logo atualizada: /app/logo-${userLogin}.png`);
      }
      if (req.files['fundo']) {
        console.log(`Background atualizado: /app/background-${userLogin}.jpg`);
      }
    }

    // Limpar arquivos temporários
    if (req.files) {
      for (const fieldname in req.files) {
        const files = req.files[fieldname];
        for (const file of files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }

    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao configurar app:', error);
    
    // Limpar arquivos temporários em caso de erro
    if (req.files) {
      for (const fieldname in req.files) {
        const files = req.files[fieldname];
        for (const file of files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao configurar app' 
    });
  }
});

// DELETE /api/app-android/:id - Remover app
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const appId = req.params.id;
    const userId = req.user.id;

    // Verificar se app pertence ao usuário
    const [appRows] = await db.execute(
      'SELECT zip FROM apps WHERE codigo = ? AND codigo_stm = ?',
      [appId, userId]
    );

    if (appRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'App não encontrado'
      });
    }

    // Remover app do banco
    await db.execute(
      'DELETE FROM apps WHERE codigo = ?',
      [appId]
    );

    // Simular remoção dos arquivos físicos
    console.log(`App removido: ${appRows[0].zip}`);

    res.json({
      success: true,
      message: 'App removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover app:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao remover app' 
    });
  }
});

module.exports = router;