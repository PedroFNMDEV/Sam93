const db = require('./database');

class WowzaConfigManager {
    constructor() {
        this.wowzaBasePath = '/usr/local/WowzaStreamingEngine-4.8.0';
        this.confPath = `${this.wowzaBasePath}/conf`;
        this.streamingBasePath = '/home/streaming';
    }

    // Criar estrutura completa do usuário no Wowza
    async createUserWowzaStructure(serverId, userLogin, userConfig) {
        try {
            console.log(`🔧 Criando estrutura Wowza para usuário: ${userLogin}`);

            // Criar diretório de streaming básico
            await this.createUserStreamingDirectory(serverId, userLogin);
            
            // Aguardar criação
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar se foi criado
            const userPath = `${this.streamingBasePath}/${userLogin}`;
            const SSHManager = require('./SSHManager');
            const pathExists = await SSHManager.checkDirectoryExists(serverId, userPath);
            
            if (!pathExists) {
                throw new Error(`Diretório não foi criado: ${userPath}`);
            }

            console.log(`✅ Estrutura Wowza criada com sucesso para ${userLogin}`);
            return { success: true };

        } catch (error) {
            console.error(`Erro ao criar estrutura Wowza para ${userLogin}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Criar diretório de streaming: /home/streaming/[usuario]/
    async createUserStreamingDirectory(serverId, userLogin) {
        const SSHManager = require('./SSHManager');
        const userStreamingPath = `${this.streamingBasePath}/${userLogin}`;

        const commands = [
            `mkdir -p ${userStreamingPath}`,
            `mkdir -p ${userStreamingPath}/recordings`,
            `chmod -R 755 ${userStreamingPath} || true`,
            `chown -R streaming:streaming ${userStreamingPath} || true`
        ];

        for (const command of commands) {
            try {
                await SSHManager.executeCommand(serverId, command);
            } catch (cmdError) {
                console.warn(`Aviso ao executar comando "${command}":`, cmdError.message);
                // Continuar mesmo com erros de permissão
            }
        }

        console.log(`📁 Diretório de streaming criado: ${userStreamingPath}`);
        return userStreamingPath;
    }

    // Criar pasta específica do usuário: /home/streaming/[usuario]/[pasta]
    async createUserFolder(serverId, userLogin, folderName) {
        const SSHManager = require('./SSHManager');
        const folderPath = `${this.streamingBasePath}/${userLogin}/${folderName}`;

        const commands = [
            `mkdir -p ${folderPath}`,
            `chown -R streaming:streaming ${folderPath}`,
            `chmod -R 755 ${folderPath}`
        ];

        for (const command of commands) {
            await SSHManager.executeCommand(serverId, command);
        }

        console.log(`📁 Pasta criada: ${folderPath}`);
        console.log(`📂 Estrutura: /home/streaming/${userLogin}/${folderName}/`);
        return folderPath;
    }

    // Criar diretório de configuração: /usr/local/WowzaStreamingEngine-4.8.0/conf/[usuario]/
    async createUserWowzaConfig(serverId, userLogin, userConfig) {
        const SSHManager = require('./SSHManager');
        const userConfPath = `${this.confPath}/${userLogin}`;

        const commands = [
            `mkdir -p ${userConfPath}`,
            `chown -R root:root ${userConfPath}`,
            `chmod -R 755 ${userConfPath}`
        ];

        for (const command of commands) {
            await SSHManager.executeCommand(serverId, command);
        }

        console.log(`⚙️ Diretório de configuração criado: ${userConfPath}`);
        return userConfPath;
    }

    // Criar Application.xml baseado no template
    async createApplicationXML(serverId, userLogin, userConfig) {
        const SSHManager = require('./SSHManager');
        const userConfPath = `${this.confPath}/${userLogin}`;
        const applicationPath = `${userConfPath}/Application.xml`;

        const maxBitrate = userConfig.bitrate || 3000;
        const maxViewers = userConfig.espectadores || 9999;
        const streamingPath = `${this.streamingBasePath}/${userLogin}`;

        const applicationXML = `<?xml version="1.0" encoding="UTF-8"?>
<Root version="1">
        <Application>
                <Name>${userLogin}</Name>
                <AppType>Live</AppType>
                <Description>Live streaming application for user ${userLogin}</Description>
                <Connections>
                        <AutoAccept>true</AutoAccept>
                        <AllowDomains></AllowDomains>
                </Connections>
                <Streams>
                        <StreamType>live</StreamType>
                        <StorageDir>${streamingPath}</StorageDir>
                        <KeyDir>\${com.wowza.wms.context.VHostConfigHome}/keys</KeyDir>
                        <LiveStreamPacketizers>cupertinostreamingpacketizer, mpegdashstreamingpacketizer, sanjosestreamingpacketizer, smoothstreamingpacketizer</LiveStreamPacketizers>
                        <Properties>
                        </Properties>
                </Streams>
                <Transcoder>
                        <LiveStreamTranscoder></LiveStreamTranscoder>
                        <Templates>\${SourceStreamName}.xml,transrate.xml</Templates>
                        <ProfileDir>\${com.wowza.wms.context.VHostConfigHome}/transcoder/profiles</ProfileDir>
                        <TemplateDir>\${com.wowza.wms.context.VHostConfigHome}/transcoder/templates</TemplateDir>
                        <Properties>
                        </Properties>
                </Transcoder>
                <DVR>
                        <Recorders></Recorders>
                        <Store></Store>
                        <WindowDuration>0</WindowDuration>
                        <StorageDir>\${com.wowza.wms.context.VHostConfigHome}/dvr</StorageDir>
                        <ArchiveStrategy>append</ArchiveStrategy>
                        <Properties>
                        </Properties>
                </DVR>
                <TimedText>
                        <VODTimedTextProviders></VODTimedTextProviders>
                        <Properties>
                        </Properties>
                </TimedText>
                <HTTPStreamers>cupertinostreaming, smoothstreaming, sanjosestreaming, mpegdashstreaming</HTTPStreamers>
                <MediaCache>
                        <MediaCacheSourceList></MediaCacheSourceList>
                </MediaCache>
                <SharedObjects>
                        <StorageDir>\${com.wowza.wms.context.VHostConfigHome}/applications/\${com.wowza.wms.context.Application}/sharedobjects/\${com.wowza.wms.context.ApplicationInstance}</StorageDir>
                </SharedObjects>
                <Client>
                        <IdleFrequency>-1</IdleFrequency>
                        <Access>
                                <StreamReadAccess>*</StreamReadAccess>
                                <StreamWriteAccess>*</StreamWriteAccess>
                                <StreamAudioSampleAccess></StreamAudioSampleAccess>
                                <StreamVideoSampleAccess></StreamVideoSampleAccess>
                                <SharedObjectReadAccess>*</SharedObjectReadAccess>
                                <SharedObjectWriteAccess>*</SharedObjectWriteAccess>
                        </Access>
                </Client>
                <RTP>
                        <Authentication>
                                <PublishMethod>digest</PublishMethod>
                                <PlayMethod>none</PlayMethod>
                        </Authentication>
                        <AVSyncMethod>senderreport</AVSyncMethod>
                        <MaxRTCPWaitTime>12000</MaxRTCPWaitTime>
                        <IdleFrequency>75</IdleFrequency>
                        <RTSPSessionTimeout>90000</RTSPSessionTimeout>
                        <RTSPMaximumPendingWriteBytes>0</RTSPMaximumPendingWriteBytes>
                        <RTSPBindIpAddress></RTSPBindIpAddress>
                        <RTSPConnectionIpAddress>0.0.0.0</RTSPConnectionIpAddress>
                        <RTSPOriginIpAddress>127.0.0.1</RTSPOriginIpAddress>
                        <IncomingDatagramPortRanges>*</IncomingDatagramPortRanges>
                        <Properties>
                        </Properties>
                </RTP>
                <WebRTC>
                        <EnablePublish>true</EnablePublish>
                        <EnablePlay>true</EnablePlay>
                        <EnableQuery>true</EnableQuery>
                        <IceCandidateIpAddresses>samhost.wcore.com.br,tcp,1935</IceCandidateIpAddresses>
                        <UDPBindAddress></UDPBindAddress>
                        <PreferredCodecsAudio>opus,vorbis,pcmu,pcma</PreferredCodecsAudio>
                        <PreferredCodecsVideo>vp8,h264</PreferredCodecsVideo>
                        <DebugLog>false</DebugLog>
                        <Properties>
                        </Properties>
                </WebRTC>
                <MediaCaster>
                        <RTP>
                                <RTSP>
                                        <RTPTransportMode>interleave</RTPTransportMode>
                                </RTSP>
                        </RTP>
                        <StreamValidator>
                                <Enable>true</Enable>
                                <ResetNameGroups>true</ResetNameGroups>
                                <StreamStartTimeout>20000</StreamStartTimeout>
                                <StreamTimeout>12000</StreamTimeout>
                                <VideoStartTimeout>0</VideoStartTimeout>
                                <VideoTimeout>0</VideoTimeout>
                                <AudioStartTimeout>0</AudioStartTimeout>
                                <AudioTimeout>0</AudioTimeout>
                                <VideoTCToleranceEnable>false</VideoTCToleranceEnable>
                                <VideoTCPosTolerance>3000</VideoTCPosTolerance>
                                <VideoTCNegTolerance>-500</VideoTCNegTolerance>
                                <AudioTCToleranceEnable>false</AudioTCToleranceEnable>
                                <AudioTCPosTolerance>3000</AudioTCPosTolerance>
                                <AudioTCNegTolerance>-500</AudioTCNegTolerance>
                                <DataTCToleranceEnable>false</DataTCToleranceEnable>
                                <DataTCPosTolerance>3000</DataTCPosTolerance>
                                <DataTCNegTolerance>-500</DataTCNegTolerance>
                                <AVSyncToleranceEnable>false</AVSyncToleranceEnable>
                                <AVSyncTolerance>1500</AVSyncTolerance>
                                <DebugLog>false</DebugLog>
                        </StreamValidator>
                        <Properties>
                        </Properties>
                </MediaCaster>
                <MediaReader>
                        <Properties>
                        </Properties>
                </MediaReader>
                <MediaWriter>
                        <Properties>
                        </Properties>
                </MediaWriter>
                <LiveStreamPacketizer>
                        <Properties>
                        </Properties>
                </LiveStreamPacketizer>
                <HTTPStreamer>
                        <Properties>
                                <Property>
                                        <Name>cupertinoPlaylistProgramId</Name>
                                        <Value>1</Value>
                                        <Type>Integer</Type>
                                </Property>
                        </Properties>
                </HTTPStreamer>
                <HTTPProvider>
                        <BaseClass>com.wowza.wms.plugin.HTTPStreamControl</BaseClass>
                        <RequestFilters>streamcontrol*</RequestFilters>
                        <AuthenticationMethod>none</AuthenticationMethod>
                </HTTPProvider>
                <Manager>
                        <Properties>
                        </Properties>
                </Manager>
                <Repeater>
                        <OriginURL></OriginURL>
                        <QueryString><![CDATA[]]></QueryString>
                </Repeater>
                <StreamRecorder>
                        <Properties>
                        </Properties>
                </StreamRecorder>
                <Modules>
                        <Module>
                                <Name>base</Name>
                                <Description>Base</Description>
                                <Class>com.wowza.wms.module.ModuleCore</Class>
                        </Module>
                        <Module>
                                <Name>logging</Name>
                                <Description>Client Logging</Description>
                                <Class>com.wowza.wms.module.ModuleClientLogging</Class>
                        </Module>
                        <Module>
                                <Name>flvplayback</Name>
                                <Description>FLVPlayback</Description>
                                <Class>com.wowza.wms.module.ModuleFLVPlayback</Class>
                        </Module>
                        <Module>
                                <Name>ModuleCoreSecurity</Name>
                                <Description>Core Security Module for Applications</Description>
                                <Class>com.wowza.wms.security.ModuleCoreSecurity</Class>
                        </Module>
                        <Module>
                                <Name>streamPublisher</Name>
                                <Description>Playlists</Description>
                                <Class>com.wowza.wms.plugin.streampublisher.ModuleStreamPublisher</Class>
                        </Module>
                        <Module>
                                <Name>ModuleLoopUntilLive</Name>
                                <Description>ModuleLoopUntilLive</Description>
                                <Class>com.wowza.wms.plugin.streampublisher.ModuleLoopUntilLive</Class>
                        </Module>
                        <Module>
                                <Name>ModuleLimitPublishedStreamBandwidth</Name>
                                <Description>Monitors limit of published stream bandwidth.</Description>
                                <Class>com.wowza.wms.plugin.ModuleLimitPublishedStreamBandwidth</Class>
                        </Module>
                        <Module>
                                <Name>ModulePushPublish</Name>
                                <Description>ModulePushPublish</Description>
                                <Class>com.wowza.wms.pushpublish.module.ModulePushPublish</Class>
                        </Module>
                </Modules>
                <Properties>
                        <Property>
                                <Name>limitPublishedStreamBandwidthMaxBitrate</Name>
                                <Value>${maxBitrate}</Value>
                                <Type>Integer</Type>
                        </Property>
                        <Property>
                                <Name>limitPublishedStreamBandwidthDebugLog</Name>
                                <Value>true</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>MaxBitrate</Name>
                                <Value>${maxBitrate}</Value>
                                <Type>Integer</Type>
                        </Property>
                        <Property>
                                <Name>StreamMonitorLogging</Name>
                                <Value>true</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>limitStreamViewersMaxViewers</Name>
                                <Value>${maxViewers}</Value>
                                <Type>Integer</Type>
                        </Property>
                        <Property>
                                <Name>securityPlayMaximumConnections</Name>
                                <Value>${maxViewers}</Value>
                                <Type>Integer</Type>
                        </Property>
                        <Property>
                                <Name>securityPublishRequirePassword</Name>
                                <Value>true</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>streamPublisherSmilFile</Name>
                                <Value>playlists_agendamentos.smil</Value>
                                <Type>String</Type>
                        </Property>
                        <Property>
                                <Name>streamPublisherPassMetaData</Name>
                                <Value>true</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>streamPublisherSwitchLog</Name>
                                <Value>true</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>securityPublishBlockDuplicateStreamNames</Name>
                                <Value>false</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>securityPublishPasswordFile</Name>
                                <Value>\${com.wowza.wms.context.VHostConfigHome}/conf/\${com.wowza.wms.context.Application}/publish.password</Value>
                                <Type>String</Type>
                        </Property>
                        <Property>
                                <Name>loopUntilLiveSourceStreams</Name>
                                <Value>live</Value>
                                <Type>String</Type>
                        </Property>
                        <Property>
                                <Name>loopUntilLiveOutputStreams</Name>
                                <Value>${userLogin}</Value>
                                <Type>String</Type>
                        </Property>
                        <Property>
                                <Name>loopUntilLiveReloadEntirePlaylist</Name>
                                <Value>true</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>loopUntilLiveHandleMediaCasters</Name>
                                <Value>false</Value>
                                <Type>Boolean</Type>
                        </Property>
                        <Property>
                                <Name>pushPublishMapPath</Name>
                                <Value>\${com.wowza.wms.context.VHostConfigHome}/conf/\${com.wowza.wms.context.Application}/PushPublishMap.txt</Value>
                                <Type>String</Type>
                        </Property>
                </Properties>
        </Application>
</Root>`;

        // Criar arquivo temporário local
        const tempFile = `/tmp/Application_${userLogin}.xml`;
        const fs = require('fs').promises;
        await fs.writeFile(tempFile, applicationXML);

        // Enviar para servidor
        await SSHManager.uploadFile(serverId, tempFile, applicationPath);

        // Definir permissões
        await SSHManager.executeCommand(serverId, `chmod 644 ${applicationPath}`);
        await SSHManager.executeCommand(serverId, `chown root:root ${applicationPath}`);

        // Limpar arquivo temporário
        await fs.unlink(tempFile);

        console.log(`📄 Application.xml criado: ${applicationPath}`);
        return applicationPath;
    }

    // Criar aliasmap.play.txt
    async createAliasMapPlay(serverId, userLogin) {
        const SSHManager = require('./SSHManager');
        const userConfPath = `${this.confPath}/${userLogin}`;
        const aliasPlayPath = `${userConfPath}/aliasmap.play.txt`;

        const content = `${userLogin}=\${Stream.Name}`;

        // Criar arquivo temporário
        const tempFile = `/tmp/aliasmap_play_${userLogin}.txt`;
        const fs = require('fs').promises;
        await fs.writeFile(tempFile, content);

        // Enviar para servidor
        await SSHManager.uploadFile(serverId, tempFile, aliasPlayPath);

        // Definir permissões
        await SSHManager.executeCommand(serverId, `chmod 644 ${aliasPlayPath}`);
        await SSHManager.executeCommand(serverId, `chown root:root ${aliasPlayPath}`);

        // Limpar arquivo temporário
        await fs.unlink(tempFile);

        console.log(`📄 aliasmap.play.txt criado: ${aliasPlayPath}`);
        return aliasPlayPath;
    }

    // Criar aliasmap.stream.txt
    async createAliasMapStream(serverId, userLogin) {
        const SSHManager = require('./SSHManager');
        const userConfPath = `${this.confPath}/${userLogin}`;
        const aliasStreamPath = `${userConfPath}/aliasmap.stream.txt`;

        const content = `*=\${Stream.Name}`;

        // Criar arquivo temporário
        const tempFile = `/tmp/aliasmap_stream_${userLogin}.txt`;
        const fs = require('fs').promises;
        await fs.writeFile(tempFile, content);

        // Enviar para servidor
        await SSHManager.uploadFile(serverId, tempFile, aliasStreamPath);

        // Definir permissões
        await SSHManager.executeCommand(serverId, `chmod 644 ${aliasStreamPath}`);
        await SSHManager.executeCommand(serverId, `chown root:root ${aliasStreamPath}`);

        // Limpar arquivo temporário
        await fs.unlink(tempFile);

        console.log(`📄 aliasmap.stream.txt criado: ${aliasStreamPath}`);
        return aliasStreamPath;
    }

    // Criar publish.password
    async createPublishPassword(serverId, userLogin, userPassword) {
        const SSHManager = require('./SSHManager');
        const userConfPath = `${this.confPath}/${userLogin}`;
        const passwordPath = `${userConfPath}/publish.password`;

        // Usar senha padrão se não fornecida
        const password = userPassword || 'teste2025';
        const content = `${userLogin} ${password}`;

        // Criar arquivo temporário
        const tempFile = `/tmp/publish_password_${userLogin}.txt`;
        const fs = require('fs').promises;
        await fs.writeFile(tempFile, content);

        // Enviar para servidor
        await SSHManager.uploadFile(serverId, tempFile, passwordPath);

        // Definir permissões
        await SSHManager.executeCommand(serverId, `chmod 644 ${passwordPath}`);
        await SSHManager.executeCommand(serverId, `chown root:root ${passwordPath}`);

        // Limpar arquivo temporário
        await fs.unlink(tempFile);

        console.log(`📄 publish.password criado: ${passwordPath}`);
        return passwordPath;
    }
    // Criar arquivo de playlist SMIL para agendamentos
    // Cria e envia o arquivo SMIL
    async createPlaylistSMIL(serverId, userLogin, playlistData) {
        try {
            const SSHManager = require('./SSHManager');
            const userStreamingPath = `${this.streamingBasePath}/${userLogin}`;
            const smilPath = `${userStreamingPath}/playlists_agendamentos.smil`;

            const smilContent = this.generateSMILContent(playlistData);

            const tempFile = `/tmp/playlists_agendamentos_${userLogin}.smil`;
            const fs = require('fs').promises;
            await fs.writeFile(tempFile, smilContent);

            await SSHManager.uploadFile(serverId, tempFile, smilPath);
            await SSHManager.executeCommand(serverId, `chmod 644 ${smilPath}`);
            await SSHManager.executeCommand(serverId, `chown streaming:streaming ${smilPath}`);

            await fs.unlink(tempFile);

            console.log(`📄 Arquivo SMIL criado: ${smilPath}`);
            return smilPath;
        } catch (error) {
            console.error(`Erro ao criar arquivo SMIL para ${userLogin}:`, error);
            throw error;
        }
    }

    // Gera o conteúdo SMIL
    generateSMILContent(playlistData) {
        const { playlists = [], videos = [] } = playlistData;

        let smilContent = `<?xml version="1.0" encoding="UTF-8"?>
<smil>
    <head>
        <meta name="title" content="Playlists de Agendamentos" />
        <meta name="copyright" content="Sistema de Streaming" />
    </head>
    <body>
        <switch>
`;

        playlists.forEach((playlist) => {
            smilContent += `            <seq id="playlist_${playlist.id}" title="${playlist.nome}">\n`;

            const playlistVideos = videos
                .filter(v => v.playlist_id === playlist.id)
                .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

            playlistVideos.forEach(video => {
                const videoPath = video.caminho.replace('/home/streaming/', '');
                smilContent += `                <video src="${videoPath}" dur="${video.duracao || 0}s" />\n`;
            });

            smilContent += `            </seq>\n`;
        });

        smilContent += `        </switch>
    </body>
</smil>`;

        return smilContent;
    }

    // Criar arquivo .ftpquota para controle de espaço
    async createFTPQuota(serverId, userLogin, quotaMB) {
        try {
            const SSHManager = require('./SSHManager');
            const userStreamingPath = `${this.streamingBasePath}/${userLogin}`;
            const quotaPath = `${userStreamingPath}/.ftpquota`;

            // Conteúdo do arquivo de quota (em bytes)
            const quotaBytes = quotaMB * 1024 * 1024;
            const quotaContent = quotaBytes.toString();

            // Criar arquivo temporário local
            const tempFile = `/tmp/ftpquota_${userLogin}`;
            const fs = require('fs').promises;
            await fs.writeFile(tempFile, quotaContent);

            // Enviar para servidor
            await SSHManager.uploadFile(serverId, tempFile, quotaPath);

            // Definir permissões
            await SSHManager.executeCommand(serverId, `chmod 755 ${quotaPath}`);
            await SSHManager.executeCommand(serverId, `chown streaming:streaming ${quotaPath}`);

            // Limpar arquivo temporário
            await fs.unlink(tempFile);

            console.log(`📄 Arquivo .ftpquota criado: ${quotaPath} (${quotaMB}MB)`);
            return quotaPath;
        } catch (error) {
            console.error(`Erro ao criar arquivo .ftpquota para ${userLogin}:`, error);
            throw error;
        }
    }

    // Criar todos os arquivos de configuração
    async createConfigurationFiles(serverId, userLogin, userConfig) {
        try {
            // Não criar arquivos de configuração complexos
            console.log(`✅ Configuração simplificada para ${userLogin}`);
            return { success: true };

        } catch (error) {
            console.error(`Erro ao criar arquivos de configuração para ${userLogin}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Verificar se estrutura do usuário existe
    async checkUserStructure(serverId, userLogin) {
        try {
            const SSHManager = require('./SSHManager');
            const streamingPath = `${this.streamingBasePath}/${userLogin}`;
            const confPath = `${this.confPath}/${userLogin}`;

            // Verificar diretório de streaming
            const streamingExists = await this.checkDirectoryExists(serverId, streamingPath);

            // Verificar diretório de configuração
            const confExists = await this.checkDirectoryExists(serverId, confPath);

            // Verificar arquivos de configuração
            const applicationExists = await this.checkFileExists(serverId, `${confPath}/Application.xml`);
            const aliasPlayExists = await this.checkFileExists(serverId, `${confPath}/aliasmap.play.txt`);
            const aliasStreamExists = await this.checkFileExists(serverId, `${confPath}/aliasmap.stream.txt`);
            const passwordExists = await this.checkFileExists(serverId, `${confPath}/publish.password`);

            return {
                streaming_directory: streamingExists,
                config_directory: confExists,
                application_xml: applicationExists,
                alias_play: aliasPlayExists,
                alias_stream: aliasStreamExists,
                publish_password: passwordExists,
                complete: streamingExists && confExists && applicationExists && aliasPlayExists && aliasStreamExists && passwordExists
            };

        } catch (error) {
            console.error(`Erro ao verificar estrutura do usuário ${userLogin}:`, error);
            return {
                streaming_directory: false,
                config_directory: false,
                application_xml: false,
                alias_play: false,
                alias_stream: false,
                publish_password: false,
                complete: false,
                error: error.message
            };
        }
    }

    // Verificar se diretório existe
    async checkDirectoryExists(serverId, path) {
        try {
            const SSHManager = require('./SSHManager');
            const command = `test -d "${path}" && echo "EXISTS" || echo "NOT_EXISTS"`;
            const result = await SSHManager.executeCommand(serverId, command);
            return result.stdout.includes('EXISTS');
        } catch (error) {
            return false;
        }
    }

    // Verificar se arquivo existe
    async checkFileExists(serverId, path) {
        try {
            const SSHManager = require('./SSHManager');
            const command = `test -f "${path}" && echo "EXISTS" || echo "NOT_EXISTS"`;
            const result = await SSHManager.executeCommand(serverId, command);
            return result.stdout.includes('EXISTS');
        } catch (error) {
            return false;
        }
    }

    // Atualizar configuração do usuário
    async updateUserConfig(serverId, userLogin, userConfig) {
        try {
            const SSHManager = require('./SSHManager');
            // Recriar Application.xml com novas configurações
            await this.createApplicationXML(serverId, userLogin, userConfig);

            // Atualizar senha se necessário
            if (userConfig.senha_transmissao) {
                await this.createPublishPassword(serverId, userLogin, userConfig.senha_transmissao);
            }

            console.log(`✅ Configuração atualizada para ${userLogin}`);
            return { success: true };

        } catch (error) {
            console.error(`Erro ao atualizar configuração do usuário ${userLogin}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Remover estrutura do usuário
    async removeUserStructure(serverId, userLogin) {
        try {
            const SSHManager = require('./SSHManager');
            const streamingPath = `${this.streamingBasePath}/${userLogin}`;
            const confPath = `${this.confPath}/${userLogin}`;

            // Remover diretório de configuração
            await SSHManager.executeCommand(serverId, `rm -rf "${confPath}"`);

            // CUIDADO: Não remover diretório de streaming automaticamente
            // pois pode conter vídeos importantes
            console.log(`⚠️ Diretório de streaming mantido: ${streamingPath}`);
            console.log(`✅ Configuração removida: ${confPath}`);

            return { success: true };

        } catch (error) {
            console.error(`Erro ao remover estrutura do usuário ${userLogin}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Listar vídeos do usuário na nova estrutura
    async listUserVideos(serverId, userLogin, folderName = null) {
        try {
            const SSHManager = require('./SSHManager');
            const basePath = `${this.streamingBasePath}/${userLogin}`;
            const searchPath = folderName ? `${basePath}/${folderName}` : basePath;

            // Comando para listar apenas arquivos de vídeo recursivamente
            const command = `find "${searchPath}" -type f \\( -iname "*.mp4" -o -iname "*.avi" -o -iname "*.mov" -o -iname "*.wmv" -o -iname "*.flv" -o -iname "*.webm" -o -iname "*.mkv" \\) -exec ls -la {} \\; 2>/dev/null || echo "NO_VIDEOS"`;

            const result = await SSHManager.executeCommand(serverId, command);

            if (result.stdout.includes('NO_VIDEOS')) {
                return [];
            }

            const videos = [];
            const lines = result.stdout.split('\n').filter(line => line.trim());

            for (const line of lines) {
                if (line.includes('total ') || !line.trim()) continue;

                const parts = line.trim().split(/\s+/);
                if (parts.length < 9) continue;

                const permissions = parts[0];
                const size = parseInt(parts[4]) || 0;
                const fullPath = parts.slice(8).join(' ');
                const fileName = require('path').basename(fullPath);
                const relativePath = fullPath.replace(`${this.streamingBasePath}/${userLogin}/`, '');
                const folderPath = require('path').dirname(relativePath);
                const fileExtension = require('path').extname(fileName).toLowerCase();

                videos.push({
                    id: Buffer.from(fullPath).toString('base64'),
                    nome: fileName,
                    path: relativePath,
                    fullPath: fullPath,
                    folder: folderPath === '.' ? 'root' : folderPath,
                    size: size,
                    permissions: permissions,
                    lastModified: new Date().toISOString(),
                    serverId: serverId,
                    userLogin: userLogin,
                    originalFormat: fileExtension,
                    streaming_path: fullPath // Novo caminho de streaming
                });
            }

            console.log(`📹 Encontrados ${videos.length} vídeos para ${userLogin} na nova estrutura`);
            return videos;

        } catch (error) {
            console.error('Erro ao listar vídeos na nova estrutura:', error);
            return [];
        }
    }

    // Migrar vídeo para nova estrutura
    async migrateVideoToNewStructure(serverId, userLogin, folderName, oldPath, fileName) {
        try {
            const SSHManager = require('./SSHManager');
            // Garantir que estrutura existe
            await this.createUserStreamingDirectory(serverId, userLogin);
            await this.createUserFolder(serverId, userLogin, folderName);

            const newPath = `${this.streamingBasePath}/${userLogin}/${folderName}/${fileName}`;

            // Verificar se arquivo já existe no novo local
            const newExists = await this.checkFileExists(serverId, newPath);
            if (newExists) {
                console.log(`⚠️ Arquivo já existe na nova estrutura: ${newPath}`);
                return { success: true, newPath, alreadyExists: true };
            }

            // Mover arquivo para nova estrutura
            await SSHManager.executeCommand(serverId, `mv "${oldPath}" "${newPath}"`);

            // Definir permissões corretas
            await SSHManager.executeCommand(serverId, `chown streaming:streaming "${newPath}"`);
            await SSHManager.executeCommand(serverId, `chmod 644 "${newPath}"`);

            console.log(`✅ Vídeo migrado: ${oldPath} -> ${newPath}`);
            return { success: true, newPath, migrated: true };

        } catch (error) {
            console.error(`Erro ao migrar vídeo ${fileName}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Construir URLs corretas para nova estrutura
    buildVideoUrls(userLogin, folderName, fileName, serverId = null) {
        const isProduction = process.env.NODE_ENV === 'production';
        const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';

        // Garantir que arquivo é MP4
        const finalFileName = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.[^/.]+$/, '.mp4');

        // Caminho relativo na nova estrutura
        const streamPath = `streaming/${userLogin}/${folderName}/${finalFileName}`;

        return {
            // URL HLS usando aplicação específica do usuário
            hls: `http://${wowzaHost}:1935/${userLogin}/_definst_/mp4:${folderName}/${finalFileName}/playlist.m3u8`,

            // URL RTMP para transmissão
            rtmp: `rtmp://${wowzaHost}:1935/${userLogin}/${folderName}/${finalFileName}`,

            // URL direta para download (via aplicação VOD)
            direct: `http://${wowzaHost}:1935/vod/_definst_/mp4:${streamPath}/playlist.m3u8`,

            // URL via proxy do backend
            proxy: `/content/${streamPath}`,

            // Metadados
            metadata: {
                user: userLogin,
                folder: folderName,
                file: finalFileName,
                original_file: fileName,
                server_id: serverId,
                streaming_path: `${this.streamingBasePath}/${userLogin}/${folderName}/${finalFileName}`,
                wowza_app: userLogin
            }
        };
    }

    // Construir URLs de transmissão ao vivo
    buildLiveStreamUrls(userLogin, serverId = null) {
        const isProduction = process.env.NODE_ENV === 'production';
        const wowzaHost = isProduction ? 'samhost.wcore.com.br' : '51.222.156.223';

        return {
            // URL RTMP para OBS (usando aplicação específica do usuário)
            rtmp: `rtmp://${wowzaHost}:1935/${userLogin}`,

            // Chave de transmissão
            streamKey: `${userLogin}_live`,

            // URL HLS para visualização
            hls: `http://${wowzaHost}:1935/${userLogin}/${userLogin}_live/playlist.m3u8`,

            // URL de gravação
            recording_path: `${this.streamingBasePath}/${userLogin}/recordings/`,

            // Metadados
            metadata: {
                user: userLogin,
                server_id: serverId,
                wowza_app: userLogin,
                streaming_path: `${this.streamingBasePath}/${userLogin}`
            }
        };
    }
}

module.exports = new WowzaConfigManager();