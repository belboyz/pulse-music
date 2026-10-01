const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const store={
  get(k,d){
    try{return JSON.parse(localStorage.getItem(k))??d}
    catch{return d}
  },
  set(k,v){
    localStorage.setItem(k,JSON.stringify(v))
  }
};

const state={
  view:'home',
  tab:'favorites',
  source:'all',
  favorites:store.get('pulse_favorites',[]),
  history:store.get('pulse_history',[]),
  queue:store.get('pulse_queue',[]),
  playlists:store.get('pulse_playlists',[]),
  current:null,
  playing:false,
  shuffle:store.get('pulse_shuffle',false),
  repeat:store.get('pulse_repeat',false),
  autoplay:store.get('pulse_autoplay',true),
  searchToken:0,
  lyricsLines:[]
};

const audio=$('#audio');

const icons=()=>{
  if(window.lucide&&lucide.createIcons){
    lucide.createIcons({attrs:{'stroke-width':1.8}});
  }
};

const esc=v=>String(v??'').replace(
  /[&<>"']/g,
  m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m])
);

const fmt=s=>
  Number.isFinite(Number(s))
    ? `${Math.floor(Math.max(0,Number(s))/60)}:${String(Math.floor(Math.max(0,Number(s))%60)).padStart(2,'0')}`
    :'0:00';

function toast(msg){
  const e=$('#toast');
  if(!e)return;
  e.textContent=msg;
  e.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>e.classList.remove('show'),1900);
}

function save(){
  for(const[k,v]of Object.entries({
    pulse_favorites:state.favorites,
    pulse_history:state.history,
    pulse_queue:state.queue,
    pulse_playlists:state.playlists,
    pulse_shuffle:state.shuffle,
    pulse_repeat:state.repeat,
    pulse_autoplay:state.autoplay
  })){
    store.set(k,v);
  }
}

function unique(a){
  return a.filter((x,i)=>a.findIndex(y=>y.id===x.id)===i);
}

function allKnown(){
  return unique([
    ...state.favorites,
    ...state.history,
    ...state.queue,
    ...(state.current?[state.current]:[])
  ]);
}

/* =========================================================
   YOUTUBE THUMBNAIL
   ========================================================= */

