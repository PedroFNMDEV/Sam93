<?php
require_once("admin/inc/protecao-final.php");
require_once("admin/inc/classe.ssh.php");

@mysqli_query($conexao,"ALTER TABLE `streamings` ADD `relay_status` CHAR(3) NOT NULL DEFAULT 'nao';");
@mysqli_query($conexao,"ALTER TABLE `streamings` ADD `relay_url` VARCHAR(255) NOT NULL;");

$dados_stm = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM streamings where login = '".$_SESSION["login_logado"]."'"));
$dados_servidor = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM servidores where codigo = '".$dados_stm["codigo_servidor"]."'"));

if($_POST["ativar"]) {

// Verifica se o link m3u8 esta online
if(preg_match('/m3u8/i',$_POST["relay_url"])) {
  $file_headers = @get_headers($_POST["relay_url"]);

  if(!preg_match('/200 OK/i',$file_headers[0])) {
  // Cria o sessão do status das ações executadas e redireciona.
  $_SESSION["status_acao"] = status_acao("A URL informada parece estar offline, por favor verifique e tente novamente.","erro");
  $_SESSION["status_acao"] .= status_acao("URL ".$_POST["relay_url"]." status ".$file_headers[0]."","alerta");

  header("Location: /configuracoes-relay");
  exit();
  }
}

mysqli_query($conexao,"Update streamings set relay_status = 'sim', relay_url = '".$_POST["relay_url"]."' where codigo = '".$dados_stm["codigo"]."'");

// Conexão SSH
$ssh = new SSH();
$ssh->conectar($dados_servidor["ip"],$dados_servidor["porta_ssh"]);
$ssh->autenticar("root",code_decode($dados_servidor["senha"],"D"));

// Finaliza relay atual se existir
$ssh->executar("echo OK;screen -ls | grep -o '[0-9]*.".$dados_stm["login"]."_relay' | xargs -I{} screen -X -S {} quit");

sleep(2);

// Inicia o relay
$autenticar = ($dados_stm["autenticar_live"] == "sim") ? "".$dados_stm["login"].":".$dados_stm["senha_transmissao"]."@" : "";
$chave = ($dados_stm["aplicacao"] == 'tvstation') ? "live" : $dados_stm["login"];

$ssh->executar('echo OK;screen -dmS '.$dados_stm["login"].'_relay bash -c \'/usr/local/bin/ffmpeg -re -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 2 -i \''.$_POST["relay_url"].'\' -c:v copy -c:a copy -bsf:a aac_adtstoasc -preset medium -threads 1 -f flv \'rtmp://'.$autenticar.'localhost:1935/'.$dados_stm["login"].'/'.$chave.'\'; exec sh\'');

sleep(10);

$status_streaming = status_streaming($dados_servidor["ip"],$dados_servidor["senha"],$dados_stm["login"]);

if($status_streaming["status_transmissao"] == "aovivo") {

// Cria o sessão do status das ações executadas e redireciona.
$_SESSION["status_acao"] = status_acao("Relay ativado com sucesso!","ok");

} else {

mysqli_query($conexao,"Update streamings set relay_status = 'nao', relay_url = '".$_POST["relay_url"]."' where codigo = '".$dados_stm["codigo"]."'");

// Cria o sessão do status das ações executadas e redireciona.
$_SESSION["status_acao"] = status_acao("Falha ao ativar relay, verifique se a URL esta correta e tente novamente!","erro");

}

header("Location: /configuracoes-relay");
exit();
}

if($_POST["desativar"]) {

// Conexão SSH
$ssh = new SSH();
$ssh->conectar($dados_servidor["ip"],$dados_servidor["porta_ssh"]);
$ssh->autenticar("root",code_decode($dados_servidor["senha"],"D"));

// Finaliza relay atual se existir
$ssh->executar("echo OK;screen -ls | grep -o '[0-9]*.".$dados_stm["login"]."_relay' | xargs -I{} screen -X -S {} quit");

mysqli_query($conexao,"Update streamings set relay_status = 'nao' where codigo = '".$dados_stm["codigo"]."'");

// Cria o sessão do status das ações executadas e redireciona.
$_SESSION["status_acao"] = status_acao("Relay desativado com sucesso!","ok");

header("Location: /configuracoes-relay");
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
<div id="sub-conteudo-pequeno">
<?php
if($_SESSION['status_acao']) {

$status_acao = stripslashes($_SESSION['status_acao']);

echo '<table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="margin-bottom:5px">'.$status_acao.'</table>';

unset($_SESSION['status_acao']);
}
?>
<div id="quadro">
<div id="quadro-topo"><strong>Relay RTMP/M3U8</strong></div>
<div class="texto_medio" id="quadro-conteudo">
  <div class="tab-pane" id="tabPane1">
    <div class="tab-page" id="tabPage2">
       	<h2 class="tab"><?php echo $lang['lang_acao_stm_config']; ?></h2>
        <form method="post" action="/configuracoes-relay" style="padding:0px; margin:0px" onsubmit="abrir_log_sistema();">
  <table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="margin-left:0 auto; margin-right:0 auto; background-color: #C1E0FF; border: #006699 1px solid">
      <tr>
        <td width="30" height="25" align="center" scope="col"><img src="/img/icones/ajuda.gif" width="16" height="16" /></td>
        <td align="left" class="texto_padrao" scope="col">Use esta fun&ccedil;&atilde;o para configurar um relay fixo para seu streaming que ficar&aacute; transmitindo 24 horas por dia.</td>
      </tr>
    </table>
    <table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="background-color:#F4F4F7; border-bottom:#CCCCCC 1px solid; border-left:#CCCCCC 1px solid; border-right:#CCCCCC 1px solid;">
      <tr>
        <td width="150" height="30" align="left" class="texto_padrao_destaque" style="padding-left:5px;">URL RTMP/M3U8</td>
        <td align="left"><input name="relay_url" type="text" class="input" id="relay_url" style="width:95%;" value="<?php echo $dados_stm["relay_url"]; ?>" placeholder="https://" required="required" />&nbsp;<img src="/img/icones/ajuda.gif" title="Ajuda sobre este item." width="16" height="16" onclick="alert('Deve ser rtmp:// OU https://....m3u8');" style="cursor:pointer" /></td>
      </tr>
      <tr>
        <td height="40">&nbsp;</td>
        <td align="left">
          <?php if($dados_stm["relay_status"] == "nao") { ?>
          <input type="submit" class="botao" value="Ativar" />
          <input name="ativar" type="hidden" id="ativar" value="sim" />
          <?php } else { ?>            
          <input type="submit" class="botao" value="Desativar" />
          <input name="desativar" type="hidden" id="desativar" value="sim" />
          <?php } ?>
          </td>
      </tr>
    </table>
    </form>
      </div>
      </div>
</div>
    </div>
</div>
<!-- Início div log do sistema -->
<div id="log-sistema-fundo"></div>
<div id="log-sistema">
<div id="log-sistema-botao"><img src="/img/icones/img-icone-fechar.png" onclick="document.getElementById('log-sistema-fundo').style.display = 'none';document.getElementById('log-sistema').style.display = 'none';" style="cursor:pointer" title="<?php echo $lang['lang_titulo_fechar']; ?>" /></div>
<div id="log-sistema-conteudo"></div>
</div>
<!-- Fim div log do sistema -->
</body>
</html>
