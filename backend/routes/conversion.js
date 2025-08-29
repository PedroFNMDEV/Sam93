const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const VideoSSHManager = require('../config/VideoSSHManager');
const SSHManager = require('../config/SSHManager');
const VideoURLBuilder = require('../config/VideoURLBuilder');

const router = express.Router();

// GET /api/conversion/videos - Lista vídeos para conversão
router.get('/videos', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.email ? req.user.email.split('@')[0] : `user_${userId}`;
    const folderId = req.query.folder_id;

    let whereClause = 'WHERE v.codigo_cliente = ?';
    let params = [userId];

    if (folderId) {
      whereClause += ' AND v.pasta = ?';
      params.push(folderId);
    }
    
    // Adicionar suporte para usuários de streaming
    whereClause = `WHERE (v.codigo_cliente = ? OR v.codigo_cliente IN (
      SELECT codigo_cliente FROM streamings WHERE codigo = ?
    ))`;
    params = [userId, userId];
    
    if (folderId) {
      whereClause += ' AND v.pasta = ?';
      params.push(folderId);
    }

    // Buscar vídeos do banco com informações de conversão
    const [rows] = await db.execute(
      `SELECT 
        v.id,
        v.nome,
        v.url,
        v.caminho,
        v.duracao,
        v.tamanho_arquivo as tamanho,
        v.bitrate_video,
        v.formato_original,
        v.codec_video,
        v.largura,
        v.altura,
        v.is_mp4,
        v.compativel,
        v.pasta,
        u.bitrate as user_bitrate_limit,
        f.nome_sanitizado as folder_name,
        f.servidor_id
       FROM videos v
       LEFT JOIN folders f ON v.pasta = f.id
       LEFT JOIN streamings u ON v.codigo_cliente = u.codigo_cliente
       ${whereClause}
       ORDER BY v.id DESC`,
      params
    );

    // Verificar se vídeos existem no servidor e atualizar informações
    const VideoSSHManager = require('../config/VideoSSHManager');
    
    for (const video of rows) {
      try {
        const serverId = video.servidor_id || 1;
        
        // Construir caminho correto no servidor
        let serverPath = video.caminho;
        if (!serverPath.startsWith('/home/streaming/')) {
          // Converter para nova estrutura
          serverPath = `/home/streaming/${userLogin}/${video.folder_name}/${video.nome}`;
        }
        
        // Verificar se arquivo existe no servidor
        const fileInfo = await SSHManager.getFileInfo(serverId, serverPath);
        
        if (fileInfo.exists) {
          // Atualizar tamanho se necessário
          if (!video.tamanho && fileInfo.size > 0) {
            await db.execute(
              'UPDATE videos SET tamanho_arquivo = ? WHERE id = ?',
              [fileInfo.size, video.id]
            );
            video.tamanho = fileInfo.size;
          }
          
          // Atualizar caminho se necessário
          if (video.caminho !== serverPath) {
            await db.execute(
              'UPDATE videos SET caminho = ? WHERE id = ?',
              [serverPath, video.id]
            );
            video.caminho = serverPath;
          }
        } else {
          console.warn(`Arquivo não encontrado no servidor: ${serverPath}`);
        }
      } catch (error) {
        console.warn(`Erro ao verificar arquivo ${video.nome}:`, error.message);
      }
    }
    // Função para verificar compatibilidade de codec
    const isCompatibleCodec = (codecName) => {
      const compatibleCodecs = ['h264', 'h265', 'hevc'];
      return compatibleCodecs.includes(codecName?.toLowerCase());
    };
    const videos = rows.map(video => {
      const currentBitrate = video.bitrate_video || 0;
      const userBitrateLimit = video.user_bitrate_limit || 2500;
      
      // Verificar compatibilidade completa
      const isMP4 = video.is_mp4 === 1;
      const bitrateExceedsLimit = currentBitrate > userBitrateLimit;
      const codecCompatible = isCompatibleCodec(codecVideo) || 
                              codecVideo === 'h264' || 
                              codecVideo === 'h265' || 
                              codecVideo === 'hevc';
      const bitrateWithinLimit = bitrateVideo <= userBitrateLimit;
      
      // Lógica de compatibilidade atualizada
      const isFullyCompatible = isMP4 && codecCompatible && bitrateWithinLimit;
      const needsConversion = !isMP4 || !codecCompatible || !bitrateWithinLimit;
      
      // Status de compatibilidade
      let compatibilityStatus;
      let compatibilityMessage;
        compatibilityMessage = 'Necessário Otimizar';
      if (isFullyCompatible) {
        compatibilityStatus = 'optimized';
        compatibilityMessage = 'Otimizado';
      } else if (needsConversion) {
        compatibilityStatus = 'needs_conversion';
        compatibilityMessage = 'Necessário Conversão';
      }

      // Qualidades disponíveis baseadas no limite do usuário
      const availableQualities = [
        {
          quality: 'baixa',
          bitrate: 800,
          resolution: '854x480',
          canConvert: 800 <= userBitrateLimit,
          description: 'Qualidade básica para conexões lentas',
          customizable: true
        },
        {
          quality: 'media',
          bitrate: 1500,
          resolution: '1280x720',
          canConvert: 1500 <= userBitrateLimit,
          description: 'Qualidade média, boa para a maioria dos casos',
          customizable: true
        },
        {
          quality: 'alta',
          bitrate: 2500,
          resolution: '1920x1080',
          canConvert: 2500 <= userBitrateLimit,
          description: 'Alta qualidade para transmissões profissionais',
          customizable: true
        },
        {
          quality: 'fullhd',
          bitrate: Math.min(4000, userBitrateLimit),
          resolution: '1920x1080',
          canConvert: userBitrateLimit >= 3000,
          description: 'Máxima qualidade disponível no seu plano',
          customizable: true
        },
        {
          quality: 'custom',
          bitrate: 0,
          resolution: 'Personalizada',
          canConvert: true,
              } 
      ];

      return {
        id: video.id,
        nome: video.nome,
        url: video.url,
        duracao: video.duracao,
        tamanho: video.tamanho,
        bitrate_video: video.bitrate_video,
        formato_original: video.formato_original,
        codec_video: video.codec_video,
        largura: video.largura,
        altura: video.altura,
        is_mp4: video.is_mp4 === 1,
        current_bitrate: currentBitrate,
        bitrate_original: currentBitrate,
        user_bitrate_limit: userBitrateLimit,
        available_qualities: availableQualities,
        can_use_current: isFullyCompatible,
        needs_conversion: needsConversion || !isFullyCompatible,
        compatibility_status: compatibilityStatus,
        compatibility_message: compatibilityMessage,
        codec_compatible: codecCompatible && bitrateWithinLimit,
        format_compatible: isMP4,
      };
    });

    res.json({
      success: true,
      videos: videos
    });
  } catch (err) {
    console.error('Erro ao buscar vídeos para conversão:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar vídeos para conversão', 
      details: err.message 
    });
  }
});

