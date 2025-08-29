import React from 'react';
import { Outlet } from 'react-router-dom';
import { Play, Zap, Users, Globe } from 'lucide-react';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Left side with brand and features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500 rounded-full blur-xl"></div>
          <div className="absolute bottom-40 right-20 w-40 h-40 bg-blue-500 rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-pink-500 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 text-center">
          {/* Logo moderna */}
          <div className="mb-8 flex items-center justify-center">
            <div className="relative">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-20 h-20 rounded-2xl shadow-2xl object-contain bg-white p-2"
                onError={(e) => {
                  // Fallback para ícone se logo não carregar
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl" style={{ display: 'none' }}>
                <Play className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Streaming Platform
          </h1>
          
          <p className="text-xl mb-12 text-purple-100 max-w-md">
            Gerencie seus streams e conteúdo on-demand com tecnologia de ponta
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-6 max-w-md">
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-10 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Zap className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Transmissão ao Vivo</h3>
              <p className="text-sm text-purple-200">Múltiplas plataformas</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-10 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Análise de Audiência</h3>
              <p className="text-sm text-purple-200">Dados em tempo real</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-10 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Play className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Gerenciamento VOD</h3>
              <p className="text-sm text-purple-200">Biblioteca completa</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-10 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Globe className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Multi-plataforma</h3>
              <p className="text-sm text-purple-200">Alcance global</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side with auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
            {/* Logo mobile */}
            <div className="flex justify-center mb-8 lg:hidden">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-16 h-16 rounded-2xl shadow-lg object-contain bg-white p-2"
                onError={(e) => {
                  // Fallback para ícone se logo não carregar
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg" style={{ display: 'none' }}>
                <Play className="h-8 w-8 text-white" />
              </div>
            </div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;