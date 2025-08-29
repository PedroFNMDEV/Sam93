const { spawn } = require('child_process');
const db = require('./database');
const SSHManager = require('./SSHManager');

class RelayManager {
    constructor() {
        this.activeRelays = new Map();
        this.relayLogs = new Map();
    }

    // Iniciar relay RTMP/HLS
    async startRelay(userId, relayConfig) {
        try {
            const { url_origem, tipo_relay, servidor_id, output_stream_name } = relayConfig;
            
            console.log(`🚀 Iniciando relay para usuário ${userId}:`, relayConfig);

            // Verificar se já existe relay ativo
            if (this.activeRelays.has(userId)) {
                throw new Error('Já existe um relay ativo para este usuário');
            }

            // Construir URL de saída
            const outputUrl = `rtmp://samhost.wcore.com.br:1935/samhost/${output_stream_name}`;
            
            // Configurar argumentos do FFmpeg baseado no tipo
            let ffmpegArgs;
            
            if (tipo_relay === 'rtmp') {
                ffmpegArgs = [
                    '-i', url_origem,
                    '-c', 'copy', // Copiar sem recodificar para melhor performance
                    '-f', 'flv',
                    '-reconnect', '1',
                    '-reconnect_at_eof', '1',
                    '-reconnect_streamed', '1',
                    '-reconnect_delay_max', '5',
                    '-timeout', '30000000', // 30 segundos
                    '-avoid_negative_ts', 'make_zero',
                    '-fflags', '+genpts',
                    '-y',
                    outputUrl
                ];
            } else { // HLS/M3U8
                ffmpegArgs = [
                    '-i', url_origem,
                    '-c', 'copy',
                    '-f', 'flv',
                    '-reconnect', '1',
                    '-reconnect_at_eof', '1',
                    '-reconnect_streamed', '1',
                    '-reconnect_delay_max', '5',
                    '-timeout', '30000000',
                    '-avoid_negative_ts', 'make_zero',
                    '-fflags', '+genpts',
                    '-bsf:a', 'aac_adtstoasc', // Para compatibilidade com HLS
                    '-y',
                    outputUrl
                ];
            }

            console.log(`📋 Comando FFmpeg: ffmpeg ${ffmpegArgs.join(' ')}`);

            // Iniciar processo FFmpeg
            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            const relayData = {
                process: ffmpegProcess,
                config: relayConfig,
                startTime: new Date(),
                outputUrl: outputUrl,
                logs: []
            };

            // Configurar handlers do processo
            ffmpegProcess.stdout.on('data', (data) => {
                const output = data.toString();
                this.addLog(userId, 'stdout', output);
            });

            ffmpegProcess.stderr.on('data', (data) => {
                const output = data.toString();
                this.addLog(userId, 'stderr', output);
                
                // Log de progresso
                if (output.includes('frame=') || output.includes('time=')) {
                    console.log(`📊 Relay ${userId} progress: ${output.trim()}`);
                }
                
                // Detectar erros críticos
                if (output.includes('Connection refused') || 
                    output.includes('No route to host') ||
                    output.includes('Invalid data found')) {
                    console.error(`❌ Erro crítico no relay ${userId}: ${output.trim()}`);
                }
            });

            ffmpegProcess.on('close', async (code) => {
                console.log(`🔚 Relay ${userId} finalizado com código: ${code}`);
                
                try {
                    // Atualizar status no banco
                    await db.execute(
                        'UPDATE relay_config SET status = "erro", data_fim = NOW(), erro_detalhes = ? WHERE codigo_stm = ? AND status = "ativo"',
                        [`Processo finalizado com código ${code}`, userId]
                    );
                } catch (dbError) {
                    console.error('Erro ao atualizar status no banco:', dbError);
                }
                
                // Remover do mapa de relays ativos
                this.activeRelays.delete(userId);
            });

            ffmpegProcess.on('error', async (error) => {
                console.error(`❌ Erro no processo FFmpeg relay ${userId}:`, error);
                
                try {
                    await db.execute(
                        'UPDATE relay_config SET status = "erro", data_fim = NOW(), erro_detalhes = ? WHERE codigo_stm = ? AND status = "ativo"',
                        [`Erro no processo: ${error.message}`, userId]
                    );
                } catch (dbError) {
                    console.error('Erro ao atualizar status no banco:', dbError);
                }
                
                this.activeRelays.delete(userId);
            });

            // Adicionar ao mapa de relays ativos
            this.activeRelays.set(userId, relayData);

            // Aguardar alguns segundos para verificar se iniciou corretamente
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verificar se processo ainda está rodando
            let processRunning = false;
            try {
                process.kill(ffmpegProcess.pid, 0);
                processRunning = true;
            } catch (error) {
                processRunning = false;
            }

            if (!processRunning) {
                this.activeRelays.delete(userId);
                throw new Error('Processo FFmpeg falhou ao iniciar. Verifique a URL de origem.');
            }

            console.log(`✅ Relay iniciado com sucesso - PID: ${ffmpegProcess.pid}`);

            return {
                success: true,
                pid: ffmpegProcess.pid,
                output_url: outputUrl,
                message: 'Relay iniciado com sucesso'
            };

        } catch (processError) {
            console.error('Erro ao iniciar processo de relay:', processError);
            this.activeRelays.delete(userId);
            throw processError;
        }
    }

