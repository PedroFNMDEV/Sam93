<?php
require_once("admin/inc/protecao-final.php");

$dados_stm = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM streamings where login = '".$_SESSION["login_logado"]."'"));
$dados_servidor = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM servidores where codigo = '".$dados_stm["codigo_servidor"]."'"));
$dados_config = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM configuracoes"));

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
<meta http-equiv="cache-control" content="no-cache">
<link rel="shortcut icon" href="/img/favicon.ico" type="image/x-icon" />
<link href="inc/estilo-streaming.css" rel="stylesheet" type="text/css" />
<script type="text/javascript" src="inc/ajax-streaming.js"></script>
<script type="text/javascript" src="inc/javascript.js"></script>
<script type="text/javascript" src="inc/sorttable.js"></script>
<script type="text/javascript">
   window.onload = function() {
	fechar_log_sistema();
   };
</script>
</head>

<body>
<div id="sub-conteudo-pequeno">
<form action="/utilitario-migrar-videos-processa" method="post">
      <div id="quadro">
            	<div id="quadro-topo"> <strong>Migrar Videos via FTP</strong></div>
   		  <div class="texto_medio" id="quadro-conteudo">
          <table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="margin-bottom:5px; margin-left:0 auto; margin-right:0 auto; background-color: #C1E0FF; border: #006699 1px solid">
            <tr>
              <td width="30" height="25" align="center" scope="col"><img src="img/icones/ajuda.gif" width="16" height="16" /></td>
              <td align="left" class="texto_padrao_destaque" scope="col"><span class="texto_padrao_destaque">Preencha o formulário com os dados de acesso ao FTP a ser migrado.</span></td>
            </tr>
          </table>
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td width="147" height="30" class="texto_padrao_destaque">&nbsp;IP</td>
                <td width="330"><input name="ip_ftp_remoto" type="text" class="input" id="ip_ftp_remoto" style="width:250px;" value="" /></td>
              </tr>
              <tr>
                <td height="30" class="texto_padrao_destaque">&nbsp;Usuário</td>
                <td><input name="usuario_ftp_remoto" type="text" class="input" id="usuario_ftp_remoto" style="width:250px;" value="" /></td>
              </tr>
              <tr>
                <td height="30" class="texto_padrao_destaque">&nbsp;Senha</td>
                <td><input name="senha_ftp_remoto" type="text" class="input" id="senha_ftp_remoto" style="width:250px;" value="" /></td>
              </tr>
              <tr>
                <td height="40" class="texto_padrao_destaque">&nbsp;</td>
                <td><input type="submit" class="botao" value="Migrar" /></td>
              </tr>
            </table>
   		  </div>
      </div>
  </form>
  <br />
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