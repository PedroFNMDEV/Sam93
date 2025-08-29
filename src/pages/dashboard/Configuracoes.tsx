import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Eye, EyeOff, GripVertical, Plus, Trash2, Settings, Palette, Layout, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
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

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  visible: boolean;
  order: number;
  category: 'streaming' | 'content' | 'analytics' | 'system';
}

interface UserSettings {
  id?: string;
  menu_items: MenuItem[];
  sidebar_collapsed: boolean;
  notifications_enabled: boolean;
  auto_refresh: boolean;
  refresh_interval: number;
  language: string;
  timezone: string;
}

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
  { id: 'configuracoes', label: 'Configurações', path: '/dashboard/configuracoes', icon: 'Settings', visible: true, order: 13, category: 'system' },
];

function SortableMenuItem({ item, onToggleVisibility }: { item: MenuItem; onToggleVisibility: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'streaming': return 'bg-blue-100 text-blue-800';
      case 'content': return 'bg-green-100 text-green-800';
      case 'analytics': return 'bg-purple-100 text-purple-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg ${
        isDragging ? 'shadow-lg' : 'shadow-sm'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
            {item.category}
          </span>
          <span className="font-medium text-gray-900">{item.label}</span>
          <span className="text-sm text-gray-500">{item.path}</span>
        </div>
      </div>

      <button
        onClick={() => onToggleVisibility(item.id)}
        className={`p-2 rounded-md transition-colors ${
          item.visible
            ? 'text-green-600 hover:bg-green-50'
            : 'text-gray-400 hover:bg-gray-50'
        }`}
        title={item.visible ? 'Ocultar item' : 'Mostrar item'}
      >
        {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

const Configuracoes: React.FC = () => {
  const { getToken, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    menu_items: defaultMenuItems,
    sidebar_collapsed: false,
    notifications_enabled: true,
    auto_refresh: true,
    refresh_interval: 30,
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/user-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSettings({
            ...settings,
            ...data,
            menu_items: data.menu_items || defaultMenuItems
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...settings,
          id_user: user?.id
        })
      });

      if (response.ok) {
        toast.success('Configurações salvas com sucesso! Recarregue a página para ver as mudanças.');
      } else {
        throw new Error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSettings(prev => {
        const oldIndex = prev.menu_items.findIndex(item => item.id === active.id);
        const newIndex = prev.menu_items.findIndex(item => item.id === over.id);

        const newMenuItems = arrayMove(prev.menu_items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index
        }));

        return {
          ...prev,
          menu_items: newMenuItems
        };
      });
    }
  };

  const toggleMenuItemVisibility = (itemId: string) => {
    setSettings(prev => ({
      ...prev,
      menu_items: prev.menu_items.map(item =>
        item.id === itemId ? { ...item, visible: !item.visible } : item
      )
    }));
  };

  const resetMenuToDefault = () => {
    if (confirm('Deseja restaurar o menu para as configurações padrão?')) {
      setSettings(prev => ({
        ...prev,
        menu_items: defaultMenuItems
      }));
    }
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
        <Settings className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
      </div>

      {/* Configurações Gerais */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Palette className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-800">Configurações Gerais</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Outras Opções
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.sidebar_collapsed}
                  onChange={(e) => setSettings(prev => ({ ...prev, sidebar_collapsed: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Menu lateral recolhido por padrão</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications_enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, notifications_enabled: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Habilitar notificações</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.auto_refresh}
                  onChange={(e) => setSettings(prev => ({ ...prev, auto_refresh: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Atualização automática de dados</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idioma
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
        </div>

        {settings.auto_refresh && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalo de atualização (segundos)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={settings.refresh_interval}
              onChange={(e) => setSettings(prev => ({ ...prev, refresh_interval: parseInt(e.target.value) }))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}
      </div>

      {/* Configurações do Menu Lateral */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Layout className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-800">Personalização do Menu Lateral</h2>
          </div>
          <button
            onClick={resetMenuToDefault}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
          >
            <Settings className="h-4 w-4 mr-1" />
            Restaurar Padrão
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 text-sm">
            <strong>Como usar:</strong> Arraste os itens para reordenar o menu lateral. 
            Use o ícone do olho para mostrar/ocultar itens. As alterações serão aplicadas após salvar e recarregar a página.
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={settings.menu_items.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {settings.menu_items
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    onToggleVisibility={toggleMenuItemVisibility}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Resumo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total de itens:</span>
              <span className="ml-2 font-medium text-gray-900">{settings.menu_items.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Visíveis:</span>
              <span className="ml-2 font-medium text-green-600">
                {settings.menu_items.filter(item => item.visible).length}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Ocultos:</span>
              <span className="ml-2 font-medium text-red-600">
                {settings.menu_items.filter(item => !item.visible).length}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Categorias:</span>
              <span className="ml-2 font-medium text-gray-900">
                {new Set(settings.menu_items.map(item => item.category)).size}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Configurações Regionais */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Configurações Regionais</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idioma
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuso Horário
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
              <option value="America/New_York">New York (GMT-5)</option>
              <option value="Europe/London">London (GMT+0)</option>
              <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={saveSettings}
          disabled={loading}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center disabled:opacity-50"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};

export default Configuracoes;