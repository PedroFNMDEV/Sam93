<?php
$login = query_string('1');
$player = query_string('2');
$servidor = code_decode(query_string('5'),"D");
$aspectratio = query_string('6');
$capa_vodthumb = code_decode(query_string('7'),"D");
$vod = code_decode(query_string('8'),"D");
$ativar_contador = (query_string('8') == "sim") ? "sim" : "nao";
$ativar_compartilhamento = (query_string('9') == "sim") ? "sim" : "nao";

$verifica_stm = mysqli_num_rows(mysqli_query($conexao,"SELECT * FROM streamings where login = '".$login."'"));

if($verifica_stm == 0) {
  die ("Error! Missing data.");
}

$dados_config = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM configuracoes"));
$dados_stm = mysqli_fetch_array(mysqli_query($conexao,"SELECT * FROM streamings where login = '".$login."'"));
$dados_servidor = @mysqli_fetch_array(@mysqli_query($conexao,"SELECT * FROM servidores where codigo = '".$dados_stm["codigo_servidor"]."'"));

if($dados_servidor["nome_principal"]) {
$servidor = $dados_servidor["nome_principal"].".".$dados_config["dominio_padrao"];
} else {
$servidor = $dados_servidor["nome"].".".$dados_config["dominio_padrao"];
}

if(!empty($vod)) {
$url_source = "https://".$servidor."/".$login."/".$login."/mp4:".$vod."/playlist.m3u8";
$sources_transcoder_FWDUVPlayer = "{source:'https://".$servidor."/".$login."/".$login."/mp4:".$vod."/playlist.m3u8', label:'HD'}";
} elseif($dados_stm["transcoder"] == "sim" && $dados_stm["transcoder_instalado"] == "sim") {
$url_source = "https://".$servidor."/".$login."/smil:transcoder.smil/playlist.m3u8";

$array_qualidades = explode("|",$dados_stm["transcoder_qualidades"]);
$sources_transcoder = array();

foreach($array_qualidades as $qualidade) {
$sources_transcoder[$qualidade] = "https://".$servidor."/".$login."/mp4:".$login."_".$qualidade."/playlist.m3u8";
$sources_transcoder_FWDUVPlayer .= "{source:'https://".$servidor."/".$login."/mp4:".$login."_".$qualidade."/playlist.m3u8', label:'".$qualidade."'},";
}
$sources_transcoder_FWDUVPlayer = substr($sources_transcoder_FWDUVPlayer, 0, -1);

} else {
$url_source = "https://".$servidor."/".$login."/".$login."/playlist.m3u8";
$sources_transcoder_FWDUVPlayer = "{source:'https://".$servidor."/".$login."/".$login."/playlist.m3u8', label:'HD'}";
}

// Verifica se streaming esta funcionando, se nao estiver exibe aviso de sem sinal
$file_headers = @get_headers($url_source);
if($file_headers[0] == 'HTTP/1.0 404 Not Found') {
die('<!DOCTYPE HTML><html><head><title>Sem sinal | No signal</title><style>body {background-image:url("/img/nosignal.gif");background-repeat: no-repeat;background-size: 100% 100%;}html {height: 100%}</style></head><body><script>setTimeout(function() { location.reload(); }, 10000);</script></body></html>');
}

switch ($dados_stm['watermark_posicao']) {
  case 'left,top':
  $ypos = '0';
  $xpos = '0';
  $clappr_watermark ='top-left';
  $fluidPlayer_watermark ='top left';
  $FWDUVPlayer_watermark ='topLeft';
  $watermark_pos_geral = 'top: 10px; left: 10px';
  break;
  case 'right,top':
  $ypos = '0';
  $xpos = '100';
  $clappr_watermark ='top-right';
  $fluidPlayer_watermark ='top right';
  $FWDUVPlayer_watermark ='topRight';
  $watermark_pos_geral = 'top: 10px; right: 10px';
  break;
  case 'left,bottom':
  $ypos = '100';
  $xpos = '0';
  $clappr_watermark ='bottom-left';
  $fluidPlayer_watermark ='bottom left';
  $FWDUVPlayer_watermark ='bottomLeft';
  $watermark_pos_geral = 'bottom: 10px; left: 10px';
  break;
  case 'right,bottom':
  $ypos = '100';
  $xpos = '100';
  $clappr_watermark ='bottom-right';
  $fluidPlayer_watermark ='bottom right';
  $FWDUVPlayer_watermark ='bottomRight';
  $watermark_pos_geral = 'bottom: 10px; right: 10px';
  break; 
  default:
  $ypos = '0';
  $xpos = '0';
  $clappr_watermark ='';
  $fluidPlayer_watermark ='';
  $FWDUVPlayer_watermark ='';
  $watermark_pos_geral = '';
  break;
}
?>

