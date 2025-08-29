module.exports = {
  apps: [
    {
      name: 'samhost-backend',
      script: './backend/server.js',
      cwd: '/home/project',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Configurações específicas de produção
        DB_HOST: '104.251.209.68',
        DB_PORT: 35689,
        DB_USER: 'admin',
        DB_PASSWORD: 'Adr1an@',
        DB_NAME: 'db_SamCast',
        WOWZA_HOST: '51.222.156.223',
        WOWZA_PORT: 6980,
        WOWZA_USER: 'admin',
        WOWZA_PASSWORD: 'FK38Ca2SuE6jvJXed97VMn',
        WOWZA_APPLICATION: 'live',
        JWT_SECRET: 'sua_chave_secreta_super_segura_aqui_producao_2024',
        PRODUCTION_DOMAIN: 'samhost.wcore.com.br'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      // Configurações de restart automático
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // Configurações de monitoramento
      monitoring: false,
      // Configurações de merge de logs
      merge_logs: true,
      // Configurações de ambiente
      source_map_support: false,
      instance_var: 'INSTANCE_ID'
    }
  ],
  
  // Configurações de deploy (opcional)
  deploy: {
    production: {
      user: 'root',
      host: 'samhost.wcore.com.br',
      ref: 'origin/main',
      repo: 'git@github.com:seu-usuario/seu-repo.git',
      path: '/home/project',
      'post-deploy': 'npm install && npm run build:production && pm2 reload ecosystem.production.config.js --env production'
    }
  }
};