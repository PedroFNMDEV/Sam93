import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Users, Globe, Monitor, Clock, Activity, MapPin, Smartphone, Eye, TrendingUp, RefreshCw, Download, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface Espectador {
  id: string;
  ip_hash: string;
  pais: string;
  cidade: string;
  latitude: number;
  longitude: number;
  dispositivo: string;
  navegador: string;
  resolucao: string;
  tempo_visualizacao: number;
  ativo: boolean;
  created_at: string;
  ultima_atividade: string;
  referrer?: string;
}

interface Estatisticas {
  total: number;
  ativos: number;
  paises: Record<string, number>;
  cidades: Record<string, number>;
  dispositivos: Record<string, number>;
  navegadores: Record<string, number>;
  tempoMedio: number;
}

interface PontoMapa {
  latitude: number;
  longitude: number;
  pais: string;
  cidade: string;
  count: number;
  ativos: number;
  ips: number;
}

interface DadosTempoReal {
  espectadoresAtivos: number;
  transmissaoAtiva: boolean;
  espectadores: Espectador[];
  timestamp: string;
}

interface HistoricoItem {
  timestamp: string;
  espectadores: number;
  tempoMedio: number;
}

const Espectadores: React.FC = () => {
  const { getToken } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const [espectadores, setEspectadores] = useState<Espectador[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    total: 0,
    ativos: 0,
    paises: {},
    cidades: {},
    dispositivos: {},
    navegadores: {},
    tempoMedio: 0
  });
  const [pontosMapa, setPontosMapa] = useState<PontoMapa[]>([]);
  const [dadosTempoReal, setDadosTempoReal] = useState<DadosTempoReal | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('24h');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [mapaCarregado, setMapaCarregado] = useState(false);

  useEffect(() => {
    loadEspectadores();
    loadDadosMapa();
    loadHistorico();
    
    // Atualizar dados em tempo real a cada 30 segundos
    const interval = setInterval(() => {
      loadDadosTempoReal();
    }, 30000);

    // Carregar dados em tempo real imediatamente
    loadDadosTempoReal();

    return () => clearInterval(interval);
  }, [periodo]);

  useEffect(() => {
    if (pontosMapa.length > 0 && !mapaCarregado) {
      initializeMap();
    }
  }, [pontosMapa, mapaCarregado]);

  const loadEspectadores = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/espectadores?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erro ao carregar espectadores');
      
      const data = await response.json();
      setEspectadores(data.espectadores);
      setEstatisticas(data.estatisticas);
    } catch (error) {
      console.error('Erro ao carregar espectadores:', error);
      toast.error('Erro ao carregar dados dos espectadores');
    } finally {
      setLoading(false);
    }
  };

  const loadDadosMapa = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/espectadores/mapa?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erro ao carregar dados do mapa');
      
      const data = await response.json();
      setPontosMapa(data);
    } catch (error) {
      console.error('Erro ao carregar dados do mapa:', error);
    }
  };

  const loadDadosTempoReal = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/espectadores/tempo-real', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erro ao carregar dados em tempo real');
      
      const data = await response.json();
      setDadosTempoReal(data);
    } catch (error) {
      console.error('Erro ao carregar dados em tempo real:', error);
    }
  };

  const loadHistorico = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/espectadores/historico?periodo=${periodo}&intervalo=1h`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erro ao carregar histórico');
      
      const data = await response.json();
      setHistorico(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || mapaCarregado) return;

    // Criar mapa simples com CSS e divs
    const mapContainer = mapRef.current;
    mapContainer.innerHTML = '';
    mapContainer.className = 'relative w-full h-96 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg overflow-hidden';

    // Adicionar pontos no mapa
    pontosMapa.forEach((ponto) => {
      const marker = document.createElement('div');
      marker.className = `absolute w-4 h-4 rounded-full cursor-pointer transform -translate-x-2 -translate-y-2 transition-all hover:scale-150 ${
        ponto.ativos > 0 ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
      }`;
      
      // Converter coordenadas para posição no mapa (simplificado)
      const x = ((ponto.longitude + 180) / 360) * 100;
      const y = ((90 - ponto.latitude) / 180) * 100;
      
      marker.style.left = `${Math.max(0, Math.min(100, x))}%`;
      marker.style.top = `${Math.max(0, Math.min(100, y))}%`;
      
      // Tooltip
      marker.title = `${ponto.cidade}, ${ponto.pais}\n${ponto.count} espectadores\n${ponto.ativos} ativos`;
      
      // Tamanho baseado no número de espectadores
      const size = Math.max(8, Math.min(24, 8 + (ponto.count * 2)));
      marker.style.width = `${size}px`;
      marker.style.height = `${size}px`;
      
      mapContainer.appendChild(marker);
    });

    // Adicionar legenda
    const legend = document.createElement('div');
    legend.className = 'absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg text-xs';
    legend.innerHTML = `
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-1">
          <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span>Ativos</span>
        </div>
        <div class="flex items-center space-x-1">
          <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Inativos</span>
        </div>
      </div>
    `;
    mapContainer.appendChild(legend);

    setMapaCarregado(true);
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    } else if (m > 0) {
      return `${m}m ${s}s`;
    } else {
      return `${s}s`;
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const getDeviceIcon = (dispositivo: string) => {
    if (dispositivo?.toLowerCase().includes('mobile') || dispositivo?.toLowerCase().includes('android') || dispositivo?.toLowerCase().includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const exportData = () => {
    const csvContent = [
      ['IP Hash', 'País', 'Cidade', 'Dispositivo', 'Navegador', 'Tempo Visualização', 'Status', 'Conectado em'].join(','),
      ...espectadores.map(e => [
        e.ip_hash,
        e.pais || '',
        e.cidade || '',
        e.dispositivo || '',
        e.navegador || '',
        e.tempo_visualizacao || 0,
        e.ativo ? 'Ativo' : 'Inativo',
        new Date(e.created_at).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `espectadores-${periodo}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Dados exportados com sucesso!');
  };

  const espectadoresFiltrados = espectadores.filter(e => {
    if (filtroAtivo === 'ativos') return e.ativo;
    if (filtroAtivo === 'inativos') return !e.ativo;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Espectadores</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="1h">Última hora</option>
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
          
          <button
            onClick={loadDadosTempoReal}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </button>
          
          <button
            onClick={exportData}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Dados em tempo real */}
      {dadosTempoReal && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-600" />
              Dados em Tempo Real
            </h2>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              Atualizado: {formatTimeAgo(dadosTempoReal.timestamp)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{dadosTempoReal.espectadoresAtivos}</p>
                  <p className="text-sm text-gray-600">Espectadores Ativos</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dadosTempoReal.transmissaoAtiva ? 'AO VIVO' : 'OFFLINE'}
                  </p>
                  <p className="text-sm text-gray-600">Status da Transmissão</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(estatisticas.paises).length}
                  </p>
                  <p className="text-sm text-gray-600">Países Diferentes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Espectadores</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ativos Agora</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.ativos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tempo Médio</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(estatisticas.tempoMedio)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Globe className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Países</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(estatisticas.paises).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa mundial */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Distribuição Geográfica
        </h2>
        <div ref={mapRef} className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          {pontosMapa.length === 0 ? (
            <p className="text-gray-500">Nenhum dado de localização disponível</p>
          ) : (
            <p className="text-gray-500">Carregando mapa...</p>
          )}
        </div>
      </div>

      {/* Gráfico de histórico */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Histórico de Audiência
        </h2>
        <div className="h-64 flex items-end space-x-2 overflow-x-auto">
          {historico.map((item, index) => {
            const maxEspectadores = Math.max(...historico.map(h => h.espectadores));
            const altura = maxEspectadores > 0 ? (item.espectadores / maxEspectadores) * 100 : 0;
            
            return (
              <div key={index} className="flex flex-col items-center min-w-0 flex-1">
                <div
                  className="bg-primary-600 rounded-t-md w-full min-w-8 hover:bg-primary-700 transition-colors cursor-pointer"
                  style={{ height: `${Math.max(altura, 2)}%` }}
                  title={`${new Date(item.timestamp).toLocaleString()}\n${item.espectadores} espectadores\nTempo médio: ${formatDuration(item.tempoMedio)}`}
                ></div>
                <span className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Análise por país e dispositivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Países</h3>
          <div className="space-y-3">
            {Object.entries(estatisticas.paises)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([pais, count]) => (
                <div key={pais} className="flex items-center justify-between">
                  <span className="text-gray-700">{pais}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${(count / estatisticas.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Dispositivos</h3>
          <div className="space-y-3">
            {Object.entries(estatisticas.dispositivos)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([dispositivo, count]) => (
                <div key={dispositivo} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getDeviceIcon(dispositivo)}
                    <span className="text-gray-700">{dispositivo}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(count / estatisticas.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Lista detalhada de espectadores */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Lista de Espectadores</h2>
          <div className="flex items-center space-x-4">
            <select
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="todos">Todos</option>
              <option value="ativos">Apenas Ativos</option>
              <option value="inativos">Apenas Inativos</option>
            </select>
            <Filter className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Localização</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Dispositivo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Navegador</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Tempo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Conectado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Última Atividade</th>
              </tr>
            </thead>
            <tbody>
              {espectadoresFiltrados.map((espectador) => (
                <tr key={espectador.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        espectador.ativo ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                      <span className={`text-sm ${
                        espectador.ativo ? 'text-green-700 font-medium' : 'text-gray-500'
                      }`}>
                        {espectador.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{espectador.cidade || 'N/A'}</div>
                      <div className="text-gray-500">{espectador.pais || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      {getDeviceIcon(espectador.dispositivo)}
                      <span className="ml-2 text-sm text-gray-700">{espectador.dispositivo || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">{espectador.navegador || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDuration(espectador.tempo_visualizacao || 0)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatTimeAgo(espectador.created_at)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatTimeAgo(espectador.ultima_atividade)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {espectadoresFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum espectador encontrado para o filtro selecionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Espectadores;