function youtubeThumb(videoId){
  if(!videoId)return '';

  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

function card(t,rail=false){
  const artwork=t.art||(
    t.videoId
      ? youtubeThumb(t.videoId)
      : ''
  );

  return `
    <div class="track" data-json="${encodeURIComponent(JSON.stringify(t))}">
      <div class="track-art">
        ${
          artwork
          ? `<img
              src="${esc(artwork)}"
              alt=""
              loading="lazy"
              onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${encodeURIComponent(t.videoId||'')}/mqdefault.jpg'"
            >`
          : '<i data-lucide="music-2"></i>'
        }
      </div>

      <button class="track-info" data-play="${esc(t.id)}">
        <b>${esc(t.title)}</b>
        <span>${esc(t.artist)}</span>
        <em>
          ${t.source==='video'?'YOUTUBE':'AUDIO'}
          ${t.duration?` · ${fmt(t.duration)}`:''}
        </em>
      </button>

      <button
        class="track-menu"
        data-like="${esc(t.id)}"
        aria-label="Like"
      >
        <i data-lucide="heart"></i>
      </button>
    </div>
  `;
}

function trackFrom(el,id){
  return allKnown().find(x=>x.id===id)
    ||JSON.parse(
      decodeURIComponent(
        el?.closest('.track')?.dataset.json||'null'
      )
    );
}

function empty(icon,title,desc){
  return `
    <div class="empty-state glass">
      <div class="empty-icon">
        <i data-lucide="${icon}"></i>
      </div>
      <h3>${esc(title)}</h3>
      <p>${esc(desc)}</p>
    </div>
  `;
}

/* =========================================================
   HOME
   ========================================================= */

function counts(){
  $('#favCount').textContent=`${state.favorites.length} songs`;
  $('#historyCount').textContent=`${state.history.length} songs`;
  $('#queueCount').textContent=`${state.queue.length} songs`;
}

function renderHome(){
  const rail=$('#recentList');
  const emptyBox=$('#homeEmpty');

  counts();

  if(state.history.length){
    rail.innerHTML=state.history
      .slice(0,10)
      .map(t=>card(t,true))
      .join('');

    rail.classList.add('has-content');
    emptyBox.classList.add('hidden');
  }else{
    rail.innerHTML='';
    rail.classList.remove('has-content');
    emptyBox.classList.remove('hidden');
  }

  icons();
}

/* =========================================================
   LIBRARY
   ========================================================= */

function renderLibrary(){
  const box=$('#libraryContent');

  let list=[];

  if(state.tab==='favorites'){
    list=state.favorites;
  }else if(state.tab==='history'){
    list=state.history;
  }

  $('#libraryTitle').textContent=
    state.tab==='favorites'
      ?'Liked Songs'
      :state.tab==='history'
        ?'History'
        :'Playlists';

  $$('.tab').forEach(x=>
    x.classList.toggle(
      'active',
      x.dataset.tab===state.tab
    )
  );

  if(state.tab==='playlists'){

    box.className='track-list';

    box.innerHTML=state.playlists.length
      ?state.playlists.map(p=>`
        <div class="track" data-playlist="${esc(p.id)}">

          <div class="track-art">
            <i data-lucide="list-music"></i>
          </div>

          <div class="track-info">
            <b>${esc(p.name)}</b>
            <span>${p.tracks.length} songs</span>
          </div>

          <button
            class="track-menu"
            data-delete-playlist="${esc(p.id)}"
            aria-label="Delete"
          >
            <i data-lucide="trash-2"></i>
          </button>

        </div>
      `).join('')
      :empty(
        'list-music',
        'No playlists yet',
        'Create a local playlist from here.'
      );

  }else{

    box.className='track-list';

    box.innerHTML=list.length
      ?list.map(card).join('')
      :empty(
        state.tab==='favorites'?'heart':'history',
        state.tab==='favorites'
          ?'No liked songs yet'
          :'History is empty',
        state.tab==='favorites'
          ?'Tap the heart on a track to save it.'
          :'Play a song and it will appear here.'
      );
  }

  $('#libFav').textContent=state.favorites.length;
  $('#libHistory').textContent=state.history.length;
  $('#libPlaylists').textContent=state.playlists.length;

  icons();
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function go(v){

  if(v==='player'){
    openPlayer();
    return;
  }

  state.view=v;

  $$('.view').forEach(x=>
    x.classList.toggle(
      'active',
      x.dataset.view===v
    )
  );

  $$('.nav-item').forEach(x=>
    x.classList.toggle(
      'active',
      x.dataset.nav===v
    )
  );

  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

  if(v==='search'){
    setTimeout(()=>{
      $('#searchInput')?.focus();
    },100);
  }
}

/* =========================================================
   SETTINGS
   ========================================================= */

function setTheme(t){

  localStorage.setItem(
    'pulse_theme',
    t
  );

  const actual=
    t==='system'
      ?(
        matchMedia(
          '(prefers-color-scheme:dark)'
        ).matches
          ?'dark'
          :'light'
      )
      :t;

  document.body.dataset.theme=actual;

  $('#themeValue').textContent=
    t[0].toUpperCase()+t.slice(1);
}

function setGlass(on){

  localStorage.setItem(
    'pulse_glass',
    on?'on':'off'
  );

  document.body.classList.toggle(
    'no-glass',
    !on
  );

  $('#glassSwitch').classList.toggle(
    'on',
    on
  );
}

/* =========================================================
   MINI PLAYER
   ========================================================= */

function updateMini(){

  const m=$('#miniPlayer');

  if(!state.current){
    m.classList.add('hidden');
    return;
  }

  m.classList.remove('hidden');

  $('#miniTitle').textContent=
    state.current.title;

  $('#miniArtist').textContent=
    state.current.artist;

  const art=
    state.current.art||
    (
      state.current.videoId
        ?youtubeThumb(state.current.videoId)
        :''
    );

  $('#miniArt').innerHTML=
    art
      ?`<img src="${esc(art)}" alt="" loading="lazy">`
      :'<i data-lucide="music-2"></i>';

  $('#miniPlay').innerHTML=
    `<i data-lucide="${state.playing?'pause':'play'}"></i>`;

  icons();
}

/* =========================================================
   MEDIA SESSION
   ========================================================= */

function metadata(t){

  if(!('mediaSession'in navigator)||!t)return;

  try{

    navigator.mediaSession.metadata=
      new MediaMetadata({
        title:t.title,
        artist:t.artist||'Unknown artist',
        album:t.album||t.provider||'Pulse',
        artwork:t.art
          ?[{src:t.art,sizes:'480x480'}]
          :[]
      });

    navigator.mediaSession.playbackState=
      state.playing
        ?'playing'
        :'paused';

  }catch{}
}

/* =========================================================
   PLAYER
   ========================================================= */

function renderPlayer(){

  const t=state.current;

  if(!t){
    updateMini();
    return;
  }

  $('#playerTitle').textContent=t.title;
  $('#playerArtist').textContent=t.artist;

  const art=
    t.art||
    (
      t.videoId
        ?youtubeThumb(t.videoId)
        :''
    );

  $('#playerArt').innerHTML=t.videoId
  ? `<img src="https://i.ytimg.com/vi/${encodeURIComponent(t.videoId)}/hqdefault.jpg" alt="">`
  : t.art
    ? `<img src="${esc(t.art)}" alt="">`
    : '<i data-lucide="music-2"></i>';

  $('#playerBackdrop').style.backgroundImage=
    art
      ?`url("${esc(art)}")`
      :'';

  $('#playBtn').innerHTML=
    `<i data-lucide="${state.playing?'pause':'play'}"></i>`;

  $('#favoriteBtn').classList.toggle(
    'active',
    state.favorites.some(
      x=>x.id===t.id
    )
  );

  $('#shuffleBtn').classList.toggle(
    'active',
    state.shuffle
  );

  $('#repeatBtn').classList.toggle(
    'active',
    state.repeat
  );

  $('#duration').textContent=
    fmt(audio.duration||t.duration);

  $('#videoBtn').classList.toggle(
    'hidden',
    !t.videoId
  );

  updateMini();
  icons();
}

function openPlayer(){

  if(!state.current){
    toast('Pilih lagu terlebih dahulu');
    return;
  }

  $('#playerSheet').classList.add('open');

  $('#playerSheet').setAttribute(
    'aria-hidden',
    'false'
  );

  renderPlayer();
}

function closePlayer(){

  $('#playerSheet').classList.remove('open');

  $('#playerSheet').setAttribute(
    'aria-hidden',
    'true'
  );
}

/* =========================================================
   HISTORY
   ========================================================= */

function addHistory(t){

  state.history=[
    t,
    ...state.history.filter(
      x=>x.id!==t.id
    )
  ].slice(0,50);

  save();
  renderHome();
  renderLibrary();
}

/* =========================================================
   AUDIUS AUDIO SOURCE
   ========================================================= */

function source(t){

  return `https://api.audius.co/v1/tracks/${encodeURIComponent(
    t.audioId
  )}/stream?app_name=PulseMusic`;
}

/* =========================================================
   PLAY AUDIO / YOUTUBE
   ========================================================= */

async function play(t){

  if(!t)return;

  /*
   * YouTube result:
   * langsung buka video YouTube,
   * bukan mencoba memutarnya sebagai audio.
   */
  if(t.source==='video'){
    showVideo(t);
    return;
  }

  if(!t.audioId){
    toast('Sumber audio tidak tersedia');
    return;
  }

  state.current=t;

  $('#ytPlayer').classList.add('hidden');
  $('#mediaArea').classList.add('hidden');

  audio.src=source(t);
  audio.load();

  addHistory(t);
  metadata(t);
  openPlayer();

  try{

    await audio.play();

  }catch{

    state.playing=false;
    renderPlayer();

    toast(
      'Tekan Play untuk memulai audio'
    );
  }
}

/* =========================================================
   YOUTUBE VIDEO PLAYER
   ========================================================= */

function showVideo(t){
    if(!t.videoId){
        toast('Video tidak tersedia');
        return;
    }

    state.current=t;
    state.playing=true;
    audio.pause();
    audio.removeAttribute('src');
    addHistory(t);
    openPlayer();

    $('#ytPlayer').classList.remove('hidden');
    $('#mediaArea').classList.add('hidden');

    $('#ytPlayer').innerHTML=`<iframe src="https://www.yout-ube.com/embed/${encodeURIComponent(t.videoId)}?autoplay=1&playsinline=1&rel=0" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;

    renderPlayer();
}

/* =========================================================
   PLAY / NEXT / PREVIOUS
   ========================================================= */

function togglePlay(){

  if(!state.current){
    toast('Pilih lagu terlebih dahulu');
    return;
  }

  /*
   * YouTube memiliki kontrol player sendiri.
   */
  if(state.current.source==='video'){
    toast('Video menggunakan kontrol YouTube');
    return;
  }

  if(audio.paused){
    audio.play().catch(()=>
      toast('Audio tidak dapat diputar')
    );
  }else{
    audio.pause();
  }
}

function next(){

  const list=
    state.queue.length
      ?state.queue
      :state.history;

  if(!list.length)return;

  let t;

  if(state.shuffle){

    t=list[
      Math.floor(
        Math.random()*list.length
      )
    ];

  }else{

    const i=list.findIndex(
      x=>x.id===state.current?.id
    );

    t=list[
      (i+1+list.length)%list.length
    ];
  }

  if(t)play(t);
}

function prev(){

  if(audio.currentTime>5){
    audio.currentTime=0;
    return;
  }

  const i=
    state.history.findIndex(
      x=>x.id===state.current?.id
    );

  if(i>=0&&state.history[i+1]){
    play(state.history[i+1]);
  }
}

/* =========================================================
   LIKE
   ========================================================= */

function like(t){

  if(!t)return;

  const i=
    state.favorites.findIndex(
      x=>x.id===t.id
    );

  if(i>=0){

    state.favorites.splice(i,1);

    toast(
      'Removed from liked songs'
    );

  }else{

    state.favorites.unshift(t);

    toast(
      'Added to liked songs'
    );
  }

  save();
  renderHome();
  renderLibrary();
  renderPlayer();
}

/* =========================================================
   SEARCH
   ========================================================= */

async function search(q){

  const box=$('#searchResults');
  const emptyBox=$('#searchEmpty');

  if(!q){

    box.innerHTML='';

    emptyBox.classList.remove(
      'hidden'
    );

    $('#searchStatus').textContent='';

    icons();
    return;
  }

  const token=
    ++state.searchToken;

  emptyBox.classList.add(
    'hidden'
  );

  box.innerHTML=
    empty(
      'loader',
      'Searching',
      'Getting fresh results…'
    );

  $('#searchStatus').textContent='';

  icons();

  try{

    const data=
      await PulseSearch.query(
        q,
        {source:state.source}
      );

    if(
      token!==state.searchToken
    )return;

    $('#searchStatus').textContent=
      `${data.length} results`;

    box.innerHTML=
      data.length
        ?data.map(card).join('')
        :empty(
          'search-x',
          'No results',
          'Try another title or artist.'
        );

    icons();

  }catch(e){

    if(
      token!==state.searchToken
    )return;

    box.innerHTML=
      empty(
        'triangle-alert',
        'Search unavailable',
        e.message
      );

    icons();
  }
}

/* =========================================================
   LYRICS
   ========================================================= */

function lyrics(){

  if(!state.current)return;

  const a=$('#mediaArea');

  a.classList.remove('hidden');

  $('#ytPlayer').classList.add(
    'hidden'
  );

  a.innerHTML=`
    <div class="lyrics">

      <div class="lyrics-head">
        <b>Lyrics</b>
        <span>LRCLIB</span>
      </div>

      <p>Loading…</p>

    </div>
  `;

  PulseLyrics
    .get(state.current)
    .then(l=>{

      if(!l){

        a.innerHTML=`
          <div class="lyrics">
            <p>
              Lyrics not found for this track.
            </p>
          </div>
        `;

        return;
      }

      state.lyricsLines=
        PulseLyrics.parse(
          l.syncedLyrics||
          l.plainLyrics||
          ''
        );

      a.innerHTML=`
        <div class="lyrics">

          <div class="lyrics-head">
            <b>
              ${esc(
                l.trackName||
                state.current.title
              )}
            </b>

            <span>
              ${esc(
                l.artistName||
                state.current.artist
              )}
            </span>
          </div>

          <div class="lyrics-body">

            ${state.lyricsLines.map(
              (x,i)=>`
                <p
                  class="lyric-line"
                  data-i="${i}"
                  data-time="${x.time??''}">
                  ${esc(x.text)}
                </p>
              `
            ).join('')}

          </div>

        </div>
      `;
    });
}

/* =========================================================
   DIALOG
   ========================================================= */

function dialog(html){

  $('#dialogContent').innerHTML=html;

  $('#dialog').classList.add(
    'open'
  );

  $('#dialog').setAttribute(
    'aria-hidden',
    'false'
  );

  icons();
}

function closeDialog(){

  $('#dialog').classList.remove(
    'open'
  );

  $('#dialog').setAttribute(
    'aria-hidden',
    'true'
  );
}

/* =========================================================
   EVENT BINDING
   ========================================================= */

function bind(){

  document.addEventListener(
    'click',
    e=>{

      const nav=
        e.target.closest('[data-nav]');

      if(nav){
        go(nav.dataset.nav);
        return;
      }

      if(
        e.target.closest(
          '[data-close-player]'
        )
      ){
        closePlayer();
        return;
      }

      if(
        e.target.closest(
          '[data-close-dialog]'
        )
      ){
        closeDialog();
        return;
      }

      const p=
        e.target.closest('[data-play]');

      if(p){

        const t=
          trackFrom(
            p,
            p.dataset.play
          );

        if(t)play(t);

        return;
      }

      const l=
        e.target.closest('[data-like]');

      if(l){

        like(
          trackFrom(
            l,
            l.dataset.like
          )
        );

        return;
      }

      const tab=
        e.target.closest('[data-tab]');

      if(tab){

        state.tab=
          tab.dataset.tab;

        renderLibrary();

        return;
      }

      const q=
        e.target.closest('[data-action]');

      if(q){

        state.tab=
          q.dataset.action==='favorites'
            ?'favorites'
            :q.dataset.action==='history'
              ?'history'
              :'history';

        go('library');
        renderLibrary();

        return;
      }

      const del=
        e.target.closest(
          '[data-delete-playlist]'
        );

      if(del){

        state.playlists=
          state.playlists.filter(
            x=>
              x.id!==
              del.dataset.deletePlaylist
          );

        save();
        renderLibrary();

        toast(
          'Playlist deleted'
        );

        return;
      }

    }
  );

  /* Top search */
  $('#topSearch').onclick=
    ()=>go('search');

  /* Player */
  $('#navPlayer').onclick=
    openPlayer;

  $('#miniOpen').onclick=
    openPlayer;

  $('#miniPlay').onclick=
    togglePlay;

  $('#miniPrev').onclick=
    prev;

  $('#playBtn').onclick=
    togglePlay;

  $('#prevBtn').onclick=
    prev;

  $('#nextBtn').onclick=
    next;

  $('#shuffleBtn').onclick=()=>{
    state.shuffle=
      !state.shuffle;

    save();
    renderPlayer();
  };

  $('#repeatBtn').onclick=()=>{
    state.repeat=
      !state.repeat;

    save();
    renderPlayer();
  };

  $('#favoriteBtn').onclick=()=>{
    like(state.current);
  };

  $('#lyricsBtn').onclick=
    lyrics;

  $('#videoBtn').onclick=()=>{
    state.current?.videoId
      ?showVideo(state.current)
      :toast('No video available');
  };

  $('#queueBtn').onclick=()=>{
    dialog(`
      <h2>Queue</h2>
      <p>
        ${
          state.queue.length
            ?state.queue
              .map(
                x=>esc(x.title)
              )
              .join('<br>')
            :'Queue is empty.'
        }
      </p>
    `);
  };

  /* Theme */
  $('#themeBtn').onclick=()=>{

    const cur=
      localStorage.getItem(
        'pulse_theme'
      )||'system';

    setTheme(
      cur==='system'
        ?'light'
        :cur==='light'
          ?'dark'
          :'system'
    );
  };

  $('#themeSetting').onclick=
    ()=>$('#themeBtn').click();

  /* Glass */
  $('#glassSetting').onclick=()=>{
    setGlass(
      localStorage.getItem(
        'pulse_glass'
      )!=='on'
    );
  };

  /* Autoplay */
  $('#autoplaySetting').onclick=()=>{

    state.autoplay=
      !state.autoplay;

    save();

    $('#autoplaySwitch')
      .classList.toggle(
        'on',
        state.autoplay
      );
  };

  /* Crossfade */
  $('#crossfadeSetting').onclick=
    ()=>toast(
      'Crossfade UI siap; audio engine belum menerapkan overlap stream'
    );

  /* Sleep timer */
  $('#sleepSetting').onclick=
    ()=>toast(
      'Sleep timer dapat ditambahkan pada tahap berikutnya'
    );

  /* Search proxy */
  $('#proxySetting').onclick=()=>{

    dialog(`
      <h2>Search proxy</h2>

      <p>
        Worker saat ini sudah dipasang sebagai default.
        Kamu tetap bisa menggantinya.
      </p>

      <input
        id="proxyInput"
        class="dialog-input"
        value="${esc(
          PulseSearch.getProxy()
        )}"
        placeholder="https://your-worker.example"
      >

      <div class="dialog-actions">

        <button data-close-dialog>
          Cancel
        </button>

        <button
          class="confirm"
          id="saveProxy">
          Save
        </button>

      </div>
    `);
  };

  /* New playlist */
  $('#newPlaylistBtn').onclick=()=>{

    dialog(`
      <h2>New playlist</h2>

      <p>
        Nama playlist disimpan lokal di perangkat ini.
      </p>

      <input
        id="playlistName"
        class="dialog-input"
        placeholder="Night Drive"
      >

      <div class="dialog-actions">

        <button data-close-dialog>
          Cancel
        </button>

        <button
          class="confirm"
          id="createPlaylist">
          Create
        </button>

      </div>
    `);
  };

  /* Clear data */
  $('#clearData').onclick=()=>{

    if(
      confirm(
        'Hapus semua data Pulse di perangkat ini?'
      )
    ){

      [
        'pulse_favorites',
        'pulse_history',
        'pulse_queue',
        'pulse_playlists'
      ].forEach(
        k=>localStorage.removeItem(k)
      );

      location.reload();
    }
  };
}

/* =========================================================
   DIALOG ACTIONS
   ========================================================= */

$('#dialog').addEventListener(
  'click',
  e=>{

    if(e.target.id==='saveProxy'){

      PulseSearch.setProxy(
        $('#proxyInput').value
      );

      $('#proxyValue').textContent=
        PulseSearch.getProxy()
          ?'Cloudflare Worker'
          :'Not configured';

      closeDialog();

      toast(
        'Search proxy saved'
      );
    }

    if(e.target.id==='createPlaylist'){

      const n=
        $('#playlistName')
          .value
          .trim();

      if(n){

        state.playlists.push({
          id:crypto.randomUUID(),
          name:n,
          tracks:[]
        });

        save();
        closeDialog();
        renderLibrary();

        toast(
          'Playlist created'
        );
      }
    }
  }
);

/* =========================================================
   SEARCH INPUT
   ========================================================= */

$('#searchInput').addEventListener(
  'input',
  ()=>{

    const q=
      $('#searchInput')
        .value
        .trim();

    $('#clearSearch')
      .classList.toggle(
        'hidden',
        !q
      );

    clearTimeout(
      window.__searchTimer
    );

    window.__searchTimer=
      setTimeout(
        ()=>search(q),
        300
      );
  }
);

$('#clearSearch').onclick=()=>{

  $('#searchInput').value='';

  $('#clearSearch')
    .classList.add('hidden');

  search('');
};

$$('.source-tab').forEach(
  b=>b.onclick=()=>{

    state.source=
      b.dataset.source;

    $$('.source-tab').forEach(
      x=>
        x.classList.toggle(
          'active',
          x===b
        )
    );

    const q=
      $('#searchInput')
        .value
        .trim();

    if(q)search(q);
  }
);

/* =========================================================
   AUDIO PROGRESS
   ========================================================= */

$('#progressRange').oninput=e=>{

  if(audio.duration){

    audio.currentTime=
      audio.duration*
      Number(e.target.value)/
      1000;
  }
};

audio.ontimeupdate=()=>{

  if(audio.duration){

    const p=
      audio.currentTime/
      audio.duration*
      1000;

    $('#progressRange').value=p;

    $('#miniProgress')
      .style.width=
      `${p/10}%`;

    $('#currentTime')
      .textContent=
      fmt(audio.currentTime);

    $$('.lyric-line')
      .forEach(
        (el,i)=>{

          const t=
            Number(
              el.dataset.time
            );

          const n=
            Number(
              state.lyricsLines[
                i+1
              ]?.time??Infinity
            );

          el.classList.toggle(
            'active',
            Number.isFinite(t)&&
            audio.currentTime>=t&&
            audio.currentTime<n
          );
        }
      );
  }
};

audio.onloadedmetadata=
  renderPlayer;

audio.onplay=()=>{

  state.playing=true;

  renderPlayer();

  metadata(
    state.current
  );
};

audio.onpause=()=>{

  state.playing=false;

  renderPlayer();

  metadata(
    state.current
  );
};

audio.onended=()=>{

  if(state.repeat){

    audio.currentTime=0;
    audio.play();

  }else if(state.autoplay){

    next();
  }
};

/* =========================================================
   MEDIA SESSION
   ========================================================= */

if('mediaSession'in navigator){

  for(
    const[a,f]of[
      ['play',togglePlay],
      ['pause',togglePlay],
      ['nexttrack',next],
      ['previoustrack',prev],
      [
        'seekbackward',
        ()=>{
          audio.currentTime=
            Math.max(
              0,
              audio.currentTime-10
            );
        }
      ],
      [
        'seekforward',
        ()=>{
          audio.currentTime=
            Math.min(
              audio.duration||0,
              audio.currentTime+10
            );
        }
      ]
    ]
  ){

    try{
      navigator.mediaSession
        .setActionHandler(
          a,
          f
        );
    }catch{}
  }
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

function init(){

  const t=
    localStorage.getItem(
      'pulse_theme'
    )||'system';

  setTheme(t);

  setGlass(
    localStorage.getItem(
      'pulse_glass'
    )!=='off'
  );

  $('#autoplaySwitch')
    .classList.toggle(
      'on',
      state.autoplay
    );

  $('#proxyValue').textContent=
    PulseSearch.getProxy()
      ?'Cloudflare Worker'
      :'Not configured';

  const h=
    new Date().getHours();

  $('#greetingLabel').textContent=
    h<12
      ?'GOOD MORNING'
      :h<18
        ?'GOOD AFTERNOON'
        :'GOOD EVENING';

  renderHome();
  renderLibrary();
  bind();
  icons();

  if(
    'serviceWorker'in navigator
  ){

    navigator.serviceWorker
      .register(
        './service-worker.js'
      )
      .catch(()=>{});
  }
}

init();
