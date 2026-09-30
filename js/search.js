const PulseSearch=(()=>{
 const AUDIO='https://api.audius.co/v1/tracks/search', KEY='pulse_search_proxy';
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 async function json(url){const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Search service returned ${r.status}`);return r.json()}
 async function audio(q){const u=new URL(AUDIO);u.searchParams.set('query',q);u.searchParams.set('limit','20');u.searchParams.set('app_name','PulseMusic');const d=await json(u);return(d.data||[]).map(t=>({id:`audius:${t.id}`,audioId:t.id,source:'audio',title:t.title||'Untitled',artist:t.user?.name||'Unknown artist',album:t.playlist_name||'',art:t.artwork?.['480x480']||t.artwork?.['150x150']||'',provider:'Audius',duration:t.duration||0}))}
 async function video(q){const base=(localStorage.getItem(KEY)||'').replace(/\/$/,'');if(!base)throw new Error('YouTube search proxy belum dikonfigurasi. Buka Settings → Search proxy.');const d=await json(`${base}/search?q=${encodeURIComponent(q)}`);const rows=Array.isArray(d)?d:(d.results||[]);return rows.map(v=>({id:`youtube:${v.videoId||v.id}`,videoId:v.videoId||v.id,source:'video',title:v.title||'Untitled',artist:v.author||'YouTube',art:v.thumbnail||v.videoThumbnails?.[0]?.url||'',provider:'YouTube'})).filter(x=>x.videoId)}
 async function query(q,{source='all'}={}){q=clean(q);if(!q)return[];if(source==='audio')return audio(q);if(source==='video')return video(q);const [a,v]=await Promise.allSettled([audio(q),video(q)]);return[...(a.status==='fulfilled'?a.value:[]),...(v.status==='fulfilled'?v.value:[])].slice(0,40)}
 return{query,getProxy:()=>localStorage.getItem(KEY)||'',setProxy(v){v=clean(v);v?localStorage.setItem(KEY,v):localStorage.removeItem(KEY)}};
})();
