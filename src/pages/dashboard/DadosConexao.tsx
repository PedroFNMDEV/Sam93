import React, { useState, useEffect } from 'react';
import { ChevronLeft, Copy, Server, Wifi, Settings, Activity, Eye, EyeOff, Radio, Play, Square, RefreshCw, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface OBSConfig {
  rtmp_url: string;
  stream_key: string;
  hls_url: string;
  max_bitrate: number;
  max_viewers: number;
  recording_enabled: boolean;
  recording_path: string;
}

interface OBSStreamStatus {
  is_live: boolean;
  is_active: boolean;
  viewers: number;
  bitrate: number;
  uptime: string;
  recording: boolean;
  platforms: any[];
}

interface UserLimits {
  bitrate: {
    max: number;
    requested: number;
    allowed: number;
  };
  viewers: {
    max: number;
  };
  storage: {
    max: number;
    used: number;
    available: number;
    percentage: number;
  };
}

interface ServerInfo {
  server_id: string;
  server_url: string;
  status: string;
}

const DadosConexao: React.FC = () => {
  const { user, getToken } = useAuth();
  const [showFtpPassword, setShowFtpPassword] = useState(false);
  const [obsConfig, setObsConfig] = useState<OBSConfig | null>(null);
  const [obsStatus, setObsStatus] = useState<OBSStreamStatus | null>(null);
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [bitrateWarning, setBitrateWarning] = useState<string>('');
  const [customBitrate, setCustomBitrate] = useState<number | null>(null);
  const [showBitrateConfig, setShowBitrateConfig] = useState(false);
  const [bitrateValidation, setBitrateValidation] = useState<{
    isValid: boolean;
    message: string;
    canStream: boolean;
  }>({ isValid: true, message: '', canStream: true });
  const [wowzaStatus, setWowzaStatus] = useState<'online' | 'degraded' | 'offline'>('online');

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);

  useEffect(() => {
    loadOBSConfig();
    checkOBSStatus();

    // Atualizar status a cada 30 segundos
    const interval = setInterval(checkOBSStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOBSConfig = async () => {
    try {
      const token = await getToken();
      const url = customBitrate ?
        `/api/dados-conexao/obs-config?bitrate=${customBitrate}` :
        '/api/dados-conexao/obs-config';

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setObsConfig(data.obs_config);
          setUserLimits(data.user_limits);
          setServerInfo(data.server_info);
          setWarnings(data.warnings || []);
          setWowzaStatus(data.wowza_status || 'online');

          // Verificar se bitrate está dentro do limite
          if (data.user_limits?.bitrate) {
            const maxBitrate = data.user_limits.bitrate.max;
            const currentBitrate = data.obs_config?.max_bitrate || 0;

            if (currentBitrate > maxBitrate) {
              setBitrateWarning(`Atenção: Bitrate configurado (${currentBitrate} kbps) excede o limite do seu plano (${maxBitrate} kbps). O sistema limitará automaticamente para ${maxBitrate} kbps.`);
            } else {
              setBitrateWarning('');
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração OBS:', error);
      setWowzaStatus('offline');
    }
  };

  const checkOBSStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/obs-status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setObsStatus(data.obs_stream);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status OBS:', error);
    }
  };

  const stopOBSStream = async () => {
    if (!confirm('Deseja realmente parar a transmissão OBS?')) return;

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/obs-stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Transmissão OBS finalizada com sucesso!');
        checkOBSStatus();
      } else {
        toast.error(result.error || 'Erro ao finalizar transmissão');
      }
    } catch (error) {
      console.error('Erro ao parar stream OBS:', error);
      toast.error('Erro ao finalizar transmissão');
    } finally {
      setLoading(false);
    }
  };

  const handleBitrateChange = (newBitrate: number) => {
    const maxBitrate = userLimits?.bitrate.max || 2500;

    let validation = { isValid: true, message: '', canStream: true };

    if (newBitrate > maxBitrate) {
      validation = {
        isValid: false,
        message: `❌ BLOQUEADO: Bitrate ${newBitrate} kbps excede o limite do plano (${maxBitrate} kbps). A transmissão será rejeitada automaticamente.`,
        canStream: false
      };
    } else if (newBitrate > maxBitrate * 0.9) {
      validation = {
        isValid: true,
        message: `⚠️ ATENÇÃO: Bitrate ${newBitrate} kbps está próximo do limite (${maxBitrate} kbps). Recomendamos usar até ${Math.floor(maxBitrate * 0.9)} kbps para segurança.`,
        canStream: true
      };
    } else {
      validation = {
        isValid: true,
        message: `✅ Bitrate ${newBitrate} kbps está dentro do limite permitido.`,
        canStream: true
      };
    }

    setBitrateValidation(validation);
    setCustomBitrate(newBitrate);
  };

  const applyBitrateConfig = async () => {
    if (customBitrate) {
      await loadOBSConfig();
      setShowBitrateConfig(false);
      toast.success('Configuração de bitrate aplicada!');
    }
  };

  // Dados de conexão para OBS/Streamlabs (sem expor dados do Wowza)
  const connectionData = {
    serverUrl: 'streaming.exemplo.com',
    port: '1935',
    application: 'live',
    streamName: `${userLogin}_stream`,
    rtmpUrl: `rtmp://streaming.exemplo.com:1935/live`,
    streamKey: `${userLogin}_${Date.now()}`,
    hlsUrl: `https://streaming.exemplo.com/live/${userLogin}_stream/playlist.m3u8`
  };

  // Dados de conexão FTP reais baseados no código PHP
  const ftpData = {
    servidor: '51.222.156.223', // IP real do servidor
    usuario: userLogin, // Login do usuário baseado no email
    senha: 'Adr1an@2024!', // Senha real do sistema
    porta: '21' // Porta padrão FTP
  };

  // Dados do servidor FMS/RTMP real
  const fmsData = {
    servidor: user?.codigo_servidor ? `servidor-${user.codigo_servidor}.wcore.com.br` : 'samhost.wcore.com.br',
    porta: '1935', // Porta RTMP correta
    aplicacao: 'samhost',
    rtmpUrl: user?.codigo_servidor ?
      `rtmp://servidor-${user.codigo_servidor}.wcore.com.br:1935/samhost` :
      'rtmp://samhost.wcore.com.br:1935/samhost',
    usuario: userLogin,
    streamKey: `${userLogin}_live`,
    hlsUrl: user?.codigo_servidor ?
      `http://servidor-${user.codigo_servidor}.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8` :
      `http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8`
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
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
        <Server className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Dados de Conexão</h1>
      </div>

      {/* Avisos e Limites do Usuário */}
      {(warnings.length > 0 || userLimits) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-yellow-900 font-medium mb-3">⚠️ Informações Importantes</h3>
          
          {warnings.length > 0 && (
            <div className="mb-4">
              <h4 className="text-yellow-800 font-medium mb-2">Avisos:</h4>
              <ul className="text-yellow-700 text-sm space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {userLimits && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700">Bitrate Máximo</h4>
                <p className="text-lg font-bold text-gray-900">{userLimits.bitrate.max} kbps</p>
              </div>
              <div className="bg-white p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700">Espectadores Máximo</h4>
                <p className="text-lg font-bold text-gray-900">{userLimits.viewers.max}</p>
              </div>
              <div className="bg-white p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700">Armazenamento</h4>
                <p className="text-lg font-bold text-gray-900">
                  {userLimits.storage.used}MB / {userLimits.storage.max}MB
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className={`h-2 rounded-full ${
                      userLimits.storage.percentage > 90 ? 'bg-red-600' :
                      userLimits.storage.percentage > 70 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${userLimits.storage.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status da Transmissão OBS */}
      {obsStatus && obsStatus.is_live && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
              <h2 className="text-lg font-semibold text-green-800">TRANSMISSÃO OBS ATIVA</h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={checkOBSStatus}
                className="text-green-600 hover:text-green-800"
                title="Atualizar status"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={stopOBSStream}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                <Square className="h-4 w-4 mr-2" />
                {loading ? 'Finalizando...' : 'Finalizar Stream'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Espectadores</p>
                  <p className="text-xl font-bold">{obsStatus.viewers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Bitrate</p>
                  <p className="text-xl font-bold">{obsStatus.bitrate} kbps</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Wifi className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Tempo Ativo</p>
                  <p className="text-xl font-bold">{obsStatus.uptime}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Radio className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Gravação</p>
                  <p className="text-xl font-bold">{obsStatus.recording ? 'ATIVA' : 'INATIVA'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuração OBS/Streamlabs */}
      {obsConfig && (
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center space-x-2 mb-6">
            <Play className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Configuração OBS/Streamlabs</h2>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">PRONTO PARA USO</span>
            {wowzaStatus === 'degraded' && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">MODO DEGRADADO</span>
            )}
            {wowzaStatus === 'offline' && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">API OFFLINE</span>
            )}
            <button
              onClick={() => setShowBitrateConfig(!showBitrateConfig)}
              className="ml-auto text-primary-600 hover:text-primary-800 text-sm flex items-center"
            >
              <Settings className="h-4 w-4 mr-1" />
              Configurar Bitrate
            </button>
          </div>
          
          {/* Configuração de Bitrate */}
          {showBitrateConfig && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-blue-900 font-medium mb-3">⚙️ Configuração de Bitrate</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Bitrate Desejado (kbps)
                  </label>
                  <input
                    type="number"
                    min="500"
                    max={userLimits?.bitrate.max || 5000}
                    value={customBitrate || userLimits?.bitrate.max || 2500}
                    onChange={(e) => handleBitrateChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Máximo permitido: {userLimits?.bitrate.max || 2500} kbps
                  </p>
                  
                  {/* Validação em tempo real */}
                  {customBitrate && (
                    <div className={`mt-2 p-2 rounded-md text-xs ${
                      bitrateValidation.canStream ? 
                        bitrateValidation.isValid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={
                        bitrateValidation.canStream ? 
                          bitrateValidation.isValid ? 'text-green-800' : 'text-yellow-800'
                          : 'text-red-800'
                      }>
                        {bitrateValidation.message}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-end">
                  <button
                    onClick={applyBitrateConfig}
                    disabled={!customBitrate || !bitrateValidation.canStream}
                    className={`px-4 py-2 rounded-md disabled:opacity-50 ${
                      bitrateValidation.canStream ? 
                        'bg-primary-600 text-white hover:bg-primary-700' : 
                        'bg-red-600 text-white cursor-not-allowed'
                    }`}
                  >
                    {bitrateValidation.canStream ? 'Aplicar Configuração' : 'Bitrate Bloqueado'}
                  </button>
                </div>
              </div>
              
              {!bitrateValidation.canStream && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <h4 className="text-red-900 font-medium mb-2">🚫 Transmissão Bloqueada</h4>
                  <p className="text-red-800 text-sm mb-2">
                    O sistema bloqueará automaticamente transmissões que excedam o limite de bitrate do seu plano.
                  </p>
                  <p className="text-red-700 text-xs">
                    Para transmitir com bitrate maior, entre em contato para fazer upgrade do seu plano.
                  </p>
                </div>
              )}
            </div>
          )}
          <div>
            <p>
                🛡️ Proteção Ativa: O sistema rejeita automaticamente transmissões que excedam os limites do seu plano
              </p>
            </div>
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm font-medium">
                🚫 Bloqueio Automático: Transmissões com bitrate acima de {userLimits?.bitrate.max || user?.bitrate || 2500} kbps são rejeitadas
            </p>
            <table className="w-full">
              <tbody className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
                    Servidor RTMP
                  </td>
                  <td className="px-3 py-2 text-left">
                    <div className="flex items-center">
                      <span className="text-gray-900 font-mono text-sm">
                        {obsConfig.rtmp_url}
                      </span>
                      <button 
                        className="ml-2 text-primary-600 hover:text-primary-800"
                        onClick={() => copyToClipboard(obsConfig.rtmp_url, 'Servidor RTMP')}
                        title="Copiar"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                <tr className="border-b border-gray-200">
                  <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
                    Chave de Transmissão
                  </td>
                  <td className="px-3 py-2 text-left">
                    <div className="flex items-center">
                      <span className="text-gray-900 font-mono text-sm">
                        {obsConfig.stream_key}
                      </span>
                      <button 
                        className="ml-2 text-primary-600 hover:text-primary-800"
                        onClick={() => copyToClipboard(obsConfig.stream_key, 'Chave de Transmissão')}
                        title="Copiar"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                <tr className="border-b border-gray-200">
                  <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
                    Bitrate Configurado
                  </td>
                  <td className="px-3 py-2 text-left">
                    <div className="flex items-center">
                      <span className={`font-mono text-sm mr-2 ${
                        obsConfig.max_bitrate > (userLimits?.bitrate.max || 2500) ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {obsConfig.max_bitrate} kbps
                      </span>
                      {obsConfig.max_bitrate > (userLimits?.bitrate.max || 2500) && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          EXCEDE LIMITE
                        </span>
                      )}
                    </div>
                  </td>
                </tr>

                <tr className="border-b border-gray-200">
                  <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
                    Espectadores Máximo
                  </td>
                  <td className="px-3 py-2 text-left">
                    <span className="text-gray-900 font-mono text-sm">
                      {obsConfig.max_viewers}
                    </span>
                  </td>
                </tr>

                <tr className="border-b border-gray-200">
                  <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
                    URL de Visualização
                  </td>
                  <td className="px-3 py-2 text-left">
                    <div className="flex items-center">
                      <span className="text-gray-900 font-mono text-sm">
                        {obsConfig.hls_url}
                      </span>
                      <button 
                        className="ml-2 text-primary-600 hover:text-primary-800"
                        onClick={() => copyToClipboard(obsConfig.hls_url, 'URL de Visualização')}
                        title="Copiar"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
                    Gravação
                  </td>
                  <td className="px-3 py-2 text-left">
                    <span className={`text-sm px-2 py-1 rounded ${
                      obsConfig.recording_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {obsConfig.recording_enabled ? 'HABILITADA' : 'DESABILITADA'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-medium text-green-900 mb-2">🎥 Como usar no OBS/Streamlabs</h3>
            <div className="text-green-800 text-sm space-y-1">
              <p>1. <strong>Servidor:</strong> Cole a URL RTMP no campo "Servidor"</p>
              <p>2. <strong>Chave:</strong> Cole a chave de transmissão no campo "Chave de Transmissão"</p>
              <p>3. <strong>Bitrate:</strong> Configure o bitrate máximo de {userLimits?.bitrate.max || obsConfig.max_bitrate} kbps</p>
              <p>4. <strong>Resolução:</strong> Recomendado 1080p ou 720p</p>
              <p>5. Clique em "Iniciar Transmissão" no OBS</p>
              <p className="text-red-700 font-medium">⚠️ IMPORTANTE: Não exceda o bitrate de {userLimits?.bitrate.max || obsConfig.max_bitrate} kbps do seu plano!</p>
              <p className="text-red-700 font-medium">🚫 O sistema bloqueará automaticamente transmissões que excedam o limite</p>
              <p className="text-blue-700 font-medium">💡 Use a configuração de bitrate acima para testar diferentes valores</p>
              {wowzaStatus === 'degraded' && (
                <p className="text-yellow-700 font-medium">⚠️ MODO DEGRADADO: Wowza API indisponível, mas transmissões funcionam normalmente</p>
              )}
              {wowzaStatus === 'offline' && (
                <p className="text-red-700 font-medium">🔴 API OFFLINE: Algumas funcionalidades podem estar limitadas</p>
              )}
            </div>
          </div>
        </div >
      )}

{/* Servidor FMS/RTMP Principal */ }
<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
  <div className="flex items-center space-x-2 mb-6">
    <Radio className="h-6 w-6 text-red-600" />
    <h2 className="text-xl font-semibold text-gray-800">Servidor FMS/RTMP Principal</h2>
    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">PRINCIPAL</span>
  </div>

  {/* Tabela estilizada como no código PHP original */}
  <div className="border border-gray-300 rounded-lg overflow-hidden">
    <table className="w-full">
      <tbody className="bg-gray-50">
        {/* Servidor/Server/Host */}
        <tr className="border-b border-gray-200">
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Servidor/Server/Host
          </td>
          <td className="px-3 py-2 text-left">
            <div className="flex items-center">
              <span
                id="dados_fms_url"
                className="text-gray-900 font-mono text-sm"
              >
                {fmsData.servidor}
              </span>
              <button
                className="ml-2 text-primary-600 hover:text-primary-800"
                onClick={() => copyToClipboard(fmsData.servidor, 'Servidor FMS')}
                title="Copiar/Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Usuário */}
        <tr className="border-b border-gray-200">
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Usuário
          </td>
          <td className="px-3 py-2 text-left">
            <div className="flex items-center">
              <span
                id="dados_fms_login"
                className="text-gray-900 font-mono text-sm"
              >
                {fmsData.usuario}
              </span>
              <button
                className="ml-2 text-primary-600 hover:text-primary-800"
                onClick={() => copyToClipboard(fmsData.usuario, 'Usuário FMS')}
                title="Copiar/Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Porta RTMP */}
        <tr className="border-b border-gray-200">
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Porta RTMP
          </td>
          <td className="px-3 py-2 text-left">
            <span className="text-gray-900 font-mono text-sm">
              {fmsData.porta}
            </span>
          </td>
        </tr>

        {/* Aplicação */}
        <tr className="border-b border-gray-200">
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Aplicação
          </td>
          <td className="px-3 py-2 text-left">
            <div className="flex items-center">
              <span
                id="dados_fms_app"
                className="text-gray-900 font-mono text-sm"
              >
                {fmsData.aplicacao}
              </span>
              <button
                className="ml-2 text-primary-600 hover:text-primary-800"
                onClick={() => copyToClipboard(fmsData.aplicacao, 'Aplicação')}
                title="Copiar/Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* URL RTMP Completa */}
        <tr>
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            URL RTMP Completa
          </td>
          <td className="px-3 py-2 text-left">
            <div className="flex items-center">
              <span
                id="dados_fms_rtmp"
                className="text-gray-900 font-mono text-sm"
              >
                {fmsData.rtmpUrl}
              </span>
              <button
                className="ml-2 text-primary-600 hover:text-primary-800"
                onClick={() => copyToClipboard(fmsData.rtmpUrl, 'URL RTMP')}
                title="Copiar/Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  {/* Informações adicionais do FMS */}
  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
    <h3 className="text-sm font-medium text-red-900 mb-2">📡 Servidor FMS Principal</h3>
    <div className="text-red-800 text-sm space-y-1">
      <p>• <strong>URL para OBS/Streamlabs:</strong> {fmsData.rtmpUrl}</p>
      <p>• <strong>Stream Key:</strong> {fmsData.streamKey}</p>
      <p>• <strong>URL de Visualização (HLS):</strong> {fmsData.hlsUrl}</p>
      <p>• <strong>Bitrate Máximo:</strong> {userLimits?.bitrate.max || user?.bitrate || 2500} kbps</p>
      <p>• Este é o servidor principal para transmissões ao vivo</p>
      <p className="text-red-900 font-medium">⚠️ Transmissões que excedam o bitrate serão automaticamente rejeitadas</p>
    </div>
  </div>
</div>

{/* Dados de Conexão FTP - Exatamente como no PHP */ }
<div className="bg-white rounded-lg shadow-sm p-6">
  <div className="flex items-center space-x-2 mb-6">
    <Server className="h-6 w-6 text-purple-600" />
    <h2 className="text-xl font-semibold text-gray-800">Dados de Conexão FTP</h2>
  </div>

  {/* Tabela estilizada como no código PHP original */}
  <div className="border border-gray-300 rounded-lg overflow-hidden">
    <table className="w-full">
      <tbody className="bg-gray-50">
        {/* Servidor/Server/Host */}
        <tr className="border-b border-gray-200">
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Servidor/Server/Host
          </td>
          <td className="px-3 py-2 text-left">
            <div className="flex items-center">
              <span
                id="dados_ftp_url"
                className="text-gray-900 font-mono text-sm"
              >
                {ftpData.servidor}
              </span>
              <button
                className="ml-2 text-primary-600 hover:text-primary-800"
                onClick={() => copyToClipboard(ftpData.servidor, 'Servidor FTP')}
                title="Copiar/Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Usuário */}
        <tr className="border-b border-gray-200">
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Usuário
          </td>
          <td className="px-3 py-2 text-left">
            <div className="flex items-center">
              <span
                id="dados_ftp_login"
                className="text-gray-900 font-mono text-sm"
              >
                {ftpData.usuario}
              </span>
              <button
                className="ml-2 text-primary-600 hover:text-primary-800"
                onClick={() => copyToClipboard(ftpData.usuario, 'Usuário FTP')}
                title="Copiar/Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Senha */}
        <tr className="border-b border-gray-200">
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Senha
          </td>
          <td className="px-3 py-2 text-left">
            <div className="flex items-center">
              <div className="relative">
                <span
                  id="dados_ftp_senha"
                  className="text-gray-900 font-mono text-sm mr-2"
                >
                  {showFtpPassword ? ftpData.senha : '••••••••••••'}
                </span>
                <button
                  onClick={() => setShowFtpPassword(!showFtpPassword)}
                  className="text-gray-400 hover:text-gray-600 mr-2"
                  title={showFtpPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showFtpPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <button
                className="text-primary-600 hover:text-primary-800"
                onClick={() => copyToClipboard(ftpData.senha, 'Senha FTP')}
                title="Copiar/Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Porta FTP */}
        <tr>
          <td className="w-40 h-8 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
            Porta FTP
          </td>
          <td className="px-3 py-2 text-left">
            <span className="text-gray-900 font-mono text-sm">
              {ftpData.porta}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  {/* Informações adicionais */}
  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
    <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Informações de Acesso FTP</h3>
    <div className="text-blue-800 text-sm space-y-1">
      <p>• Use estes dados para conectar via cliente FTP (FileZilla, WinSCP, etc.)</p>
      <p>• Também pode ser usado na ferramenta de migração de vídeos</p>
      <p>• Porta padrão: 21 (FTP não seguro)</p>
      <p>• Servidor: {ftpData.servidor}</p>
    </div>
  </div>
</div>

{/* URLs de Transmissão */ }
<div className="bg-white rounded-lg shadow-sm p-6">
  <div className="flex items-center space-x-2 mb-4">
    <Wifi className="h-6 w-6 text-primary-600" />
    <h2 className="text-xl font-semibold text-gray-800">URLs de Transmissão</h2>
  </div>

  <div className="space-y-6">
    <div>
      <h3 className="text-sm font-medium text-gray-500">URL do Servidor FMS (Para OBS/Streamlabs)</h3>
      <div className="mt-1 flex items-center">
        <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full text-sm">
          {fmsData.rtmpUrl}
        </span>
        <button
          className="ml-2 text-primary-600 hover:text-primary-800"
          onClick={() => copyToClipboard(fmsData.rtmpUrl, 'URL do Servidor FMS')}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div>
      <h3 className="text-sm font-medium text-gray-500">Chave de Transmissão (Stream Key)</h3>
      <div className="mt-1 flex items-center">
        <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full text-sm">
          {fmsData.streamKey}
        </span>
        <button
          className="ml-2 text-primary-600 hover:text-primary-800"
          onClick={() => copyToClipboard(fmsData.streamKey, 'Chave de Transmissão')}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div>
      <h3 className="text-sm font-medium text-gray-500">URL de Visualização (HLS)</h3>
      <div className="mt-1 flex items-center">
        <span className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-md w-full text-sm">
          {fmsData.hlsUrl}
        </span>
        <button
          className="ml-2 text-primary-600 hover:text-primary-800"
          onClick={() => copyToClipboard(fmsData.hlsUrl, 'URL de Visualização')}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</div>

{/* Configurações Recomendadas */ }
<div className="bg-white rounded-lg shadow-sm p-6">
  <div className="flex items-center space-x-2 mb-4">
    <Settings className="h-6 w-6 text-primary-600" />
    <h2 className="text-xl font-semibold text-gray-800">Configurações Recomendadas</h2>
  </div>

  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">OBS Studio</h3>
      <p className="text-gray-600 mb-4">Configurações recomendadas para transmissão com OBS Studio</p>

      <div className="bg-gray-50 p-4 rounded-md">
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Servidor: <span className="font-medium font-mono">{fmsData.rtmpUrl}</span></li>
          <li>Chave de transmissão: <span className="font-medium font-mono">{fmsData.streamKey}</span></li>
          <li>Taxa de bits de vídeo: <span className="font-medium">Máximo {userLimits?.bitrate.max || user?.bitrate || 2500} Kbps</span></li>
          <li>Taxa de bits de áudio: <span className="font-medium">128-320 Kbps</span></li>
          <li>Resolução: <span className="font-medium">1920x1080 (1080p) ou 1280x720 (720p)</span></li>
          <li>FPS: <span className="font-medium">30 ou 60</span></li>
          <li>Preset de codificação: <span className="font-medium">veryfast ou fast</span></li>
          <li>Perfil: <span className="font-medium">main ou high</span></li>
          <li className="text-red-600 font-medium">⚠️ CRÍTICO: Não exceda {userLimits?.bitrate.max || user?.bitrate || 2500} kbps ou a transmissão será rejeitada</li>
        </ul>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">Streamlabs</h3>
      <p className="text-gray-600 mb-4">Configurações recomendadas para transmissão com Streamlabs</p>

      <div className="bg-gray-50 p-4 rounded-md">
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Servidor: <span className="font-medium font-mono">{fmsData.rtmpUrl}</span></li>
          <li>Chave de transmissão: <span className="font-medium font-mono">{fmsData.streamKey}</span></li>
          <li>Taxa de bits de vídeo: <span className="font-medium">Máximo {userLimits?.bitrate.max || user?.bitrate || 2500} Kbps</span></li>
          <li>Taxa de bits de áudio: <span className="font-medium">128-320 Kbps</span></li>
          <li>Resolução: <span className="font-medium">1920x1080 (1080p) ou 1280x720 (720p)</span></li>
          <li>FPS: <span className="font-medium">30 ou 60</span></li>
          <li>Preset de codificação: <span className="font-medium">veryfast ou fast</span></li>
          <li>Perfil: <span className="font-medium">main ou high</span></li>
          <li className="text-red-600 font-medium">⚠️ CRÍTICO: Não exceda {userLimits?.bitrate.max || user?.bitrate || 2500} kbps ou a transmissão será rejeitada</li>
        </ul>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">Qualidade de Transmissão</h3>
      <p className="text-gray-600 mb-4">Configurações baseadas na sua conexão de internet</p>

      <div className="bg-gray-50 p-4 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <h4 className="font-medium text-gray-800">Básica</h4>
            <p className="text-sm text-gray-600">720p @ 30fps</p>
            <p className="text-sm text-gray-600">1500-{Math.min(2500, userLimits?.bitrate.max || 2500)} Kbps</p>
          </div>
          <div className="text-center">
            <h4 className="font-medium text-gray-800">Boa</h4>
            <p className="text-sm text-gray-600">1080p @ 30fps</p>
            <p className="text-sm text-gray-600">2500-{Math.min(4000, userLimits?.bitrate.max || 4000)} Kbps</p>
          </div>
          <div className="text-center">
            <h4 className="font-medium text-gray-800">Excelente</h4>
            <p className="text-sm text-gray-600">1080p @ 60fps</p>
            <p className="text-sm text-gray-600">4000-{Math.min(6000, userLimits?.bitrate.max || 6000)} Kbps</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            <strong>Seu limite:</strong> {userLimits?.bitrate.max || user?.bitrate || 2500} kbps máximo
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

{/* Instruções */ }
<div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
  <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Instruções de Uso</h3>
  <div className="space-y-2 text-blue-800">
    <div className="flex items-start">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</div>
      <p><strong>Para OBS/Streamlabs:</strong> Use os dados da seção "Configuração OBS/Streamlabs" (recomendado)</p>
    </div>
    <div className="flex items-start">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</div>
      <p><strong>Para transmissão direta:</strong> Use a seção "Iniciar Transmissão" no painel</p>
    </div>
    <div className="flex items-start">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</div>
      <p><strong>Para migração:</strong> Use os dados FTP para migrar vídeos de outros servidores</p>
    </div>
    <div className="flex items-start">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</div>
      <p><strong>Gravações:</strong> Vídeos são salvos automaticamente no servidor quando habilitado</p>
    </div>
    <div className="flex items-start">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</div>
      <p><strong>Limites:</strong> O sistema bloqueia automaticamente transmissões que excedam os limites do plano</p>
    </div>
    <div className="flex items-start">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">6</div>
      <p><strong>Monitoramento:</strong> Acompanhe as estatísticas em tempo real no dashboard</p>
    </div>
  </div>

  <div className="mt-4 p-3 bg-blue-100 rounded-md">
    <h4 className="text-blue-900 font-medium mb-2">🚀 Sistema Pronto para Produção</h4>
    <p className="text-blue-800 text-sm">
      O sistema está configurado para receber transmissões via OBS, realizar transmissões diretas do painel,
      salvar vídeos no servidor Wowza e respeitar todos os limites de bitrate e espectadores do seu plano.
      {userLimits && (
        <span className="block mt-2 font-medium">
          Seu plano: {userLimits.bitrate.max} kbps • {userLimits.viewers.max} espectadores • {userLimits.storage.max}MB armazenamento
        </span>
      )}
    </p>
    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
      <p className="text-green-800 text-sm font-medium">
        🛡️ Proteção Ativa: O sistema monitora e bloqueia automaticamente transmissões que excedam os limites do seu plano
      </p>
      <p className="text-red-800 text-sm font-medium mt-1">
        🚫 Transmissões que excedam este limite serão automaticamente rejeitadas pelo servidor
      </p>
    </div>
  </div>
</div>
    </div >
  );
};

export default DadosConexao;