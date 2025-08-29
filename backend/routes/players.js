const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');
const path = require('path');

const router = express.Router();

// GET /api/players/iframe - Player iFrame
router.get('/iframe', async (req, res) => {
  try {
    const { stream, playlist, video, player_type = 'html5', login, vod, aspectratio = '16:9', autoplay = 'false', muted = 'false', loop = 'false', contador = 'false', compartilhamento = 'false' } = req.query;
    
    let videoUrl = '';
    let title = 'Player';
    let isLive = false;
    let userLogin = login || 'usuario';
    let vodPath = vod || '';
    
    // Construir URL baseado nos parâmetros (seguindo lógica do video.php)
    if (vodPath) {
      // VOD específico
      const isProduction = process.env.NODE_ENV === 'production';
      const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
      
      // Garantir que o arquivo é MP4
      const vodPathParts = vodPath.split('/');
      if (vodPathParts.length >= 2) {
        const folderName = vodPathParts[0];
        const fileName = vodPathParts[1];
        const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');
        videoUrl = `http://${wowzaHost}:1935/vod/_definst_/mp4:${userLogin}/${folderName}/${finalFileName}/playlist.m3u8`;
      } else {
        videoUrl = `http://${wowzaHost}:1935/vod/_definst_/mp4:${userLogin}/default/${vodPath}/playlist.m3u8`;
      }
      
      title = `VOD: ${vodPath}`;
      isLive = false;
    } else if (stream) {
      // Stream ao vivo
      const isProduction = process.env.NODE_ENV === 'production';
      const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
      videoUrl = `http://${wowzaHost}:1935/samhost/${stream}/playlist.m3u8`;
      title = `Stream: ${stream}`;
      isLive = true;
    } else if (playlist) {
      // Playlist específica
      try {
        const [playlistRows] = await db.execute(
          'SELECT nome FROM playlists WHERE id = ?',
          [playlist]
        );
        
        if (playlistRows.length > 0) {
          title = `Playlist: ${playlistRows[0].nome}`;
          // Para playlist, usar o primeiro vídeo
          const [videoRows] = await db.execute(
            'SELECT v.url, v.nome, v.caminho FROM videos v WHERE v.playlist_id = ? ORDER BY v.id LIMIT 1',
            [playlist]
          );
          
          if (videoRows.length > 0) {
            const video = videoRows[0];
            let videoPath = video.url || video.caminho;
            
            // Construir URL HLS do Wowza
            if (videoPath && !videoPath.startsWith('http')) {
              const cleanPath = videoPath.replace(/^\/?(home\/streaming\/|content\/|streaming\/)?/, '');
              const pathParts = cleanPath.split('/');
              
              if (pathParts.length >= 3) {
                const userPath = pathParts[0];
                const folderName = pathParts[1];
                const fileName = pathParts[2];
                const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');
                
                const isProduction = process.env.NODE_ENV === 'production';
                const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
                videoUrl = `http://${wowzaHost}:1935/vod/_definst_/mp4:${userPath}/${folderName}/${finalFileName}/playlist.m3u8`;
              } else {
                videoUrl = `/content/${videoPath}`;
              }
            } else {
              videoUrl = videoPath;
            }
            
            title = videoRows[0].nome;
          }
        }
      } catch (error) {
        console.error('Erro ao carregar playlist:', error);
      }
    } else if (video) {
      // Vídeo específico
      try {
        const [videoRows] = await db.execute(
          'SELECT url, nome, caminho FROM videos WHERE id = ?',
          [video]
        );
        
        if (videoRows.length > 0) {
          const videoData = videoRows[0];
          let videoPath = videoData.url || videoData.caminho;
          
          // Construir URL HLS do Wowza
          if (videoPath && !videoPath.startsWith('http')) {
            const cleanPath = videoPath.replace(/^\/?(home\/streaming\/|content\/|streaming\/)?/, '');
            const pathParts = cleanPath.split('/');
            
            if (pathParts.length >= 3) {
              const userPath = pathParts[0];
              const folderName = pathParts[1];
              const fileName = pathParts[2];
              const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');
              
              const isProduction = process.env.NODE_ENV === 'production';
              const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
              videoUrl = `http://${wowzaHost}:1935/vod/_definst_/mp4:${userPath}/${folderName}/${finalFileName}/playlist.m3u8`;
            } else {
              videoUrl = `/content/${videoPath}`;
            }
          } else {
            videoUrl = videoPath;
          }
          
          title = videoRows[0].nome;
        }
      } catch (error) {
        console.error('Erro ao carregar vídeo:', error);
      }
    } else if (userLogin && userLogin !== 'usuario') {
      // Stream padrão do usuário
      const isProduction = process.env.NODE_ENV === 'production';
      const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
      videoUrl = `http://${wowzaHost}:1935/samhost/${userLogin}_live/playlist.m3u8`;
      title = `Stream: ${userLogin}`;
      isLive = true;
    }

    // Gerar HTML do player
    const playerHTML = generatePlayerHTML({
      videoUrl,
      title,
      isLive,
      aspectRatio: aspectratio,
      autoplay: autoplay === 'true',
      muted: muted === 'true',
      loop: loop === 'true',
      showCounter: contador === 'true',
      showSharing: compartilhamento === 'true',
      playerType: parseInt(player_type) || 1,
      userLogin
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(playerHTML);
    
  } catch (error) {
    console.error('Erro no player iframe:', error);
    res.status(500).send(generateErrorHTML('Erro no Player', 'Não foi possível carregar o conteúdo solicitado.'));
  }
});

// Função para gerar HTML do player baseado no video.php
function generatePlayerHTML(options) {
  const {
    videoUrl,
    title,
    isLive,
    aspectRatio = '16:9',
    autoplay = false,
    muted = false,
    loop = false,
    showCounter = false,
    showSharing = false,
    playerType = 1,
    userLogin = 'usuario'
  } = options;

  const autoplayAttr = autoplay ? 'autoplay' : '';
  const mutedAttr = muted ? 'muted' : '';
  const loopAttr = loop ? 'loop' : '';

  // Player Video.js (tipo 1) - baseado no video.php
  if (playerType === 1) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <title>Player</title>
  <meta name="apple-touch-fullscreen" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <link href="//vjs.zencdn.net/7.8.4/video-js.css" rel="stylesheet">
  <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
  <style>
    *{margin:0}
    body,html{height:100%}
    .video-js{height:100%!important}
    .icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}
    .video-js .vjs-time-control{display:${isLive ? 'none' : 'block'}}
    .video-js .vjs-progress-control{display:${isLive ? 'none' : 'block'}}
    .video-js .vjs-big-play-button{top:50%;left:50%;margin-left:-1.5em;margin-top:-1em;background-color:rgba(14,34,61,.7);font-size:3.5em;border-radius:12%;height:1.4em!important;line-height:1.4em!important;margin-top:-.7em!important;z-index: 999999999;}
    .video-js .vjs-control-bar{background-color:#0e223d!important;color:#fff;font-size:14px;z-index: 999999999;}
    .vjs-watermark{position:absolute;display:inline;z-index:2000;bottom: 0px;}
    .vjs-watermark img{width: 50%; height: auto;}
    ${showSharing ? generateSharingCSS() : ''}
  </style>
</head>
<body>
  ${showCounter ? `<div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online">0</span></strong></div>` : ''}
  ${showSharing ? generateSharingHTML() : ''}
  
  <video id="player_webtv" crossorigin="anonymous" class="video-js vjs-fluid vjs-default-skin" 
         ${autoplayAttr} ${mutedAttr} ${loopAttr} controls preload="none" 
         width="100%" height="100%" 
         data-setup='{ "fluid":true,"aspectRatio":"${aspectRatio}" }'>
    <source src="${videoUrl}" type="application/x-mpegURL">
  </video>
  
  <script src="//vjs.zencdn.net/7.8.4/video.js"></script>
  <script src="//cdnjs.cloudflare.com/ajax/libs/videojs-contrib-hls/5.12.0/videojs-contrib-hls.min.js"></script>
  <script src="//cdnjs.cloudflare.com/ajax/libs/videojs-contrib-quality-levels/2.0.9/videojs-contrib-quality-levels.min.js"></script>
  <script src="//www.unpkg.com/videojs-hls-quality-selector@1.0.5/dist/videojs-hls-quality-selector.min.js"></script>
  
  <script>
    var myPlayer = videojs('player_webtv', {
      html5: {
        hls: {
          overrideNative: true
        }
      }
    }, function() {
      var player = this;
      player.hlsQualitySelector({ 
        displayCurrentQuality: true
      });
      
      player.on("pause", function() {
        player.one("play", function() {
          player.load();
          player.play();
        });
      });
    });
    
    ${showCounter ? generateCounterScript(userLogin) : ''}
    ${showSharing ? generateSharingScript() : ''}
  </script>
</body>
</html>`;
  }
  
  // Player HTML5 simples (fallback)
  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #000; overflow: hidden; }
    video { width: 100%; height: 100vh; object-fit: contain; }
    .counter { position: absolute; top: 10px; left: 10px; background: rgba(255,0,0,0.8); color: white; padding: 5px 10px; border-radius: 3px; font-size: 14px; z-index: 1000; }
  </style>
</head>
<body>
  ${showCounter ? `<div class="counter"><i class="fa fa-eye"></i> <span id="viewer-count">0</span></div>` : ''}
  <video controls ${autoplayAttr} ${mutedAttr} ${loopAttr} crossorigin="anonymous">
    <source src="${videoUrl}" type="application/vnd.apple.mpegurl">
    <source src="${videoUrl}" type="video/mp4">
  </video>
  
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <script>
    const video = document.querySelector('video');
    if (Hls.isSupported() && '${videoUrl}'.includes('.m3u8')) {
      const hls = new Hls();
      hls.loadSource('${videoUrl}');
      hls.attachMedia(video);
    }
    
    ${showCounter ? `
    function updateCounter() {
      const count = Math.floor(Math.random() * 50) + 5;
      const counter = document.getElementById('viewer-count');
      if (counter) counter.textContent = count;
    }
    updateCounter();
    setInterval(updateCounter, 30000);
    ` : ''}
  </script>
</body>
</html>`;
}

// Função para gerar CSS do compartilhamento
function generateSharingCSS() {
  return `
    .circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50px;overflow:hidden}
    .circle-nav-wrapper .circle-nav-toggle{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;right:10px;top:10px;cursor:pointer}
    .circle-nav-wrapper .circle-nav-toggle i{color:#FFFFFF}
    .circle-nav-wrapper .circle-nav-panel{background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;transition:width .2s,height .2s;margin-left:261px}
    .circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7}
    .circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}
    .circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:flex;align-items:center;justify-content:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:all .3s}
    .circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;cursor:pointer}
    .circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em}
    .circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em}
  `;
}
// Função para gerar HTML do compartilhamento
function generateSharingHTML() {
  return `
    <nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado">
      <div class="circle-nav-toggle"><i class="fa fa-plus"></i></div>
      <div class="circle-nav-panel"></div>
      <ul class="circle-nav-menu">
        <a href="#" onclick="shareToFacebook()" target="_blank">
          <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li>
        </a>
        <a href="#" onclick="shareToTwitter()" target="_blank">
          <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li>
        </a>
        <a href="#" onclick="shareToWhatsApp()" target="_blank">
          <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-whatsapp fa-2x"></i></li>
        </a>
      </ul>
    </nav>
  `;
}

// Função para gerar script do contador
function generateCounterScript(userLogin) {
  return `
    function contador() {
      // Simular contador para demonstração
      const count = Math.floor(Math.random() * 50) + 5;
      const counter = document.getElementById('contador_online');
      if (counter) counter.textContent = count;
    }
    contador();
    setInterval(contador, 30000);
  `;
}

// Função para gerar script do compartilhamento
function generateSharingScript() {
  return `
    function shareToFacebook() {
      const url = encodeURIComponent(window.location.href);
      window.open('https://facebook.com/sharer/sharer.php?u=' + url, '_blank');
    }
    
    function shareToTwitter() {
      const url = encodeURIComponent(window.location.href);
      window.open('https://twitter.com/share?url=' + url, '_blank');
    }
    
    function shareToWhatsApp() {
      const url = encodeURIComponent(window.location.href);
      window.open('whatsapp://send?text=WebTV ' + url, '_blank');
    }
    
    $(".circle-nav-toggle").on("click", function() {
      const wrapper = $("#circle-nav-wrapper");
      const status = wrapper.data("status-botao");
      
      if (status === "fechado") {
        wrapper.css({"width": "250px", "height": "250px"});
        $(".circle-nav-menu").addClass("circle-nav-open");
        $(".circle-nav-panel").addClass("circle-nav-open");
        wrapper.data("status-botao", "aberto");
      } else {
        wrapper.css({"width": "50px", "height": "50px"});
        $(".circle-nav-menu").removeClass("circle-nav-open");
        $(".circle-nav-panel").removeClass("circle-nav-open");
        wrapper.data("status-botao", "fechado");
      }
    });
  `;
}

// Função para gerar HTML de erro
function generateErrorHTML(title, message) {
  return `
<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body style="background:#000;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Arial">
  <div style="text-align:center">
    <h2>${title}</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

// GET /api/players/social - Player para redes sociais
router.get('/social', async (req, res) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      return res.status(400).send('Stream parameter required');
    }
    
    const videoUrl = `http://samhost.wcore.com.br:1935/samhost/${stream}/playlist.m3u8`;
    
    const socialHTML = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stream: ${stream}</title>
    <meta property="og:title" content="Stream ao vivo: ${stream}">
    <meta property="og:description" content="Assista ao stream ao vivo">
    <meta property="og:type" content="video.other">
    <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
    <meta property="og:video" content="${videoUrl}">
    <meta property="og:video:type" content="application/vnd.apple.mpegurl">
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        body { margin: 0; background: #000; }
        .container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; height: 100%; object-fit: contain; }
    </style>
</head>
<body>
    <div class="container">
        <video id="video" controls autoplay muted playsinline>
            <source src="${videoUrl}" type="application/vnd.apple.mpegurl">
        </video>
    </div>
    <script>
        const video = document.getElementById('video');
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource('${videoUrl}');
            hls.attachMedia(video);
        }
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(socialHTML);
    
  } catch (error) {
    console.error('Erro no player social:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

module.exports = router;