<?php
require_once("admin/inc/protecao-final.php");

@mysqli_query($conexao,"CREATE TABLE `anuncios_videos` ( `codigo` INT(10) NOT NULL AUTO_INCREMENT , `codigo_stm` INT(10) NOT NULL , `video` TEXT NOT NULL , `tempo` INT(10) NOT NULL  , `data_cadastro` DATE NOT NULL , `exibicoes` INT(10) NOT NULL , PRIMARY KEY (`codigo`)) ENGINE = MyISAM;");

$dados_config = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM configuracoes"));
$dados_stm = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM streamings where login = '".$_SESSION["login_logado"]."'"));
$dados_servidor = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM servidores where codigo = '".$dados_stm["codigo_servidor"]."'"));
$dados_revenda = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM revendas WHERE codigo = '".$dados_stm["codigo_cliente"]."'"));

$url_player = "playerv.".$dados_config["dominio_padrao"];

if(isset($_POST["video"]) && isset($_POST["tempo"])) {

	mysqli_query($conexao,"INSERT INTO anuncios_videos (codigo_stm,video,tempo,data_cadastro,exibicoes) VALUES ('".$dados_stm["codigo"]."','".addslashes($_POST["video"])."','".$_POST["tempo"]."',NOW(),'0')");

	// Cria o sessão do status das ações executadas e redireciona.
	$_SESSION["status_acao"] = status_acao("Anúncio cadastrado com sucesso.","ok");
	
	header("Location: /gerenciar-player-video-ads");
	exit();
}

// Função para remover a acao
if(query_string('1') == "remover") {

	// Proteção contra acesso direto
	if(!preg_match("/".str_replace("http://","",str_replace("www.","",$_SERVER['HTTP_HOST']))."/i",$_SERVER['HTTP_REFERER'])) {
	die("<span class='texto_status_erro'>0x001 - Atenção! Acesso não autorizado, favor entrar em contato com nosso atendimento para maiores informações!</span>");
	}

	$codigo = query_string('2');

	mysqli_query($conexao,"Delete From anuncios_videos where codigo = '".$codigo."'");
	
	// Cria o sessão do status das ações executadas e redireciona.
	$_SESSION["status_acao"] = status_acao("Anúncio removido com sucesso.","ok");
	
	header("Location: /gerenciar-player-video-ads");
	exit();
}
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
<meta http-equiv="cache-control" content="no-cache">
<link rel="shortcut icon" href="/img/favicon.ico" type="image/x-icon" />
<link href="/inc/estilo-streaming.css" rel="stylesheet" type="text/css" />
<link href="inc/estilo-streaming.css" rel="stylesheet" type="text/css" />
<script type="text/javascript" src="/inc/javascript.js"></script>
<script type="text/javascript" src="/inc/javascript-abas.js"></script>
<script type="text/javascript">
   window.onload = function() {
	fechar_log_sistema();
   };
</script>
</head>

<body>
<div id="sub-conteudo">
<?php
if($_SESSION['status_acao']) {

$status_acao = stripslashes($_SESSION['status_acao']);

echo '<table width="700" border="0" align="center" cellpadding="0" cellspacing="0" style="margin-bottom:5px">'.$status_acao.'</table>';

unset($_SESSION['status_acao']);
}
?>
  <table width="880" border="0" align="center" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <th scope="col"><div id="quadro">
          <div id="quadro-topo"><strong><?php echo $lang['lang_info_players_tab_players']; ?></strong></div>
        <div class="texto_medio" id="quadro-conteudo">
            <table width="870" border="0" align="center" cellpadding="0" cellspacing="0" style="background-color:#F4F4F7; border:#CCCCCC 1px solid;">
              <tr>
                <td height="30" align="center" class="texto_padrao_destaque" style="padding-left:5px;"><select name="players" class="input" id="players" style="width:98%;" onchange="window.open(this.value,'conteudo');">
                    <option value="/gerenciar-player"><?php echo $lang['lang_info_players_player_selecione']; ?></option>
                    <option value="/gerenciar-player"><?php echo $lang['lang_info_players_player_flash_html5']; ?></option>
                    <option value="/gerenciar-player-celulares"><?php echo $lang['lang_info_players_player_celulares']; ?></option>
                    <?php if($dados_stm["exibir_app_android"] == 'sim') { ?>
                    <option value="/app-android"><?php echo $lang['lang_info_players_player_app_android']; ?></option>
                    <?php } ?>
                    <option value="/gerenciar-player-video-chat">Video Responsivo com Chat</option>
                    <option value="/gerenciar-player-video-ads">Video Ads(anúncios)</option>
                    <option value="/gerenciar-player-m3u8">Player Próprio / Link M3U8</option>
                  </select>
                </td>
              </tr>
            </table>
        </div>
      </div></th>
    </tr>
  </table>
