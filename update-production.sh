#!/bin/bash

# Script para atualizar o sistema em produção
# Uso: ./update-production.sh

set -e

echo "🔄 Iniciando atualização do sistema..."

# Fazer backup dos logs atuais
echo "💾 Fazendo backup dos logs..."
mkdir -p backups
cp -r logs backups/logs_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Atualizar código (se usando git)
if [ -d ".git" ]; then
    echo "📥 Atualizando código do repositório..."
    git pull origin main
fi

# Instalar/atualizar dependências
echo "📦 Atualizando dependências..."
npm install

cd backend
npm install
cd ..

# Fazer novo build
echo "🔨 Fazendo novo build..."
NODE_ENV=production npm run build

# Verificar se build foi criado
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build do frontend falhou"
    exit 1
fi

# Reiniciar aplicação com PM2
echo "🔄 Reiniciando aplicação..."
pm2 restart samhost-backend

# Aguardar reinicialização
echo "⏳ Aguardando reinicialização..."
sleep 10

# Verificar se está funcionando
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Atualização concluída com sucesso!"
    echo ""
    echo "📊 Status atual:"
    pm2 status
else
    echo "❌ Erro: Sistema não está respondendo após atualização"
    echo "📋 Logs do erro:"
    pm2 logs samhost-backend --lines 20
    exit 1
fi

echo ""
echo "🌐 Sistema atualizado e funcionando:"
echo "   Frontend: http://samhost.wcore.com.br"
echo "   Backend: http://samhost.wcore.com.br:3001/api/health"