<?php if($player == 1) { ?>
<?php $autoplay = (query_string('3') == "true") ? "autoplay" : "";  ?>
<?php $mudo = (query_string('4') == "true") ? "muted" : "";  ?>
<?php $loop = (query_string('9') == "true") ? "loop" : "";  ?>
<!DOCTYPE html>
    <html lang="es">
    <head>
      <title>Player</title>
<meta name=apple-touch-fullscreen content=yes>
<meta name=apple-mobile-web-app-capable content=yes>
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
<link href="//vjs.zencdn.net/7.8.4/video-js.css" rel="stylesheet">
<script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
<style>*{margin:0}body,html{height:100%}.video-js{height:100%!important}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.video-js .vjs-time-control{display:none}.video-js .vjs-progress-control{display:none}.video-js .vjs-menu-button-inline.vjs-slider-active,.video-js .vjs-menu-button-inline:focus,.video-js .vjs-menu-button-inline:hover,.video-js.vjs-no-flex .vjs-menu-button-inline{width:10em}.video-js .vjs-controls-disabled .vjs-big-play-button{z-index: 999999999;display:none!important}.video-js .vjs-control{width:3em}.video-js .vjs-menu-button-inline:before{width:1.5em}.vjs-menu-button-inline .vjs-menu{left:3em}.video-js.vjs-ended .vjs-big-play-button,.video-js.vjs-paused .vjs-big-play-button,.vjs-paused.vjs-has-started.video-js .vjs-big-play-button{display:block}.video-js .vjs-load-progress div,.vjs-seeking .vjs-big-play-button,.vjs-waiting .vjs-big-play-button{display:none!important}.video-js .vjs-mouse-display:after,.video-js .vjs-play-progress:after{padding:0 .4em .3em}.video-js.vjs-ended .vjs-loading-spinner{display:none}.video-js.vjs-ended .vjs-big-play-button{display:block!important}.video-js.vjs-paused .vjs-big-play-button,.vjs-paused.vjs-has-started.video-js .vjs-big-play-button,video-js.vjs-ended .vjs-big-play-button{display:block}.video-js .vjs-big-play-button{top:50%;left:50%;margin-left:-1.5em;margin-top:-1em}.video-js .vjs-big-play-button{background-color:rgba(14,34,61,.7);font-size:3.5em;border-radius:12%;height:1.4em!important;line-height:1.4em!important;margin-top:-.7em!important;z-index: 999999999;}.video-js .vjs-big-play-button:active,.video-js .vjs-big-play-button:focus,.video-js:hover .vjs-big-play-button{background-color:#0e223d}.video-js .vjs-loading-spinner{border-color:rgba(14,34,61,.84)}.video-js .vjs-control-bar2{background-color:#0e223d}.video-js .vjs-control-bar{background-color:#0e223d!important;color:#fff;font-size:14px;z-index: 999999999;}.video-js .vjs-play-progress,.video-js .vjs-volume-level{background-color:rgba(14,34,61,.8)}.vjs-watermark{position:absolute;display:inline;z-index:2000;bottom: 0px;}.vjs-watermark img{width: 50%; height: auto;}.video-js .logo-control-bar {width: 100px;background: url(https://playervideo.zcastbr.com/img/img-logo-control-bar.png) center center no-repeat;}.vjs-live-display{display: none!important;}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}</style>
</head>
<body>
<?php if($ativar_contador == "sim") { ?><div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div><?php } ?>
<?php if($ativar_compartilhamento == "sim") { ?><nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado"> <div class="circle-nav-toggle"><i class="fa fa-plus" style="color: #FFFFFF"></i></div><div class="circle-nav-panel"></div><ul class="circle-nav-menu"> <a href="https://facebook.com/sharer/sharer.php?u=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li></a> <a href="https://twitter.com/share?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li></a> <a href="https://pinterest.com/pin/create/bookmarklet/?&url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-pinterest fa-2x"></i></li></a> <a href="tg://msg_url?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-4"><i class="fa fa-telegram fa-2x"></i></li></a> <a href="whatsapp://send?text=WebTV https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-5"><i class="fa fa-whatsapp fa-2x"></i></li></a> </ul> </nav><?php } ?>
<video id="player_webtv" crossorigin="anonymous" class="video-js vjs-fluid vjs-default-skin" <?php echo $autoplay; ?> <?php echo $mudo; ?> <?php echo $loop; ?> poster="<?php echo $capa_vodthumb; ?>" controls preload="none" width="100%" height="100%" data-setup="{ 'fluid':true,'aspectRatio':'<?php echo $aspectratio; ?>' }" >
   <source src="<?php echo $url_source; ?>" type="application/x-mpegURL">
</video>
<script src="//vjs.zencdn.net/7.8.4/video.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/videojs-contrib-hls/5.12.0/videojs-contrib-hls.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/videojs-contrib-quality-levels/2.0.9/videojs-contrib-quality-levels.min.js"></script>
<script src="//www.unpkg.com/videojs-hls-quality-selector@1.0.5/dist/videojs-hls-quality-selector.min.js"></script>
<script>  !function(){var e,t={file:"watermark.png",xpos:0,ypos:0,xrepeat:0,opacity:100,clickable:!1,url:"",className:"vjs-watermark",text:!1,debug:!1},o=function(){var e,t,l,a,i;for(l in t=(e=Array.prototype.slice.call(arguments)).shift()||{},e)for(i in a=e[l])a.hasOwnProperty(i)&&("object"==typeof a[i]?t[i]=o(t[i],a[i]):t[i]=a[i]);return t};videojs.plugin("watermark",function(l){var a,i,s,r,p;l.debug&&console.log("watermark: Register init"),a=o(t,l),i=this.el(),s=this.el().getElementsByTagName("video")[0],e?e.innerHTML="":(e=document.createElement("div")).className=a.className,a.text&&(e.textContent=a.text),a.file&&(r=document.createElement("img"),e.appendChild(r),r.src=a.file),0===a.ypos&&0===a.xpos?(e.style.top="0",e.style.left="0"):0===a.ypos&&100===a.xpos?(e.style.top="0",e.style.right="0"):100===a.ypos&&100===a.xpos?(e.style.bottom="45",e.style.right="0"):100===a.ypos&&0===a.xpos?(e.style.bottom="45",e.style.left="0"):50===a.ypos&&50===a.xpos&&(a.debug&&console.log("watermark: player:"+i.width+"x"+i.height),a.debug&&console.log("watermark: video:"+s.videoWidth+"x"+s.videoHeight),a.debug&&console.log("watermark: image:"+r.width+"x"+r.height),e.style.top=this.height()/2+"px",e.style.left=this.width()/2+"px"),e.style.opacity=a.opacity,a.clickable&&""!==a.url?((p=document.createElement("a")).href=a.url,p.target="_blank",p.appendChild(e),i.appendChild(p)):i.appendChild(e),a.debug&&console.log("watermark: Register end")})}();var myPlayer=videojs('player_webtv',{html5:{hls:{overrideNative: true}}},function(){var player=this;player.hlsQualitySelector({ displayCurrentQuality: true});<?php if($dados_stm["watermark_posicao"]) { ?>player.watermark({
        file: 'https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>',
        ypos: <?php echo $ypos;?>,
        xpos: <?php echo $xpos;?>,
        opacity: 0.5
      });<?php } ?>player.on("pause",function(){player.one("play",function(){player.load();player.play();});});})
//videojs('player_webtv').ready(function() {
//    var logo_control_bar = this.controlBar.addChild('Component', {}, 2);
//    logo_control_bar.addClass("logo-control-bar");
//  });
</script>
<script type="text/javascript" charset="utf-8">
function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}
contador();
setInterval (contador,30000);
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
</script>
</body>
</html>
<?php } elseif($player == 2) { ?>
<!DOCTYPE html>
    <html lang="es">
    <head>
      <title>Player</title>
<meta name=apple-touch-fullscreen content=yes>
<meta name=apple-mobile-web-app-capable content=yes>
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
  <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
  <script type="text/javascript" charset="utf-8" src="//cdn.jsdelivr.net/npm/clappr@latest/dist/clappr.min.js"></script>
  <script type="text/javascript" charset="utf-8" src="//cdn.jsdelivr.net/gh/clappr/clappr-level-selector-plugin@latest/dist/level-selector.min.js"></script>
  <script type="text/javascript" src="//cdn.jsdelivr.net/npm/clappr-capture-plugin@latest/dist/clappr-capture-plugin.js"></script>
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
  <title>Player</title>
<style>*{margin:0;}html,body{height:100%; background-color:#000000}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.live-info:before{display: none!important;}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}</style>
</head>
<body>
<?php if($ativar_contador == "sim") { ?><div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div><?php } ?>
<?php if($ativar_compartilhamento == "sim") { ?><nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado"> <div class="circle-nav-toggle"><i class="fa fa-plus" style="color: #FFFFFF"></i></div><div class="circle-nav-panel"></div><ul class="circle-nav-menu"> <a href="https://facebook.com/sharer/sharer.php?u=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li></a> <a href="https://twitter.com/share?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li></a> <a href="https://pinterest.com/pin/create/bookmarklet/?&url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-pinterest fa-2x"></i></li></a> <a href="tg://msg_url?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-4"><i class="fa fa-telegram fa-2x"></i></li></a> <a href="whatsapp://send?text=WebTV https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-5"><i class="fa fa-whatsapp fa-2x"></i></li></a> </ul> </nav><?php } ?>
<div  class="container-fluid">
    <div class="row">
      <?php if($aspectratio == "16:9") { ?>
        <div class="embed-responsive embed-responsive-16by9">
        <?php } ?>
      <?php if($aspectratio == "4:3") { ?>
        <div class="embed-responsive embed-responsive-4by3">
        <?php } ?>
        <div id="player_webtv" class="embed-responsive-item"></div>
        </div>
</div>
</div>
<script type="text/javascript" charset="utf-8">
function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}

  window.onload = function() {
  var player = new Clappr.Player({
    <?php if($dados_stm["transcoder_instalado"] == "sim") { ?>
    plugins: [LevelSelector],
    levelSelectorConfig: {labelCallback: function(playbackLevel, customLabel) {return playbackLevel.level.height+'p';}},
    <?php } ?>
    source: '<?php echo $url_source; ?>',
    parentId: '#player_webtv',
  width: '100%',
    height: '100%',
    mute: <?php echo query_string('4'); ?>,
    hideMediaControl: true,
    poster: '<?php echo $capa_vodthumb; ?>',
  loop: '<?php echo query_string('9'); ?> ',
  <?php if($dados_stm["watermark_posicao"]) { ?>
    position: '<?php echo $clappr_watermark; ?>',
    watermark: 'https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>',
  <?php } ?>
  autoPlay: <?php echo query_string('3'); ?>
  //events: {
  //  onPlay:  function() {$('.live-info').html('<img width="auto" height="30" src="https://playervideo.zcastbr.com/img/img-logo-control-bar.png" />')}
  //}
  });
  contador();
  setInterval (contador,30000);
  //setTimeout(function() {$('.live-info').html('<img width="auto" height="30" src="https://playervideo.zcastbr.com/img/img-logo-control-bar.png" />')}, 5000);
}
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
  </script>
</body>
</html>
<?php } elseif($player == 3) { ?>
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <title>Player</title>
<meta name=apple-touch-fullscreen content=yes>
<meta name=apple-mobile-web-app-capable content=yes>
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
  <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
  <script type="text/javascript" charset="utf-8" src="//cdn.jsdelivr.net/npm/clappr@latest/dist/clappr.min.js"></script>
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
      <script src="https://content.jwplatform.com/libraries/5PLwmcI5.js"></script>
      <style>body{margin:0;overflow:hidden;background:#000}.jwplayer{position:inherit!important;}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.jw-text-live::before{display: none!important;}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}</style>
    </head>
    <body>
<?php if($ativar_contador == "sim") { ?><div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div><?php } ?>
<?php if($ativar_compartilhamento == "sim") { ?><nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado"> <div class="circle-nav-toggle"><i class="fa fa-plus" style="color: #FFFFFF"></i></div><div class="circle-nav-panel"></div><ul class="circle-nav-menu"> <a href="https://facebook.com/sharer/sharer.php?u=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li></a> <a href="https://twitter.com/share?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li></a> <a href="https://pinterest.com/pin/create/bookmarklet/?&url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-pinterest fa-2x"></i></li></a> <a href="tg://msg_url?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-4"><i class="fa fa-telegram fa-2x"></i></li></a> <a href="whatsapp://send?text=WebTV https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-5"><i class="fa fa-whatsapp fa-2x"></i></li></a> </ul> </nav><?php } ?>
      <div id="video_main"></div>
      <script>
        var player = jwplayer("video_main");
        player.setup({
          aspectratio: '<?php echo $aspectratio; ?>',
          width: '100%',
          height: '100%',
          displaytitle: false,
          displaydescription: false,
          mute: <?php echo query_string('4'); ?>,
          autostart: <?php echo query_string('3'); ?>,
          repeat: '<?php echo query_string('9'); ?>',
          image: '<?php echo $capa_vodthumb; ?>',
  <?php if($dados_stm["watermark_posicao"]) { ?>
          logo: {
            file: 'https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>', 
            link: '',
            position: '<?php echo $clappr_watermark; ?>'
          },
  <?php } ?>
          sources: [{"file":"<?php echo $url_source; ?>"}]
        });
function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}
contador();
setInterval (contador,30000);
//setTimeout(function() {$('.jw-icon.jw-icon-inline.jw-button-color.jw-reset.jw-text-live').html('<img width="auto" height="30" src="https://playervideo.zcastbr.com/img/img-logo-control-bar.png" />')}, 2000);
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
</script>
    </body>
    </html>
<?php } elseif($player == 4) { ?>
<html>
<head>
<meta name=apple-touch-fullscreen content=yes>
<meta name=apple-mobile-web-app-capable content=yes>
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
  <link rel="stylesheet" href="https://cdn.fluidplayer.com/v2/current/fluidplayer.min.css" type="text/css" />
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
    <script src="https://cdn.fluidplayer.com/v2/current/fluidplayer.min.js"></script>
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
  <style type="text/css">
    #apDiv1{position:absolute;width:88px;height:38px;z-index:1;left:0px;top:19px}body,html{overflow:hidden;width:100%;height:100%;margin:0;padding:0}body{text-align:center;margin-top:0px;margin-right:auto;margin-bottom:0px;margin-left:auto}#player_webtv_fluid_control_duration {display:none!important;}#player_webtv_fluid_controls_progress_container {display:none!important;}#player_webtv_fluid_control_theatre {display:none!important;}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}#player_webtv_logo_image{width: 10%; height: auto;}@media all and (min-width:0px) and (max-width: 600px) {#player_webtv_logo_image{width: 22%; height: auto;}}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}
  </style>
</head>

<body>
<?php if($ativar_contador == "sim") { ?><div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div><?php } ?>
<?php if($ativar_compartilhamento == "sim") { ?><nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado"> <div class="circle-nav-toggle"><i class="fa fa-plus" style="color: #FFFFFF"></i></div><div class="circle-nav-panel"></div><ul class="circle-nav-menu"> <a href="https://facebook.com/sharer/sharer.php?u=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li></a> <a href="https://twitter.com/share?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li></a> <a href="https://pinterest.com/pin/create/bookmarklet/?&url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-pinterest fa-2x"></i></li></a> <a href="tg://msg_url?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-4"><i class="fa fa-telegram fa-2x"></i></li></a> <a href="whatsapp://send?text=WebTV https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-5"><i class="fa fa-whatsapp fa-2x"></i></li></a> </ul> </nav><?php } ?>
  <video id='player_webtv'>
    <source src='<?php echo $url_source; ?>' type='application/x-mpegURL' />
  </video>
  <script>
  function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}
    fluidPlayer('player_webtv',{layoutControls:{fillToContainer:true,primaryColor:"#99cc33",autoPlay:true,playPauseAnimation:true<?php if($dados_stm["watermark_posicao"]) { ?>,logo: {imageUrl: 'https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>', position: '<?php echo $fluidPlayer_watermark; ?>', opacity: .3}<?php } ?>}});
    //setTimeout(function(){ $('.fluid_controls_right').prepend('<img width="auto" height="30" src="https://playervideo.zcastbr.com/img/img-logo-control-bar.png" style="left: 100px;position: absolute;">')}, 2000);
    contador();
    setInterval (contador,30000);
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
  </script>
</body>
</html>
<?php } elseif($player == 5) { ?>
<?php $loop = (query_string('9') == "true") ? "yes" : "no";  ?>
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <title>Player</title>
<meta name=apple-touch-fullscreen content=yes>
<meta name=apple-mobile-web-app-capable content=yes>
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
<link rel="stylesheet" type="text/css" href="/player5/content/global.css">
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
<script type="text/javascript" src="/player5/java/FWDUVPlayer.js"></script>
<script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
<style type="text/css">body,html{ background-color: #000000; overflow:hidden;width:100%;height:100%;margin:0;padding:0}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}</style>
</head>

<body>

<script type="text/javascript">
      FWDUVPUtils.onReady(function(){
        
        new FWDUVPlayer({   
          //main settings
          instanceName:"player1",
          parentId:"player_webtv",
          playlistsId:"playlists",
          mainFolderPath:"/player5/content",
          skinPath:"skin",
          displayType:"fullscreen",
          initializeOnlyWhenVisible:"no",
          useVectorIcons:"no",
          fillEntireVideoScreen:"no",
          fillEntireposterScreen:"yes",
          goFullScreenOnButtonPlay:"no",
          playsinline:"yes",
          privateVideoPassword:"428c841430ea18a70f7b06525d4b748a",
          youtubeAPIKey:"",
          useHEXColorsForSkin:"no",
          normalHEXButtonsColor:"#666666",
          useDeepLinking:"yes",
          googleAnalyticsTrackingCode:"",
          useResumeOnPlay:"no",
          showPreloader:"yes",
          preloaderBackgroundColor:"#000000",
          preloaderFillColor:"#FFFFFF",
          addKeyboardSupport:"yes",
          autoScale:"yes",
          showButtonsToolTip:"yes", 
          stopVideoWhenPlayComplete:"no",
          playAfterVideoStop:"no",
          autoPlay:"yes",
          autoPlayText:"Click aqu&iacute; para activar sonido",
          loop:"<?php echo $loop; ?>",
          shuffle:"no",
          showErrorInfo:"yes",
          maxWidth:"none",
          maxHeight:"none",
          buttonsToolTipHideDelay:1.5,
          volume:1,
          rewindTime:10,
          backgroundColor:"#000000",
          videoBackgroundColor:"#000000",
          posterBackgroundColor:"#000000",
          buttonsToolTipFontColor:"#5a5a5a",
          //logo settings
          <?php if($dados_stm["watermark_posicao"]) { ?>
          showLogo:"yes",
          logoPath:"https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>&",
          hideLogoWithController:"no",
          logoPosition:"<?php echo $FWDUVPlayer_watermark; ?>",
          logoLink:"",
          logoMargins:10,
          <?php } else { ?>
          showLogo:"no",
          <?php } ?>
          //playlists/categories settings
          showPlaylistsSearchInput:"no",
          usePlaylistsSelectBox:"no",
          showPlaylistsButtonAndPlaylists:"no",
          showPlaylistsByDefault:"no",
          thumbnailSelectedType:"opacity",
          startAtPlaylist:0,
          buttonsMargins:15,
          thumbnailMaxWidth:350, 
          thumbnailMaxHeight:350,
          horizontalSpaceBetweenThumbnails:40,
          verticalSpaceBetweenThumbnails:40,
          inputBackgroundColor:"#333333",
          inputColor:"#999999",
          //playlist settings
          showPlaylistButtonAndPlaylist:"no",
          playlistPosition:"right",
          showPlaylistByDefault:"no",
          showPlaylistName:"no",
          showSearchInput:"no",
          showLoopButton:"no",
          showShuffleButton:"yes",
          showPlaylistOnFullScreen:"no",
          showNextAndPrevButtons:"no",
          showThumbnail:"yes",
          showOnlyThumbnail:"no",
          forceDisableDownloadButtonForFolder:"yes",
          addMouseWheelSupport:"yes", 
          startAtRandomVideo:"no",
          stopAfterLastVideoHasPlayed:"no",
          addScrollOnMouseMove:"no",
          randomizePlaylist:'no',
          folderVideoLabel:"VIDEO ",
          playlistRightWidth:310,
          playlistBottomHeight:380,
          startAtVideo:0,
          maxPlaylistItems:50,
          thumbnailWidth:71,
          thumbnailHeight:71,
          spaceBetweenControllerAndPlaylist:1,
          spaceBetweenThumbnails:1,
          scrollbarOffestWidth:8,
          scollbarSpeedSensitivity:.5,
          playlistBackgroundColor:"#000000",
          playlistNameColor:"#FFFFFF",
          thumbnailNormalBackgroundColor:"#1b1b1b",
          thumbnailHoverBackgroundColor:"#313131",
          thumbnailDisabledBackgroundColor:"#272727",
          searchInputBackgroundColor:"#000000",
          searchInputColor:"#999999",
          youtubeAndFolderVideoTitleColor:"#FFFFFF",
          folderAudioSecondTitleColor:"#999999",
          youtubeOwnerColor:"#888888",
          youtubeDescriptionColor:"#888888",
          mainSelectorBackgroundSelectedColor:"#FFFFFF",
          mainSelectorTextNormalColor:"#FFFFFF",
          mainSelectorTextSelectedColor:"#000000",
          mainButtonBackgroundNormalColor:"#212021",
          mainButtonBackgroundSelectedColor:"#FFFFFF",
          mainButtonTextNormalColor:"#FFFFFF",
          mainButtonTextSelectedColor:"#000000",
          //controller settings
          showController:"yes",
          showControllerWhenVideoIsStopped:"yes",
          showNextAndPrevButtonsInController:"no",
          showRewindButton:"no",
          showPlaybackRateButton:"no",
          showVolumeButton:"yes",
          showTime:"no",
          showQualityButton:"yes",
          showInfoButton:"yes",
          showDownloadButton:"no",
          showShareButton:"no",
          showEmbedButton:"no",
          showChromecastButton:"yes",
          showFullScreenButton:"yes",
          disableVideoScrubber:"yes",
          showScrubberWhenControllerIsHidden:"no",
          showMainScrubberToolTipLabel:"no",
          showDefaultControllerForVimeo:"yes",
          repeatBackground:"yes",
          controllerHeight:42,
          controllerHideDelay:3,
          startSpaceBetweenButtons:7,
          spaceBetweenButtons:8,
          scrubbersOffsetWidth:2,
          mainScrubberOffestTop:14,
          timeOffsetLeftWidth:5,
          timeOffsetRightWidth:3,
          timeOffsetTop:0,
          volumeScrubberHeight:80,
          volumeScrubberOfsetHeight:12,
          timeColor:"#888888",
          youtubeQualityButtonNormalColor:"#888888",
          youtubeQualityButtonSelectedColor:"#FFFFFF",
          scrubbersToolTipLabelBackgroundColor:"#000000",
          scrubbersToolTipLabelFontColor:"#5a5a5a",
          //advertisement on pause window
          aopwTitle:"Advertisement",
          aopwWidth:400,
          aopwHeight:240,
          aopwBorderSize:6,
          aopwTitleColor:"#FFFFFF",
          //subtitle
          subtitlesOffLabel:"Subtitle off",
          //popup add windows
          showPopupAdsCloseButton:"yes",
          //embed window and info window
          embedAndInfoWindowCloseButtonMargins:15,
          borderColor:"#333333",
          mainLabelsColor:"#FFFFFF",
          secondaryLabelsColor:"#a1a1a1",
          shareAndEmbedTextColor:"#5a5a5a",
          inputBackgroundColor:"#000000",
          inputColor:"#FFFFFF",
          //login
                playIfLoggedIn:"no",
                playIfLoggedInMessage:"",
          //audio visualizer
          audioVisualizerLinesColor:"#0099FF",
          audioVisualizerCircleColor:"#FFFFFF",
          //lightbox settings
          closeLightBoxWhenPlayComplete:"no",
          lightBoxBackgroundOpacity:.6,
          lightBoxBackgroundColor:"#000000",
          //sticky on scroll
          stickyOnScroll:"no",
          stickyOnScrollShowOpener:"yes",
          stickyOnScrollWidth:"700",
          stickyOnScrollHeight:"394",
          //sticky display settings
          showOpener:"yes",
          showOpenerPlayPauseButton:"yes",
          verticalPosition:"bottom",
          horizontalPosition:"center",
          showPlayerByDefault:"yes",
          animatePlayer:"yes",
          openerAlignment:"right",
          mainBackgroundImagePath:"/player5/img-color-bars.jpg",
          openerEqulizerOffsetTop:-1,
          openerEqulizerOffsetLeft:3,
          offsetX:0,
          offsetY:0,
          //playback rate / speed
          defaultPlaybackRate:1, //0.25, 0.5, 1, 1.25, 1.2, 2
          //cuepoints
          executeCuepointsOnlyOnce:"no",
          //annotations
          showAnnotationsPositionTool:"no",
          //ads
          openNewPageAtTheEndOfTheAds:"no",
          playAdsOnlyOnce:"no",
          adsButtonsPosition:"left",
          skipToVideoText:"You can skip to video in: ",
          skipToVideoButtonText:"Skip Ad",
          adsTextNormalColor:"#888888",
          adsTextSelectedColor:"#FFFFFF",
          adsBorderNormalColor:"#666666",
          adsBorderSelectedColor:"#FFFFFF",
          //a to b loop
          useAToB:"yes",
          atbTimeBackgroundColor:"transparent",
          atbTimeTextColorNormal:"#888888",
          atbTimeTextColorSelected:"#FFFFFF",
          atbButtonTextNormalColor:"#888888",
          atbButtonTextSelectedColor:"#FFFFFF",
          atbButtonBackgroundNormalColor:"#FFFFFF",
          atbButtonBackgroundSelectedColor:"#000000",
          //thumbnails preview
          thumbnailsPreviewWidth:196,
          thumbnailsPreviewHeight:110,
          thumbnailsPreviewBackgroundColor:"#000000",
          thumbnailsPreviewBorderColor:"#666",
          thumbnailsPreviewLabelBackgroundColor:"#666",
          thumbnailsPreviewLabelFontColor:"#FFF",
          // context menu
          showContextmenu:'no',
          showScriptDeveloper:"no",
          contextMenuBackgroundColor:"#1f1f1f",
          contextMenuBorderColor:"#1f1f1f",
          contextMenuSpacerColor:"#333",
          contextMenuItemNormalColor:"#888888",
          contextMenuItemSelectedColor:"#FFFFFF",
          contextMenuItemDisabledColor:"#444"
        });
      });
$(document).ready(function () { 
  setTimeout(function(){
  <?php if($ativar_contador == "sim") { ?>$('.fwduvp').append('<div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div>');contador();<?php } ?>
  $(".fwduvp").css("z-index", 'initial');
  $('img[src*=youtube-quality]').each(function(i){
    $(this).attr('title','Streaming Cualidades/Qualities');
  }); 
},3000);
setInterval (contador,30000);
});
  function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
    </script>
<div id="player_webtv"></div><ul id="playlists" style="display:none;"><li data-source="playlist1" data-playlist-name="TV DEMO" data-thumbnail-path=""></li></ul><ul id="playlist1" style="display:none;"><li data-thumb-source="" data-video-source="[<?php echo $sources_transcoder_FWDUVPlayer;?>]" data-start-at-video="0" data-poster-source="<?php echo $capa_vodthumb; ?>"></li></ul>
</body>
</html>
<?php } elseif($player == 6) { ?>
<?php $loop = (query_string('9') == "true") ? "yes" : "no";  ?>
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <title>Player</title>
    <meta name=apple-touch-fullscreen content=yes>
    <meta name=apple-mobile-web-app-capable content=yes>
    <meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
    <meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
    <script type="text/javascript" src="/prontusPlayer.min.js"></script>
    <style type="text/css">body{ background-color: #000000; overflow:hidden;margin:0;padding:0}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.prontusPlayer-ads{width:100%;height:100%;position:absolute;top:0}.prontusPlayer-adInfoContent{position:absolute;background-color:#000;color:white;height:30px;opacity:.75;filter:alpha(opacity=50);width:100%;display:none;top:0}.prontusPlayerVideoPlayer{width:100%;height:100%;vertical-align:middle}.prontusPlayer-closeAds{display:block;position:absolute;z-index:100;left:-10px;top:-10px}.prontusPlayerContent{position:relative;width:100%;height:100%;border:0;margin:0;padding:0}.prontusPlayArea{position:absolute;left:0;top:0;width:100%;height:100%;border:0;margin:0;padding:0;cursor:default;opacity:0}
.prontusPlayArea.no-image{background:#FFF;filter:alpha(opacity=15);opacity:.15}.prontusPlayArea.image{background:50% 50% no-repeat;opacity:1}.prontusPlayer-playIcon{border-top:15px solid transparent;border-left:30px solid white;border-bottom:15px solid transparent;position:relative;top:15px;left:50px}.prontusPlayer{width:100%;height:100%;background:#000;position:relative;overflow:hidden}.prontusPlayer .prontusPlayer-main-button a:hover{opacity:.5;transition:all .2s linear}.prontusPlayer .prontusPlayer-main-button .loading{margin:auto;left:0;top:0}
.prontusPlayer .prontusPlayer-main-button{bottom:0;height:90px;left:0;margin:auto;opacity:.9;overflow:hidden;position:absolute;right:0;text-align:center;top:0;width:90px}.prontusPlayer .prontusPlayer-main-button-replay{background:#000 none repeat scroll 0 0;border-radius:3px;bottom:0;height:90px;left:0;margin:auto;opacity:.9;overflow:hidden;position:absolute;right:0;text-align:center;top:0;width:90px;-webkit-border-radius:10px;-moz-border-radius:10px;border-radius:10px}.prontusPlayer .prontusPlayer-main-button img{cursor:pointer;display:inline-block;opacity:1;text-align:center}
.prontusPlayer-thumbnails{position:absolute;bottom:50px;width:120px;height:88px;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;overflow:hidden;opacity:1;filter:alpha(opacity=70);background:#327ba6}.prontusPlayer-thumbnails canvas{text-align:center;top:0;left:0;width:120px;height:68px;display:inline-block;background:#fff}.prontusPlayer .video-screen{width:100%;height:auto}.prontusPlayer .video-screen img{width:100%;height:auto;display:block}.prontusPlayer .video-screen a{text-align:center}
.prontusPlayer .dateThumb{font-family:open_sans_lightregular,Arial,Helvetica,sans-serif;font-size:13px;line-height:100%;color:#FFF;display:block;margin:0 auto;text-align:center}.prontusPlayer .date{font-family:open_sans_lightregular,Arial,Helvetica,sans-serif;font-size:14px;line-height:100%;color:#FFF;position:relative;top:12px;left:160px}.prontusPlayer .live{font-family:open_sans_lightregular,Arial,Helvetica,sans-serif;font-size:14px;line-height:100%;color:#FFF;position:relative;top:12px;left:160px;display:none!important}
.prontusPlayer .live:after{content:''}.prontusPlayer-thumbIndicator{z-index:200;position:absolute;bottom:46px;width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:5px solid #327ba6}.prontusPlayer .share-layer{width:100%;height:100%;background:rgba(00,00,00,.7);position:absolute;top:0;left:0;z-index:100}.prontusPlayer .share-layer .auxi-box{position:absolute;top:35%;left:0;right:0;width:100%}.prontusPlayer .share-layer .social-box{margin:0 auto;width:40%;max-width:400px;min-width:320px;overflow:hidden;height:auto;position:initial;border:1px solid #000}
.prontusPlayer .share-layer .social-box .social-item span{font-weight:bold}.prontusPlayer .share-layer .social-box .social-item{cursor:default;clear:both;display:block;color:#FFF;margin:10px 0 10px;overflow:hidden}.prontusPlayer .share-layer .social-box .social-item label{float:left;color:white;width:8%;margin:6px 4% 0 0;font-size:14px}.prontusPlayer .share-layer .social-box .social-item input{float:right;width:65%;padding:7px 5px 7px 10px}.prontusPlayer .share-layer .social-box .social-item .copy{float:right;width:10%;padding:8px 10px 7px 5px}
.prontusPlayer .share-layer .social-box .social-item form{width:100%}.prontusPlayer .close-box{cursor:pointer;position:absolute;top:3%;right:1%;padding:10px;background:rgba(00,00,00,.7);height:20px;-webkit-border-radius:5px;-moz-border-radius:5px;border-radius:5px;-webkit-transition:all .3s linear;-moz-transition:all .3s linear;-o-transition:all .3s linear;-ms-transition:all .3s linear;transition:all .3s linear}.prontusPlayer .close-box a{-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}
.prontusPlayer .close-box a:hover{opacity:.5;filter:alpha(opacity=50);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer .share-box{cursor:pointer;position:absolute;top:2%;right:1%;padding:5px;background:rgba(00,00,00,.7);height:29px;-webkit-border-radius:5px;-moz-border-radius:5px;border-radius:5px;-webkit-transition:all .3s linear;-moz-transition:all .3s linear;-o-transition:all .3s linear;-ms-transition:all .3s linear;transition:all .3s linear}
.prontusPlayer .share-box a{opacity:.9;-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer .share-box a:hover{opacity:.5;filter:alpha(opacity=50);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer .social-box{position:absolute;top:3%;left:2%;width:90%;padding:10px;background:rgba(48,48,48,.7);height:20px;max-width:290px;min-width:280px;-webkit-border-radius:5px;-moz-border-radius:5px;border-radius:5px}
.prontusPlayer .social-box .fb-ico{cursor:pointer;float:left;margin:0 8px 0 0}.prontusPlayer .social-box .tw-ico{cursor:pointer;float:left;margin:0 8px 0 0}.prontusPlayer .social-box .gp-ico{cursor:pointer;float:left;margin:0 8px 0 0}.prontusPlayer .social-box .wp-ico{float:left;margin:0 8px 0 0}.prontusPlayer .social-box input{background:#999;color:#333;border:0;padding:3px 5px 3px 10px;-webkit-border-top-left-radius:20px;-webkit-border-bottom-left-radius:20px;-moz-border-radius-topleft:20px;-moz-border-radius-bottomleft:20px;border-top-left-radius:20px;border-bottom-left-radius:20px;font-size:10px;float:left}
.prontusPlayer .social-box .copy{cursor:pointer;background:#327ba6;padding:4px 10px 4px 5px;-webkit-border-top-right-radius:20px;-webkit-border-bottom-right-radius:20px;-moz-border-radius-topright:20px;-moz-border-radius-bottomright:20px;border-top-right-radius:20px;border-bottom-right-radius:20px;color:#ccc;font-size:11px;text-decoration:none;float:left}.prontusPlayer .social-box .copy:hover{background:#666;color:#ccc}.prontusPlayer .controls{position:absolute;bottom:10%;left:0;width:100%;height:45px;padding:0;min-width:180px}
.prontusPlayer .controls .progressbar{padding-left:10px;padding-right:10px;height:6px}.prontusPlayer .controls .progressbar:hover{height:7px}.prontusPlayer .controls .progressbar:hover .playing-progressbar{height:6px;top:-1px}.prontusPlayer .controls .progressbar:hover .total-progressbar{height:6px;margin-top:-1px}.prontusPlayer .controls .progressbar:hover .charge-progressbar{height:6px;margin-top:-1px}.prontusPlayer .controls .total-progressbar{width:100%;background:#ccc;height:4px;z-index:1;cursor:pointer}
.prontusPlayer .controls .total-progressbar .charge-progressbar{width:0;background:#666;height:inherit;z-index:2;cursor:pointer}.prontusPlayer .controls .total-progressbar .playing-progressbar{width:0;background:#327ba6;height:inherit;z-index:3;cursor:pointer;position:absolute;top:0}.prontusPlayer .prontusPlayer-buttons-auxi{position:absolute;width:100%;height:40px;background:rgba(00,00,00,.7);-webkit-border-bottom-right-radius:0;-webkit-border-bottom-left-radius:0;-moz-border-radius-bottomright:0;-moz-border-radius-bottomleft:0;border-bottom-right-radius:0;border-bottom-left-radius:0}
.prontusPlayer .prontusPlayer-buttons-auxi .back-button{position:absolute;top:18px;left:15px}.prontusPlayer .prontusPlayer-buttons-auxi .play-button{cursor:pointer;position:absolute;top:2px;left:20px;-webkit-transition:all .3s linear;-moz-transition:all .3s linear;-o-transition:all .3s linear;-ms-transition:all .3s linear;transition:all .3s linear}.prontusPlayer .prontusPlayer-buttons-auxi .pause-button{cursor:pointer;position:absolute;top:4px;left:22px;display:none;-webkit-transition:all .3s linear;-moz-transition:all .3s linear;-o-transition:all .3s linear;-ms-transition:all .3s linear;transition:all .3s linear}
.prontusPlayer .prontusPlayer-buttons-auxi .forward-button{position:absolute;top:18px;left:80px}.prontusPlayer .prontusPlayer-buttons-auxi .live-button{position:absolute;top:12px;left:125px;color:#fff;padding:5px;border:1px solid #FFF;text-decoration:none;display:block;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;opacity:.5;filter:alpha(opacity=50);font-size:14px;-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}
.prontusPlayer .prontusPlayer-buttons-auxi .live-button:hover{opacity:1;filter:alpha(opacity=100);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer .prontusPlayer-buttons-auxi .live-button.active{opacity:1;filter:alpha(opacity=100);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear;background:#fff;color:#333}
.prontusPlayer .prontusPlayer-buttons-auxi .volume-button{cursor:pointer;position:absolute;top:5px;left:70px}.prontusPlayer .controls .volume-progressbar{width:100%;background:#ccc;height:4px;max-width:45px;-webkit-border-radius:1px;-moz-border-radius:1px;border-radius:1px;opacity:.9;filter:alpha(opacity=90);font-size:14px;-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear;cursor:pointer;position:absolute;top:18px;left:105px}
.prontusPlayer .controls .volume-progressbar:hover{opacity:1;filter:alpha(opacity=100);font-size:14px;-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer .controls .volume-progressbar .level-progressbar{width:40%;background:#327ba6;height:4px;z-index:2;cursor:pointer;position:relative}.prontusPlayer .controls .volume-progressbar .level-progressbar .circle{position:absolute;background:#fff;width:10px;height:10px;float:right;right:-5px;border-radius:5px;top:-3px;bottom:0}
.prontusPlayer .prontusPlayer-buttons-auxi .config-button{position:absolute;top:9px;right:100px;cursor:pointer;opacity:.9;filter:alpha(opacity=90);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer .prontusPlayer-buttons-auxi .config-button:hover{opacity:1;filter:alpha(opacity=100);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}
.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi{position:absolute;top:-5px;right:0}.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .rotulo-calidades{width:100%;text-align:left;padding-bottom:2px;margin-bottom:5px;margin-top:0;height:20px;padding-top:2px;background:rgba(48,48,48,.7)}.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .rotulo-calidades span{color:#fff;padding:4px 0 2px 1px;width:100%;display:block}.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .rotulo-calidades span:before{content:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAANElEQVR4AWOAg1Hw//9/h/9QMFQNQmg0gGpWoNSgA1B9DUPYIFA4gDSAMIUGIRSNGjQSAACrHCCuVY2LdAAAAABJRU5ErkJggg==');float:left;margin-top:-3px;margin-right:2px;display:block}
.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu{position:absolute;top:0;right:-32px;width:120px;font-family:'open_sans_lightregular';font-size:13px;background:rgba(48,48,48,.7)}.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu{text-align:center;display:none;z-index:1001}.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu a{color:#fff;padding:4px 5px;display:block;text-decoration:none;text-align:left}.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu a:hover{background:#327ba6}
.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu a.active{background:#327ba6}.prontusPlayer .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu a.active:after{content:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAQAAAD8x0bcAAAAZUlEQVR4AWMYWuC/zP9D/xUJKXnw/9V/FXxKJMBKNPAruY1FyX8BJLYodiWO/z/9t4MruY7Vov88/0/8//rfGMgSQijBpuzc/w//Hf5f+v8Oj3P/8wOV/Qcq0QXx8Ck7AFQyRAAAcPlKRO/0WqEAAAAASUVORK5CYII=');float:right;height:13px;margin-top:-2px}.prontusPlayer .prontusPlayer-buttons-auxi .fullscreen-button{cursor:pointer;position:absolute;top:4px;right:60px}.prontusPlayer .prontusPlayer-buttons-auxi .prontusLogo{position:absolute;top:4px;right:20px}.prontusPlayer .prontusPlayer-buttons-auxi .prontusLogoQuality{position:absolute;top:5px;right:100px}
.prontusPlayer .prontusPlayer-buttons-auxi a img{margin:0;opacity:.9;filter:alpha(opacity=90);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer .prontusPlayer-buttons-auxi .prontusLogo img{opacity:1;filter:alpha(opacity=1)}.prontusPlayer .prontusPlayer-buttons-auxi .prontusLogoQuality img{opacity:1;filter:alpha(opacity=1)}.prontusPlayer .prontusPlayer-buttons-auxi a:hover img{opacity:1;filter:alpha(opacity=100);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}
.prontusPlayer-transition{-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.transition-off-bottom{-webkit-transition:all .3s linear;-moz-transition:all .3s linear;-o-transition:all .3s linear;-ms-transition:all .3s linear;transition:all .3s linear;bottom:-100px !important}.transition-on-bottom{-webkit-transition:all .1s linear;-moz-transition:all .1s linear;-o-transition:all .1s linear;-ms-transition:all .1s linear;transition:all .1s linear;bottom:15px !important}
.controls.transition-on-bottom{-webkit-transition:all .1s linear;-moz-transition:all .1s linear;-o-transition:all .1s linear;-ms-transition:all .1s linear;transition:all .1s linear;bottom:0 !important}.transition-off-top{-webkit-transition:all .3s linear;-moz-transition:all .3s linear;-o-transition:all .3s linear;-ms-transition:all .3s linear;transition:all .3s linear;top:-100px !important}.transition-on-top{-webkit-transition:all .3s linear;-moz-transition:all .3s linear;-o-transition:all .3s linear;-ms-transition:all .3s linear;transition:all .3s linear;top:3% !important}
.prontusPlayer-320 .prontusPlayer-buttons-auxi .config-button{position:absolute;top:0;right:60px;cursor:pointer;opacity:.5;filter:alpha(opacity=50);-webkit-transition:all .2s linear;-moz-transition:all .2s linear;-o-transition:all .2s linear;-ms-transition:all .2s linear;transition:all .2s linear}.prontusPlayer-320 .prontusPlayer-buttons-auxi .config-button .config-auxi{position:absolute;top:9px;right:0}.prontusPlayer-320 .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu{position:absolute;top:0;right:-15px;width:50px;font-family:'open_sans_lightregular';font-size:12px;background:#999}
.prontusPlayer-320 .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu{text-align:center;display:none;z-index:1001}.prontusPlayer-320 .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu a{background:#999;color:#333;width:50px;padding:2px 0;display:block;text-decoration:none}.prontusPlayer-320 .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu a:hover{background:#ccc}.prontusPlayer-320 .prontusPlayer-buttons-auxi .config-button .config-auxi .res-menu a.active{background:#ccc}
.prontusPlayer-320 .prontusPlayer-buttons-auxi{text-align:center}.prontusPlayer-320 .prontusPlayer-buttons-auxi .play-button{margin-top:8px;margin-left:15px;float:left}.prontusPlayer-320 .prontusPlayer-buttons-auxi .live-button{margin-top:13px;margin-left:15px;float:left}.prontusPlayer-320 .prontusPlayer-buttons-auxi .pause-button{margin-top:8px;margin-left:15px;float:left;display:none}.prontusPlayer-320 .prontusPlayer-buttons-auxi .volume-button{margin-top:10px;margin-left:15px;float:left}.prontusPlayer-320 .prontusPlayer-buttons-auxi .fullscreen-button{margin-top:10px;margin-right:15px;float:right}
.prontusPlayer-320 .prontusPlayer-buttons-auxi .fullscreen-button{position:absolute;top:10px;right:20px}.prontusPlayer-320 .prontusPlayer-buttons-auxi .janus-logo{margin-top:15px;margin-right:15px;float:right}.prontusPlayer-320 .prontusPlayer-buttons-auxi a{position:static !important;display:inline-block}.prontusPlayer-320 .prontusPlayer-buttons-auxi .janus-logo{position:static !important;display:inline-block}.prontusPlayer-320 .prontusPlayer-buttons-auxi .back-button{display:none}.prontusPlayer-320 .prontusPlayer-buttons-auxi .forward-button{display:none}
.prontusPlayer-320 .controls .volume-progressbar{display:none}.prontusPlayer-320 .social-box{width:auto;max-width:none;min-width:0}.prontusPlayer-320 .social-box input{display:none}.prontusPlayer-320 .social-box .copy{display:none}.prontusPlayer-320 .prontusPlayer .share-layer .social-box .fb-ico{float:left;margin:0 4px}.prontusPlayer-320 .prontusPlayer .share-layer .social-box .tw-ico{float:left;margin:0 4px}.prontusPlayer-320 .prontusPlayer .share-layer .social-box .gp-ico{float:left;margin:0 4px}
.prontusPlayer-320 .prontusPlayer .social-box .fb-ico{float:left;margin:4px 0}.prontusPlayer-320 .prontusPlayer .social-box .tw-ico{float:left;margin:4px 0}.prontusPlayer-320 .prontusPlayer .social-box .gp-ico{float:left;margin:4px 0}.prontusPlayer-320 .prontusPlayer .share-layer .social-box input{display:block}.prontusPlayer-320 .prontusPlayer .share-layer .social-box .copy{display:block}.prontusPlayer-320 .date{font-family:open_sans_lightregular,Arial,Helvetica,sans-serif;font-size:13px;line-height:100%;color:#FFF;position:absolute;top:12px;left:80px}
.prontusPlayer-320 .prontusPlayer .share-layer .social-box{min-width:200px}.prontusPlayer-320 .prontusPlayer .share-layer .auxi-box{top:20%}.prontusRelatedContainer{z-index:100001;width:100%;height:100%;position:absolute;top:0;display:none;background-color:rgba(0,0,0,0.7)}.prontusRelatedItems{position:absolute}.prontusRelatedItem{width:200px;height:113px;position:absolute;cursor:pointer}.prontusRelatedInfoContainer{position:absolute;width:200px;height:40px;background-color:rgba(0,0,0,0.7);z-index:1000}
.prontusRelatedTitle{margin:0;padding:3px;color:white}.prontusRelatedClose{float:right;text-decoration:none;color:white;font-size:32px;margin:10px;margin-top:0;cursor:pointer}.prontusRelatedAutoPlayMsg{top:10px;color:#FFF;position:absolute;padding-left:10px;width:100%}.spin{position:absolute;top:50%;left:50%;width:120px;height:120px;margin:-60px 0 0 -60px;-webkit-animation:spin 1s linear infinite;-moz-animation:spin 1s linear infinite;animation:spin 1s linear infinite}@-moz-keyframes spin{100%{-moz-transform:rotate(360deg)}
}@-webkit-keyframes spin{100%{-webkit-transform:rotate(360deg)}}@keyframes spin{100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}</style>
</head>
<body>
  <?php if($dados_stm["watermark_posicao"]) { ?>
<div style="position: absolute; display: inline; z-index: 99999; bottom: 0px;<?php echo $watermark_pos_geral;?>; opacity: 0.5;"><img src="https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>"></div>
<?php } ?>
    <div style="width: 100%;">
        <div id="player_webtv"></div>
    </div>
    <script type="text/javascript">
        var altura = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        prontusPlayer.install({
            "player": {
                "adEnable": false,
                "autoPlay": <?php echo query_string('3'); ?>,
                "forcePlayer": false,
                "defaultPlayer": "html5",
                "pseudoStreaming": true,
                "imageFolder": "/img/prontus_player/",
                "width": "100%",
                "height": altura,
                "hideControls": false,
                "volume": 100,
                "forceSize": true,
                "disableFullScreen": false,
                "seek": 10,
                "showPanelOnComplete": "share"
            },
            "mediaSrc": {
                "defaultSrc": "<?php echo $url_source;?>"
            },
            "related": {
                "url": "",
                "autoPlayTime": "7",
                "autoPlayMsg": "__TITLE__ comienza en __TIME__ segundos"
            },
            "share": {
                "enableShare": false,
                "shareType": "normal",
                "shareUrl": "<?php echo "https://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]"; ?>",
                "embedCode": "<?php echo "https://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]"; ?>"
            },
            "contentId": "player_webtv"
        });
        window.onresize = function() {
          var altura = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
          document.getElementById("player_webtv").style.height = altura+"px";
        }
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
    </script>
</body>
</html>
<?php } elseif($player == 7) { ?>
<?php $loop = (query_string('9') == "true") ? "yes" : "no";  ?>
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <title>Player</title>
<meta name=apple-touch-fullscreen content=yes>
<meta name=apple-mobile-web-app-capable content=yes>
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
<link rel="stylesheet" type="text/css" href="/player5/content/global.css">
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
<script type="text/javascript" src="/player5/java/FWDUVPlayer.js"></script>
<script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
<style type="text/css">body,html{ background-color: #000000; overflow:hidden;width:100%;height:100%;margin:0;padding:0}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}</style>
</head>

<body>
<?php if($ativar_contador == "sim") { ?><div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div><?php } ?>
<?php if($ativar_compartilhamento == "sim") { ?><nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado"> <div class="circle-nav-toggle"><i class="fa fa-plus" style="color: #FFFFFF"></i></div><div class="circle-nav-panel"></div><ul class="circle-nav-menu"> <a href="https://facebook.com/sharer/sharer.php?u=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li></a> <a href="https://twitter.com/share?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li></a> <a href="https://pinterest.com/pin/create/bookmarklet/?&url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-pinterest fa-2x"></i></li></a> <a href="tg://msg_url?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-4"><i class="fa fa-telegram fa-2x"></i></li></a> <a href="whatsapp://send?text=WebTV https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-5"><i class="fa fa-whatsapp fa-2x"></i></li></a> </ul> </nav><?php } ?>
<script type="text/javascript">
      FWDUVPUtils.onReady(function(){
        
        new FWDUVPlayer({   
          //main settings
          instanceName:"player1",
          parentId:"player_webtv",
          playlistsId:"playlists",
          mainFolderPath:"/player5/content",
          skinPath:"metal_skin_dark",
          displayType:"fullscreen",
          initializeOnlyWhenVisible:"no",
          useVectorIcons:"no",
          fillEntireVideoScreen:"no",
          fillEntireposterScreen:"yes",
          goFullScreenOnButtonPlay:"yes",
          playsinline:"yes",
          privateVideoPassword:"428c841430ea18a70f7b06525d4b748a",
          youtubeAPIKey:"",
          useHEXColorsForSkin:"no",
          normalHEXButtonsColor:"#666666",
          useDeepLinking:"yes",
          googleAnalyticsTrackingCode:"",
          useResumeOnPlay:"no",
          showPreloader:"yes",
          preloaderBackgroundColor:"#000000",
          preloaderFillColor:"#FFFFFF",
          addKeyboardSupport:"yes",
          autoScale:"yes",
          showButtonsToolTip:"yes", 
          stopVideoWhenPlayComplete:"no",
          playAfterVideoStop:"no",
          autoPlay:"yes",
          autoPlayText:"Click aqu&iacute; para activar sonido",
          loop:"<?php echo $loop; ?>",
          shuffle:"no",
          showErrorInfo:"yes",
          maxWidth:"none",
          maxHeight:"none",
          buttonsToolTipHideDelay:1.5,
          volume:1,
          rewindTime:10,
          backgroundColor:"#000000",
          videoBackgroundColor:"#000000",
          posterBackgroundColor:"#000000",
          buttonsToolTipFontColor:"#5a5a5a",
          //logo settings
          <?php if($dados_stm["watermark_posicao"]) { ?>
          showLogo:"yes",
          logoPath:"https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>&",
          hideLogoWithController:"no",
          logoPosition:"<?php echo $FWDUVPlayer_watermark; ?>",
          logoLink:"",
          logoMargins:10,
          <?php } else { ?>
          showLogo:"no",
          <?php } ?>
          //playlists/categories settings
          showPlaylistsSearchInput:"no",
          usePlaylistsSelectBox:"no",
          showPlaylistsButtonAndPlaylists:"no",
          showPlaylistsByDefault:"no",
          thumbnailSelectedType:"opacity",
          startAtPlaylist:0,
          buttonsMargins:15,
          thumbnailMaxWidth:350, 
          thumbnailMaxHeight:350,
          horizontalSpaceBetweenThumbnails:40,
          verticalSpaceBetweenThumbnails:40,
          inputBackgroundColor:"#333333",
          inputColor:"#999999",
          //playlist settings
          showPlaylistButtonAndPlaylist:"no",
          playlistPosition:"right",
          showPlaylistByDefault:"no",
          showPlaylistName:"no",
          showSearchInput:"no",
          showLoopButton:"no",
          showShuffleButton:"yes",
          showPlaylistOnFullScreen:"no",
          showNextAndPrevButtons:"no",
          showThumbnail:"yes",
          showOnlyThumbnail:"no",
          forceDisableDownloadButtonForFolder:"yes",
          addMouseWheelSupport:"yes", 
          startAtRandomVideo:"no",
          stopAfterLastVideoHasPlayed:"no",
          addScrollOnMouseMove:"no",
          randomizePlaylist:'no',
          folderVideoLabel:"VIDEO ",
          playlistRightWidth:310,
          playlistBottomHeight:380,
          startAtVideo:0,
          maxPlaylistItems:50,
          thumbnailWidth:71,
          thumbnailHeight:71,
          spaceBetweenControllerAndPlaylist:1,
          spaceBetweenThumbnails:1,
          scrollbarOffestWidth:8,
          scollbarSpeedSensitivity:.5,
          playlistBackgroundColor:"#000000",
          playlistNameColor:"#FFFFFF",
          thumbnailNormalBackgroundColor:"#1b1b1b",
          thumbnailHoverBackgroundColor:"#313131",
          thumbnailDisabledBackgroundColor:"#272727",
          searchInputBackgroundColor:"#000000",
          searchInputColor:"#999999",
          youtubeAndFolderVideoTitleColor:"#FFFFFF",
          folderAudioSecondTitleColor:"#999999",
          youtubeOwnerColor:"#888888",
          youtubeDescriptionColor:"#888888",
          mainSelectorBackgroundSelectedColor:"#FFFFFF",
          mainSelectorTextNormalColor:"#FFFFFF",
          mainSelectorTextSelectedColor:"#000000",
          mainButtonBackgroundNormalColor:"#212021",
          mainButtonBackgroundSelectedColor:"#FFFFFF",
          mainButtonTextNormalColor:"#FFFFFF",
          mainButtonTextSelectedColor:"#000000",
          //controller settings
          showController:"yes",
          showControllerWhenVideoIsStopped:"yes",
          showNextAndPrevButtonsInController:"no",
          showRewindButton:"no",
          showPlaybackRateButton:"no",
          showVolumeButton:"yes",
          showTime:"no",
          showQualityButton:"yes",
          showInfoButton:"yes",
          showDownloadButton:"no",
          showShareButton:"no",
          showEmbedButton:"no",
          showChromecastButton:"yes",
          showFullScreenButton:"yes",
          disableVideoScrubber:"yes",
          showScrubberWhenControllerIsHidden:"no",
          showMainScrubberToolTipLabel:"no",
          showDefaultControllerForVimeo:"yes",
          repeatBackground:"yes",
          controllerHeight:42,
          controllerHideDelay:3,
          startSpaceBetweenButtons:7,
          spaceBetweenButtons:8,
          scrubbersOffsetWidth:2,
          mainScrubberOffestTop:14,
          timeOffsetLeftWidth:5,
          timeOffsetRightWidth:3,
          timeOffsetTop:0,
          volumeScrubberHeight:80,
          volumeScrubberOfsetHeight:12,
          timeColor:"#888888",
          youtubeQualityButtonNormalColor:"#888888",
          youtubeQualityButtonSelectedColor:"#FFFFFF",
          scrubbersToolTipLabelBackgroundColor:"#000000",
          scrubbersToolTipLabelFontColor:"#5a5a5a",
          //advertisement on pause window
          aopwTitle:"Advertisement",
          aopwWidth:400,
          aopwHeight:240,
          aopwBorderSize:6,
          aopwTitleColor:"#FFFFFF",
          //subtitle
          subtitlesOffLabel:"Subtitle off",
          //popup add windows
          showPopupAdsCloseButton:"yes",
          //embed window and info window
          embedAndInfoWindowCloseButtonMargins:15,
          borderColor:"#333333",
          mainLabelsColor:"#FFFFFF",
          secondaryLabelsColor:"#a1a1a1",
          shareAndEmbedTextColor:"#5a5a5a",
          inputBackgroundColor:"#000000",
          inputColor:"#FFFFFF",
          //login
                playIfLoggedIn:"no",
                playIfLoggedInMessage:"",
          //audio visualizer
          audioVisualizerLinesColor:"#0099FF",
          audioVisualizerCircleColor:"#FFFFFF",
          //lightbox settings
          closeLightBoxWhenPlayComplete:"no",
          lightBoxBackgroundOpacity:.6,
          lightBoxBackgroundColor:"#000000",
          //sticky on scroll
          stickyOnScroll:"no",
          stickyOnScrollShowOpener:"yes",
          stickyOnScrollWidth:"700",
          stickyOnScrollHeight:"394",
          //sticky display settings
          showOpener:"yes",
          showOpenerPlayPauseButton:"yes",
          verticalPosition:"bottom",
          horizontalPosition:"center",
          showPlayerByDefault:"yes",
          animatePlayer:"yes",
          openerAlignment:"right",
          mainBackgroundImagePath:"/player5/img-color-bars.jpg",
          openerEqulizerOffsetTop:-1,
          openerEqulizerOffsetLeft:3,
          offsetX:0,
          offsetY:0,
          //playback rate / speed
          defaultPlaybackRate:1, //0.25, 0.5, 1, 1.25, 1.2, 2
          //cuepoints
          executeCuepointsOnlyOnce:"no",
          //annotations
          showAnnotationsPositionTool:"no",
          //ads
          openNewPageAtTheEndOfTheAds:"no",
          playAdsOnlyOnce:"no",
          adsButtonsPosition:"left",
          skipToVideoText:"You can skip to video in: ",
          skipToVideoButtonText:"Skip Ad",
          adsTextNormalColor:"#888888",
          adsTextSelectedColor:"#FFFFFF",
          adsBorderNormalColor:"#666666",
          adsBorderSelectedColor:"#FFFFFF",
          //a to b loop
          useAToB:"yes",
          atbTimeBackgroundColor:"transparent",
          atbTimeTextColorNormal:"#888888",
          atbTimeTextColorSelected:"#FFFFFF",
          atbButtonTextNormalColor:"#888888",
          atbButtonTextSelectedColor:"#FFFFFF",
          atbButtonBackgroundNormalColor:"#FFFFFF",
          atbButtonBackgroundSelectedColor:"#000000",
          //thumbnails preview
          thumbnailsPreviewWidth:196,
          thumbnailsPreviewHeight:110,
          thumbnailsPreviewBackgroundColor:"#000000",
          thumbnailsPreviewBorderColor:"#666",
          thumbnailsPreviewLabelBackgroundColor:"#666",
          thumbnailsPreviewLabelFontColor:"#FFF",
          // context menu
          showContextmenu:'no',
          showScriptDeveloper:"no",
          contextMenuBackgroundColor:"#1f1f1f",
          contextMenuBorderColor:"#1f1f1f",
          contextMenuSpacerColor:"#333",
          contextMenuItemNormalColor:"#888888",
          contextMenuItemSelectedColor:"#FFFFFF",
          contextMenuItemDisabledColor:"#444"
        });
      });
$(document).ready(function () { 
  setTimeout(function(){
  $(".fwduvp").css("z-index", 'initial');
  $('img[src*=youtube-quality]').each(function(i){
    $(this).attr('title','Streaming Cualidades/Qualities');
  }); 
},3000);
contador();
setInterval (contador,30000);
});
  function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
    </script>
<div id="player_webtv"></div><ul id="playlists" style="display:none;"><li data-source="playlist1" data-playlist-name="TV DEMO" data-thumbnail-path=""></li></ul><ul id="playlist1" style="display:none;"><li data-thumb-source="" data-video-source="[<?php echo $sources_transcoder_FWDUVPlayer;?>]" data-start-at-video="0" data-poster-source="<?php echo $capa_vodthumb; ?>"></li></ul>
</body>
</html>
<?php } elseif($player == 8000) { ?>
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <title>Player</title>
<meta name=apple-touch-fullscreen content=yes>
<meta name=apple-mobile-web-app-capable content=yes>
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<meta http-equiv=X-UA-Compatible content="IE=edge,chrome=1">
  <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
<script src="https://de3rejoj5263u.cloudfront.net/player-radiant.js"></script>
<style type="text/css">body,html{ background-color: #000000; width:100%;height:100%;margin:0;padding:0}.icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.rmp-i-live{display: none;}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}</style>
</head>

<body>
<?php if($dados_stm["watermark_posicao"]) { ?>
<div style="position: absolute; display: inline; z-index: 99999; bottom: 0px;<?php echo $watermark_pos_geral;?>; opacity: 0.5;"><img src="https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>"></div>
<?php } ?>
<?php if($ativar_contador == "sim") { ?><div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div><?php } ?>
<?php if($ativar_compartilhamento == "sim") { ?><nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado"> <div class="circle-nav-toggle"><i class="fa fa-plus" style="color: #FFFFFF"></i></div><div class="circle-nav-panel"></div><ul class="circle-nav-menu"> <a href="https://facebook.com/sharer/sharer.php?u=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li></a> <a href="https://twitter.com/share?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li></a> <a href="https://pinterest.com/pin/create/bookmarklet/?&url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-pinterest fa-2x"></i></li></a> <a href="tg://msg_url?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-4"><i class="fa fa-telegram fa-2x"></i></li></a> <a href="whatsapp://send?text=WebTV https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-5"><i class="fa fa-whatsapp fa-2x"></i></li></a> </ul> </nav><?php } ?>
<div id="player"></div>
<script>
nedplayer({
  _nedConfig: {},
  file: '<?php echo $url_source;?>',
  licenseKey: 'xETN4ETNxAUciV3Yhd2ajtGe',
  autoplay: <?php echo query_string('3'); ?>,
  autoHeightMode:true
});
<?php if($ativar_contador == "sim") { ?>
contador();
setInterval (contador,30000);
  function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}
<?php } ?>
window.onload = function() {
var altura = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
document.getElementById("player").style.height = altura+"px";
var numberOfTimes = 5;
delay = 3000;
for (let i = 0; i < numberOfTimes; i++) {
    setTimeout( function() {document.getElementById("player").style.height = altura+"px";}, delay * i);
}
}
$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
</script>
</body>
</html>
<?php } else { ?>
<?php $loop = (query_string('9') == "true") ? "true" : "false";  ?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name=viewport content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
<title>Player</title>
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
<script src="/reprofoto/hls.js" type="fae2161864626ea3cad5b6ea-text/javascript"></script>
<script src="/reprofoto/DPlayer.min.js" type="fae2161864626ea3cad5b6ea-text/javascript"></script>
  <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link type="text/css" rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
<style>
            body {                
                margin: 0;
                padding: 0;
                background-color: #000000;
                overflow: hidden;
            }
            .icone-contador{position:absolute;left:0;top:0;background:rgba(255,0,0, 1.0); min-width: 50px;height: 20px;padding-left: 5px;padding-bottom: 10px; margin: 10px; border-radius: 3px;color: #FFFFFF;font-size: 14px;text-align: center;z-index: 10000;}.circle-nav-wrapper{position:absolute;z-index:9999;right:0;top:0;width:50px;height:50pxoverflow:hidden}.circle-nav-wrapper .circle-nav-toggle{position:absolute;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;border-radius:50%;z-index:999999;width:30px;height:30px;border:2px solid #FFFFFF;transition:-webkit-transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1);transition:transform .2s cubic-bezier(0,1.16,1,1),-webkit-transform .2s cubic-bezier(0,1.16,1,1);right:10px;top:10px}.circle-nav-wrapper .circle-nav-toggle i.material-icons{color:#FFFFFF}.circle-nav-wrapper .circle-nav-toggle:focus,.circle-nav-wrapper .circle-nav-toggle:hover{opacity:.8;cursor:pointer}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open{border:2px solid #fff;-webkit-transform:rotate(135deg);transform:rotate(135deg)}.circle-nav-wrapper .circle-nav-toggle.circle-nav-open i.material-icons{color:#fff}.circle-nav-wrapper .circle-nav-panel{background:#ffc371;background:linear-gradient(to right,#ff5f6d,#ffc371);width:0;height:0;border-radius:50%;-webkit-transform:translate(-50%,-52.5%);transform:translate(-50%,-52.5%);transition:width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1);margin-left:261px}.circle-nav-wrapper .circle-nav-panel.circle-nav-open{width:500px;height:500px;opacity:.7;box-shadow:-5px 6px 0 6px rgba(255,95,109,.33)}.circle-nav-wrapper .circle-nav-menu{width:250px;height:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item{position:absolute;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;background-color:#fff;border-radius:50%;width:15px;height:15px;visibility:hidden;transition:bottom .5s cubic-bezier(0,1.16,1,1),left .5s cubic-bezier(0,1.16,1,1),width .3s cubic-bezier(0,1.16,1,1),height .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item-1,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-2,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-3,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-4,.circle-nav-wrapper .circle-nav-menu .circle-nav-item-5{left:250px;bottom:250px}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{color:#ff5f6d;font-size:.6em;transition:font .3s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu .circle-nav-item i{display:block}.circle-nav-wrapper .circle-nav-menu .circle-nav-item span{display:none}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item{width:40px;height:40px;visibility:visible;transition:bottom .3s cubic-bezier(0,1.16,1,1),left .3s cubic-bezier(0,1.16,1,1),width .2s cubic-bezier(0,1.16,1,1),height .2s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:focus,.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item:hover{cursor:pointer;opacity:.8}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item i{font-size:1.4em;transition:font .1s cubic-bezier(0,1.16,1,1)}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-1{bottom:200px;left:30px;transition-delay:.2s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-2{bottom:140px;left:50px;transition-delay:.4s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-3{bottom:90px;left:85px;transition-delay:.6s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-4{bottom:52px;left:132px;transition-delay:.8s}.circle-nav-wrapper .circle-nav-menu.circle-nav-open .circle-nav-item.circle-nav-item-5{bottom:28px;left:187px;transition-delay:1s}
        </style>
</head>
<body>
<?php if($dados_stm["watermark_posicao"]) { ?>
<div style="position: absolute; display: inline; z-index: 99999; bottom: 0px;<?php echo $watermark_pos_geral;?>; opacity: 0.5;"><img src="https://<?php echo $servidor;?>:1443/watermark.php?login=<?php echo $login;?>"></div>
<?php } ?>
<?php if($ativar_contador == "sim") { ?><div class="icone-contador"><i class="fa fa-eye"></i> <strong><span id="contador_online"></span></strong></div><?php } ?>
<?php if($ativar_compartilhamento == "sim") { ?><nav id="circle-nav-wrapper" class="circle-nav-wrapper" data-status-botao="fechado"> <div class="circle-nav-toggle"><i class="fa fa-plus" style="color: #FFFFFF"></i></div><div class="circle-nav-panel"></div><ul class="circle-nav-menu"> <a href="https://facebook.com/sharer/sharer.php?u=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-1"><i class="fa fa-facebook fa-2x"></i></li></a> <a href="https://twitter.com/share?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-2"><i class="fa fa-twitter fa-2x"></i></li></a> <a href="https://pinterest.com/pin/create/bookmarklet/?&url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-3"><i class="fa fa-pinterest fa-2x"></i></li></a> <a href="tg://msg_url?url=https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-4"><i class="fa fa-telegram fa-2x"></i></li></a> <a href="whatsapp://send?text=WebTV https://<?php echo $_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']; ?>" target="_blank"> <li class="circle-nav-item circle-nav-item-5"><i class="fa fa-whatsapp fa-2x"></i></li></a> </ul> </nav><?php } ?>
<div id="dplayer"></div>
<script type="fae2161864626ea3cad5b6ea-text/javascript">

const dp = new DPlayer({
    container: document.getElementById('dplayer'),
    autoplay: <?php echo query_string('3');?>,
    loop: <?php echo $loop;?>,
    preload: 'auto',
    volume: 0.7,
    screenshot: true,
    video: {

                name: 'Video',
                url: '<?php echo $url_source;?>',
                type: 'hls',
            },
});
setTimeout(function(){
var altura = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
var altura = altura-30;
$("video").css("height", altura+'px'); 
},1000);
<?php if($ativar_contador == "sim") { ?>
contador();
setInterval (contador,30000);
  function contador(){
    $.ajax({
    url: "/contador/<?php echo $login; ?>",
    success:
      function(total_online){
      $("#contador_online").html(total_online);
      }
    })
}
<?php } ?>

$(".circle-nav-toggle").on("click",function(){"fechado"==$("#circle-nav-wrapper").data("status-botao")?($("#circle-nav-wrapper").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$(".circle-nav-menu").css("width","250px"),$("#circle-nav-wrapper").css("height","250px"),$("#circle-nav-wrapper").data("status-botao","aberto")):($("#circle-nav-wrapper").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$(".circle-nav-menu").css("width","50px"),$("#circle-nav-wrapper").css("height","50px"),$("#circle-nav-wrapper").data("status-botao","fechado"))});
!function(e,o,l,c){e.fn.circleNav=function(o){var l=e.extend({},e.fn.circleNav.settings,o);return this.each(function(){var o=e(this),c=e(".circle-nav-toggle"),a=e(".circle-nav-panel"),n=e(".circle-nav-menu");l.hasOverlay&&0==e(".circle-nav-overlay").length&&(e("body").append("<div class='circle-nav-overlay'></div>"),e(".circle-nav-overlay").css({top:"0",right:"0",bottom:"0",left:"0",position:"fixed","background-color":l.overlayColor,opacity:l.overlayOpacity,"z-index":"-1",display:"none"})),e(".circle-nav-toggle, .circle-nav-overlay").on("click",function(){o.stop().toggleClass("circle-nav-open"),c.stop().toggleClass("circle-nav-open"),a.stop().toggleClass("circle-nav-open"),n.stop().toggleClass("circle-nav-open"),e(".circle-nav-overlay").fadeToggle(),e("body").css("overflow")?e("body, html").css("overflow",""):e("body, html").css("overflow","hidden")})})},e.fn.circleNav.settings={hasOverlay:!0,overlayColor:"#fff",overlayOpacity:".7"}}(jQuery,window,document);
$(function(){$("#circle-nav-wrapper").circleNav()});
  </script>
<script src="/reprofoto/rocket-loader.min.js" data-cf-settings="fae2161864626ea3cad5b6ea-|49" defer></script><script>(function(){var js = "window['__CF$cv$params']={r:'72dd40fc7abb0355',m:'BG1.pYnE8jqoD8mDPxz6Kt_yyGsuB_Ea_e9g60lU7_M-1658336434-0-AVJHfQBvf91qmDmpHSZ/VlkGAyIU+HIieCgNzfYGICrsBFOv8E7JQNrEAc8P6mEBJH+mhzpePxGYKUaFKDm0Lisknwkr8CnlDlwepiZKZu39ZhW7GcnK6anYf4ENhQcNUA==',s:[0x8f7c105d4b,0x6bc213f613],u:'/cdn-cgi/challenge-platform/h/g'};var _cpo=document.createElement('script');_cpo.nonce='',_cpo.src='/cdn-cgi/challenge-platform/h/g/scripts/cb/invisible.js?cb=72dd40fc7abb0355',document.getElementsByTagName('head')[0].appendChild(_cpo);";var _0xh = document.createElement('iframe');_0xh.height = 1;_0xh.width = 1;_0xh.style.border = 'none';_0xh.style.visibility = 'hidden';document.body.appendChild(_0xh);function handler() {var _0xi = _0xh.contentDocument || _0xh.contentWindow.document;if (_0xi) {var _0xj = _0xi.createElement('script');_0xj.innerHTML = js;_0xi.getElementsByTagName('head')[0].appendChild(_0xj);}}if (document.readyState !== 'loading') {handler();} else if (window.addEventListener) {document.addEventListener('DOMContentLoaded', handler);} else {var prev = document.onreadystatechange || function () {};document.onreadystatechange = function (e) {prev(e);if (document.readyState !== 'loading') {document.onreadystatechange = prev;handler();}};}})();</script><script defer src="/reprofoto/v652eace1692a40cfa3763df669d7439c1639079717194" integrity="sha512-Gi7xpJR8tSkrpF7aordPZQlW2DLtzUlZcumS8dMQjwDHEnw9I7ZLyiOj/6tZStRBGtGgN6ceN6cMH8z7etPGlw==" data-cf-beacon='{"rayId":"72dd40fc7abb0355","version":"2022.6.0","r":1,"token":"3733490c9f5c4f1e9b782a05472f8e08","si":100}' crossorigin="anonymous"></script>
</body>
</html>
<?php } ?>
