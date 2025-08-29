import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Menu, FileVideo, LogOut, User, Settings, Bell, Megaphone, Radio, Users, 
  ArrowLeftRight, Play, Home, Wifi, Calendar, List, Youtube, Server, 
  Smartphone, ChevronDown, Search, Activity, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  visible: boolean;
  order: number;
  category: 'streaming' | 'content' | 'analytics' | 'system';
}

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout, getToken } = useAuth();
  const location = useLocation();

  // Menu items padrão
  const defaultMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'Home', visible: true, order: 0, category: 'system' },
    { id: 'iniciar-transmissao', label: 'Iniciar Transmissão', path: '/dashboard/iniciar-transmissao', icon: 'Radio', visible: true, order: 1, category: 'streaming' },
    { id: 'dados-conexao', label: 'Dados de Conexão', path: '/dashboard/dados-conexao', icon: 'Wifi', visible: true, order: 2, category: 'streaming' },
    { id: 'players', label: 'Players', path: '/dashboard/players', icon: 'PlayCircle', visible: true, order: 3, category: 'streaming' },
    { id: 'gerenciarvideos', label: 'Gerenciar Vídeos', path: '/dashboard/gerenciarvideos', icon: 'FileVideo', visible: true, order: 4, category: 'content' },
    { id: 'playlists', label: 'Playlists', path: '/dashboard/playlists', icon: 'List', visible: true, order: 5, category: 'content' },
    { id: 'agendamentos', label: 'Agendamentos', path: '/dashboard/agendamentos', icon: 'Calendar', visible: true, order: 6, category: 'content' },
    { id: 'comerciais', label: 'Comerciais', path: '/dashboard/comerciais', icon: 'Megaphone', visible: true, order: 7, category: 'content' },
    { id: 'downloadyoutube', label: 'Download YouTube', path: '/dashboard/downloadyoutube', icon: 'Youtube', visible: true, order: 8, category: 'content' },
    { id: 'migrar-videos-ftp', label: 'Migrar FTP', path: '/dashboard/migrar-videos-ftp', icon: 'Server', visible: true, order: 9, category: 'content' },
    { id: 'espectadores', label: 'Espectadores', path: '/dashboard/espectadores', icon: 'Users', visible: true, order: 10, category: 'analytics' },
    { id: 'relayrtmp', label: 'Relay RTMP', path: '/dashboard/relayrtmp', icon: 'ArrowLeftRight', visible: true, order: 11, category: 'streaming' },
    { id: 'conversao-videos', label: 'Conversão de Vídeos', path: '/dashboard/conversao-videos', icon: 'Settings', visible: true, order: 12, category: 'content' },
    { id: 'app-multiplataforma', label: 'App Multiplataforma', path: '/dashboard/app-multiplataforma', icon: 'Smartphone', visible: true, order: 13, category: 'content' },
    { id: 'app-android', label: 'App Android', path: '/dashboard/app-android', icon: 'Smartphone', visible: true, order: 14, category: 'content' },
    { id: 'configuracoes', label: 'Configurações', path: '/dashboard/configuracoes', icon: 'Settings', visible: true, order: 15, category: 'system' },
  ];

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setMenuItems(defaultMenuItems);
        return;
      }
      
      const response = await fetch('/api/user-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.menu_items) {
          setMenuItems(data.menu_items.sort((a: MenuItem, b: MenuItem) => a.order - b.order));
        } else {
          setMenuItems(defaultMenuItems);
        }
      } else {
        setMenuItems(defaultMenuItems);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMenuItems(defaultMenuItems);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      Home: Home,
      Radio: Radio,
      Wifi: Wifi,
      PlayCircle: Play,
      FileVideo: FileVideo,
      List: List,
      Calendar: Calendar,
      Megaphone: Megaphone,
      Youtube: Youtube,
      Server: Server,
      Users: Users,
      ArrowLeftRight: ArrowLeftRight,
      Settings: Settings,
      Smartphone: Smartphone,
    };
    return icons[iconName] || Settings;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'streaming': return 'text-red-500';
      case 'content': return 'text-blue-500';
      case 'analytics': return 'text-purple-500';
      case 'system': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'streaming': return 'bg-red-50';
      case 'content': return 'bg-blue-50';
      case 'analytics': return 'bg-purple-50';
      case 'system': return 'bg-gray-50';
      default: return 'bg-gray-50';
    }
  };

  // Filtrar e agrupar itens do menu
  const visibleMenuItems = menuItems
    .filter(item => item.visible)
    .filter(item => searchQuery === '' || 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.order - b.order);

  const groupedMenuItems = visibleMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categoryLabels = {
    streaming: 'Transmissão',
    content: 'Conteúdo',
    analytics: 'Análise',
    system: 'Sistema'
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-auto border-r border-gray-200`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-6 border-b border-gray-200">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-10 h-10 rounded-xl mr-3 object-contain bg-white p-1"
              onError={(e) => {
                // Fallback para ícone se logo não carregar
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mr-3" style={{ display: 'none' }}>
              <Play className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Streaming</h1>
              <p className="text-sm text-gray-500">Platform</p>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="space-y-6">
              {Object.entries(groupedMenuItems).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const IconComponent = getIconComponent(item.icon);
                      return (
                        <li key={item.id}>
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isActive 
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg' 
                                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                              }`
                            }
                            end={item.path === '/dashboard'}
                          >
                            <IconComponent className="h-5 w-5 mr-3" />
                            <span>{item.label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center w-full px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.nome || 'Usuário'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    @{user?.usuario || user?.email?.split('@')[0] || 'usuario'}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* User dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{user?.nome}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                      {user?.tipo && (
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${
                          user.tipo === 'revenda' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.tipo === 'revenda' ? 'Revenda' : 'Streaming'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                className="p-2 rounded-lg lg:hidden focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              
              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span>Dashboard</span>
                {location.pathname !== '/dashboard' && (
                  <>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">
                      {menuItems.find(item => item.path === location.pathname)?.label || 'Página'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Status indicators */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">Online</span>
                </div>
                
                {user?.bitrate && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
                    <Zap className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">{user.bitrate} kbps</span>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User avatar */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                      {user?.nome || 'Usuário'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.tipo === 'revenda' ? 'Revenda' : 'Streaming'}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full max-w-full overflow-x-hidden"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;