// GET /api/conversion/qualities - Lista qualidades disponíveis
router.get('/qualities', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userBitrateLimit = req.user.bitrate || 2500;

    const qualities = [
      {
        quality: 'baixa',
        label: 'Baixa (480p)',
        bitrate: 800,
        resolution: '854x480',
        available: 800 <= userBitrateLimit,
        description: 'Qualidade básica para conexões lentas'
      },
      {
        quality: 'media',
        label: 'Média (720p)',
        bitrate: 1500,
        resolution: '1280x720',
        available: 1500 <= userBitrateLimit,
        description: 'Qualidade média, boa para a maioria dos casos'
      },
      {
        quality: 'alta',
        label: 'Alta (1080p)',
        bitrate: 2500,
        resolution: '1920x1080',
        available: 2500 <= userBitrateLimit,
        description: 'Alta qualidade para transmissões profissionais'
      },
      {
        quality: 'fullhd',
        label: 'Full HD (1080p+)',
        bitrate: Math.min(4000, userBitrateLimit),
        resolution: '1920x1080',
        available: userBitrateLimit >= 3000,
        description: 'Máxima qualidade disponível no seu plano'
      },
      {
        quality: 'custom',
        label: 'Personalizado',
        bitrate: 0,
        resolution: 'Personalizada',
        available: true,
        description: 'Configure bitrate e resolução personalizados'
      }
    ];

    res.json({
      success: true,
      qualities: qualities,
      user_bitrate_limit: userBitrateLimit
    });
  } catch (err) {
    console.error('Erro ao buscar qualidades:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar qualidades', 
      details: err.message 
    });
  }
});

