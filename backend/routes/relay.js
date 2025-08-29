const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const SSHManager = require('../config/SSHManager');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Mapa de processos ativos
const activeRelays = new Map();

// GET /api/relay/status - Verifica status do relay
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar configuração de relay do usuário
    const [rows] = await db.execute(
      `SELECT 
        r.codigo as id,
        r.url_origem,
        r.tipo_relay,
        r.status,
        r.data_inicio,
        r.data_fim,
        r.erro_detalhes,
        r.servidor_id,
        r.processo_pid,
        s.identificacao as stream_name
       FROM relay_config r
       LEFT JOIN streamings s ON r.codigo_stm = s.codigo_cliente
       WHERE (r.codigo_stm = ? OR r.codigo_stm IN (
         SELECT codigo_cliente FROM streamings WHERE codigo = ?
       )) AND r.status IN ('ativo', 'erro')
       ORDER BY r.data_inicio DESC
       LIMIT 1`,
      [userId, userId]
    );

    if (rows.length === 0) {
      return res.json({
        relay_status: 'inativo',
        is_live: false,
        viewers: 0,
        bitrate: 0,
        uptime: '00:00:00'
      });
    }

    const relay = rows[0];
    
    // Verificar se processo ainda está rodando
    let isProcessRunning = false;
    if (relay.processo_pid) {
      try {
        process.kill(relay.processo_pid, 0); // Não mata, apenas verifica se existe
        isProcessRunning = true;
      } catch (error) {
        isProcessRunning = false;
      }
    }

    // Se processo não está rodando mas status é ativo, marcar como erro
    if (relay.status === 'ativo' && !isProcessRunning) {
      await db.execute(
        'UPDATE relay_config SET status = "erro", erro_detalhes = "Processo FFmpeg parou inesperadamente" WHERE codigo = ?',
        [relay.id]
      );
      relay.status = 'erro';
      relay.erro_detalhes = 'Processo FFmpeg parou inesperadamente';
    }

    // Calcular uptime
    let uptime = '00:00:00';
    if (relay.data_inicio && relay.status === 'ativo') {
      const startTime = new Date(relay.data_inicio);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      uptime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Simular estatísticas (em produção, você obteria do Wowza)
    const viewers = relay.status === 'ativo' ? Math.floor(Math.random() * 20) + 5 : 0;
    const bitrate = relay.status === 'ativo' ? 2500 + Math.floor(Math.random() * 500) : 0;

    res.json({
      id: relay.id,
      relay_status: relay.status,
      relay_url: relay.url_origem,
      relay_type: relay.tipo_relay,
      relay_error_details: relay.erro_detalhes,
      relay_started_at: relay.data_inicio,
      is_live: relay.status === 'ativo' && isProcessRunning,
      viewers: viewers,
      bitrate: bitrate,
      uptime: uptime,
      stream_name: relay.stream_name,
      processo_pid: relay.processo_pid
    });
  } catch (error) {
    console.error('Erro ao verificar status do relay:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/relay/validate-url - Valida URL do relay
router.post('/validate-url', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.json({ valid: false, message: 'URL é obrigatória' });
    }

    // Validação básica de formato
    const rtmpRegex = /^rtmps?:\/\/.+/;
    const m3u8Regex = /^https?:\/\/.+\.m3u8(\?.*)?$/;
    const hlsRegex = /^https?:\/\/.+\/(playlist\.m3u8|index\.m3u8|.*\.m3u8)(\?.*)?$/;

    if (!rtmpRegex.test(url) && !m3u8Regex.test(url) && !hlsRegex.test(url)) {
      return res.json({ 
        valid: false, 
        message: 'URL deve ser RTMP (rtmp://) ou HLS/M3U8 (https://...m3u8)' 
      });
    }

    // Validação de conectividade usando FFprobe
    try {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-timeout', '10000000', // 10 segundos
        url
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const validationResult = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ffprobe.kill();
          resolve({ valid: false, message: 'Timeout na validação da URL (>10s)' });
        }, 15000);

        ffprobe.on('close', (code) => {
          clearTimeout(timeout);
          
          if (code === 0 && stdout) {
            try {
              const probeData = JSON.parse(stdout);
              if (probeData.streams && probeData.streams.length > 0) {
                const videoStream = probeData.streams.find(s => s.codec_type === 'video');
                const audioStream = probeData.streams.find(s => s.codec_type === 'audio');
                
                let details = 'URL válida e acessível';
                if (videoStream) {
                  details += ` - Vídeo: ${videoStream.codec_name}`;
                }
                if (audioStream) {
                  details += ` - Áudio: ${audioStream.codec_name}`;
                }
                
                resolve({ valid: true, message: details });
              } else {
                resolve({ valid: false, message: 'URL não contém streams de vídeo válidos' });
              }
            } catch (parseError) {
              resolve({ valid: false, message: 'Erro ao analisar stream' });
            }
          } else {
            const errorMsg = stderr.includes('Connection refused') ? 'Conexão recusada pelo servidor' :
                           stderr.includes('No route to host') ? 'Servidor inacessível' :
                           stderr.includes('Invalid data') ? 'Dados inválidos no stream' :
                           'URL inacessível ou formato inválido';
            resolve({ valid: false, message: errorMsg });
          }
        });

        ffprobe.on('error', () => {
          clearTimeout(timeout);
          resolve({ valid: false, message: 'Erro ao executar validação' });
        });
      });

      res.json(validationResult);
    } catch (error) {
      console.error('Erro na validação:', error);
      res.json({ valid: false, message: 'Erro ao validar URL' });
    }

  } catch (error) {
    console.error('Erro ao validar URL:', error);
    res.status(500).json({ valid: false, message: 'Erro ao validar URL' });
  }
});

