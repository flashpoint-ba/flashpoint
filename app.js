/* ── SCROLL REVEAL ── */
(function(){
  const obs=new IntersectionObserver(function(entries){
    entries.forEach(function(x){
      if(x.isIntersecting){x.target.classList.add('is-visible');obs.unobserve(x.target);}
    });
  },{threshold:0.12,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal-on-scroll').forEach(function(el){obs.observe(el);});
})();
(function(){
  document.querySelectorAll('.event-cta').forEach(function(btn){
    var nodes=[].slice.call(btn.childNodes);
    var t=nodes.find(function(n){return n.nodeType===Node.TEXT_NODE&&n.textContent.trim();});
    btn.setAttribute('data-text',t?t.textContent.trim():btn.textContent.trim());
  });
})();

/* ── SUPABASE CONFIG ── */
var SB_URL='https://dtmulatpgeqoeaqbeujm.supabase.co';
var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXVsYXRwZ2Vxb2VhcWJldWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNTQwNTEsImV4cCI6MjA5NTkzMDA1MX0.SPVb6cCMLeznSeSDe-eY8SZ2Ysazif5cx0pL79MQggk';
var USER_TOKEN=null;

function getH(){
  return {'apikey':SB_KEY,'Authorization':'Bearer '+(USER_TOKEN||SB_KEY)};
}
function getHJ(){
  return {'apikey':SB_KEY,'Authorization':'Bearer '+(USER_TOKEN||SB_KEY),'Content-Type':'application/json'};
}

function dbGet(table,params){
  return fetch(SB_URL+'/rest/v1/'+table+'?'+(params||'select=*'),{headers:getH()})
    .then(function(r){return r.ok?r.json():[];})
    .catch(function(e){console.error('GET error',e);return[];});
}

function dbInsert(table,data){
  var h=getHJ();h['Prefer']='return=minimal';
  return fetch(SB_URL+'/rest/v1/'+table,{method:'POST',headers:h,body:JSON.stringify(data)})
    .then(function(r){
      if(!r.ok){r.text().then(function(t){console.error('INSERT error',r.status,t);});}
      return r.ok;
    })
    .catch(function(e){console.error('INSERT fail',e);return false;});
}

function dbDelete(table,id){
  return fetch(SB_URL+'/rest/v1/'+table+'?id=eq.'+id,{method:'DELETE',headers:getH()})
    .then(function(r){return r.ok;})
    .catch(function(){return false;});
}

function dbPatch(table,id,data){
  var h=getHJ();h['Prefer']='return=minimal';
  return fetch(SB_URL+'/rest/v1/'+table+'?id=eq.'+id,{method:'PATCH',headers:h,body:JSON.stringify(data)})
    .then(function(r){return r.ok;})
    .catch(function(e){console.error('PATCH fail',e);return false;});
}

function dbUpsert(table,data){
  var h=getHJ();h['Prefer']='resolution=merge-duplicates,return=minimal';
  return fetch(SB_URL+'/rest/v1/'+table,{method:'POST',headers:h,body:JSON.stringify(data)})
    .then(function(r){
      if(!r.ok){r.text().then(function(t){console.error('UPSERT error',r.status,t);});}
      return r.ok;
    })
    .catch(function(e){console.error('UPSERT fail',e);return false;});
}

/* ── AUTH ── */
function showLogin(){
  document.getElementById('loginOv').classList.add('open');
  document.getElementById('loginEmail').focus();
}
function closeLogin(){
  document.getElementById('loginOv').classList.remove('open');
  document.getElementById('loginEmail').value='';
  document.getElementById('loginPw').value='';
  document.getElementById('loginErr').style.display='none';
}

function doLogin(){
  var email=document.getElementById('loginEmail').value.trim();
  var pw=document.getElementById('loginPw').value;
  if(!email||!pw)return;
  fetch(SB_URL+'/auth/v1/token?grant_type=password',{
    method:'POST',
    headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:pw})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.access_token){
      USER_TOKEN=data.access_token;
      localStorage.setItem('fp_tok',USER_TOKEN);
      closeLogin();
      document.getElementById('publicView').style.display='none';
      document.getElementById('adminView').style.display='block';
      rAdminDash();
    } else {
      document.getElementById('loginErr').style.display='block';
      document.getElementById('loginPw').value='';
    }
  }).catch(function(e){console.error('Login error',e);});
}