<table width="880" border="0" align="center" cellpadding="0" cellspacing="0" style="padding-bottom:10px;">
  <tr>
    <th scope="col">
    	<div id="quadro">
        <div id="quadro-topo"><strong>Video Ads</strong></div>
      	<div class="texto_medio" id="quadro-conteudo">
		<table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
              <tr>
                <td>
                <div class="tab-pane" id="tabPane1">
                 <?php if($_POST) { ?>
                 <div class="tab-page" id="tabPage1">
                    <h2 class="tab"><?php echo $lang['lang_info_players_player_flash_html5_aba_codigo_html']; ?></h2>
                    <table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="background-color:#F4F4F7; border-bottom:#CCCCCC 1px solid; border-left:#CCCCCC 1px solid; border-right:#CCCCCC 1px solid;">
                      <tr>
                        <td align="center" class="texto_padrao_vermelho_destaque" style="padding:5px">
<?php
$largura = ($_POST["responsivo"] == "true") ? '100%' : $_POST["largura"]."px";
$altura = ($_POST["responsivo"] == "true") ? '100%' : $_POST["altura"]."px";
$capa = ($_POST["capa"] && $_POST["capa"] != "http://") ? code_decode($_POST["capa"],"E") : '';
$autoplay = ($_POST["autoplay"] == "true") ? "true" : "false";
$mudo = ($_POST["mute"] == "true") ? "true" : "false";
$contador = ($_POST["contador"] == "sim") ? "sim" : "nao";
$share = ($_POST["share"] == "sim") ? "sim" : "nao";
?>
<textarea readonly="readonly" style="width:99%; height:224px;font-size:11px" onmouseover="this.select()"><iframe style="width:<?php echo $largura; ?>; height:<?php echo $altura; ?>;" src="https://<?php echo $url_player; ?>/video-ads/<?php echo $dados_stm["login"]; ?>/<?php echo $autoplay; ?>/<?php echo $mudo; ?>/<?php echo $_POST["aspectratio"]; ?>/<?php echo $capa; ?>/<?php echo $contador; ?>/<?php echo $share; ?>" scrolling="no" frameborder="0" allowfullscreen></iframe></textarea>
                        </td>
                        </tr>
                    </table>
                  </div>
                <?php } ?>
                  <div class="tab-page" id="tabPage1">
                    <h2 class="tab">Player</h2>
                    <form action="/gerenciar-player-video-ads" method="post">
                    <table width="870" border="0" align="center" cellpadding="0" cellspacing="0" style="background-color:#F4F4F7; border-bottom:#CCCCCC 1px solid; border-left:#CCCCCC 1px solid; border-right:#CCCCCC 1px solid;">
                      <tr>
                        <td width="150" height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;"><?php echo $lang['lang_info_players_player_flash_html5_largura']; ?></td>
                        <td width="720" align="left"><input type="number" name="largura" style="width:300px" value="640" /></td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;"><?php echo $lang['lang_info_players_player_flash_html5_altura']; ?></td>
                        <td align="left"><input type="number" name="altura" style="width:300px" value="480" /></td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;"><?php echo $lang['lang_info_players_player_flash_html5_capa']; ?></td>
                        <td align="left" class="texto_padrao_pequeno"><input type="text" name="capa" style="width:300px" value="http://" />&nbsp;<img src="img/icones/ajuda.gif" title="Ajuda sobre este item." width="16" height="16" onclick="alert('<?php echo $lang['lang_info_players_player_flash_html5_capa_info']; ?>');" style="cursor:pointer" /></td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;"><?php echo $lang['lang_info_players_player_flash_html5_aspectratio']; ?></td>
                        <td align="left"><select class="input" name="aspectratio" style="width:305px;">
          		<option value="16:9" selected="selected">Wide Screen 16:9</option>
		  		<option value="4:3">Default 4:3</option>
	         	</select></td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;"><?php echo $lang['lang_info_players_player_flash_html5_autoplay']; ?></td>
                        <td align="left">
                        <input name="autoplay" type="checkbox" value="true" style="vertical-align:middle" />
                        &nbsp;<?php echo $lang['lang_label_sim']; ?>                        </td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;"><?php echo $lang['lang_info_players_player_flash_html5_responsivo']; ?></td>
                        <td align="left">
                        <input name="responsivo" type="checkbox" value="true" style="vertical-align:middle" />&nbsp;<?php echo $lang['lang_label_sim']; ?>&nbsp;<img src="img/icones/ajuda.gif" title="Ajuda sobre este item." width="16" height="16" onclick="alert('<?php echo $lang['lang_info_players_player_flash_html5_responsivo_info']; ?>');" style="cursor:pointer" /></td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;"><?php echo $lang['lang_info_players_player_flash_html5_mudo']; ?></td>
                        <td align="left">
                        <input name="mute" type="checkbox" value="true" style="vertical-align:middle" />&nbsp;<?php echo $lang['lang_label_sim']; ?>&nbsp;<img src="img/icones/ajuda.gif" title="Ajuda sobre este item." width="16" height="16" onclick="alert('<?php echo $lang['lang_info_players_player_flash_html5_mudo_info']; ?>');" style="cursor:pointer" /></td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;">Exibir Contador</td>
                        <td align="left">
                        <input name="contador" type="checkbox" value="sim" style="vertical-align:middle" />
                        &nbsp;<?php echo $lang['lang_label_sim']; ?>                        </td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;">Exibir Compartilhamento</td>
                        <td align="left">
                        <input name="share" type="checkbox" value="sim" style="vertical-align:middle" />
                        &nbsp;<?php echo $lang['lang_label_sim']; ?>                        </td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;">&nbsp;</td>
                        <td align="left"><input type="submit" class="botao" value="OK" /></td>
                      </tr>
                    </table>
                    </form>
                  </div>
                  <div class="tab-page" id="tabPage1">
                    <h2 class="tab">Cadastrar An&uacute;ncio</h2>
                    <form action="/gerenciar-player-video-ads" method="post">
                    <table width="870" border="0" align="center" cellpadding="0" cellspacing="0" style="background-color:#F4F4F7; border-bottom:#CCCCCC 1px solid; border-left:#CCCCCC 1px solid; border-right:#CCCCCC 1px solid;">
                      <tr>
                        <td width="150" height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;">Video</td>
                        <td width="720" align="left"><select name="video" class="input" id="video" style="width:255px;">
                <option selected="selected"><?php echo $lang['lang_info_players_player_vod_selecione']; ?></option>
