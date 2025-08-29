#!/bin/bash

# Script para verificar saúde do sistema em produção

echo "🔍 Verificando saúde do sistema..."

# Verificar se PM2 está rodando
echo "📊 Status do PM2:"
pm2 status

# Verificar se backend está respondendo
echo ""
echo "🔧 Testando backend..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend está respondendo"
    curl -s http://localhost:3001/api/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/health
else
    echo "❌ Backend não está respondendo"
fi

# Verificar se frontend está acessível
echo ""
echo "🌐 Testando frontend..."
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Frontend está acessível"
else
    echo "❌ Frontend não está acessível"
fi

# Verificar conexão com banco de dados
echo ""
echo "🗄️ Testando conexão com banco..."
if curl -s http://localhost:3001/api/health | grep -q "connected"; then
    echo "✅ Banco de dados conectado"
else
    echo "❌ Problema na conexão com banco de dados"
fi

# Verificar uso de memória e CPU
echo ""
echo "💻 Recursos do sistema:"
echo "Memória:"
free -h
echo ""
echo "CPU:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# Verificar espaço em disco
echo ""
echo "💾 Espaço em disco:"
df -h /

# Verificar logs recentes
echo ""
echo "📋 Últimas linhas dos logs:"
echo "Backend:"
tail -n 5 logs/backend-combined.log 2>/dev/null || echo "Arquivo de log não encontrado"

# Verificar portas
echo ""
echo "🔌 Portas em uso:"
sudo netstat -tlnp | grep -E ":(80|3001|1935|22)\s"

echo ""
echo "🔍 Verificação concluída!"