function aLogout(){
  fetch(SB_URL+'/auth/v1/logout',{method:'POST',headers:getHJ()}).catch(function(){});
  USER_TOKEN=null;
  localStorage.removeItem('fp_tok');
  document.getElementById('adminView').style.display='none';
  document.getElementById('publicView').style.display='block';
  loadPublic();
}

function checkSession(){
  var tok=localStorage.getItem('fp_tok');
  if(!tok)return Promise.resolve(false);
  return fetch(SB_URL+'/auth/v1/user',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+tok}})
    .then(function(r){
      if(r.ok){USER_TOKEN=tok;return true;}
      localStorage.removeItem('fp_tok');return false;
    }).catch(function(){return false;});
}

/* ── MODAL HELPERS ── */
function oM(id){document.getElementById(id).classList.add('open');}
function cM(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.m-ov').forEach(function(m){
    m.addEventListener('click',function(e){if(e.target===m)m.classList.remove('open');});
  });
});

/* ── ADMIN NAV ── */
function aGoTo(pg,btn){
  document.querySelectorAll('.adm-pg').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.adm-ni').forEach(function(b){b.classList.remove('active');});
  document.getElementById('adm-'+pg).classList.add('active');
  if(btn)btn.classList.add('active');
  var titles={dashboard:'Dashboard',featured:'Próximo Evento',calendar:'Calendario'};
  document.getElementById('admTitle').textContent=titles[pg]||pg;
  document.getElementById('admActs').innerHTML='<button class="bk-btn" onclick="aLogout()">← Sitio</button>';
  if(pg==='featured'){
    document.getElementById('admActs').innerHTML+='';
    rAdminFeatured();
  }
  if(pg==='calendar'){
    document.getElementById('admActs').innerHTML+=' <button class="btn btn-red btn-sm" onclick="oM(\'mCal\')">+ Agregar Artista</button>';
    rAdminCalendar();
  }
  if(pg==='dashboard')rAdminDash();
}

/* ── ADMIN RENDERS ── */
function rAdminDash(){
  document.getElementById('admActs').innerHTML='<button class="bk-btn" onclick="aLogout()">← Sitio</button>';
  dbGet('calendar','select=*&order=date.asc').then(function(cal){
    var html='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">';
    html+='<div class="adm-m"><div class="adm-m-lbl">Artistas en Calendario</div><div class="adm-m-val a">'+cal.length+'</div></div>';
    html+='</div>';
    html+='<div class="stitle">Calendario actual</div>';
    if(cal.length){
      cal.forEach(function(e){
        html+='<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">';
        html+='<div><strong>'+e.artist+'</strong><span style="color:var(--muted);font-size:11px;margin-left:10px">'+(e.date||'Sin fecha')+'</span></div>';
        html+='<button onclick="delCalendar(\''+e.id+'\')" class="btn btn-ghost btn-xs" style="color:var(--muted)">✕</button></div>';
      });
    } else {
      html+='<div style="color:var(--muted);padding:16px 0;font-size:13px">Sin artistas en el calendario.</div>';
    }
    document.getElementById('admDashContent').innerHTML=html;
  });
}

