import React, { useState, useEffect } from 'react';
import { ChevronLeft, Upload, Play, Trash2, FolderPlus, Video, Eye, EyeOff, RefreshCw, Edit2, Save, X, Maximize, Minimize, ExternalLink, Download, AlertCircle, CheckCircle, HardDrive, Folder, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import AdvancedVideoPlayer from '../../components/AdvancedVideoPlayer';

interface Video {
  id: number;
  nome: string;
  url: string;
  duracao?: number;
  tamanho?: number;
  bitrate_video?: number;
  formato_original?: string;
  codec_video?: string;
  is_mp4?: boolean;
  compativel?: string;
  largura?: number;
  altura?: number;
  folder?: string;
  user?: string;
  user_bitrate_limit?: number;
  bitrate_exceeds_limit?: boolean;
  needs_conversion?: boolean;
  compatibility_status?: string;
  compatibility_message?: string;
  codec_compatible?: boolean;
  format_compatible?: boolean;
}

interface Folder {
  id: number;
  nome: string;
  espaco?: number;
  espaco_usado?: number;
  servidor_id?: number;
  video_count_db?: number;
  server_info?: {
    exists: boolean;
    file_count: number;
    size_mb: number;
    path: string;
    error?: string;
  };
  percentage_used?: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

const GerenciarVideos: React.FC = () => {
  const { user, getToken } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadVideos();
      loadFolderInfo(selectedFolder);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setFolders(data);

      if (data.length > 0 && !selectedFolder) {
        setSelectedFolder(data[0].id.toString());
      }
    } catch (error) {
      toast.error('Erro ao carregar pastas');
    }
  };

  const loadFolderInfo = async (folderId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/folders/${folderId}/info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const folderInfo = await response.json();
        setFolders(prev => prev.map(f =>
          f.id.toString() === folderId ? { ...f, ...folderInfo } : f
        ));
      }
    } catch (error) {
      console.error('Erro ao carregar informações da pasta:', error);
    }
  };

  const loadVideos = async () => {
    if (!selectedFolder) return;

    setLoading(true);
    try {
      const token = await getToken();
      
      // Carregar vídeos diretamente (sem sincronização automática)
      const response = await fetch(`/api/videos?folder_id=${selectedFolder}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setVideos(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      toast.error('Erro ao carregar vídeos');
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Nome da pasta é obrigatório');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome: newFolderName.trim() })
      });

      if (response.ok) {
        const newFolder = await response.json();
        toast.success('Pasta criada com sucesso!');
        setShowNewFolderModal(false);
        setNewFolderName('');
        
        // Recarregar pastas imediatamente
        loadFolders();
        
        setSelectedFolder(newFolder.id.toString());
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao criar pasta');
      }
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      toast.error('Erro ao criar pasta');
    }
  };

  const editFolder = async () => {
    if (!editFolderName.trim() || !editingFolder) {
      toast.error('Nome da pasta é obrigatório');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome: editFolderName.trim() })
      });

      if (response.ok) {
        toast.success('Pasta renomeada com sucesso!');
        setShowEditFolderModal(false);
        setEditingFolder(null);
        setEditFolderName('');
        loadFolders();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao renomear pasta');
      }
    } catch (error) {
      console.error('Erro ao renomear pasta:', error);
      toast.error('Erro ao renomear pasta');
    }
  };

  const deleteFolder = async (folder: Folder) => {
    if (!confirm(`Deseja realmente excluir a pasta "${folder.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Pasta excluída com sucesso!');
        loadFolders();

        // Se a pasta excluída era a selecionada, limpar seleção
        if (selectedFolder === folder.id.toString()) {
          setSelectedFolder('');
          setVideos([]);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao excluir pasta');
      }
    } catch (error) {
      console.error('Erro ao excluir pasta:', error);
      toast.error('Erro ao excluir pasta');
    }
  };

  const syncFolder = async (folderId: string) => {
    try {
      const token = await getToken();
      
      // Primeiro sincronizar com banco de dados
      await fetch(`/api/videos-ssh/sync-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ folderId })
      });
      
      // Depois sincronizar pasta no servidor
      const response = await fetch(`/api/folders/${folderId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Pasta sincronizada com servidor!');
        loadFolderInfo(folderId);
        loadVideos(); // Recarregar vídeos após sincronização
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao sincronizar pasta');
      }
    } catch (error) {
      console.error('Erro ao sincronizar pasta:', error);
      toast.error('Erro ao sincronizar pasta');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedFolder) {
      toast.error('Selecione uma pasta primeiro');
      return;
    }

    setUploading(true);
    const progressArray: UploadProgress[] = Array.from(files).map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setUploadProgress(progressArray);

    try {
      const token = await getToken();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('video', file);

        try {
          const response = await fetch(`/api/videos/upload?folder_id=${selectedFolder}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });

          if (response.ok) {
            setUploadProgress(prev => prev.map(p =>
              p.fileName === file.name ? { ...p, progress: 100, status: 'completed' } : p
            ));
          } else {
            const errorData = await response.json();
            setUploadProgress(prev => prev.map(p =>
              p.fileName === file.name ? { ...p, status: 'error', error: errorData.error } : p
            ));
          }
        } catch (error) {
          setUploadProgress(prev => prev.map(p =>
            p.fileName === file.name ? { ...p, status: 'error', error: 'Erro de conexão' } : p
          ));
        }
      }

      const successCount = progressArray.filter(p => p.status === 'completed').length;
      if (successCount > 0) {
        toast.success(`${successCount} vídeo(s) enviado(s) com sucesso!`);
        loadVideos();
        loadFolderInfo(selectedFolder);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro no upload dos vídeos');
    } finally {
      setUploading(false);
      // Limpar progresso após 3 segundos
      setTimeout(() => setUploadProgress([]), 3000);
    }

    // Limpar input
    event.target.value = '';
  };

  const deleteVideo = async (video: Video) => {
    if (!confirm(`Deseja realmente excluir o vídeo "${video.nome}"?`)) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/videos/${video.id}?folder_id=${selectedFolder}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Vídeo excluído com sucesso!');
        loadVideos();
        loadFolderInfo(selectedFolder);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao excluir vídeo');
      }
    } catch (error) {
      console.error('Erro ao excluir vídeo:', error);
      toast.error('Erro ao excluir vídeo');
    }
  };

  // Função para construir URL direta do Wowza
  const buildWowzaDirectUrl = (video: Video) => {
    if (!video.url) return '';

    // Usar nova API para construir URL
    return `/api/videos/view-url?video_id=${video.id}`;
  };

  // Função para construir URL HLS do Wowza
  const buildWowzaHLSUrl = (video: Video) => {
    if (!video.url) return '';

    // Usar nova API para construir URL
    return `/api/videos/view-url?video_id=${video.id}`;
  };

  const openVideoPlayer = (video: Video) => {
    setCurrentVideo(video);
    setShowVideoModal(true);
  };

  const closeVideoPlayer = () => {
    setShowVideoModal(false);
    setCurrentVideo(null);
    setIsFullscreen(false);
  };

  const openVideoInNewTab = (video: Video) => {
    // Usar nova API para obter URL e abrir
    fetch(`/api/videos/view-url?video_id=${video.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.view_url) {
        window.open(data.view_url, '_blank');
      } else {
        toast.error('URL do vídeo não disponível');
      }
    })
    .catch(error => {
      console.error('Erro ao obter URL:', error);
      toast.error('Erro ao obter URL do vídeo');
    });
  };

  const downloadVideo = (video: Video) => {
    // Usar nova API para obter URL e fazer download
    fetch(`/api/videos/view-url?video_id=${video.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.view_url) {
        const link = document.createElement('a');
        link.href = data.view_url;
        link.download = video.nome;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download iniciado!');
      } else {
        toast.error('URL de download não disponível');
      }
    })
    .catch(error => {
      console.error('Erro ao obter URL:', error);
      toast.error('Erro ao obter URL de download');
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const [videoUrl, setVideoUrl] = useState('');
  const [videoHlsUrl, setVideoHlsUrl] = useState('');

  useEffect(() => {
    if (!currentVideo) return;

    // Carregar URL usando nova API
    fetch(`/api/videos/view-url?video_id=${currentVideo.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.view_url) {
        setVideoUrl(data.view_url);
        setVideoHlsUrl(data.view_url);
      }
    })
    .catch(error => {
      console.error('Erro ao carregar URLs:', error);
    });
  }, [currentVideo]);


  const selectedFolderData = folders.find(f => f.id.toString() === selectedFolder);

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <Video className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Vídeos</h1>
      </div>

      {/* Informações do usuário */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HardDrive className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-blue-900 font-medium">Informações do Plano</h3>
              <p className="text-blue-800 text-sm">
                Bitrate máximo: <strong>{user?.bitrate || 2500} kbps</strong> •
                Armazenamento: <strong>{user?.espaco || 1000} MB</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-800 text-sm">
              Servidor: <strong>Wowza (51.222.156.223)</strong>
            </p>
            <p className="text-blue-700 text-xs">
              Vídeos servidos diretamente do Wowza
            </p>
          </div>
        </div>
      </div>

      {/* Gerenciamento de Pastas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Pastas</h2>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedFolder === folder.id.toString()
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => setSelectedFolder(folder.id.toString())}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Folder className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-gray-900">{folder.nome}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder);
                      setEditFolderName(folder.nome);
                      setShowEditFolderModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Editar pasta"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      syncFolder(folder.id.toString());
                    }}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="Sincronizar com servidor"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder);
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Excluir pasta"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Vídeos (DB):</span>
                  <span>{folder.video_count_db || 0}</span>
                </div>
                {folder.server_info && (
                  <div className="flex justify-between">
                    <span>Arquivos (Servidor):</span>
                    <span className={folder.server_info.exists ? 'text-green-600' : 'text-red-600'}>
                      {folder.server_info.exists ? folder.server_info.file_count : 'N/A'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Espaço usado:</span>
                  <span>{folder.espaco_usado || 0} MB</span>
                </div>
                {folder.percentage_used !== undefined && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${folder.percentage_used > 90 ? 'bg-red-600' :
                        folder.percentage_used > 70 ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                      style={{ width: `${Math.min(100, folder.percentage_used)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {folder.server_info && !folder.server_info.exists && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ Pasta não existe no servidor
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Vídeos */}
      {selectedFolder && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-800">
                Vídeos - {selectedFolderData?.nome}
              </h2>
              {selectedFolderData?.server_info && (
                <span className={`text-xs px-2 py-1 rounded-full ${selectedFolderData.server_info.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  Servidor: {selectedFolderData.server_info.exists ? 'OK' : 'Erro'}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => syncFolder(selectedFolder)}
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                title="Sincronizar com servidor"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Sincronizar
              </button>
              <button
                onClick={loadVideos}
                disabled={loading}
                className="text-primary-600 hover:text-primary-800"
                title="Atualizar lista"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <label className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 cursor-pointer flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Upload Vídeos
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Progresso do Upload */}
          {uploadProgress.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-3">Progresso do Upload</h3>
              <div className="space-y-2">
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1 mr-4">
                      {progress.fileName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${progress.status === 'completed' ? 'bg-green-600' :
                            progress.status === 'error' ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                          style={{ width: `${progress.progress}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs ${progress.status === 'completed' ? 'text-green-600' :
                        progress.status === 'error' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                        {progress.status === 'completed' ? 'Concluído' :
                          progress.status === 'error' ? 'Erro' : 'Enviando...'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Nenhum vídeo encontrado</p>
              <p className="text-sm">Faça upload de vídeos para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Vídeo</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Formato</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Bitrate</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Tamanho</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Duração</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <Video className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 truncate max-w-xs" title={video.nome}>
                              {video.nome}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {video.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${video.is_mp4 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {video.formato_original?.toUpperCase() || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-medium ${video.bitrate_exceeds_limit ? 'text-red-600' : 'text-gray-900'
                            }`}>
                            {video.bitrate_video || 'N/A'} kbps
                          </span>
                          {video.bitrate_exceeds_limit && (
                            <span className="text-xs text-red-600">
                              Limite: {video.user_bitrate_limit} kbps
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {video.tamanho ? formatFileSize(video.tamanho) : 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {video.duracao ? formatDuration(video.duracao) : 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {video.compatibility_status === 'compatible' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : video.compatibility_status === 'needs_conversion' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className={`text-xs font-medium ${
                            video.compatibility_status === 'compatible' ? 'text-green-600' :
                            video.compatibility_status === 'needs_conversion' ? 'text-red-600' :
                            'text-yellow-600'
                            }`}>
                            {video.compatibility_message || 'Verificando...'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openVideoPlayer(video)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Reproduzir vídeo"
                          >
                            <Play className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => openVideoInNewTab(video)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Abrir em nova aba (Wowza direto)"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => downloadVideo(video)}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title="Download direto do Wowza"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => deleteVideo(video)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Excluir vídeo"
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

          {/* Informações da pasta selecionada */}
          {selectedFolderData && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Informações da Pasta</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Vídeos no banco:</span>
                  <span className="ml-2 font-medium">{selectedFolderData.video_count_db || 0}</span>
                </div>
                {selectedFolderData.server_info && (
                  <div>
                    <span className="text-gray-600">Arquivos no servidor:</span>
                    <span className={`ml-2 font-medium ${selectedFolderData.server_info.exists ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {selectedFolderData.server_info.exists ? selectedFolderData.server_info.file_count : 'Pasta não existe'}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Espaço usado:</span>
                  <span className="ml-2 font-medium">
                    {selectedFolderData.espaco_usado || 0} MB
                  </span>
                </div>
              </div>

              {selectedFolderData.server_info?.path && (
                <div className="mt-2 text-xs text-gray-500">
                  <span>Caminho no servidor:</span>
                  <span className="ml-2 font-mono">{selectedFolderData.server_info.path}</span>
                </div>
              )}
              
              {selectedFolderData.server_info && !selectedFolderData.server_info.exists && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Pasta não existe no servidor. Clique em "Sincronizar" para criar.
                    </p>
                    <button
                      onClick={() => syncFolder(selectedFolder)}
                      className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
                    >
                      Sincronizar Agora
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Pasta</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da pasta:
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite o nome da pasta"
                onKeyPress={(e) => e.key === 'Enter' && createFolder()}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                Criar Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Pasta */}
      {showEditFolderModal && editingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Pasta</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da pasta:
              </label>
              <input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite o novo nome da pasta"
                onKeyPress={(e) => e.key === 'Enter' && editFolder()}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditFolderModal(false);
                  setEditingFolder(null);
                  setEditFolderName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={editFolder}
                disabled={!editFolderName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Player */}
      {showVideoModal && currentVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeVideoPlayer();
            }
          }}
        >
          <div className={`bg-black rounded-lg relative ${isFullscreen ? 'w-screen h-screen' : 'max-w-4xl w-full h-[70vh]'
            }`}>
            {/* Controles do Modal */}
            <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
              <button
                onClick={() => openVideoInNewTab(currentVideo)}
                className="text-white bg-green-600 hover:bg-green-700 rounded-full p-3 transition-colors duration-200 shadow-lg"
                title="Abrir no Wowza (nova aba)"
              >
                <ExternalLink size={20} />
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white bg-blue-600 hover:bg-blue-700 rounded-full p-3 transition-colors duration-200 shadow-lg"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>

              <button
                onClick={closeVideoPlayer}
                className="text-white bg-red-600 hover:bg-red-700 rounded-full p-3 transition-colors duration-200 shadow-lg"
                title="Fechar player"
              >
                <X size={20} />
              </button>
            </div>

            {/* Título do Vídeo */}
            <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
              <h3 className="font-medium">{currentVideo.nome}</h3>
              <p className="text-xs opacity-80">
                {currentVideo.formato_original?.toUpperCase()} • 
                {currentVideo.codec_video?.toUpperCase()} • 
                {currentVideo.bitrate_video || 0} kbps •
                {currentVideo.largura}x{currentVideo.altura} •
                {currentVideo.duracao ? formatDuration(currentVideo.duracao) : 'N/A'}
              </p>
              <p className="text-xs opacity-60">
                Servidor: Wowza (51.222.156.223)
              </p>
              {currentVideo.needs_conversion && (
                <p className="text-xs text-red-400 font-medium">
                  ⚠️ Necessário Conversão
                </p>
              )}
            </div>

            {/* Player HTML5 com URL direta do Wowza */}
            <div className={`w-full h-full ${isFullscreen ? 'p-0' : 'p-4 pt-16'}`}>
              <AdvancedVideoPlayer
                src={`/api/videos/view-url?video_id=${currentVideo.id}`}
                title={currentVideo.nome}
                isLive={false}
                autoplay
                controls
                className="w-full h-full"
                aspectRatio="16:9"
                onError={(e) => {
                  console.error('Erro no player:', e);
                  // Fallback: abrir em nova aba usando nova API
                  openVideoInNewTab(currentVideo);
                }}
                streamStats={{
                  bitrate: currentVideo.bitrate_video,
                  quality: `${currentVideo.formato_original?.toUpperCase()} • ${currentVideo.codec_video?.toUpperCase()} • ${formatFileSize(currentVideo.tamanho || 0)}`
                }}
                socialSharing={{
                  enabled: false,
                  platforms: []
                }}
                watermark={{
                  url: '',
                  position: 'top-right',
                  opacity: 0.5
                }}
              />
            </div>

            {/* Informações técnicas */}
            <div className="absolute bottom-4 left-4 z-20 bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-xs">
              <p>Sistema: Visualização Otimizada</p>
              <p>Formato: Sistema Padronizado</p>
              <p>URL: play.php (porta 1443)</p>
            </div>
          </div>
        </div>
      )}

      {/* Informações de ajuda */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-green-900 font-medium mb-2">🎯 Sistema de Visualização Otimizado</h3>
            <ul className="text-green-800 text-sm space-y-1">
              <li>• <strong>URLs padronizadas:</strong> Formato https://dominio:1443/play.php?login=usuario&video=pasta/arquivo.mp4</li>
              <li>• <strong>Análise automática:</strong> Bitrate, codec e resolução detectados automaticamente</li>
              <li>• <strong>Otimização recomendada:</strong> Mesmo vídeos compatíveis podem ser otimizados</li>
              <li>• <strong>Sanitização automática:</strong> Nomes de pastas convertidos para minúsculas sem acentos</li>
              <li>• <strong>Domínio dinâmico:</strong> URLs baseadas no servidor configurado no banco de dados</li>
              <li>• <strong>Gerenciamento de pastas:</strong> Criação, edição e exclusão sincronizada com servidor</li>
              <li>• <strong>Sincronização automática:</strong> Pastas e vídeos sempre em sincronia</li>
              <li>• <strong>Monitoramento de espaço:</strong> Controle em tempo real do uso de armazenamento</li>
              <li>• <strong>Conversão inteligente:</strong> Sistema detecta e recomenda otimizações necessárias</li>
              <li>• <strong>Porta padrão:</strong> 1443 para todas as visualizações</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerenciarVideos;