import React, { useState, useEffect } from 'react';
import { ChevronLeft, Radio, Play, Square, Settings, Upload, Eye, EyeOff, Plus, Trash2, Save, AlertCircle, CheckCircle, Activity, Users, Zap, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useStream } from '../../context/StreamContext';
import UniversalVideoPlayer from '../../components/UniversalVideoPlayer';

interface Platform {
  id: string;
  nome: string;
  codigo: string;
  rtmp_base_url: string;
  requer_stream_key: boolean;
}

interface PlatformResult {
  platform: string;
  success: boolean;
  error?: string;
}

interface UserPlatform {
  id: number;
  id_platform: string;
  stream_key: string;
  rtmp_url: string;
  titulo_padrao: string;
  descricao_padrao: string;
  ativo: boolean;
  platform: Platform;
}

interface Playlist {
  id: number;
  nome: string;
  total_videos?: number;
  duracao_total?: number;
}

interface Logo {
  id: number;
  nome: string;
  url: string;
  tamanho: number;
  tipo_arquivo: string;
}

interface TransmissionSettings {
  titulo: string;
  descricao: string;
  playlist_id: string;
  platform_ids: string[];
  bitrate_override?: number;
  enable_recording: boolean;
  logo_id?: string;
  logo_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logo_opacity: number;
}

interface StreamStatus {
  is_live: boolean;
  stream_type?: 'playlist' | 'obs';
  transmission?: {
    id: number;
    titulo: string;
    stats: {
      viewers: number;
      bitrate: number;
      uptime: string;
      isActive: boolean;
    };
    platforms: Array<{
      user_platform: {
        platform: Platform;
      };
      status: string;
    }>;
  };
  obs_stream?: {
    is_live: boolean;
    viewers: number;
    bitrate: number;
    uptime: string;
    recording: boolean;
    platforms: any[];
  };
}

