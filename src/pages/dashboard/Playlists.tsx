import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, PlusCircle, X, Edit2, Trash2, Play, Minimize, Maximize } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import AdvancedVideoPlayer from '../../components/AdvancedVideoPlayer';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

interface Playlist {
  id: number;
  nome: string;
  quantidadeVideos?: number;
  duracaoTotal?: number;
}

interface Folder {
  id: number;
  nome: string;
}

interface Video {
  id: number;
  nome: string;
  url?: string;
  duracao?: number;
  tamanho?: number;
}

const Playlists: React.FC = () => {
  const { getToken } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nomePlaylist, setNomePlaylist] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [videosByFolder, setVideosByFolder] = useState<Record<number, Video[]>>({});
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});

  const [videoPlayerModalOpen, setVideoPlayerModalOpen] = useState(false);
  const [playlistVideosToPlay, setPlaylistVideosToPlay] = useState<Video[]>([]);
  const [playlistPlayerIndex, setPlaylistPlayerIndex] = useState(0);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({
    aberto: false,
    playlist: null as Playlist | null,
    titulo: '',
    mensagem: '',
    detalhes: ''
  });

  const closePlayerModal = () => {
    setVideoPlayerModalOpen(false);
    setPlaylistVideosToPlay([]);
    setPlaylistPlayerIndex(0);
    setCurrentVideoUrl('');
    setIsFullscreen(false);
  };

  // Função para construir URL correta do vídeo
  const buildVideoUrl = (url: string) => {
    if (!url) return '';
    
    // Se já é uma URL completa, usar como está
    if (url.startsWith('http')) {
      return url;
    }
    

    // Para o novo sistema, usar API para obter URL correta
    return `/api/videos/view-url?path=${encodeURIComponent(url)}`;
  };

  // Função otimizada para vídeos SSH
  const buildOptimizedSSHUrl = (url: string) => {
    if (!url.includes('/api/videos-ssh/stream/')) return url;
    
    const videoId = url.split('/stream/')[1]?.split('?')[0];
    if (videoId) {
      const token = localStorage.getItem('auth_token');
      return `/api/videos-ssh/proxy-stream/${videoId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }
    
    return url;
  };
  
  const carregarPlaylists = async () => {
    try {
      setStatus(null);
      const token = await getToken();
      if (!token) {
        setStatus('Usuário não autenticado');
        return;
      }

      const response = await fetch('/api/playlists', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar playlists');
      }

      const playlistsData = await response.json();
      
      // Carregar estatísticas para cada playlist
      const playlistsComStats = await Promise.all(
        playlistsData.map(async (playlist: Playlist) => {
          try {
            const videosResponse = await fetch(`/api/playlists/${playlist.id}/videos`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (videosResponse.ok) {
              const playlistVideos = await videosResponse.json();
              const quantidadeVideos = playlistVideos.length;
              const duracaoTotal = playlistVideos.reduce((acc: number, item: any) => {
                const duracao = item.videos?.duracao || 0;
                return acc + Math.ceil(duracao);
              }, 0);

              return { ...playlist, quantidadeVideos, duracaoTotal };
            }
          } catch (error) {
            console.error(`Erro ao carregar vídeos da playlist ${playlist.id}:`, error);
          }

          return { ...playlist, quantidadeVideos: 0, duracaoTotal: 0 };
        })
      );

      setPlaylists(playlistsComStats);
    } catch (error) {
      console.error('Erro ao carregar playlists:', error);
      setStatus('Erro ao carregar playlists');
    }
  };

  const carregarFoldersEVideos = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // Carregar folders
      const foldersResponse = await fetch('/api/folders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!foldersResponse.ok) {
        throw new Error('Erro ao carregar pastas');
      }

      const foldersData = await foldersResponse.json();
      setFolders(foldersData);
      setExpandedFolders(Object.fromEntries(foldersData.map((f: Folder) => [f.id, false])));

      // Carregar vídeos para cada folder
      const grouped: Record<number, Video[]> = {};
      foldersData.forEach((f: Folder) => grouped[f.id] = []);

      for (const folder of foldersData) {
        try {
          const videosResponse = await fetch(`/api/videos?folder_id=${folder.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (videosResponse.ok) {
            const videosData = await videosResponse.json();
            grouped[folder.id] = videosData;
          }
        } catch (error) {
          console.error(`Erro ao carregar vídeos da pasta ${folder.id}:`, error);
        }
      }

      setVideosByFolder(grouped);
    } catch (error) {
      console.error('Erro ao carregar pastas e vídeos:', error);
    }
  };

  useEffect(() => {
    carregarPlaylists();
  }, []);

  const abrirModal = async (playlist?: Playlist) => {
    setStatus(null);
    await carregarFoldersEVideos();
    
    if (playlist) {
      setNomePlaylist(playlist.nome ?? '');
      setEditingId(playlist.id);
      
      try {
        const token = await getToken();
        const response = await fetch(`/api/playlists/${playlist.id}/videos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const selected = await response.json();
          setSelectedVideos(selected.map((item: any) => item.videos));
        }
      } catch (error) {
        console.error('Erro ao carregar vídeos da playlist:', error);
      }
    } else {
      setNomePlaylist('');
      setEditingId(null);
      setSelectedVideos([]);
    }
    setShowModal(true);
  };

  const salvarPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = await getToken();
      if (!token) {
        setStatus('Usuário não autenticado');
        return;
      }

      let playlistId = editingId;

      if (editingId) {
        // Atualizar playlist existente
        const response = await fetch(`/api/playlists/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome: nomePlaylist,
            videos: selectedVideos.map((video, index) => ({
              id: video.id,
              ordem: index
            }))
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao atualizar playlist');
        }
      } else {
        // Criar nova playlist
        const response = await fetch('/api/playlists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ nome: nomePlaylist }),
        });

        if (!response.ok) {
          throw new Error('Erro ao criar playlist');
        }

        const data = await response.json();
        playlistId = data.id;

        // Adicionar vídeos à playlist
        if (playlistId && selectedVideos.length > 0) {
          const updateResponse = await fetch(`/api/playlists/${playlistId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              nome: nomePlaylist,
              videos: selectedVideos.map((video, index) => ({
                id: video.id,
                ordem: index
              }))
            }),
          });

          if (!updateResponse.ok) {
            throw new Error('Erro ao adicionar vídeos à playlist');
          }
        }
      }

      setShowModal(false);
      setNomePlaylist('');
      setEditingId(null);
      setSelectedVideos([]);
      carregarPlaylists();
      toast.success('Playlist salva com sucesso!');
    } catch (err: any) {
      setStatus(err.message || 'Erro ao salvar playlist');
      toast.error(err.message || 'Erro ao salvar playlist');
    } finally {
      setLoading(false);
    }
  };

  const confirmarDeletarPlaylist = (playlist: Playlist) => {
    setModalConfirmacao({
      aberto: true,
      playlist,
      titulo: 'Confirmar Exclusão da Playlist',
      mensagem: `Deseja realmente excluir a playlist "${playlist.nome}"?`,
      detalhes: 'Esta ação não pode ser desfeita. Certifique-se de que a playlist não está sendo usada em transmissões ou agendamentos.'
    });
  };

  const executarDelecaoPlaylist = async () => {
    const { playlist } = modalConfirmacao;
    if (!playlist) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.details || errorData.error || 'Erro ao excluir playlist');
        return;
      }

      toast.success('Playlist excluída com sucesso!');
      carregarPlaylists();
    } catch (error) {
      toast.error('Erro ao excluir playlist');
      console.error('Erro na exclusão:', error);
    } finally {
      setModalConfirmacao({
        aberto: false,
        playlist: null,
        titulo: '',
        mensagem: '',
        detalhes: ''
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (
      active.id.toString().startsWith('selected-') &&
      over.id.toString().startsWith('selected-')
    ) {
      const oldIndex = Number(active.id.toString().replace('selected-', ''));
      const newIndex = Number(over.id.toString().replace('selected-', ''));
      if (oldIndex !== newIndex) {
        setSelectedVideos((items) => arrayMove(items, oldIndex, newIndex));
      }
    } else if (
      active.id.toString().startsWith('available-') &&
      (over.id.toString() === 'selected-container' ||
        over.id.toString().startsWith('selected-'))
    ) {
      const videoId = Number(active.id.toString().replace('available-', ''));
      const video = Object.values(videosByFolder)
        .flat()
        .find((v) => v.id === videoId);
      if (video) {
        setSelectedVideos((prev) => [...prev, video]);
      }
    }
  };

  function AvailableVideo({ video, index }: { video: Video; index: number }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `available-${video.id}` });
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      cursor: 'grab',
    };
    return (
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="p-1 text-sm hover:bg-zinc-100 rounded flex justify-between items-center cursor-pointer"
      >
        <span onClick={() => setSelectedVideos((prev) => [...prev, video])}>
          {video.nome}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // Abrir modal do player
            setCurrentVideoUrl(buildVideoUrl(video.url || ''));
            setPlaylistVideosToPlay([video]);
            setPlaylistPlayerIndex(0);
            setVideoPlayerModalOpen(true);
          }}
          className="text-blue-600 hover:text-blue-800 p-1"
          title="Assistir vídeo"
        >
          <Play size={16} />
        </button>
      </li>
    );
  }

  function SelectedVideo({ video, index }: { video: Video; index: number }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `selected-${index}` });
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      cursor: 'grab',
    };
    return (
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex justify-between items-center p-2 mb-1 bg-zinc-100 rounded cursor-move"
      >
        <span>{video.nome}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentVideoUrl(buildOptimizedSSHUrl(buildVideoUrl(video.url || '')));
              setPlaylistVideosToPlay([video]);
              setPlaylistPlayerIndex(0);
              setVideoPlayerModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Assistir vídeo"
          >
            <Play size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedVideos((prev) => {
                const copy = [...prev];
                copy.splice(index, 1);
                return copy;
              });
            }}
            className="text-red-600"
            title="Remover vídeo"
          >
            <X size={16} />
          </button>
        </div>
      </li>
    );
  }

  const adicionarTodosDaPasta = (folderId: number) => {
    const videos = videosByFolder[folderId] || [];
    setSelectedVideos(prev => [...prev, ...videos]);
  };

  const removerTodos = () => setSelectedVideos([]);

  const toggleFolder = (id: number) => setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));

  const formatarDuracao = (s: number) =>
    [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
      .map(v => String(v).padStart(2, '0'))
      .join(':');

  const abrirPlayerPlaylist = async (playlistId: number) => {
    setPlaylistVideosToPlay([]);
    setPlaylistPlayerIndex(0);
    setVideoPlayerModalOpen(false);

    try {
      const token = await getToken();
      const response = await fetch(`/api/playlists/${playlistId}/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        toast.error('Erro ao carregar vídeos da playlist');
        return;
      }

      const playlistVideos = await response.json();
      const videos: Video[] = playlistVideos.map((item: any) => item.videos);
      
      if (videos.length === 0) {
        toast.warning('Esta playlist não possui vídeos');
        return;
      }
      
      setPlaylistVideosToPlay(videos);
      setPlaylistPlayerIndex(0);
      
      // Obter URL usando nova API
      const urlResponse = await fetch(`/api/videos/view-url?path=${encodeURIComponent(videos[0].url || '')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (urlResponse.ok) {
        const urlData = await urlResponse.json();
        if (urlData.success && urlData.view_url) {
          setCurrentVideoUrl(urlData.view_url);
        }
      }
      
      setVideoPlayerModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar playlist:', error);
      toast.error('Erro ao carregar vídeos da playlist');
    }
  };

  const handleVideoEnded = () => {
    if (playlistPlayerIndex < playlistVideosToPlay.length - 1) {
      const nextIndex = playlistPlayerIndex + 1;
      setPlaylistPlayerIndex(nextIndex);
      
      // Obter URL do próximo vídeo usando nova API
      fetch(`/api/videos/view-url?path=${encodeURIComponent(playlistVideosToPlay[nextIndex].url || '')}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.view_url) {
          setCurrentVideoUrl(data.view_url);
        }
      })
      .catch(error => {
        console.error('Erro ao obter URL do próximo vídeo:', error);
      });
    } else {
      // Repetir playlist do início
      setPlaylistPlayerIndex(0);
      
      // Obter URL do primeiro vídeo usando nova API
      fetch(`/api/videos/view-url?path=${encodeURIComponent(playlistVideosToPlay[0].url || '')}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.view_url) {
          setCurrentVideoUrl(data.view_url);
        }
      })
      .catch(error => {
        console.error('Erro ao obter URL do primeiro vídeo:', error);
      });
    }
  };

  const goToPreviousVideo = () => {
    if (playlistPlayerIndex > 0) {
      const prevIndex = playlistPlayerIndex - 1;
      setPlaylistPlayerIndex(prevIndex);
      
      // Obter URL do vídeo anterior usando nova API
      fetch(`/api/videos/view-url?path=${encodeURIComponent(playlistVideosToPlay[prevIndex].url || '')}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.view_url) {
          setCurrentVideoUrl(data.view_url);
        }
      })
      .catch(error => {
        console.error('Erro ao obter URL do vídeo anterior:', error);
      });
    }
  };

  const goToNextVideo = () => {
    if (playlistPlayerIndex < playlistVideosToPlay.length - 1) {
      const nextIndex = playlistPlayerIndex + 1;
      setPlaylistPlayerIndex(nextIndex);
      
      // Obter URL do próximo vídeo usando nova API
      fetch(`/api/videos/view-url?path=${encodeURIComponent(playlistVideosToPlay[nextIndex].url || '')}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.view_url) {
          setCurrentVideoUrl(data.view_url);
        }
      })
      .catch(error => {
        console.error('Erro ao obter URL do próximo vídeo:', error);
      });
    }
  };

  // Modal de confirmação
  function ModalConfirmacao({
    aberto,
    onFechar,
    onConfirmar,
    titulo,
    mensagem,
    detalhes,
  }: {
    aberto: boolean;
    onFechar: () => void;
    onConfirmar: () => void;
    titulo: string;
    mensagem: string;
    detalhes?: string;
  }) {
    if (!aberto) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{titulo}</h3>
          <p className="text-gray-700 mb-4">{mensagem}</p>
          {detalhes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">{detalhes}</p>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onFechar}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full h-full min-h-screen bg-white max-w-full overflow-x-hidden">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900">Playlists</h1>

        <button
          className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors duration-200 shadow"
          onClick={() => abrirModal()}
        >
          <PlusCircle size={20} />
          Nova Playlist
        </button>
      </header>

      <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm bg-white">
        <table className="w-full min-w-[500px] sm:min-w-[600px] border-collapse bg-white">
          <thead className="bg-blue-50">
            <tr>
              <th className="text-left p-4 font-semibold text-blue-800 border-b border-blue-100">Nome</th>
              <th className="text-center p-2 sm:p-4 font-semibold text-blue-800 border-b border-blue-100 w-20 sm:w-28">Qtd. Vídeos</th>
              <th className="text-center p-2 sm:p-4 font-semibold text-blue-800 border-b border-blue-100 w-24 sm:w-36 hidden sm:table-cell">Duração Total</th>
              <th className="text-center p-2 sm:p-4 font-semibold text-blue-800 border-b border-blue-100 w-24 sm:w-40">Ações</th>
            </tr>
          </thead>
          <tbody>
            {playlists.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 p-4 sm:p-6 text-sm">
                  Nenhuma playlist criada
                </td>
              </tr>
            )}
            {playlists.map((playlist) => (
              <tr
                key={playlist.id}
                className="cursor-pointer transition-colors duration-150 hover:bg-blue-100"
              >
                <td className="p-2 sm:p-4 max-w-[150px] sm:max-w-xs truncate text-sm sm:text-base">{playlist.nome}</td>
                <td className="p-2 sm:p-4 text-center text-sm sm:text-base">{playlist.quantidadeVideos ?? 0}</td>
                <td className="p-2 sm:p-4 text-center text-sm sm:text-base hidden sm:table-cell">
                  {playlist.duracaoTotal ? formatarDuracao(playlist.duracaoTotal) : '00:00:00'}
                </td>
                <td className="p-2 sm:p-4 flex justify-center gap-2 sm:gap-4 text-blue-600">
                  <button
                    title="Abrir player"
                    onClick={() => abrirPlayerPlaylist(playlist.id)}
                    className="hover:text-blue-800 transition"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    title="Editar"
                    onClick={() => abrirModal(playlist)}
                    className="hover:text-blue-800 transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    title="Deletar"
                    onClick={() => confirmarDeletarPlaylist(playlist)}
                    className="text-red-600 hover:text-red-800 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-2 sm:p-4 overflow-auto">
          <div className="bg-white rounded-xl p-4 sm:p-8 max-w-[95vw] sm:max-w-[90vw] max-h-[95vh] sm:max-h-[90vh] w-full overflow-auto shadow-2xl border border-gray-300">
            <form onSubmit={salvarPlaylist} className="h-full flex flex-col">
              <div className="mb-6">
                <label htmlFor="nome" className="block mb-2 font-semibold text-gray-800 text-lg">
                  Nome da playlist
                </label>
                <input
                  id="nome"
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={nomePlaylist}
                  onChange={(e) => setNomePlaylist(e.target.value)}
                  required
                />
              </div>

              <div className="mb-6 flex flex-col lg:flex-row gap-4 lg:gap-6 flex-grow overflow-hidden">
                {/* Lista de pastas e vídeos disponíveis */}
                <div className="w-full lg:flex-1 max-h-[300px] lg:max-h-full overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                  <h2 className="font-semibold mb-3 text-gray-900 text-lg">Pastas e vídeos disponíveis</h2>
                  {folders.map((folder) => (
                    <div key={folder.id} className="mb-3">
                      <div
                        className="flex items-center justify-between cursor-pointer select-none border-b border-gray-200 pb-2 mb-3 hover:bg-gray-100 transition-colors duration-200"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedFolders[folder.id] ? (
                            <ChevronDown size={20} className="text-blue-600" />
                          ) : (
                            <ChevronRight size={20} className="text-blue-600" />
                          )}
                          <span className="font-semibold text-gray-900 text-sm sm:text-lg truncate">{folder.nome}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            adicionarTodosDaPasta(folder.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                          title="Adicionar todos da pasta"
                        >
                          <PlusCircle size={18} />
                        </button>
                      </div>

                      {expandedFolders[folder.id] && (
                        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                          <SortableContext
                            items={videosByFolder[folder.id]?.map(v => `available-${v.id}`) || []}
                            strategy={verticalListSortingStrategy}
                          >
                            <ul>
                              {(videosByFolder[folder.id] || []).map((video, index) => (
                                <AvailableVideo key={video.id} video={video} index={index} />
                              ))}
                            </ul>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  ))}
                </div>

                {/* Lista de vídeos selecionados na playlist */}
                <div className="w-full lg:flex-1 max-h-[300px] lg:max-h-full overflow-y-auto border border-gray-300 rounded-md p-3 flex flex-col bg-gray-50">
                  <h2 className="font-semibold mb-3 flex justify-between items-center text-gray-900 text-lg">
                    Vídeos na playlist
                    <button
                      type="button"
                      onClick={removerTodos}
                      className="text-red-600 hover:text-red-800 transition-colors duration-200"
                      title="Remover todos"
                    >
                      <X size={20} />
                    </button>
                  </h2>

                  <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                    <SortableContext
                      items={selectedVideos.map((_, i) => `selected-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="flex-grow overflow-y-auto">
                        {selectedVideos.map((video, index) => (
                          <SelectedVideo key={`${video.id}-${index}`} video={video} index={index} />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              {status && <p className="mb-4 text-red-600 font-semibold">{status}</p>}

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-5 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal do Player Universal */}
      {videoPlayerModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex justify-center items-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closePlayerModal();
            }
          }}
        >
          <div className={`bg-black rounded-lg relative ${
            isFullscreen ? 'w-screen h-screen' : 'max-w-4xl w-full h-[70vh]'
          }`}>
            {/* Controles do Modal */}
            <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white bg-blue-600 hover:bg-blue-700 rounded-full p-3 transition-colors duration-200 shadow-lg"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
              
              <button
                onClick={closePlayerModal}
                className="text-white bg-red-600 hover:bg-red-700 rounded-full p-3 transition-colors duration-200 shadow-lg"
                title="Fechar player"
              >
                <X size={20} />
              </button>
            </div>

            {/* Título do Vídeo */}
            <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
              <h3 className="font-medium text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
                {playlistVideosToPlay[playlistPlayerIndex]?.nome || 'Playlist'}
              </h3>
              <p className="text-xs opacity-80">
                {playlistPlayerIndex + 1} de {playlistVideosToPlay.length}
              </p>
            </div>

            {/* Player Universal */}
            <div className={`w-full h-full ${isFullscreen ? 'p-0' : 'p-4 pt-16'}`}>
              <AdvancedVideoPlayer
                src={currentVideoUrl}
                title={playlistVideosToPlay[playlistPlayerIndex]?.nome}
                isLive={false}
                autoplay={true}
                controls
                className="w-full h-full"
                aspectRatio="16:9"
                onEnded={handleVideoEnded}
                onError={(error) => {
                  console.error('Erro no player:', error);
                  toast.error('Erro ao carregar vídeo');
                }}
              />
            </div>

            {/* Controles da playlist */}
            {playlistVideosToPlay.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg max-w-[90vw]">
                <div className="flex items-center justify-between space-x-6">
                  <button
                    disabled={playlistPlayerIndex === 0}
                    onClick={goToPreviousVideo}
                    className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 transition-colors duration-200 text-xs sm:text-sm font-medium"
                  >
                    ← Anterior
                  </button>

                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium">
                      {playlistPlayerIndex + 1} / {playlistVideosToPlay.length}
                    </div>
                    <div className="text-xs text-gray-300 max-w-[100px] sm:max-w-48 truncate">
                      {playlistVideosToPlay[playlistPlayerIndex]?.nome}
                    </div>
                  </div>

                  <button
                    disabled={playlistPlayerIndex === playlistVideosToPlay.length - 1}
                    onClick={goToNextVideo}
                    className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 transition-colors duration-200 text-xs sm:text-sm font-medium"
                  >
                    Próximo →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      <ModalConfirmacao
        aberto={modalConfirmacao.aberto}
        onFechar={() => setModalConfirmacao(prev => ({ ...prev, aberto: false }))}
        onConfirmar={executarDelecaoPlaylist}
        titulo={modalConfirmacao.titulo}
        mensagem={modalConfirmacao.mensagem}
        detalhes={modalConfirmacao.detalhes}
      />
    </div>
  );
};

export default Playlists;