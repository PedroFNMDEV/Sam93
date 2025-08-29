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
      const tempDir = '/tmp/app-uploads';
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
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

// GET /api/app-multiplataforma - Buscar dados do app
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT 
        codigo as id,
        nome,
        email,
        whatsapp,
        url_facebook,
        url_instagram,
        url_twitter,
        url_site,
        url_youtube,
        cor_texto,
        cor_menu_claro,
        cor_menu_escuro,
        cor_splash,
        url_logo,
        url_background,
        url_chat,
        text_prog,
        text_hist,
        modelo,
        contador,
        apk_package,
        apk_versao,
        apk_criado,
        apk_cert_sha256,
        apk_zip
       FROM app_multi_plataforma 
       WHERE codigo_stm = ?`,
      [userId]
    );

    if (rows.length > 0) {
      const app = rows[0];
      res.json({
        success: true,
        app: {
          ...app,
          contador: app.contador === 'sim',
          apk_criado: app.apk_criado === 'sim'
        }
      });
    } else {
      res.json({
        success: true,
        app: null
      });
    }
  } catch (error) {
    console.error('Erro ao buscar app multiplataforma:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar dados do app' 
    });
  }
});

// POST /api/app-multiplataforma - Criar app
router.post('/', authMiddleware, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'background', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
    
    const {
      nome, email, whatsapp, url_facebook, url_instagram, url_twitter,
      url_site, url_youtube, cor_texto, cor_menu_claro, cor_menu_escuro,
      cor_splash, text_prog, text_hist, modelo, contador
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome do app é obrigatório'
      });
    }

    // Verificar se já existe app para este usuário
    const [existingRows] = await db.execute(
      'SELECT codigo FROM app_multi_plataforma WHERE codigo_stm = ?',
      [userId]
    );

    let logoPath = '';
    let backgroundPath = '';

    // Processar upload de logo
    if (req.files && req.files['logo']) {
      const logoFile = req.files['logo'][0];
      logoPath = `/app-multi-plataforma/logo-${userLogin}.png`;
      
      // Simular salvamento (em produção, salvar no servidor)
      console.log(`Logo salva: ${logoPath}`);
    }

    // Processar upload de background
    if (req.files && req.files['background']) {
      const backgroundFile = req.files['background'][0];
      backgroundPath = `/app-multi-plataforma/background-${userLogin}.jpg`;
      
      // Simular salvamento (em produção, salvar no servidor)
      console.log(`Background salvo: ${backgroundPath}`);
    }

    const chatUrl = req.body.ativar_chat ? `/app-multi-plataforma/chat/${userLogin}` : '';

    if (existingRows.length > 0) {
      // Atualizar app existente
      await db.execute(
        `UPDATE app_multi_plataforma SET 
         nome = ?, email = ?, whatsapp = ?, url_facebook = ?, url_instagram = ?,
         url_twitter = ?, url_site = ?, url_youtube = ?, cor_texto = ?,
         cor_menu_claro = ?, cor_menu_escuro = ?, cor_splash = ?,
         url_logo = ?, url_background = ?, url_chat = ?, text_prog = ?,
         text_hist = ?, modelo = ?, contador = ?
         WHERE codigo_stm = ?`,
        [
          nome, email || '', whatsapp || '', url_facebook || '', url_instagram || '',
          url_twitter || '', url_site || '', url_youtube || '', cor_texto || '#000000',
          cor_menu_claro || '#FFFFFF', cor_menu_escuro || '#000000', cor_splash || '#4361ee',
          logoPath, backgroundPath, chatUrl, text_prog || '', text_hist || '',
          modelo || 1, contador === 'true' ? 'sim' : 'nao', userId
        ]
      );
    } else {
      // Criar novo app
      await db.execute(
        `INSERT INTO app_multi_plataforma (
          codigo_stm, nome, email, whatsapp, url_facebook, url_instagram,
          url_twitter, url_site, url_youtube, cor_texto, cor_menu_claro,
          cor_menu_escuro, cor_splash, url_logo, url_background, url_chat,
          text_prog, text_hist, modelo, contador, apk_criado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nao')`,
        [
          userId, nome, email || '', whatsapp || '', url_facebook || '', url_instagram || '',
          url_twitter || '', url_site || '', url_youtube || '', cor_texto || '#000000',
          cor_menu_claro || '#FFFFFF', cor_menu_escuro || '#000000', cor_splash || '#4361ee',
          logoPath, backgroundPath, chatUrl, text_prog || '', text_hist || '',
          modelo || 1, contador === 'true' ? 'sim' : 'nao'
        ]
      );
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
      message: 'App salvo com sucesso'
    });

  } catch (error) {
    console.error('Erro ao salvar app:', error);
    
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
      error: 'Erro ao salvar app' 
    });
  }
});

// POST /api/app-multiplataforma/create-apk - Criar APK
router.post('/create-apk', authMiddleware, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'background', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
    
    const { nome, versao, modelo } = req.body;

    if (!nome || !req.files || !req.files['logo'] || !req.files['background']) {
      return res.status(400).json({
        success: false,
        error: 'Nome, logo e background são obrigatórios'
      });
    }

    // Simular processo de criação do APK
    const packageName = `com.stmvideo.webtv.${userLogin}${Date.now()}`;
    const hash = `${userLogin}_${Date.now()}`;
    const zipFile = `${hash}.zip`;

    // Simular compilação (em produção, usar processo real)
    console.log(`Criando APK para ${nome}...`);
    console.log(`Package: ${packageName}`);
    console.log(`Versão: ${versao}`);

    // Atualizar banco com dados do APK
    await db.execute(
      `UPDATE app_multi_plataforma SET 
       apk_package = ?, apk_versao = ?, apk_criado = 'sim', 
       apk_cert_sha256 = ?, apk_zip = ?
       WHERE codigo_stm = ?`,
      [packageName, versao, hash, zipFile, userId]
    );

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
      message: 'APK criado com sucesso',
      apk_data: {
        package: packageName,
        version: versao,
        zip_file: zipFile
      }
    });

  } catch (error) {
    console.error('Erro ao criar APK:', error);
    
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
      error: 'Erro ao criar APK' 
    });
  }
});