function rAdminFeatured(){
  Promise.all([
    dbGet('settings','key=eq.flyer_url'),
    dbGet('settings','key=eq.ticket_url'),
    dbGet('settings','key=eq.venue_name'),
    dbGet('settings','key=eq.venue_address'),
    dbGet('settings','key=eq.maps_url')
  ]).then(function(r){
    var html='';
    // FLYER
    html+='<div style="border:1px solid var(--border);border-radius:6px;padding:20px;margin-bottom:14px">';
    html+='<div class="stitle" style="margin-bottom:14px">🖼 Flyer del evento</div>';
    html+='<div class="fg"><label class="fl">Subir imagen desde tu computadora</label>';
    html+='<input type="file" accept="image/*" id="featFlyerFile" onchange="previewFlyer(this)" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--white);font-size:13px;padding:9px 12px;border-radius:4px;cursor:pointer"></div>';
    html+='<div id="flyerPreview" style="margin-bottom:12px">'+(r[0][0]&&r[0][0].value?'<img src="'+r[0][0].value+'" style="max-height:120px;border-radius:4px;border:1px solid var(--border)">':'')+'</div>';
    html+='<div class="fg"><label class="fl">O pegá una URL directamente</label>';
    html+='<input class="fi" id="featFlyer" value="'+(r[0][0]?r[0][0].value:'')+'" placeholder="https://i.imgur.com/..."></div>';
    html+='<button class="btn btn-red btn-sm" onclick="saveFlyer()">Guardar Flyer</button>';
    html+='</div>';
    // TICKETERA
    html+='<div style="border:1px solid var(--border);border-radius:6px;padding:20px;margin-bottom:14px">';
    html+='<div class="stitle" style="margin-bottom:14px">🎟 Link Ticketera</div>';
    html+='<div class="fg"><label class="fl">Link del botón rojo "Conseguí tu entrada"</label>';
    html+='<input class="fi" id="featTicket" value="'+(r[1][0]?r[1][0].value:'')+'" placeholder="https://passline.com/..."></div>';
    html+='<button class="btn btn-red btn-sm" onclick="saveField(\'ticket_url\',\'featTicket\')">Guardar Ticketera</button>';
    html+='</div>';
    // UBICACION
    html+='<div style="border:1px solid var(--border);border-radius:6px;padding:20px;margin-bottom:14px">';
    html+='<div class="stitle" style="margin-bottom:14px">📍 Ubicación del evento</div>';
    html+='<div class="fg"><label class="fl">Nombre del venue</label>';
    html+='<input class="fi" id="featVenueName" value="'+(r[2][0]?r[2][0].value:'')+'" placeholder="Melt Underground"></div>';
    html+='<div class="fg"><label class="fl">Dirección</label>';
    html+='<input class="fi" id="featVenueAddr" value="'+(r[3][0]?r[3][0].value:'')+'" placeholder="Uriarte · Palermo · Buenos Aires"></div>';
    html+='<div class="fg"><label class="fl">Link Google Maps</label>';
    html+='<input class="fi" id="featMapsUrl" value="'+(r[4][0]?r[4][0].value:'')+'" placeholder="https://maps.google.com/..."></div>';
    html+='<button class="btn btn-red btn-sm" onclick="saveUbicacion()">Guardar Ubicación</button>';
    html+='</div>';
    document.getElementById('admFeaturedForm').innerHTML=html;
  });
}

function previewFlyer(input){
  if(!input.files||!input.files[0])return;
  var file=input.files[0];
  var reader=new FileReader();
  reader.onload=function(e){
    document.getElementById('featFlyer').value=e.target.result;
    document.getElementById('flyerPreview').innerHTML='<img src="'+e.target.result+'" style="max-height:120px;border-radius:4px;border:1px solid var(--border);margin-top:8px">';
  };
  reader.readAsDataURL(file);
}

function saveFlyer(){
  var val=document.getElementById('featFlyer').value.trim();
  if(!val){alert('Seleccioná una imagen o pegá una URL');return;}
  dbUpsert('settings',{key:'flyer_url',value:val}).then(function(ok){
    if(ok){alert('Flyer guardado correctamente');loadPublic();}
    else{alert('Error al guardar. Verificá tu sesión.');}
  });
}

function saveField(key,inputId){
  var val=document.getElementById(inputId).value.trim();
  dbUpsert('settings',{key:key,value:val}).then(function(ok){
    if(ok){alert('Guardado correctamente');loadPublic();}
    else{alert('Error al guardar. Verificá tu sesión.');}
  });
}

