<?php
require_once("admin/inc/protecao-final.php");

$dados_config = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM configuracoes"));
$dados_stm = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM streamings where login = '".$_SESSION["login_logado"]."'"));
$dados_servidor = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM servidores where codigo = '".$dados_stm["codigo_servidor"]."'"));
$dados_revenda = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM revendas WHERE codigo = '".$dados_stm["codigo_cliente"]."'"));

//$url_player = (!empty($dados_revenda["dominio_padrao"])) ? "playerv.".$dados_revenda["dominio_padrao"]."" : "playerv.".$dados_config["dominio_padrao"]."";

$url_player = "playerv.".$dados_config["dominio_padrao"];

$servidor = $dados_servidor["nome"].".".$dados_config["dominio_padrao"];

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
        <div id="quadro-topo"><strong>Link M3U8</strong></div>
      	<div class="texto_medio" id="quadro-conteudo">
		<table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
              <tr>
                <td><table width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" class="texto_padrao_vermelho_destaque" style="padding:5px">Tem seu próprio player? Use o endereço do servidor abaixo para transmitir seu streaming em seu player próprio.<br />
              <br />
<textarea readonly="readonly" style="width:850px; height:20px;font-size:13px; text-align:center; color:#FF0000" onmouseover="this.select()">https://<?php echo $servidor;?>/<?php echo $dados_stm["login"];?>/<?php echo $dados_stm["login"];?>/playlist.m3u8</textarea>
<br />
<br />
<br />
<br />
<br />
                        </td>
                        </tr>
                    </table>
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