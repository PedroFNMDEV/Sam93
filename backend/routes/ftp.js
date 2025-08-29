const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const FTPManager = require('../config/FTPManager');

const router = express.Router();

// POST /api/ftp/connect - Conectar ao servidor FTP
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { ip, usuario, senha, porta = 21 } = req.body;
    const userId = req.user.id;

    if (!ip || !usuario || !senha) {
      return res.status(400).json({
        success: false,
        error: 'IP, usuário e senha são obrigatórios'
      });
    }

    console.log(`🔌 Tentativa de conexão FTP para usuário ${userId}: ${usuario}@${ip}:${porta}`);

    const connectionData = {
      ip: ip.trim(),
      usuario: usuario.trim(),
      senha: senha.trim(),
      porta: parseInt(porta) || 21
    };

    const result = await FTPManager.connect(userId, connectionData);

    if (result.success) {
      // Listar diretório raiz após conexão
      const listResult = await FTPManager.listDirectory(userId, '/');
      
      res.json({
        success: true,
        message: result.message,
        files: listResult.files || [],
        currentPath: listResult.currentPath || '/',
        videoCount: listResult.videoCount || 0
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Erro ao conectar ao FTP'
      });
    }
  } catch (error) {
    console.error('Erro na conexão FTP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// POST /api/ftp/list - Listar arquivos de um diretório
router.post('/list', authMiddleware, async (req, res) => {
  try {
    const { path = '/' } = req.body;
    const userId = req.user.id;

    console.log(`📁 Listando diretório FTP: ${path} para usuário ${userId}`);

    const result = await FTPManager.listDirectory(userId, path);

    res.json({
      success: true,
      files: result.files || [],
      currentPath: result.currentPath || path,
      videoCount: result.videoCount || 0
    });
  } catch (error) {
    console.error('Erro ao listar diretório FTP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar diretório'
    });
  }
});

// POST /api/ftp/scan-directory - Escanear diretório recursivamente
router.post('/scan-directory', authMiddleware, async (req, res) => {
  try {
    const { directoryPath } = req.body;
    const userId = req.user.id;

    if (!directoryPath) {
      return res.status(400).json({
        success: false,
        error: 'Caminho do diretório é obrigatório'
      });
    }

    console.log(`🔍 Escaneando diretório recursivamente: ${directoryPath} para usuário ${userId}`);

    const result = await FTPManager.scanDirectoryRecursive(userId, directoryPath);

    res.json({
      success: true,
      videos: result.videos || [],
      total_videos: result.total_videos || 0,
      scanned_directories: result.scanned_directories || 0,
      max_depth_reached: result.max_depth_reached || false
    });
  } catch (error) {
    console.error('Erro ao escanear diretório:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao escanear diretório'
    });
  }
});

// POST /api/ftp/migrate - Migrar arquivos selecionados
router.post('/migrate', authMiddleware, async (req, res) => {
  try {
    const { files, destinationFolder } = req.body;
    const userId = req.user.id;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de arquivos é obrigatória'
      });
    }

    if (!destinationFolder) {
      return res.status(400).json({
        success: false,
        error: 'Pasta de destino é obrigatória'
      });
    }

    console.log(`📦 Iniciando migração de ${files.length} arquivo(s) para usuário ${userId}`);

    const result = await FTPManager.migrateFiles(userId, files, destinationFolder);

    res.json({
      success: true,
      message: `Migração iniciada: ${files.length} arquivo(s)`,
      migration_id: result.migration_id,
      total_files: result.total_files,
      estimated_time: result.estimated_time
    });
  } catch (error) {
    console.error('Erro na migração:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao iniciar migração'
    });
  }
});

// GET /api/ftp/migration-status - Verificar status da migração
router.get('/migration-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = FTPManager.getMigrationStatus(userId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Erro ao verificar status da migração:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar status'
    });
  }
});

// POST /api/ftp/cancel-migration - Cancelar migração
router.post('/cancel-migration', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await FTPManager.cancelMigration(userId);

    res.json({
      success: result.success,
      message: result.message,
      error: result.error
    });
  } catch (error) {
    console.error('Erro ao cancelar migração:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao cancelar migração'
    });
  }
});

// GET /api/ftp/connection-status - Verificar status da conexão
router.get('/connection-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verificar se há conexão ativa
    const hasConnection = FTPManager.activeConnections.has(userId);
    
    res.json({
      success: true,
      connected: hasConnection,
      status: hasConnection ? 'connected' : 'disconnected'
    });
  } catch (error) {
    console.error('Erro ao verificar status da conexão:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar status'
    });
  }
});

// POST /api/ftp/disconnect - Desconectar do FTP
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await FTPManager.disconnect(userId);

    res.json({
      success: result.success,
      message: result.message,
      error: result.error
    });
  } catch (error) {
    console.error('Erro ao desconectar FTP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao desconectar'
    });
  }
});

