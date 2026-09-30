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

  const timeout = setTimeout(() => {
    controller.abort();
  }, 7000);

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
    .filter(item => {
      return item &&
        item.type === 'video' &&
        item.videoId;
    })
    .slice(0, 30)
    .map(item => ({
      videoId: item.videoId,
      title: item.title || '',
      author: item.author || '',

      thumbnail:
        item.videoThumbnails?.find(
          thumbnail => thumbnail.quality === 'medium'
        )?.url ||
        item.videoThumbnails?.[0]?.url ||
        '',

      duration: Number(item.lengthSeconds || 0),

      publishedText:
        item.publishedText || '',

      viewCount:
        Number(item.viewCount || 0)
    }));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    /*
     * Handle CORS preflight
     */
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS
      });
    }

    /*
     * Worker status page
     */
    if (url.pathname === '/') {
      return json({
        ok: true,
        service: 'Pulse Music Search Proxy',
        endpoint: '/search?q=...',
        instances: INSTANCES.length
      });
    }

    /*
     * Only /search is supported
     */
    if (url.pathname !== '/search') {
      return json({
        error: 'Use /search?q=...'
      }, 404);
    }

    /*
     * Only GET requests are supported
     */
    if (request.method !== 'GET') {
      return json({
        error: 'Method not allowed'
      }, 405);
    }

    /*
     * Get search query
     */
    const query = url.searchParams.get('q')?.trim();

    if (!query) {
      return json({
        error: 'Missing q'
      }, 400);
    }

    /*
     * Try all configured Invidious instances.
     *
     * Promise.any() means the first successful
     * instance is used.
     */
    try {
      const result = await Promise.any(
        INSTANCES.map(async instance => {
          const data = await searchInstance(
            instance,
            query
          );

          return {
            instance,
            data
          };
        })
      );

      /*
       * Convert Invidious response into the
       * format expected by Pulse Music.
       */
      const results = normalizeResults(
        result.data
      );

      return json({
        query,
        results
      }, 200, {
        'Cache-Control': 'public, max-age=60'
      });

    } catch (error) {

      /*
       * Every configured instance failed.
       */
      return json({
        error:
          'Search instances are temporarily unavailable.',

        message:
          'All configured Invidious instances failed or timed out.'
      }, 502);
    }
  }
};
