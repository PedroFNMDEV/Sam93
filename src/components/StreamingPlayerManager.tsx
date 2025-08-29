import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdvancedVideoPlayer from './AdvancedVideoPlayer';
import PlayerSelector from './PlayerSelector';
import { Play, Settings, Eye, Share2, Download, Zap, Monitor, Activity } from 'lucide-react';

interface StreamingPlayerManagerProps {
  videoUrl?: string;
  isLive?: boolean;
  title?: string;
  className?: string;
  showPlayerSelector?: boolean;
  enableSocialSharing?: boolean;
  enableViewerCounter?: boolean;
  enableWatermark?: boolean;
  streamStats?: {
    viewers?: number;
    bitrate?: number;
    uptime?: string;
    quality?: string;
    isRecording?: boolean;
  };
}

const StreamingPlayerManager: React.FC<StreamingPlayerManagerProps> = ({
  videoUrl,
  isLive = false,
  title,
  className = '',
  showPlayerSelector = true,
  enableSocialSharing = true,
  enableViewerCounter = true,
  enableWatermark = true,
  streamStats
}) => {
  const { user, getToken } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState('html5');
  const [playerConfig, setPlayerConfig] = useState({
    autoplay: false,
    muted: false,
    loop: false,
    aspectRatio: '16:9' as '16:9' | '4:3' | '1:1' | 'auto'
  });
  const [watermarkConfig, setWatermarkConfig] = useState({
    enabled: enableWatermark,
    url: '',
    position: 'bottom-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
    opacity: 50,
    size: 'medium' as 'small' | 'medium' | 'large',
    clickable: false,
    link: ''
  });
  const [socialConfig, setSocialConfig] = useState({
    enabled: enableSocialSharing,
    platforms: ['facebook', 'twitter', 'whatsapp'] as Array<'facebook' | 'twitter' | 'pinterest' | 'telegram' | 'whatsapp'>,
    shareUrl: window.location.href
  });
  const [viewerConfig, setViewerConfig] = useState({
    enabled: enableViewerCounter,
    endpoint: `/api/espectadores/tempo-real`,
    interval: 30000
  });
  const [qualityLevels, setQualityLevels] = useState<Array<{
    label: string;
    src: string;
    bitrate: number;
    resolution: string;
  }>>([]);
  const [logos, setLogos] = useState<Array<{
    id: number;
    nome: string;
    url: string;
  }>>([]);

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);

  useEffect(() => {
    loadLogos();
    loadQualityLevels();
  }, []);

  const loadLogos = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/logos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setLogos(data);

      // Configurar watermark padrão se houver logos
      if (data.length > 0 && enableWatermark) {
        setWatermarkConfig(prev => ({
          ...prev,
          url: data[0].url,
          enabled: true
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar logos:', error);
    }
  };

  const loadQualityLevels = async () => {
    // Simular níveis de qualidade baseados no limite do usuário
    const userBitrateLimit = user?.bitrate || 2500;
    
    const levels = [
      { label: 'Auto', src: videoUrl || '', bitrate: 0, resolution: 'Auto' }
    ];

    if (userBitrateLimit >= 800) {
      levels.push({ label: '480p', src: videoUrl || '', bitrate: 800, resolution: '854x480' });
    }
    if (userBitrateLimit >= 1500) {
      levels.push({ label: '720p', src: videoUrl || '', bitrate: 1500, resolution: '1280x720' });
    }
    if (userBitrateLimit >= 2500) {
      levels.push({ label: '1080p', src: videoUrl || '', bitrate: 2500, resolution: '1920x1080' });
    }
    if (userBitrateLimit >= 4000) {
      levels.push({ label: '1080p+', src: videoUrl || '', bitrate: 4000, resolution: '1920x1080' });
    }

    setQualityLevels(levels);
  };
  

  const generatePlayerCode = () => {
    const baseUrl = window.location.origin;
    const streamUrl = videoUrl || `${baseUrl}/api/players/iframe?stream=${userLogin}_live`;
    
    switch (selectedPlayer) {
      case 'html5':
        return `<!-- Player HTML5 Avançado -->
<video 
  width="640" 
  height="360" 
  controls 
  ${playerConfig.autoplay ? 'autoplay' : ''}
  ${playerConfig.muted ? 'muted' : ''}
  ${playerConfig.loop ? 'loop' : ''}
  crossorigin="anonymous"
  preload="metadata"
>
  <source src="${streamUrl}" type="application/vnd.apple.mpegurl">
  <source src="${streamUrl}" type="video/mp4">
  Seu navegador não suporta vídeo HTML5.
</video>`;

      case 'videojs':
        return `<!-- Video.js Player -->
<link href="//vjs.zencdn.net/7.8.4/video-js.css" rel="stylesheet">
<video 
  id="videojs-player" 
  class="video-js vjs-default-skin" 
  controls 
  preload="auto" 
  width="640" 
  height="360"
  data-setup='{"fluid": true, "aspectRatio": "${playerConfig.aspectRatio}"}'
>
  <source src="${streamUrl}" type="application/x-mpegURL">
</video>
<script src="//vjs.zencdn.net/7.8.4/video.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/videojs-contrib-hls/5.12.0/videojs-contrib-hls.min.js"></script>
<script>
  var player = videojs('videojs-player', {
    html5: { hls: { overrideNative: true } }
  });
</script>`;

      case 'iframe':
        return `<!-- Player iFrame -->
<iframe 
  src="${baseUrl}/api/players/iframe?stream=${userLogin}_live" 
  width="640" 
  height="360" 
  frameborder="0" 
  allowfullscreen
  allow="autoplay; fullscreen">
</iframe>`;

      default:
        return `<!-- Player Personalizado -->
<div id="custom-player" style="width: 640px; height: 360px;">
  <!-- Implementação personalizada aqui -->
</div>`;
    }
  };

  const copyPlayerCode = () => {
    const code = generatePlayerCode();
    navigator.clipboard.writeText(code);
  };

  return (
    <div className={`streaming-player-manager space-y-6 ${className}`}>
      {/* Seletor de Player */}
      {showPlayerSelector && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <PlayerSelector
            selectedPlayer={selectedPlayer}
            onPlayerChange={setSelectedPlayer}
          />
        </div>
      )}

      {/* Configurações do Player */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Configurações do Player</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proporção
            </label>
            <select
              value={playerConfig.aspectRatio}
              onChange={(e) => setPlayerConfig(prev => ({ 
                ...prev, 
                aspectRatio: e.target.value as any 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Clássico)</option>
              <option value="1:1">1:1 (Quadrado)</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          <div className="flex flex-col space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={playerConfig.autoplay}
                onChange={(e) => setPlayerConfig(prev => ({ 
                  ...prev, 
                  autoplay: e.target.checked 
                }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Reprodução automática</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={playerConfig.muted}
                onChange={(e) => setPlayerConfig(prev => ({ 
                  ...prev, 
                  muted: e.target.checked 
                }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Iniciar sem som</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={playerConfig.loop}
                onChange={(e) => setPlayerConfig(prev => ({ 
                  ...prev, 
                  loop: e.target.checked 
                }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Repetir vídeo</span>
            </label>
          </div>

          {/* Configurações de Watermark */}
          {enableWatermark && (
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={watermarkConfig.enabled}
                  onChange={(e) => setWatermarkConfig(prev => ({ 
                    ...prev, 
                    enabled: e.target.checked 
                  }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Marca d'água</span>
              </label>

              {watermarkConfig.enabled && (
                <div className="space-y-2">
                  <select
                    value={watermarkConfig.url}
                    onChange={(e) => setWatermarkConfig(prev => ({ 
                      ...prev, 
                      url: e.target.value 
                    }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">Selecionar logo</option>
                    {logos.map((logo) => (
                      <option key={logo.id} value={logo.url}>
                        {logo.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    value={watermarkConfig.position}
                    onChange={(e) => setWatermarkConfig(prev => ({ 
                      ...prev, 
                      position: e.target.value as any 
                    }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="top-left">Superior Esquerda</option>
                    <option value="top-right">Superior Direita</option>
                    <option value="bottom-left">Inferior Esquerda</option>
                    <option value="bottom-right">Inferior Direita</option>
                    <option value="center">Centro</option>
                  </select>

                  <div>
                    <label className="text-xs text-gray-600">
                      Opacidade: {watermarkConfig.opacity}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={watermarkConfig.opacity}
                      onChange={(e) => setWatermarkConfig(prev => ({ 
                        ...prev, 
                        opacity: parseInt(e.target.value) 
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configurações Sociais */}
          {enableSocialSharing && (
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={socialConfig.enabled}
                  onChange={(e) => setSocialConfig(prev => ({ 
                    ...prev, 
                    enabled: e.target.checked 
                  }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Compartilhamento social</span>
              </label>

              {socialConfig.enabled && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">Plataformas:</div>
                  {['facebook', 'twitter', 'whatsapp', 'telegram', 'pinterest'].map((platform) => (
                    <label key={platform} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={socialConfig.platforms.includes(platform as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSocialConfig(prev => ({
                              ...prev,
                              platforms: [...prev.platforms, platform as any]
                            }));
                          } else {
                            setSocialConfig(prev => ({
                              ...prev,
                              platforms: prev.platforms.filter(p => p !== platform)
                            }));
                          }
                        }}
                        className="h-3 w-3 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700 capitalize">{platform}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Player Principal */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Player de Vídeo</h3>
          <div className="flex items-center space-x-2">
            {streamStats && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{streamStats.viewers || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>{streamStats.bitrate || 0} kbps</span>
                </div>
                {streamStats.uptime && (
                  <div className="flex items-center space-x-1">
                    <Activity className="h-4 w-4" />
                    <span>{streamStats.uptime}</span>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={copyPlayerCode}
              className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              Copiar Código
            </button>
          </div>
        </div>

        <div className="relative">
          <AdvancedVideoPlayer
            src={videoUrl}
            title={title}
            isLive={isLive}
            autoplay={playerConfig.autoplay}
            muted={playerConfig.muted}
            loop={playerConfig.loop}
            aspectRatio={playerConfig.aspectRatio}
            playerType={selectedPlayer as "videojs" | "clappr" | "jwplayer" | "fluidplayer" | "dplayer" | "html5"}
            streamStats={streamStats}
            watermark={watermarkConfig.enabled && watermarkConfig.url ? watermarkConfig : undefined}
            qualityLevels={qualityLevels.length > 1 ? qualityLevels : undefined}
            socialSharing={socialConfig.enabled ? socialConfig : undefined}
            viewerCounter={viewerConfig.enabled ? viewerConfig : undefined}
            className="w-full h-96"
            onQualityChange={(quality) => {
              console.log(`Qualidade alterada para: ${quality}`);
            }}
            onFullscreenChange={(isFS) => {
              console.log(`Fullscreen: ${isFS}`);
            }}
          />
        </div>
      </div>

      {/* Código de Incorporação */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Código de Incorporação</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Código {selectedPlayer.toUpperCase()}
              </span>
              <button
                onClick={copyPlayerCode}
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                Copiar
              </button>
            </div>
            <pre className="bg-gray-50 p-3 rounded-md text-sm overflow-x-auto">
              <code>{generatePlayerCode()}</code>
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">URLs de Streaming:</span>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>• <strong>HLS:</strong> {`${window.location.origin}/api/players/iframe?stream=${userLogin}_live`}</li>
                <li>• <strong>RTMP:</strong> {`rtmp://samhost.wcore.com.br:1935/samhost/${userLogin}_live`}</li>
              </ul>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Configurações Ativas:</span>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>• <strong>Player:</strong> {selectedPlayer}</li>
                <li>• <strong>Proporção:</strong> {playerConfig.aspectRatio}</li>
                <li>• <strong>Autoplay:</strong> {playerConfig.autoplay ? 'Sim' : 'Não'}</li>
                <li>• <strong>Watermark:</strong> {watermarkConfig.enabled ? 'Sim' : 'Não'}</li>
                <li>• <strong>Social:</strong> {socialConfig.enabled ? 'Sim' : 'Não'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Informações Técnicas */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-blue-900 font-medium mb-3">📋 Informações Técnicas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800 text-sm">
          <div>
            <h4 className="font-medium mb-2">Recursos Ativos:</h4>
            <ul className="space-y-1">
              <li>• <strong>Range Requests:</strong> Suporte completo para streaming</li>
              <li>• <strong>HLS Streaming:</strong> Compatibilidade com todos os dispositivos</li>
              <li>• <strong>Conversão Automática:</strong> MP4 otimizado</li>
              <li>• <strong>Watermark Dinâmica:</strong> Logos personalizadas</li>
              <li>• <strong>Qualidade Adaptativa:</strong> Baseada no plano do usuário</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Compatibilidade:</h4>
            <ul className="space-y-1">
              <li>• <strong>Desktop:</strong> Chrome, Firefox, Safari, Edge</li>
              <li>• <strong>Mobile:</strong> iOS Safari, Android Chrome</li>
              <li>• <strong>Smart TV:</strong> WebOS, Tizen, Android TV</li>
              <li>• <strong>Streaming:</strong> OBS, Streamlabs, FFmpeg</li>
              <li>• <strong>Formatos:</strong> MP4, HLS, DASH</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded-md">
          <p className="text-blue-900 text-sm">
            <strong>🚀 Sistema Otimizado:</strong> O player utiliza streaming adaptativo com suporte a Range requests, 
            garantindo reprodução suave mesmo para arquivos grandes. A conversão automática para MP4 garante 
            compatibilidade máxima com todos os dispositivos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StreamingPlayerManager;