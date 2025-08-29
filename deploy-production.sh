#!/bin/bash

# Script de deploy para servidor SSH em produção
# Uso: ./deploy-production.sh

set -e

echo "🚀 Iniciando deploy para produção no servidor SSH..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não está instalado"
    echo "Execute: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# Parar processos existentes
echo "🛑 Parando processos existentes..."
pm2 stop samhost-backend 2>/dev/null || true
pm2 delete samhost-backend 2>/dev/null || true

# Instalar dependências
echo "📦 Instalando dependências do frontend..."
npm install

echo "📦 Instalando dependências do backend..."
cd backend
npm install
cd ..

# Build do frontend para produção
echo "🔨 Fazendo build do frontend..."
NODE_ENV=production npm run build

# Verificar se build foi criado
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build do frontend falhou"
    exit 1
fi

# Criar diretório de logs
mkdir -p logs

# Configurar variáveis de ambiente para produção
echo "⚙️ Configurando variáveis de ambiente..."
export NODE_ENV=production
export PORT=3001

# Iniciar backend com PM2
echo "🚀 Iniciando backend com PM2..."
pm2 start ecosystem.config.js --env production

# Aguardar backend inicializar
echo "⏳ Aguardando backend inicializar..."
sleep 10

# Verificar se backend está rodando
if ! curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "❌ Erro: Backend não está respondendo"
    pm2 logs samhost-backend --lines 20
    exit 1
fi

# Configurar Nginx se não estiver configurado
if [ ! -f "/etc/nginx/sites-enabled/samhost.wcore.com.br" ]; then
    echo "⚙️ Configurando Nginx..."
    sudo cp nginx.conf /etc/nginx/sites-available/samhost.wcore.com.br
    sudo ln -s /etc/nginx/sites-available/samhost.wcore.com.br /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
fi

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot (apenas se não estiver configurado)
if ! pm2 startup | grep -q "already"; then
    echo "⚙️ Configurando PM2 para iniciar no boot..."
    pm2 startup | grep "sudo" | bash
fi

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🌐 URLs de acesso:"
echo "   Frontend: http://samhost.wcore.com.br"
echo "   Backend API: http://samhost.wcore.com.br:3001/api"
echo "   Health Check: http://samhost.wcore.com.br:3001/api/health"
echo ""
echo "📊 Comandos úteis:"
echo "   Ver status: pm2 status"
echo "   Ver logs: pm2 logs samhost-backend"
echo "   Reiniciar: pm2 restart samhost-backend"
echo "   Parar: pm2 stop samhost-backend"
echo ""
echo "🔧 Próximos passos:"
echo "1. Verificar se o domínio samhost.wcore.com.br aponta para este servidor"
echo "2. Configurar firewall: sudo ufw allow 80 && sudo ufw allow 3001 && sudo ufw allow 1935"
echo "3. Testar acesso: curl http://samhost.wcore.com.br"