function saveUbicacion(){
  var name=document.getElementById('featVenueName').value.trim();
  var addr=document.getElementById('featVenueAddr').value.trim();
  var maps=document.getElementById('featMapsUrl').value.trim();
  Promise.all([
    dbUpsert('settings',{key:'venue_name',value:name}),
    dbUpsert('settings',{key:'venue_address',value:addr}),
    dbUpsert('settings',{key:'maps_url',value:maps})
  ]).then(function(r){
    if(r[0]&&r[1]&&r[2]){alert('Ubicación guardada');loadPublic();}
    else{alert('Error al guardar.');}
  });
}

var _editCalId=null;

function rAdminCalendar(){
  var months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  dbGet('calendar','select=*&order=date.asc').then(function(cal){
    var html='';
    if(cal.length){
      cal.forEach(function(e){
        var label='Sin mes';
        if(e.date){var p=e.date.split('-');label=(p[1]?months[parseInt(p[1])-1]:'')+(p[0]?' '+p[0]:'');}
        html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border)">';
        html+='<div><strong style="font-size:15px">'+e.artist+'</strong>';
        html+='<span style="color:var(--red);font-size:12px;margin-left:12px">'+label+'</span></div>';
        html+='<div style="display:flex;gap:8px">';
        html+='<button onclick="editCalendar(\''+e.id+'\',\''+e.artist.replace(/'/g,"\\'")+'\',' +'\''+( e.date||'')+'\''+')" class="btn btn-ghost btn-xs">✎ Editar</button>';
        html+='<button onclick="delCalendar(\''+e.id+'\')" class="btn btn-ghost btn-xs" style="color:var(--muted)">✕</button>';
        html+='</div></div>';
      });
    } else {
      html='<div style="color:var(--muted);font-size:13px;padding:20px 0">Sin artistas. Usá el botón + para agregar.</div>';
    }
    document.getElementById('admCalList').innerHTML=html;
  });
}

function editCalendar(id,artist,date){
  _editCalId=id;
  document.getElementById('mCalTitle').textContent='Editar Artista';
  document.getElementById('calArtist').value=artist;
  document.getElementById('calDate').value=date;
  oM('mCal');
}

function saveCalendar(){
  var artist=document.getElementById('calArtist').value.trim();
  var date=document.getElementById('calDate').value;
  if(!artist){alert('Ingresá el nombre del artista');return;}
  var done=function(ok){
    if(ok){
      _editCalId=null;
      document.getElementById('mCalTitle').textContent='Agregar al Calendario';
      document.getElementById('calArtist').value='';
      document.getElementById('calDate').value='';
      cM('mCal');
      rAdminCalendar();
      loadPublic();
    } else {
      alert('Error al guardar. Verificá que estés logueado.');
    }
  };
  var dateVal=date?(date.length===7?date+'-01':date):'';
  if(_editCalId){
    dbPatch('calendar',_editCalId,{artist:artist,date:dateVal}).then(done);
  } else {
    var id='cal'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    dbInsert('calendar',{id:id,artist:artist,date:dateVal,status:'upcoming'}).then(done);
  }
}

function delCalendar(id){
  if(!confirm('Eliminar este artista del calendario?'))return;
  dbDelete('calendar',id).then(function(){rAdminCalendar();rAdminDash();loadPublic();});
}

