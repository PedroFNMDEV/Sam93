import React, { useState, useEffect } from 'react';
import { ChevronLeft, Server, Upload, Eye, EyeOff, AlertCircle, CheckCircle, Download, Folder, Play, Trash2, FolderOpen, Video, RefreshCw, X, Clock, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface FTPConnection {
  ip: string;
  usuario: string;
  senha: string;
  porta: number;
}

interface FTPFile {
  name: string;
  size: number;
  type: 'file' | 'directory';
  path: string;
  isVideo: boolean;
}

interface FTPVideo {
  name: string;
  path: string;
  size: number;
  directory: string;
}

interface Folder {
  id: number;
  nome: string;
}

interface MigrationProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

interface MigrationStatus {
  migrating: boolean;
  status: 'idle' | 'migrating' | 'completed' | 'error' | 'cancelled';
  progress: number;
  completed: number;
  total: number;
  errors: string[];
  uptime: number;
  total_size: number;
  estimated_remaining: number;
}

const MigrarVideosFTP: React.FC = () => {
  const { getToken } = useAuth();
  const [ftpData, setFtpData] = useState<FTPConnection>({
    ip: '',
    usuario: '',
    senha: '',
    porta: 21
  });
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [ftpFiles, setFtpFiles] = useState<FTPFile[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [scanningDirectory, setScanningDirectory] = useState(false);
  const [directoryVideos, setDirectoryVideos] = useState<FTPVideo[]>([]);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [selectedDirectoryPath, setSelectedDirectoryPath] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    loadFolders();
    checkConnectionStatus();
    
    // Verificar status de migração a cada 5 segundos se estiver migrando
    const interval = setInterval(() => {
      if (isMigrating) {
        checkMigrationStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/ftp/connection-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnectionStatus(data.connected ? 'connected' : 'disconnected');
          setIsConnected(data.connected);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status da conexão:', error);
      setConnectionStatus('error');
    }
  };

  const checkMigrationStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/ftp/migration-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMigrationStatus(data);
          setIsMigrating(data.migrating);
          
          // Se migração foi concluída
          if (data.status === 'completed' && isMigrating) {
            toast.success(`Migração concluída: ${data.completed}/${data.total} arquivos (${data.total_size}MB)`);
            setSelectedFiles([]);
            loadFolders(); // Recarregar pastas para atualizar espaço usado
          } else if (data.status === 'error' && isMigrating) {
            toast.error('Erro na migração. Verifique os detalhes.');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status de migração:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setFolders(data);
      
      // Selecionar primeira pasta por padrão se não houver seleção
      if (data.length > 0 && !selectedFolder) {
        setSelectedFolder(data[0].id.toString());
      }
    } catch (error) {
      toast.error('Erro ao carregar pastas');
    }
  };

  const handleInputChange = (field: keyof FTPConnection, value: string | number) => {
    setFtpData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const connectToFTP = async () => {
    if (!ftpData.ip || !ftpData.usuario || !ftpData.senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsConnecting(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/ftp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ftpData)
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
        setFtpFiles(result.files || []);
        setCurrentPath(result.currentPath || '/');
        setConnectionStatus('connected');
        toast.success('Conectado ao FTP com sucesso!');
      } else {
        setConnectionStatus('error');
        toast.error(result.error || 'Erro ao conectar ao FTP');
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      setConnectionStatus('error');
      toast.error('Erro ao conectar ao FTP');
    } finally {
      setIsConnecting(false);
    }
  };

  const navigateToDirectory = async (path: string) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/ftp/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          path
        })
      });

      const result = await response.json();

      if (result.success) {
        setFtpFiles(result.files || []);
        setCurrentPath(path);
      } else {
        toast.error(result.error || 'Erro ao navegar no diretório');
      }
    } catch (error) {
      console.error('Erro ao navegar:', error);
      toast.error('Erro ao navegar no diretório');
    }
  };

  const scanDirectoryForVideos = async (directoryPath: string) => {
    setScanningDirectory(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/ftp/scan-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          directoryPath
        })
      });

      const result = await response.json();

      if (result.success) {
        setDirectoryVideos(result.videos || []);
        setSelectedDirectoryPath(directoryPath);
        setShowDirectoryModal(true);
        
        if (result.videos.length === 0) {
          toast.info('Nenhum vídeo encontrado nesta pasta');
        } else {
          toast.success(`${result.videos.length} vídeo(s) encontrado(s) em ${result.scanned_directories || 1} diretório(s)`);
        }
      } else {
        toast.error(result.error || 'Erro ao escanear diretório');
      }
    } catch (error) {
      console.error('Erro ao escanear diretório:', error);
      toast.error('Erro ao escanear diretório');
    } finally {
      setScanningDirectory(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(filePath)) {
        return prev.filter(f => f !== filePath);
      } else {
        return [...prev, filePath];
      }
    });
  };

  const selectAllVideos = () => {
    const videoFiles = ftpFiles.filter(f => f.type === 'file' && f.isVideo).map(f => f.path);
    setSelectedFiles(videoFiles);
  };

  const selectAllDirectoryVideos = () => {
    const videoPaths = directoryVideos.map(v => v.path);
    setSelectedFiles(videoPaths);
    setShowDirectoryModal(false);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const startMigration = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo para migrar');
      return;
    }

    if (!selectedFolder) {
      toast.error('Selecione uma pasta de destino');
      return;
    }

    if (isMigrating) {
      toast.warning('Já existe uma migração em andamento');
      return;
    }

    setIsMigrating(true);
    setShowMigrationModal(true);

    try {
      const token = await getToken();
      const response = await fetch('/api/ftp/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          files: selectedFiles,
          destinationFolder: selectedFolder
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // Não limpar seleção ainda - aguardar conclusão
      } else {
        toast.error(result.error || 'Erro durante a migração');
        setIsMigrating(false);
      }
    } catch (error) {
      console.error('Erro na migração:', error);
      toast.error('Erro durante a migração');
      setIsMigrating(false);
    }
  };

  const cancelMigration = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/ftp/cancel-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Migração cancelada');
        setIsMigrating(false);
        setMigrationStatus(null);
        setShowMigrationModal(false);
      }
    } catch (error) {
      console.error('Erro ao cancelar migração:', error);
      toast.error('Erro ao cancelar migração');
    }
  };

  const disconnect = () => {
    const token = getToken();
    
    // Chamar API para desconectar
    fetch('/api/ftp/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }).then(() => {
      setIsConnected(false);
      setFtpFiles([]);
      setCurrentPath('/');
      setSelectedFiles([]);
      setDirectoryVideos([]);
      setShowDirectoryModal(false);
      setConnectionStatus('disconnected');
      setFtpData({
        ip: '',
        usuario: '',
        senha: '',
        porta: 21
      });
      toast.info('Desconectado do FTP');
    }).catch(() => {
      // Desconectar localmente mesmo se API falhar
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });
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

  const getFileIcon = (file: FTPFile) => {
    if (file.type === 'directory') {
      return <Folder className="h-5 w-5 text-blue-600" />;
    } else if (file.isVideo) {
      return <Video className="h-5 w-5 text-green-600" />;
    } else {
      return <div className="h-5 w-5 bg-gray-400 rounded"></div>;
    }
  };

  const goToParentDirectory = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateToDirectory(parentPath);
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
        <h1 className="text-3xl font-bold text-gray-900">Migrar Vídeos via FTP</h1>
      </div>

      {/* Informações de ajuda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-blue-900 font-medium mb-2">Como usar esta ferramenta</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Preencha os dados de conexão FTP do servidor remoto</li>
              <li>• Conecte-se e navegue pelos diretórios para encontrar os vídeos</li>
              <li>• <strong>NOVO:</strong> Clique no ícone de pasta para escanear recursivamente e encontrar todos os vídeos</li>
              <li>• Selecione os arquivos de vídeo que deseja migrar</li>
              <li>• Escolha a pasta de destino no seu sistema</li>
              <li>• Inicie a migração e acompanhe o progresso</li>
            </ul>
          </div>
        </div>
      </div>

      {!isConnected ? (
        /* Formulário de conexão FTP */
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Dados de Conexão FTP</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ip" className="block text-sm font-medium text-gray-700 mb-2">
                IP/Servidor *
              </label>
              <input
                id="ip"
                type="text"
                value={ftpData.ip}
                onChange={(e) => handleInputChange('ip', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="192.168.1.100 ou ftp.exemplo.com"
                disabled={isConnecting}
              />
            </div>

            <div>
              <label htmlFor="porta" className="block text-sm font-medium text-gray-700 mb-2">
                Porta
              </label>
              <input
                id="porta"
                type="number"
                value={ftpData.porta}
                onChange={(e) => handleInputChange('porta', parseInt(e.target.value) || 21)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="21"
                disabled={isConnecting}
              />
            </div>

            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 mb-2">
                Usuário *
              </label>
              <input
                id="usuario"
                type="text"
                value={ftpData.usuario}
                onChange={(e) => handleInputChange('usuario', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Nome de usuário FTP"
                disabled={isConnecting}
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha *
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={ftpData.senha}
                  onChange={(e) => handleInputChange('senha', e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Senha do FTP"
                  disabled={isConnecting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isConnecting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={connectToFTP}
              disabled={isConnecting || !ftpData.ip || !ftpData.usuario || !ftpData.senha}
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Server className="h-4 w-4 mr-2" />
              {isConnecting ? 'Conectando...' : 'Conectar ao FTP'}
            </button>
          </div>
        </div>
      ) : (
        /* Interface de navegação e seleção de arquivos */
        <div className="space-y-6">
          {/* Status da conexão */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {connectionStatus === 'connected' ? (
                  <Wifi className="h-5 w-5 text-green-600 mr-2" />
                ) : connectionStatus === 'error' ? (
                  <WifiOff className="h-5 w-5 text-red-600 mr-2" />
                ) : (
                  <WifiOff className="h-5 w-5 text-gray-600 mr-2" />
                )}
                <span className="text-green-800 font-medium">
                  Conectado ao FTP: {ftpData.usuario}@{ftpData.ip}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={checkConnectionStatus}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Verificar
                </button>
                <button
                  onClick={disconnect}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Desconectar
                </button>
              </div>
            </div>
          </div>

          {/* Status da migração ativa */}
          {isMigrating && migrationStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Download className="h-5 w-5 text-blue-600 animate-pulse mr-3" />
                  <h2 className="text-lg font-semibold text-blue-800">Migração em Andamento</h2>
                </div>
                <button
                  onClick={cancelMigration}
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
                      Progresso: {migrationStatus.completed}/{migrationStatus.total} arquivos
                    </span>
                    <span className="text-blue-600">
                      {migrationStatus.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${migrationStatus.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-blue-700">
                      Tempo: {Math.floor(migrationStatus.uptime / 60)}m {migrationStatus.uptime % 60}s
                    </span>
                  </div>
                  <div className="flex items-center">
                    <HardDrive className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-blue-700">
                      Transferido: {migrationStatus.total_size}MB
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Download className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-blue-700">
                      Concluídos: {migrationStatus.completed}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-blue-700">
                      Restante: ~{migrationStatus.estimated_remaining}min
                    </span>
                  </div>
                </div>

                {migrationStatus.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="text-red-800 font-medium mb-2">Erros encontrados:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {migrationStatus.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {migrationStatus.errors.length > 5 && (
                        <li>• ... e mais {migrationStatus.errors.length - 5} erro(s)</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navegação e controles */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Caminho atual:</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {currentPath}
                </span>
                {currentPath !== '/' && (
                  <button
                    onClick={goToParentDirectory}
                    className="text-primary-600 hover:text-primary-800 text-sm"
                  >
                    ← Voltar
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedFiles.length} arquivo(s) selecionado(s)
                </span>
                {selectedFiles.length > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Limpar seleção
                  </button>
                )}
                <button
                  onClick={selectAllVideos}
                  className="text-primary-600 hover:text-primary-800 text-sm"
                >
                  Selecionar todos os vídeos
                </button>
              </div>
            </div>

            {/* Lista de arquivos */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-1">Sel.</div>
                  <div className="col-span-1">Tipo</div>
                  <div className="col-span-6">Nome</div>
                  <div className="col-span-2">Tamanho</div>
                  <div className="col-span-2">Ações</div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {ftpFiles.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {isConnected ? 'Nenhum arquivo encontrado neste diretório' : 'Conecte-se ao FTP para ver os arquivos'}
                  </div>
                ) : (
                  ftpFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                        selectedFiles.includes(file.path) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="grid grid-cols-12 gap-4 items-center text-sm">
                        <div className="col-span-1">
                          {file.type === 'file' && file.isVideo && (
                            <input
                              type="checkbox"
                              checked={selectedFiles.includes(file.path)}
                              onChange={() => toggleFileSelection(file.path)}
                              disabled={isMigrating}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          )}
                        </div>
                        
                        <div className="col-span-1">
                          {getFileIcon(file)}
                        </div>
                        
                        <div className="col-span-6">
                          <span className={`${file.isVideo ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                            {file.name}
                          </span>
                          {file.isVideo && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              VÍDEO
                            </span>
                          )}
                        </div>
                        
                        <div className="col-span-2 text-gray-600">
                          {file.type === 'file' ? formatFileSize(file.size) : '-'}
                        </div>
                        
                        <div className="col-span-2 flex items-center space-x-2">
                          {file.type === 'directory' && (
                            <>
                              <button
                                onClick={() => navigateToDirectory(file.path)}
                                disabled={isMigrating}
                                className="text-primary-600 hover:text-primary-800 text-sm"
                                title="Abrir pasta"
                              >
                                Abrir
                              </button>
                              <button
                                onClick={() => scanDirectoryForVideos(file.path)}
                                disabled={scanningDirectory || isMigrating}
                                className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
                                title="Escanear pasta recursivamente"
                              >
                                {scanningDirectory ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FolderOpen className="h-4 w-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Seleção de pasta de destino e migração */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Migrar Arquivos Selecionados</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="pasta-destino" className="block text-sm font-medium text-gray-700 mb-2">
                    Pasta de Destino *
                  </label>
                  <select
                    id="pasta-destino"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    disabled={isMigrating}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecione uma pasta</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={startMigration}
                    disabled={isMigrating || !selectedFolder}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isMigrating ? 'Migrando...' : `Migrar ${selectedFiles.length} arquivo(s)`}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Arquivos selecionados:</strong>
                </p>
                <ul className="mt-2 text-sm text-gray-700 max-h-32 overflow-y-auto">
                  {selectedFiles.map((filePath, index) => (
                    <li key={index} className="flex items-center justify-between py-1">
                      <span>{filePath.split('/').pop()}</span>
                      <button
                        onClick={() => toggleFileSelection(filePath)}
                        disabled={isMigrating}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de vídeos encontrados na pasta */}
      {showDirectoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Vídeos encontrados em: {selectedDirectoryPath}
                </h3>
                <button
                  onClick={() => setShowDirectoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {directoryVideos.length} vídeo(s) encontrado(s) recursivamente
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {directoryVideos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum vídeo encontrado nesta pasta</p>
              ) : (
                <div className="space-y-2">
                  {directoryVideos.map((video, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{video.name}</div>
                        <div className="text-sm text-gray-500">{video.directory}</div>
                        <div className="text-xs text-gray-400">{formatFileSize(video.size)}</div>
                      </div>
                      <Video className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {directoryVideos.length > 0 && (
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDirectoryModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={selectAllDirectoryVideos}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Selecionar Todos ({directoryVideos.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de progresso da migração */}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Progresso da Migração</h3>
                {!isMigrating && (
                  <button
                    onClick={() => setShowMigrationModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {migrationStatus ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {migrationStatus.progress}%
                    </div>
                    <div className="text-lg text-gray-800 mb-4">
                      {migrationStatus.completed} de {migrationStatus.total} arquivos migrados
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${migrationStatus.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-700">Tempo decorrido</div>
                      <div className="text-lg text-gray-900">
                        {Math.floor(migrationStatus.uptime / 60)}m {migrationStatus.uptime % 60}s
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-700">Dados transferidos</div>
                      <div className="text-lg text-gray-900">{migrationStatus.total_size}MB</div>
                    </div>
                  </div>

                  {migrationStatus.status === 'migrating' && (
                    <div className="text-center">
                      <button
                        onClick={cancelMigration}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center mx-auto"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar Migração
                      </button>
                    </div>
                  )}

                  {migrationStatus.errors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">
                        Erros encontrados ({migrationStatus.errors.length}):
                      </h4>
                      <div className="max-h-32 overflow-y-auto">
                        <ul className="text-red-700 text-sm space-y-1">
                          {migrationStatus.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Iniciando migração...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrarVideosFTP;