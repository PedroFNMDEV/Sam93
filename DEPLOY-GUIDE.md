# 🚀 Guia Completo de Deploy - samhost.wcore.com.br

## 📋 Pré-requisitos

### No Servidor SSH
- Ubuntu 20.04+ ou CentOS 7+
- Acesso root ou sudo
- Domínio samhost.wcore.com.br apontando para o servidor
- Portas 80, 3001 e 1935 liberadas no firewall

### Localmente
- Git configurado
- Acesso SSH ao servidor

## 🔧 Passo a Passo do Deploy

### 1. Preparar o Servidor

```bash
# Conectar ao servidor
ssh root@samhost.wcore.com.br

# Executar script de instalação de dependências
./install-dependencies.sh
```

### 2. Upload do Código

```bash
# Opção 1: Via Git (recomendado)
git clone https://github.com/seu-usuario/streaming-system.git /home/project
cd /home/project

# Opção 2: Via SCP/SFTP
# Fazer upload dos arquivos para /home/project
```

### 3. Configurar Permissões

```bash
cd /home/project
chmod +x *.sh
```

### 4. Executar Deploy

```bash
# Deploy completo
./deploy-production.sh
```

### 5. Configurar Nginx

```bash
# Copiar configuração do Nginx
sudo cp nginx-production.conf /etc/nginx/sites-available/samhost.wcore.com.br
sudo ln -s /etc/nginx/sites-available/samhost.wcore.com.br /etc/nginx/sites-enabled/

# Testar e recarregar
sudo nginx -t
sudo systemctl reload nginx
```

## 🌐 URLs do Sistema

Após o deploy, o sistema estará disponível em:

- **Frontend:** http://samhost.wcore.com.br
- **Backend API:** http://samhost.wcore.com.br:3001/api
- **Health Check:** http://samhost.wcore.com.br:3001/api/health
- **Streaming RTMP:** rtmp://samhost.wcore.com.br:1935/samhost
- **Streaming HLS:** http://samhost.wcore.com.br:1935/samhost/{usuario}_live/playlist.m3u8

## 📊 Monitoramento

### Verificar Status
```bash
# Status geral do sistema
./health-check.sh

# Status do PM2
pm2 status

# Logs em tempo real
pm2 logs samhost-backend

# Status do Nginx
sudo systemctl status nginx
```

### Logs Importantes
- **Backend:** `pm2 logs samhost-backend`
- **Nginx:** `/var/log/nginx/samhost_error.log`
- **Sistema:** `journalctl -u nginx`

## 🔄 Atualizações

### Atualizar Sistema
```bash
# Atualização completa
./update-production.sh

# Ou manualmente:
git pull origin main
npm run build:production
pm2 restart samhost-backend
```

### Backup Antes de Atualizar
```bash
# Fazer backup
./backup-system.sh
```

## 🛠️ Comandos Úteis

### Gerenciamento de Processos
```bash
# Ver status
pm2 status

# Reiniciar
pm2 restart samhost-backend

# Parar
pm2 stop samhost-backend

# Ver logs
pm2 logs samhost-backend --lines 100

# Monitorar recursos
pm2 monit
```

### Nginx
```bash
# Testar configuração
sudo nginx -t

# Recarregar
sudo systemctl reload nginx

# Reiniciar
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/samhost_error.log
```

### Sistema
```bash
# Verificar portas
sudo netstat -tlnp | grep -E ":(80|3001|1935)"

# Verificar recursos
htop

# Verificar espaço
df -h
```

## 🔒 Segurança

### Firewall
```bash
# Configurar UFW
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3001  # Backend
sudo ufw allow 1935  # RTMP
sudo ufw enable
```

### SSL (Opcional)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d samhost.wcore.com.br

# Renovação automática
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Backend não inicia**
   ```bash
   pm2 logs samhost-backend
   # Verificar configuração do banco de dados
   ```

2. **Frontend não carrega**
   ```bash
   sudo nginx -t
   ls -la /home/project/dist/
   ```

3. **Erro 502 Bad Gateway**
   ```bash
   # Verificar se backend está rodando
   curl http://localhost:3001/api/health
   ```

4. **Streaming não funciona**
   ```bash
   # Testar conexão com Wowza
   curl http://51.222.156.223:6980
   ```

### Logs de Debug
```bash
# Backend detalhado
pm2 logs samhost-backend --lines 50

# Nginx detalhado
sudo tail -f /var/log/nginx/samhost_error.log

# Sistema
journalctl -f
```

## 📞 Checklist Final

- [ ] Servidor preparado com dependências
- [ ] Código enviado para /home/project
- [ ] Scripts com permissão de execução
- [ ] Deploy executado com sucesso
- [ ] Nginx configurado e funcionando
- [ ] PM2 configurado para auto-start
- [ ] Firewall configurado
- [ ] URLs testadas e funcionando
- [ ] Backup configurado
- [ ] Monitoramento ativo

## 🎯 Próximos Passos

1. **Configurar SSL** para HTTPS
2. **Configurar backup automático** do banco
3. **Configurar monitoramento** com alertas
4. **Configurar CDN** para melhor performance
5. **Configurar load balancer** se necessário

## 📧 Suporte

Em caso de problemas:
1. Verificar logs com `./health-check.sh`
2. Verificar configurações de rede
3. Verificar conectividade com banco e Wowza
4. Verificar permissões de arquivos