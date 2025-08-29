import React, { useState, useEffect } from 'react';
import { ChevronLeft, Smartphone, Download, Eye, Settings, Upload, Trash2, Save, RefreshCw, AlertCircle, CheckCircle, Code, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface AndroidApp {
  id?: number;
  package: string;
  data: string;
  hash: string;
  zip: string;
  compilado: boolean;
  status: number;
  aviso?: string;
}

interface AppConfig {
  webtv_nome: string;
  webtv_facebook: string;
  webtv_twitter: string;
  webtv_site: string;
  webtv_descricao: string;
  versao: string;
  tema: string;
  app_email: string;
  app_whatsapp: string;
  app_url_facebook: string;
  app_url_instagram: string;
  app_url_twitter: string;
  app_url_site: string;
  app_cor_texto: string;
  app_cor_menu_claro: string;
  app_cor_menu_escuro: string;
  app_url_chat: string;
  app_tela_inicial: number;
}

const AppAndroid: React.FC = () => {
  const { user, getToken } = useAuth();
  const [apps, setApps] = useState<AndroidApp[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    webtv_nome: '',
    webtv_facebook: '',
    webtv_twitter: '',
    webtv_site: '',
    webtv_descricao: '',
    versao: '1.0',
    tema: '#0099CC|#003399',
    app_email: '',
    app_whatsapp: '',
    app_url_facebook: '',
    app_url_instagram: '',
    app_url_twitter: '',
    app_url_site: '',
    app_cor_texto: '#000000',
    app_cor_menu_claro: '#FFFFFF',
    app_cor_menu_escuro: '#000000',
    app_url_chat: '',
    app_tela_inicial: 1
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('apps');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [iconeFile, setIconeFile] = useState<File | null>(null);
  const [fundoFile, setFundoFile] = useState<File | null>(null);
  const [hasExistingApp, setHasExistingApp] = useState(false);

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);
  const playerUrl = `http://samhost.wcore.com.br/player-app/${userLogin}`;

  useEffect(() => {
    loadApps();
    loadAppConfig();
  }, []);

  const loadApps = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/app-android', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApps(data.apps);
          setHasExistingApp(data.apps.length > 0);
          setActiveTab(data.apps.length > 0 ? 'apps' : 'create');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar apps:', error);
    }
  };

  const loadAppConfig = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/app-android/config', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setAppConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleCreateApp = async () => {
    if (!appConfig.webtv_nome) {
      toast.error('Nome da TV é obrigatório');
      return;
    }

    if (!logoFile || !iconeFile || !fundoFile) {
      toast.error('Logo, ícone e fundo são obrigatórios');
      return;
    }

    // Validar dimensões das imagens
    const validateImage = (file: File, expectedWidth: number, expectedHeight: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve(img.width === expectedWidth && img.height === expectedHeight);
        };
        img.onerror = () => resolve(false);
        img.src = URL.createObjectURL(file);
      });
    };

    // Validar logo (300x300)
    if (logoFile && !(await validateImage(logoFile, 300, 300))) {
      toast.error('Logo deve ter exatamente 300x300 pixels');
      return;
    }

    // Validar ícone (144x144)
    if (iconeFile && !(await validateImage(iconeFile, 144, 144))) {
      toast.error('Ícone deve ter exatamente 144x144 pixels');
      return;
    }

    // Validar fundo (640x1136)
    if (fundoFile && !(await validateImage(fundoFile, 640, 1136))) {
      toast.error('Fundo deve ter exatamente 640x1136 pixels');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();

      // Dados do app
      Object.keys(appConfig).forEach(key => {
        formData.append(key, String(appConfig[key as keyof AppConfig]));
      });

      // Arquivos
      formData.append('logo', logoFile);
      formData.append('icone', iconeFile);
      formData.append('fundo', fundoFile);
      formData.append('servidor', `samhost.wcore.com.br`);
      formData.append('login', userLogin);
      formData.append('idioma_painel', user?.tipo || 'pt-br');

      const response = await fetch('/api/app-android/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('App Android criado com sucesso!');
        loadApps();
        setActiveTab('apps');
      } else {
        toast.error(result.error || 'Erro ao criar app');
      }
    } catch (error) {
      console.error('Erro ao criar app:', error);
      toast.error('Erro ao criar app');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureApp = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();

      // Dados de configuração
      Object.keys(appConfig).forEach(key => {
        formData.append(key, String(appConfig[key as keyof AppConfig]));
      });

      // Arquivos opcionais para atualização
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (fundoFile) {
        formData.append('fundo', fundoFile);
      }

      const response = await fetch('/api/app-android/configure', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Configurações atualizadas com sucesso!');
        loadAppConfig();
      } else {
        toast.error(result.error || 'Erro ao atualizar configurações');
      }
    } catch (error) {
      console.error('Erro ao configurar app:', error);
      toast.error('Erro ao configurar app');
    } finally {
      setLoading(false);
    }
  };

  const removeApp = async (appId: number) => {
    if (!confirm('Deseja remover este aplicativo?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/app-android/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('App removido com sucesso!');
        loadApps();
      } else {
        toast.error('Erro ao remover app');
      }
    } catch (error) {
      console.error('Erro ao remover app:', error);
      toast.error('Erro ao remover app');
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return 'Concluído';
      case 2: return 'Erro';
      default: return 'Em andamento';
    }
  };

  const versionOptions = Array.from({ length: 21 }, (_, i) => {
    if (i < 20) return `1.${i}`;
    return `${Math.floor(i / 10)}.${i % 10}`;
  });

  const themeOptions = [
    { value: '#0099CC|#003399', label: 'Azul/Blue' },
    { value: '#00796B|#00695C', label: 'Verde/Green' },
    { value: '#FF6699|#FF3366', label: 'Rosa/Pink' },
    { value: '#FF5959|#FF0000', label: 'Vermelho/Red' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="flex items-center text-primary-600 hover:text-primary-800">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <Smartphone className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">App Android Nativo</h1>
      </div>

      {/* Informações sobre o módulo */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-green-900 font-medium mb-2">App Android Nativo</h3>
            <ul className="text-green-800 text-sm space-y-1">
              <li>• <strong>App nativo Android:</strong> APK compilado para Google Play Store</li>
              <li>• <strong>Personalização completa:</strong> Logo, ícone, cores e temas</li>
              <li>• <strong>Múltiplas versões:</strong> Controle de versionamento</li>
              <li>• <strong>Certificado digital:</strong> Assinatura automática do APK</li>
              <li>• <strong>Redes sociais integradas:</strong> Links para Facebook, Twitter, Instagram</li>
              <li>• <strong>Chat integrado:</strong> Sistema de chat opcional</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'apps', label: 'Apps Criados', icon: Smartphone, show: true },
              { id: 'create', label: hasExistingApp ? 'Criar Novo' : 'Criar App', icon: Settings, show: true },
              { id: 'configure', label: 'Configurar App', icon: Code, show: hasExistingApp }
            ].filter(tab => tab.show).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Apps Criados */}
          {activeTab === 'apps' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Aplicativos Android</h2>

              {apps.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Smartphone className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">Nenhum app criado</p>
                  <p className="text-sm">Crie seu primeiro app Android</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                    Criar App
                  </button>
                </div>
              ) : (
                <>
                  {/* Preview do App */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Preview do App</h3>
                      <div className="bg-gray-100 rounded-lg p-4 inline-block">
                        <iframe
                          src={playerUrl}
                          className="w-80 h-96 border-0 rounded-lg"
                          title="App Preview"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-800">Status dos Apps</h3>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Data</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Status</th>
                              <th className="text-center py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apps.map((app) => (
                              <tr key={app.id} className="hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-600 border-b border-gray-200">
                                  {new Date(app.data).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 border-b border-gray-200">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                                    {getStatusText(app.status)}
                                  </span>
                                  {app.aviso && (
                                    <p className="text-xs text-red-600 mt-1">{app.aviso}</p>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center border-b border-gray-200">
                                  <div className="flex justify-center space-x-2">
                                    {app.status === 1 && (
                                      <button
                                        onClick={() => window.open(`/app/apps/${app.zip}`, '_blank')}
                                        className="text-green-600 hover:text-green-800"
                                        title="Download APK"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => removeApp(app.id!)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Remover app"
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
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Criar App */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Criar Novo App Android</h2>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                  <div className="text-yellow-800 text-sm">
                    <p className="font-medium mb-1">Instruções para criação do app:</p>
                    <ul className="space-y-1">
                      <li>• Preencha todas as informações obrigatórias</li>
                      <li>• Envie as imagens nas dimensões exatas especificadas</li>
                      <li>• O processo de compilação pode levar alguns minutos</li>
                      <li>• Após a criação, você poderá baixar o APK para publicar na Google Play</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações da TV */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Informações da TV</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da TV *
                    </label>
                    <input
                      type="text"
                      value={appConfig.webtv_nome}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, webtv_nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Nome da sua TV"
                      maxLength={30}
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo 30 caracteres</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={appConfig.webtv_facebook}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, webtv_facebook: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://facebook.com/seuperfil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twitter
                    </label>
                    <input
                      type="url"
                      value={appConfig.webtv_twitter}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, webtv_twitter: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://twitter.com/seuperfil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site
                    </label>
                    <input
                      type="url"
                      value={appConfig.webtv_site}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, webtv_site: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://seusite.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={appConfig.webtv_descricao}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, webtv_descricao: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Descrição da sua TV"
                    />
                  </div>
                </div>

                {/* Configurações Técnicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Configurações Técnicas</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Versão
                    </label>
                    <select
                      value={appConfig.versao}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, versao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      {versionOptions.map((version) => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tema
                    </label>
                    <select
                      value={appConfig.tema}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, tema: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      {themeOptions.map((theme) => (
                        <option key={theme.value} value={theme.value}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload de Imagens */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Personalização do App</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo *
                    </label>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG / 300x300 pixels</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ícone *
                    </label>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => setIconeFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG / 144x144 pixels</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background *
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg"
                      onChange={(e) => setFundoFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">JPG / 640x1136 pixels</p>
                  </div>
                </div>
              </div>

              {/* Botão de Criar */}
              <div className="flex justify-center">
                <button
                  onClick={handleCreateApp}
                  disabled={loading || !appConfig.webtv_nome || !logoFile || !iconeFile || !fundoFile}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-medium"
                >
                  <Smartphone className="h-6 w-6 mr-3" />
                  {loading ? 'Criando App...' : 'Criar App Android'}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Configurar App */}
          {activeTab === 'configure' && hasExistingApp && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Configurar App Existente</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Nota:</strong> Ao alterar as configurações abaixo, as mesmas serão atualizadas automaticamente no app sem precisar criar um novo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configurações do App */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Configurações Gerais</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={appConfig.app_email}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site
                    </label>
                    <input
                      type="url"
                      value={appConfig.app_url_site}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_url_site: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={appConfig.app_url_facebook}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_url_facebook: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={appConfig.app_url_instagram}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_url_instagram: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={appConfig.app_whatsapp}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_whatsapp: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="+55 11 99999-9999"
                    />
                  </div>
                </div>

                {/* Personalização Visual */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Cores do App</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor do Texto
                    </label>
                    <input
                      type="color"
                      value={appConfig.app_cor_texto}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_cor_texto: e.target.value }))}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Menu Claro
                    </label>
                    <input
                      type="color"
                      value={appConfig.app_cor_menu_claro}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_cor_menu_claro: e.target.value }))}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Menu Escuro
                    </label>
                    <input
                      type="color"
                      value={appConfig.app_cor_menu_escuro}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, app_cor_menu_escuro: e.target.value }))}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tela Inicial
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value={1}
                          checked={appConfig.app_tela_inicial === 1}
                          onChange={(e) => setAppConfig(prev => ({ ...prev, app_tela_inicial: parseInt(e.target.value) }))}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Logo + Botão Play</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value={2}
                          checked={appConfig.app_tela_inicial === 2}
                          onChange={(e) => setAppConfig(prev => ({ ...prev, app_tela_inicial: parseInt(e.target.value) }))}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Player</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!appConfig.app_url_chat}
                        onChange={(e) => setAppConfig(prev => ({ 
                          ...prev, 
                          app_url_chat: e.target.checked ? `/app/chat/${userLogin}` : '' 
                        }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Módulo Chat</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Upload de Imagens para Atualização */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Atualizar Imagens (Opcional)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nova Logo
                    </label>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG / 300x300 pixels</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Novo Background
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg"
                      onChange={(e) => setFundoFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">JPG / 640x1136 pixels</p>
                  </div>
                </div>
              </div>

              {/* Botão de Configurar */}
              <div className="flex justify-center">
                <button
                  onClick={handleConfigureApp}
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-medium"
                >
                  <Settings className="h-6 w-6 mr-3" />
                  {loading ? 'Atualizando...' : 'Atualizar Configurações'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppAndroid;