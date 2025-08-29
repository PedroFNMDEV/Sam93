import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface StreamPlatform {
  id: string;
  name: string;
  enabled: boolean;
  rtmpUrl?: string;
  streamKey?: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
}

interface StreamData {
  isLive: boolean;
  streamUrl: string;
  title: string;
  viewers: number;
  uptime: string;
  bitrate: number;
  startTime?: Date;
  duration: number;
  platforms: StreamPlatform[];
  wowzaStatus: 'online' | 'offline' | 'error';
  applicationName: string;
  streamName: string;
}

interface StreamContextType {
  streamData: StreamData;
  updateStreamData: (data: Partial<StreamData>) => void;
  startStream: (platforms: string[]) => Promise<void>;
  stopStream: () => Promise<void>;
  refreshStreamStatus: () => Promise<void>;
  updatePlatformConfig: (platformId: string, config: Partial<StreamPlatform>) => void;
  connectToPlatform: (platformId: string) => Promise<void>;
  disconnectFromPlatform: (platformId: string) => Promise<void>;
}

const StreamContext = createContext<StreamContextType | null>(null);

export const useStream = () => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
};

interface StreamProviderProps {
  children: ReactNode;
}

const defaultPlatforms: StreamPlatform[] = [
  { id: 'youtube', name: 'YouTube', enabled: false, status: 'disconnected' },
  { id: 'instagram', name: 'Instagram', enabled: false, status: 'disconnected' },
  { id: 'facebook', name: 'Facebook', enabled: false, status: 'disconnected' },
  { id: 'twitch', name: 'Twitch', enabled: false, status: 'disconnected' },
  { id: 'vimeo', name: 'Vimeo', enabled: false, status: 'disconnected' },
  { id: 'tiktok', name: 'TikTok', enabled: false, status: 'disconnected' },
  { id: 'periscope', name: 'Periscope', enabled: false, status: 'disconnected' },
  { id: 'kwai', name: 'Kwai', enabled: false, status: 'disconnected' },
  { id: 'steam', name: 'Steam Valve', enabled: false, status: 'disconnected' },
  { id: 'rtmp', name: 'RTMP Próprio', enabled: false, status: 'disconnected' }
];

export const StreamProvider: React.FC<StreamProviderProps> = ({ children }) => {
  const { user, getToken } = useAuth();
  const [streamData, setStreamData] = useState<StreamData>({
    isLive: false,
    streamUrl: '',
    title: '',
    viewers: 0,
    uptime: '00:00:00',
    bitrate: 0,
    duration: 0,
    platforms: defaultPlatforms,
    wowzaStatus: 'offline',
    applicationName: 'live',
    streamName: ''
  });

  const updateStreamData = (data: Partial<StreamData>) => {
    setStreamData(prev => ({ ...prev, ...data }));
  };

  const updatePlatformConfig = (platformId: string, config: Partial<StreamPlatform>) => {
    setStreamData(prev => ({
      ...prev,
      platforms: prev.platforms.map(platform =>
        platform.id === platformId ? { ...platform, ...config } : platform
      )
    }));
  };

  const connectToPlatform = async (platformId: string) => {
    updatePlatformConfig(platformId, { status: 'connecting' });
    
    try {
      // Simular conexão com a plataforma
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      updatePlatformConfig(platformId, { status: 'connected' });
    } catch (error) {
      updatePlatformConfig(platformId, { status: 'error' });
      throw error;
    }
  };

  const disconnectFromPlatform = async (platformId: string) => {
    try {
      // Simular desconexão da plataforma
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updatePlatformConfig(platformId, { status: 'disconnected' });
    } catch (error) {
      updatePlatformConfig(platformId, { status: 'error' });
      throw error;
    }
  };

  const startStream = async (selectedPlatforms: string[]) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo: 'Transmissão ao vivo',
          platform_ids: selectedPlatforms
        })
      });

      const result = await response.json();

      if (result.success) {
        updateStreamData({
          isLive: true,
          streamUrl: result.wowza_data?.rtmpUrl || '',
          streamName: result.wowza_data?.streamName || '',
          title: result.transmission.titulo,
          startTime: new Date(),
          viewers: 0,
          bitrate: result.wowza_data?.bitrate || 2500,
          wowzaStatus: 'online'
        });

        // Conectar às plataformas selecionadas
        for (const platformId of selectedPlatforms) {
          try {
            await connectToPlatform(platformId);
          } catch (error) {
            console.error(`Erro ao conectar à plataforma ${platformId}:`, error);
          }
        }
      } else {
        throw new Error(result.error || 'Erro ao iniciar transmissão');
      }
    } catch (error) {
      console.error('Erro ao iniciar stream:', error);
      throw error;
    }
  };

  const stopStream = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        // Desconectar de todas as plataformas
        const connectedPlatforms = streamData.platforms.filter(p => p.status === 'connected');
        
        for (const platform of connectedPlatforms) {
          try {
            await disconnectFromPlatform(platform.id);
          } catch (error) {
            console.error(`Erro ao desconectar da plataforma ${platform.id}:`, error);
          }
        }

        updateStreamData({
          isLive: false,
          streamUrl: '',
          viewers: 0,
          uptime: '00:00:00',
          bitrate: 0,
          duration: 0,
          startTime: undefined,
          wowzaStatus: 'offline',
          streamName: ''
        });
      } else {
        throw new Error(result.error || 'Erro ao parar transmissão');
      }
    } catch (error) {
      console.error('Erro ao parar stream:', error);
      throw error;
    }
  };

  const refreshStreamStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success && result.is_live && result.transmission) {
        const transmission = result.transmission;
        updateStreamData({
          isLive: true,
          viewers: transmission.stats.viewers,
          bitrate: transmission.stats.bitrate,
          uptime: transmission.stats.uptime,
          title: transmission.titulo,
          wowzaStatus: 'online'
        });
      } else {
        updateStreamData({
          isLive: false,
          viewers: 0,
          bitrate: 0,
          uptime: '00:00:00',
          wowzaStatus: 'offline'
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status da transmissão:', error);
      updateStreamData({ wowzaStatus: 'error' });
    }
  };

  // Atualizar uptime e duração quando a transmissão estiver ativa
  useEffect(() => {
    if (!streamData.isLive || !streamData.startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - streamData.startTime!.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      const uptime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const duration = Math.floor(diff / 1000);
      
      updateStreamData({ uptime, duration });
    }, 1000);

    return () => clearInterval(interval);
  }, [streamData.isLive, streamData.startTime]);

  // Atualizar dados da transmissão periodicamente
  useEffect(() => {
    if (!streamData.isLive) return;

    const interval = setInterval(refreshStreamStatus, 10000); // A cada 10 segundos

    return () => clearInterval(interval);
  }, [streamData.isLive]);

  // Verificar status inicial
  useEffect(() => {
    refreshStreamStatus();
  }, []);

  return (
    <StreamContext.Provider value={{
      streamData,
      updateStreamData,
      startStream,
      stopStream,
      refreshStreamStatus,
      updatePlatformConfig,
      connectToPlatform,
      disconnectFromPlatform
    }}>
      {children}
    </StreamContext.Provider>
  );
};