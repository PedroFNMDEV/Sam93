import React, { useState, useEffect } from 'react';
import { ChevronLeft, Radio, Play, Square, AlertCircle, CheckCircle, ExternalLink, Wifi, WifiOff, Activity, Server, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface RelayStatus {
  id: string;
  relay_status: 'ativo' | 'inativo' | 'erro';
  relay_url: string;
  relay_type: 'rtmp' | 'm3u8' | 'hls';
  relay_error_details?: string;
  relay_started_at?: string;
  is_live: boolean;
  viewers: number;
  bitrate: number;
  uptime: string;
}

interface Server {
  id: string;
  nome: string;
  ip: string;
  porta_ssh: number;
  usuario_ssh: string;
}

const RelayRTMP: React.FC = () => {
  const { getToken, user } = useAuth();
  const [relayStatus, setRelayStatus] = useState<RelayStatus | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [urlValidationMessage, setUrlValidationMessage] = useState<string>('');
  
  const [formData, setFormData] = useState({
    relay_url: '',
    relay_type: 'rtmp' as 'rtmp' | 'm3u8' | 'hls',
    server_id: ''
  });

  useEffect(() => {
    loadInitialData();
    checkRelayStatus();
    
    // Atualizar status a cada 30 segundos se relay estiver ativo
    const interval = setInterval(() => {
      if (relayStatus?.relay_status === 'ativo') {
        checkRelayStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      const token = await getToken();
      
      // Carregar servidores (comentado pois a rota não está implementada)
      // const serversResponse = await fetch('/api/servers', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const serversData = await serversResponse.json();
      // setServers(serversData);
      
      // Usar servidores mock por enquanto
      setServers([
        { id: '1', nome: 'Servidor Principal', ip: '51.222.156.223', porta_ssh: 22, usuario_ssh: 'root' }
      ]);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados iniciais');
    }
  };

  const checkRelayStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/relay/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRelayStatus(data);
        
        if (data.relay_url) {
          setFormData(prev => ({
            ...prev,
            relay_url: data.relay_url,
            relay_type: data.relay_type || 'rtmp'
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status do relay:', error);
    }
  };

  const validateUrl = async (url: string) => {
    if (!url) {
      setUrlValid(null);
      setUrlValidationMessage('');
      return;
    }

    setCheckingUrl(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/relay/validate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });

      const result = await response.json();
      setUrlValid(result.valid);
      setUrlValidationMessage(result.message || '');
      
      if (!result.valid) {
        console.warn('URL inválida:', result.message);
      } else {
        console.log('URL válida:', result.message);
      }
    } catch (error) {
      console.error('Erro ao validar URL:', error);
      setUrlValid(false);
      setUrlValidationMessage('Erro ao validar URL');
    } finally {
      setCheckingUrl(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, relay_url: url }));
    
    // Auto-detectar tipo baseado na URL
    if (url.includes('.m3u8')) {
      setFormData(prev => ({ ...prev, relay_type: 'm3u8' }));
    } else if (url.startsWith('rtmp://')) {
      setFormData(prev => ({ ...prev, relay_type: 'rtmp' }));
    }

    // Limpar validação anterior
    setUrlValid(null);
    setUrlValidationMessage('');

    // Validar URL após 2 segundos de inatividade
    if (url.trim()) {
      const timeoutId = setTimeout(() => {
        validateUrl(url);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  };

  const manualValidateUrl = () => {
    if (formData.relay_url) {
      validateUrl(formData.relay_url);
    }
  };

  const startRelay = async () => {
    if (!formData.relay_url) {
      toast.error('URL do relay é obrigatória');
      return;
    }

    if (urlValid === false) {
      toast.error('A URL informada parece estar offline. Verifique e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/relay/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Relay ativado com sucesso!');
        checkRelayStatus();
      } else {
        toast.error(result.error || 'Falha ao ativar relay');
      }
    } catch (error) {
      console.error('Erro ao iniciar relay:', error);
      toast.error('Erro ao iniciar relay');
    } finally {
      setLoading(false);
    }
  };

  const stopRelay = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/relay/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Relay desativado com sucesso!');
        setRelayStatus(null);
        setFormData(prev => ({ ...prev, relay_url: '' }));
        setUrlValid(null);
      } else {
        toast.error(result.error || 'Erro ao desativar relay');
      }
    } catch (error) {
      console.error('Erro ao parar relay:', error);
      toast.error('Erro ao parar relay');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!relayStatus) return <WifiOff className="h-5 w-5 text-gray-400" />;
    
    switch (relayStatus.relay_status) {
      case 'ativo':
        return <Wifi className="h-5 w-5 text-green-600" />;
      case 'erro':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!relayStatus) return 'Inativo';
    
    switch (relayStatus.relay_status) {
      case 'ativo':
        return 'Ativo';
      case 'erro':
        return 'Erro';
      default:
        return 'Inativo';
    }
  };

  const getStatusColor = () => {
    if (!relayStatus) return 'text-gray-600';
    
    switch (relayStatus.relay_status) {
      case 'ativo':
        return 'text-green-600';
      case 'erro':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatUptime = (uptime: string) => {
    if (!uptime || uptime === '00:00:00') return 'N/A';
    return uptime;
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
        <Radio className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Relay RTMP/M3U8</h1>
      </div>

      {/* Informações sobre a funcionalidade */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-blue-900 font-medium mb-2">Como funciona o Relay</h3>
            <p className="text-blue-800 mb-3">
              Use esta função para configurar um relay fixo para seu streaming que ficará transmitindo 24 horas por dia.
              O relay captura um stream externo (RTMP ou M3U8) e retransmite através do seu canal.
            </p>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• <strong>RTMP:</strong> rtmp://servidor.com/live/stream_key</li>
              <li>• <strong>M3U8/HLS:</strong> https://servidor.com/stream/playlist.m3u8</li>
              <li>• O sistema verifica automaticamente se a URL está online antes de ativar</li>
              <li>• O relay funciona independentemente de outros tipos de transmissão</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status atual do relay */}
      {relayStatus && relayStatus.relay_status === 'ativo' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
              <h2 className="text-lg font-semibold text-green-800">RELAY ATIVO</h2>
            </div>
            <button
              onClick={stopRelay}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              {loading ? 'Desativando...' : 'Desativar Relay'}
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-green-600 mb-2">
              <strong>URL de origem:</strong> {relayStatus.relay_url}
            </p>
            <p className="text-sm text-green-600">
              <strong>Tipo:</strong> {relayStatus.relay_type?.toUpperCase()}
            </p>
            {relayStatus.relay_started_at && (
              <p className="text-sm text-green-600">
                <strong>Iniciado em:</strong> {new Date(relayStatus.relay_started_at).toLocaleString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-bold text-green-600">AO VIVO</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Espectadores</p>
                  <p className="text-lg font-bold">{relayStatus.viewers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Server className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Bitrate</p>
                  <p className="text-lg font-bold">{relayStatus.bitrate || 0} kbps</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md">
              <div className="flex items-center">
                <Wifi className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Tempo Ativo</p>
                  <p className="text-lg font-bold">{formatUptime(relayStatus.uptime)}</p>
                </div>
              </div>
            </div>
          </div>

          {relayStatus.relay_error_details && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">
                <strong>Detalhes do erro:</strong> {relayStatus.relay_error_details}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Configuração do relay */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Configuração do Relay</h2>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            <button
              onClick={checkRelayStatus}
              className="text-primary-600 hover:text-primary-800 ml-2"
              title="Atualizar status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="relay_url" className="block text-sm font-medium text-gray-700 mb-2">
              URL RTMP/M3U8 *
            </label>
            <div className="relative">
              <input
                id="relay_url"
                type="text"
                value={formData.relay_url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={`w-full px-4 py-2 pr-10 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                  urlValid === false ? 'border-red-500' : 
                  urlValid === true ? 'border-green-500' : 'border-gray-300'
                }`}
                placeholder="rtmp://servidor.com/live/stream_key ou https://servidor.com/stream/playlist.m3u8"
                disabled={relayStatus?.relay_status === 'ativo'}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {checkingUrl ? (
                  <Activity className="h-4 w-4 text-gray-400 animate-spin" />
                ) : urlValid === true ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : urlValid === false ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            </div>
            {urlValid === false && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {urlValidationMessage || 'URL inválida ou inacessível'}
              </p>
            )}
            {urlValid === true && (
              <p className="mt-1 text-sm text-green-600 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                {urlValidationMessage || 'URL válida e acessível'}
              </p>
            )}
            {checkingUrl && (
              <p className="mt-1 text-sm text-blue-600 flex items-center">
                <Activity className="h-3 w-3 mr-1 animate-spin" />
                Validando URL...
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Formatos aceitos: rtmp://servidor/app/stream OU https://servidor/stream.m3u8
            </p>
            <div className="mt-2">
              <button
                type="button"
                onClick={manualValidateUrl}
                disabled={!formData.relay_url || checkingUrl}
                className="text-xs text-primary-600 hover:text-primary-800 disabled:opacity-50"
              >
                {checkingUrl ? 'Validando...' : 'Validar URL agora'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="relay_type" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Stream
              </label>
              <select
                id="relay_type"
                value={formData.relay_type}
                onChange={(e) => setFormData(prev => ({ ...prev, relay_type: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={relayStatus?.relay_status === 'ativo'}
              >
                <option value="rtmp">RTMP</option>
                <option value="m3u8">M3U8/HLS</option>
              </select>
            </div>

            <div>
              <label htmlFor="server_id" className="block text-sm font-medium text-gray-700 mb-2">
                Servidor (Opcional)
              </label>
              <select
                id="server_id"
                value={formData.server_id}
                onChange={(e) => setFormData(prev => ({ ...prev, server_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={relayStatus?.relay_status === 'ativo'}
              >
                <option value="">Servidor padrão</option>
                {Array.isArray(servers) && servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.nome} ({server.ip})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            {relayStatus?.relay_status === 'ativo' ? (
              <button
                onClick={stopRelay}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                <Square className="h-4 w-4 mr-2" />
                {loading ? 'Desativando...' : 'Desativar Relay'}
              </button>
            ) : (
              <button
                onClick={startRelay}
                disabled={loading || !formData.relay_url || urlValid === false || checkingUrl}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Ativando...' : 'Ativar Relay'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Informações técnicas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Informações Técnicas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Seu Stream de Saída</h3>
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="font-mono text-sm">
                rtmp://samhost.wcore.com.br:1935/samhost/{user?.email?.split('@')[0] || 'usuario'}_live
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Este é o endereço que seus espectadores usarão para assistir
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">URL de Visualização (HLS)</h3>
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="font-mono text-sm">
                http://samhost.wcore.com.br:1935/samhost/{user?.email?.split('@')[0] || 'usuario'}_live/playlist.m3u8
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              URL para players que suportam HLS
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Importante</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• O relay funciona 24/7 enquanto estiver ativo</li>
            <li>• Certifique-se de que a URL de origem está sempre online</li>
            <li>• O sistema monitora automaticamente a conexão</li>
            <li>• Em caso de falha, o relay será automaticamente desativado</li>
            <li>• Apenas um relay pode estar ativo por vez</li>
            <li>• <strong>FFmpeg</strong> é usado para capturar e retransmitir o stream</li>
            <li>• Suporte a reconexão automática em caso de queda temporária</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-green-900 font-medium mb-2">✅ Recursos Implementados</h4>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• <strong>Validação em tempo real:</strong> Verifica se URL está online antes de ativar</li>
            <li>• <strong>Reconexão automática:</strong> Tenta reconectar automaticamente em caso de falha</li>
            <li>• <strong>Monitoramento de processo:</strong> Detecta se FFmpeg parou inesperadamente</li>
            <li>• <strong>Logs detalhados:</strong> Acompanhe o status e erros em tempo real</li>
            <li>• <strong>Cleanup automático:</strong> Remove processos órfãos na reinicialização</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Função auxiliar para formatar uptime
function formatUptime(uptime: string): string {
  if (!uptime || uptime === '00:00:00') return 'N/A';
  return uptime;
}

export default RelayRTMP;