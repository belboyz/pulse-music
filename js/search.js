const PulseSearch = (() => {
  const YT_KEY = 'pulse_yt_api_key';
  const AUDIUS_KEY = 'pulse_audius_api_key';
  const getYTKey = () => localStorage.getItem(YT_KEY) || '';
  const setYTKey = v => v?.trim() ? localStorage.setItem(YT_KEY,v.trim()) : localStorage.removeItem(YT_KEY);
  const getAudiusKey = () => localStorage.getItem(AUDIUS_KEY) || '';
  const setAudiusKey = v => v?.trim() ? localStorage.setItem(AUDIUS_KEY,v.trim()) : localStorage.removeItem(AUDIUS_KEY);

  async function audius(q,{limit=20}={}) {
    const u = new URL('https://api.audius.co/v1/tracks/search');
    u.searchParams.set('query',q);
    u.searchParams.set('limit',String(limit));
    u.searchParams.set('app_name','PulseMusic');
    const key=getAudiusKey();
    if(key) u.searchParams.set('api_key',key);
    const r=await fetch(u);
    const d=await r.json();
    if(!r.ok) throw new Error(d?.message || 'Audius search error');
    return (d.data||[]).map(x=>({
      id:'au-'+x.id, source:'audio', audioId:x.id,
      title:x.title || 'Untitled', artist:x.user?.name || 'Unknown artist',
      duration:Number(x.duration)||0,
      art:x.artwork?.['480x480'] || x.artwork?.['150x150'] || x.user?.profile_picture?.['480x480'] || '',
      url:x.permalink || '', provider:'Audius'
    }));
  }

  async function youtube(q,{maxResults=12}={}) {
    const key=getYTKey();
    if(!key) return [];
    const u=new URL('https://www.googleapis.com/youtube/v3/search');
    u.search=new URLSearchParams({part:'snippet',q,type:'video',videoCategoryId:'10',maxResults:String(maxResults),regionCode:'ID',relevanceLanguage:'id',key}).toString();
    const r=await fetch(u); const d=await r.json();
    if(!r.ok) throw new Error(d?.error?.message || 'YouTube API error');
    return (d.items||[]).map(x=>({
      id:'yt-'+x.id.videoId, source:'video', videoId:x.id.videoId,
      title:x.snippet.title, artist:x.snippet.channelTitle,
      art:x.snippet.thumbnails?.high?.url||x.snippet.thumbnails?.medium?.url||x.snippet.thumbnails?.default?.url||'',
      url:`https://www.youtube.com/watch?v=${x.id.videoId}`, provider:'YouTube'
    }));
  }

  async function query(q,{source='all'}={}) {
    const jobs=[];
    if(source!=='video') jobs.push(audius(q));
    if(source!=='audio') jobs.push(youtube(q));
    const settled=await Promise.allSettled(jobs);
    const out=[];
    for(const s of settled) if(s.status==='fulfilled') out.push(...s.value);
    if(!out.length){
      const errors=settled.filter(x=>x.status==='rejected').map(x=>x.reason?.message).filter(Boolean);
      if(errors.length) throw new Error(errors.join(' · '));
    }
    return out;
  }
  return {query,getYTKey,setYTKey,getAudiusKey,setAudiusKey};
})();
window.PulseSearch=PulseSearch;
