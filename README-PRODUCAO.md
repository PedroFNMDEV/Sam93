# Deploy para Produção - samhost.wcore.com.br

## 🚀 Guia de Deploy

### Pré-requisitos
- Node.js 18+ instalado
- Nginx instalado e configurado
- Acesso ao servidor de produção
- Domínio samhost.wcore.com.br apontando para o servidor

### 1. Preparação do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gerenciamento de processos
sudo npm install -g pm2

# Instalar serve para servir arquivos estáticos
sudo npm install -g serve

# Verificar instalações
node --version
npm --version
pm2 --version
```

### 2. Configuração do Nginx

```bash
# Copiar configuração do Nginx
sudo cp nginx.conf /etc/nginx/sites-available/samhost.wcore.com.br

# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/samhost.wcore.com.br /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 3. Deploy da Aplicação

```bash
# Clonar/atualizar código
git pull origin main

# Dar permissão aos scripts
chmod +x deploy.sh stop.sh

# Executar deploy
./deploy.sh
```

### 4. Configuração com PM2 (Recomendado)

```bash
# Parar deploy manual se estiver rodando
./stop.sh

# Iniciar com PM2
pm2 start ecosystem.config.js --env production

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
```

## 🔧 Configurações de Produção

### URLs do Sistema
- **Frontend:** http://samhost.wcore.com.br
- **Backend API:** http://samhost.wcore.com.br:3001/api
- **Health Check:** http://samhost.wcore.com.br:3001/api/health
- **Arquitetura de Portas:**
  - **Porta 6980:** Acesso a vídeos VOD (Video on Demand) via Wowza
  - **Porta 1935:** Transmissões RTMP e streams HLS ao vivo
  - **Porta 3001:** API do backend
  - **Porta 80:** Frontend web

### Banco de Dados
- **Host:** 104.251.209.68:35689
- **Database:** db_SamCast
- **Usuário:** admin
- **Senha:** Adr1an@

### Servidor Wowza
- **Host:** 51.222.156.223:6980
- **Usuário:** admin
- **Senha:** FK38Ca2SuE6jvJXed97VMn
- **Aplicação:** live

### URLs de Streaming
- **RTMP:** rtmp://samhost.wcore.com.br:1935/samhost
- **HLS:** http://samhost.wcore.com.br:1935/samhost/{usuario}_live/playlist.m3u8

## 📊 Monitoramento

### Logs
```bash
# Logs do PM2
pm2 logs

# Logs específicos
pm2 logs samhost-backend

# Logs do Nginx
sudo tail -f /var/log/nginx/samhost_access.log
sudo tail -f /var/log/nginx/samhost_error.log
```

### Status dos Serviços
```bash
# Status do PM2
pm2 status

# Status do Nginx
sudo systemctl status nginx

# Verificar portas
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :80
```

### Health Checks
```bash
# Verificar backend
curl http://samhost.wcore.com.br:3001/api/health

# Verificar frontend
curl http://samhost.wcore.com.br

# Verificar streaming
curl http://samhost.wcore.com.br:1935/samhost/test_live/playlist.m3u8
```

## 🛠️ Comandos Úteis

### Gerenciamento de Processos
```bash
# Reiniciar aplicação
pm2 restart samhost-backend

# Parar aplicação
pm2 stop samhost-backend

# Ver logs em tempo real
pm2 logs samhost-backend --lines 100

# Monitorar recursos
pm2 monit
```

### Atualizações
```bash
# Atualizar código
git pull origin main

# Rebuild e restart
npm run build:production
pm2 restart samhost-backend
```

### Backup
```bash
# Backup do banco (se necessário)
mysqldump -h 104.251.209.68 -P 35689 -u admin -p db_SamCast > backup_$(date +%Y%m%d).sql

# Backup dos arquivos de configuração
tar -czf config_backup_$(date +%Y%m%d).tar.gz nginx.conf ecosystem.config.js .env.production
```

## 🔒 Segurança

### Firewall
```bash
# Permitir apenas portas necessárias
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (se usar SSL)
sudo ufw allow 3001  # Backend API
sudo ufw allow 1935  # RTMP
sudo ufw enable
```

### SSL (Opcional)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d samhost.wcore.com.br

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Backend não inicia**
   ```bash
   # Verificar logs
   pm2 logs samhost-backend
   
   # Verificar porta
   sudo netstat -tlnp | grep :3001
   ```

2. **Frontend não carrega**
   ```bash
   # Verificar Nginx
   sudo nginx -t
   sudo systemctl status nginx
   
   # Verificar arquivos
   ls -la /home/project/dist/
   ```

3. **Erro de CORS**
   ```bash
   # Verificar configuração no backend/server.js
   # Verificar se domínio está na lista de origins permitidas
   ```

4. **Streaming não funciona**
   ```bash
   # Verificar conexão com Wowza
   curl http://51.222.156.223:6980
   
   # Verificar configuração de proxy no Nginx
   ```

### Logs Importantes
- **Backend:** `pm2 logs samhost-backend`
- **Nginx:** `/var/log/nginx/samhost_error.log`
- **Sistema:** `journalctl -u nginx`

## 📞 Suporte

Em caso de problemas:
1. Verificar logs dos serviços
2. Verificar conectividade com banco e Wowza
3. Verificar configurações de firewall
4. Verificar configuração do Nginx
5. Verificar se todas as dependências estão instaladas