// POST /api/conversion/convert - Iniciar conversão de vídeo
router.post('/convert', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLogin = req.user.usuario || `user_${userId}`;
    const { video_id, quality, custom_bitrate, custom_resolution, use_custom } = req.body;

    if (!video_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID do vídeo é obrigatório' 
      });
    }

    // Buscar dados do vídeo
    const [videoRows] = await db.execute(
      `SELECT v.*, f.servidor_id, f.nome_sanitizado as folder_name 
       FROM videos v 
       LEFT JOIN folders f ON v.pasta = f.id 
       WHERE v.id = ? AND v.codigo_cliente = ?`,
      [video_id, userId]
    );

    if (videoRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Vídeo não encontrado' 
      });
    }

    const video = videoRows[0];
    const serverId = video.servidor_id || 1;
    const userBitrateLimit = req.user.bitrate || 2500;

    // Construir caminho correto no servidor
    let inputPath = video.caminho;
    
    // Garantir que estamos usando o caminho correto do Wowza
    if (!inputPath.startsWith('/usr/local/WowzaStreamingEngine/content/')) {
      if (inputPath.startsWith('/home/streaming/')) {
        // Converter de streaming para Wowza
        inputPath = inputPath.replace('/home/streaming/', '/usr/local/WowzaStreamingEngine/content/');
      } else {
        // Construir caminho do Wowza
        inputPath = `/usr/local/WowzaStreamingEngine/content/${userLogin}/${video.folder_name}/${video.nome}`;
      }
    }
    
    // Verificar se arquivo existe no servidor
    const fileInfo = await SSHManager.getFileInfo(serverId, inputPath);
    
    if (!fileInfo.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Arquivo não encontrado no servidor. Verifique se o vídeo foi enviado corretamente.' 
      });
    }
    
    // Determinar configurações de conversão
    let targetBitrate, targetResolution, qualityLabel;

    if (use_custom || quality === 'custom') {
      if (!custom_bitrate || !custom_resolution) {
        return res.status(400).json({ 
          success: false, 
          error: 'Bitrate e resolução customizados são obrigatórios para conversão personalizada' 
        });
      }

      if (custom_bitrate > userBitrateLimit) {
        return res.status(400).json({ 
          success: false, 
          error: `Bitrate customizado (${custom_bitrate} kbps) excede o limite do plano (${userBitrateLimit} kbps)` 
        });
      }

      targetBitrate = custom_bitrate;
      targetResolution = custom_resolution;
      qualityLabel = `Personalizado (${custom_bitrate} kbps)`;
    } else {
      // Qualidades predefinidas
      const qualitySettings = {
        baixa: { bitrate: 800, resolution: '854x480', label: 'Baixa (480p)' },
        media: { bitrate: 1500, resolution: '1280x720', label: 'Média (720p)' },
        alta: { bitrate: 2500, resolution: '1920x1080', label: 'Alta (1080p)' },
        fullhd: { bitrate: Math.min(4000, userBitrateLimit), resolution: '1920x1080', label: 'Full HD (1080p+)' }
      };

      const settings = qualitySettings[quality];
      if (!settings) {
        return res.status(400).json({ 
          success: false, 
          error: 'Qualidade inválida' 
        });
      }

      if (settings.bitrate > userBitrateLimit) {
        return res.status(400).json({ 
          success: false, 
          error: `Qualidade selecionada excede o limite do plano (${userBitrateLimit} kbps)` 
        });
      }

      targetBitrate = settings.bitrate;
      targetResolution = settings.resolution;
      qualityLabel = settings.label;
    }

    // Construir caminho de saída
    const outputFileName = video.nome.replace(/\.[^/.]+$/, `_${targetBitrate}kbps.mp4`);
    const outputPath = `/usr/local/WowzaStreamingEngine/content/${userLogin}/${video.folder_name}/${outputFileName}`;


    // Verificar se conversão já existe
    const outputExists = await SSHManager.getFileInfo(serverId, outputPath);
    if (outputExists.exists) {
      return res.status(400).json({ 
        success: false, 
        error: 'Já existe uma conversão com essas configurações' 
      });
    }

    // Comando FFmpeg para conversão
    const [width, height] = targetResolution.split('x');
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset medium -crf 23 -b:v ${targetBitrate}k -maxrate ${targetBitrate}k -bufsize ${targetBitrate * 2}k -vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2 -c:a aac -b:a 128k -movflags +faststart -f mp4 "${outputPath}" -y 2>&1 && echo "CONVERSION_SUCCESS" || echo "CONVERSION_ERROR"`;

    console.log(`🔄 Iniciando conversão: ${video.nome} -> ${qualityLabel}`);
    console.log(`📁 Caminho de entrada: ${inputPath}`);
    console.log(`📁 Caminho de saída: ${outputPath}`);
    
    // Executar conversão de forma síncrona para verificar resultado imediatamente
    try {
      const conversionResult = await SSHManager.executeCommand(serverId, ffmpegCommand);
      
      if (conversionResult.stdout.includes('CONVERSION_SUCCESS')) {
        console.log(`✅ Conversão concluída: ${video.nome} -> ${qualityLabel}`);
        
        // Obter tamanho do arquivo convertido
        const convertedFileInfo = await SSHManager.getFileInfo(serverId, outputPath);
        const convertedSize = convertedFileInfo.exists ? convertedFileInfo.size : 0;
        
        // Inserir novo vídeo convertido no banco
        const relativePath = `${userLogin}/${video.folder_name}/${outputFileName}`;
        
        const [insertResult] = await db.execute(
          `INSERT INTO videos (
            nome, url, caminho, duracao, tamanho_arquivo,
            codigo_cliente, pasta, bitrate_video, formato_original,
            largura, altura, is_mp4, compativel, codec_video, origem
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mp4', ?, ?, 1, 'sim', 'h264', 'conversao')`,
          [
            outputFileName,
            relativePath,
            outputPath,
            video.duracao,
            convertedSize,
            userId,
            video.pasta,
            targetBitrate,
            width,
            height
          ]
        );
        
        // Atualizar vídeo original para marcar como tendo versão convertida
        await db.execute(
          'UPDATE videos SET compativel = "otimizado", has_converted_version = 1 WHERE id = ?',
          [video_id]
        );
        
        // Atualizar espaço usado na pasta
        const spaceMB = Math.ceil(convertedSize / (1024 * 1024));
        await db.execute(
          'UPDATE folders SET espaco_usado = espaco_usado + ? WHERE id = ?',
          [spaceMB, video.pasta]
        );
        
        res.json({
          success: true,
          message: `Conversão concluída: ${video.nome} -> ${qualityLabel}`,
          conversion_id: insertResult.insertId,
          target_bitrate: targetBitrate,
          target_resolution: targetResolution,
          quality_label: qualityLabel,
          output_path: outputPath,
          file_size: convertedSize,
          new_video_id: insertResult.insertId,
          relative_path: relativePath
        });
      } else {
        console.error(`❌ Erro na conversão: ${video.nome}`);
        console.error(`Detalhes do erro: ${conversionResult.stderr || 'Erro desconhecido'}`);
        
        res.status(500).json({
          success: false,
          error: 'Erro na conversão do vídeo',
          details: conversionResult.stderr || 'Falha no FFmpeg'
        });
      }
    } catch (conversionError) {
      console.error('Erro na conversão:', conversionError);
      res.status(500).json({
        success: false,
        error: 'Erro ao executar conversão',
        details: conversionError.message
      });
    }

  } catch (err) {
    console.error('Erro ao iniciar conversão:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao iniciar conversão', 
      details: err.message 
    });
  }
});

