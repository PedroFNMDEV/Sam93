import React, { useEffect, useState } from 'react';
import { ChevronLeft, Save, Play, Trash2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

type Playlist = {
  id: number;
  nome: string;
};

type Folder = {
  id: number;
  nome: string;
};

type Video = {
  id: number;
  nome: string;
  duracao?: number;
  url?: string;
};

type ComercialConfig = {
  id?: number;
  id_playlist: number;
  id_folder_comerciais: number;
  quantidade_comerciais: number;
  intervalo_videos: number;
  ativo: boolean;
};

const Comerciais: React.FC = () => {
  const { getToken } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [comerciaisConfigs, setComerciaisConfigs] = useState<ComercialConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [quantidadeComerciais, setQuantidadeComerciais] = useState(1);
  const [intervaloVideos, setIntervaloVideos] = useState(3);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Preview state
  const [previewVideos, setPreviewVideos] = useState<Video[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchPlaylists();
    fetchFolders();
    fetchComerciaisConfigs();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/playlists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      toast.error('Erro ao carregar playlists');
    }
  };

  const fetchFolders = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/folders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      toast.error('Erro ao carregar pastas');
    }
  };

  const fetchComerciaisConfigs = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/comerciais', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setComerciaisConfigs(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de comerciais');
    }
  };

  const fetchVideosFromFolder = async (folderId: number) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/videos?folder_id=${folderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      toast.error('Erro ao carregar vídeos da pasta');
      return [];
    }
  };

  const handlePreview = async () => {
    if (!selectedFolder) {
      toast.error('Selecione uma pasta de comerciais');
      return;
    }

    const videos = await fetchVideosFromFolder(selectedFolder);
    setPreviewVideos(videos);
    setShowPreview(true);
  };

  const handleSave = async () => {
    if (!selectedPlaylist || !selectedFolder) {
      toast.error('Selecione uma playlist e uma pasta de comerciais');
      return;
    }

    if (quantidadeComerciais < 1 || intervaloVideos < 1) {
      toast.error('Quantidade de comerciais e intervalo devem ser maiores que 0');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/comerciais/${editingId}` : '/api/comerciais';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_playlist: selectedPlaylist,
          id_folder_comerciais: selectedFolder,
          quantidade_comerciais: quantidadeComerciais,
          intervalo_videos: intervaloVideos,
          ativo: true,
        }),
      });

      if (response.ok) {
        toast.success(editingId ? 'Configuração atualizada!' : 'Comerciais configurados com sucesso!');
        resetForm();
        fetchComerciaisConfigs();
      } else {
        throw new Error('Erro ao salvar configuração');
      }
    } catch (error) {
      toast.error('Erro ao salvar configuração de comerciais');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: ComercialConfig) => {
    setSelectedPlaylist(config.id_playlist);
    setSelectedFolder(config.id_folder_comerciais);
    setQuantidadeComerciais(config.quantidade_comerciais);
    setIntervaloVideos(config.intervalo_videos);
    setEditingId(config.id || null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja remover esta configuração de comerciais?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/comerciais/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Configuração removida com sucesso!');
        fetchComerciaisConfigs();
      } else {
        throw new Error('Erro ao remover configuração');
      }
    } catch (error) {
      toast.error('Erro ao remover configuração');
    }
  };

  const toggleActive = async (id: number, ativo: boolean) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/comerciais/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !ativo }),
      });

      if (response.ok) {
        toast.success(`Comerciais ${!ativo ? 'ativados' : 'desativados'}!`);
        fetchComerciaisConfigs();
      }
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const resetForm = () => {
    setSelectedPlaylist(null);
    setSelectedFolder(null);
    setQuantidadeComerciais(1);
    setIntervaloVideos(3);
    setEditingId(null);
  };

  const getPlaylistName = (id: number) => {
    const playlist = playlists.find(p => p.id === id);
    return playlist?.nome || 'Playlist não encontrada';
  };

  const getFolderName = (id: number) => {
    const folder = folders.find(f => f.id === id);
    return folder?.nome || 'Pasta não encontrada';
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getVideoUrl = (url: string) => {
    if (!url) return '';
    
    // Para vídeos SSH, usar URL diretamente
    if (url.includes('/api/videos-ssh/')) {
      return url;
    }
    
    if (url.startsWith('http')) {
      return url;
    }
    
    if (url.startsWith('/content')) {
      const token = localStorage.getItem('auth_token');
      return token ? `${url}${url.includes('?') ? '&' : '?'}auth_token=${encodeURIComponent(token)}` : url;
    } else if (url.startsWith('/')) {
      const token = localStorage.getItem('auth_token');
      const baseUrl = `/content${url}`;
      return token ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}auth_token=${encodeURIComponent(token)}` : baseUrl;
    }
    
    return url;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Gerenciar Comerciais</h1>

      {/* Formulário de Configuração */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {editingId ? 'Editar Configuração' : 'Nova Configuração de Comerciais'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="playlist" className="block text-sm font-medium text-gray-700 mb-1">
              Playlist
            </label>
            <select
              id="playlist"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={selectedPlaylist || ''}
              onChange={(e) => setSelectedPlaylist(Number(e.target.value) || null)}
            >
              <option value="">Selecione uma playlist</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="folder" className="block text-sm font-medium text-gray-700 mb-1">
              Pasta de Comerciais
            </label>
            <select
              id="folder"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(Number(e.target.value) || null)}
            >
              <option value="">Selecione uma pasta</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade de Comerciais
            </label>
            <input
              id="quantidade"
              type="number"
              min="1"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={quantidadeComerciais}
              onChange={(e) => setQuantidadeComerciais(Number(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Quantos comerciais inserir por vez</p>
          </div>

          <div>
            <label htmlFor="intervalo" className="block text-sm font-medium text-gray-700 mb-1">
              A cada quantos vídeos
            </label>
            <input
              id="intervalo"
              type="number"
              min="1"
              max="50"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={intervaloVideos}
              onChange={(e) => setIntervaloVideos(Number(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Inserir comerciais a cada X vídeos da playlist</p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="flex space-x-3">
            <button
              onClick={handlePreview}
              disabled={!selectedFolder}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center disabled:opacity-50"
            >
              <Play className="h-4 w-4 mr-2" />
              Visualizar Comerciais
            </button>
          </div>

          <div className="flex space-x-3">
            {editingId && (
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={loading || !selectedPlaylist || !selectedFolder}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Configurações Existentes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Configurações Ativas</h2>

        {comerciaisConfigs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma configuração de comerciais criada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Playlist</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Pasta de Comerciais</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Quantidade</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Intervalo</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {comerciaisConfigs.map((config) => (
                  <tr key={config.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{getPlaylistName(config.id_playlist)}</td>
                    <td className="py-3 px-4">{getFolderName(config.id_folder_comerciais)}</td>
                    <td className="py-3 px-4 text-center">{config.quantidade_comerciais}</td>
                    <td className="py-3 px-4 text-center">A cada {config.intervalo_videos} vídeos</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${config.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {config.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => toggleActive(config.id!, config.ativo)}
                          className={`p-1 rounded ${config.ativo
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                            }`}
                          title={config.ativo ? 'Desativar' : 'Ativar'}
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(config)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id!)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Comerciais da Pasta</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Fechar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {previewVideos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum vídeo encontrado nesta pasta</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {previewVideos.map((video) => (
                    <div key={video.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2 truncate">{video.nome}</h4>
                      {video.duracao && (
                        <p className="text-sm text-gray-500 mb-2">
                          Duração: {formatDuration(video.duracao)}
                        </p>
                      )}
                      {video.url && (
                        <video
                          src={getVideoUrl(video.url)}
                          className="w-full h-32 object-cover rounded"
                          controls
                          preload="metadata"
                          onError={(e) => {
                            console.error('Erro ao carregar vídeo comercial:', e);
                            // Mostrar placeholder em caso de erro
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comerciais;