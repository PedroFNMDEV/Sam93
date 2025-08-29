import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, Youtube, CheckCircle, AlertCircle, Loader, RefreshCw, X, Play, Clock, HardDrive, Eye, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Folder = {
  id: number;
  nome: string;
};

interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  filesize: number;
  uploader: string;
  view_count: number;
  thumbnail: string;
}

interface DownloadStatus {
  downloading: boolean;
  status: 'idle' | 'downloading' | 'uploading' | 'completed' | 'error';
  progress: number;
  filename?: string;
  video_title?: string;
  uptime?: number;
  error?: string;
  final_size?: number;
  video_id?: number;
}

interface RecentDownload {
  id: number;
  nome: string;
  duracao: number;
  tamanho_mb: number;
  data_download: string;
}

type DownloadResponse = {
  success: boolean;
  download_id: string;
  video_info: VideoInfo;
  estimated_size_mb: number;
  message: string;
  error?: string;
};

export default function BaixarYoutube() {
  const { getToken } = useAuth();
  const [url, setUrl] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [idPasta, setIdPasta] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null);
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const [showRecentDownloads, setShowRecentDownloads] = useState(false);
  const [validatingUrl, setValidatingUrl] = useState(false);

  useEffect(() => {
    loadFolders();
    loadRecentDownloads();
    
    // Verificar status de download a cada 5 segundos se estiver baixando
    const interval = setInterval(() => {
      if (downloading) {
        checkDownloadStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [getToken]);

  const loadFolders = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Usuário não autenticado');

      const response = await fetch('/api/folders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar pastas');
      }

      const data: Folder[] = await response.json();
      setFolders(data);
      
      // Selecionar primeira pasta por padrão
      if (data.length > 0 && !idPasta) {
        setIdPasta(data[0].id.toString());
      }
    } catch (err) {
      toast.error('Erro ao carregar pastas');
    }
  };

  const loadRecentDownloads = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/downloadyoutube/recent', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentDownloads(data.downloads);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar downloads recentes:', error);
    }
  };

  const checkDownloadStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/downloadyoutube/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDownloadStatus(data);
          setDownloading(data.downloading);
          
          // Se download foi concluído, recarregar downloads recentes
          if (data.status === 'completed' && downloading) {
            toast.success(`Download concluído: ${data.video_title}`);
            loadRecentDownloads();
            setUrl('');
            setVideoInfo(null);
            setUrlValid(null);
          } else if (data.status === 'error' && downloading) {
            toast.error(`Erro no download: ${data.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const validateYouTubeUrl = async (url: string) => {
    if (!url.trim()) {
      setUrlValid(null);
      setVideoInfo(null);
      return;
    }

    setValidatingUrl(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/downloadyoutube/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });

      const result = await response.json();
      setUrlValid(result.valid);
      
      if (result.valid && result.video_info) {
        // Obter informações completas do vídeo
        const infoResponse = await fetch('/api/downloadyoutube/info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ url })
        });
        
        if (infoResponse.ok) {
          const infoData = await infoResponse.json();
          if (infoData.success) {
            setVideoInfo(infoData.video_info);
          }
        }
      } else {
        setVideoInfo(null);
        if (!result.valid) {
          toast.warning(result.message || 'URL inválida');
        }
      }
    } catch (error) {
      console.error('Erro ao validar URL:', error);
      setUrlValid(false);
      setVideoInfo(null);
    } finally {
      setValidatingUrl(false);
    }
  };

  const validateYouTubeUrla= (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/;
    return youtubeRegex.test(url);
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setVideoInfo(null);
    
    if (newUrl.trim()) {
      // Validação básica de formato
      const basicValid = validateYouTubeUrla(newUrl);
      if (basicValid) {
        // Validar com servidor após 2 segundos
        const timeoutId = setTimeout(() => {
          validateYouTubeUrl(newUrl);
        }, 2000);
        return () => clearTimeout(timeoutId);
      } else {
        setUrlValid(false);
      }
    } else {
      setUrlValid(null);
    }
  };

  const cancelDownload = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/downloadyoutube/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Download cancelado');
        setDownloading(false);
        setDownloadStatus(null);
      }
    } catch (error) {
      console.error('Erro ao cancelar download:', error);
      toast.error('Erro ao cancelar download');
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url || !idPasta) {
      toast.warning('Preencha o link e selecione uma pasta');
      return;
    }

    if (urlValid !== true) {
      toast.error('URL deve ser do YouTube (youtube.com ou youtu.be)');
      return;
    }

    if (downloading) {
      toast.warning('Já existe um download em andamento');
      return;
    }

    try {
      setDownloading(true);
      const token = await getToken();
      if (!token) throw new Error('Usuário não autenticado');

      const response = await fetch('/api/downloadyoutube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url,
          id_pasta: idPasta,
          quality: 'best[height<=1080]',
          format: 'mp4'
        }),
      });

      const data: DownloadResponse = await response.json();

      if (data.success) {
        toast.success(data.message);
        // Não limpar URL ainda - aguardar conclusão do download
      } else {
        throw new Error(data.error || 'Erro ao iniciar download');
      }
    } catch (err: any) {
      console.error('Erro no download:', err);
      toast.error(err.message || 'Erro ao baixar vídeo');
      setDownloading(false);
    } finally {
      // Não definir loading como false aqui - será definido quando download terminar
    }
  };

  const formatFileSize = (bytes: number): string => {
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
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Youtube className="h-8 w-8 text-red-600" />
        <h1 className="text-3xl font-bold text-gray-900">Download do YouTube</h1>
      </div>

      {/* Status do download ativo */}
      {downloading && downloadStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Loader className="h-5 w-5 text-blue-600 animate-spin mr-3" />
              <h2 className="text-lg font-semibold text-blue-800">
                {downloadStatus.status === 'downloading' ? 'Baixando do YouTube' :
                 downloadStatus.status === 'uploading' ? 'Enviando para Servidor' :
                 'Processando Download'}
              </h2>
            </div>
            <button
              onClick={cancelDownload}
              className="text-red-600 hover:text-red-800 flex items-center text-sm"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-700 font-medium">
                  {downloadStatus.video_title || downloadStatus.filename}
                </span>
                <span className="text-blue-600">
                  {downloadStatus.progress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadStatus.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-blue-700">
                  Tempo: {downloadStatus.uptime ? Math.floor(downloadStatus.uptime / 60) : 0}m {downloadStatus.uptime ? downloadStatus.uptime % 60 : 0}s
                </span>
              </div>
              <div className="flex items-center">
                <Download className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-blue-700">
                  Status: {downloadStatus.status === 'downloading' ? 'Baixando' :
                          downloadStatus.status === 'uploading' ? 'Enviando' : 'Processando'}
                </span>
              </div>
              {downloadStatus.final_size && (
                <div className="flex items-center">
                  <HardDrive className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-blue-700">
                    Tamanho: {formatFileSize(downloadStatus.final_size)}
                  </span>
                </div>
              )}
            </div>

            {downloadStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">
                  <strong>Erro:</strong> {downloadStatus.error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informações de ajuda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-blue-900 font-medium mb-2">Como usar</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Cole o link do vídeo do YouTube que deseja baixar</li>
              <li>• O sistema verificará automaticamente se o vídeo está disponível</li>
              <li>• Selecione a pasta onde o vídeo será salvo</li>
              <li>• Clique em "Baixar Vídeo" e aguarde o download</li>
              <li>• O vídeo será salvo automaticamente na pasta selecionada</li>
              <li>• <strong>Qualidade:</strong> Melhor qualidade disponível até 1080p</li>
              <li>• <strong>Formato:</strong> Sempre convertido para MP4 para máxima compatibilidade</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" /> Baixar vídeo do YouTube
        </h2>

        <form onSubmit={handleDownload} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Link do YouTube *</label>
            <div className="relative">
              <input
                type="url"
                className={`w-full border rounded-lg px-3 py-2 pr-10 ${
                  urlValid === false ? 'border-red-500' : 
                  urlValid === true ? 'border-green-500' : 'border-gray-300'
                }`}
                placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={downloading}
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {validatingUrl && (
                  <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                )}
                {urlValid === true && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {urlValid === false && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            {urlValid === false && (
              <p className="mt-1 text-sm text-red-600">
                URL inválida ou vídeo não acessível
              </p>
            )}
            {urlValid === true && (
              <p className="mt-1 text-sm text-green-600">
                ✅ Vídeo válido e acessível
              </p>
            )}
            {validatingUrl && (
              <p className="mt-1 text-sm text-blue-600">
                Verificando vídeo...
              </p>
            )}
          </div>

          {/* Informações do vídeo */}
          {videoInfo && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Informações do Vídeo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Título:</strong> {videoInfo.title}</p>
                  <p><strong>Canal:</strong> {videoInfo.uploader}</p>
                  <p><strong>Duração:</strong> {formatDuration(videoInfo.duration)}</p>
                </div>
                <div>
                  <p><strong>Visualizações:</strong> {videoInfo.view_count?.toLocaleString() || 'N/A'}</p>
                  <p><strong>Tamanho estimado:</strong> {videoInfo.filesize ? formatFileSize(videoInfo.filesize) : 'Calculando...'}</p>
                  <p><strong>ID do vídeo:</strong> {videoInfo.id}</p>
                </div>
              </div>
              {videoInfo.thumbnail && (
                <div className="mt-3">
                  <img 
                    src={videoInfo.thumbnail} 
                    alt="Thumbnail" 
                    className="w-32 h-24 object-cover rounded border"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block mb-1 font-medium">Selecionar Pasta *</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={idPasta}
              onChange={(e) => setIdPasta(e.target.value)}
              disabled={downloading}
              required
            >
              <option value="">Selecione uma pasta</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id.toString()}>
                  {folder.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={downloading || urlValid !== true || !idPasta}
            >
              {downloading ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Baixar Vídeo
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRecentDownloads(!showRecentDownloads)}
              className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 flex items-center"
            >
              <Eye className="h-5 w-5 mr-2" />
              Recentes
            </button>
          </div>
        </form>

        {/* Downloads recentes */}
        {showRecentDownloads && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800">Downloads Recentes</h3>
              <button
                onClick={loadRecentDownloads}
                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar
              </button>
            </div>
            
            {recentDownloads.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum download recente</p>
            ) : (
              <div className="space-y-2">
                {recentDownloads.map((download) => (
                  <div key={download.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 truncate">{download.nome}</div>
                      <div className="text-sm text-gray-500">
                        {formatDuration(download.duracao)} • {download.tamanho_mb}MB • 
                        {new Date(download.data_download).toLocaleDateString()}
                      </div>
                    </div>
                    <Youtube className="h-5 w-5 text-red-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Informações adicionais */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">ℹ️ Informações importantes</h3>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>• Apenas vídeos públicos podem ser baixados</li>
            <li>• O download pode levar alguns minutos dependendo do tamanho do vídeo</li>
            <li>• Vídeos são baixados na melhor qualidade disponível (até 1080p)</li>
            <li>• Todos os vídeos são convertidos para MP4 para máxima compatibilidade</li>
            <li>• O sistema verifica automaticamente se o vídeo está disponível</li>
            <li>• Respeite os direitos autorais dos criadores de conteúdo</li>
            <li>• <strong>Tecnologia:</strong> yt-dlp (sucessor do youtube-dl)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}