import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, X, SkipForward, SkipBack } from 'lucide-react';
import Hls from 'hls.js';
import AdvancedVideoPlayer from './AdvancedVideoPlayer';

interface VideoPlayerProps {
  playlistVideo?: {
    id: number;
    nome: string;
    url: string;
    duracao?: number;
  };
  onVideoEnd?: () => void;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  height?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  playlistVideo, 
  onVideoEnd, 
  className = "w-full",
  autoplay = false,
  controls = true,
  height = "h-96"
}) => {
  const { user } = useAuth();
  const { streamData } = useStream();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [obsStreamActive, setObsStreamActive] = useState(false);
  const [obsStreamUrl, setObsStreamUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);

  useEffect(() => {
    checkOBSStream();
  }, []);

  const checkOBSStream = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/streaming/obs-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.obs_stream.is_live) {
          setObsStreamActive(true);
          setObsStreamUrl(`http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8`);
        } else {
          setObsStreamActive(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar stream OBS:', error);
    }
  };
  
  // Função melhorada para construir URLs de vídeo
  const buildVideoUrl = (url: string) => {
    if (!url) return '';
    
    // Se já é uma URL completa, usar como está
    if (url.startsWith('http')) {
      return url;
    }
    
    // Para o novo sistema, usar API para obter URL correta
    return `/api/videos/view-url?path=${encodeURIComponent(url)}`;
  };

  // Configurar fonte de vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Limpar HLS anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setError(null);
    setLoading(true);

    let videoSrc = '';
    
    if (playlistVideo?.url) {
      videoSrc = buildVideoUrl(playlistVideo.url);
    } else if (streamData.isLive) {
      videoSrc = `http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8`;
    } else if (obsStreamActive) {
      videoSrc = obsStreamUrl;
    }

    if (!videoSrc) {
      setLoading(false);
      return;
    }

    console.log('🎥 Configurando vídeo:', {
      original: playlistVideo?.url || 'stream',
      processed: videoSrc,
      isHLS: videoSrc.includes('.m3u8'),
      isSSH: videoSrc.includes('/api/videos-ssh/')
    });

    // Detectar se é HLS
    const isHLS = videoSrc.includes('.m3u8') || !playlistVideo;

    if (isHLS && Hls.isSupported()) {
      // Usar HLS.js para streams
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: !playlistVideo,
        backBufferLength: playlistVideo ? 30 : 10,
        maxBufferLength: playlistVideo ? 60 : 20,
        debug: false,
        xhrSetup: (xhr, url) => {
          xhr.withCredentials = false;
          const token = localStorage.getItem('auth_token');
          if (token && (url.includes('/content/') || url.includes('/api/videos-ssh/'))) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.timeout = 15000;
        }
      });

      hls.loadSource(videoSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ Manifest HLS carregado');
        setLoading(false);
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
        if (data.fatal) {
          setLoading(false);
          let errorMsg = 'Erro ao carregar stream';
          
          if (data.details?.includes('404')) {
            errorMsg = 'Vídeo não encontrado. Verifique se o arquivo existe no servidor.';
          } else if (data.details?.includes('401')) {
            errorMsg = 'Erro de autenticação. Faça login novamente.';
          } else if (data.details?.includes('timeout')) {
            errorMsg = 'Timeout no carregamento. Tente novamente.';
          }
          
          setError(errorMsg);
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHLS) {
      // Safari nativo para HLS
      console.log('🍎 Usando Safari nativo para HLS');
      video.src = videoSrc;
      setLoading(false);
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
      video.src = videoSrc;
      video.load();
      setLoading(false);
      
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
  }, [playlistVideo, streamData.isLive, obsStreamActive, obsStreamUrl, autoplay]);

  // Event handlers
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    if (onVideoEnd) onVideoEnd();
  };
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setCurrentTime(video.currentTime);
  };
  const handleDurationChange = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(video.duration);
  };
  const handleVolumeChange = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setVolume(video.volume);
    setIsMuted(video.muted);
  };
  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    console.error('Erro no vídeo:', video.error);
    setLoading(false);
    
    let errorMsg = 'Erro ao carregar vídeo';
    if (video.error) {
      switch (video.error.code) {
        case 1:
          errorMsg = 'Reprodução abortada';
          break;
        case 2:
          errorMsg = 'Erro de rede ao carregar vídeo';
          break;
        case 3:
          errorMsg = 'Erro ao decodificar vídeo';
          break;
        case 4:
          errorMsg = 'Formato de vídeo não suportado';
          break;
        default:
          errorMsg = `Erro ${video.error.code}: ${video.error.message}`;
      }
    }
    setError(errorMsg);
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setLoading(false);
  };

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || (!playlistVideo && streamData.isLive)) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
  };

  const toggleFullscreen = () => {
    const container = document.querySelector('.video-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
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

  const videoTitle = playlistVideo?.nome || 
    (streamData.isLive ? streamData.title || 'Transmissão ao Vivo' : 
     obsStreamActive ? 'Transmissão OBS ao Vivo' : undefined);

  const isLive = !playlistVideo && (streamData.isLive || obsStreamActive);

  // Usar AdvancedVideoPlayer para melhor experiência
  const videoSrc = playlistVideo?.url ? buildVideoUrl(playlistVideo.url) :
    streamData.isLive ? `http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8` :
    obsStreamActive ? obsStreamUrl : '';
  return (
    <AdvancedVideoPlayer
      src={videoSrc}
      title={videoTitle}
      isLive={isLive}
      autoplay={autoplay}
      controls={controls}
      className={`${className} ${height}`}
      aspectRatio="16:9"
      streamStats={isLive ? {
        viewers: Math.floor(Math.random() * 50) + 5,
        bitrate: 2500,
        uptime: '01:23:45',
        quality: '1080p',
        isRecording: false
      } : undefined}
      onEnded={onVideoEnd}
      enableSocialSharing={true}
      enableViewerCounter={isLive}
      enableWatermark={true}
    />
  );
};

export default VideoPlayer;