// GET /api/app-multiplataforma/banners - Listar banners
router.get('/banners', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar ID do app multiplataforma
    const [appRows] = await db.execute(
      'SELECT codigo FROM app_multi_plataforma WHERE codigo_stm = ?',
      [userId]
    );

    if (appRows.length === 0) {
      return res.json({
        success: true,
        banners: []
      });
    }

    const appId = appRows[0].codigo;

    const [rows] = await db.execute(
      `SELECT 
        codigo as id,
        nome,
        banner,
        link,
        data_cadastro,
        exibicoes,
        cliques
       FROM app_multi_plataforma_anuncios 
       WHERE codigo_app = ?
       ORDER BY exibicoes DESC`,
      [appId]
    );

    res.json({
      success: true,
      banners: rows
    });

  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar banners' 
    });
  }
});

// POST /api/app-multiplataforma/banners - Adicionar banner
router.post('/banners', authMiddleware, upload.single('banner'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
    const { nome, link } = req.body;

    if (!nome || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nome e imagem do banner são obrigatórios'
      });
    }

    // Buscar ID do app multiplataforma
    const [appRows] = await db.execute(
      'SELECT codigo FROM app_multi_plataforma WHERE codigo_stm = ?',
      [userId]
    );

    if (appRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'App multiplataforma não encontrado'
      });
    }

    const appId = appRows[0].codigo;
    const bannerPath = `/app-multi-plataforma/banner/banner-${userLogin}-${Date.now()}.${path.extname(req.file.originalname)}`;

    // Simular salvamento do banner (em produção, salvar no servidor)
    console.log(`Banner salvo: ${bannerPath}`);

    // Inserir banner no banco
    await db.execute(
      `INSERT INTO app_multi_plataforma_anuncios (
        codigo_app, nome, banner, link, data_cadastro, exibicoes, cliques
      ) VALUES (?, ?, ?, ?, NOW(), 0, 0)`,
      [appId, nome, bannerPath, link || '']
    );

    // Limpar arquivo temporário
    await fs.unlink(req.file.path).catch(() => {});

    res.json({
      success: true,
      message: 'Banner adicionado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao adicionar banner:', error);
    
    // Limpar arquivo temporário em caso de erro
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao adicionar banner' 
    });
  }
});

// DELETE /api/app-multiplataforma/banners/:id - Remover banner
router.delete('/banners/:id', authMiddleware, async (req, res) => {
  try {
    const bannerId = req.params.id;
    const userId = req.user.id;

    // Verificar se banner pertence ao usuário
    const [bannerRows] = await db.execute(
      `SELECT a.banner 
       FROM app_multi_plataforma_anuncios a
       JOIN app_multi_plataforma amp ON a.codigo_app = amp.codigo
       WHERE a.codigo = ? AND amp.codigo_stm = ?`,
      [bannerId, userId]
    );

    if (bannerRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Banner não encontrado'
      });
    }

    // Remover banner do banco
    await db.execute(
      'DELETE FROM app_multi_plataforma_anuncios WHERE codigo = ?',
      [bannerId]
    );

    // Simular remoção do arquivo físico
    console.log(`Banner removido: ${bannerRows[0].banner}`);

    res.json({
      success: true,
      message: 'Banner removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover banner:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao remover banner' 
    });
  }
});

// POST /api/app-multiplataforma/notifications - Enviar notificação
router.post('/notifications', authMiddleware, upload.fields([
  { name: 'url_icone', maxCount: 1 },
  { name: 'url_imagem', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.usuario || (req.user.email ? req.user.email.split('@')[0] : `user_${userId}`);
    const { titulo, url_link, mensagem } = req.body;

    if (!titulo || !mensagem || !req.files || !req.files['url_icone']) {
      return res.status(400).json({
        success: false,
        error: 'Título, mensagem e ícone são obrigatórios'
      });
    }

    // Buscar ID do app multiplataforma
    const [appRows] = await db.execute(
      'SELECT codigo FROM app_multi_plataforma WHERE codigo_stm = ?',
      [userId]
    );

    if (appRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'App multiplataforma não encontrado'
      });
    }

    const appId = appRows[0].codigo;

    // Processar upload de ícone
    const iconePath = `/app-multi-plataforma/notificacao/icone-${userLogin}.png`;
    console.log(`Ícone da notificação salvo: ${iconePath}`);

    // Processar upload de imagem (opcional)
    let imagePath = '';
    if (req.files['url_imagem']) {
      imagePath = `/app-multi-plataforma/notificacao/img-${userLogin}.png`;
      console.log(`Imagem da notificação salva: ${imagePath}`);
    }

    // Inserir notificação no banco
    await db.execute(
      `INSERT INTO app_multi_plataforma_notificacoes (
        codigo_stm, codigo_app, titulo, url_icone, url_imagem, url_link, mensagem
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, appId, titulo, iconePath, imagePath, url_link || '', mensagem]
    );

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
      message: 'Notificação enviada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    
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
      error: 'Erro ao enviar notificação' 
    });
  }
});

module.exports = router;