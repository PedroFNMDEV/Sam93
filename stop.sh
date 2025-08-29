#!/bin/bash

# Script para parar os serviços
echo "🛑 Parando serviços..."

# Parar usando PIDs salvos
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    kill $BACKEND_PID 2>/dev/null || true
    rm logs/backend.pid
    echo "✅ Backend parado"
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    kill $FRONTEND_PID 2>/dev/null || true
    rm logs/frontend.pid
    echo "✅ Frontend parado"
fi

# Parar qualquer processo restante
pkill -f "node.*server.js" || true
pkill -f "serve.*dist" || true

echo "✅ Todos os serviços foram parados"