// GET /api/conversion/status/:videoId - Verificar status da conversão
router.get('/status/:videoId', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userId = req.user.id;

    // Buscar vídeo original e suas conversões
    const [conversionRows] = await db.execute(
      `SELECT 
        id, nome, bitrate_video, caminho, tamanho_arquivo, compativel,
        origem, codec_video, formato_original
       FROM videos 
       WHERE codigo_cliente = ? AND (id = ? OR nome LIKE ? OR origem = 'conversao')
       ORDER BY id DESC`,
      [userId, videoId, `%_${videoId}_%`]
    );

    if (conversionRows.length === 0) {
      return res.json({
        success: true,
        conversion_status: {
          status: 'nao_iniciada',
          progress: 0
        }
      });
    }

    // Buscar vídeo convertido (origem = 'conversao') ou vídeo original compatível
    const conversion = conversionRows.find(v => v.origem === 'conversao') || conversionRows[0];
    
    const [serverRows] = await db.execute(
      'SELECT codigo_servidor FROM streamings WHERE codigo_cliente = ? LIMIT 1',
      [userId]
    );

    const serverId = serverRows.length > 0 ? serverRows[0].codigo_servidor : 1;
    const fileExists = await SSHManager.getFileInfo(serverId, conversion.caminho);

    // Determinar status baseado na compatibilidade e existência do arquivo
    let status = 'nao_iniciada';
    if (conversion.compativel === 'otimizado' && fileExists.exists) {
      status = 'concluida';
    } else if (conversion.origem === 'conversao' && fileExists.exists) {
      status = 'concluida';
    } else if (conversion.origem === 'conversao' && !fileExists.exists) {
      status = 'erro';
    } else {
      status = 'nao_iniciada';
    }

    res.json({
      success: true,
      conversion_status: {
        status: status,
        progress: status === 'concluida' ? 100 : status === 'erro' ? 0 : 50,
        quality: conversion.origem === 'conversao' ? `${conversion.bitrate_video}kbps` : 'Original',
        bitrate: conversion.bitrate_video,
        file_size: conversion.tamanho_arquivo || 0,
        codec: conversion.codec_video,
        format: conversion.formato_original
      }
    });

  } catch (err) {
    console.error('Erro ao verificar status da conversão:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao verificar status da conversão', 
      details: err.message 
    });
  }
});