    // Parar relay
    async stopRelay(userId) {
        try {
            const relayData = this.activeRelays.get(userId);
            
            if (!relayData) {
                return {
                    success: true,
                    message: 'Nenhum relay ativo encontrado'
                };
            }

            // Finalizar processo FFmpeg
            if (relayData.process && relayData.process.pid) {
                try {
                    process.kill(relayData.process.pid, 'SIGTERM');
                    console.log(`🛑 Processo FFmpeg ${relayData.process.pid} finalizado`);
                    
                    // Aguardar e forçar kill se necessário
                    setTimeout(() => {
                        try {
                            process.kill(relayData.process.pid, 'SIGKILL');
                        } catch (error) {
                            // Processo já foi finalizado
                        }
                    }, 5000);
                } catch (error) {
                    console.log(`⚠️ Processo ${relayData.process.pid} já estava finalizado`);
                }
            }

            // Remover do mapa
            this.activeRelays.delete(userId);
            this.relayLogs.delete(userId);

            // Atualizar status no banco
            await db.execute(
                'UPDATE relay_config SET status = "inativo", data_fim = NOW() WHERE codigo_stm = ? AND status = "ativo"',
                [userId]
            );

            return {
                success: true,
                message: 'Relay parado com sucesso'
            };

        } catch (error) {
            console.error('Erro ao parar relay:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verificar status do relay
    getRelayStatus(userId) {
        const relayData = this.activeRelays.get(userId);
        
        if (!relayData) {
            return {
                active: false,
                status: 'inactive'
            };
        }

        // Verificar se processo ainda está rodando
        let processRunning = false;
        try {
            process.kill(relayData.process.pid, 0);
            processRunning = true;
        } catch (error) {
            processRunning = false;
        }

        if (!processRunning) {
            this.activeRelays.delete(userId);
            return {
                active: false,
                status: 'error',
                error: 'Processo FFmpeg parou inesperadamente'
            };
        }

        // Calcular uptime
        const uptime = Math.floor((new Date().getTime() - relayData.startTime.getTime()) / 1000);

        return {
            active: true,
            status: 'active',
            pid: relayData.process.pid,
            uptime: uptime,
            output_url: relayData.outputUrl,
            config: relayData.config,
            logs: this.relayLogs.get(userId) || []
        };
    }

    // Adicionar log
    addLog(userId, type, message) {
        if (!this.relayLogs.has(userId)) {
            this.relayLogs.set(userId, []);
        }

        const logs = this.relayLogs.get(userId);
        logs.push({
            timestamp: new Date().toISOString(),
            type: type,
            message: message.trim()
        });

        // Manter apenas os últimos 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }

        this.relayLogs.set(userId, logs);
    }

    // Obter logs do relay
    getRelayLogs(userId) {
        return this.relayLogs.get(userId) || [];
    }

    // Limpar todos os relays (para shutdown)
    async stopAllRelays() {
        console.log('🛑 Finalizando todos os relays ativos...');
        
        for (const [userId, relayData] of this.activeRelays) {
            try {
                if (relayData.process && relayData.process.pid) {
                    process.kill(relayData.process.pid, 'SIGTERM');
                    
                    // Atualizar status no banco
                    await db.execute(
                        'UPDATE relay_config SET status = "inativo", data_fim = NOW() WHERE codigo_stm = ? AND status = "ativo"',
                        [userId]
                    );
                }
            } catch (error) {
                console.error(`Erro ao finalizar relay do usuário ${userId}:`, error);
            }
        }
        
        this.activeRelays.clear();
        this.relayLogs.clear();
    }
}

module.exports = new RelayManager();