/* ── PUBLIC ── */
function loadPublic(){
  Promise.all([
    dbGet('settings','key=eq.flyer_url'),
    dbGet('settings','key=eq.ticket_url')
  ]).then(function(results){
    var flyer=results[0];var ticket=results[1];
    var flyerUrl=flyer[0]?flyer[0].value:null;
    var ticketUrl=ticket[0]?ticket[0].value:null;
    var featEl=document.getElementById('featuredEvent');
    if(featEl && (flyerUrl || ticketUrl)){
      var flyerHtml=flyerUrl
        ?'<img src="'+flyerUrl+'" alt="Proximo evento" style="width:100%;height:100%;object-fit:contain;background:#000;">'
        :'<div style="min-height:500px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;"><span style="font-family:Bebas Neue,sans-serif;font-size:80px;color:#1a1a1a;">FP</span></div>';
      var btnHtml=ticketUrl
        ?'<a href="'+ticketUrl+'" target="_blank" class="event-cta" style="display:inline-flex;text-decoration:none;" data-text="Consegui tu entrada">Conseguí tu entrada<span class="event-cta-arrow">&#x2192;</span></a>'
        :'<span class="event-cta" style="opacity:0.35;cursor:default;" data-text="Proximamente">Próximamente</span>';
      featEl.innerHTML='<div class="event-card featured is-visible"><div class="event-card-img">'+flyerHtml+'</div></div><div style="text-align:center;padding:36px 0 52px;">'+btnHtml+'</div>';
    }
  }).catch(function(e){console.error('Featured load error',e);});

  // Update venue label if set
  Promise.all([
    dbGet('settings','key=eq.venue_name'),
    dbGet('settings','key=eq.venue_address'),
    dbGet('settings','key=eq.maps_url')
  ]).then(function(r){
    var name=r[0][0]?r[0][0].value:null;
    var addr=r[1][0]?r[1][0].value:null;
    var maps=r[2][0]?r[2][0].value:null;
    if(name){var el=document.querySelector('.map-label-venue');if(el)el.textContent=name;}
    if(addr){var el=document.querySelector('.map-label-addr');if(el)el.textContent=addr;}
    if(maps){var el=document.querySelector('.map-container');if(el)el.href=maps;}
  });

  dbGet('calendar','select=*&order=date.asc&status=eq.upcoming').then(function(cal){
    var listEl=document.getElementById('upcomingList');
    if(!listEl)return;
    var months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    var html='';
    if(cal.length){
      cal.forEach(function(e){
        var p=e.date?e.date.split('-'):[];
        var dateCol;
        if(p.length===3&&p[2]!=='01'){
          var day=parseInt(p[2],10);
          var mon=months[parseInt(p[1],10)-1];
          dateCol='<div class="upcoming-date">'+day+'</div><div class="upcoming-month">'+mon+'</div>';
        } else if(p.length===3||p.length===2){
          var mon=months[parseInt(p[1],10)-1];
          var yr="'"+p[0].slice(2);
          dateCol='<div class="upcoming-date" style="font-size:1.1rem;letter-spacing:.12em;">'+mon+'</div><div class="upcoming-month">'+yr+'</div>';
        } else {
          // sin fecha: badge "PRÓX" discreto
          dateCol='<div class="upcoming-date" style="font-size:.85rem;letter-spacing:.15em;opacity:.45;">PRÓX</div><div class="upcoming-month">&nbsp;</div>';
        }
        html+='<div class="upcoming-item is-visible">';
        html+='<div>'+dateCol+'</div>';
        html+='<div class="upcoming-divider"></div>';
        html+='<div class="upcoming-info"><div class="upcoming-artist">'+e.artist+'</div><div class="upcoming-venue">Próximamente</div></div>';
        html+='<div class="upcoming-status" style="border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.3);">TBA</div></div>';
      });
    } else {
      html='<div class="upcoming-item is-visible" style="opacity:0.3;"><div><div class="upcoming-date" style="font-size:.85rem;letter-spacing:.15em;">PRÓX</div><div class="upcoming-month">&nbsp;</div></div><div class="upcoming-divider"></div><div class="upcoming-info"><div class="upcoming-artist">Próximamente</div><div class="upcoming-venue">Por confirmar</div></div><div class="upcoming-status" style="border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.2);">TBA</div></div>';
    }
    listEl.innerHTML=html;
  }).catch(function(e){console.error('Calendar load error',e);});
}

/* ── BOOT ── */
checkSession().then(function(loggedIn){
  loadPublic();
  if(loggedIn){
    document.getElementById('publicView').style.display='none';
    document.getElementById('adminView').style.display='block';
    rAdminDash();
  }
});