// DELETE /api/conversion/:videoId - Remover conversão
router.delete('/:videoId', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userId = req.user.id;

    // Buscar vídeo convertido
    const [videoRows] = await db.execute(
      'SELECT caminho, nome FROM videos WHERE id = ? AND codigo_cliente = ? AND qualidade_conversao IS NOT NULL',
      [videoId, userId]
    );

    if (videoRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversão não encontrada' 
      });
    }

    const video = videoRows[0];

    // Buscar servidor do usuário
    const [serverRows] = await db.execute(
      'SELECT codigo_servidor FROM streamings WHERE codigo_cliente = ? LIMIT 1',
      [userId]
    );

    const serverId = serverRows.length > 0 ? serverRows[0].codigo_servidor : 1;

    // Remover arquivo do servidor
    try {
      await SSHManager.deleteFile(serverId, video.caminho);
      console.log(`✅ Arquivo convertido removido: ${video.caminho}`);
    } catch (sshError) {
      console.warn('Erro ao remover arquivo do servidor:', sshError.message);
    }

    // Remover do banco
    await db.execute(
      'DELETE FROM videos WHERE id = ?',
      [videoId]
    );

    res.json({
      success: true,
      message: 'Conversão removida com sucesso'
    });

  } catch (err) {
    console.error('Erro ao remover conversão:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao remover conversão', 
      details: err.message 
    });
  }
});

// POST /api/conversion/batch - Conversão em lote
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { video_ids, quality, custom_bitrate, custom_resolution } = req.body;

    if (!video_ids || !Array.isArray(video_ids) || video_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lista de vídeos é obrigatória' 
      });
    }

    const results = [];

    for (const videoId of video_ids) {
      try {
        // Fazer requisição individual para cada vídeo
        const conversionResult = await new Promise((resolve, reject) => {
          const mockReq = {
            user: req.user,
            body: { video_id: videoId, quality, custom_bitrate, custom_resolution }
          };
          
          const mockRes = {
            json: resolve,
            status: () => ({ json: reject })
          };

          // Simular chamada individual
          router.post('/convert', authMiddleware, async (mockReq, mockRes) => {
            // Lógica de conversão individual aqui
          });
        });

        results.push({
          video_id: videoId,
          success: true,
          result: conversionResult
        });
      } catch (error) {
        results.push({
          video_id: videoId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `${successCount} de ${video_ids.length} conversões iniciadas`,
      results: results
    });

  } catch (err) {
    console.error('Erro na conversão em lote:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erro na conversão em lote', 
      details: err.message 
    });
  }
});

module.exports = router;