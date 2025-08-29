const express = require('express');
  const cors = require('cors');
  const rateLimit = require('express-rate-limit');
  const helmet = require('helmet');
  const compression = require('compression');
  const path = require('path');
  const db = require('./config/database');
  const SSHManager = require('./config/SSHManager');


  // Importar rotas
  const authRoutes = require('./routes/auth');
  const foldersRoutes = require('./routes/folders');
  const videosRoutes = require('./routes/videos');
  const playlistsRoutes = require('./routes/playlists');
  const agendamentosRoutes = require('./routes/agendamentos');
  const comerciaisRoutes = require('./routes/comerciais');
  const downloadyoutubeRoutes = require('./routes/downloadyoutube');
  const espectadoresRoutes = require('./routes/espectadores');
  const streamingRoutes = require('./routes/streaming');
  const relayRoutes = require('./routes/relay');
  const logosRoutes = require('./routes/logos');
  const transmissionSettingsRoutes = require('./routes/transmission-settings');
  const ftpRoutes = require('./routes/ftp');
  const serversRoutes = require('./routes/servers');
 const playersRoutes = require('./routes/players');
 const videosSSHRoutes = require('./routes/videos-ssh');
 const conversionRoutes = require('./routes/conversion');
const videoStreamRoutes = require('./routes/video-stream');
const userWowzaSetupRoutes = require('./routes/user-wowza-setup');
const appMultiplataformaRoutes = require('./routes/app-multiplataforma');
const appAndroidRoutes = require('./routes/app-android');
const smilManagementRoutes = require('./routes/smil-management');
const dadosConexaoRoutes = require('./routes/dados-conexao');

  const app = express();
  const PORT = process.env.PORT || 3001;
  const isProduction = process.env.NODE_ENV === 'production';

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
  }));
  
  // Compression middleware
  app.use(compression());
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
  // Middlewares
  app.use(cors({
    origin: isProduction ? [
      'http://samhost.wcore.com.br',
      'https://samhost.wcore.com.br',
      'http://samhost.wcore.com.br:3000'
    ] : [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Servir arquivos estáticos do Wowza
  // Middleware personalizado para servir arquivos de vídeo
  app.use('/content', async (req, res, next) => {
    try {
      // Verificar autenticação para acesso a vídeos
      let token = null;
      
      // Verificar token no header Authorization
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      
      // Verificar token no query parameter (para nova aba)
      if (!token && req.query.auth_token) {
        token = req.query.auth_token;
      }
      
      if (!token) {
        console.log('❌ Token de acesso não fornecido para /content:', {
          path: req.path,
          method: req.method,
          headers: Object.keys(req.headers),
          query: Object.keys(req.query || {}),
          hasAuthHeader: !!authHeader,
          hasQueryToken: !!req.query.auth_token
        });
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui';
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Adicionar dados do usuário à requisição
        req.user = decoded;
        console.log('✅ Token validado para /content:', {
          userId: decoded.userId,
          email: decoded.email,
          path: req.path
        });
      } catch (jwtError) {
        console.error('Erro de autenticação no middleware de vídeo:', jwtError.message);
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Extrair informações do caminho
      const requestPath = req.path.startsWith('/') ? req.path : `/${req.path}`;
      console.log(`📹 Solicitação de vídeo: ${requestPath}`);
      
      // Se for uma URL SSH, não processar aqui - deixar para as rotas SSH
      if (requestPath.includes('/api/videos-ssh/')) {
        console.log(`🔄 Redirecionando para rota SSH: ${requestPath}`);
        return next();
      }
      
      // Verificar se é um arquivo de vídeo ou playlist
      const isVideoFile = /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(requestPath);
      const isStreamFile = /\.(m3u8|ts)$/i.test(requestPath);
      
      if (!isVideoFile && !isStreamFile) {
        console.log(`❌ Tipo de arquivo não suportado: ${requestPath}`);
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }
      
      // Configurar headers para streaming de vídeo
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Definir Content-Type baseado na extensão
      if (isStreamFile && requestPath.includes('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (isStreamFile && requestPath.includes('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      } else if (requestPath.includes('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (requestPath.includes('.avi')) {
        res.setHeader('Content-Type', 'video/x-msvideo');
      } else if (requestPath.includes('.mov')) {
        res.setHeader('Content-Type', 'video/quicktime');
      } else if (requestPath.includes('.wmv')) {
        res.setHeader('Content-Type', 'video/x-ms-wmv');
      } else if (requestPath.includes('.webm')) {
        res.setHeader('Content-Type', 'video/webm');
      } else if (requestPath.includes('.mkv')) {
        res.setHeader('Content-Type', 'video/x-matroska');
      } else {
        res.setHeader('Content-Type', 'video/mp4');
      }
      
      // Cache diferente para streams vs arquivos
      if (isStreamFile) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      
      // Limpar e processar caminho
      const cleanPath = requestPath.replace('/content/', '').replace(/^\/+/, '');
      
      const pathParts = cleanPath.split('/');
      
      // Para nova estrutura: usuario/pasta/arquivo (sem prefixo streaming)
      if (pathParts.length < 3) {
        console.log(`❌ Caminho inválido: ${requestPath}`);
        return res.status(404).json({ error: 'Caminho de vídeo inválido' });
      }
      
      // Extrair partes do caminho baseado na estrutura
      let userLogin, folderName, fileName;
      
      // Nova estrutura: usuario/pasta/arquivo
      userLogin = pathParts[0];
      folderName = pathParts[1];
      fileName = pathParts[2];
      
      // Buscar servidor do usuário dinamicamente
      let wowzaHost = '51.222.156.223'; // Fallback padrão
      let wowzaPort = 6980;
      let wowzaUser = 'admin';
      let wowzaPassword = 'FK38Ca2SuE6jvJXed97VMn';
      
      try {
        // Buscar servidor baseado no usuário logado
        const [userServerRows] = await db.execute(
          'SELECT codigo_servidor FROM streamings WHERE codigo_cliente = ? OR usuario = ? LIMIT 1',
          [req.user.userId, userLogin]
        );
        
        if (userServerRows.length > 0) {
          const serverId = userServerRows[0].codigo_servidor;
          
          // Buscar dados do servidor
          const [serverRows] = await db.execute(
            'SELECT ip, dominio, senha_root FROM wowza_servers WHERE codigo = ? AND status = "ativo"',
            [serverId]
          );
          
          if (serverRows.length > 0) {
            const server = serverRows[0];
            wowzaHost = server.dominio || server.ip; // Priorizar domínio
            wowzaPassword = server.senha_root || wowzaPassword;
            console.log(`✅ Usando servidor dinâmico: ${wowzaHost} (Servidor ID: ${serverId})`);
          } else {
            console.log(`⚠️ Servidor ${serverId} não encontrado, usando padrão`);
          }
        } else {
          console.log(`⚠️ Servidor do usuário ${userLogin} não encontrado, usando padrão`);
        }
      } catch (serverError) {
        console.warn('Erro ao buscar servidor do usuário, usando padrão:', serverError.message);
      }
      
      // Processar nome do arquivo
      const fileExtension = path.extname(fileName).toLowerCase();
      const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');
      
      // Configurar URL do Wowza dinâmico
      const fetch = require('node-fetch');
      
      let wowzaUrl;
      if (isStreamFile) {
        // Para streams HLS - verificar se arquivo MP4 existe, senão usar original
        const mp4Path = `${userLogin}/${folderName}/${finalFileName}`;
        const originalPath = `${userLogin}/${folderName}/${fileName}`;
        
        // Tentar MP4 primeiro, depois original
        wowzaUrl = `http://${wowzaHost}:1935/vod/_definst_/mp4:${mp4Path}/playlist.m3u8`;
      } else {
        // Para arquivos diretos - tentar MP4 primeiro
        const mp4Path = `${userLogin}/${folderName}/${finalFileName}`;
        wowzaUrl = `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:${wowzaPort}/content/${mp4Path}`;
      }
      
      console.log(`🔗 Redirecionando para Wowza dinâmico (${wowzaHost}): ${wowzaUrl}`);
      
      try {
        const requestHeaders = {
          'Range': req.headers.range || '',
          'User-Agent': 'Streaming-System/1.0',
          'Accept': '*/*',
          'Cache-Control': isStreamFile ? 'no-cache' : 'public, max-age=3600',
          'Connection': 'keep-alive'
        };
        
        const wowzaResponse = await fetch(wowzaUrl, {
          method: req.method,
          headers: requestHeaders,
          timeout: 30000 // Timeout aumentado para melhor estabilidade
        });
        
        if (!wowzaResponse.ok) {
          console.log(`❌ Erro ao acessar vídeo no Wowza (${wowzaResponse.status}): ${wowzaUrl}`);
          
          // Se falhou com MP4, tentar com arquivo original
          if (finalFileName !== fileName) {
            console.log(`🔄 Tentando arquivo original: ${fileName}`);
            
            const originalUrl = isStreamFile ? 
              `http://${wowzaHost}:1935/vod/_definst_/mp4:${userLogin}/${folderName}/${fileName}/playlist.m3u8` :
              `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:${wowzaPort}/content/${userLogin}/${folderName}/${fileName}`;
            
            const originalResponse = await fetch(originalUrl, {
              method: req.method,
              headers: requestHeaders,
              timeout: 30000
            });
            
            if (originalResponse.ok) {
              console.log(`✅ Servindo arquivo original do Wowza: ${originalUrl}`);
              originalResponse.headers.forEach((value, key) => {
                if (!res.headersSent) {
                  res.setHeader(key, value);
                }
              });
              return originalResponse.body.pipe(res);
            }
          }
          
          return res.status(404).json({ 
            error: 'Vídeo não encontrado',
            details: 'O arquivo não foi encontrado no servidor Wowza',
            attempted_urls: [wowzaUrl, finalFileName !== fileName ? `${userLogin}/${folderName}/${fileName}` : null].filter(Boolean)
          });
        }
        
        console.log(`✅ Servindo vídeo diretamente do Wowza: ${wowzaUrl}`);
        
        // Copiar headers da resposta do Wowza
        wowzaResponse.headers.forEach((value, key) => {
          if (!res.headersSent) {
            res.setHeader(key, value);
          }
        });
        
        // Fazer pipe do stream
        wowzaResponse.body.pipe(res);
        
      } catch (fetchError) {
        console.error('❌ Erro ao acessar servidor Wowza:', fetchError);
        
        // Fallback: tentar redirecionar diretamente
        console.log(`🔄 Tentando redirecionamento direto para: ${wowzaUrl}`);
        res.redirect(wowzaUrl);
      }
    } catch (error) {
      console.error('❌ Erro no middleware de vídeo:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  });

  // Middleware para servir vídeos diretamente do Wowza (nova rota otimizada)
  app.use('/wowza-direct', async (req, res, next) => {
    try {
      // Verificar autenticação
      let token = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      if (!token && req.query.auth_token) {
        token = req.query.auth_token;
      }
      
      if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui';
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
      } catch (jwtError) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Buscar servidor do usuário dinamicamente
      const requestPath = req.path.replace('/wowza-direct/', '');
      const userLogin = requestPath.split('/')[0];
      
      let wowzaHost = '51.222.156.223'; // Fallback padrão
      let wowzaPort = 6980;
      let wowzaUser = 'admin';
      let wowzaPassword = 'FK38Ca2SuE6jvJXed97VMn';
      
      try {
        // Buscar servidor baseado no usuário
        const [userServerRows] = await db.execute(
          'SELECT codigo_servidor FROM streamings WHERE codigo_cliente = ? OR usuario = ? LIMIT 1',
          [req.user.userId, userLogin]
        );
        
        if (userServerRows.length > 0) {
          const serverId = userServerRows[0].codigo_servidor;
          
          // Buscar dados do servidor
          const [serverRows] = await db.execute(
            'SELECT ip, dominio, senha_root FROM wowza_servers WHERE codigo = ? AND status = "ativo"',
            [serverId]
          );
          
          if (serverRows.length > 0) {
            const server = serverRows[0];
            wowzaHost = server.dominio || server.ip;
            wowzaPassword = server.senha_root || wowzaPassword;
            console.log(`✅ Wowza-direct usando servidor dinâmico: ${wowzaHost} (ID: ${serverId})`);
          }
        }
      } catch (serverError) {
        console.warn('Erro ao buscar servidor do usuário no wowza-direct, usando padrão:', serverError.message);
      }
      
      // URL direta do Wowza com autenticação
      const wowzaUrl = `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:${wowzaPort}/content/${requestPath}`;
      
      console.log(`🔗 Redirecionamento direto para Wowza dinâmico (${wowzaHost}): ${wowzaUrl}`);
      
      // Redirecionar diretamente para o Wowza
      res.redirect(wowzaUrl);
      
    } catch (error) {
      console.error('❌ Erro no middleware Wowza direto:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  });

  // Nova rota para URLs otimizadas do Wowza
  app.get('/api/wowza/video-url/:userLogin/:folderName/:fileName', async (req, res) => {
    try {
      const { userLogin, folderName, fileName } = req.params;
      
      // Verificar autenticação
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Token de acesso requerido' 
        });
      }

      const token = authHeader.substring(7);
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui';
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Buscar servidor do usuário dinamicamente
        let wowzaHost = '51.222.156.223'; // Fallback padrão
        let wowzaPort = 6980;
        let wowzaUser = 'admin';
        let wowzaPassword = 'FK38Ca2SuE6jvJXed97VMn';
        
        try {
          // Buscar servidor baseado no usuário
          const [userServerRows] = await db.execute(
            'SELECT codigo_servidor FROM streamings WHERE codigo_cliente = ? OR login = ? LIMIT 1',
            [decoded.userId, userLogin]
          );
          
          if (userServerRows.length > 0) {
            const serverId = userServerRows[0].codigo_servidor;
            
            // Buscar dados do servidor
            const [serverRows] = await db.execute(
              'SELECT ip, dominio, senha_root FROM wowza_servers WHERE codigo = ? AND status = "ativo"',
              [serverId]
            );
            
            if (serverRows.length > 0) {
              const server = serverRows[0];
              wowzaHost = server.dominio || server.ip;
              wowzaPassword = server.senha_root || wowzaPassword;
              console.log(`✅ API Wowza usando servidor dinâmico: ${wowzaHost} (ID: ${serverId})`);
            }
          }
        } catch (serverError) {
          console.warn('Erro ao buscar servidor do usuário na API, usando padrão:', serverError.message);
        }
        
      } catch (jwtError) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Garantir que arquivo é MP4
      const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');
      
      const urls = {
        // URL direta para download/visualização
        direct: `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:6980/content/${userLogin}/${folderName}/${finalFileName}`,
        
        // URL HLS para streaming
        hls: `http://${wowzaHost}:1935/vod/_definst_/mp4:${userLogin}/${folderName}/${finalFileName}/playlist.m3u8`,
        
        // URL via proxy do backend (fallback)
        proxy: `/content/${userLogin}/${folderName}/${finalFileName}`,
        
        // URL para nova aba (sem autenticação no header)
        external: `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:6980/content/${userLogin}/${folderName}/${finalFileName}`
      };
      
      res.json({
        success: true,
        urls: urls,
        recommended: 'direct', // Recomendar URL direta
        server_info: {
          host: wowzaHost,
          port: wowzaPort,
          dynamic: true
        },
        file_info: {
          user: userLogin,
          folder: folderName,
          file: finalFileName,
          original_file: fileName
        }
      });
      
    } catch (error) {
      console.error('Erro ao gerar URLs do Wowza:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  });
  
  // Servir arquivos estáticos do frontend em produção
  if (isProduction) {
    app.use(express.static(path.join(__dirname, '../dist')));
    
    // Catch all handler: send back React's index.html file for SPA routing
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
      }
    });
  }

  // Rotas da API
  app.use('/api/auth', authRoutes);
  app.use('/api/folders', foldersRoutes);
  app.use('/api/videos', videosRoutes);
  app.use('/api/playlists', playlistsRoutes);
  app.use('/api/agendamentos', agendamentosRoutes);
  app.use('/api/comerciais', comerciaisRoutes);
  app.use('/api/downloadyoutube', downloadyoutubeRoutes);
  app.use('/api/espectadores', espectadoresRoutes);
  app.use('/api/streaming', streamingRoutes);
  app.use('/api/relay', relayRoutes);
  app.use('/api/logos', logosRoutes);
  app.use('/api/transmission-settings', transmissionSettingsRoutes);
  app.use('/api/ftp', ftpRoutes);
  app.use('/api/servers', serversRoutes);
 app.use('/api/players', playersRoutes);
 app.use('/api/videos-ssh', videosSSHRoutes);
 app.use('/api/user-settings', require('./routes/user-settings'));
 app.use('/api/conversion', conversionRoutes);
app.use('/api/video-stream', videoStreamRoutes);
app.use('/api/user-wowza-setup', userWowzaSetupRoutes);
app.use('/api/app-multiplataforma', appMultiplataformaRoutes);
app.use('/api/app-android', appAndroidRoutes);
app.use('/api/smil-management', smilManagementRoutes);
app.use('/api/dados-conexao', dadosConexaoRoutes);

  // Rota de teste
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando!', timestamp: new Date().toISOString() });
  });

  // Rota de health check
  app.get('/api/health', async (req, res) => {
    try {
      const dbConnected = await db.testConnection();
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      res.json({
        status: 'ok',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Middleware de tratamento de erros
  app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo muito grande' });
    }
    
    if (error.message.includes('Tipo de arquivo não suportado')) {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  // Rota 404
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  // Iniciar servidor
  async function startServer() {
    try {
      // Testar conexão com banco
      const dbConnected = await db.testConnection();
      
      if (!dbConnected) {
        console.error('❌ Não foi possível conectar ao banco de dados');
        console.error('⚠️ Continuando sem banco de dados para debug...');
      }

      app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`🌐 Frontend: http://localhost:3000`);
        console.log(`🔧 Backend: http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🔧 API test: http://localhost:${PORT}/api/test`);
        console.log(`🔗 SSH Manager inicializado para uploads remotos`);
        console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      });
      
      // Cleanup ao fechar aplicação
      process.on('SIGINT', () => {
        console.log('\n🔌 Fechando conexões SSH...');
        SSHManager.closeAllConnections();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\n🔌 Fechando conexões SSH...');
        SSHManager.closeAllConnections();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }

  startServer();