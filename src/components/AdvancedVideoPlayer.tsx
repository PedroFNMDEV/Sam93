import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings,
  Download, Share2, Wifi, WifiOff, Activity, Eye, Clock,
  RotateCcw, AlertCircle, Zap, Monitor, Smartphone, Cast,
  SkipBack, SkipForward, Repeat, Shuffle, List, Info
} from 'lucide-react';

interface AdvancedVideoPlayerProps {
  src?: string;
  poster?: string;
  title?: string;
  isLive?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  className?: string;

  // Configurações avançadas
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'auto';
  playerType?: 'videojs' | 'clappr' | 'jwplayer' | 'fluidplayer' | 'dplayer' | 'html5';

  // Estatísticas de streaming
  streamStats?: {
    viewers?: number;
    bitrate?: number;
    uptime?: string;
    quality?: string;
    isRecording?: boolean;
  };

  // Configurações de marca d'água
  watermark?: {
    url: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    size?: 'small' | 'medium' | 'large';
    clickable?: boolean;
    link?: string;
  };

  // Configurações de qualidade
  qualityLevels?: Array<{
    label: string;
    src: string;
    bitrate: number;
    resolution: string;
  }>;

  // Configurações sociais
  socialSharing?: {
    enabled: boolean;
    platforms: Array<'facebook' | 'twitter' | 'pinterest' | 'telegram' | 'whatsapp'>;
    shareUrl?: string;
  };

  // Contador de espectadores
  viewerCounter?: {
    enabled: boolean;
    endpoint?: string;
    interval?: number;
  };

