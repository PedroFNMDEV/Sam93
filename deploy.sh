#!/bin/bash

# Script de deploy para produção
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando deploy para produção..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
cd backend
npm install
cd ..

# Build do frontend para produção
echo "🔨 Fazendo build do frontend..."
npm run build:production

# Criar diretório de logs se não existir
mkdir -p logs

# Parar processos existentes (se houver)
echo "🛑 Parando processos existentes..."
pkill -f "node.*server.js" || true
pkill -f "serve.*dist" || true

# Aguardar um momento para os processos terminarem
sleep 2

# Iniciar backend em produção
echo "🚀 Iniciando backend em produção..."
cd backend
NODE_ENV=production nohup node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Aguardar backend inicializar
echo "⏳ Aguardando backend inicializar..."
sleep 5

# Verificar se backend está rodando
if ! curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "❌ Erro: Backend não está respondendo"
    kill $BACKEND_PID || true
    exit 1
fi

# Iniciar frontend em produção
echo "🚀 Iniciando frontend em produção..."
nohup npx serve -s dist -l 3000 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Aguardar frontend inicializar
echo "⏳ Aguardando frontend inicializar..."
sleep 3

# Verificar se frontend está rodando
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Erro: Frontend não está respondendo"
    kill $FRONTEND_PID || true
    kill $BACKEND_PID || true
    exit 1
fi

# Salvar PIDs para poder parar depois
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🌐 URLs de acesso:"
echo "   Frontend: http://samhost.wcore.com.br"
echo "   Backend API: http://samhost.wcore.com.br:3001/api"
echo "   Health Check: http://samhost.wcore.com.br:3001/api/health"
echo ""
echo "📊 Monitoramento:"
echo "   Logs do backend: tail -f logs/backend.log"
echo "   Logs do frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 Para parar os serviços:"
echo "   ./stop.sh"
echo ""
echo "⚠️  Lembre-se de configurar o Nginx conforme o arquivo nginx.conf"