<?php

$xml_pastas = @simplexml_load_file("http://".$dados_servidor["ip"].":55/listar-pastas.php?login=".$dados_stm["login"]."");
	
$total_pastas = count($xml_pastas->pasta);

if($total_pastas > 0) {

	for($i=0;$i<$total_pastas;$i++){
	
		$pasta = $xml_pastas->pasta[$i]->nome;
		
		$xml_videos = @simplexml_load_file("http://".$dados_servidor["ip"].":55/listar-videos.php?login=".$dados_stm["login"]."&pasta=".$pasta."&ordenar=nao");
	
		$total_videos_pasta = count($xml_videos->video);
		
		if($total_videos_pasta > 0) {
		
		$pasta_label = ($pasta == "/") ? "/ (root)" : $pasta;

		$path_separacao = ($pasta == "/" || $pasta == "") ? "" : "/";
		$pasta = ($pasta == "/") ? $path_separacao : $pasta.$path_separacao;
	
		echo '<optgroup label="' .$pasta_label. '">';
		
			for($ii=0;$ii<$total_videos_pasta;$ii++){
				
				$total_videos_compativeis = 0;

				if($xml_videos->video[$ii]->bitrate < $dados_stm["bitrate"]) { // Verifica limite bitrate
				
					if(!preg_match('/[^A-Za-z0-9\_\-\. ]/',$xml_videos->video[$ii]->nome)) { // Verifica caracteres especiais nome video
					
						echo '<option value="'.$pasta.$xml_videos->video[$ii]->nome.'">['.$xml_videos->video[$ii]->duracao.'] '.$xml_videos->video[$ii]->nome.' ('.$xml_videos->video[$ii]->width.'x'.$xml_videos->video[$ii]->height.' @ '.$xml_videos->video[$ii]->bitrate.' Kbps)</option>';
					$total_videos_compativeis +=1;
					}
				
				}
				
			}
			
			if($total_videos_compativeis == 0) {
			echo '<option disabled="disabled">'.$lang['lang_info_players_player_vod_sem_videos'].'</option>';
			}
			echo '</optgroup>';

		}
		
	}
	
}