  // Callbacks
  onReady?: (player: HTMLVideoElement) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onQualityChange?: (quality: string) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const AdvancedVideoPlayer: React.FC<AdvancedVideoPlayerProps> = ({
  src,
  poster,
  title,
  isLive = false,
  autoplay = false,
  muted = false,
  controls = true,
  loop = false,
  className = '',
  aspectRatio = '16:9',
  playerType = 'html5',
  streamStats,
  watermark,
  qualityLevels,
  socialSharing,
  viewerCounter,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  onQualityChange,
  onFullscreenChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const socialMenuRef = useRef<HTMLDivElement>(null);

  // Estados do player
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [showStats, setShowStats] = useState(false);

  // Função para construir URL correta baseada no tipo de arquivo
  const buildVideoUrl = (src: string) => {
    if (!src) return '';

    // Se já é uma URL completa, usar como está
    if (src.startsWith('http')) {
      return src;
    }

    // Para o novo sistema, usar API para obter URL correta
    return `/api/videos/view-url?path=${encodeURIComponent(src)}`;
  };

  // Configurar fonte de vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setIsLoading(true);
    setConnectionStatus('connecting');

    // Limpar HLS anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Detectar tipo de arquivo
    const isHLS = src.includes('.m3u8') || isLive;

    if (isHLS && Hls.isSupported()) {
      // Usar HLS.js para streams
      console.log('🔄 Inicializando HLS.js para streaming');

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 10 : 30,
        maxBufferLength: isLive ? 20 : 60,
        liveSyncDurationCount: isLive ? 3 : 5,
        debug: false,
        xhrSetup: (xhr, url) => {
          xhr.withCredentials = false;
          const token = localStorage.getItem('auth_token');
          if (token && (url.includes('/content/') || url.includes('/api/'))) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.timeout = 15000;
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ Manifest HLS carregado');
        setIsLoading(false);
        setConnectionStatus('connected');

        // Configurar níveis de qualidade se disponíveis
        if (hls.levels && hls.levels.length > 1) {
          const levels = hls.levels.map((level, index) => ({
            label: `${level.height}p`,
            src: level.url,
            bitrate: level.bitrate,
            resolution: `${level.width}x${level.height}`
          }));
          // Atualizar qualityLevels se callback disponível
          if (onQualityChange) {
            console.log(`🎯 Níveis de qualidade detectados: ${levels.length}`);
          }
        }

        if (autoplay) {
          setTimeout(() => {
            video.play().catch(error => {
              console.warn('Autoplay falhou:', error);
            });
          }, 100);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        setConnectionStatus('disconnected');

        if (data.fatal) {
          setIsLoading(false);
          let errorMsg = 'Erro ao carregar stream';

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              errorMsg = 'Erro de rede. Verifique sua conexão.';
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              errorMsg = 'Erro de mídia. Formato não suportado.';
              break;
            case Hls.ErrorTypes.MUX_ERROR:
              errorMsg = 'Erro de multiplexação.';
              break;
            default:
              if (data.details?.includes('404')) {
                errorMsg = 'Vídeo não encontrado.';
              } else if (data.details?.includes('401')) {
                errorMsg = 'Erro de autenticação. Faça login novamente.';
              }
          }

          setError(errorMsg);
          if (onError) onError(data);
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHLS) {
      // Safari nativo para HLS
      console.log('🍎 Usando Safari nativo para HLS');
      video.src = src;
      setIsLoading(false);
      setConnectionStatus('connected');

      if (autoplay) {
        setTimeout(() => {
          video.play().catch(error => {
            console.warn('Autoplay falhou:', error);
          });
        }, 100);
      }
    } else {
      // Vídeo regular (MP4, etc.)
      console.log('📹 Carregando vídeo MP4');
      video.src = src;
      video.load();

      if (autoplay) {
        setTimeout(() => {
          video.play().catch(error => {
            console.warn('Autoplay falhou:', error);
          });
        }, 100);
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoplay, isLive]);

  // Configurar event listeners do vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setConnectionStatus('connecting');
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setConnectionStatus('connected');
      if (onReady) onReady(video);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlay) onPlay();
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (onPause) onPause();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      setConnectionStatus('disconnected');
      const target = e.target as HTMLVideoElement;

      let errorMsg = 'Erro ao carregar vídeo';
      if (target.error) {
        switch (target.error.code) {
          case 1: errorMsg = 'Reprodução abortada'; break;
          case 2: errorMsg = 'Erro de rede'; break;
          case 3: errorMsg = 'Erro de decodificação'; break;
          case 4: errorMsg = 'Formato não suportado'; break;
        }
      }

      setError(errorMsg);
      if (onError) onError(e);
    };

    // Adicionar listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
    };
  }, [onReady, onPlay, onPause, onEnded, onError]);

  // Contador de espectadores
  useEffect(() => {
    if (!viewerCounter?.enabled || !viewerCounter.endpoint) return;

    const endpoint = viewerCounter.endpoint;

    const updateViewerCount = async () => {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        setViewerCount(data.count || 0);
      } catch (error) {
        console.error('Erro ao atualizar contador:', error);
      }
    };

    updateViewerCount();
    const interval = setInterval(updateViewerCount, viewerCounter.interval || 30000);

    return () => clearInterval(interval);
  }, [viewerCounter]);

  // Auto-hide controles
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => {
        if (isPlaying) setShowControls(false);
      });
    }

    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', () => { });
      }
    };
  }, [isPlaying]);

  // Controles de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
      if (onFullscreenChange) onFullscreenChange(isFS);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  // Funções de controle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || isLive) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const changeQuality = (quality: string, src: string) => {
    if (hlsRef.current) {
      const levelIndex = hlsRef.current.levels.findIndex(level =>
        level.height.toString() === quality.replace('p', '')
      );
      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = levelIndex;
        setCurrentQuality(quality);
        if (onQualityChange) onQualityChange(quality);
      }
    }
  };

  const handleDownload = () => {
    if (src && !isLive) {
      const link = document.createElement('a');
      link.href = src;
      link.download = title || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async (platform?: string) => {
    const shareUrl = socialSharing?.shareUrl || window.location.href;
    const shareTitle = title || 'Vídeo';

    if (platform) {
      let url = '';
      switch (platform) {
        case 'facebook':
          url = `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
          break;
        case 'twitter':
          url = `https://twitter.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
          break;
        case 'pinterest':
          url = `https://pinterest.com/pin/create/bookmarklet/?url=${encodeURIComponent(shareUrl)}`;
          break;
        case 'telegram':
          url = `tg://msg_url?url=${encodeURIComponent(shareUrl)}`;
          break;
        case 'whatsapp':
          url = `whatsapp://send?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`;
          break;
      }

      if (url) {
        window.open(url, '_blank', 'width=600,height=400');
      }
    } else {
      // Compartilhamento nativo ou copiar para clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            url: shareUrl
          });
        } catch (error) {
          navigator.clipboard.writeText(shareUrl);
        }
      } else {
        navigator.clipboard.writeText(shareUrl);
      }
    }
  };

  const retry = () => {
    setError(null);
    setIsLoading(true);
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  };

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return '0:00';

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video';
      case '4:3': return 'aspect-[4/3]';
      case '1:1': return 'aspect-square';
      default: return '';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`advanced-video-player relative bg-black rounded-lg overflow-hidden ${className} ${getAspectRatioClass()}`}
    >
      {/* Elemento de vídeo */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Marca d'água */}
      {watermark && (
        <div
          className={`absolute z-10 pointer-events-none ${watermark.position === 'top-left' ? 'top-4 left-4' :
              watermark.position === 'top-right' ? 'top-4 right-4' :
                watermark.position === 'bottom-left' ? 'bottom-20 left-4' :
                  watermark.position === 'bottom-right' ? 'bottom-20 right-4' :
                    'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
            }`}
          style={{ opacity: watermark.opacity / 100 }}
        >
          {watermark.clickable && watermark.link ? (
            <a href={watermark.link} target="_blank" rel="noopener noreferrer" className="pointer-events-auto">
              <img
                src={watermark.url}
                alt="Watermark"
                className={`object-contain ${watermark.size === 'small' ? 'max-w-16 max-h-8' :
                    watermark.size === 'large' ? 'max-w-32 max-h-16' :
                      'max-w-24 max-h-12'
                  }`}
              />
            </a>
          ) : (
            <img
              src={watermark.url}
              alt="Watermark"
              className={`object-contain ${watermark.size === 'small' ? 'max-w-16 max-h-8' :
                  watermark.size === 'large' ? 'max-w-32 max-h-16' :
                    'max-w-24 max-h-12'
                }`}
            />
          )}
        </div>
      )}

      {/* Contador de espectadores */}
      {viewerCounter?.enabled && (
        <div className="absolute top-4 left-4 z-20 bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2 text-sm font-medium">
          <Eye className="h-3 w-3" />
          <span>{streamStats?.viewers || viewerCount}</span>
        </div>
      )}

      {/* Indicador de transmissão ao vivo */}
      {isLive && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2 text-sm font-medium">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>AO VIVO</span>
          </div>
        </div>
      )}

      {/* Status da conexão */}
      <div className="absolute top-4 right-16 z-20">
        <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded-full flex items-center space-x-1">
          {getConnectionIcon()}
          <span className="text-xs">{currentQuality}</span>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black bg-opacity-50">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white text-sm">Carregando...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black bg-opacity-75">
          <div className="flex flex-col items-center space-y-4 text-white text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Erro de Reprodução</h3>
              <p className="text-sm text-gray-300 mb-4">{error}</p>
              <button
                onClick={retry}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Tentar Novamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas do stream */}
      {streamStats && showStats && (
        <div className="absolute bottom-20 left-4 z-20 bg-black bg-opacity-80 text-white p-3 rounded-lg text-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Eye className="h-3 w-3" />
              <span>{streamStats.viewers || 0} espectadores</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-3 w-3" />
              <span>{streamStats.bitrate || 0} kbps</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>{streamStats.uptime || '00:00:00'}</span>
            </div>
            {streamStats.quality && (
              <div className="flex items-center space-x-2">
                <Monitor className="h-3 w-3" />
                <span>{streamStats.quality}</span>
              </div>
            )}
            {streamStats.isRecording && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Gravando</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menu social */}
      {socialSharing?.enabled && showSocialMenu && (
        <div
          ref={socialMenuRef}
          className="absolute top-16 right-4 z-30 bg-black bg-opacity-90 text-white p-4 rounded-lg"
        >
          <div className="flex flex-col space-y-2">
            {socialSharing.platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => handleShare(platform)}
                className="flex items-center space-x-2 px-3 py-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <span className="capitalize">{platform}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controles customizados */}
      {controls && (
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
            }`}
          onMouseEnter={() => setShowControls(true)}
        >
          {/* Botão de play central */}
          {!isPlaying && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="bg-black bg-opacity-60 text-white p-6 rounded-full hover:bg-opacity-80 transition-opacity"
              >
                <Play className="h-12 w-12" />
              </button>
            </div>
          )}

          {/* Barra de controles inferior */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Barra de progresso */}
            {!isLive && duration > 0 && (
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${(currentTime / duration) * 100}%, rgba(255, 255, 255, 0.3) 0%)`
                  }}
                />
              </div>
            )}

            {/* Controles principais */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-accent transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </button>

                {/* Volume */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-accent transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="h-6 w-6" />
                    ) : (
                      <Volume2 className="h-6 w-6" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-500 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                {/* Tempo */}
                <div className="text-white text-sm">
                  {isLive ? (
                    <div className="flex items-center space-x-2">
                      <span>Ao vivo</span>
                      {streamStats?.uptime && (
                        <>
                          <span>•</span>
                          <span>{streamStats.uptime}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Estatísticas */}
                {streamStats && (
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="text-white hover:text-accent transition-colors"
                    title="Estatísticas"
                  >
                    <Activity className="h-5 w-5" />
                  </button>
                )}

                {/* Qualidade */}
                {qualityLevels && qualityLevels.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white hover:text-accent transition-colors"
                      title="Qualidade"
                    >
                      <Settings className="h-5 w-5" />
                    </button>

                    {showSettings && (
                      <div className="absolute bottom-8 right-0 bg-black bg-opacity-90 text-white p-2 rounded-lg min-w-32">
                        {qualityLevels.map((level) => (
                          <button
                            key={level.label}
                            onClick={() => {
                              changeQuality(level.label, level.src);
                              setShowSettings(false);
                            }}
                            className={`block w-full text-left px-3 py-1 hover:bg-white hover:bg-opacity-20 rounded ${currentQuality === level.label ? 'bg-white bg-opacity-20' : ''
                              }`}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Download */}
                {!isLive && src && (
                  <button
                    onClick={handleDownload}
                    className="text-white hover:text-accent transition-colors"
                    title="Download"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}

                {/* Compartilhar */}
                {socialSharing?.enabled && (
                  <button
                    onClick={() => setShowSocialMenu(!showSocialMenu)}
                    className="text-white hover:text-accent transition-colors"
                    title="Compartilhar"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-accent transition-colors"
                  title="Tela cheia"
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Título do vídeo */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
          <h3 className="text-white text-lg font-semibold truncate">{title}</h3>
          {streamStats && (
            <div className="text-white text-sm opacity-80 mt-1">
              {streamStats.quality && <span>{streamStats.quality}</span>}
              {streamStats.bitrate && <span> • {streamStats.bitrate} kbps</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedVideoPlayer;