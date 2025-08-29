const SSHManager = require('../config/SSHManager');
const WowzaConfigManager = require('../config/WowzaConfigManager');
const db = require('../config/database');

class PlaylistSMILService {
    constructor() {
        // Template baseado no formato do exemplo fornecido
        this.smilTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<smil title="{{USER_LOGIN}}">
<head></head>
<body>
<stream name="{{USER_LOGIN}}"></stream>

{{PLAYLISTS_CONTENT}}
</body>
</smil>`;
    }

    // Gerar arquivo SMIL para um usuário específico
    async generateUserSMIL(userId, userLogin, serverId) {
        try {
            console.log(`📄 Gerando arquivo SMIL para usuário: ${userLogin}`);

            // Verificar se diretório do usuário existe
            const userPath = `/home/streaming/${userLogin}`;
            const pathInfo = await SSHManager.getFolderInfo(serverId, userPath);
            
            if (!pathInfo.exists) {
                await SSHManager.createUserDirectory(serverId, userLogin);
            }

            // Buscar playlists e agendamentos do usuário
            const [playlistRows] = await db.execute(
                'SELECT id, nome FROM playlists WHERE codigo_stm = ? ORDER BY id',
                [userId]
            );

            // Buscar agendamentos ativos do usuário
            const [agendamentoRows] = await db.execute(
                `SELECT 
                    pa.codigo_playlist,
                    pa.data,
                    pa.hora,
                    pa.minuto,
                    pa.shuffle,
                    pa.frequencia,
                    p.nome as playlist_nome
                 FROM playlists_agendamentos pa
                 JOIN playlists p ON pa.codigo_playlist = p.id
                 WHERE pa.codigo_stm = ? AND pa.data >= CURDATE()
                 ORDER BY pa.data, pa.hora, pa.minuto`,
                [userId]
            );
            if (playlistRows.length === 0) {
                // Criar arquivo SMIL vazio mesmo sem playlists
                const emptySmilContent = this.generateEmptySMIL(userLogin);
                const smilPath = `/home/streaming/${userLogin}/playlists_agendamentos.smil`;
                
                try {
                    await this.saveSMILToServer(serverId, userLogin, emptySmilContent, smilPath);
                } catch (smilError) {
                    console.warn('Aviso SMIL:', smilError.message);
                    // Continuar sem falhar
                }
                
                return { 
                    success: true, 
                    smil_path: smilPath,
                    playlists_count: 0,
                    total_videos: 0,
                    message: 'Arquivo SMIL vazio criado'
                };
            }

            // Gerar conteúdo SMIL baseado no formato do exemplo
            let smilContent = this.generateSMILFromTemplate(userLogin, playlistRows, agendamentoRows, userId);

            // Salvar arquivo no servidor
            const smilPath = `/home/streaming/${userLogin}/playlists_agendamentos.smil`;
            
            try {
                await this.saveSMILToServer(serverId, userLogin, smilContent, smilPath);
            } catch (smilError) {
                console.warn('Aviso SMIL:', smilError.message);
                // Continuar sem falhar
            }

            return { 
                success: true, 
                smil_path: smilPath,
                playlists_count: playlistRows.length,
                agendamentos_count: agendamentoRows.length,
                total_videos: smilContent.split('<video').length - 1
            };

        } catch (error) {
            console.error(`Erro ao gerar SMIL para usuário ${userLogin}:`, error);
            // Retornar sucesso mesmo com erro para não bloquear outras operações
            return { 
                success: true, 
                smil_path: `/home/streaming/${userLogin}/playlists_agendamentos.smil`,
                playlists_count: 0,
                total_videos: 0,
                warning: error.message 
            };
        }
    }

    // Gerar SMIL baseado no formato do exemplo fornecido
    async generateSMILFromTemplate(userLogin, playlists, agendamentos, userId) {
        try {
            let smilContent = `<?xml version="1.0" encoding="UTF-8"?>
<smil title="${userLogin}">
<head></head>
<body>
<stream name="${userLogin}"></stream>

`;

            // Processar agendamentos para gerar playlists no formato correto
            for (const agendamento of agendamentos) {
                const playlistName = agendamento.playlist_nome.toLowerCase().replace(/[^a-z0-9]/g, '');
                const scheduledDateTime = `${agendamento.data} ${agendamento.hora.toString().padStart(2, '0')}:${agendamento.minuto.toString().padStart(2, '0')}:00`;
                const repeat = agendamento.shuffle === 'sim' ? 'true' : 'true'; // Sempre true por padrão
                
                smilContent += `<playlist name="${playlistName}" playOnStream="${userLogin}" repeat="${repeat}" scheduled="${scheduledDateTime}">\n`;
                
                // Buscar vídeos da playlist
                const [videoRows] = await db.execute(
                    `SELECT v.nome, v.url, v.caminho, v.duracao 
                     FROM videos v 
                     WHERE v.playlist_id = ? AND v.codigo_cliente = ?
                     ORDER BY v.id`,
                    [agendamento.codigo_playlist, userId]
                );

                // Adicionar vídeos no formato correto
                for (const video of videoRows) {
                    const videoPath = this.buildVideoPathForSMIL(video, userLogin);
                    const duration = video.duracao || -1;
                    
                    smilContent += `<video length="${duration}" src="mp4:${videoPath}" start="0"></video>\n`;
                }
                
                smilContent += `</playlist>\n\n`;
            }

            smilContent += `</body>
</smil>`;

            return smilContent;
        } catch (error) {
            console.error('Erro ao gerar SMIL do template:', error);
            return this.generateEmptySMIL(userLogin);
        }
    }

    // Gerar SMIL vazio
    generateEmptySMIL(userLogin) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<smil title="${userLogin}">
<head></head>
<body>
<stream name="${userLogin}"></stream>

</body>
</smil>`;
    }

