const PulseLyrics=(()=>({
  async get(t){
    if(!t?.title)return null;
    const u=new URL('https://lrclib.net/api/get');
    u.searchParams.set('track_name',t.title);
    u.searchParams.set('artist_name',t.artist||'');
    const r=await fetch(u); if(!r.ok)return null; return await r.json();
  },
  parse(s){
    return String(s||'').split(/\n/).map(line=>{
      const m=line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
      return m?{time:Number(m[1])*60+Number(m[2]),text:m[3]}:{time:null,text:line.replace(/^\[[^\]]+\]\s*/,'')};
    }).filter(x=>x.text.trim());
  }
}))();
window.PulseLyrics=PulseLyrics;
