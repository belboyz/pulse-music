const PulseSearch = (() => {
  const AUDIUS_KEY = 'pulse_audius_api_key';

  // Public Invidious instances currently listed by the official documentation.
  // The search engine tries them in order and falls back when one is unavailable.
  const INVIDIOUS_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://yt.chocolatemoo53.com',
    'https://invidious.tiekoetter.com',
    'https://invidious.f5.si'
  ];

  const getAudiusKey = () => localStorage.getItem(AUDIUS_KEY) || '';
  const setAudiusKey = v => v?.trim()
    ? localStorage.setItem(AUDIUS_KEY, v.trim())
    : localStorage.removeItem(AUDIUS_KEY);

  async function fetchJSON(url, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const r = await fetch(url, {...options, signal: controller.signal});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || d?.message || `HTTP ${r.status}`);
      return d;
    } finally {
      clearTimeout(timer);
    }
  }

  async function audius(q, {limit = 20} = {}) {
    const u = new URL('https://api.audius.co/v1/tracks/search');
    u.searchParams.set('query', q);
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('app_name', 'PulseMusic');
    const key = getAudiusKey();
    if (key) u.searchParams.set('api_key', key);

    const d = await fetchJSON(u.toString());
    return (d.data || []).map(x => ({
      id: 'au-' + x.id,
      source: 'audio',
      audioId: x.id,
      title: x.title || 'Untitled',
      artist: x.user?.name || 'Unknown artist',
      duration: Number(x.duration) || 0,
      art: x.artwork?.['480x480'] || x.artwork?.['150x150'] || x.user?.profile_picture?.['480x480'] || '',
      url: x.permalink || '',
      provider: 'Audius'
    }));
  }

  async function invidious(q, {count = 20, page = 1} = {}) {
    const errors = [];

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const u = new URL(instance + '/api/v1/search');
        // Invidious supports YouTube-like search filters. Keep the query focused
        // on videos because Pulse uses these results as its YouTube video catalog.
        u.searchParams.set('q', q);
        u.searchParams.set('page', String(page));
        u.searchParams.set('type', 'video');
        u.searchParams.set('region', 'ID');
        u.searchParams.set('hl', 'id');

        const d = await fetchJSON(u.toString(), {
          headers: {Accept: 'application/json'}
        });

        const results = (Array.isArray(d) ? d : [])
          .filter(x => x?.type === 'video' && x?.videoId)
          .slice(0, count)
          .map(x => ({
            id: 'yt-' + x.videoId,
            source: 'video',
            videoId: x.videoId,
            title: x.title || 'Untitled',
            artist: x.author || 'YouTube',
            duration: Number(x.lengthSeconds) || 0,
            art: bestThumbnail(x.videoThumbnails),
            url: `https://www.youtube.com/watch?v=${encodeURIComponent(x.videoId)}`,
            provider: 'Invidious / YouTube',
            description: x.description || '',
            views: Number(x.viewCount) || 0,
            publishedText: x.publishedText || ''
          }));

        // Remember the working instance for the current session.
        sessionStorage.setItem('pulse_invidious_instance', instance);
        return results;
      } catch (e) {
        errors.push(`${new URL(instance).hostname}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
      }
    }

    throw new Error('Semua server pencarian Invidious tidak merespons. Coba lagi beberapa saat.');
  }

  function bestThumbnail(list = []) {
    if (!Array.isArray(list) || !list.length) return '';
    const preferred = ['maxres', 'high', 'medium', 'default'];
    for (const q of preferred) {
      const found = list.find(x => x?.quality === q && x?.url);
      if (found) return found.url;
    }
    return list.find(x => x?.url)?.url || '';
  }

  async function query(q, {source = 'all'} = {}) {
    const jobs = [];
    if (source !== 'video') jobs.push(audius(q));
    if (source !== 'audio') jobs.push(invidious(q));

    const settled = await Promise.allSettled(jobs);
    const out = [];
    const errors = [];
    for (const s of settled) {
      if (s.status === 'fulfilled') out.push(...s.value);
      else if (s.reason?.message) errors.push(s.reason.message);
    }

    // Put YouTube/Invidious results first for the video tab, while keeping
    // background-audio results available in All.
    if (source === 'all') {
      out.sort((a, b) => (a.source === 'video' ? -1 : 1) - (b.source === 'video' ? -1 : 1));
    }

    if (!out.length && errors.length) throw new Error(errors.join(' · '));
    return out;
  }

  return {
    query,
    getAudiusKey,
    setAudiusKey,
    getInvidiousInstances: () => [...INVIDIOUS_INSTANCES]
  };
})();

window.PulseSearch = PulseSearch;
