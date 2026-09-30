const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
const state={
  view:'home',tab:'favorites',source:'all',
  favorites:store.get('pulse_favorites',[]),history:store.get('pulse_history',[]),
  queue:store.get('pulse_queue',[]),playlists:store.get('pulse_playlists',[]),
  current:null,playing:false,shuffle:false,repeat:false,autoplay:true,
  searchToken:0,videoVisible:false,lyricsLines:[]
};
const audio=$('#audio');

function icons(){window.lucide&&lucide.createIcons({attrs:{'stroke-width':1.8}})}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),1800)}
function save(){store.set('pulse_favorites',state.favorites);store.set('pulse_history',state.history);store.set('pulse_queue',state.queue);store.set('pulse_playlists',state.playlists)}
function fmt(sec){if(!Number.isFinite(sec))return '0:00';sec=Math.max(0,Math.floor(sec));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
function addHistory(t){state.history=[t,...state.history.filter(x=>x.id!==t.id)].slice(0,50);save();renderHome();renderLibrary()}
function card(t){
  const badge=t.source==='audio'?'BACKGROUND AUDIO':'YOUTUBE VIDEO';
  return `<div class="track" data-id="${esc(t.id)}" data-json="${encodeURIComponent(JSON.stringify(t))}">
    <div class="track-art">${t.art?`<img src="${esc(t.art)}" alt="">`:'<i data-lucide="music-2"></i>'}</div>
    <button class="track-info" data-play="${esc(t.id)}"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span><em>${badge}</em></button>
    <button class="track-menu" data-more="${esc(t.id)}" aria-label="More"><i data-lucide="more-horizontal"></i></button>
  </div>`
}
function allKnown(){return [...state.favorites,...state.history,...state.queue].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i)}
function findTrack(id,el){return allKnown().find(x=>x.id===id)||JSON.parse(decodeURIComponent(el?.closest('.track')?.dataset.json||'null'))}
function renderHome(){
  const a=state.history.slice(0,8), box=$('#recentList');
  box.className=a.length?'track-list':'track-list empty-state';
  box.innerHTML=a.length?a.map(card).join(''):'<i data-lucide="music"></i><p>Belum ada musik.</p><small>Gunakan Search untuk mencari lagu.</small>';
  $('#favCount').textContent=state.favorites.length;$('#historyCount').textContent=state.history.length;$('#queueCount').textContent=state.queue.length;icons();
}
function renderLibrary(){
  const box=$('#libraryContent');
  if(state.tab==='favorites'){
    box.className=state.favorites.length?'track-list':'track-list empty-state';
    box.innerHTML=state.favorites.length?state.favorites.map(card).join(''):'<i data-lucide="heart"></i><p>Belum ada favorit.</p>';
  }else if(state.tab==='history'){
    box.className=state.history.length?'track-list':'track-list empty-state';
    box.innerHTML=state.history.length?state.history.map(card).join(''):'<i data-lucide="history"></i><p>History masih kosong.</p>';
  }else{
    box.className=state.playlists.length?'playlist-list':'track-list empty-state';
    box.innerHTML=state.playlists.length?state.playlists.map(p=>`<button class="playlist-card" data-pl="${esc(p.id)}"><i data-lucide="list-music"></i><span>${esc(p.name)}</span><small>${p.tracks.length} track</small></button>`).join(''):'<i data-lucide="list-music"></i><p>Belum ada playlist.</p>';
  }
  icons();
}
function go(view){
  if(view==='player'){openPlayer();return}
  state.view=view;$$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));$$('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.nav===view));window.scrollTo(0,0);
  if(view==='search')setTimeout(()=>$('#searchInput').focus(),80);
}
function updateMini(){
  const m=$('#miniPlayer');
  if(!state.current){m.classList.add('hidden');return}
  m.classList.remove('hidden');
  $('#miniTitle').textContent=state.current.title;$('#miniArtist').textContent=state.current.artist;
  $('#miniPlayer .mini-art').innerHTML=state.current.art?`<img src="${esc(state.current.art)}" alt="">`:'<i data-lucide="music-2"></i>';
  $('#miniPlay').innerHTML=`<i data-lucide="${state.playing?'pause':'play'}"></i>`;
  icons();
}
function updatePlayer(){
  const t=state.current;
  if(!t){updateMini();return}
  $('#playerTitle').textContent=t.title;$('#playerArtist').textContent=t.artist;
  $('#playerArt').innerHTML=t.art?`<img src="${esc(t.art)}" alt="">`:'<i data-lucide="music-2"></i>';
  $('#playBtn').innerHTML=`<i data-lucide="${state.playing?'pause':'play'}"></i>`;
  $('#favoriteBtn').classList.toggle('active',state.favorites.some(x=>x.id===t.id));
  $('#duration').textContent=fmt(audio.duration);
  updateMini();icons();
}
function openPlayer(){$('#playerSheet').classList.add('open');$('#playerSheet').setAttribute('aria-hidden','false');updatePlayer()}
function closePlayer(){$('#playerSheet').classList.remove('open');$('#playerSheet').setAttribute('aria-hidden','true')}
function toggleFav(t=state.current){
  if(!t)return;const i=state.favorites.findIndex(x=>x.id===t.id);
  if(i>=0){state.favorites.splice(i,1);toast('Removed from favorites')}else{state.favorites.unshift(t);toast('Added to favorites')}
  save();renderHome();renderLibrary();updatePlayer();
}
async function search(v){
  const box=$('#searchResults');
  if(!v){box.className='track-list empty-state';box.innerHTML='<i data-lucide="search"></i><p>Mulai mencari musik</p><small>Ketik judul atau nama artis.</small>';icons();return}
  const token=++state.searchToken;box.className='track-list loading';box.innerHTML='<div class="search-loading"><span></span><span></span><span></span><p>Mencari musik…</p></div>';
  try{
    const data=await PulseSearch.query(v,{source:state.source});
    if(token!==state.searchToken)return;
    box.className='track-list';box.innerHTML=data.length?data.map(card).join(''):'<div class="empty-state"><i data-lucide="search-x"></i><p>Tidak ada hasil</p><small>Coba kata kunci lain.</small></div>';icons();
  }catch(e){
    if(token!==state.searchToken)return;
    box.className='track-list empty-state';box.innerHTML=`<i data-lucide="triangle-alert"></i><p>Pencarian gagal</p><small>${esc(e.message)}</small>`;icons();
  }
}
function setMediaMetadata(t){
  if(!('mediaSession' in navigator))return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist||'Unknown artist',album:t.provider||'Pulse',artwork:t.art?[{src:t.art,sizes:'480x480',type:'image/jpeg'}]:[]});
    navigator.mediaSession.playbackState=state.playing?'playing':'paused';
  }catch{}
}
function playAudio(t){
  if(!t?.audioId){toast('Track ini adalah video YouTube. Tekan Video untuk memutarnya.');return}
  state.current=t;state.videoVisible=false;$('#ytPlayer').classList.add('hidden');$('#mediaArea').classList.add('hidden');
  const src=`https://api.audius.co/v1/tracks/${encodeURIComponent(t.audioId)}/stream?app_name=PulseMusic`;
  audio.src=src;audio.load();addHistory(t);setMediaMetadata(t);openPlayer();
  audio.play().then(()=>{state.playing=true;setMediaMetadata(t);updatePlayer()}).catch(()=>{state.playing=false;updatePlayer();toast('Tekan Play untuk memulai audio')});
}
function showVideo(t){
  if(!t?.videoId){toast('Hasil ini bukan video YouTube yang dapat diputar di Pulse Music.');return}
  state.current=t;state.videoVisible=true;openPlayer();$('#ytPlayer').classList.remove('hidden');
  $('#ytPlayer').innerHTML=`<iframe src="https://www.youtube.com/embed/${encodeURIComponent(t.videoId)}?playsinline=1&rel=0" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  toast('Video YouTube dibuka');
}
function play(t){if(!t)return;if(t.source==='audio')playAudio(t);else showVideo(t)}
function togglePlay(){
  if(!state.current){toast('Pilih lagu terlebih dahulu');return}
  if(state.current.source==='audio'){
    if(audio.paused) audio.play().then(()=>{state.playing=true;setMediaMetadata(state.current);updatePlayer()}).catch(()=>toast('Audio tidak dapat diputar'));
    else {audio.pause();state.playing=false;setMediaMetadata(state.current);updatePlayer()}
  }else{toast('Gunakan tombol Video untuk track YouTube')}
}
function next(){
  let list=state.queue.length?state.queue:state.history;
  if(!list.length)return;
  let i=list.findIndex(x=>x.id===state.current?.id), n;
  if(state.shuffle)n=list[Math.floor(Math.random()*list.length)];
  else n=list[(i+1+list.length)%list.length];
  if(n)play(n);
}
function prev(){
  if(audio.currentTime>5){audio.currentTime=0;return}
  const list=state.history,i=list.findIndex(x=>x.id===state.current?.id),n=list[i+1];if(n)play(n);
}
function addQueue(){
  if(!state.current)return;state.queue=[...state.queue.filter(x=>x.id!==state.current.id),state.current];save();renderHome();toast('Added to queue');
}
async function showLyrics(){
  if(!state.current)return;
  const area=$('#mediaArea');area.classList.remove('hidden');$('#ytPlayer').classList.add('hidden');
  area.innerHTML='<div class="lyrics"><div class="lyrics-head"><b>Lyrics</b><span>LRCLIB</span></div><p>Loading lyrics…</p></div>';
  try{
    const l=await PulseLyrics.get(state.current);
    if(!l){area.innerHTML='<div class="lyrics"><div class="lyrics-head"><b>Lyrics</b></div><p>Lyrics tidak ditemukan.</p></div>';return}
    state.lyricsLines=PulseLyrics.parse(l.syncedLyrics||l.plainLyrics||'');
    area.innerHTML=`<div class="lyrics"><div class="lyrics-head"><b>${esc(l.trackName||state.current.title)}</b><span>${esc(l.artistName||state.current.artist)}</span></div><div class="lyrics-body">${state.lyricsLines.map((x,i)=>`<p class="lyric-line" data-li="${i}" data-time="${x.time??''}">${esc(x.text)}</p>`).join('')}</div></div>`;
  }catch{area.innerHTML='<div class="lyrics"><p>Lyrics gagal dimuat.</p></div>'}
}
function newPlaylist(t){
  const name=prompt('Nama playlist:');if(!name?.trim())return;
  state.playlists.push({id:'pl-'+Date.now(),name:name.trim(),tracks:t?[t]:[]});save();renderLibrary();toast('Playlist dibuat');
}
function openPlaylist(id){
  const p=state.playlists.find(x=>x.id===id);if(!p)return;
  $('#libraryContent').className=p.tracks.length?'track-list':'track-list empty-state';
  $('#libraryContent').innerHTML=p.tracks.length?p.tracks.map(card).join(''):`<i data-lucide="list-music"></i><p>${esc(p.name)} kosong.</p>`;icons();
}
let searchTimer;
$('#searchInput').addEventListener('input',e=>{const v=e.target.value.trim();$('#clearSearch').classList.toggle('hidden',!v);clearTimeout(searchTimer);searchTimer=setTimeout(()=>search(v),400)});
$('#clearSearch').onclick=()=>{$('#searchInput').value='';$('#clearSearch').classList.add('hidden');search('')};

document.addEventListener('click',e=>{
  const n=e.target.closest('[data-nav]');if(n)go(n.dataset.nav);
  const p=e.target.closest('[data-play]');if(p){const t=findTrack(p.dataset.play,p);if(t)play(t)}
  const more=e.target.closest('[data-more]');if(more){const t=findTrack(more.dataset.more,more);if(t){const a=prompt(`Track: ${t.title}\n\nf = favorite\nq = queue\np = playlist`);if(a==='f')toggleFav(t);if(a==='q'){state.queue=[...state.queue.filter(x=>x.id!==t.id),t];save();renderHome();toast('Added to queue')}if(a==='p')newPlaylist(t)}}
  const pl=e.target.closest('[data-pl]');if(pl)openPlaylist(pl.dataset.pl);
  const quick=e.target.closest('[data-action]');if(quick){go('library');state.tab=quick.dataset.action;$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===state.tab));renderLibrary()}
});
$('#favoriteBtn').onclick=()=>toggleFav();
$('#openPlayer').onclick=openPlayer;
$('#miniPlay').onclick=togglePlay;
$('#miniPrev').onclick=prev;
$('#playBtn').onclick=togglePlay;
$('#nextBtn').onclick=next;
$('#prevBtn').onclick=prev;
$('#queueBtn').onclick=addQueue;
$('#lyricsBtn').onclick=showLyrics;
$('#videoBtn').onclick=()=>{if(state.current?.videoId)showVideo(state.current);else toast('Track audio ini tidak memiliki video YouTube.')};
$('#shuffleBtn').onclick=()=>{state.shuffle=!state.shuffle;$('#shuffleBtn').classList.toggle('active',state.shuffle)};
$('#repeatBtn').onclick=()=>{state.repeat=!state.repeat;$('#repeatBtn').classList.toggle('active',state.repeat)};
$$('[data-close-player]').forEach(x=>x.onclick=closePlayer);
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.tab=b.dataset.tab;renderLibrary()});
$$('.source-tab').forEach(b=>b.onclick=()=>{$$('.source-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.source=b.dataset.source;const q=$('#searchInput').value.trim();if(q)search(q)});
$('#themeBtn').onclick=()=>{document.documentElement.classList.toggle('light');localStorage.setItem('pulse_theme',document.documentElement.classList.contains('light')?'light':'dark');syncAppearance()};
function syncAppearance(){$('#appearanceSwitch').classList.toggle('on',!document.documentElement.classList.contains('light'))}
$('#appearanceSwitch').onclick=()=>{$('#themeBtn').click()};
$('#autoplaySwitch').onclick=e=>{state.autoplay=!state.autoplay;e.currentTarget.classList.toggle('on',state.autoplay)};
$('#audiusKeyBtn').onclick=()=>{const k=prompt('Audius API key (opsional):',PulseSearch.getAudiusKey());if(k!==null){PulseSearch.setAudiusKey(k);toast(k.trim()?'Audius key tersimpan':'Audius key dihapus')}};
$('#clearData').onclick=()=>{if(confirm('Hapus semua data lokal Pulse?')){['pulse_favorites','pulse_history','pulse_queue','pulse_playlists','pulse_yt_api_key','pulse_audius_api_key','pulse_brave_api_key'].forEach(k=>localStorage.removeItem(k));location.reload()}};
$('#progressRange').oninput=e=>{if(audio.duration)audio.currentTime=(Number(e.target.value)/1000)*audio.duration};
audio.addEventListener('timeupdate',()=>{if(audio.duration)$('#progressRange').value=(audio.currentTime/audio.duration)*1000;$('#currentTime').textContent=fmt(audio.currentTime);setMediaMetadata(state.current)});
audio.addEventListener('loadedmetadata',updatePlayer);
audio.addEventListener('play',()=>{state.playing=true;setMediaMetadata(state.current);updatePlayer()});
audio.addEventListener('pause',()=>{state.playing=false;setMediaMetadata(state.current);updatePlayer()});
audio.addEventListener('ended',()=>{state.playing=false;if(state.repeat){audio.currentTime=0;audio.play();return}if(state.autoplay)next();else updatePlayer()});
audio.addEventListener('error',()=>{state.playing=false;updatePlayer();toast('Audio source tidak dapat diputar. Coba track lain.')});

if('mediaSession' in navigator){
  const actions={play:()=>togglePlay(),pause:()=>{if(!audio.paused)audio.pause()},previoustrack:()=>prev(),nexttrack:()=>next(),seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-10),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10),seekto:d=>{if(d.fastSeek&&audio.fastSeek)audio.fastSeek(d.seekTime);else audio.currentTime=d.seekTime}};
  for(const [name,fn] of Object.entries(actions)){try{navigator.mediaSession.setActionHandler(name,fn)}catch{}}
}

if(localStorage.getItem('pulse_theme')==='light')document.documentElement.classList.add('light');
syncAppearance();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}));
renderHome();renderLibrary();icons();
setInterval(()=>{if(!state.lyricsLines.length||audio.paused)return;let idx=-1;state.lyricsLines.forEach((x,i)=>{if(x.time!=null&&x.time<=audio.currentTime)idx=i});$$('.lyric-line').forEach((e,i)=>e.classList.toggle('active',i===idx));const a=$('.lyric-line.active');if(a)a.scrollIntoView({block:'center',behavior:'smooth'})},700);
