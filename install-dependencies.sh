#!/bin/bash

# Script para instalar dependências no servidor SSH
# Execute este script ANTES do deploy

echo "📦 Instalando dependências do sistema..."

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Instalar Nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    sudo apt install -y nginx
fi

# Instalar PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# Instalar outras dependências úteis
sudo apt install -y curl wget git htop

# Configurar firewall básico
echo "🔒 Configurando firewall..."
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3001  # Backend API
sudo ufw allow 1935  # RTMP
sudo ufw --force enable

# Criar diretórios necessários
sudo mkdir -p /usr/local/WowzaStreamingEngine/content
sudo chmod 755 /usr/local/WowzaStreamingEngine/content

echo "✅ Dependências instaladas com sucesso!"
echo ""
echo "🔧 Próximos passos:"
echo "1. Fazer upload do código para o servidor"
echo "2. Executar: chmod +x *.sh"
echo "3. Executar: ./deploy-production.sh"