const IniciarTransmissao: React.FC = () => {
  const { getToken, user } = useAuth();
  const { streamData, refreshStreamStatus } = useStream();

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [userPlatforms, setUserPlatforms] = useState<UserPlatform[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);

  const [loading, setLoading] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showLogoUpload, setShowLogoUpload] = useState(false);

  const [settings, setSettings] = useState<TransmissionSettings>({
    titulo: '',
    descricao: '',
    playlist_id: '',
    platform_ids: [],
    enable_recording: false,
    logo_id: '',
    logo_position: 'top-right',
    logo_opacity: 80
  });

  const [platformForm, setPlatformForm] = useState({
    platform_id: '',
    stream_key: '',
    rtmp_url: '',
    titulo_padrao: '',
    descricao_padrao: ''
  });

  const [logoUpload, setLogoUpload] = useState<{
    file: File | null;
    nome: string;
    uploading: boolean;
  }>({
    file: null,
    nome: '',
    uploading: false
  });

  useEffect(() => {
    loadInitialData();
    checkStreamStatus();

    // Atualizar status a cada 30 segundos
    const interval = setInterval(checkStreamStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadPlatforms(),
        loadUserPlatforms(),
        loadPlaylists(),
        loadLogos()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const loadPlatforms = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/platforms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPlatforms(data.platforms);
      }
    } catch (error) {
      console.error('Erro ao carregar plataformas:', error);
    }
  };

  const loadUserPlatforms = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/user-platforms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserPlatforms(data.platforms);
      }
    } catch (error) {
      console.error('Erro ao carregar plataformas do usuário:', error);
    }
  };

  const loadPlaylists = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/playlists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Erro ao carregar playlists:', error);
    }
  };

  const loadLogos = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/logos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setLogos(data);
    } catch (error) {
      console.error('Erro ao carregar logos:', error);
    }
  };

  const checkStreamStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setStreamStatus(data);

      // Atualizar contexto de stream
      refreshStreamStatus();
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const handleStartTransmission = async () => {
    if (!settings.titulo || !settings.playlist_id) {
      toast.error('Título e playlist são obrigatórios');
      return;
    }

    if (settings.platform_ids.length === 0) {
      toast.error('Selecione pelo menos uma plataforma');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Transmissão iniciada com sucesso!');

        // Mostrar detalhes do resultado
        if (result.platform_results) {
          const platformResults: PlatformResult[] = result.platform_results;

          const successCount = platformResults.filter((p) => p.success).length;
          const totalCount = platformResults.length;

          if (successCount === totalCount) {
            toast.success(`Todas as ${totalCount} plataforma(s) conectadas com sucesso!`);
          } else {
            toast.warning(`${successCount} de ${totalCount} plataforma(s) conectadas. Verifique as configurações.`);

            platformResults.forEach((platform) => {
              if (!platform.success) {
                console.error(`Erro na plataforma ${platform.platform}:`, platform.error);
              }
            });
          }
        }

        checkStreamStatus();

        // Reset form
        setSettings(prev => ({
          ...prev,
          titulo: '',
          descricao: '',
          platform_ids: []
        }));
      } else {
        toast.error(result.error || 'Erro ao iniciar transmissão');

        // Log detalhado do erro
        console.error('Erro detalhado na transmissão:', result);
      }
    } catch (error) {
      console.error('Erro ao iniciar transmissão:', error);
      toast.error('Erro ao iniciar transmissão');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTransmission = async () => {
    if (!confirm('Deseja realmente finalizar a transmissão?')) return;

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          transmission_id: streamStatus?.transmission?.id,
          stream_type: streamStatus?.stream_type || 'playlist'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Transmissão finalizada com sucesso!');
        checkStreamStatus();
      } else {
        toast.error(result.error || 'Erro ao finalizar transmissão');
      }
    } catch (error) {
      console.error('Erro ao finalizar transmissão:', error);
      toast.error('Erro ao finalizar transmissão');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigurePlatform = async () => {
    if (!platformForm.platform_id || !platformForm.stream_key) {
      toast.error('Plataforma e chave de transmissão são obrigatórios');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/configure-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(platformForm)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Plataforma configurada com sucesso!');
        setShowPlatformModal(false);
        setPlatformForm({
          platform_id: '',
          stream_key: '',
          rtmp_url: '',
          titulo_padrao: '',
          descricao_padrao: ''
        });
        loadUserPlatforms();
      } else {
        toast.error(result.error || 'Erro ao configurar plataforma');
      }
    } catch (error) {
      console.error('Erro ao configurar plataforma:', error);
      toast.error('Erro ao configurar plataforma');
    }
  };

  const handleRemovePlatform = async (platformId: number) => {
    if (!confirm('Deseja remover esta plataforma?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/streaming/user-platforms/${platformId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Plataforma removida com sucesso!');
        loadUserPlatforms();
      } else {
        toast.error(result.error || 'Erro ao remover plataforma');
      }
    } catch (error) {
      console.error('Erro ao remover plataforma:', error);
      toast.error('Erro ao remover plataforma');
    }
  };

  const handleLogoUpload = async () => {
    if (!logoUpload.file || !logoUpload.nome) {
      toast.error('Selecione um arquivo e digite um nome');
      return;
    }

    setLogoUpload(prev => ({ ...prev, uploading: true }));
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('logo', logoUpload.file);
      formData.append('nome', logoUpload.nome);

      const response = await fetch('/api/logos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Logo enviada com sucesso!');
        setShowLogoUpload(false);
        setLogoUpload({ file: null, nome: '', uploading: false });
        loadLogos();
      } else {
        toast.error(result.error || 'Erro ao enviar logo');
      }
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setLogoUpload(prev => ({ ...prev, uploading: false }));
    }
  };

  const togglePlatformSelection = (platformId: string) => {
    setSettings(prev => ({
      ...prev,
      platform_ids: prev.platform_ids.includes(platformId)
        ? prev.platform_ids.filter(id => id !== platformId)
        : [...prev.platform_ids, platformId]
    }));
  };

  const isTransmissionActive = streamStatus?.is_live;
  const hasOBSStream = streamStatus?.obs_stream?.is_live;
  const hasPlaylistStream = streamStatus?.transmission;

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <Radio className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Iniciar Transmissão</h1>
      </div>

      {/* Status da Transmissão Ativa */}
      {isTransmissionActive && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
              <h2 className="text-lg font-semibold text-green-800">
                {hasOBSStream && hasPlaylistStream ? 'MÚLTIPLAS TRANSMISSÕES ATIVAS' :
                  hasOBSStream ? 'TRANSMISSÃO OBS ATIVA' :
                    'TRANSMISSÃO DE PLAYLIST ATIVA'}
              </h2>
            </div>
            <button
              onClick={handleStopTransmission}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              {loading ? 'Finalizando...' : 'Finalizar Transmissão'}
            </button>
          </div>

          {/* Estatísticas da Transmissão */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {hasPlaylistStream && (
              <>
                <div className="bg-white p-4 rounded-md">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Espectadores (Playlist)</p>
                      <p className="text-xl font-bold">{streamStatus.transmission?.stats.viewers || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-md">
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Bitrate (Playlist)</p>
                      <p className="text-xl font-bold">{streamStatus.transmission?.stats.bitrate || 0} kbps</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {hasOBSStream && (
              <>
                <div className="bg-white p-4 rounded-md">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-purple-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Espectadores (OBS)</p>
                      <p className="text-xl font-bold">{streamStatus.obs_stream?.viewers || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-md">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-orange-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Bitrate (OBS)</p>
                      <p className="text-xl font-bold">{streamStatus.obs_stream?.bitrate || 0} kbps</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Tempo Ativo</p>
                  <p className="text-xl font-bold">
                    {hasPlaylistStream ? streamStatus.transmission?.stats.uptime :
                      hasOBSStream ? streamStatus.obs_stream?.uptime : '00:00:00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Plataformas Conectadas */}
          {(streamStatus.transmission?.platforms || streamStatus.obs_stream?.platforms) && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">Plataformas Conectadas:</h3>
              <div className="flex flex-wrap gap-2">
                {streamStatus.transmission?.platforms?.map((platform, index) => (
                  <span key={index} className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {platform.user_platform.platform.nome} (Playlist)
                  </span>
                ))}
                {streamStatus.obs_stream?.platforms?.map((platform, index) => (
                  <span key={`obs-${index}`} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {platform.name || 'OBS'} (OBS)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulário de Configuração */}
      {!isTransmissionActive && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Configurar Nova Transmissão</h2>

          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Transmissão *
                </label>
                <input
                  id="titulo"
                  type="text"
                  value={settings.titulo}
                  onChange={(e) => setSettings(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Digite o título da transmissão"
                />
              </div>

              <div>
                <label htmlFor="playlist" className="block text-sm font-medium text-gray-700 mb-2">
                  Playlist *
                </label>
                <select
                  id="playlist"
                  value={settings.playlist_id}
                  onChange={(e) => setSettings(prev => ({ ...prev, playlist_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecione uma playlist</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.nome} ({playlist.total_videos || 0} vídeos)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={settings.descricao}
                onChange={(e) => setSettings(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Descrição da transmissão (opcional)"
              />
            </div>

            {/* Configurações Avançadas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="bitrate" className="block text-sm font-medium text-gray-700 mb-2">
                  Bitrate (kbps)
                </label>
                <input
                  id="bitrate"
                  type="number"
                  min="500"
                  max={user?.bitrate || 5000}
                  value={settings.bitrate_override || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, bitrate_override: parseInt(e.target.value) || undefined }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder={`Padrão: ${user?.bitrate || 2500}`}
                />
                <p className="text-xs text-gray-500 mt-1">Máximo: {user?.bitrate || 2500} kbps</p>
              </div>

              <div>
                <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                  Logo/Marca d'água
                </label>
                <select
                  id="logo"
                  value={settings.logo_id || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, logo_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Sem logo</option>
                  {logos.map((logo) => (
                    <option key={logo.id} value={logo.id}>
                      {logo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  id="recording"
                  type="checkbox"
                  checked={settings.enable_recording}
                  onChange={(e) => setSettings(prev => ({ ...prev, enable_recording: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="recording" className="ml-3 text-sm text-gray-700">
                  Habilitar gravação
                </label>
              </div>
            </div>

            {/* Configurações de Logo */}
            {settings.logo_id && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posição da Logo
                  </label>
                  <select
                    value={settings.logo_position}
                    onChange={(e) => setSettings(prev => ({ ...prev, logo_position: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="top-left">Superior Esquerda</option>
                    <option value="top-right">Superior Direita</option>
                    <option value="bottom-left">Inferior Esquerda</option>
                    <option value="bottom-right">Inferior Direita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opacidade ({settings.logo_opacity}%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settings.logo_opacity}
                    onChange={(e) => setSettings(prev => ({ ...prev, logo_opacity: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setShowLogoUpload(true)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Nova Logo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Debug de Plataformas Configuradas */}
      {userPlatforms.length > 0 && (
        <div className="bg-gray-50 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Debug - Plataformas Configuradas</h2>
          <div className="space-y-3">
            {userPlatforms.map((platform) => (
              <div key={platform.id} className="bg-white p-3 rounded border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <strong>Plataforma:</strong> {platform.platform.nome}
                  </div>
                  <div>
                    <strong>RTMP URL:</strong> {platform.rtmp_url || platform.platform.rtmp_base_url || 'NÃO CONFIGURADO'}
                  </div>
                  <div>
                    <strong>Stream Key:</strong> {platform.stream_key ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plataformas Configuradas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Plataformas de Transmissão</h2>
          <button
            onClick={() => setShowPlatformModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Plataforma
          </button>
        </div>

        {userPlatforms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Radio className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma plataforma configurada</p>
            <p className="text-sm">Adicione plataformas para transmitir simultaneamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPlatforms.map((userPlatform) => (
              <div
                key={userPlatform.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${settings.platform_ids.includes(userPlatform.id.toString())
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                  } ${isTransmissionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isTransmissionActive && togglePlatformSelection(userPlatform.id.toString())}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{userPlatform.platform.nome}</h3>
                  <div className="flex items-center space-x-2">
                    {settings.platform_ids.includes(userPlatform.id.toString()) && (
                      <CheckCircle className="h-5 w-5 text-primary-600" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePlatform(userPlatform.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Remover plataforma"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Stream Key:</strong> {userPlatform.stream_key.substring(0, 10)}...</p>
                  <p><strong>RTMP URL:</strong> {(userPlatform.rtmp_url || userPlatform.platform.rtmp_base_url || '').substring(0, 30)}...</p>
                  {userPlatform.titulo_padrao && (
                    <p><strong>Título:</strong> {userPlatform.titulo_padrao}</p>
                  )}
                  <p className={`text-xs px-2 py-1 rounded ${userPlatform.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {userPlatform.ativo ? 'Ativa' : 'Inativa'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão de Iniciar Transmissão */}
        {!isTransmissionActive && userPlatforms.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleStartTransmission}
              disabled={loading || !settings.titulo || !settings.playlist_id || settings.platform_ids.length === 0}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-medium"
            >
              <Play className="h-6 w-6 mr-3" />
              {loading ? 'Iniciando...' : 'Iniciar Transmissão'}
            </button>
          </div>
        )}
      </div>

      {/* Modal de Configuração de Plataforma */}
      {showPlatformModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Configurar Plataforma</h3>
                <button
                  onClick={() => setShowPlatformModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma *
                </label>
                <select
                  value={platformForm.platform_id}
                  onChange={(e) => setPlatformForm(prev => ({ ...prev, platform_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecione uma plataforma</option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave de Transmissão (Stream Key) *
                </label>
                <input
                  type="text"
                  value={platformForm.stream_key}
                  onChange={(e) => setPlatformForm(prev => ({ ...prev, stream_key: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Cole aqui a stream key da plataforma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL RTMP (Opcional)
                </label>
                <input
                  type="text"
                  value={platformForm.rtmp_url}
                  onChange={(e) => setPlatformForm(prev => ({ ...prev, rtmp_url: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="URL RTMP personalizada (deixe vazio para usar padrão da plataforma)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se não preenchido, será usado o RTMP padrão da plataforma selecionada
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título Padrão
                </label>
                <input
                  type="text"
                  value={platformForm.titulo_padrao}
                  onChange={(e) => setPlatformForm(prev => ({ ...prev, titulo_padrao: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Título padrão para esta plataforma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição Padrão
                </label>
                <textarea
                  value={platformForm.descricao_padrao}
                  onChange={(e) => setPlatformForm(prev => ({ ...prev, descricao_padrao: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Descrição padrão para esta plataforma"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowPlatformModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfigurePlatform}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Salvar Plataforma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de Logo */}
      {showLogoUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Upload de Logo</h3>
                <button
                  onClick={() => setShowLogoUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Logo *
                </label>
                <input
                  type="text"
                  value={logoUpload.nome}
                  onChange={(e) => setLogoUpload(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Digite um nome para a logo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo de Imagem *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoUpload(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos suportados: PNG, JPG, GIF, WebP (máx. 10MB)
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoUpload(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogoUpload}
                disabled={logoUpload.uploading || !logoUpload.file || !logoUpload.nome}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoUpload.uploading ? 'Enviando...' : 'Enviar Logo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informações de Ajuda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-blue-900 font-medium mb-2">Como usar</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Configure suas plataformas de transmissão (YouTube, Facebook, etc.)</li>
              <li>• <strong>IMPORTANTE:</strong> Certifique-se de que a Stream Key está correta para cada plataforma</li>
              <li>• Selecione uma playlist com vídeos para transmitir</li>
              <li>• Escolha as plataformas onde deseja transmitir simultaneamente</li>
              <li>• Configure opções avançadas como logo e gravação</li>
              <li>• Clique em "Iniciar Transmissão" para começar</li>
              <li>• Para transmissão via OBS, use a página "Dados de Conexão"</li>
              <li>• <strong>Troubleshooting:</strong> Se a transmissão não aparecer na plataforma, verifique se a Stream Key está correta</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IniciarTransmissao;