const PulseSearch = (() => {
  const KEY = 'pulse_yt_api_key';
  const getKey = () => localStorage.getItem(KEY) || '';
  const setKey = key => key ? localStorage.setItem(KEY,key.trim()) : localStorage.removeItem(KEY);
  async function query(q,{maxResults=20}={}) {
    const key=getKey();
    if(!key) throw new Error('API_KEY_MISSING');
    const url=new URL('https://www.googleapis.com/youtube/v3/search');
    url.search=new URLSearchParams({part:'snippet',q,type:'video',videoCategoryId:'10',maxResults:String(maxResults),regionCode:'ID',relevanceLanguage:'id',key}).toString();
    const res=await fetch(url);
    const data=await res.json();
    if(!res.ok) throw new Error(data?.error?.message || 'YouTube API error');
    return (data.items||[]).map(x=>({id:'yt-'+x.id.videoId,videoId:x.id.videoId,title:x.snippet.title,artist:x.snippet.channelTitle,channelId:x.snippet.channelId,description:x.snippet.description,art:x.snippet.thumbnails?.high?.url||x.snippet.thumbnails?.medium?.url||x.snippet.thumbnails?.default?.url,url:`https://www.youtube.com/watch?v=${x.id.videoId}`,publishedAt:x.snippet.publishedAt}));
  }
  return {query,getKey,setKey};
})();
window.PulseSearch=PulseSearch;
