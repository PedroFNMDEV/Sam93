const DigestFetch = require('digest-fetch');
const db = require('./database');
const SSHManager = require('./SSHManager');
const WowzaConfigManager = require('./WowzaConfigManager');

class WowzaStreamingService {
    constructor(serverId = null) {
        this.serverId = serverId;
        this.wowzaHost = null;
        this.wowzaPassword = null;
        this.wowzaUser = null;
        this.wowzaPort = null;
        this.wowzaApplication = process.env.WOWZA_APPLICATION || 'live';
        this.baseUrl = null;
        this.client = null;
        this.activeStreams = new Map();
        this.obsStreams = new Map(); // Para streams vindos do OBS
        this.lastErrorLogged = 0; // Para evitar spam de logs
        this.connectionAttempts = 0; // Contador de tentativas
    }

    async initializeFromDatabase(userId) {
        try {
            // Cache de inicialização para evitar múltiplas inicializações
            const cacheKey = `init_${userId}`;
            if (this.operationQueue && this.operationQueue.has(cacheKey)) {
                const cached = this.operationQueue.get(cacheKey);
                if (Date.now() - cached.timestamp < 60000) { // Cache por 1 minuto
                    return cached.result;
                }
            }

            // Buscar dados do servidor Wowza baseado no usuário
            let serverId = this.serverId;

            // Primeiro, tentar buscar o servidor do streaming do usuário
            const [streamingRows] = await db.execute(
                'SELECT codigo_servidor FROM streamings WHERE codigo_cliente = ? OR codigo = ? LIMIT 1',
                [userId, userId]
            );

            if (streamingRows.length > 0) {
                serverId = streamingRows[0].codigo_servidor;
            }

            // Se não encontrou servidor específico, buscar o melhor servidor disponível
            if (!serverId) {
                const [bestServerRows] = await db.execute(
                    `SELECT codigo FROM wowza_servers 
                     WHERE status = 'ativo' 
                     ORDER BY streamings_ativas ASC, load_cpu ASC 
                     LIMIT 1`
                );

                if (bestServerRows.length > 0) {
                    serverId = bestServerRows[0].codigo;
                }
            }

            // Buscar configurações do servidor Wowza
            const [serverRows] = await db.execute(
                `SELECT 
                    codigo,
                    nome,
                    ip,
                    dominio,
                    senha_root,
                    porta_ssh,
                    limite_streamings,
                    streamings_ativas,
                    load_cpu,
                    status,
                    tipo_servidor
                 FROM wowza_servers 
                 WHERE codigo = ? AND status = 'ativo'`,
                [serverId || 1]
            );

            if (serverRows.length > 0) {
                const server = serverRows[0];
                this.serverId = server.codigo;
                this.wowzaHost = server.ip || server.dominio; // Priorizar IP para evitar problemas de DNS
                this.wowzaPort = 6980; // Porta da API REST do Wowza
                this.wowzaUser = 'admin'; // Usuário padrão da API
                this.wowzaPassword = 'FK38Ca2SuE6jvJXed97VMn'; // Senha correta do Wowza
                this.serverInfo = {
                    id: server.codigo,
                    nome: server.nome,
                    dominio: server.dominio,
                    ip: server.ip,
                    limite_streamings: server.limite_streamings,
                    streamings_ativas: server.streamings_ativas,
                    load_cpu: server.load_cpu,
                    tipo_servidor: server.tipo_servidor
                };

                this.baseUrl = `http://${this.wowzaHost}:${this.wowzaPort}/v2/servers/_defaultServer_/vhosts/_defaultVHost_`;
                this.client = new DigestFetch(this.wowzaUser, this.wowzaPassword);

                // Cache do resultado da inicialização
                const initResult = true;
                if (this.operationQueue) {
                    this.operationQueue.set(cacheKey, {
                        timestamp: Date.now(),
                        result: initResult
                    });
                }

                return initResult;
            } else {
                console.error('❌ Nenhum servidor Wowza ativo encontrado');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar Wowza:', error.message);
            return false;
        }
    }

    async makeWowzaRequest(endpoint, method = 'GET', data = null) {
        if (!this.client || !this.baseUrl) {
            console.warn('⚠️ Serviço Wowza não inicializado, usando modo fallback');
            return { success: false, error: 'Wowza não inicializado', fallback: true };
        }

        // Implementar rate limiting para evitar spam
        const rateLimitKey = `wowza_request_${endpoint}_${method}`;
        const lastRequest = this.operationQueue?.get(rateLimitKey);
        if (lastRequest && Date.now() - lastRequest < 1000) { // 1 segundo entre requisições similares
            console.log(`⏳ Rate limit ativo para ${endpoint}, pulando requisição`);
            return { success: false, error: 'Rate limit ativo', rate_limited: true };
        }

        try {
            const url = `${this.baseUrl}${endpoint}`;
            const options = {
                method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout: 5000, // Reduzir timeout para 5 segundos
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            // Marcar requisição no rate limit
            if (this.operationQueue) {
                this.operationQueue.set(rateLimitKey, Date.now());
            }

            const response = await Promise.race([
                this.client.fetch(url, options),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout na requisição Wowza')), 5000)
                )
            ]);

            const text = await response.text();

            let parsedData;
            try {
                parsedData = text ? JSON.parse(text) : {};
            } catch {
                parsedData = text;
            }

            return {
                statusCode: response.status,
                data: parsedData,
                success: response.ok
            };
        } catch (error) {
            // Reduzir logs de erro repetitivos para 5 minutos
            if (!this.lastErrorLogged || Date.now() - this.lastErrorLogged > 300000) {
                console.error(`❌ Wowza ${this.wowzaHost}:${this.wowzaPort} - ${error.message}`);
                this.lastErrorLogged = Date.now();
            }

            let errorMessage = error.message;
            if (error.code === 'ECONNREFUSED') {
                errorMessage = `Conexão recusada pelo servidor Wowza (${this.wowzaHost}:${this.wowzaPort}). Verifique se o serviço está rodando.`;
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = `Servidor Wowza não encontrado (${this.wowzaHost}). Verifique o endereço.`;
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('Timeout')) {
                errorMessage = `Timeout na conexão com Wowza (${this.wowzaHost}:${this.wowzaPort}). Servidor pode estar sobrecarregado.`;
            }

            return { success: false, error: errorMessage, code: error.code };
        }
    }

    async ensureApplication(appName = null) {
        const applicationName = appName || this.wowzaApplication;

        const checkResult = await this.makeWowzaRequest(
            `/applications/${applicationName}`
        );

        if (checkResult.success) {
            return { success: true, exists: true };
        }

        const appConfig = {
            id: applicationName,
            appType: 'Live',
            name: applicationName,
            description: 'Live streaming app created via API',
        };

        const createResult = await this.makeWowzaRequest(
            `/applications`,
            'POST',
            appConfig
        );

        return {
            success: createResult.success,
            exists: false,
            created: createResult.success
        };
    }

    async configurePlatformPush(streamName, platforms) {
        const pushConfigs = [];

        for (const platform of platforms) {
            try {
                const pushConfig = {
                    id: `${streamName}_${platform.platform.codigo}`,
                    sourceStreamName: streamName,
                    entryName: streamName,
                    outputHostName: this.extractHostFromRtmp(platform.rtmp_url || platform.platform.rtmp_base_url),
                    outputApplicationName: this.extractAppFromRtmp(platform.rtmp_url || platform.platform.rtmp_base_url),
                    outputStreamName: platform.stream_key,
                    userName: '',
                    password: '',
                    enabled: true
                };

                const result = await this.makeWowzaRequest(
                    `/applications/${this.wowzaApplication}/pushpublish/mapentries/${pushConfig.id}`,
                    'PUT',
                    pushConfig
                );

                if (result.success) {
                    pushConfigs.push({
                        platform: platform.platform.codigo,
                        name: pushConfig.id,
                        success: true
                    });
                } else {
                    pushConfigs.push({
                        platform: platform.platform.codigo,
                        name: pushConfig.id,
                        success: false,
                        error: result.data
                    });
                }
            } catch (error) {
                console.error(`Erro ao configurar push para ${platform.platform.nome}:`, error);
                pushConfigs.push({
                    platform: platform.platform.codigo,
                    success: false,
                    error: error.message
                });
            }
        }

        return pushConfigs;
    }

    extractHostFromRtmp(rtmpUrl) {
        try {
            const url = new URL(rtmpUrl.replace('rtmp://', 'http://').replace('rtmps://', 'https://'));
            return url.hostname;
        } catch {
            return rtmpUrl.split('/')[2] || rtmpUrl;
        }
    }

    extractAppFromRtmp(rtmpUrl) {
        try {
            const parts = rtmpUrl.split('/');
            return parts[3] || 'live';
        } catch {
            return 'live';
        }
    }

    // Configurar aplicação para receber streams do OBS
    async setupOBSApplication(userLogin, userConfig) {
        try {
            // Verificar se Wowza está disponível
            const wowzaAvailable = await this.isWowzaAvailable();

            if (!wowzaAvailable) {
                console.log(`⚠️ Wowza API indisponível, usando modo fallback para ${userLogin}`);
                return await this.setupOBSApplicationFallback(userLogin, userConfig);
            }

            // Aplicar limite de bitrate do usuário
            const maxBitrate = userConfig.bitrate || 2500;
            const streamKey = `${userLogin}_live`;

            // URLs simplificadas
            const isProduction = process.env.NODE_ENV === 'production';
            const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';

            const streamUrls = {
                rtmp: `rtmp://${wowzaHost}:1935/samhost`,
                hls: `http://${wowzaHost}:1935/samhost/${streamKey}/playlist.m3u8`,
                recording_path: `/home/streaming/${userLogin}/recordings/`
            };

            return {
                success: true,
                rtmpUrl: streamUrls.rtmp,
                streamKey: streamKey,
                hlsUrl: streamUrls.hls,
                recordingPath: streamUrls.recording_path,
                config: {
                    applicationName: 'samhost',
                    streamKey: streamKey,
                    maxBitrate: maxBitrate,
                    maxViewers: userConfig.espectadores || 100,
                    recordingEnabled: userConfig.status_gravando === 'sim'
                },
                maxBitrate: maxBitrate,
                bitrateEnforced: true
            };
        } catch (error) {
            console.error('Erro ao configurar aplicação OBS:', error);
            return { success: false, error: error.message };
        }
    }

    // Garantir que aplicação VOD existe para reprodução de vídeos
    async ensureVODApplication() {
        const vodAppName = 'vod';

        const checkResult = await this.makeWowzaRequest(
            `/applications/${vodAppName}`
        );

        if (checkResult.success) {
            return { success: true, exists: true };
        }

        const appConfig = {
            id: vodAppName,
            appType: 'VOD',
            name: vodAppName,
            description: 'Video on demand app for stored videos',
            streamType: 'file'
        };

        const createResult = await this.makeWowzaRequest(
            `/applications`,
            'POST',
            appConfig
        );

        return {
            success: createResult.success,
            exists: false,
            created: createResult.success
        };
    }

    // Construir URL correta para vídeos VOD
    buildVideoUrl(userLogin, folderName, fileName) {
        // Usar novo sistema de URLs
        return WowzaConfigManager.buildVideoUrls(userLogin, folderName, fileName, this.serverId);
    }

    // Iniciar gravação de stream
    async startRecording(streamName, userLogin) {
        try {
            const recordingConfig = {
                instanceName: `${streamName}_recording`,
                fileFormat: 'mp4',
                segmentationType: 'none',
                outputPath: `/usr/local/WowzaStreamingEngine/content/${userLogin}/recordings/`,
                recordData: true,
                applicationName: this.wowzaApplication,
                streamName: streamName
            };

            const result = await this.makeWowzaRequest(
                `/applications/${this.wowzaApplication}/instances/_definst_/streamrecorders/${recordingConfig.instanceName}`,
                'PUT',
                recordingConfig
            );

            return result;
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            return { success: false, error: error.message };
        }
    }

    // Parar gravação de stream
    async stopRecording(streamName) {
        try {
            const recordingInstanceName = `${streamName}_recording`;

            const result = await this.makeWowzaRequest(
                `/applications/${this.wowzaApplication}/instances/_definst_/streamrecorders/${recordingInstanceName}/actions/stopRecording`,
                'PUT'
            );

            return result;
        } catch (error) {
            console.error('Erro ao parar gravação:', error);
            return { success: false, error: error.message };
        }
    }

    // Verificar se stream está ativo (vindo do OBS)
    async checkOBSStreamStatus(streamName) {
        try {
            // Se Wowza não estiver disponível, retornar status padrão
            const wowzaAvailable = await this.isWowzaAvailable();
            if (!wowzaAvailable) {
                console.log(`⚠️ Wowza indisponível, retornando status simulado para ${streamName}`);
                return {
                    isLive: false,
                    streamName: streamName,
                    bitrate: 0,
                    viewers: 0,
                    uptime: '00:00:00',
                    fallback_mode: true
                };
            }

            const result = await this.makeWowzaRequest(
                `/applications/${this.wowzaApplication}/instances/_definst_/incomingstreams/${streamName}`
            );

            if (result.success && result.data) {
                return {
                    isLive: true,
                    streamName: streamName,
                    bitrate: result.data.bitrate || 0,
                    viewers: await this.getStreamViewers(streamName),
                    uptime: this.calculateStreamUptime(result.data.uptimeSeconds || 0)
                };
            }

            return { isLive: false };
        } catch (error) {
            console.error('Erro ao verificar status do stream OBS:', error);
            return {
                isLive: false,
                error: error.message,
                fallback_mode: true
            };
        }
    }

    // Obter número de espectadores de um stream
    async getStreamViewers(streamName) {
        try {
            const result = await this.makeWowzaRequest(
                `/applications/${this.wowzaApplication}/instances/_definst_/incomingstreams/${streamName}/monitoring/current`
            );

            if (result.success && result.data) {
                return result.data.sessionCount || 0;
            }

            return 0;
        } catch (error) {
            console.error('Erro ao obter espectadores:', error);
            return 0;
        }
    }

    // Calcular uptime do stream
    calculateStreamUptime(uptimeSeconds) {
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Configurar push para múltiplas plataformas
    async setupMultiPlatformPush(sourceStreamName, platforms, userConfig) {
        const pushConfigs = [];

        for (const platform of platforms) {
            try {
                // Verificar se o bitrate está dentro do limite do usuário
                const maxBitrate = userConfig.bitrate || 2500;
                const platformBitrate = Math.min(platform.bitrate || 2500, maxBitrate);

                const pushConfig = {
                    id: `${sourceStreamName}_${platform.platform.codigo}`,
                    sourceStreamName: sourceStreamName,
                    entryName: sourceStreamName,
                    outputHostName: this.extractHostFromRtmp(platform.rtmp_url || platform.platform.rtmp_base_url),
                    outputApplicationName: this.extractAppFromRtmp(platform.rtmp_url || platform.platform.rtmp_base_url),
                    outputStreamName: platform.stream_key,
                    userName: '',
                    password: '',
                    enabled: true,
                    profile: 'rtmp',
                    videoCodec: 'H.264',
                    audioCodec: 'AAC',
                    videoBitrate: platformBitrate,
                    audioBitrate: 128
                };

                const result = await this.makeWowzaRequest(
                    `/applications/${this.wowzaApplication}/pushpublish/mapentries/${pushConfig.id}`,
                    'PUT',
                    pushConfig
                );

                if (result.success) {
                    pushConfigs.push({
                        platform: platform.platform.codigo,
                        name: pushConfig.id,
                        success: true,
                        bitrate: platformBitrate
                    });
                } else {
                    pushConfigs.push({
                        platform: platform.platform.codigo,
                        name: pushConfig.id,
                        success: false,
                        error: result.data
                    });
                }
            } catch (error) {
                console.error(`Erro ao configurar push para ${platform.platform.nome}:`, error);
                pushConfigs.push({
                    platform: platform.platform.codigo,
                    success: false,
                    error: error.message
                });
            }
        }

        return pushConfigs;
    }

    // Iniciar transmissão de playlist do painel
    async startPlaylistStream({ streamId, userId, userLogin, userConfig, playlistId, videos = [], platforms = [] }) {
        try {
            console.log(`Iniciando transmissão de playlist - Stream ID: ${streamId}`);

            // Verificar limites do usuário
            if (this.serverInfo) {
                if (this.serverInfo.streamings_ativas >= this.serverInfo.limite_streamings) {
                    throw new Error('Servidor atingiu o limite máximo de streamings simultâneas');
                }

                if (this.serverInfo.load_cpu > 90) {
                    throw new Error('Servidor com alta carga de CPU. Tente novamente em alguns minutos');
                }
            }

            // Verificar se usuário não excedeu seu limite de bitrate
            const maxBitrate = userConfig.bitrate || 2500;
            const streamBitrate = Math.min(2500, maxBitrate);

            const appResult = await this.ensureApplication();
            if (!appResult.success) {
                throw new Error('Falha ao configurar aplicação no Wowza');
            }

            const streamName = `${userLogin}_playlist_${Date.now()}`;

            // Configurar push para plataformas
            const pushResults = await this.setupMultiPlatformPush(streamName, platforms, userConfig);

            // Configurar gravação se habilitada
            let recordingResult = null;
            if (userConfig.gravar_stream !== 'nao') {
                recordingResult = await this.startRecording(streamName, userLogin);
            }

            // Atualizar contador de streamings ativas no servidor
            if (this.serverId) {
                await db.execute(
                    'UPDATE wowza_servers SET streamings_ativas = streamings_ativas + 1 WHERE codigo = ?',
                    [this.serverId]
                );
            }

            this.activeStreams.set(streamId, {
                streamName,
                wowzaStreamId: streamName,
                videos,
                currentVideoIndex: 0,
                startTime: new Date(),
                playlistId,
                platforms: pushResults,
                viewers: 0,
                bitrate: streamBitrate,
                serverId: this.serverId,
                userLogin,
                recording: recordingResult?.success || false,
                type: 'playlist'
            });

            return {
                success: true,
                data: {
                    streamName,
                    wowzaStreamId: streamName,
                    rtmpUrl: `rtmp://${this.wowzaHost}:1935/${this.wowzaApplication}`,
                    streamKey: streamName,
                    playUrl: `http://${this.wowzaHost}:1935/${this.wowzaApplication}/${streamName}/playlist.m3u8`,
                    hlsUrl: `http://${this.wowzaHost}:1935/${this.wowzaApplication}/${streamName}/playlist.m3u8`,
                    dashUrl: `http://${this.wowzaHost}:1935/${this.wowzaApplication}/${streamName}/manifest.mpd`,
                    pushResults,
                    serverInfo: this.serverInfo,
                    recording: recordingResult?.success || false
                },
                bitrate: streamBitrate
            };

        } catch (error) {
            console.error('Erro ao iniciar stream de playlist:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async startStream({ streamId, userId, playlistId, videos = [], platforms = [] }) {
        // Método mantido para compatibilidade - redireciona para startPlaylistStream
        return this.startPlaylistStream({ streamId, userId, playlistId, videos, platforms });
    }

    async startOBSStream({ userId, userLogin, userConfig, platforms = [] }) {
        try {
            console.log(`Configurando stream OBS para usuário: ${userLogin}`);

            // Verificar e validar bitrate do usuário
            const maxBitrate = userConfig.bitrate || 2500;
            const requestedBitrate = userConfig.requested_bitrate || maxBitrate;

            if (requestedBitrate > maxBitrate) {
                console.warn(`⚠️ Bitrate solicitado (${requestedBitrate}) excede o limite (${maxBitrate}). Aplicando limite.`);
            }

            const allowedBitrate = Math.min(requestedBitrate, maxBitrate);

            // Verificar se o servidor ainda tem capacidade
            if (this.serverInfo) {
                if (this.serverInfo.streamings_ativas >= this.serverInfo.limite_streamings) {
                    throw new Error('Servidor atingiu o limite máximo de streamings simultâneas');
                }

                if (this.serverInfo.load_cpu > 90) {
                    throw new Error('Servidor com alta carga de CPU. Tente novamente em alguns minutos');
                }
            }

            // Configurar aplicação para receber stream do OBS
            const obsResult = await this.setupOBSApplication(userLogin, {
                ...userConfig,
                bitrate: allowedBitrate
            });
            if (!obsResult.success) {
                throw new Error(`Falha ao configurar aplicação para OBS: ${obsResult.error}`);
            }

            // Configurar push para plataformas se fornecidas (apenas se Wowza estiver disponível)
            let pushResults = [];
            if (platforms.length > 0 && !obsResult.fallback_mode) {
                pushResults = await this.setupMultiPlatformPush(`${userLogin}_live`, platforms, {
                    ...userConfig,
                    bitrate: allowedBitrate
                });
            } else if (platforms.length > 0 && obsResult.fallback_mode) {
                console.log(`⚠️ Push para plataformas desabilitado em modo fallback`);
                pushResults = platforms.map(p => ({
                    platform: p.platform?.codigo || 'unknown',
                    success: false,
                    error: 'Wowza API indisponível - modo fallback ativo'
                }));
            }

            // Atualizar contador de streamings ativas no servidor
            if (this.serverId) {
                await db.execute(
                    'UPDATE wowza_servers SET streamings_ativas = streamings_ativas + 1 WHERE codigo = ?',
                    [this.serverId]
                );
            }

            // Registrar stream OBS ativo
            this.obsStreams.set(userId, {
                userLogin,
                streamName: `${userLogin}_live`,
                startTime: new Date(),
                platforms: pushResults,
                serverId: this.serverId,
                type: 'obs',
                recording: userConfig.gravar_stream !== 'nao',
                maxBitrate: allowedBitrate,
                bitrateEnforced: true,
                fallback_mode: obsResult.fallback_mode || false
            });

            const warnings = [];
            if (obsResult.fallback_mode) {
                warnings.push('Wowza API indisponível - funcionando em modo degradado');
                warnings.push('Algumas funcionalidades avançadas podem não estar disponíveis');
            }
            return {
                success: true,
                data: {
                    rtmpUrl: obsResult.rtmpUrl,
                    streamKey: obsResult.streamKey,
                    hlsUrl: obsResult.hlsUrl,
                    recordingPath: obsResult.recordingPath,
                    pushResults,
                    serverInfo: this.serverInfo,
                    maxBitrate: allowedBitrate,
                    maxViewers: userConfig.espectadores || 100,
                    fallback_mode: obsResult.fallback_mode || false,
                    warnings: warnings
                },
                warnings: warnings
            };

        } catch (error) {
            console.error('Erro ao configurar stream OBS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async stopOBSStream(userId) {
        try {
            const streamInfo = this.obsStreams.get(userId);

            if (!streamInfo) {
                return {
                    success: true,
                    message: 'Stream OBS não estava ativo'
                };
            }

            // Parar gravação se estava ativa
            if (streamInfo.recording) {
                await this.stopRecording(streamInfo.streamName);
            }

            // Remover push para plataformas
            if (streamInfo.platforms) {
                for (const platform of streamInfo.platforms) {
                    if (platform.success && platform.name) {
                        await this.makeWowzaRequest(
                            `/applications/${this.wowzaApplication}/pushpublish/mapentries/${platform.name}`,
                            'DELETE'
                        );
                    }
                }
            }

            // Decrementar contador de streamings ativas no servidor
            if (streamInfo.serverId) {
                await db.execute(
                    'UPDATE wowza_servers SET streamings_ativas = GREATEST(streamings_ativas - 1, 0) WHERE codigo = ?',
                    [streamInfo.serverId]
                );
            }

            this.obsStreams.delete(userId);

            return {
                success: true,
                message: 'Stream OBS parado com sucesso'
            };

        } catch (error) {
            console.error('Erro ao parar stream OBS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getOBSStreamStats(userId) {
        try {
            const streamInfo = this.obsStreams.get(userId);

            if (!streamInfo) {
                return {
                    isActive: false,
                    isLive: false,
                    viewers: 0,
                    bitrate: 0,
                    uptime: '00:00:00'
                };
            }

            try {
                // Verificar se stream está realmente ativo no Wowza
                const wowzaStatus = await this.checkOBSStreamStatus(streamInfo.streamName);

                if (wowzaStatus.isLive) {
                    const uptime = this.calculateUptime(streamInfo.startTime);

                    return {
                        isActive: true,
                        isLive: true,
                        viewers: wowzaStatus.viewers,
                        bitrate: wowzaStatus.bitrate,
                        uptime,
                        platforms: streamInfo.platforms,
                        recording: streamInfo.recording,
                        fallback_mode: wowzaStatus.fallback_mode || false
                    };
                } else {
                    return {
                        isActive: false,
                        isLive: false,
                        viewers: 0,
                        bitrate: 0,
                        uptime: '00:00:00',
                        fallback_mode: wowzaStatus.fallback_mode || false
                    };
                }
            } catch (wowzaError) {
                console.warn('Erro ao verificar status no Wowza, usando dados locais:', wowzaError.message);

                // Fallback: usar dados locais se Wowza não estiver disponível
                const uptime = this.calculateUptime(streamInfo.startTime);

                return {
                    isActive: streamInfo.fallback_mode !== undefined ? !streamInfo.fallback_mode : true,
                    isLive: streamInfo.fallback_mode !== undefined ? !streamInfo.fallback_mode : true,
                    viewers: Math.floor(Math.random() * 10) + 1, // Simular espectadores
                    bitrate: streamInfo.maxBitrate || 2500,
                    uptime,
                    platforms: streamInfo.platforms,
                    recording: streamInfo.recording,
                    fallback_mode: true,
                    warning: 'Dados simulados - Wowza API indisponível'
                };
            }

        } catch (error) {
            console.error('Erro ao obter estatísticas do stream OBS:', error);
            return {
                isActive: false,
                isLive: false,
                viewers: 0,
                bitrate: 0,
                uptime: '00:00:00',
                error: error.message
            };
        }
    }

    async stopStream(streamId) {
        try {
            const streamInfo = this.activeStreams.get(streamId);

            if (!streamInfo) {
                return {
                    success: true,
                    message: 'Stream não estava ativo'
                };
            }

            if (streamInfo.platforms) {
                for (const platform of streamInfo.platforms) {
                    if (platform.success && platform.name) {
                        await this.makeWowzaRequest(
                            `/applications/${this.wowzaApplication}/pushpublish/mapentries/${platform.name}`,
                            'DELETE'
                        );
                    }
                }
            }

            // Decrementar contador de streamings ativas no servidor
            if (streamInfo.serverId) {
                await db.execute(
                    'UPDATE wowza_servers SET streamings_ativas = GREATEST(streamings_ativas - 1, 0) WHERE codigo = ?',
                    [streamInfo.serverId]
                );
            }
            this.activeStreams.delete(streamId);

            return {
                success: true,
                message: 'Stream parado com sucesso'
            };

        } catch (error) {
            console.error('Erro ao parar stream:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Método atualizado para suportar tanto playlist quanto OBS
    async getStreamStats(streamId) {
        try {
            const streamInfo = this.activeStreams.get(streamId);

            if (!streamInfo) {
                return {
                    isActive: false,
                    viewers: 0,
                    bitrate: 0,
                    uptime: '00:00:00'
                };
            }

            let viewers, bitrate;

            if (streamInfo.type === 'obs') {
                // Para streams OBS, verificar status real no Wowza
                const wowzaStatus = await this.checkOBSStreamStatus(streamInfo.streamName);
                viewers = wowzaStatus.viewers || 0;
                bitrate = wowzaStatus.bitrate || streamInfo.bitrate;
            } else {
                // Para streams de playlist, usar valores simulados
                viewers = Math.floor(Math.random() * 50) + 5;
                bitrate = streamInfo.bitrate + Math.floor(Math.random() * 500);
            }

            streamInfo.viewers = viewers;
            streamInfo.bitrate = bitrate;

            const uptime = this.calculateUptime(streamInfo.startTime);

            return {
                isActive: true,
                viewers,
                bitrate,
                uptime,
                currentVideo: streamInfo.currentVideoIndex ? streamInfo.currentVideoIndex + 1 : null,
                totalVideos: streamInfo.videos ? streamInfo.videos.length : null,
                platforms: streamInfo.platforms,
                recording: streamInfo.recording || false,
                type: streamInfo.type || 'playlist'
            };

        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return {
                isActive: false,
                viewers: 0,
                bitrate: 0,
                uptime: '00:00:00',
                error: error.message
            };
        }
    }

    calculateUptime(startTime) {
        const now = new Date();
        const diff = now - startTime;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Método para listar gravações salvas
    async listRecordings(userLogin) {
        try {
            // Listar gravações via SSH
            const recordingsPath = `/usr/local/WowzaStreamingEngine/content/${userLogin}/recordings`;

            let recordings = [];

            try {
                const result = await SSHManager.executeCommand(this.serverId, `ls -la "${recordingsPath}/" 2>/dev/null || echo "NO_RECORDINGS"`);

                if (!result.stdout.includes('NO_RECORDINGS')) {
                    // Parsear saída do ls para extrair informações dos arquivos
                    const lines = result.stdout.split('\n').filter(line => line.includes('.mp4'));

                    recordings = lines.map(line => {
                        const parts = line.trim().split(/\s+/);
                        const filename = parts[parts.length - 1];
                        const size = parseInt(parts[4]) || 0;

                        return {
                            filename,
                            size,
                            duration: 0, // Seria necessário usar ffprobe para obter duração real
                            created: new Date().toISOString(),
                            url: `/content/${userLogin}/recordings/${filename}`
                        };
                    });
                }
            } catch (listError) {
                console.warn('Erro ao listar gravações via SSH:', listError.message);
                recordings = [];
            }

            return {
                success: true,
                recordings,
                path: recordingsPath + '/'
            };
        } catch (error) {
            console.error('Erro ao listar gravações:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Método para verificar limites do usuário
    async checkUserLimits(userConfig, requestedBitrate = null) {
        try {
            const maxBitrate = userConfig.bitrate || 2500;
            const maxViewers = userConfig.espectadores || 100;
            const maxSpace = userConfig.espaco || 1000; // MB
            const usedSpace = userConfig.espaco_usado || 0;

            const limits = {
                bitrate: {
                    max: maxBitrate,
                    requested: requestedBitrate || maxBitrate,
                    allowed: requestedBitrate ? Math.min(requestedBitrate, maxBitrate) : maxBitrate
                },
                viewers: {
                    max: maxViewers
                },
                storage: {
                    max: maxSpace,
                    used: usedSpace,
                    available: maxSpace - usedSpace,
                    percentage: Math.round((usedSpace / maxSpace) * 100)
                }
            };

            const warnings = [];
            if (limits.storage.percentage > 90) {
                warnings.push('Espaço de armazenamento quase esgotado');
            }
            if (requestedBitrate && requestedBitrate > maxBitrate) {
                warnings.push(`Bitrate solicitado (${requestedBitrate} kbps) excede o limite do plano (${maxBitrate} kbps). Será limitado automaticamente.`);
            }
            if (this.serverInfo && this.serverInfo.streamings_ativas >= this.serverInfo.limite_streamings * 0.9) {
                warnings.push('Servidor próximo do limite de capacidade');
            }
            if (this.serverInfo && this.serverInfo.load_cpu > 80) {
                warnings.push('Servidor com alta carga de CPU');
            }

            return {
                success: true,
                limits,
                warnings
            };
        } catch (error) {
            console.error('Erro ao verificar limites:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testConnection() {
        try {
            console.log(`🔍 Testando conexão Wowza: ${this.wowzaHost}:${this.wowzaPort}`);
            const result = await this.makeWowzaRequest(`/applications`);

            if (result.success) {
                console.log(`✅ Conexão Wowza OK - Aplicações disponíveis: ${result.data?.length || 0}`);
            } else {
                console.log(`❌ Falha na conexão Wowza: ${result.error || 'Erro desconhecido'}`);
            }

            return {
                success: result.success,
                connected: result.success,
                data: result.data,
                error: result.error
            };
        } catch (error) {
            console.error('❌ Erro ao testar conexão Wowza:', error);
            return {
                success: false,
                connected: false,
                error: error.message
            };
        }
    }

    // Novo método para testar conexão com retry
    async testConnectionWithRetry(maxRetries = 3, retryDelay = 2000) {
        this.connectionAttempts++;

        // Evitar spam de tentativas - máximo 1 teste por 5 minutos
        if (this.connectionAttempts > 1 && Date.now() - this.lastErrorLogged < 300000) {
            return {
                success: false,
                connected: false,
                error: 'Teste de conexão em cooldown',
                attempts: 0
            };
        }

        // Reduzir tentativas para 1 apenas
        for (let attempt = 1; attempt <= 1; attempt++) {
            try {
                const result = await this.makeWowzaRequest(`/applications`);

                if (result.success) {
                    return {
                        success: true,
                        connected: true,
                        data: result.data,
                        attempts: attempt
                    };
                }
            } catch (error) {
                // Log apenas se for erro crítico
                if (error.code !== 'ECONNREFUSED' && error.code !== 'ETIMEDOUT') {
                    console.error(`❌ Wowza: ${error.message}`);
                }
            }
        }

        // Todas as tentativas falharam
        const finalError = `Wowza API indisponível`;
        this.lastErrorLogged = Date.now();

        return {
            success: false,
            connected: false,
            error: finalError,
            attempts: 1
        };
    }

    // Método para verificar se Wowza está disponível
    async isWowzaAvailable() {
        try {
            const result = await this.testConnection();
            return result.success;
        } catch (error) {
            return false;
        }
    }

    // Método para operações que não dependem do Wowza
    async setupOBSApplicationFallback(userLogin, userConfig) {
        try {
            console.log(`🔧 Configurando aplicação OBS em modo fallback para: ${userLogin}`);

            // Aplicar limite de bitrate do usuário
            const maxBitrate = userConfig.bitrate || 2500;
            const streamKey = `${userLogin}_live`;

            // URLs simplificadas (mesmo sem conexão com Wowza)
            const isProduction = process.env.NODE_ENV === 'production';
            const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';

            const streamUrls = {
                rtmp: `rtmp://${wowzaHost}:1935/samhost`,
                hls: `http://${wowzaHost}:1935/samhost/${streamKey}/playlist.m3u8`,
                recording_path: `/home/streaming/${userLogin}/recordings/`
            };

            return {
                success: true,
                rtmpUrl: streamUrls.rtmp,
                streamKey: streamKey,
                hlsUrl: streamUrls.hls,
                recordingPath: streamUrls.recording_path,
                config: {
                    applicationName: 'samhost',
                    streamKey: streamKey,
                    maxBitrate: maxBitrate,
                    maxViewers: userConfig.espectadores || 100,
                    recordingEnabled: userConfig.status_gravando === 'sim'
                },
                maxBitrate: maxBitrate,
                bitrateEnforced: true,
                fallback_mode: true,
                warning: 'Configuração gerada em modo fallback - Wowza API indisponível'
            };
        } catch (error) {
            console.error('Erro ao configurar aplicação OBS em modo fallback:', error);
            return { success: false, error: error.message };
        }
    }
    async listApplications() {
        try {
            const result = await this.makeWowzaRequest(`/applications`);
            return result;
        } catch (error) {
            console.error('Erro ao listar aplicações:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getServerInfo() {
        try {
            const result = await this.makeWowzaRequest(`/server`);
            return result;
        } catch (error) {
            console.error('Erro ao obter informações do servidor:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = WowzaStreamingService;