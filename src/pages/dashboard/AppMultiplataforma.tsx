import React, { useState, useEffect } from 'react';
import { ChevronLeft, Smartphone, Download, Eye, Settings, Upload, Trash2, Save, RefreshCw, ExternalLink, QrCode, Globe, Monitor, Apple } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface AppMultiplataforma {
  id?: number;
  nome: string;
  email: string;
  whatsapp: string;
  url_facebook: string;
  url_instagram: string;
  url_twitter: string;
  url_site: string;
  url_youtube: string;
  cor_texto: string;
  cor_menu_claro: string;
  cor_menu_escuro: string;
  cor_splash: string;
  url_logo: string;
  url_background: string;
  url_chat: string;
  text_prog: string;
  text_hist: string;
  modelo: number;
  contador: boolean;
  apk_package?: string;
  apk_versao?: string;
  apk_criado: boolean;
  apk_cert_sha256?: string;
  apk_zip?: string;
}

interface Banner {
  id: number;
  nome: string;
  banner: string;
  link: string;
  data_cadastro: string;
  exibicoes: number;
  cliques: number;
}

interface Notification {
  titulo: string;
  url_icone: File | null;
  url_imagem: File | null;
  url_link: string;
  mensagem: string;
}

const AppMultiplataforma: React.FC = () => {
  const { user, getToken } = useAuth();
  const [appData, setAppData] = useState<AppMultiplataforma>({
    nome: '',
    email: '',
    whatsapp: '',
    url_facebook: '',
    url_instagram: '',
    url_twitter: '',
    url_site: '',
    url_youtube: '',
    cor_texto: '#000000',
    cor_menu_claro: '#FFFFFF',
    cor_menu_escuro: '#000000',
    cor_splash: '#4361ee',
    url_logo: '',
    url_background: '',
    url_chat: '',
    text_prog: '',
    text_hist: '',
    modelo: 1,
    contador: false,
    apk_criado: false
  });

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [bannerForm, setBannerForm] = useState({
    nome: '',
    banner: null as File | null,
    link: ''
  });
  const [notificationForm, setNotificationForm] = useState<Notification>({
    titulo: '',
    url_icone: null,
    url_imagem: null,
    url_link: '',
    mensagem: ''
  });

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);
  const playerUrl = `http://samhost.wcore.com.br/player-app-multi-plataforma/${userLogin}`;

  useEffect(() => {
    loadAppData();
    loadBanners();
  }, []);

  const loadAppData = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/app-multiplataforma', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.app) {
          setAppData(data.app);
          setActiveTab(data.app.nome ? 'preview' : 'create');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do app:', error);
    }
  };

  const loadBanners = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/app-multiplataforma/banners', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBanners(data.banners);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
    }
  };

  const handleSaveApp = async () => {
    if (!appData.nome) {
      toast.error('Nome do aplicativo é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();

      // Dados básicos
      Object.keys(appData).forEach(key => {
        if (key !== 'id' && appData[key as keyof AppMultiplataforma] !== null) {
          formData.append(key, String(appData[key as keyof AppMultiplataforma]));
        }
      });

      // Arquivos
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (backgroundFile) {
        formData.append('background', backgroundFile);
      }

      const response = await fetch('/api/app-multiplataforma', {
        method: appData.id ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success(appData.id ? 'App atualizado com sucesso!' : 'App criado com sucesso!');
        loadAppData();
        setActiveTab('preview');
      } else {
        toast.error(result.error || 'Erro ao salvar app');
      }
    } catch (error) {
      console.error('Erro ao salvar app:', error);
      toast.error('Erro ao salvar app');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAPK = async () => {
    if (!appData.nome || !logoFile || !backgroundFile) {
      toast.error('Nome, logo e background são obrigatórios para criar APK');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      
      formData.append('nome', appData.nome);
      formData.append('versao', '1.0');
      formData.append('logo', logoFile);
      formData.append('background', backgroundFile);
      formData.append('modelo', appData.modelo.toString());

      const response = await fetch('/api/app-multiplataforma/create-apk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('APK criado com sucesso!');
        loadAppData();
      } else {
        toast.error(result.error || 'Erro ao criar APK');
      }
    } catch (error) {
      console.error('Erro ao criar APK:', error);
      toast.error('Erro ao criar APK');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBanner = async () => {
    if (!bannerForm.nome || !bannerForm.banner) {
      toast.error('Nome e imagem do banner são obrigatórios');
      return;
    }

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('nome', bannerForm.nome);
      formData.append('banner', bannerForm.banner);
      formData.append('link', bannerForm.link);

      const response = await fetch('/api/app-multiplataforma/banners', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Banner adicionado com sucesso!');
        setShowBannerModal(false);
        setBannerForm({ nome: '', banner: null, link: '' });
        loadBanners();
      } else {
        toast.error(result.error || 'Erro ao adicionar banner');
      }
    } catch (error) {
      console.error('Erro ao adicionar banner:', error);
      toast.error('Erro ao adicionar banner');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.titulo || !notificationForm.url_icone || !notificationForm.mensagem) {
      toast.error('Título, ícone e mensagem são obrigatórios');
      return;
    }

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('titulo', notificationForm.titulo);
      formData.append('url_icone', notificationForm.url_icone);
      if (notificationForm.url_imagem) {
        formData.append('url_imagem', notificationForm.url_imagem);
      }
      formData.append('url_link', notificationForm.url_link);
      formData.append('mensagem', notificationForm.mensagem);

      const response = await fetch('/api/app-multiplataforma/notifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Notificação enviada com sucesso!');
        setShowNotificationModal(false);
        setNotificationForm({
          titulo: '',
          url_icone: null,
          url_imagem: null,
          url_link: '',
          mensagem: ''
        });
      } else {
        toast.error(result.error || 'Erro ao enviar notificação');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
    }
  };

  const deleteBanner = async (bannerId: number) => {
    if (!confirm('Deseja remover este banner?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/app-multiplataforma/banners/${bannerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Banner removido com sucesso!');
        loadBanners();
      } else {
        toast.error('Erro ao remover banner');
      }
    } catch (error) {
      console.error('Erro ao remover banner:', error);
      toast.error('Erro ao remover banner');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const generateInstallCode = (platform: string) => {
    const imageMap = {
      android: 'img-instalar-app-android.png',
      ios: 'img-instalar-app-iphone.png',
      windows: 'img-instalar-app-windows.png'
    };

    return `<a href="${playerUrl}" target="_blank">
  <img src="http://samhost.wcore.com.br/app-multi-plataforma/${imageMap[platform as keyof typeof imageMap]}" width="150" height="48" alt="Instalar App ${platform}" />
</a>`;
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
        <Smartphone className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">App Multiplataforma</h1>
      </div>

      {/* Informações sobre o módulo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Globe className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-blue-900 font-medium mb-2">App Multiplataforma PWA</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• <strong>Progressive Web App (PWA):</strong> Funciona em Android, iOS e Windows</li>
              <li>• <strong>Instalação nativa:</strong> Pode ser instalado como app nativo no dispositivo</li>
              <li>• <strong>Offline ready:</strong> Funciona mesmo sem conexão com internet</li>
              <li>• <strong>Push notifications:</strong> Envie notificações para usuários do app</li>
              <li>• <strong>Banners integrados:</strong> Monetize com anúncios personalizados</li>
              <li>• <strong>Múltiplos layouts:</strong> Escolha entre diferentes designs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'preview', label: 'Prévia do App', icon: Eye },
              { id: 'create', label: appData.nome ? 'Configurar App' : 'Criar App', icon: Settings },
              { id: 'banners', label: 'Banners', icon: Monitor },
              { id: 'notifications', label: 'Notificações', icon: RefreshCw }
            ].map((tab) => (
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
          {/* Tab: Prévia do App */}
          {activeTab === 'preview' && appData.nome && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Prévia do Aplicativo</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Preview do App */}
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Preview Mobile</h3>
                  <div className="bg-gray-100 rounded-lg p-4 inline-block">
                    <iframe
                      src={`${playerUrl}?app-multi=preview`}
                      className="w-80 h-96 border-0 rounded-lg"
                      title="App Preview"
                    />
                  </div>
                </div>

                {/* Códigos de Instalação */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">Códigos de Instalação</h3>
                  
                  {/* Android */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Android</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(generateInstallCode('android'), 'Código Android')}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        Copiar
                      </button>
                    </div>
                    <img 
                      src="http://samhost.wcore.com.br/app-multi-plataforma/img-instalar-app-android.png" 
                      alt="Instalar Android" 
                      className="w-32 h-auto mb-2"
                    />
                    <textarea
                      readOnly
                      value={generateInstallCode('android')}
                      className="w-full h-20 text-xs bg-gray-50 border border-gray-300 rounded p-2"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>

                  {/* iOS */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Apple className="h-5 w-5 text-gray-800" />
                        <span className="font-medium">iOS</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(generateInstallCode('ios'), 'Código iOS')}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        Copiar
                      </button>
                    </div>
                    <img 
                      src="http://samhost.wcore.com.br/app-multi-plataforma/img-instalar-app-iphone.png" 
                      alt="Instalar iOS" 
                      className="w-32 h-auto mb-2"
                    />
                    <textarea
                      readOnly
                      value={generateInstallCode('ios')}
                      className="w-full h-20 text-xs bg-gray-50 border border-gray-300 rounded p-2"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>

                  {/* QR Code */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <QrCode className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">QR Code</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`<img src="https://qrcode.tec-it.com/API/QRCode?size=Small&data=${encodeURIComponent(playerUrl)}" width="200" height="200" />`, 'Código QR')}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        Copiar
                      </button>
                    </div>
                    <img 
                      src={`https://qrcode.tec-it.com/API/QRCode?size=Small&data=${encodeURIComponent(playerUrl)}`}
                      alt="QR Code" 
                      className="w-32 h-32 mb-2"
                    />
                  </div>

                  {/* Link Direto */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Link Direto</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(playerUrl, 'Link direto')}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        Copiar
                      </button>
                    </div>
                    <input
                      readOnly
                      value={playerUrl}
                      className="w-full text-sm bg-gray-50 border border-gray-300 rounded p-2"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>

                  {/* Download APK */}
                  {appData.apk_criado && appData.apk_zip && (
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Download className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">APK para Google Play</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`/app/apps/${appData.apk_zip}`, '_blank')}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download APK
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Criar/Configurar App */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {appData.nome ? 'Configurar Aplicativo' : 'Criar Aplicativo'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Informações Básicas</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do App *
                    </label>
                    <input
                      type="text"
                      value={appData.nome}
                      onChange={(e) => setAppData(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Nome do seu aplicativo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={appData.email}
                      onChange={(e) => setAppData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="contato@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={appData.whatsapp}
                      onChange={(e) => setAppData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="+55 11 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site
                    </label>
                    <input
                      type="url"
                      value={appData.url_site}
                      onChange={(e) => setAppData(prev => ({ ...prev, url_site: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://seusite.com"
                    />
                  </div>
                </div>

                {/* Redes Sociais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Redes Sociais</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={appData.url_facebook}
                      onChange={(e) => setAppData(prev => ({ ...prev, url_facebook: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://facebook.com/seuperfil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={appData.url_instagram}
                      onChange={(e) => setAppData(prev => ({ ...prev, url_instagram: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://instagram.com/seuperfil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twitter
                    </label>
                    <input
                      type="url"
                      value={appData.url_twitter}
                      onChange={(e) => setAppData(prev => ({ ...prev, url_twitter: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://twitter.com/seuperfil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Canal YouTube
                    </label>
                    <input
                      type="url"
                      value={appData.url_youtube}
                      onChange={(e) => setAppData(prev => ({ ...prev, url_youtube: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://youtube.com/c/seucanal"
                    />
                  </div>
                </div>
              </div>

              {/* Personalização Visual */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Personalização Visual</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modelo Layout
                    </label>
                    <select
                      value={appData.modelo}
                      onChange={(e) => setAppData(prev => ({ ...prev, modelo: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value={1}>Layout 1</option>
                      <option value={2}>Layout 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor do Texto
                    </label>
                    <input
                      type="color"
                      value={appData.cor_texto}
                      onChange={(e) => setAppData(prev => ({ ...prev, cor_texto: e.target.value }))}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Menu Claro
                    </label>
                    <input
                      type="color"
                      value={appData.cor_menu_claro}
                      onChange={(e) => setAppData(prev => ({ ...prev, cor_menu_claro: e.target.value }))}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Menu Escuro
                    </label>
                    <input
                      type="color"
                      value={appData.cor_menu_escuro}
                      onChange={(e) => setAppData(prev => ({ ...prev, cor_menu_escuro: e.target.value }))}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Splash
                    </label>
                    <input
                      type="color"
                      value={appData.cor_splash}
                      onChange={(e) => setAppData(prev => ({ ...prev, cor_splash: e.target.value }))}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Upload de Imagens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo do App *
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
                      Background
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg"
                      onChange={(e) => setBackgroundFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">JPG / 640x1136 pixels</p>
                  </div>
                </div>

                {/* Textos do App */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texto Programação
                    </label>
                    <textarea
                      value={appData.text_prog}
                      onChange={(e) => setAppData(prev => ({ ...prev, text_prog: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Descreva a programação do seu canal..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texto História
                    </label>
                    <textarea
                      value={appData.text_hist}
                      onChange={(e) => setAppData(prev => ({ ...prev, text_hist: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Conte a história do seu canal..."
                    />
                  </div>
                </div>

                {/* Opções Avançadas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Opções Avançadas</h3>
                  
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!appData.url_chat}
                        onChange={(e) => setAppData(prev => ({ 
                          ...prev, 
                          url_chat: e.target.checked ? `/app-multi-plataforma/chat/${userLogin}` : '' 
                        }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Módulo Chat</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={appData.contador}
                        onChange={(e) => setAppData(prev => ({ ...prev, contador: e.target.checked }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Contador de Espectadores</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleSaveApp}
                  disabled={loading}
                  className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Configurações'}
                </button>

                {appData.nome && !appData.apk_criado && (
                  <button
                    onClick={handleCreateAPK}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Criando...' : 'Criar APK Android'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab: Banners */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Gerenciar Banners</h2>
                <button
                  onClick={() => setShowBannerModal(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar Banner
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Os banners são exibidos aleatoriamente a cada 1 minuto no aplicativo.
                </p>
              </div>

              {banners.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum banner cadastrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Nome</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Data Cadastro</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Exibições</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Cliques</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700 border-b border-gray-200">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banners.map((banner) => (
                        <tr key={banner.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 border-b border-gray-200">
                            <div>
                              <div className="font-medium text-gray-900">{banner.nome}</div>
                              {banner.link && (
                                <a 
                                  href={banner.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {banner.link}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 border-b border-gray-200">
                            {new Date(banner.data_cadastro).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-600 border-b border-gray-200">
                            {banner.exibicoes}
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-600 border-b border-gray-200">
                            {banner.cliques}
                          </td>
                          <td className="py-3 px-4 text-center border-b border-gray-200">
                            <button
                              onClick={() => deleteBanner(banner.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remover banner"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Notificações */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Enviar Notificação Push</h2>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título da Notificação *
                    </label>
                    <input
                      type="text"
                      value={notificationForm.titulo}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, titulo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Título da notificação"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ícone da Notificação * (SSL)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, url_icone: e.target.files?.[0] || null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Mínimo 192x192 pixels</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Imagem da Notificação (SSL)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, url_imagem: e.target.files?.[0] || null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Mínimo 360x180 pixels</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link ao Clicar
                    </label>
                    <input
                      type="url"
                      value={notificationForm.url_link}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, url_link: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem *
                    </label>
                    <textarea
                      value={notificationForm.mensagem}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, mensagem: e.target.value }))}
                      maxLength={160}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Mensagem da notificação (máx. 160 caracteres)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {notificationForm.mensagem.length}/160 caracteres
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSendNotification}
                      disabled={!notificationForm.titulo || !notificationForm.url_icone || !notificationForm.mensagem}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Enviar Notificação
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Banner */}
      {showBannerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Adicionar Banner</h3>
                <button
                  onClick={() => setShowBannerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Banner *
                </label>
                <input
                  type="text"
                  value={bannerForm.nome}
                  onChange={(e) => setBannerForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nome do banner"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagem do Banner *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerForm(prev => ({ ...prev, banner: e.target.files?.[0] || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">400x60 pixels</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link (opcional)
                </label>
                <input
                  type="url"
                  value={bannerForm.link}
                  onChange={(e) => setBannerForm(prev => ({ ...prev, link: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://exemplo.com"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowBannerModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBanner}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Adicionar Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppMultiplataforma;