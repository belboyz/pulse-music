const INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yt.chocolatemoo53.com',
  'https://invidious.tiekoetter.com',
  'https://invidious.f5.si',
  'https://inv.miningtcup.me'
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });

async function searchInstance(base, query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const url = new URL('/api/v1/search', base);
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'video');
    url.searchParams.set('sort_by', 'relevance');
    url.searchParams.set('region', 'ID');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid Invidious response');
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeResults(data) {
  return data
    .filter(item => item && item.type === 'video' && item.videoId)
    .slice(0, 30)
    .map(item => ({
      videoId: item.videoId,
      title: item.title || '',
      author: item.author || '',
      thumbnail:
        item.videoThumbnails?.find(t => t.quality === 'medium')?.url ||
        item.videoThumbnails?.[0]?.url ||
        '',
      duration: Number(item.lengthSeconds || 0),
      publishedText: item.publishedText || '',
      viewCount: Number(item.viewCount || 0)
    }));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS
      });
    }

    if (url.pathname === '/') {
      return json({
        ok: true,
        service: 'Pulse Music Search Proxy',
        endpoint: '/search?q=...',
        instances: INSTANCES.length
      });
    }

    if (url.pathname !== '/search') {
      return json({
        error: 'Use /search?q=...'
      }, 404);
    }

    if (request.method !== 'GET') {
      return json({
        error: 'Method not allowed'
      }, 405);
    }

    const query = url.searchParams.get('q')?.trim();

    if (!query) {
      return json({
        error: 'Missing q'
      }, 400);
    }

    try {
      const results = await Promise.any(
        INSTANCES.map(async instance => {
          const data = await searchInstance(instance, query);
          return {
            instance,
            data
          };
        })
      );

      return json({
        query,
        results: normalizeResults(results.data)
      }, 200, {
        'Cache-Control': 'public, max-age=60'
      });
    } catch {
      return json({
        error: 'Search instances are temporarily unavailable.',
        message: 'All configured Invidious instances failed or timed out.'
      }, 502);
    }
  }
};
