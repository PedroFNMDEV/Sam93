# 🏗️ Nova Estrutura do Wowza - Seguindo Padrão de Referência

## 📁 Estrutura de Diretórios

### Vídeos e Conteúdo
```bash
/home/streaming/
├── {usuario1}/
│   ├── .ftpquota                    # Arquivo de controle de quota (em bytes)
│   ├── playlists_agendamentos.smil  # Arquivo SMIL para agendamentos
│   ├── {pasta1}/
│   │   ├── video1.mp4
│   │   └── video2.avi
│   ├── {pasta2}/
│   │   └── filme.mkv
│   ├── logos/
│   │   └── logo.png
│   └── recordings/
│       └── gravacao_live.mp4
└── {usuario2}/
    ├── .ftpquota
    ├── playlists_agendamentos.smil
    ├── default/
    │   └── video.mp4
    └── recordings/
        └── stream_rec.mp4
```

### Configurações do Wowza
```bash
/usr/local/WowzaStreamingEngine-4.8.0/conf/
├── {usuario1}/
│   ├── Application.xml
│   ├── aliasmap.play.txt
│   ├── aliasmap.stream.txt
│   └── publish.password
└── {usuario2}/
    ├── Application.xml
    ├── aliasmap.play.txt
    ├── aliasmap.stream.txt
    └── publish.password
```

## 📄 Arquivos de Configuração

### Application.xml
- Aplicação específica para cada usuário
- Nome da aplicação = nome do usuário
- StorageDir aponta para `/home/streaming/{usuario}`
- Configurações de bitrate e espectadores baseadas no plano

### aliasmap.play.txt
```
{usuario}=${Stream.Name}
```

### aliasmap.stream.txt
```
*=${Stream.Name}
```

### publish.password
```
{usuario} teste2025
```

## 🔗 URLs de Streaming

### Para Transmissão ao Vivo (OBS)
- **RTMP URL:** `rtmp://samhost.wcore.com.br:1935/{usuario}`
- **Stream Key:** `{usuario}_live`
- **HLS Playback:** `http://samhost.wcore.com.br:1935/{usuario}/{usuario}_live/playlist.m3u8`

### Para Vídeos VOD
- **HLS URL:** `http://samhost.wcore.com.br:1935/{usuario}/_definst_/mp4:{pasta}/{arquivo}/playlist.m3u8`
- **VOD URL:** `http://samhost.wcore.com.br:1935/vod/_definst_/mp4:{usuario}/{pasta}/{arquivo}/playlist.m3u8`

## 🛠️ Implementação

### 1. WowzaConfigManager
- Gerencia criação de estrutura completa
- Cria arquivos de configuração baseados no template
- Aplica configurações específicas do usuário (bitrate, espectadores)

### 2. SSHManager Atualizado
- Métodos para criar estrutura completa
- Verificação de estrutura existente
- Migração de vídeos da estrutura antiga

### 3. Rotas Atualizadas
- Todas as rotas agora usam nova estrutura
- URLs construídas dinamicamente
- Compatibilidade com estrutura antiga mantida

## 🔄 Migração

### Automática
- Sistema detecta vídeos na estrutura antiga
- Migra automaticamente para nova estrutura
- Atualiza caminhos no banco de dados

### Manual
- Endpoint `/api/user-wowza-setup/migrate` para migração forçada
- Verificação de integridade após migração
- Logs detalhados do processo

## ✅ Vantagens da Nova Estrutura

1. **Isolamento por Usuário:** Cada usuário tem sua própria aplicação Wowza
2. **Segurança:** Configurações isoladas e senhas específicas
3. **Performance:** Aplicações otimizadas por usuário
4. **Escalabilidade:** Fácil adição de novos usuários
5. **Compatibilidade:** Segue padrão de sistemas de referência
6. **Manutenção:** Estrutura organizada e previsível
7. **Controle de Quota:** Arquivo .ftpquota para controle de espaço
8. **Agendamentos:** Arquivo SMIL automático para playlists
9. **Organização:** Estrutura /home/streaming padronizada
10. **Permissões:** Usuário 'streaming' com permissões corretas

## 🚀 Próximos Passos

1. Testar criação de estrutura para novos usuários
2. Migrar usuários existentes gradualmente
3. Atualizar documentação de deploy
4. Configurar monitoramento por aplicação
5. Implementar backup específico por usuário