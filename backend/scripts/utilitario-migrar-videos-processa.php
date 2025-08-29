<?php
set_time_limit(0);
require_once("admin/inc/protecao-final.php");

$dados_stm = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM streamings where login = '".$_SESSION["login_logado"]."'"));
$dados_servidor = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM servidores where codigo = '".$dados_stm["codigo_servidor"]."'"));
$dados_config = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM configuracoes"));

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
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
<script type="text/javascript" src="/inc/ajax-streaming.js"></script>
<script type="text/javascript" src="/inc/javascript.js"></script>
<script type="text/javascript" src="/inc/javascript-abas.js"></script>
<script type="text/javascript">
   window.onload = function() {
	fechar_log_sistema();
	
   };
</script>
</head>

<body>
<div id="sub-conteudo-pequeno">
<div id="quadro_requisicao" style="display:none">
  <div id="quadro">
            <div id="quadro-topo"><strong><?php echo $lang['lang_info_utilitario_youtube_tab_resultado']; ?></strong></div>
          <div class="texto_medio" id="quadro-conteudo">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td align="center" class="texto_padrao"><img src="/img/ajax-loader.gif" width="220" height="19" id="img_loader" /><br />
                  <div id="resultado_requisicao" style="width:98%; height:150px; border:#999999 1px solid; text-align:left; overflow-y:scroll; padding:5px; background-color:#F4F4F7" class="texto_padrao"></div></td>
                </tr>
              </table>
          </div>
        </div>
<br />
</div>
<div id="quadro">
<div id="quadro-topo"><strong>Migrar Videos via FTP</strong></div>
<div class="texto_medio" id="quadro-conteudo">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="margin-bottom:5px; background-color:#F4F4F7; border:#CCCCCC 1px solid;">
  <tr>
    <td>
<?php
if($_POST["ip_ftp_remoto"] && $_POST["usuario_ftp_remoto"] && $_POST["senha_ftp_remoto"]) {

echo '<iframe src="https://'.$servidor.':1443/migrar-videos-ftp.php?login='.$dados_stm["login"].'&servidor='.$_POST["ip_ftp_remoto"].'&usuario='.$_POST["usuario_ftp_remoto"].'&senha='.$_POST["senha_ftp_remoto"].'" frameborder="0" width="100%" height="300" style="background: #FFFFFF url(\'/img/ajax-loader.gif\') center center no-repeat;" onload="this.style.background=\'#FFFFFF\';"></iframe>';

}
?></td>
  </tr>
</table>
    </div>
    </div>
</div>
<br />
<br />
<!-- Início div log do sistema -->
<div id="log-sistema-fundo"></div>
<div id="log-sistema">
<div id="log-sistema-botao"><img src="/img/icones/img-icone-fechar.png" onclick="document.getElementById('log-sistema-fundo').style.display = 'none';document.getElementById('log-sistema').style.display = 'none';" style="cursor:pointer" title="<?php echo $lang['lang_titulo_fechar']; ?>" /></div>
<div id="log-sistema-conteudo">
<div class="meter">
	<span style="width: 100%"></span>
</div>
</div>
</div>
<!-- Fim div log do sistema -->
</body>
</html>
