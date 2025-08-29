-- --------------------------------------------------------
-- Servidor:                     104.251.209.68
-- Versão do servidor:           10.3.34-MariaDB-0ubuntu0.20.04.1 - Ubuntu 20.04
-- OS do Servidor:               debian-linux-gnu
-- HeidiSQL Versão:              12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Copiando estrutura do banco de dados para db_SamCast
CREATE DATABASE IF NOT EXISTS `db_SamCast` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;
USE `db_SamCast`;

-- Copiando estrutura para tabela db_SamCast.administradores
CREATE TABLE IF NOT EXISTS `administradores` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `usuario` varchar(255) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `nivel_acesso` enum('super_admin','admin','suporte') DEFAULT 'admin',
  `codigo_perfil_acesso` int(10) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT 1,
  `ultimo_acesso` datetime DEFAULT NULL,
  `data_criacao` datetime DEFAULT current_timestamp(),
  `data_atualizacao` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `criado_por` int(10) DEFAULT NULL,
  `token_reset` varchar(255) DEFAULT NULL,
  `token_reset_expira` datetime DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_admin_email` (`email`),
  KEY `idx_admin_ativo` (`ativo`),
  KEY `idx_admin_nivel` (`nivel_acesso`),
  KEY `idx_admin_perfil_acesso` (`codigo_perfil_acesso`),
  KEY `idx_administradores_perfil` (`codigo_perfil_acesso`),
  CONSTRAINT `fk_admin_perfil_acesso` FOREIGN KEY (`codigo_perfil_acesso`) REFERENCES `perfis_acesso` (`codigo`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.admin_logs
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `admin_id` int(10) NOT NULL,
  `acao` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tabela_afetada` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registro_id` int(10) DEFAULT NULL,
  `dados_anteriores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `dados_novos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `contexto_adicional` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modulo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_acao` (`acao`),
  KEY `idx_tabela` (`tabela_afetada`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `administradores` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.admin_notifications
CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `type` enum('success','error','warning','info') DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `admin_notifications_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `administradores` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.admin_sessions
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `admin_id` int(10) NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `last_activity` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `admin_sessions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `administradores` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.Agendamentos
CREATE TABLE IF NOT EXISTS `Agendamentos` (
  `Id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.agendamentos_relay
CREATE TABLE IF NOT EXISTS `agendamentos_relay` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `frequencia` int(1) NOT NULL,
  `data_inicio` date NOT NULL,
  `hora_inicio` char(2) NOT NULL,
  `minuto_inicio` char(2) NOT NULL,
  `data_termino` date NOT NULL,
  `hora_termino` char(2) NOT NULL,
  `minuto_termino` char(2) NOT NULL,
  `dias` varchar(50) NOT NULL,
  `url_rtmp` text NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.agendamentos_relay_logs
CREATE TABLE IF NOT EXISTS `agendamentos_relay_logs` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_agendamento` int(10) NOT NULL,
  `codigo_stm` int(10) NOT NULL,
  `data` datetime NOT NULL,
  `url_rtmp` varchar(255) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.anuncios_videos
CREATE TABLE IF NOT EXISTS `anuncios_videos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `video` text COLLATE latin1_general_ci NOT NULL,
  `tempo` int(10) NOT NULL,
  `data_cadastro` date NOT NULL,
  `exibicoes` int(10) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.apps
CREATE TABLE IF NOT EXISTS `apps` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `tv_nome` varchar(255) NOT NULL,
  `tv_site` varchar(255) NOT NULL,
  `tv_facebook` varchar(255) NOT NULL,
  `hash` varchar(255) NOT NULL,
  `apk` varchar(255) NOT NULL,
  `zip` varchar(255) NOT NULL,
  `package` varchar(255) NOT NULL,
  `aviso` text NOT NULL,
  `status` int(1) NOT NULL DEFAULT 0,
  `data` datetime NOT NULL,
  `source` varchar(255) NOT NULL DEFAULT 'source1',
  `log_build` longtext NOT NULL,
  `compilado` char(3) DEFAULT 'nao',
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.app_multi_plataforma
CREATE TABLE IF NOT EXISTS `app_multi_plataforma` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `nome` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `email` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_facebook` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_instagram` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_twitter` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_youtube` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_site` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_chat` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_logo` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `url_background` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `whatsapp` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `cor_texto` char(7) COLLATE latin1_general_ci NOT NULL DEFAULT '#FFFFFF',
  `cor_menu_claro` char(7) COLLATE latin1_general_ci NOT NULL DEFAULT '#7386d5',
  `cor_menu_escuro` char(7) COLLATE latin1_general_ci NOT NULL DEFAULT '#6d7fcc',
  `cor_splash` char(7) COLLATE latin1_general_ci NOT NULL DEFAULT '#6d7fcc',
  `text_prog` longtext COLLATE latin1_general_ci NOT NULL,
  `text_hist` longtext COLLATE latin1_general_ci NOT NULL,
  `contador` char(3) COLLATE latin1_general_ci NOT NULL DEFAULT 'nao',
  `tela_inicial` int(1) NOT NULL DEFAULT 1,
  `modelo` int(1) NOT NULL DEFAULT 1,
  `apk_package` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  `apk_versao` varchar(255) COLLATE latin1_general_ci NOT NULL DEFAULT '1.0',
  `apk_criado` varchar(255) COLLATE latin1_general_ci NOT NULL DEFAULT 'nao',
  `apk_cert_sha256` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  `apk_zip` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.app_multi_plataforma_anuncios
CREATE TABLE IF NOT EXISTS `app_multi_plataforma_anuncios` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_app` int(10) NOT NULL,
  `nome` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `banner` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `link` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `data_cadastro` date NOT NULL,
  `exibicoes` int(10) NOT NULL DEFAULT 0,
  `cliques` int(10) NOT NULL DEFAULT 0,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.app_multi_plataforma_notificacoes
CREATE TABLE IF NOT EXISTS `app_multi_plataforma_notificacoes` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL DEFAULT 0,
  `codigo_app` int(10) NOT NULL DEFAULT 0,
  `titulo` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  `url_icone` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  `url_imagem` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  `url_link` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  `mensagem` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  `vizualizacoes` int(10) NOT NULL DEFAULT 0,
  `data` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.atalhos
CREATE TABLE IF NOT EXISTS `atalhos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `menu` varchar(255) NOT NULL,
  `lang` varchar(255) NOT NULL,
  `ordem` int(10) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.avisos
CREATE TABLE IF NOT EXISTS `avisos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_servidor` int(10) NOT NULL,
  `area` varchar(255) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `descricao` longtext NOT NULL,
  `data` date NOT NULL,
  `mensagem` longtext NOT NULL,
  `status` char(3) NOT NULL DEFAULT 'sim',
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.avisos_desativados
CREATE TABLE IF NOT EXISTS `avisos_desativados` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_aviso` int(10) NOT NULL,
  `login` varchar(255) NOT NULL,
  `area` varchar(255) NOT NULL,
  `data` date NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.bloqueios_login
CREATE TABLE IF NOT EXISTS `bloqueios_login` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_cliente` int(10) NOT NULL,
  `codigo_stm` int(10) NOT NULL,
  `data` datetime NOT NULL,
  `ip` varchar(255) NOT NULL,
  `navegador` varchar(255) NOT NULL,
  `tentativas` int(10) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.certificados
CREATE TABLE IF NOT EXISTS `certificados` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `dominio` varchar(255) NOT NULL,
  `data` datetime NOT NULL,
  `tipo` varchar(255) NOT NULL,
  `status` int(1) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.chat
CREATE TABLE IF NOT EXISTS `chat` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `login` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `nome` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `hash` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `ip` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `msg` longtext COLLATE latin1_general_ci NOT NULL,
  `data` datetime NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.chat_usuarios
CREATE TABLE IF NOT EXISTS `chat_usuarios` (
  `codigo` int(11) NOT NULL AUTO_INCREMENT,
  `login` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `nome` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `hash` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `ip` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.comerciais_config
CREATE TABLE IF NOT EXISTS `comerciais_config` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `codigo_playlist` int(10) NOT NULL,
  `codigo_pasta_comerciais` int(10) NOT NULL,
  `quantidade_comerciais` int(3) DEFAULT 1,
  `intervalo_videos` int(3) DEFAULT 3,
  `ativo` tinyint(1) DEFAULT 1,
  `data_criacao` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`codigo`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_codigo_playlist` (`codigo_playlist`),
  CONSTRAINT `comerciais_config_ibfk_1` FOREIGN KEY (`codigo_stm`) REFERENCES `revendas` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.configuracoes
CREATE TABLE IF NOT EXISTS `configuracoes` (
  `codigo` int(11) NOT NULL AUTO_INCREMENT,
  `dominio_padrao` varchar(255) NOT NULL,
  `codigo_wowza_servidor_atual` int(10) NOT NULL,
  `manutencao` char(3) NOT NULL DEFAULT 'nao',
  PRIMARY KEY (`codigo`),
  KEY `idx_config_wowza_servidor` (`codigo_wowza_servidor_atual`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.dicas_rapidas
CREATE TABLE IF NOT EXISTS `dicas_rapidas` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `mensagem` text NOT NULL,
  `exibir` char(3) NOT NULL DEFAULT 'sim',
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.dicas_rapidas_acessos
CREATE TABLE IF NOT EXISTS `dicas_rapidas_acessos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `codigo_dica` int(10) NOT NULL,
  `total` int(10) NOT NULL DEFAULT 0,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.dominios_bloqueados
CREATE TABLE IF NOT EXISTS `dominios_bloqueados` (
  `codigo` int(11) NOT NULL AUTO_INCREMENT,
  `dominio` varchar(255) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.espectadores_conectados
CREATE TABLE IF NOT EXISTS `espectadores_conectados` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `ip` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `tempo_conectado` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `pais_sigla` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `pais_nome` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `cidade` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `estado` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `player` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `latitude` varchar(255) COLLATE latin1_general_ci NOT NULL DEFAULT '0.0',
  `longitude` varchar(255) COLLATE latin1_general_ci NOT NULL DEFAULT '0.0',
  `atualizacao` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`codigo`),
  KEY `idx_atualizacao` (`atualizacao`),
  KEY `idx_stm_atualizacao` (`codigo_stm`,`atualizacao`)
) ENGINE=MyISAM AUTO_INCREMENT=68 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.estatisticas
CREATE TABLE IF NOT EXISTS `estatisticas` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `data` date NOT NULL,
  `hora` time NOT NULL,
  `ip` varchar(255) NOT NULL DEFAULT '000.000.000.000',
  `pais` varchar(255) NOT NULL,
  `tempo_conectado` int(20) NOT NULL DEFAULT 0,
  `player` varchar(255) NOT NULL,
  `cidade` varchar(255) NOT NULL,
  `estado` varchar(255) NOT NULL,
  PRIMARY KEY (`codigo`),
  KEY `indice_stm` (`codigo_stm`),
  KEY `indice_pais` (`codigo_stm`,`pais`(10)),
  KEY `indice_data` (`codigo_stm`,`data`),
  KEY `indice_tempo_conectado` (`codigo_stm`,`tempo_conectado`),
  KEY `indice_ip` (`codigo_stm`,`ip`(15)),
  KEY `indice_robot` (`codigo_stm`,`data`,`ip`(12)),
  KEY `player` (`player`),
  KEY `codigo_stm` (`codigo_stm`,`data`,`hora`),
  KEY `idx_data_stm` (`data`,`codigo_stm`),
  KEY `idx_pais_stm` (`pais`,`codigo_stm`),
  KEY `idx_tempo_conectado` (`tempo_conectado`)
) ENGINE=MyISAM AUTO_INCREMENT=133 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.geoip
CREATE TABLE IF NOT EXISTS `geoip` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `ip` varchar(255) NOT NULL,
  `pais_sigla` varchar(255) NOT NULL,
  `pais_nome` varchar(255) NOT NULL,
  `estado` varchar(255) NOT NULL,
  `cidade` varchar(255) NOT NULL,
  `latitude` varchar(255) NOT NULL DEFAULT '0.0',
  `longitude` varchar(255) NOT NULL DEFAULT '0.0',
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM AUTO_INCREMENT=20 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.geoip_paises
CREATE TABLE IF NOT EXISTS `geoip_paises` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `sigla` char(2) COLLATE latin1_general_ci NOT NULL,
  `nome` varchar(255) COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM AUTO_INCREMENT=253 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.ip_cameras
CREATE TABLE IF NOT EXISTS `ip_cameras` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `rtsp` text NOT NULL,
  `stream` varchar(255) NOT NULL,
  `data_cadastro` datetime NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.lives
CREATE TABLE IF NOT EXISTS `lives` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `data_inicio` datetime NOT NULL,
  `data_fim` datetime NOT NULL,
  `tipo` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `live_servidor` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `live_app` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `live_chave` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `status` int(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.logos
CREATE TABLE IF NOT EXISTS `logos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `arquivo` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamanho` int(10) NOT NULL DEFAULT 0,
  `tipo_arquivo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_upload` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`codigo`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  CONSTRAINT `logos_ibfk_1` FOREIGN KEY (`codigo_stm`) REFERENCES `revendas` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.logs
CREATE TABLE IF NOT EXISTS `logs` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `data` datetime NOT NULL,
  `host` varchar(255) NOT NULL DEFAULT 'http://',
  `ip` varchar(255) NOT NULL,
  `navegador` varchar(255) NOT NULL,
  `log` text NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.logs_streamings
CREATE TABLE IF NOT EXISTS `logs_streamings` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `data` datetime NOT NULL,
  `host` varchar(255) NOT NULL,
  `ip` varchar(255) NOT NULL,
  `navegador` varchar(255) NOT NULL,
  `log` text NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM AUTO_INCREMENT=104 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.pastas
CREATE TABLE IF NOT EXISTS `pastas` (
  `Coluna 1` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.perfis_acesso
CREATE TABLE IF NOT EXISTS `perfis_acesso` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permissoes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `data_criacao` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `criado_por` int(10) NOT NULL,
  PRIMARY KEY (`codigo`),
  KEY `idx_perfis_ativo` (`ativo`),
  KEY `idx_perfis_criado_por` (`criado_por`),
  CONSTRAINT `fk_perfis_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `administradores` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.planos_revenda
CREATE TABLE IF NOT EXISTS `planos_revenda` (
  `codigo` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descricao` text DEFAULT NULL,
  `subrevendas` int(11) NOT NULL DEFAULT 0,
  `streamings` int(11) NOT NULL DEFAULT 1,
  `espectadores` int(11) NOT NULL DEFAULT 100,
  `bitrate` int(11) NOT NULL DEFAULT 2000,
  `espaco_ftp` int(11) NOT NULL DEFAULT 1000,
  `transmissao_srt` tinyint(1) NOT NULL DEFAULT 0,
  `preco` decimal(10,2) NOT NULL DEFAULT 0.00,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `criado_por` int(11) DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  KEY `idx_planos_revenda_ativo` (`ativo`),
  KEY `idx_planos_revenda_criado_por` (`criado_por`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.planos_streaming
CREATE TABLE IF NOT EXISTS `planos_streaming` (
  `codigo` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descricao` text DEFAULT NULL,
  `espectadores` int(11) NOT NULL DEFAULT 100,
  `bitrate` int(11) NOT NULL DEFAULT 2000,
  `espaco_ftp` int(11) NOT NULL DEFAULT 1000,
  `preco` decimal(10,2) NOT NULL DEFAULT 0.00,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `criado_por` int(11) DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  KEY `idx_planos_streaming_ativo` (`ativo`),
  KEY `idx_planos_streaming_criado_por` (`criado_por`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.plataformas
CREATE TABLE IF NOT EXISTS `plataformas` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_plataforma` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icone` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activity',
  `rtmp_base_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `requer_stream_key` tinyint(1) NOT NULL DEFAULT 1,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`codigo`),
  UNIQUE KEY `codigo_plataforma` (`codigo_plataforma`),
  KEY `idx_codigo_plataforma` (`codigo_plataforma`),
  KEY `idx_ativo` (`ativo`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.player_embed_codes
CREATE TABLE IF NOT EXISTS `player_embed_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(11) NOT NULL,
  `player_config_id` int(11) NOT NULL,
  `embed_type` enum('iframe','javascript','html','android','ios') DEFAULT 'iframe',
  `embed_code` text NOT NULL,
  `custom_css` text DEFAULT NULL,
  `custom_js` text DEFAULT NULL,
  `is_responsive` tinyint(1) DEFAULT 1,
  `width` int(11) DEFAULT 640,
  `height` int(11) DEFAULT 360,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `player_config_id` (`player_config_id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_embed_type` (`embed_type`),
  CONSTRAINT `player_embed_codes_ibfk_1` FOREIGN KEY (`player_config_id`) REFERENCES `video_players_config` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.player_usage_stats
CREATE TABLE IF NOT EXISTS `player_usage_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(11) NOT NULL,
  `player_config_id` int(11) NOT NULL,
  `video_id` int(11) DEFAULT NULL,
  `viewer_ip` varchar(45) DEFAULT NULL,
  `viewer_country` varchar(100) DEFAULT NULL,
  `viewer_city` varchar(100) DEFAULT NULL,
  `device_type` enum('desktop','mobile','tablet','tv','unknown') DEFAULT 'unknown',
  `browser` varchar(100) DEFAULT NULL,
  `os` varchar(100) DEFAULT NULL,
  `play_duration` int(11) DEFAULT 0,
  `quality_level` varchar(20) DEFAULT NULL,
  `buffering_events` int(11) DEFAULT 0,
  `error_events` int(11) DEFAULT 0,
  `session_start` timestamp NOT NULL DEFAULT current_timestamp(),
  `session_end` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_player_config` (`player_config_id`),
  KEY `idx_session_start` (`session_start`),
  CONSTRAINT `player_usage_stats_ibfk_1` FOREIGN KEY (`player_config_id`) REFERENCES `video_players_config` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.player_watermark_config
CREATE TABLE IF NOT EXISTS `player_watermark_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(11) NOT NULL,
  `logo_id` int(11) DEFAULT NULL,
  `position` enum('top-left','top-right','bottom-left','bottom-right') DEFAULT 'top-right',
  `opacity` int(11) DEFAULT 80,
  `size` enum('small','medium','large') DEFAULT 'medium',
  `margin_x` int(11) DEFAULT 20,
  `margin_y` int(11) DEFAULT 20,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_logo_id` (`logo_id`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `player_watermark_config_ibfk_1` FOREIGN KEY (`logo_id`) REFERENCES `logos` (`codigo`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.playlists
CREATE TABLE IF NOT EXISTS `playlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `codigo_stm` int(10) DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `publica` tinyint(1) DEFAULT 0,
  `total_videos` int(10) DEFAULT 0,
  `duracao_total` int(10) DEFAULT 0,
  `data_criacao` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_publica` (`publica`),
  CONSTRAINT `fk_playlists_stm` FOREIGN KEY (`codigo_stm`) REFERENCES `revendas` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.playlists_agendamentos
CREATE TABLE IF NOT EXISTS `playlists_agendamentos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `codigo_playlist` int(10) NOT NULL,
  `servidor_relay` varchar(255) NOT NULL,
  `frequencia` int(1) NOT NULL DEFAULT 1,
  `data` date NOT NULL,
  `hora` char(2) NOT NULL,
  `minuto` char(2) NOT NULL,
  `dias` varchar(50) NOT NULL,
  `tipo` varchar(50) NOT NULL DEFAULT 'playlist',
  `shuffle` char(3) NOT NULL DEFAULT 'nao',
  `finalizacao` char(20) NOT NULL DEFAULT 'repetir',
  `codigo_playlist_finalizacao` int(10) NOT NULL DEFAULT 0,
  `inicio` int(1) NOT NULL DEFAULT 2,
  PRIMARY KEY (`codigo`),
  KEY `indice_data` (`data`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.playlists_agendamentos_logs
CREATE TABLE IF NOT EXISTS `playlists_agendamentos_logs` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_agendamento` int(10) NOT NULL DEFAULT 0,
  `codigo_stm` int(10) NOT NULL DEFAULT 0,
  `data` datetime DEFAULT NULL,
  `playlist` varchar(255) COLLATE latin1_general_ci DEFAULT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.playlists_videos
CREATE TABLE IF NOT EXISTS `playlists_videos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_playlist` int(10) NOT NULL,
  `path_video` varchar(255) NOT NULL,
  `video` varchar(255) NOT NULL,
  `width` int(10) NOT NULL,
  `height` int(10) NOT NULL,
  `bitrate` int(10) NOT NULL,
  `duracao` char(10) NOT NULL,
  `duracao_segundos` int(11) NOT NULL,
  `tipo` varchar(255) NOT NULL DEFAULT 'video',
  `ordem` int(10) NOT NULL,
  `tamanho_arquivo` bigint(20) DEFAULT 0,
  PRIMARY KEY (`codigo`),
  KEY `idx_playlist_ordem` (`codigo_playlist`,`ordem`),
  KEY `idx_tipo` (`tipo`)
) ENGINE=MyISAM AUTO_INCREMENT=76 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.relay_agendamentos
CREATE TABLE IF NOT EXISTS `relay_agendamentos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `servidor_relay` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `frequencia` int(1) NOT NULL DEFAULT 1,
  `data` date NOT NULL,
  `hora` char(2) COLLATE latin1_general_ci NOT NULL,
  `minuto` char(2) COLLATE latin1_general_ci NOT NULL,
  `dias` varchar(50) COLLATE latin1_general_ci NOT NULL,
  `status` int(1) NOT NULL DEFAULT 0,
  `duracao` char(6) COLLATE latin1_general_ci NOT NULL,
  `log_data_inicio` datetime NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.relay_agendamentos_logs
CREATE TABLE IF NOT EXISTS `relay_agendamentos_logs` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_agendamento` int(10) NOT NULL,
  `codigo_stm` int(10) NOT NULL,
  `data` datetime NOT NULL,
  `servidor_relay` varchar(255) COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.revendas
CREATE TABLE IF NOT EXISTS `revendas` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_revenda` int(10) NOT NULL,
  `id` char(6) CHARACTER SET latin1 NOT NULL,
  `nome` varchar(255) CHARACTER SET latin1 NOT NULL,
  `email` varchar(255) CHARACTER SET latin1 NOT NULL,
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senha` varchar(255) CHARACTER SET latin1 NOT NULL,
  `streamings` int(10) NOT NULL,
  `espectadores` int(10) NOT NULL,
  `bitrate` int(10) NOT NULL,
  `espaco` int(10) NOT NULL,
  `subrevendas` int(10) NOT NULL DEFAULT 0,
  `chave_api` longtext CHARACTER SET latin1 NOT NULL,
  `status` int(1) NOT NULL DEFAULT 1,
  `url_suporte` text CHARACTER SET latin1 DEFAULT NULL,
  `data_cadastro` datetime NOT NULL,
  `dominio_padrao` varchar(255) CHARACTER SET latin1 NOT NULL,
  `stm_exibir_tutoriais` char(3) CHARACTER SET latin1 NOT NULL DEFAULT 'sim',
  `url_tutoriais` varchar(255) CHARACTER SET latin1 NOT NULL DEFAULT 'http://',
  `stm_exibir_downloads` char(3) CHARACTER SET latin1 NOT NULL DEFAULT 'sim',
  `stm_exibir_mini_site` char(3) CHARACTER SET latin1 NOT NULL DEFAULT 'nao',
  `stm_exibir_app_android_painel` char(3) CHARACTER SET latin1 NOT NULL DEFAULT 'sim',
  `idioma_painel` char(10) CHARACTER SET latin1 NOT NULL DEFAULT 'pt-br',
  `tipo` int(1) NOT NULL DEFAULT 1,
  `ultimo_acesso_data` datetime NOT NULL,
  `ultimo_acesso_ip` varchar(255) CHARACTER SET latin1 NOT NULL DEFAULT '000.000.000.000',
  `stm_exibir_app_android` char(3) CHARACTER SET latin1 NOT NULL DEFAULT 'sim',
  `srt_status` char(3) CHARACTER SET latin1 NOT NULL DEFAULT 'nao',
  `api_token` varchar(255) CHARACTER SET latin1 DEFAULT NULL,
  `refresh_token` varchar(255) CHARACTER SET latin1 DEFAULT NULL,
  `configuracoes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `admin_criador` int(10) DEFAULT NULL COMMENT 'Admin que criou a conta',
  `codigo_wowza_servidor` int(10) DEFAULT NULL,
  `data_expiracao` date DEFAULT NULL COMMENT 'Data de expiração da conta',
  `status_detalhado` enum('ativo','suspenso','expirado','cancelado','teste') COLLATE utf8mb4_unicode_ci DEFAULT 'ativo',
  `observacoes_admin` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Observações administrativas',
  `limite_uploads_diario` int(10) DEFAULT 100 COMMENT 'Limite de uploads por dia',
  `espectadores_ilimitado` tinyint(1) DEFAULT 0 COMMENT 'Se tem espectadores ilimitados',
  `bitrate_maximo` int(10) DEFAULT 5000 COMMENT 'Bitrate máximo permitido',
  `total_transmissoes` int(10) DEFAULT 0 COMMENT 'Total de transmissões realizadas',
  `ultima_transmissao` datetime DEFAULT NULL COMMENT 'Data da última transmissão',
  `espaco_usado_mb` int(10) DEFAULT 0 COMMENT 'Espaço usado em MB',
  `data_ultima_atualizacao` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `plano_id` int(11) DEFAULT NULL,
  `streamings_usadas` int(11) DEFAULT 0,
  `espectadores_usados` int(11) DEFAULT 0,
  `bitrate_usado` int(11) DEFAULT 0,
  `espaco_usado` int(11) DEFAULT 0,
  `subrevendas_usadas` int(11) DEFAULT 0,
  PRIMARY KEY (`codigo`),
  KEY `idx_revendas_status_detalhado` (`status_detalhado`),
  KEY `idx_revendas_data_expiracao` (`data_expiracao`),
  KEY `idx_revendas_admin_criador` (`admin_criador`),
  KEY `idx_revendas_ultima_transmissao` (`ultima_transmissao`),
  KEY `idx_revendas_wowza_servidor` (`codigo_wowza_servidor`),
  KEY `idx_revendas_plano_id` (`plano_id`),
  CONSTRAINT `fk_revendas_admin_criador` FOREIGN KEY (`admin_criador`) REFERENCES `administradores` (`codigo`) ON DELETE SET NULL,
  CONSTRAINT `fk_revendas_wowza_servidor` FOREIGN KEY (`codigo_wowza_servidor`) REFERENCES `wowza_servers` (`codigo`) ON DELETE SET NULL,
  CONSTRAINT `revendas_ibfk_1` FOREIGN KEY (`plano_id`) REFERENCES `planos_revenda` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.revendas_planos
CREATE TABLE IF NOT EXISTS `revendas_planos` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_revenda` int(10) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `espectadores` int(10) NOT NULL,
  `bitrate` int(10) NOT NULL,
  `espaco_ftp` int(10) NOT NULL,
  `ipcameras` int(10) NOT NULL,
  `subrevendas` int(10) NOT NULL,
  `streamings` int(10) NOT NULL DEFAULT 0,
  `tipo` char(10) NOT NULL DEFAULT 'streaming',
  `aplicacao` varchar(10) NOT NULL DEFAULT 'live',
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.screen_size
CREATE TABLE IF NOT EXISTS `screen_size` (
  `codigo` int(11) NOT NULL AUTO_INCREMENT,
  `width` varchar(255) NOT NULL,
  `height` varchar(255) NOT NULL,
  `data` datetime NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.servidores
CREATE TABLE IF NOT EXISTS `servidores` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL DEFAULT 'Stm',
  `ip` varchar(255) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `porta_ssh` int(6) NOT NULL DEFAULT 6985,
  `status` char(3) NOT NULL DEFAULT 'on',
  `limite_streamings` int(10) NOT NULL DEFAULT 150,
  `load` float NOT NULL,
  `trafego` varchar(255) NOT NULL,
  `trafego_out` varchar(255) NOT NULL,
  `ordem` int(10) NOT NULL,
  `mensagem_manutencao` text NOT NULL,
  `grafico_trafego` text NOT NULL,
  `exibir` char(3) NOT NULL DEFAULT 'sim',
  `path_home` varchar(255) NOT NULL DEFAULT '/home',
  `instalacao_status` int(1) NOT NULL DEFAULT 0,
  `porta_ssh_atual` int(6) NOT NULL DEFAULT 22,
  `instalacao_porta_ssh_atual` int(6) NOT NULL DEFAULT 22,
  `tipo` varchar(255) NOT NULL DEFAULT 'streaming',
  `instalacao_porta_ssh` int(6) NOT NULL,
  `nome_principal` varchar(255) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.servidores_migracao
CREATE TABLE IF NOT EXISTS `servidores_migracao` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_servidor` int(10) NOT NULL,
  `ip` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `senha` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `porta_ssh` int(10) NOT NULL,
  `data_inicio` datetime NOT NULL,
  `status` int(1) NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.streamings
CREATE TABLE IF NOT EXISTS `streamings` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_cliente` int(10) NOT NULL,
  `codigo_servidor` int(10) NOT NULL,
  `login` varchar(255) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `senha_transmissao` varchar(255) NOT NULL,
  `autenticar_live` char(3) NOT NULL DEFAULT 'sim',
  `espectadores` int(10) NOT NULL,
  `bitrate` int(10) DEFAULT NULL,
  `espaco` int(10) DEFAULT NULL,
  `espaco_usado` int(10) DEFAULT NULL,
  `ipcameras` int(10) DEFAULT 0,
  `ftp_dir` varchar(255) DEFAULT NULL,
  `identificacao` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `timezone` varchar(255) DEFAULT 'America/Sao_Paulo',
  `formato_data` char(11) DEFAULT 'd/m/Y H:i:s',
  `descricao` varchar(255) DEFAULT NULL,
  `idioma_painel` char(10) DEFAULT 'pt-br',
  `pagina_inicial` varchar(255) DEFAULT '/informacoes',
  `exibir_atalhos` char(3) DEFAULT 'nao',
  `player_autoplay` char(5) DEFAULT 'true',
  `player_volume_inicial` char(3) DEFAULT '1.0',
  `permitir_alterar_senha` char(3) DEFAULT 'sim',
  `data_cadastro` datetime DEFAULT NULL,
  `aplicacao` char(10) DEFAULT 'live',
  `player_titulo` varchar(255) DEFAULT NULL,
  `player_descricao` varchar(255) DEFAULT NULL,
  `status_gravando` char(3) DEFAULT 'nao',
  `gravador_arquivo` varchar(255) DEFAULT NULL,
  `gravador_data_inicio` datetime DEFAULT NULL,
  `exibir_app_android` char(3) DEFAULT 'sim',
  `status` int(1) DEFAULT 1,
  `transcoder` char(3) DEFAULT 'nao',
  `transcoder_qualidades` varchar(255) DEFAULT '720p|360p|240p|160p|h263',
  `aparencia_exibir_stats_espectadores` char(3) DEFAULT 'sim',
  `aparencia_exibir_stats_ftp` char(3) DEFAULT 'sim',
  `ultima_playlist` int(10) DEFAULT NULL,
  `live_youtube` char(3) DEFAULT 'sim',
  `app_nome` varchar(255) DEFAULT NULL,
  `app_email` varchar(255) DEFAULT NULL,
  `app_whatsapp` varchar(255) DEFAULT NULL,
  `app_url_logo` varchar(255) DEFAULT NULL,
  `app_url_icone` varchar(255) DEFAULT NULL,
  `app_url_background` varchar(255) DEFAULT NULL,
  `app_url_facebook` varchar(255) DEFAULT NULL,
  `app_url_instagram` varchar(255) DEFAULT NULL,
  `app_url_twitter` varchar(255) DEFAULT NULL,
  `app_url_site` varchar(255) DEFAULT NULL,
  `app_url_chat` varchar(255) DEFAULT NULL,
  `app_cor_texto` char(7) DEFAULT '#FFFFFF',
  `app_cor_menu_claro` char(7) DEFAULT '#7386d5',
  `app_cor_menu_escuro` char(7) DEFAULT '#6d7fcc',
  `app_win_nome` varchar(255) DEFAULT NULL,
  `app_win_email` varchar(255) DEFAULT NULL,
  `app_win_whatsapp` varchar(255) DEFAULT NULL,
  `app_win_url_logo` varchar(255) DEFAULT NULL,
  `app_win_url_icone` varchar(255) DEFAULT NULL,
  `app_win_url_background` varchar(255) DEFAULT NULL,
  `app_win_url_facebook` varchar(255) DEFAULT NULL,
  `app_win_url_instagram` varchar(255) DEFAULT NULL,
  `app_win_url_twitter` varchar(255) DEFAULT NULL,
  `app_win_url_site` varchar(255) DEFAULT NULL,
  `app_win_url_chat` varchar(255) DEFAULT NULL,
  `app_win_cor_texto` char(7) DEFAULT '#FFFFFF',
  `app_win_cor_menu_claro` char(7) DEFAULT '#7386d5',
  `app_win_cor_menu_escuro` char(7) DEFAULT '#6d7fcc',
  `app_win_url_youtube` varchar(255) DEFAULT NULL,
  `app_win_text_prog` longtext DEFAULT NULL,
  `app_win_text_hist` longtext DEFAULT NULL,
  `app_tela_inicial` int(1) DEFAULT 1,
  `watermark_posicao` varchar(255) DEFAULT NULL,
  `geoip_ativar` char(3) DEFAULT 'nao',
  `geoip_paises_bloqueados` text DEFAULT NULL,
  `relay_status` char(3) DEFAULT 'nao',
  `relay_url` varchar(255) DEFAULT NULL,
  `webrtc_chave` varchar(255) DEFAULT NULL,
  `srt_status` char(3) DEFAULT 'nao',
  `srt_porta` int(10) DEFAULT 0,
  `app_certificado` varchar(255) DEFAULT 'padrao',
  `espectadores_conectados` int(11) DEFAULT 0,
  `ultima_atividade` timestamp NULL DEFAULT NULL,
  `plano_id` int(10) DEFAULT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.transmission_settings
CREATE TABLE IF NOT EXISTS `transmission_settings` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_logo` int(10) DEFAULT NULL,
  `logo_posicao` enum('top-left','top-right','bottom-left','bottom-right','center') COLLATE utf8mb4_unicode_ci DEFAULT 'top-right',
  `logo_opacidade` int(3) DEFAULT 80,
  `logo_tamanho` enum('small','medium','large') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `logo_margem_x` int(5) DEFAULT 20,
  `logo_margem_y` int(5) DEFAULT 20,
  `embaralhar_videos` tinyint(1) DEFAULT 0,
  `repetir_playlist` tinyint(1) DEFAULT 1,
  `transicao_videos` enum('fade','cut','slide') COLLATE utf8mb4_unicode_ci DEFAULT 'fade',
  `resolucao` enum('720p','1080p','1440p','4k') COLLATE utf8mb4_unicode_ci DEFAULT '1080p',
  `fps` int(3) DEFAULT 30,
  `bitrate` int(6) DEFAULT 2500,
  `titulo_padrao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao_padrao` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_criacao` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`codigo`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_codigo_logo` (`codigo_logo`),
  CONSTRAINT `transmission_settings_ibfk_1` FOREIGN KEY (`codigo_stm`) REFERENCES `revendas` (`codigo`) ON DELETE CASCADE,
  CONSTRAINT `transmission_settings_ibfk_2` FOREIGN KEY (`codigo_logo`) REFERENCES `logos` (`codigo`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.transmissoes
CREATE TABLE IF NOT EXISTS `transmissoes` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_playlist` int(10) DEFAULT NULL,
  `wowza_stream_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ativa','finalizada','erro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativa',
  `data_inicio` datetime NOT NULL DEFAULT current_timestamp(),
  `data_fim` datetime DEFAULT NULL,
  `viewers_pico` int(10) DEFAULT 0,
  `duracao_segundos` int(10) DEFAULT 0,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `bitrate_usado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_status` (`status`),
  KEY `idx_data_inicio` (`data_inicio`),
  CONSTRAINT `transmissoes_ibfk_1` FOREIGN KEY (`codigo_stm`) REFERENCES `revendas` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.transmissoes_plataformas
CREATE TABLE IF NOT EXISTS `transmissoes_plataformas` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `transmissao_id` int(10) NOT NULL,
  `user_platform_id` int(10) NOT NULL,
  `status` enum('conectando','ativa','erro','desconectada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'conectando',
  `data_inicio` datetime NOT NULL DEFAULT current_timestamp(),
  `data_fim` datetime DEFAULT NULL,
  `erro_detalhes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  KEY `idx_transmissao_id` (`transmissao_id`),
  KEY `idx_user_platform_id` (`user_platform_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `transmissoes_plataformas_ibfk_1` FOREIGN KEY (`transmissao_id`) REFERENCES `transmissoes` (`codigo`) ON DELETE CASCADE,
  CONSTRAINT `transmissoes_plataformas_ibfk_2` FOREIGN KEY (`user_platform_id`) REFERENCES `user_platforms` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.tutoriais
CREATE TABLE IF NOT EXISTS `tutoriais` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `data` date NOT NULL,
  `vizualizacoes` int(10) NOT NULL,
  `tutorial` longtext NOT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.user_platforms
CREATE TABLE IF NOT EXISTS `user_platforms` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `platform_id` int(10) NOT NULL,
  `stream_key` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rtmp_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo_padrao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao_padrao` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`codigo`),
  UNIQUE KEY `unique_user_platform` (`codigo_stm`,`platform_id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_platform_id` (`platform_id`),
  CONSTRAINT `user_platforms_ibfk_1` FOREIGN KEY (`codigo_stm`) REFERENCES `revendas` (`codigo`) ON DELETE CASCADE,
  CONSTRAINT `user_platforms_ibfk_2` FOREIGN KEY (`platform_id`) REFERENCES `plataformas` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.user_settings
CREATE TABLE IF NOT EXISTS `user_settings` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(10) NOT NULL,
  `menu_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `sidebar_collapsed` tinyint(1) DEFAULT 0,
  `notifications_enabled` tinyint(1) DEFAULT 1,
  `auto_refresh` tinyint(1) DEFAULT 1,
  `refresh_interval` int(5) DEFAULT 30,
  `language` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'pt-BR',
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'America/Sao_Paulo',
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`codigo`),
  UNIQUE KEY `unique_user_settings` (`codigo_stm`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`codigo_stm`) REFERENCES `revendas` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.videos
CREATE TABLE IF NOT EXISTS `videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `duracao` int(11) DEFAULT NULL,
  `playlist_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `playlist_id` (`playlist_id`) USING BTREE,
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.VideosPlaylist
CREATE TABLE IF NOT EXISTS `VideosPlaylist` (
  `Id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.video_playback_logs
CREATE TABLE IF NOT EXISTS `video_playback_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(11) NOT NULL,
  `video_id` int(11) DEFAULT NULL,
  `playlist_id` int(11) DEFAULT NULL,
  `player_type` varchar(50) DEFAULT NULL,
  `viewer_ip` varchar(45) DEFAULT NULL,
  `viewer_country` varchar(100) DEFAULT NULL,
  `viewer_city` varchar(100) DEFAULT NULL,
  `device_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `play_start` timestamp NOT NULL DEFAULT current_timestamp(),
  `play_end` timestamp NULL DEFAULT NULL,
  `duration_watched` int(11) DEFAULT 0,
  `total_duration` int(11) DEFAULT 0,
  `quality_changes` int(11) DEFAULT 0,
  `buffering_time` int(11) DEFAULT 0,
  `errors_count` int(11) DEFAULT 0,
  `completion_rate` decimal(5,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_video_id` (`video_id`),
  KEY `idx_playlist_id` (`playlist_id`),
  KEY `idx_play_start` (`play_start`),
  KEY `idx_completion_rate` (`completion_rate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.video_players_config
CREATE TABLE IF NOT EXISTS `video_players_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(11) NOT NULL,
  `player_type` enum('universal','iframe','html5','mobile','facebook','android') DEFAULT 'universal',
  `player_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_player_type` (`player_type`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.video_quality_settings
CREATE TABLE IF NOT EXISTS `video_quality_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_stm` int(11) NOT NULL,
  `quality_name` varchar(50) NOT NULL,
  `width` int(11) NOT NULL,
  `height` int(11) NOT NULL,
  `bitrate_min` int(11) NOT NULL,
  `bitrate_max` int(11) NOT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_codigo_stm` (`codigo_stm`),
  KEY `idx_quality_name` (`quality_name`),
  KEY `idx_default` (`is_default`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.wowza_servers
CREATE TABLE IF NOT EXISTS `wowza_servers` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_root` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `porta_ssh` int(6) NOT NULL DEFAULT 22,
  `caminho_home` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '/home',
  `limite_streamings` int(10) NOT NULL DEFAULT 100,
  `grafico_trafego` tinyint(1) NOT NULL DEFAULT 1,
  `servidor_principal_id` int(10) DEFAULT NULL,
  `tipo_servidor` enum('principal','secundario','unico') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unico',
  `dominio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `streamings_ativas` int(10) NOT NULL DEFAULT 0,
  `load_cpu` int(3) NOT NULL DEFAULT 0,
  `trafego_rede_atual` decimal(10,2) NOT NULL DEFAULT 0.00,
  `trafego_mes` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('ativo','inativo','manutencao') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `data_criacao` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ultima_sincronizacao` datetime DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  UNIQUE KEY `unique_ip` (`ip`),
  KEY `idx_wowza_status` (`status`),
  KEY `idx_wowza_tipo` (`tipo_servidor`),
  KEY `idx_wowza_servidor_principal` (`servidor_principal_id`),
  CONSTRAINT `fk_wowza_servidor_principal` FOREIGN KEY (`servidor_principal_id`) REFERENCES `wowza_servers` (`codigo`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela db_SamCast.wowza_server_migrations
CREATE TABLE IF NOT EXISTS `wowza_server_migrations` (
  `codigo` int(10) NOT NULL AUTO_INCREMENT,
  `servidor_origem_id` int(10) NOT NULL,
  `servidor_destino_id` int(10) NOT NULL,
  `streamings_migradas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` enum('iniciada','em_progresso','concluida','erro','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'iniciada',
  `data_inicio` datetime NOT NULL DEFAULT current_timestamp(),
  `data_fim` datetime DEFAULT NULL,
  `detalhes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_responsavel` int(10) NOT NULL,
  PRIMARY KEY (`codigo`),
  KEY `idx_migration_origem` (`servidor_origem_id`),
  KEY `idx_migration_destino` (`servidor_destino_id`),
  KEY `idx_migration_admin` (`admin_responsavel`),
  KEY `idx_migration_status` (`status`),
  CONSTRAINT `fk_migration_admin` FOREIGN KEY (`admin_responsavel`) REFERENCES `administradores` (`codigo`) ON DELETE CASCADE,
  CONSTRAINT `fk_migration_servidor_destino` FOREIGN KEY (`servidor_destino_id`) REFERENCES `wowza_servers` (`codigo`) ON DELETE CASCADE,
  CONSTRAINT `fk_migration_servidor_origem` FOREIGN KEY (`servidor_origem_id`) REFERENCES `wowza_servers` (`codigo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para view db_SamCast.v_plataformas_stats
-- Criando tabela temporária para evitar erros de dependência de VIEW
CREATE TABLE `v_plataformas_stats` (
	`plataforma_nome` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`codigo_plataforma` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`usuarios_configurados` BIGINT(21) NOT NULL,
	`transmissoes_realizadas` BIGINT(21) NOT NULL,
	`transmissoes_ativas` DECIMAL(22,0) NULL
) ENGINE=MyISAM;

-- Copiando estrutura para view db_SamCast.v_transmissoes_stats
-- Criando tabela temporária para evitar erros de dependência de VIEW
CREATE TABLE `v_transmissoes_stats` (
	`codigo_stm` INT(10) NOT NULL,
	`usuario_nome` VARCHAR(1) NOT NULL COLLATE 'latin1_swedish_ci',
	`total_transmissoes` BIGINT(21) NOT NULL,
	`transmissoes_ativas` DECIMAL(22,0) NULL,
	`transmissoes_finalizadas` DECIMAL(22,0) NULL,
	`media_viewers` DECIMAL(14,4) NULL,
	`tempo_total_transmissao` DECIMAL(32,0) NULL,
	`ultima_transmissao` DATETIME NULL
) ENGINE=MyISAM;

-- Copiando estrutura para procedure db_SamCast.sp_cleanup_admin_sessions
DELIMITER //
CREATE PROCEDURE `sp_cleanup_admin_sessions`()
BEGIN
    DELETE FROM admin_sessions WHERE expires_at < NOW();
END//
DELIMITER ;

-- Copiando estrutura para procedure db_SamCast.sp_cleanup_old_data
DELIMITER //
CREATE PROCEDURE `sp_cleanup_old_data`()
BEGIN
    -- Limpar transmissões antigas (mais de 6 meses)
    DELETE FROM transmissoes 
    WHERE status = 'finalizada' 
    AND data_fim < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    
    -- Limpar estatísticas antigas (mais de 1 ano)
    DELETE FROM estatisticas 
    WHERE data < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    -- Limpar logs antigos (mais de 3 meses)
    DELETE FROM logs_streamings 
    WHERE data < DATE_SUB(NOW(), INTERVAL 3 MONTH);
    
    SELECT 'Limpeza concluída' as resultado;
END//
DELIMITER ;

-- Copiando estrutura para procedure db_SamCast.sp_dashboard_stats
DELIMITER //
CREATE PROCEDURE `sp_dashboard_stats`(IN user_id INT)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM playlists WHERE codigo_stm = user_id) as total_playlists,
        (SELECT COUNT(*) FROM playlists_videos pv 
         JOIN playlists p ON pv.codigo_playlist = p.id 
         WHERE p.codigo_stm = user_id) as total_videos,
        (SELECT COUNT(*) FROM transmissoes WHERE codigo_stm = user_id) as total_transmissoes,
        (SELECT COUNT(*) FROM user_platforms WHERE codigo_stm = user_id AND ativo = 1) as plataformas_configuradas,
        (SELECT COUNT(*) FROM logos WHERE codigo_stm = user_id) as total_logos,
        (SELECT SUM(tamanho) FROM logos WHERE codigo_stm = user_id) as espaco_usado_logos;
END//
DELIMITER ;

-- Copiando estrutura para trigger db_SamCast.tr_playlist_videos_stats
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER IF NOT EXISTS `tr_playlist_videos_stats` 
AFTER INSERT ON `playlists_videos`
FOR EACH ROW
BEGIN
    UPDATE playlists SET 
        total_videos = (
            SELECT COUNT(*) 
            FROM playlists_videos 
            WHERE codigo_playlist = NEW.codigo_playlist
        ),
        duracao_total = (
            SELECT COALESCE(SUM(duracao_segundos), 0) 
            FROM playlists_videos 
            WHERE codigo_playlist = NEW.codigo_playlist
        )
    WHERE id = NEW.codigo_playlist;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Copiando estrutura para trigger db_SamCast.tr_playlist_videos_stats_delete
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER IF NOT EXISTS `tr_playlist_videos_stats_delete` 
AFTER DELETE ON `playlists_videos`
FOR EACH ROW
BEGIN
    UPDATE playlists SET 
        total_videos = (
            SELECT COUNT(*) 
            FROM playlists_videos 
            WHERE codigo_playlist = OLD.codigo_playlist
        ),
        duracao_total = (
            SELECT COALESCE(SUM(duracao_segundos), 0) 
            FROM playlists_videos 
            WHERE codigo_playlist = OLD.codigo_playlist
        )
    WHERE id = OLD.codigo_playlist;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Removendo tabela temporária e criando a estrutura VIEW final
DROP TABLE IF EXISTS `v_plataformas_stats`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_plataformas_stats` AS select `p`.`nome` AS `plataforma_nome`,`p`.`codigo_plataforma` AS `codigo_plataforma`,count(`up`.`codigo`) AS `usuarios_configurados`,count(`tp`.`codigo`) AS `transmissoes_realizadas`,sum(case when `tp`.`status` = 'ativa' then 1 else 0 end) AS `transmissoes_ativas` from ((`plataformas` `p` left join `user_platforms` `up` on(`p`.`codigo` = `up`.`platform_id` and `up`.`ativo` = 1)) left join `transmissoes_plataformas` `tp` on(`up`.`codigo` = `tp`.`user_platform_id`)) group by `p`.`codigo`,`p`.`nome`,`p`.`codigo_plataforma`
;

-- Removendo tabela temporária e criando a estrutura VIEW final
DROP TABLE IF EXISTS `v_transmissoes_stats`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_transmissoes_stats` AS select `t`.`codigo_stm` AS `codigo_stm`,`r`.`nome` AS `usuario_nome`,count(`t`.`codigo`) AS `total_transmissoes`,sum(case when `t`.`status` = 'ativa' then 1 else 0 end) AS `transmissoes_ativas`,sum(case when `t`.`status` = 'finalizada' then 1 else 0 end) AS `transmissoes_finalizadas`,avg(`t`.`viewers_pico`) AS `media_viewers`,sum(`t`.`duracao_segundos`) AS `tempo_total_transmissao`,max(`t`.`data_inicio`) AS `ultima_transmissao` from (`transmissoes` `t` join `revendas` `r` on(`t`.`codigo_stm` = `r`.`codigo`)) group by `t`.`codigo_stm`,`r`.`nome`
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
