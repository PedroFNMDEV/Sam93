#!/bin/bash

# Script para fazer backup do sistema

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "💾 Fazendo backup do sistema..."

# Backup dos arquivos de configuração
echo "📄 Backup dos arquivos de configuração..."
cp -r backend/config "$BACKUP_DIR/" 2>/dev/null || true
cp ecosystem.config.js "$BACKUP_DIR/" 2>/dev/null || true
cp nginx.conf "$BACKUP_DIR/" 2>/dev/null || true
cp .env.production "$BACKUP_DIR/" 2>/dev/null || true

# Backup dos logs
echo "📋 Backup dos logs..."
cp -r logs "$BACKUP_DIR/" 2>/dev/null || true

# Backup do banco de dados (opcional - descomente se necessário)
# echo "🗄️ Backup do banco de dados..."
# mysqldump -h 104.251.209.68 -P 35689 -u admin -p'Adr1an@' db_SamCast > "$BACKUP_DIR/database_backup.sql"

# Backup dos uploads/conteúdo (se existir)
if [ -d "/usr/local/WowzaStreamingEngine/content" ]; then
    echo "📁 Backup do conteúdo..."
    sudo tar -czf "$BACKUP_DIR/content_backup.tar.gz" /usr/local/WowzaStreamingEngine/content/ 2>/dev/null || true
fi

# Criar arquivo de informações do backup
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup criado em: $(date)
Servidor: $(hostname)
Usuário: $(whoami)
Versão do Node.js: $(node --version)
Status do PM2:
$(pm2 status)

Arquivos incluídos:
- Configurações do backend
- Configurações do Nginx
- Logs do sistema
- Informações do PM2
EOF

echo "✅ Backup concluído em: $BACKUP_DIR"
echo ""
echo "📁 Arquivos salvos:"
ls -la "$BACKUP_DIR"

# Limpar backups antigos (manter apenas os últimos 7 dias)
find backups/ -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "🧹 Backups antigos removidos (mantidos últimos 7 dias)"