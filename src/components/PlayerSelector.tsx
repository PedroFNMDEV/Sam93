import React, { useState } from 'react';
import { Monitor, Smartphone, Globe, Code, Tv, Play, Settings } from 'lucide-react';

interface PlayerType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  compatibility: string[];
  recommended: boolean;
}

interface PlayerSelectorProps {
  selectedPlayer: string;
  onPlayerChange: (playerId: string) => void;
  className?: string;
}

const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  selectedPlayer,
  onPlayerChange,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const playerTypes: PlayerType[] = [
    {
      id: 'html5',
      name: 'HTML5 Player',
      description: 'Player nativo HTML5 com controles customizados',
      icon: Monitor,
      features: ['Range Requests', 'HLS Support', 'Controles Customizados', 'Fullscreen', 'Mobile Friendly'],
      compatibility: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Mobile'],
      recommended: true
    },
    {
      id: 'videojs',
      name: 'Video.js Player',
      description: 'Player profissional com plugins avançados',
      icon: Tv,
      features: ['HLS Quality Selector', 'Watermark Plugin', 'Advanced Controls', 'Plugin System'],
      compatibility: ['Todos os navegadores', 'Mobile', 'Smart TV'],
      recommended: true
    },
    {
      id: 'clappr',
      name: 'Clappr Player',
      description: 'Player moderno e extensível',
      icon: Play,
      features: ['Level Selector', 'Modern UI', 'Plugin Architecture', 'Responsive'],
      compatibility: ['Navegadores modernos', 'Mobile'],
      recommended: false
    },
    {
      id: 'jwplayer',
      name: 'JW Player',
      description: 'Player comercial com recursos avançados',
      icon: Globe,
      features: ['Analytics', 'Advertising', 'Quality Switching', 'Chromecast'],
      compatibility: ['Todos os navegadores', 'Mobile', 'Connected TV'],
      recommended: false
    },
    {
      id: 'fluidplayer',
      name: 'Fluid Player',
      description: 'Player HTML5 com design fluido',
      icon: Smartphone,
      features: ['Responsive Design', 'VAST Ads', 'Theatre Mode', 'Logo Support'],
      compatibility: ['HTML5 browsers', 'Mobile'],
      recommended: false
    },
    {
      id: 'dplayer',
      name: 'DPlayer',
      description: 'Player HTML5 minimalista',
      icon: Code,
      features: ['Lightweight', 'HLS Support', 'Screenshot', 'Hotkeys'],
      compatibility: ['Navegadores modernos'],
      recommended: false
    }
  ];

  const selectedPlayerData = playerTypes.find(p => p.id === selectedPlayer);

  return (
    <div className={`player-selector ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Tipo de Player</h3>
        <p className="text-sm text-gray-600">
          Escolha o tipo de player que melhor se adapta às suas necessidades
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playerTypes.map((player) => (
          <div
            key={player.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedPlayer === player.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onPlayerChange(player.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <player.icon className={`h-6 w-6 ${
                  selectedPlayer === player.id ? 'text-primary-600' : 'text-gray-600'
                }`} />
                <h4 className="font-medium text-gray-900">{player.name}</h4>
              </div>
              
              <div className="flex items-center space-x-1">
                {player.recommended && (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                    Recomendado
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(showDetails === player.id ? null : player.id);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{player.description}</p>

            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500">Recursos principais:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.features.slice(0, 3).map((feature, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                  {player.features.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{player.features.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Detalhes expandidos */}
            {showDetails === player.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Todos os recursos:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {player.features.map((feature, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs font-medium text-gray-500">Compatibilidade:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {player.compatibility.map((compat, index) => (
                        <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {compat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Informações do player selecionado */}
      {selectedPlayerData && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <selectedPlayerData.icon className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">{selectedPlayerData.name} Selecionado</h4>
          </div>
          <p className="text-blue-800 text-sm mb-3">{selectedPlayerData.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Recursos:</span>
              <ul className="text-blue-800 mt-1 space-y-1">
                {selectedPlayerData.features.map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <span className="font-medium text-blue-900">Compatibilidade:</span>
              <ul className="text-blue-800 mt-1 space-y-1">
                {selectedPlayerData.compatibility.map((compat, index) => (
                  <li key={index}>• {compat}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSelector;