import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Copy, Eye, Settings, Monitor, Smartphone, Globe, Code, ExternalLink, X, Maximize, Minimize, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import AdvancedVideoPlayer from '../../components/AdvancedVideoPlayer';
import StreamingPlayerManager from '../../components/StreamingPlayerManager';

interface PlayerConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  type: 'universal' | 'iframe' | 'html5' | 'mobile' | 'facebook' | 'android';
  features: string[];
  code: string;
  previewUrl: string;
  isActive: boolean;
}

interface Video {
  id: number;
  nome: string;
  url: string;
  duracao?: number;
}

const Players: React.FC = () => {
  const { user, getToken } = useAuth();
  const [activePlayer, setActivePlayer] = useState<string>('universal');
  const [showPreview, setShowPreview] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sampleVideos, setSampleVideos] = useState<Video[]>([]);
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [obsStreamActive, setObsStreamActive] = useState(false);

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);
  const liveStreamUrl = `http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8`;

  useEffect(() => {
    loadSampleVideos();
    checkLiveStreams();
    
    // Verificar streams a cada 30 segundos
    const interval = setInterval(checkLiveStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkLiveStreams = async () => {
    try {
      const token = await getToken();
      
      // Verificar stream OBS
      const obsResponse = await fetch('/api/streaming/obs-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (obsResponse.ok) {
        const obsData = await obsResponse.json();
        setObsStreamActive(obsData.success && obsData.obs_stream?.is_live);
      }
      
      // Verificar transmissão de playlist
      const streamResponse = await fetch('/api/streaming/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        setLiveStreamActive(streamData.success && streamData.is_live && streamData.stream_type === 'playlist');
      }
    } catch (error) {
      console.error('Erro ao verificar streams:', error);
    }
  };

  const loadSampleVideos = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const folders = await response.json();
      
      if (folders.length > 0) {
        const videosResponse = await fetch(`/api/videos?folder_id=${folders[0].id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const videos = await videosResponse.json();
        setSampleVideos(Array.isArray(videos) ? videos.slice(0, 3) : []);
      }
    } catch (error) {
      console.error('Erro ao carregar vídeos de exemplo:', error);
    }
  };

  const getActiveStreamUrl = () => {
    if (obsStreamActive) {
      return `http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8`;
    } else if (liveStreamActive) {
      return `http://samhost.wcore.com.br:1935/samhost/${userLogin}_playlist/playlist.m3u8`;
    } else if (sampleVideos.length > 0) {
      return getVideoUrl(sampleVideos[0].url);
    }
    return liveStreamUrl;
  };

  const getActiveStreamName = () => {
    if (obsStreamActive) {
      return `${userLogin}_live`;
    } else if (liveStreamActive) {
      return `${userLogin}_playlist`;
    }
    return `${userLogin}_live`;
  };

  const getVideoUrl = (url: string) => {
    if (!url) return '';
    
    const userLogin = user?.email?.split('@')[0] || 'usuario';
    
    // Se já é uma URL completa, usar como está
    if (url.startsWith('http')) {
      return url;
    }
    
    // Para URLs do sistema, construir URL do player iframe
    const pathParts = url.split('/');
    if (pathParts.length >= 3) {
      const userPath = pathParts[0];
      const folderName = pathParts[1];
      const fileName = pathParts[2];
      
      // Usar player iframe para melhor compatibilidade
      return `/api/players/iframe?login=${userPath}&vod=${folderName}/${fileName}&aspectratio=16:9&player_type=1&autoplay=false`;
    }
    
    // Fallback para URL direta
    const fileName = url.split('/').pop() || 'video.mp4';
    const folderName = 'default';
    
    return `/api/players/iframe?login=${userLogin}&vod=${folderName}/${fileName}&aspectratio=16:9&player_type=1&autoplay=false`;
  };

  const playerConfigs: PlayerConfig[] = [
    {
      id: 'universal',
      name: 'Player Universal',
      description: 'Player completo com suporte a HLS, MP4 e controles avançados',
      icon: Monitor,
      type: 'universal',
      features: ['HLS/M3U8', 'MP4/AVI/MOV', 'Controles Customizados', 'Fullscreen', 'Estatísticas'],
      code: `<div id="universal-player"></div>
<script>
  // Player Universal - Suporte completo
  const player = new UniversalPlayer({
    container: '#universal-player',
    src: '${getActiveStreamUrl()}',
    autoplay: true,
    controls: true,
    responsive: true
  });
</script>`,
      previewUrl: getActiveStreamUrl(),
      isActive: true
    },
    {
      id: 'iframe',
      name: 'Player iFrame',
      description: 'Incorporação simples via iFrame para sites externos',
      icon: Globe,
      type: 'iframe',
      features: ['Fácil Incorporação', 'Responsivo', 'Seguro', 'Cross-domain'],
      code: `<iframe 
 src="/api/players/iframe?stream=${getActiveStreamName()}" 
  width="640" 
  height="360" 
  frameborder="0" 
  allowfullscreen>
</iframe>`,
      previewUrl: `/api/players/iframe?stream=${getActiveStreamName()}`,
      isActive: false
    },
    {
      id: 'html5',
      name: 'Player HTML5',
      description: 'Player nativo HTML5 para máxima compatibilidade',
      icon: Code,
      type: 'html5',
      features: ['HTML5 Nativo', 'Leve', 'Compatível', 'Sem Dependências'],
      code: `<video 
  width="640" 
  height="360" 
  controls 
  autoplay 
  muted>
  <source src="${getActiveStreamUrl()}" type="application/vnd.apple.mpegurl">
  Seu navegador não suporta vídeo HTML5.
</video>`,
      previewUrl: getActiveStreamUrl(),
      isActive: false
    },
    {
      id: 'mobile',
      name: 'Player Mobile',
      description: 'Otimizado para dispositivos móveis e touch',
      icon: Smartphone,
      type: 'mobile',
      features: ['Touch Friendly', 'Responsivo', 'Baixo Consumo', 'Gestos'],
      code: `<div id="mobile-player" class="mobile-player">
  <video 
    playsinline 
    webkit-playsinline 
    controls 
    width="100%" 
    height="auto">
    <source src="${getActiveStreamUrl()}" type="application/vnd.apple.mpegurl">
  </video>
</div>
<style>
.mobile-player { 
  max-width: 100%; 
  touch-action: manipulation; 
}
</style>`,
      previewUrl: getActiveStreamUrl(),
      isActive: false
    },
    {
      id: 'facebook',
      name: 'Player Facebook',
      description: 'Compatível com Facebook Live e redes sociais',
      icon: Globe,
      type: 'facebook',
      features: ['Facebook Live', 'Social Media', 'Compartilhamento', 'Embeds'],
      code: `<div class="fb-video" 
     data-href="/api/players/social?stream=${getActiveStreamName()}" 
     data-width="640" 
     data-show-text="false">
</div>
<script async defer crossorigin="anonymous" 
        src="https://connect.facebook.net/pt_BR/sdk.js#xfbml=1&version=v18.0">
</script>`,
      previewUrl: `/api/players/social?stream=${getActiveStreamName()}`,
      isActive: false
    },
    {
      id: 'android',
      name: 'Player Android',
      description: 'Otimizado para aplicativos Android nativos',
      icon: Smartphone,
      type: 'android',
      features: ['ExoPlayer', 'Android Nativo', 'Hardware Accel', 'Background Play'],
      code: `// Android ExoPlayer
SimpleExoPlayer player = new SimpleExoPlayer.Builder(context).build();
playerView.setPlayer(player);

MediaItem mediaItem = MediaItem.fromUri("${getActiveStreamUrl()}");
player.setMediaItem(mediaItem);
player.prepare();
player.play();`,
      previewUrl: getActiveStreamUrl(),
      isActive: false
    }
  ];

  // Função para abrir vídeo em nova aba
  const openVideoInNewTab = (videoUrl: string, useDirectWowza = true) => {
    const isProduction = window.location.hostname !== 'localhost';
    const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
    const wowzaUser = 'admin';
    const wowzaPassword = 'FK38Ca2SuE6jvJXed97VMn';
    
    if (useDirectWowza) {
      // Usar URL direta do Wowza com autenticação para melhor performance
      let externalUrl = videoUrl;
      if (videoUrl.startsWith('/content')) {
        externalUrl = `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:6980${videoUrl}`;
      } else if (!videoUrl.startsWith('http')) {
        externalUrl = `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:6980/content/${videoUrl}`;
      }
      window.open(externalUrl, '_blank');
    } else {
      // Fallback para proxy do backend
      window.open(videoUrl, '_blank');
    }
  };
  const activatePlayer = (playerId: string) => {
    setActivePlayer(playerId);
    toast.success(`Player ${playerConfigs.find(p => p.id === playerId)?.name} ativado!`);
  };

  const copyCode = (code: string, playerName: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código do ${playerName} copiado!`);
  };

  const openPreview = (video?: Video) => {
    if (video) {
      setPreviewVideo(video);
    } else {
      setPreviewVideo({
        id: 0,
        nome: 'Stream ao Vivo',
        url: liveStreamUrl
      });
    }
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewVideo(null);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderPlayerPreview = (config: PlayerConfig) => {
    const isActive = config.id === activePlayer;
    
    if (!isActive) {
      return (
        <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <config.icon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Clique em "Ativar" para usar este player</p>
          </div>
        </div>
      );
    }

    switch (config.type) {
      case 'universal':
        return (
          <div className="h-48 bg-black rounded-lg overflow-hidden">
            <AdvancedVideoPlayer
              src={sampleVideos[0]?.url || liveStreamUrl}
              title={sampleVideos[0]?.nome || 'Stream ao Vivo'}
              isLive={!sampleVideos[0]}
              autoplay={false}
              controls={true}
              className="w-full h-full"
              streamStats={{
                viewers: 15,
                bitrate: 2500,
                uptime: '01:23:45',
                quality: '1080p'
              }}
              enableSocialSharing={true}
              enableViewerCounter={true}
            />
          </div>
        );

      case 'iframe':
        return (
          <div className="h-48 bg-gray-900 rounded-lg overflow-hidden">
            <iframe
              src={`/api/players/iframe?stream=${userLogin}_live`}
              className="w-full h-full border-0"
              title="iFrame Player Preview"
            />
          </div>
        );

      case 'html5':
        return (
          <div className="h-48 bg-black rounded-lg overflow-hidden">
            <video
              className="w-full h-full object-contain"
              controls
              muted
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23000'/%3E%3Ctext x='320' y='180' text-anchor='middle' fill='white' font-family='Arial' font-size='24'%3EHTML5 Player%3C/text%3E%3C/svg%3E"
            >
              <source src={sampleVideos[0]?.url || liveStreamUrl} type="application/vnd.apple.mpegurl" />
              <source src={sampleVideos[0]?.url || liveStreamUrl} type="video/mp4" />
            </video>
          </div>
        );

      case 'mobile':
        return (
          <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <Smartphone className="h-12 w-12 mx-auto mb-3" />
              <div className="text-lg font-semibold">Player Mobile Ativo</div>
              <div className="text-sm opacity-80">Otimizado para touch</div>
              <div className="mt-3 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        );

      case 'facebook':
        return (
          <div className="h-48 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <Globe className="h-12 w-12 mx-auto mb-3" />
              <div className="text-lg font-semibold">Player Facebook Ativo</div>
              <div className="text-sm opacity-80">Compatível com redes sociais</div>
              <div className="mt-3 px-4 py-2 bg-white bg-opacity-20 rounded-full text-xs">
                Social Media Ready
              </div>
            </div>
          </div>
        );

      case 'android':
        return (
          <div className="h-48 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <Smartphone className="h-12 w-12 mx-auto mb-3" />
              <div className="text-lg font-semibold">Player Android Ativo</div>
              <div className="text-sm opacity-80">ExoPlayer integrado</div>
              <div className="mt-3 px-4 py-2 bg-white bg-opacity-20 rounded-full text-xs">
                Hardware Accelerated
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <config.icon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Player em desenvolvimento</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <Play className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Players de Vídeo</h1>
      </div>

      {/* Player Ativo */}
      <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Player Ativo</h2>
          <div className="flex items-center space-x-3">
            {(obsStreamActive || liveStreamActive) && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-600">
                  {obsStreamActive ? 'OBS AO VIVO' : 'PLAYLIST AO VIVO'}
                </span>
              </div>
            )}
            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              {playerConfigs.find(p => p.id === activePlayer)?.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {renderPlayerPreview(playerConfigs.find(p => p.id === activePlayer)!)}
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Recursos Ativos</h3>
              <div className="flex flex-wrap gap-2">
                {playerConfigs.find(p => p.id === activePlayer)?.features.map((feature, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => openPreview()}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center justify-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                {obsStreamActive ? 'Visualizar OBS ao Vivo' : 
                 liveStreamActive ? 'Visualizar Playlist ao Vivo' : 
                 'Visualizar Stream'}
              </button>

              {sampleVideos.length > 0 && (
                <button
                  onClick={() => openPreview(sampleVideos[0])}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Testar com Vídeo
                </button>
              )}
              
              <button
                onClick={() => window.open(`/api/players/iframe?stream=${userLogin}_live`, '_blank')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {obsStreamActive || liveStreamActive ? 'Abrir Stream Externo' : 'Abrir Player Externo'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Players Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playerConfigs.map((config) => (
          <div key={config.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${config.id === activePlayer ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <config.icon className={`h-6 w-6 ${config.id === activePlayer ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{config.name}</h3>
                  {config.id === activePlayer && (
                    <span className="text-xs text-green-600 font-medium">ATIVO</span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{config.description}</p>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recursos:</h4>
              <div className="flex flex-wrap gap-1">
                {config.features.map((feature, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {config.id !== activePlayer ? (
                <button
                  onClick={() => activatePlayer(config.id)}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center justify-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Ativar Player
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md flex items-center justify-center cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Player Ativo
                </button>
              )}

              <button
                onClick={() => copyCode(config.code, config.name)}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center justify-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código
              </button>
              
              {(config.id === 'iframe' || config.id === 'facebook') && (
                <button
                  onClick={() => window.open(config.previewUrl, '_blank')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Externamente
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Códigos de Incorporação */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Códigos de Incorporação</h2>
        
        <div className="space-y-6">
          {playerConfigs.map((config) => (
            <div key={config.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-800">{config.name}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyCode(config.code, config.name)}
                    className="text-primary-600 hover:text-primary-800 flex items-center"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </button>
                  {(config.id === 'iframe' || config.id === 'facebook') && (
                    <button
                      onClick={() => window.open(config.previewUrl, '_blank')}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Testar
                    </button>
                  )}
                </div>
              </div>
              
              <pre className="bg-gray-50 p-3 rounded-md text-sm overflow-x-auto">
                <code>{config.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Visualização */}
      {showPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closePreview();
            }
          }}
        >
          <div className={`bg-black rounded-lg relative ${
            isFullscreen ? 'w-screen h-screen' : 'max-w-4xl w-full h-[70vh]'
          }`}>
            {/* Controles do Modal */}
            <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="text-white bg-blue-600 hover:bg-blue-700 rounded-full p-3 transition-colors duration-200 shadow-lg"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
              
              <button
                onClick={closePreview}
                className="text-white bg-red-600 hover:bg-red-700 rounded-full p-3 transition-colors duration-200 shadow-lg"
                title="Fechar player"
              >
                <X size={20} />
              </button>
            </div>

            {/* Título do Vídeo */}
            <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
              <h3 className="font-medium">{previewVideo?.nome || 'Visualização'}</h3>
              <p className="text-xs opacity-80">Player: {playerConfigs.find(p => p.id === activePlayer)?.name}</p>
            </div>

            {/* Player */}
            <div className={`w-full h-full ${isFullscreen ? 'p-0' : 'p-4 pt-16'}`}>
              <AdvancedVideoPlayer
                src={previewVideo ? getVideoUrl(previewVideo.url) : undefined}
                title={previewVideo?.nome}
                isLive={previewVideo?.id === 0}
                autoplay={true}
                controls={true}
                className="w-full h-full"
                streamStats={previewVideo?.id === 0 ? {
                  viewers: Math.floor(Math.random() * 50) + 5,
                  bitrate: 2500,
                  uptime: '00:15:30',
                  quality: '1080p'
                } : undefined}
                onError={(error) => {
                  console.error('Erro no player:', error);
                  toast.error('Erro ao carregar vídeo');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Informações Técnicas */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-blue-900 font-medium mb-3">📋 Sistema de Streaming Avançado</h3>
        
        {/* Status das transmissões */}
        <div className="mb-4 p-3 bg-white rounded-md">
          <h4 className="font-medium mb-2">Status das Transmissões:</h4>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${obsStreamActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className={obsStreamActive ? 'text-red-600 font-medium' : 'text-gray-500'}>
                OBS {obsStreamActive ? 'AO VIVO' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${liveStreamActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className={liveStreamActive ? 'text-green-600 font-medium' : 'text-gray-500'}>
                Playlist {liveStreamActive ? 'AO VIVO' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800 text-sm">
          <div>
            <h4 className="font-medium mb-2">Recursos Avançados:</h4>
            <ul className="space-y-1">
              <li>• <strong>Range Requests:</strong> Streaming otimizado</li>
              <li>• <strong>Conversão Automática:</strong> MP4 compatível</li>
              <li>• <strong>Qualidade Adaptativa:</strong> Baseada no plano</li>
              <li>• <strong>Watermark Dinâmica:</strong> Logos personalizadas</li>
              <li>• <strong>Social Sharing:</strong> Múltiplas plataformas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">URLs de Streaming:</h4>
            <ul className="space-y-1">
              <li>• <strong>HLS:</strong> {getActiveStreamUrl()}</li>
              <li>• <strong>RTMP:</strong> rtmp://samhost.wcore.com.br:1935/samhost/{userLogin}_live</li>
              <li>• <strong>Direct:</strong> URLs diretas do Wowza</li>
              <li>• <strong>SSH Stream:</strong> Streaming via SSH otimizado</li>
            </ul>
          </div>
        </div>
        
        {(obsStreamActive || liveStreamActive) && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm font-medium">
              🎉 Transmissão ativa detectada! Os players agora mostram seu conteúdo ao vivo.
            </p>
          </div>
        )}
      </div>

      {/* Gerenciador de Streaming Avançado */}
      <StreamingPlayerManager
        videoUrl={getActiveStreamUrl()}
        isLive={obsStreamActive || liveStreamActive}
        title={obsStreamActive ? 'Transmissão OBS ao Vivo' : 
               liveStreamActive ? 'Transmissão Playlist ao Vivo' : 
               'Player de Demonstração'}
        streamStats={{
          viewers: Math.floor(Math.random() * 50) + 5,
          bitrate: 2500,
          uptime: '01:23:45',
          quality: '1080p',
          isRecording: false
        }}
        enableSocialSharing={true}
        enableViewerCounter={true}
        enableWatermark={true}
      />
    </div>
  );
};

export default Players;