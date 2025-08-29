import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Download, Share2, Wifi, WifiOff, Activity, Eye, Clock, RotateCcw, AlertCircle } from 'lucide-react';

interface UniversalVideoPlayerProps {
  src?: string;
  poster?: string;
  title?: string;
  isLive?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  fluid?: boolean;
  responsive?: boolean;
  width?: number;
  height?: number;
  className?: string;
  onReady?: (player: HTMLVideoElement) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  // Configurações específicas para streaming
  streamStats?: {
    viewers?: number;
    bitrate?: number;
    uptime?: string;
    quality?: string;
  };
  // Configurações de qualidade
  qualityLevels?: Array<{
    label: string;
    src: string;
    type: string;
  }>;
  // Configurações de logo/marca d'água
  watermark?: {
    url: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
    size?: 'small' | 'medium' | 'large';
  };
  // Informações de bitrate para validação
  videoBitrate?: number;
  userBitrateLimit?: number;
}

const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  src,
  poster,
  title,
  isLive = false,
  autoplay = false,
  muted = false,
  controls = true,
  fluid = true,
  responsive = true,
  width = 640,
  height = 360,
  className = '',
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  streamStats,
  qualityLevels,
  watermark,
  videoBitrate,
  userBitrateLimit
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

  // Função para otimizar URL de vídeo SSH
  const optimizeSSHVideoUrl = (src: string) => {
    if (!src.includes('/api/videos-ssh/')) return src;
    
    // Para vídeos SSH, usar proxy direto para melhor performance
    const videoId = src.split('/stream/')[1]?.split('?')[0];
    if (videoId) {
      const token = localStorage.getItem('auth_token');
      return `/api/videos-ssh/proxy-stream/${videoId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }
    
    return src;
  };
  // Função para detectar tipo de arquivo
  const getFileType = (url: string) => {
    // Para URLs SSH, sempre tratar como MP4
    if (url.includes('/api/videos-ssh/')) {
      return 'mp4';
    }
    
    const extension = url.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'm3u8':
        return 'hls';
      case 'mp4':
        return 'mp4';
      case 'webm':
      case '.ogv':
        return 'webm';
      case 'ogg':
        return 'ogg';
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'mkv':
      case '.3gp':
      case '.3g2':
      case '.ts':
      case '.mpg':
      case '.mpeg':
      case '.m4v':
      case '.asf':
        return 'mp4'; // Todos os vídeos são tratados como MP4 após conversão
      default:
        return 'mp4'; // Default para MP4
    }
  };

  // Inicializar player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Configurar eventos do vídeo
    const handleLoadStart = () => {
      setIsLoading(true);
      setConnectionStatus('connecting');
      setError(null);
      console.log('🎥 Iniciando carregamento do vídeo...');
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setConnectionStatus('connected');
      console.log('✅ Vídeo pronto para reprodução');
      if (onReady) onReady(video);
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setConnectionStatus('connected');
      console.log('✅ Dados do vídeo carregados');
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

      console.error('❌ Erro no vídeo:', target.error);

      let errorMsg = 'Erro ao carregar vídeo';

      if (target.error) {
        switch (target.error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMsg = 'Reprodução abortada pelo usuário';
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMsg = 'Erro de rede ao carregar vídeo';
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMsg = 'Erro ao decodificar vídeo';
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMsg = 'Formato de vídeo não suportado';
            break;
          default:
            errorMsg = `Erro ${target.error.code}: ${target.error.message}`;
        }
      }

      setError(errorMsg);
      if (onError) onError(e);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setConnectionStatus('connected');
    };

    const handleProgress = () => {
      // Verificar se há dados em buffer
      if (video.buffered.length > 0) {
        setConnectionStatus('connected');
      }
    };

    // Adicionar event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('progress', handleProgress);

    // Configurar propriedades iniciais
    video.muted = muted;
    video.volume = 1;
    video.controls = false; // Usar controles customizados
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('progress', handleProgress);
    };
  }, [muted, onReady, onPlay, onPause, onEnded, onError, src, retryCount]);

  // Configurar fonte de vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Construir URL do vídeo
    let videoUrl = buildVideoUrl(src);
    
    const fileType = getFileType(videoUrl);

    console.log('🎥 Configurando vídeo:', {
      original: src,
      processed: videoUrl,
      type: fileType,
      isSSH: src.includes('/api/videos-ssh/')
    });

    // Reset retry count when source changes
    setRetryCount(0);
    setError(null);
    setIsLoading(true);

    // Limpar HLS anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (fileType === 'hls') {
      // Stream HLS
      if (Hls.isSupported()) {
        console.log('🔄 Usando HLS.js para reprodução');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: isLive,
          backBufferLength: isLive ? 10 : 30,
          maxBufferLength: isLive ? 20 : 60,
          maxMaxBufferLength: isLive ? 30 : 120,
          liveSyncDurationCount: isLive ? 3 : 5,
          liveMaxLatencyDurationCount: isLive ? 5 : 10,
          debug: false,
          xhrSetup: (xhr, url) => {
            xhr.withCredentials = false;
            // Adicionar token de autenticação para URLs SSH e content
            if (src && (src.includes('/api/videos-ssh/') || src.includes('/content/'))) {
              const token = localStorage.getItem('auth_token');
              if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              }
            }
            xhr.timeout = 15000; // Timeout aumentado para melhor estabilidade
          }
        });

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ Manifest HLS carregado com sucesso');
          setIsLoading(false);
          setConnectionStatus('connected');
          if (autoplay) {
            // Delay para evitar conflitos
            setTimeout(() => {
              video.play().catch(error => {
                console.warn('Autoplay falhou (normal):', error);
              });
            }, 100);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          if (data.fatal) {
            setIsLoading(false);
            let errorMsg = 'Erro ao carregar stream';

            if (data.details?.includes('404')) {
              errorMsg = 'Vídeo não encontrado. Verifique se o arquivo existe.';
            } else if (data.details?.includes('401')) {
              errorMsg = 'Erro de autenticação. Faça login novamente.';
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            } else if (data.details?.includes('timeout')) {
              errorMsg = 'Timeout no carregamento. Tente novamente.';
            }

            // Mensagens mais amigáveis para erros SSH
            if (src && src.includes('/api/videos-ssh/')) {
              if (data.details?.includes('404')) {
                errorMsg = 'Vídeo não encontrado no servidor. Tente atualizar a lista.';
              } else if (data.details?.includes('timeout')) {
                errorMsg = 'Carregamento lento. Aguarde ou tente abrir em nova aba.';
              } else if (data.details?.includes('401')) {
                errorMsg = 'Erro de autenticação. Faça login novamente.';
                // Redirecionar para login se token expirou
                setTimeout(() => {
                  window.location.href = '/login';
                }, 2000);
              } else {
                errorMsg = 'Erro ao acessar vídeo. Tente abrir em nova aba para melhor performance.';
              }
            } else if (src && src.includes('/content/')) {
              if (data.details?.includes('401')) {
                errorMsg = 'Erro de autenticação. Faça login novamente.';
                setTimeout(() => {
                  window.location.href = '/login';
                }, 2000);
              }
            }

            setError(errorMsg);
            setConnectionStatus('disconnected');
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari nativo
        console.log('🍎 Usando Safari nativo para HLS');
        video.src = videoUrl;
        if (autoplay) {
          setTimeout(() => {
            video.play().catch(error => {
              console.warn('Autoplay falhou (normal):', error);
            });
          }, 100);
        }
      } else {
        setError('HLS não suportado neste navegador');
        setIsLoading(false);
      }
    } else {
      // Vídeo regular (MP4, WebM, etc.)
      console.log(`📹 Carregando vídeo MP4${src.includes('/api/videos-ssh/') ? ' (SSH Otimizado)' : ''}`);

      // Para vídeos SSH, configurar timeout maior
      if (src && src.includes('/api/videos-ssh/')) {
        video.setAttribute('preload', 'metadata'); // Carregar metadados para melhor UX
        video.setAttribute('crossorigin', 'anonymous');
        
        video.src = videoUrl;
      }
      // Para URLs diretas do Wowza (com @), não adicionar token
      else if (src && videoUrl.includes('@')) {
        video.setAttribute('preload', 'metadata');
        video.setAttribute('crossorigin', 'anonymous');
        video.src = videoUrl;
      }
      // Para vídeos via /content, também configurar headers de autenticação
      else if (src && src.includes('/content/')) {
        const token = localStorage.getItem('auth_token');
        if (token && !src.includes('auth_token=')) {
          // Para vídeos /content, adicionar token como parâmetro
          const urlWithToken = `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}auth_token=${encodeURIComponent(token)}`;
          video.setAttribute('crossorigin', 'anonymous');
          video.src = urlWithToken;
        } else {
          video.setAttribute('crossorigin', 'anonymous');
          video.src = videoUrl;
        }
      } else {
        video.setAttribute('crossorigin', 'anonymous');
        video.src = videoUrl;
      }

      // Só chamar load() se não for URL direta do Wowza
      if (!videoUrl.includes('@')) {
        video.load();
      }

      if (autoplay) {
        setTimeout(() => {
          video.play().catch(error => {
            console.warn('Autoplay falhou (normal):', error);
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

  // Controles de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
  
  function buildExternalWowzaUrl(src: string): string {
  const isProduction = window.location.hostname !== 'localhost';
  const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';

  // Exemplo: pega só o caminho do vídeo após o host
  const urlParts = src.split('/content/');
  if (urlParts.length > 1) {
    return `http://${wowzaHost}:6980/content/${urlParts[1]}`;
  }

  return src;
}


  const handleDownload = () => {
    if (src && !isLive) {
      // Para download, tentar URL direta primeiro
      const isProduction = window.location.hostname !== 'localhost';
      const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';
      
      let downloadUrl = src;
      
      // Para vídeos SSH, construir URL direta
      if (src.includes('/api/videos-ssh/stream/')) {
        try {
          const videoId = src.split('/stream/')[1]?.split('?')[0];
          if (videoId) {
            const remotePath = Buffer.from(videoId, 'base64').toString('utf-8');
            const wowzaUser = 'admin';
            const wowzaPassword = 'FK38Ca2SuE6jvJXed97VMn';
            const relativePath = remotePath.replace('/usr/local/WowzaStreamingEngine/content', '');
            downloadUrl = `http://${wowzaUser}:${wowzaPassword}@${wowzaHost}:6980/content${relativePath}`;
          }
        } catch (error) {
          console.warn('Erro ao construir URL de download, usando original:', error);
        }
      } else if (src.includes('.m3u8')) {
        // Se é HLS, tentar converter para URL de download direto
        const hlsPath = src.replace(/.*\/vod\//, '').replace('/playlist.m3u8', '');
        downloadUrl = `http://${wowzaHost}:6980/content/${hlsPath}.mp4`;
      } else if (!src.startsWith('http')) {
        downloadUrl = buildExternalWowzaUrl(src);
      }
      
      // Abrir URL de download
      window.open(downloadUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share && src) {
      try {
        await navigator.share({
          title: title || 'Vídeo',
          url: window.location.href
        });
      } catch (error) {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const retry = () => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setIsLoading(true);
    setRetryCount(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Recarregar o vídeo
    video.load();
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
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`universal-video-player relative bg-black rounded-lg overflow-hidden ${className}`}
      style={{
        aspectRatio: responsive ? '16/9' : undefined,
        width: fluid ? '100%' : width,
        height: fluid ? 'auto' : height
      }}
    >
      {/* Elemento de vídeo */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Marca d'água/Logo */}
      {watermark && (
        <div
          className={`absolute z-10 pointer-events-none ${watermark.position === 'top-left' ? 'top-4 left-4' :
              watermark.position === 'top-right' ? 'top-4 right-4' :
                watermark.position === 'bottom-left' ? 'bottom-4 left-4' :
                  'bottom-4 right-4'
            }`}
          style={{ opacity: watermark.opacity / 100 }}
        >
          <img
            src={watermark.url}
            alt="Logo"
            className={`object-contain ${watermark.size === 'small' ? 'max-w-16 max-h-8' :
                watermark.size === 'large' ? 'max-w-32 max-h-16' :
                  'max-w-24 max-h-12'
              }`}
          />
        </div>
      )}

      {/* Indicador de transmissão ao vivo */}
      {isLive && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2 text-sm font-medium">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>AO VIVO</span>
          </div>
        </div>
      )}

      {/* Status da conexão */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded-full flex items-center space-x-1">
          {getConnectionIcon()}
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
            <WifiOff className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Erro de Reprodução</h3>
              <p className="text-sm text-gray-300 mb-4">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={retry}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Tentar Novamente</span>
                </button>
                {src && (
                  <div className="text-xs text-gray-400 mt-2">
                    <p>URL: {buildVideoUrl(src)}</p>
                    <p>Tentativas: {retryCount}/3</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder quando não há vídeo */}
      {!src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white">
          <Play className="h-16 w-16 mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Nenhum vídeo carregado</h3>
          <p className="text-gray-400 text-center max-w-md">
            Selecione um vídeo ou inicie uma transmissão para visualizar o conteúdo aqui
          </p>
        </div>
      )}

      {/* Estatísticas do stream */}
      {streamStats && showStats && (
        <div className="absolute bottom-20 left-4 z-20 bg-black bg-opacity-80 text-white p-3 rounded-lg text-sm">
          <div className="space-y-1">
            {streamStats.viewers !== undefined && (
              <div className="flex items-center space-x-2">
                <Eye className="h-3 w-3" />
                <span>{streamStats.viewers} espectadores</span>
              </div>
            )}
            {streamStats.bitrate && (
              <div className="flex items-center space-x-2">
                <Activity className="h-3 w-3" />
                <span>{streamStats.bitrate} kbps</span>
              </div>
            )}
            {streamStats.uptime && (
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3" />
                <span>{streamStats.uptime}</span>
              </div>
            )}
            {streamStats.quality && (
              <div className="flex items-center space-x-2">
                <Settings className="h-3 w-3" />
                <span>{streamStats.quality}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aviso de bitrate excedido */}
      {videoBitrate && userBitrateLimit && videoBitrate > userBitrateLimit && (
        <div className="absolute top-16 left-4 z-20 bg-red-600 text-white px-3 py-2 rounded-md text-sm max-w-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">Bitrate Alto</p>
              <p className="text-xs opacity-90">
                {videoBitrate} kbps {'>'} {userBitrateLimit} kbps
              </p>
            </div>
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
                className="bg-black bg-opacity-60 text-white p-4 rounded-full hover:bg-opacity-80 transition-opacity"
              >
                <Play className="h-8 w-8" />
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

            {/* Controles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
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
                    style={{
                      background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.3) 0%)`
                    }}
                  />
                </div>

                {/* Tempo */}
                <div className="text-white text-sm">
                  {isLive ? (
                    <span className="flex items-center space-x-2">
                      <span>Ao vivo</span>
                      {streamStats?.uptime && (
                        <>
                          <span>•</span>
                          <span>{streamStats.uptime}</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Botões adicionais */}
                {streamStats && (
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="text-white hover:text-accent transition-colors"
                    title="Estatísticas"
                  >
                    <Activity className="h-5 w-5" />
                  </button>
                )}

                {!isLive && src && (
                  <button
                    onClick={handleDownload}
                    className="text-white hover:text-accent transition-colors"
                    title="Download"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="text-white hover:text-accent transition-colors"
                  title="Compartilhar"
                >
                  <Share2 className="h-5 w-5" />
                </button>

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
        <div className="mt-3 px-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
        </div>
      )}
    </div>
  );
};

export default UniversalVideoPlayer;