    // Gerar SMIL específico para agendamentos (formato do exemplo)
    async generateScheduledSMIL(userId, userLogin, serverId) {
        try {
            console.log(`📄 Gerando SMIL de agendamentos para usuário: ${userLogin}`);

            // Buscar agendamentos ativos do usuário
            const [agendamentoRows] = await db.execute(
                `SELECT 
                    pa.codigo_playlist,
                    pa.data,
                    pa.hora,
                    pa.minuto,
                    pa.shuffle,
                    pa.frequencia,
                    p.nome as playlist_nome
                 FROM playlists_agendamentos pa
                 JOIN playlists p ON pa.codigo_playlist = p.id
                 WHERE pa.codigo_stm = ? AND pa.data >= CURDATE()
                 ORDER BY pa.data, pa.hora, pa.minuto`,
                [userId]
            );

            let smilContent = `<?xml version="1.0" encoding="UTF-8"?>
<smil title="${userLogin}">
<head></head>
<body>
<stream name="${userLogin}"></stream>

`;

            // Processar cada agendamento
            for (const agendamento of agendamentoRows) {
                const playlistName = agendamento.playlist_nome.toLowerCase().replace(/[^a-z0-9]/g, '');
                const scheduledDateTime = `${agendamento.data} ${agendamento.hora.toString().padStart(2, '0')}:${agendamento.minuto.toString().padStart(2, '0')}:00`;
                const repeat = 'true'; // Sempre true conforme exemplo
                
                smilContent += `<playlist name="${playlistName}" playOnStream="${userLogin}" repeat="${repeat}" scheduled="${scheduledDateTime}">\n`;
                
                // Buscar vídeos da playlist
                const [videoRows] = await db.execute(
                    `SELECT v.nome, v.url, v.caminho, v.duracao 
                     FROM videos v 
                     WHERE v.playlist_id = ? AND v.codigo_cliente = ?
                     ORDER BY v.id`,
                    [agendamento.codigo_playlist, userId]
                );

                // Adicionar vídeos no formato do exemplo
                for (const video of videoRows) {
                    const videoPath = this.buildVideoPathForSMIL(video, userLogin);
                    const duration = video.duracao || -1;
                    
                    smilContent += `<video length="${duration}" src="mp4:${videoPath}" start="0"></video>\n`;
                }
                
                smilContent += `</playlist>\n\n`;
            }

            smilContent += `</body>
</smil>`;

            // Salvar arquivo no servidor
            const smilPath = `/home/streaming/${userLogin}/playlists_agendamentos.smil`;
            await this.saveSMILToServer(serverId, userLogin, smilContent, smilPath);

            console.log(`✅ Arquivo SMIL de agendamentos gerado: ${smilPath}`);
            return { 
                success: true, 
                smil_path: smilPath,
                agendamentos_count: agendamentoRows.length,
                total_videos: smilContent.split('<video').length - 1
            };

        } catch (error) {
            console.error(`Erro ao gerar SMIL de agendamentos para ${userLogin}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Construir caminho do vídeo para SMIL (formato: pasta/arquivo.mp4)
    buildVideoPathForSMIL(video, userLogin) {
        // Nova estrutura: pasta/arquivo.mp4 (sem o usuário no caminho)
        if (video.caminho && video.caminho.includes('/home/streaming/')) {
            // Extrair caminho relativo: /home/streaming/usuario/pasta/arquivo.mp4 -> pasta/arquivo.mp4
            const relativePath = video.caminho.replace(`/home/streaming/${userLogin}/`, '');
            return relativePath;
        } else if (video.url) {
            // Usar URL se disponível
            let cleanUrl = video.url;
            if (cleanUrl.startsWith('streaming/')) {
                cleanUrl = cleanUrl.replace('streaming/', '');
            }
            // Remover o usuário do início se presente: usuario/pasta/arquivo.mp4 -> pasta/arquivo.mp4
            const urlParts = cleanUrl.split('/');
            if (urlParts.length >= 3 && urlParts[0] === userLogin) {
                return urlParts.slice(1).join('/'); // Remove o primeiro elemento (usuário)
            }
            return cleanUrl;
        } else {
            // Fallback: construir caminho baseado no nome
            return `default/${video.nome}`;
        }
    }
    // Construir caminho do vídeo para o SMIL
    buildVideoPath(video, userLogin) {
        // Nova estrutura: usuario/pasta/arquivo.mp4
        if (video.caminho && video.caminho.includes('/home/streaming/')) {
            // Extrair caminho relativo da nova estrutura
            const relativePath = video.caminho.replace('/home/streaming/', '');
            return relativePath;
        } else if (video.url) {
            // Usar URL se disponível
            let cleanUrl = video.url;
            if (cleanUrl.startsWith('streaming/')) {
                cleanUrl = cleanUrl.replace('streaming/', '');
            }
            return cleanUrl;
        } else {
            // Fallback: construir caminho baseado no nome
            return `${userLogin}/default/${video.nome}`;
        }
    }

    // Salvar arquivo SMIL no servidor
    async saveSMILToServer(serverId, userLogin, smilContent, smilPath) {
        try {
            const SSHManager = require('../config/SSHManager');
            
            // Verificar se arquivo já existe
            const fileExists = await SSHManager.getFileInfo(serverId, smilPath);
            if (fileExists.exists) {
                return { success: true, path: smilPath };
            }

            // Criar arquivo temporário local
            const tempFile = `/tmp/playlists_agendamentos_${userLogin}_${Date.now()}.smil`;
            const fs = require('fs').promises;
            await fs.writeFile(tempFile, smilContent, 'utf8');

            try {
                // Enviar para servidor
                await SSHManager.uploadFile(serverId, tempFile, smilPath);
                
                // Definir permissões corretas (ignorar erros)
                try {
                    await SSHManager.executeCommand(serverId, `chmod 644 "${smilPath}" || true`);
                    await SSHManager.executeCommand(serverId, `chown streaming:streaming "${smilPath}" || true`);
                } catch (permError) {
                    console.warn('Aviso ao definir permissões SMIL:', permError.message);
                }
            } catch (uploadError) {
                console.error('Erro ao enviar SMIL:', uploadError);
                throw uploadError;
            }

            // Limpar arquivo temporário
            await fs.unlink(tempFile);

            return { success: true, path: smilPath };

        } catch (error) {
            console.error('Erro ao salvar SMIL no servidor:', error);
            throw error;
        }
    }

    // Atualizar SMIL quando playlist for modificada
    async updateUserSMIL(userId, userLogin, serverId) {
        try {
            console.log(`🔄 Atualizando SMIL para usuário: ${userLogin}`);
            return await this.generateUserSMIL(userId, userLogin, serverId);
        } catch (error) {
            console.error(`Erro ao atualizar SMIL para ${userLogin}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Remover arquivo SMIL do usuário
    async removeUserSMIL(serverId, userLogin) {
        try {
            const smilPath = `/home/streaming/${userLogin}/playlists_agendamentos.smil`;
            await SSHManager.deleteFile(serverId, smilPath);
            console.log(`🗑️ Arquivo SMIL removido: ${smilPath}`);
            return { success: true };
        } catch (error) {
            console.error(`Erro ao remover SMIL para ${userLogin}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Verificar se arquivo SMIL existe
    async checkSMILExists(serverId, userLogin) {
        try {
            const smilPath = `/home/streaming/${userLogin}/playlists_agendamentos.smil`;
            try {
                const fileInfo = await SSHManager.getFileInfo(serverId, smilPath);
                return fileInfo.exists;
            } catch (sshError) {
                console.warn(`Erro ao verificar SMIL para ${userLogin}:`, sshError.message);
                return false;
            }
        } catch (error) {
            console.error(`Erro ao verificar SMIL para ${userLogin}:`, error);
            return false;
        }
    }

    // Escapar caracteres especiais para XML
    escapeXML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Gerar SMIL para todos os usuários (manutenção)
    async generateAllUsersSMIL() {
        try {
            console.log('🔄 Gerando arquivos SMIL para todos os usuários...');

            // Buscar todos os usuários ativos
            const [userRows] = await db.execute(
                `SELECT DISTINCT 
                    s.codigo_cliente as user_id,
                    s.usuario,
                    f.servidor_id
                 FROM streamings s 
                LEFT JOIN folders f ON s.codigo_cliente = f.user_id
                 WHERE s.status = 1 AND s.usuario IS NOT NULL`
            );

            const results = [];

            for (const user of userRows) {
                try {
                    const userLogin = user.usuario;
                    const serverId = user.servidor_id || 1;

                    const result = await this.generateUserSMIL(user.user_id, userLogin, serverId);
                    results.push({
                        user_login: userLogin,
                        user_id: user.user_id,
                        server_id: serverId,
                        result: result
                    });
                } catch (userError) {
                    console.error(`Erro ao processar usuário ${user.usuario}:`, userError);
                    results.push({
                        user_login: user.usuario || 'unknown',
                        user_id: user.user_id,
                        result: { success: false, error: userError.message }
                    });
                }
            }

            const successCount = results.filter(r => r.result.success).length;
            console.log(`✅ Arquivos SMIL gerados: ${successCount}/${results.length} usuários`);

            return {
                success: true,
                total_users: results.length,
                success_count: successCount,
                results: results
            };

        } catch (error) {
            console.error('Erro ao gerar SMIL para todos os usuários:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new PlaylistSMILService();