// POST /api/ftp/validate-connection - Validar dados de conexão sem conectar
router.post('/validate-connection', authMiddleware, async (req, res) => {
  try {
    const { ip, usuario, senha, porta = 21 } = req.body;

    if (!ip || !usuario || !senha) {
      return res.status(400).json({
        success: false,
        error: 'IP, usuário e senha são obrigatórios'
      });
    }

    // Validações básicas
    const validations = {
      ip_format: /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(ip.trim()),
      port_range: porta >= 1 && porta <= 65535,
      credentials_length: usuario.trim().length > 0 && senha.trim().length > 0
    };

    const isValid = Object.values(validations).every(v => v);

    res.json({
      success: true,
      valid: isValid,
      validations: {
        ip_format: validations.ip_format,
        port_range: validations.port_range,
        credentials_provided: validations.credentials_length
      },
      message: isValid ? 'Dados de conexão válidos' : 'Verifique os dados informados'
    });
  } catch (error) {
    console.error('Erro ao validar conexão:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao validar dados'
    });
  }
});

// GET /api/ftp/stats - Estatísticas do FTP Manager
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = {
      active_connections: FTPManager.activeConnections.size,
      active_migrations: FTPManager.activeMigrations.size,
      user_connected: FTPManager.activeConnections.has(userId),
      user_migrating: FTPManager.activeMigrations.has(userId),
      connection_timeout: FTPManager.connectionTimeout / 1000 / 60, // em minutos
      last_cleanup: new Date().toISOString()
    };

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter estatísticas'
    });
  }
});

// POST /api/ftp/test-connection - Testar conexão sem salvar
router.post('/test-connection', authMiddleware, async (req, res) => {
  try {
    const { ip, usuario, senha, porta = 21 } = req.body;
    const userId = req.user.id;

    if (!ip || !usuario || !senha) {
      return res.status(400).json({
        success: false,
        error: 'IP, usuário e senha são obrigatórios'
      });
    }

    console.log(`🧪 Testando conexão FTP para usuário ${userId}: ${usuario}@${ip}:${porta}`);

    // Usar um ID temporário para teste
    const testUserId = `test_${userId}_${Date.now()}`;
    
    try {
      const connectionData = {
        ip: ip.trim(),
        usuario: usuario.trim(),
        senha: senha.trim(),
        porta: parseInt(porta) || 21
      };

      const result = await FTPManager.connect(testUserId, connectionData);
      
      if (result.success) {
        // Desconectar imediatamente após teste
        await FTPManager.disconnect(testUserId);
        
        res.json({
          success: true,
          message: 'Conexão testada com sucesso',
          connection_time: new Date().toISOString()
        });
      } else {
        res.json({
          success: false,
          error: result.error || 'Falha no teste de conexão'
        });
      }
    } catch (testError) {
      // Limpar conexão de teste em caso de erro
      await FTPManager.disconnect(testUserId).catch(() => {});
      throw testError;
    }
  } catch (error) {
    console.error('Erro no teste de conexão:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro no teste de conexão'
    });
  }
});

// GET /api/ftp/migration-history - Histórico de migrações
router.get('/migration-history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Buscar vídeos migrados via FTP no banco
    const [rows] = await db.execute(
      `SELECT 
        id, nome, tamanho_arquivo, data_upload, origem
       FROM videos 
       WHERE codigo_cliente = ? AND origem = 'ftp'
       ORDER BY data_upload DESC 
       LIMIT ?`,
      [userId, parseInt(limit.toString()) || 10]
    );

    const history = rows.map(video => ({
      id: video.id,
      nome: video.nome,
      tamanho_mb: Math.ceil(video.tamanho_arquivo / (1024 * 1024)),
      data_migracao: video.data_upload,
      origem: video.origem
    }));

    res.json({
      success: true,
      history: history,
      total: history.length
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar histórico'
    });
  }
});

// DELETE /api/ftp/clear-history - Limpar histórico de migrações
router.delete('/clear-history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remover apenas registros de migração FTP (não os arquivos físicos)
    const [result] = await db.execute(
      'DELETE FROM videos WHERE codigo_cliente = ? AND origem = "ftp"',
      [userId]
    );

    res.json({
      success: true,
      message: `${result.affectedRows} registro(s) de migração removido(s)`,
      removed_count: result.affectedRows
    });
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao limpar histórico'
    });
  }
});

