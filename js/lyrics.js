const PulseLyrics = (() => {
  const base='https://lrclib.net/api';
  async function get(track){
    if(!track?.title || !track?.artist) return null;
    const u=new URL(base+'/get');
    u.searchParams.set('track_name',track.title);u.searchParams.set('artist_name',track.artist);
    if(track.album)u.searchParams.set('album_name',track.album);
    if(track.duration)u.searchParams.set('duration',Math.round(track.duration));
    const r=await fetch(u); if(r.status===404)return null; if(!r.ok)throw new Error('Lyrics service error'); return r.json();
  }
  function parse(s){return String(s||'').split('\n').map((line,i)=>{const m=line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);return m?{time:Number(m[1])*60+Number(m[2]),text:m[3]}:{time:null,text:line.replace(/^\[[^\]]+\]\s*/,'')};}).filter(x=>x.text.trim());}
  return {get,parse};
})(); window.PulseLyrics=PulseLyrics;