// POST /api/relay/start - Inicia relay
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { relay_url, relay_type, server_id } = req.body;
    const userId = req.user.id;
    const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;

    if (!relay_url) {
      return res.status(400).json({
        success: false,
        error: 'URL do relay é obrigatória'
      });
    }

    // Verificar se já existe relay ativo
    const [existingRelay] = await db.execute(
      'SELECT codigo FROM relay_config WHERE codigo_stm = ? AND status = "ativo"',
      [userId]
    );

    if (existingRelay.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Já existe um relay ativo. Pare o relay atual antes de iniciar um novo.'
      });
    }

    // Buscar servidor do usuário
    const [serverRows] = await db.execute(
      'SELECT codigo_servidor FROM streamings WHERE codigo_cliente = ? LIMIT 1',
      [userId]
    );

    const serverId = server_id || (serverRows.length > 0 ? serverRows[0].codigo_servidor : 1);

    // Inserir configuração do relay
    const [relayResult] = await db.execute(
      `INSERT INTO relay_config (
        codigo_stm, url_origem, tipo_relay, status, data_inicio, servidor_id
      ) VALUES (?, ?, ?, 'ativo', NOW(), ?)`,
      [userId, relay_url, relay_type || 'rtmp', serverId]
    );

    const relayId = relayResult.insertId;

    try {
      // Construir comando FFmpeg para relay
      const outputUrl = `rtmp://samhost.wcore.com.br:1935/samhost/${userLogin}_relay`;
      
      const ffmpegArgs = [
        '-i', relay_url,
        '-c', 'copy', // Copiar streams sem recodificar
        '-f', 'flv',
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-timeout', '30000000', // 30 segundos timeout
        '-y',
        outputUrl
      ];

      console.log(`🔄 Iniciando relay FFmpeg: ${relay_url} -> ${outputUrl}`);
      console.log(`📋 Comando: ffmpeg ${ffmpegArgs.join(' ')}`);

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      let ffmpegOutput = '';
      let ffmpegError = '';

      ffmpegProcess.stdout.on('data', (data) => {
        ffmpegOutput += data.toString();
      });

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        ffmpegError += output;
        
        // Log de progresso do FFmpeg
        if (output.includes('frame=') || output.includes('time=')) {
          console.log(`📊 FFmpeg relay progress: ${output.trim()}`);
        }
      });

      ffmpegProcess.on('close', async (code) => {
        console.log(`🔚 Processo FFmpeg relay finalizado com código: ${code}`);
        
        // Atualizar status no banco
        await db.execute(
          'UPDATE relay_config SET status = "erro", data_fim = NOW(), erro_detalhes = ? WHERE codigo = ?',
          [`Processo finalizado com código ${code}. Erro: ${ffmpegError.slice(-500)}`, relayId]
        );

        // Remover do mapa de processos ativos
        activeRelays.delete(userId);
      });

      ffmpegProcess.on('error', async (error) => {
        console.error('❌ Erro no processo FFmpeg relay:', error);
        
        // Atualizar status no banco
        await db.execute(
          'UPDATE relay_config SET status = "erro", data_fim = NOW(), erro_detalhes = ? WHERE codigo = ?',
          [`Erro no processo: ${error.message}`, relayId]
        );

        // Remover do mapa de processos ativos
        activeRelays.delete(userId);
      });

      // Salvar PID do processo
      await db.execute(
        'UPDATE relay_config SET processo_pid = ? WHERE codigo = ?',
        [ffmpegProcess.pid, relayId]
      );

      // Adicionar ao mapa de processos ativos
      activeRelays.set(userId, {
        process: ffmpegProcess,
        relayId: relayId,
        startTime: new Date(),
        url: relay_url
      });

      // Aguardar alguns segundos para verificar se o processo iniciou corretamente
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verificar se processo ainda está rodando
      let processStillRunning = false;
      try {
        process.kill(ffmpegProcess.pid, 0);
        processStillRunning = true;
      } catch (error) {
        processStillRunning = false;
      }

      if (!processStillRunning) {
        await db.execute(
          'UPDATE relay_config SET status = "erro", erro_detalhes = "Processo FFmpeg falhou ao iniciar" WHERE codigo = ?',
          [relayId]
        );
        
        return res.status(500).json({
          success: false,
          error: 'Falha ao iniciar processo de relay. Verifique se a URL está acessível.'
        });
      }

      console.log(`✅ Relay iniciado com sucesso - PID: ${ffmpegProcess.pid}`);

      res.json({
        success: true,
        message: 'Relay ativado com sucesso',
        relay_id: relayId,
        relay_url,
        relay_type: relay_type || 'rtmp',
        output_url: outputUrl,
        processo_pid: ffmpegProcess.pid
      });

    } catch (ffmpegError) {
      console.error('Erro ao iniciar FFmpeg:', ffmpegError);
      
      // Atualizar status como erro
      await db.execute(
        'UPDATE relay_config SET status = "erro", erro_detalhes = ? WHERE codigo = ?',
        [`Erro ao iniciar FFmpeg: ${ffmpegError.message}`, relayId]
      );

      return res.status(500).json({
        success: false,
        error: 'Erro ao iniciar processo de relay'
      });
    }

  } catch (error) {
    console.error('Erro ao iniciar relay:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/relay/stop - Para relay
router.post('/stop', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar relay ativo
    const [relayRows] = await db.execute(
      'SELECT codigo, processo_pid FROM relay_config WHERE codigo_stm = ? AND status = "ativo"',
      [userId]
    );

    if (relayRows.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum relay ativo encontrado'
      });
    }

    const relay = relayRows[0];

    // Parar processo FFmpeg se estiver rodando
    if (relay.processo_pid) {
      try {
        process.kill(relay.processo_pid, 'SIGTERM');
        console.log(`🛑 Processo FFmpeg ${relay.processo_pid} finalizado`);
        
        // Aguardar um pouco e forçar kill se necessário
        setTimeout(() => {
          try {
            process.kill(relay.processo_pid, 'SIGKILL');
          } catch (error) {
            // Processo já foi finalizado
          }
        }, 5000);
      } catch (error) {
        console.log(`⚠️ Processo ${relay.processo_pid} já estava finalizado`);
      }
    }

    // Remover do mapa de processos ativos
    activeRelays.delete(userId);

    // Atualizar status no banco
    await db.execute(
      'UPDATE relay_config SET status = "inativo", data_fim = NOW() WHERE codigo = ?',
      [relay.codigo]
    );

    res.json({
      success: true,
      message: 'Relay desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao parar relay:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/relay/logs/:id - Obter logs do relay
router.get('/logs/:id', authMiddleware, async (req, res) => {
  try {
    const relayId = req.params.id;
    const userId = req.user.id;

    // Verificar se relay pertence ao usuário
    const [relayRows] = await db.execute(
      'SELECT codigo, erro_detalhes FROM relay_config WHERE codigo = ? AND codigo_stm = ?',
      [relayId, userId]
    );

    if (relayRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Relay não encontrado'
      });
    }

    const relay = relayRows[0];

    // Buscar logs do banco (se implementado) ou retornar erro_detalhes
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: relay.erro_detalhes || 'Relay funcionando normalmente'
      }
    ];

    res.json({
      success: true,
      logs: logs
    });

  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Função para limpar processos órfãos na inicialização
const cleanupOrphanedProcesses = async () => {
  try {
    console.log('🧹 Limpando processos de relay órfãos...');
    
    // Marcar todos os relays como inativos na inicialização
    await db.execute(
      'UPDATE relay_config SET status = "erro", erro_detalhes = "Servidor reiniciado" WHERE status = "ativo"'
    );
    
    console.log('✅ Limpeza de processos órfãos concluída');
  } catch (error) {
    console.error('Erro na limpeza de processos órfãos:', error);
  }
};

// Executar limpeza na inicialização
cleanupOrphanedProcesses();

// Cleanup ao fechar aplicação
process.on('SIGINT', async () => {
  console.log('\n🛑 Finalizando todos os relays ativos...');
  
  for (const [userId, relayData] of activeRelays) {
    try {
      if (relayData.process && relayData.process.pid) {
        process.kill(relayData.process.pid, 'SIGTERM');
        
        // Atualizar status no banco
        await db.execute(
          'UPDATE relay_config SET status = "inativo", data_fim = NOW() WHERE codigo = ?',
          [relayData.relayId]
        );
      }
    } catch (error) {
      console.error(`Erro ao finalizar relay do usuário ${userId}:`, error);
    }
  }
  
  activeRelays.clear();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Finalizando todos os relays ativos...');
  
  for (const [userId, relayData] of activeRelays) {
    try {
      if (relayData.process && relayData.process.pid) {
        process.kill(relayData.process.pid, 'SIGTERM');
        
        await db.execute(
          'UPDATE relay_config SET status = "inativo", data_fim = NOW() WHERE codigo = ?',
          [relayData.relayId]
        );
      }
    } catch (error) {
      console.error(`Erro ao finalizar relay do usuário ${userId}:`, error);
    }
  }
  
  activeRelays.clear();
  process.exit(0);
});

module.exports = router;