?>
                </select></td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;">Exibir  ap&oacute;s</td>
                        <td align="left" class="texto_padrao_pequeno"><input type="text" name="tempo" style="width:50px" value="5" id="tempo" />
                          &nbsp;segundos.</td>
                      </tr>
                      <tr>
                        <td height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;">&nbsp;</td>
                        <td align="left"><input type="submit" class="botao" value="OK" /></td>
                      </tr>
                    </table>
                    </form>
                  </div>
                  <div class="tab-page" id="tabPage1">
                    <h2 class="tab">An&uacute;ncios</h2>
                    <table width="870" border="0" align="center" cellpadding="0" cellspacing="0" style="margin-bottom:10px; background-color:#FFFF66; border:#DFDF00 1px solid">
                      <tr>
                        <td width="30" height="25" align="center" scope="col"><img src="/img/icones/atencao.png" width="16" height="16" /></td>
                        <td width="840" align="left" class="texto_pequeno_erro" scope="col">Os anúncios são exibidos de forma aleatória. Quando o espectador abre o player um video é selecionado aleat&oacute;riamente.</td>
                      </tr>
                    </table>
                    <table width="870" border="0" align="center" cellpadding="0" cellspacing="0" style=" border:#D5D5D5 1px solid; " id="tab" class="sortable">
    <tr style="background:url(/img/img-fundo-titulo-tabela.png) repeat-x; cursor:pointer">
      <td width="500" height="23" align="left" class="texto_padrao_destaque" style="border-bottom:#D5D5D5 1px solid; border-right:#D5D5D5 1px solid;">&nbsp;Video</td>
      <td width="150" height="23" align="left" class="texto_padrao_destaque" style="border-bottom:#D5D5D5 1px solid; border-right:#D5D5D5 1px solid;">&nbsp;Data Cadastro</td>
      <td width="120" height="23" align="left" class="texto_padrao_destaque" style="border-bottom:#D5D5D5 1px solid; border-right:#D5D5D5 1px solid;">&nbsp;Exibi&ccedil;&otilde;es</td>
      <td width="100" height="23" align="left" class="texto_padrao_destaque" style="border-bottom:#D5D5D5 1px solid;">&nbsp;A&ccedil;&otilde;es</td>
    </tr>
<?php
$sql = mysqli_query($conexao,"SELECT * FROM anuncios_videos WHERE codigo_stm = '".$dados_stm["codigo"]."' ORDER by exibicoes DESC");
while ($dados_anuncio = mysqli_fetch_array($sql)) {

echo "<tr>
<td height='25' align='left' scope='col' class='texto_padrao_pequeno'>&nbsp;".$dados_anuncio["video"]."</td>
<td height='25' align='left' scope='col' class='texto_padrao_pequeno'>&nbsp;".formatar_data($dados_stm["formato_data"], $dados_anuncio["data_cadastro"], $dados_stm["timezone"])."</td>
<td height='25' align='left' scope='col' class='texto_padrao_pequeno'>&nbsp;".$dados_anuncio["exibicoes"]."</td>
<td height='25' align='left' scope='col' class='texto_padrao_pequeno'>&nbsp;<a href='/gerenciar-player-video-ads/remover/".$dados_anuncio["codigo"]."'>[Remover]</a></td>
</tr>";

}
?>
  </table>
                    
                  </div>
				</td>
              </tr>
            </table>
              </div>
      	</div>
      </th>
  </tr>
</table>
</div>
<!-- Início div log do sistema -->
<div id="log-sistema-fundo"></div>
<div id="log-sistema">
<div id="log-sistema-botao"><img src="img/icones/img-icone-fechar.png" onclick="document.getElementById('log-sistema-fundo').style.display = 'none';document.getElementById('log-sistema').style.display = 'none';" style="cursor:pointer" title="<?php echo $lang['lang_titulo_fechar']; ?>" /></div>
<div id="log-sistema-conteudo"></div>
</div>
<!-- Fim div log do sistema -->
</body>
</html>