// GET /api/ftp/server-info - Informações do servidor FTP conectado
router.get('/server-info', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionInfo = FTPManager.activeConnections.get(userId);

    if (!connectionInfo) {
      return res.json({
        success: false,
        connected: false,
        error: 'Não há conexão FTP ativa'
      });
    }

    const serverInfo = {
      ip: connectionInfo.connectionData.ip,
      porta: connectionInfo.connectionData.porta,
      usuario: connectionInfo.connectionData.usuario,
      connected_at: connectionInfo.connectedAt,
      last_used: connectionInfo.lastUsed,
      connection_age: Math.floor((new Date().getTime() - connectionInfo.connectedAt.getTime()) / 1000)
    };

    res.json({
      success: true,
      connected: true,
      server_info: serverInfo
    });
  } catch (error) {
    console.error('Erro ao obter informações do servidor:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter informações'
    });
  }
});

// POST /api/ftp/change-directory - Navegar para diretório específico
router.post('/change-directory', authMiddleware, async (req, res) => {
  try {
    const { path } = req.body;
    const userId = req.user.id;

    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'Caminho é obrigatório'
      });
    }

    console.log(`📂 Navegando para diretório: ${path} para usuário ${userId}`);

    const result = await FTPManager.listDirectory(userId, path);

    res.json({
      success: true,
      files: result.files || [],
      currentPath: result.currentPath || path,
      videoCount: result.videoCount || 0,
      message: `Navegado para: ${path}`
    });
  } catch (error) {
    console.error('Erro ao navegar para diretório:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao navegar para diretório'
    });
  }
});

// GET /api/ftp/quick-scan - Scan rápido para encontrar vídeos
router.get('/quick-scan', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { maxDepth = 3 } = req.query;

    console.log(`⚡ Scan rápido para usuário ${userId} (profundidade: ${maxDepth})`);

    const result = await FTPManager.scanDirectoryRecursive(userId, '/', parseInt(maxDepth.toString()) || 3);

    res.json({
      success: true,
      videos: result.videos || [],
      total_videos: result.total_videos || 0,
      scanned_directories: result.scanned_directories || 0,
      scan_type: 'quick',
      max_depth: parseInt(maxDepth.toString()) || 3
    });
  } catch (error) {
    console.error('Erro no scan rápido:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro no scan rápido'
    });
  }
});

// POST /api/ftp/reconnect - Reconectar usando dados salvos
router.post('/reconnect', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionInfo = FTPManager.activeConnections.get(userId);

    if (!connectionInfo) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma conexão anterior encontrada'
      });
    }

    console.log(`🔄 Reconectando FTP para usuário ${userId}`);

    // Tentar reconectar usando dados salvos
    const result = await FTPManager.connect(userId, connectionInfo.connectionData);

    if (result.success) {
      // Listar diretório atual
      const listResult = await FTPManager.listDirectory(userId, '/');
      
      res.json({
        success: true,
        message: 'Reconectado com sucesso',
        files: listResult.files || [],
        currentPath: listResult.currentPath || '/',
        videoCount: listResult.videoCount || 0
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Erro ao reconectar'
      });
    }
  } catch (error) {
    console.error('Erro ao reconectar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao reconectar'
    });
  }
});

// GET /api/ftp/logs/:migrationId - Obter logs de uma migração específica
router.get('/logs/:migrationId', authMiddleware, async (req, res) => {
  try {
    const { migrationId } = req.params;
    const userId = req.user.id;

    // Por enquanto, retornar logs básicos
    // Em uma implementação completa, você salvaria logs detalhados
    const migrationData = FTPManager.activeMigrations.get(userId);
    
    if (!migrationData) {
      return res.json({
        success: true,
        logs: [],
        message: 'Nenhum log encontrado para esta migração'
      });
    }

    const logs = [
      {
        timestamp: migrationData.startTime.toISOString(),
        level: 'info',
        message: `Migração iniciada: ${migrationData.files.length} arquivo(s)`
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Status atual: ${migrationData.status}`
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Progresso: ${migrationData.completed}/${migrationData.files.length}`
      }
    ];

    // Adicionar erros se houver
    if (migrationData.errors && migrationData.errors.length > 0) {
      migrationData.errors.forEach(error => {
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: error
        });
      });
    }

    res.json({
      success: true,
      logs: logs,
      migration_id: migrationId
    });
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter logs'
    });
  }
});

// POST /api/ftp/retry-failed - Tentar novamente arquivos que falharam
router.post('/retry-failed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const migrationData = FTPManager.activeMigrations.get(userId);

    if (!migrationData) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma migração ativa encontrada'
      });
    }

    if (migrationData.status !== 'completed' && migrationData.status !== 'error') {
      return res.status(400).json({
        success: false,
        error: 'Migração ainda está em andamento'
      });
    }

    // Resetar erros e tentar novamente
    migrationData.errors = [];
    migrationData.status = 'migrating';

    res.json({
      success: true,
      message: 'Tentativa de reprocessamento iniciada',
      remaining_files: migrationData.files.length - migrationData.completed
    });
  } catch (error) {
    console.error('Erro ao tentar novamente:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao tentar novamente'
    });
  }
});

module.exports = router;