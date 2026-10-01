const WORKER_URL =
  'https://pulse-music-search.7dfwjtvpzn.workers.dev';

const YOUTUBE_EMBED =
  'https://www.youtube-nocookie.com/embed/';

let currentTrack = null;
let currentIndex = -1;
let queue = [];
let isPlaying = false;
let youtubePlayer = null;
let youtubeReady = false;
let youtubeApiLoading = false;

const audio = document.getElementById('audio');

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================
   YOUTUBE IFRAME API
========================================================= */

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    youtubeReady = true;
    return Promise.resolve();
  }

  if (youtubeApiLoading) {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(check);
          youtubeReady = true;
          resolve();
        }
      }, 100);
    });
  }

  youtubeApiLoading = true;

  return new Promise(resolve => {
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      youtubeReady = true;

      if (typeof previousReady === 'function') {
        previousReady();
      }

      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    document.head.appendChild(script);
  });
}

async function createYouTubePlayer(videoId, autoplay = true) {
  if (!videoId) return;

  await loadYouTubeAPI();

  const container = $('youtubePlayer');

  if (!container) {
    console.warn('youtubePlayer element tidak ditemukan.');
    return;
  }

  if (youtubePlayer) {
    try {
      youtubePlayer.destroy();
    } catch (_) {}

    youtubePlayer = null;
  }

  container.innerHTML = '';

  const playerElement = document.createElement('div');
  playerElement.id = 'youtube-player-frame';

  container.appendChild(playerElement);

  youtubePlayer = new YT.Player('youtube-player-frame', {
    videoId,

    playerVars: {
      autoplay: autoplay ? 1 : 0,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      controls: 1,
      enablejsapi: 1
    },

    events: {
      onReady(event) {
        youtubeReady = true;

        if (autoplay) {
          try {
            event.target.playVideo();
          } catch (_) {}
        }

        updatePlayerButtons();
      },

      onStateChange(event) {
        if (!window.YT) return;

        if (event.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
        }

        if (event.data === YT.PlayerState.PAUSED) {
          isPlaying = false;
        }

        if (event.data === YT.PlayerState.ENDED) {
          isPlaying = false;
          playNext();
        }

        updatePlayerButtons();
      },

      onError(error) {
        console.warn(
          'YouTube Player Error:',
          error?.data
        );

        isPlaying = false;
        updatePlayerButtons();
      }
    }
  });
}

/* =========================================================
   THUMBNAIL
========================================================= */

function getYouTubeThumbnail(videoId, suppliedThumbnail = '') {
  if (suppliedThumbnail) {
    return suppliedThumbnail;
  }

  if (!videoId) {
    return '';
  }

  return `https://i.ytimg.com/vi/${encodeURIComponent(
    videoId
  )}/hqdefault.jpg`;
}

function thumbnailHTML(track, className = '') {
  const videoId = track.videoId || track.id || '';

  const thumbnail = getYouTubeThumbnail(
    videoId,
    track.thumbnail || track.thumbnailUrl || ''
  );

  if (!thumbnail) {
    return `
      <div class="${className} track-thumbnail-placeholder">
        <span>♪</span>
      </div>
    `;
  }

  const fallback =
    `https://i.ytimg.com/vi/${encodeURIComponent(
      videoId
    )}/hqdefault.jpg`;

  return `
    <img
      class="${className}"
      src="${escapeHTML(thumbnail)}"
      data-fallback="${escapeHTML(fallback)}"
      alt="${escapeHTML(track.title || 'YouTube video')}"
      loading="lazy"
      onerror="
        if (this.dataset.fallback && this.src !== this.dataset.fallback) {
          this.src = this.dataset.fallback;
        } else {
          this.style.display='none';
        }
      "
    >
  `;
}

/* =========================================================
   SEARCH
========================================================= */

async function searchYouTube(query) {
  const q = String(query || '').trim();

  if (!q) return [];

  const url =
    `${WORKER_URL}/search?q=${encodeURIComponent(q)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(
      `Search gagal (${response.status})`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.results)) {
    return [];
  }

  return data.results.map(item => ({
    videoId: item.videoId,
    id: item.videoId,
    title: item.title || '',
    author: item.author || '',
    thumbnail: getYouTubeThumbnail(
      item.videoId,
      item.thumbnail || ''
    ),
    duration: Number(item.duration || 0),
    publishedText: item.publishedText || '',
    viewCount: Number(item.viewCount || 0)
  }));
}

/* =========================================================
   RENDER SEARCH RESULTS
========================================================= */

function renderSearchResults(results) {
  const container =
    $('searchResults') ||
    $('results') ||
    $('musicResults');

  if (!container) return;

  if (!results.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Tidak ada hasil ditemukan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = results.map((track, index) => {
    return `
      <article
        class="track-card"
        data-track-index="${index}"
      >

        <div class="track-art">
          ${thumbnailHTML(
            track,
            'track-thumbnail'
          )}
        </div>

        <div class="track-info">
          <h3>
            ${escapeHTML(track.title)}
          </h3>

          <p>
            ${escapeHTML(track.author)}
          </p>
        </div>

        <button
          class="track-play-button"
          type="button"
          data-play-index="${index}"
          aria-label="Play ${escapeHTML(track.title)}"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>

      </article>
    `;
  }).join('');

  container.querySelectorAll(
    '[data-play-index]'
  ).forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();

      const index =
        Number(button.dataset.playIndex);

      const track = results[index];

      if (track) {
        playTrack(track);
      }
    });
  });

  container.querySelectorAll(
    '[data-track-index]'
  ).forEach(card => {
    card.addEventListener('click', event => {
      if (
        event.target.closest(
          '[data-play-index]'
        )
      ) {
        return;
      }

      const index =
        Number(card.dataset.trackIndex);

      const track = results[index];

      if (track) {
        playTrack(track);
      }
    });
  });
}

/* =========================================================
   PLAY TRACK
========================================================= */

async function playTrack(track) {
  if (!track || !track.videoId) {
    console.warn(
      'Track tidak mempunyai videoId.'
    );
    return;
  }

  currentTrack = track;

  const existingIndex =
    queue.findIndex(
      item =>
        item.videoId === track.videoId
    );

  if (existingIndex === -1) {
    queue.push(track);
    currentIndex = queue.length - 1;
  } else {
    currentIndex = existingIndex;
  }

  updateMiniPlayer();
  updateFullPlayer();

  /*
   * Karena sumber lagu sekarang adalah VIDEO YOUTUBE,
   * playback diarahkan langsung ke YouTube Player.
   */

  openYouTubePlayer();

  await createYouTubePlayer(
    track.videoId,
    true
  );

  saveHistory(track);
}

/* =========================================================
   OPEN YOUTUBE PLAYER
========================================================= */

function openYouTubePlayer() {
  const playerSheet =
    $('playerSheet') ||
    $('fullPlayer') ||
    $('playerModal');

  if (playerSheet) {
    playerSheet.classList.add('active');
    playerSheet.classList.add('open');
    playerSheet.setAttribute(
      'aria-hidden',
      'false'
    );
  }

  const videoContainer =
    $('youtubePlayer');

  if (videoContainer) {
    videoContainer.classList.add(
      'visible'
    );
  }
}

/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlayPause() {
  if (!youtubePlayer) {
    if (currentTrack) {
      playTrack(currentTrack);
    }

    return;
  }

  try {
    const state =
      youtubePlayer.getPlayerState();

    if (
      state === YT.PlayerState.PLAYING
    ) {
      youtubePlayer.pauseVideo();
      isPlaying = false;
    } else {
      youtubePlayer.playVideo();
      isPlaying = true;
    }

    updatePlayerButtons();
  } catch (error) {
    console.warn(
      'Tidak dapat mengontrol YouTube Player:',
      error
    );
  }
}

/* =========================================================
   NEXT / PREVIOUS
========================================================= */

function playNext() {
  if (!queue.length) return;

  let nextIndex =
    currentIndex + 1;

  if (nextIndex >= queue.length) {
    nextIndex = 0;
  }

  currentIndex = nextIndex;

  const nextTrack =
    queue[currentIndex];

  if (nextTrack) {
    playTrack(nextTrack);
  }
}

function playPrevious() {
  if (!queue.length) return;

  let previousIndex =
    currentIndex - 1;

  if (previousIndex < 0) {
    previousIndex =
      queue.length - 1;
  }

  currentIndex =
    previousIndex;

  const previousTrack =
    queue[currentIndex];

  if (previousTrack) {
    playTrack(previousTrack);
  }
}

/* =========================================================
   PLAYER UI
========================================================= */

function updateMiniPlayer() {
  if (!currentTrack) return;

  const title =
    $('miniTitle');

  const artist =
    $('miniArtist');

  const artwork =
    $('miniArtwork');

  if (title) {
    title.textContent =
      currentTrack.title || '';
  }

  if (artist) {
    artist.textContent =
      currentTrack.author || '';
  }

  if (artwork) {
    const thumbnail =
      getYouTubeThumbnail(
        currentTrack.videoId,
        currentTrack.thumbnail
      );

    artwork.src = thumbnail;
    artwork.onerror = () => {
      artwork.src =
        `https://i.ytimg.com/vi/${encodeURIComponent(
          currentTrack.videoId
        )}/hqdefault.jpg`;
    };
  }

  const miniPlayer =
    $('miniPlayer');

  if (miniPlayer) {
    miniPlayer.classList.add(
      'visible'
    );

    miniPlayer.classList.add(
      'active'
    );
  }
}

function updateFullPlayer() {
  if (!currentTrack) return;

  const title =
    $('playerTitle') ||
    $('fullPlayerTitle');

  const artist =
    $('playerArtist') ||
    $('fullPlayerArtist');

  const artwork =
    $('playerArtwork') ||
    $('fullPlayerArtwork');

  if (title) {
    title.textContent =
      currentTrack.title || '';
  }

  if (artist) {
    artist.textContent =
      currentTrack.author || '';
  }

  if (artwork) {
    artwork.src =
      getYouTubeThumbnail(
        currentTrack.videoId,
        currentTrack.thumbnail
      );
  }

  updatePlayerButtons();
}

function updatePlayerButtons() {
  const buttons =
    document.querySelectorAll(
      '[data-player-play], .player-play'
    );

  buttons.forEach(button => {
    button.setAttribute(
      'aria-label',
      isPlaying
        ? 'Pause'
        : 'Play'
    );

    button.classList.toggle(
      'playing',
      isPlaying
    );

    const playIcon =
      button.querySelector(
        '.play-icon'
      );

    const pauseIcon =
      button.querySelector(
        '.pause-icon'
      );

    if (playIcon) {
      playIcon.style.display =
        isPlaying
          ? 'none'
          : '';
    }

    if (pauseIcon) {
      pauseIcon.style.display =
        isPlaying
          ? ''
          : 'none';
    }
  });
}

/* =========================================================
   HISTORY
========================================================= */

function saveHistory(track) {
  try {
    const key =
      'pulse-history';

    const existing =
      JSON.parse(
        localStorage.getItem(key) ||
        '[]'
      );

    const filtered =
      existing.filter(
        item =>
          item.videoId !==
          track.videoId
      );

    filtered.unshift({
      videoId: track.videoId,
      title: track.title,
      author: track.author,
      thumbnail:
        getYouTubeThumbnail(
          track.videoId,
          track.thumbnail
        ),
      playedAt:
        Date.now()
    });

    localStorage.setItem(
      key,
      JSON.stringify(
        filtered.slice(0, 100)
      )
    );
  } catch (error) {
    console.warn(
      'History gagal disimpan:',
      error
    );
  }
}

/* =========================================================
   CLOSE PLAYER
========================================================= */

function closePlayer() {
  const playerSheet =
    $('playerSheet') ||
    $('fullPlayer') ||
    $('playerModal');

  if (playerSheet) {
    playerSheet.classList.remove(
      'active'
    );

    playerSheet.classList.remove(
      'open'
    );

    playerSheet.setAttribute(
      'aria-hidden',
      'true'
    );
  }

  /*
   * Jangan destroy player ketika sheet
   * ditutup agar playback dapat diteruskan.
   */
}

/* =========================================================
   SEARCH FORM
========================================================= */

function setupSearch() {
  const form =
    $('searchForm');

  const input =
    $('searchInput');

  if (!form || !input) {
    return;
  }

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const query =
        input.value.trim();

      if (!query) return;

      const container =
        $('searchResults') ||
        $('results') ||
        $('musicResults');

      if (container) {
        container.innerHTML = `
          <div class="loading-state">
            Mencari...
          </div>
        `;
      }

      try {
        const results =
          await searchYouTube(
            query
          );

        renderSearchResults(
          results
        );
      } catch (error) {
        console.error(
          error
        );

        if (container) {
          container.innerHTML = `
            <div class="error-state">
              <p>
                Pencarian gagal.
              </p>
              <small>
                ${escapeHTML(
                  error.message
                )}
              </small>
            </div>
          `;
        }
      }
    }
  );
}

/* =========================================================
   PLAYER BUTTON EVENTS
========================================================= */

function setupPlayerControls() {
  document.addEventListener(
    'click',
    event => {
      const playButton =
        event.target.closest(
          '[data-player-play], .player-play'
        );

      if (playButton) {
        event.preventDefault();
        togglePlayPause();
        return;
      }

      const nextButton =
        event.target.closest(
          '[data-player-next], .player-next'
        );

      if (nextButton) {
        event.preventDefault();
        playNext();
        return;
      }

      const previousButton =
        event.target.closest(
          '[data-player-previous], .player-previous'
        );

      if (previousButton) {
        event.preventDefault();
        playPrevious();
        return;
      }

      const closeButton =
        event.target.closest(
          '[data-player-close], .player-close'
        );

      if (closeButton) {
        event.preventDefault();
        closePlayer();
      }
    }
  );
}

/* =========================================================
   MINI PLAYER
========================================================= */

function setupMiniPlayer() {
  document.addEventListener(
    'click',
    event => {
      const mini =
        event.target.closest(
          '#miniPlayer'
        );

      if (!mini) return;

      if (
        event.target.closest(
          '[data-mini-play]'
        )
      ) {
        togglePlayPause();
        return;
      }

      if (
        event.target.closest(
          '[data-mini-next]'
        )
      ) {
        playNext();
        return;
      }

      if (
        event.target.closest(
          '[data-mini-previous]'
        )
      ) {
        playPrevious();
        return;
      }

      if (
        !event.target.closest(
          'button'
        )
      ) {
        openYouTubePlayer();

        if (
          currentTrack &&
          !youtubePlayer
        ) {
          createYouTubePlayer(
            currentTrack.videoId,
            isPlaying
          );
        }
      }
    }
  );
}

/* =========================================================
   MEDIA SESSION
========================================================= */

function setupMediaSession() {
  if (
    !('mediaSession' in navigator)
  ) {
    return;
  }

  try {
    navigator.mediaSession.setActionHandler(
      'play',
      () => {
        if (youtubePlayer) {
          youtubePlayer.playVideo();
        }
      }
    );

    navigator.mediaSession.setActionHandler(
      'pause',
      () => {
        if (youtubePlayer) {
          youtubePlayer.pauseVideo();
        }
      }
    );

    navigator.mediaSession.setActionHandler(
      'nexttrack',
      () => {
        playNext();
      }
    );

    navigator.mediaSession.setActionHandler(
      'previoustrack',
      () => {
        playPrevious();
      }
    );
  } catch (error) {
    console.warn(
      'Media Session tidak tersedia:',
      error
    );
  }
}

function updateMediaSession() {
  if (
    !('mediaSession' in navigator) ||
    !currentTrack
  ) {
    return;
  }

  try {
    navigator.mediaSession.metadata =
      new MediaMetadata({
        title:
          currentTrack.title || '',
        artist:
          currentTrack.author || '',
        album:
          'Pulse Music',
        artwork: [
          {
            src:
              getYouTubeThumbnail(
                currentTrack.videoId,
                currentTrack.thumbnail
              ),
            sizes:
              '480x360',
            type:
              'image/jpeg'
          }
        ]
      });
  } catch (_) {}
}

/* =========================================================
   WATCH CURRENT TRACK
========================================================= */

function observeTrack() {
  if (!youtubePlayer) return;

  try {
    const state =
      youtubePlayer.getPlayerState();

    isPlaying =
      state ===
      YT.PlayerState.PLAYING;

    updatePlayerButtons();
  } catch (_) {}
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {
    setupSearch();
    setupPlayerControls();
    setupMiniPlayer();
    setupMediaSession();

    /*
     * Audio element lama tidak digunakan
     * untuk hasil YouTube. YouTube Player
     * menjadi sumber playback utama.
     */
    if (audio) {
      audio.pause();
    }

    /*
     * Jika HTML sudah mempunyai container
     * youtubePlayer, biarkan kosong sampai
     * pengguna memilih lagu.
     */
    const youtubeContainer =
      $('youtubePlayer');

    if (youtubeContainer) {
      youtubeContainer.innerHTML = '';
    }

    setInterval(
      observeTrack,
      1000
    );
  }
);

/* =========================================================
   GLOBAL HELPERS
========================================================= */

window.PulseMusic = {
  searchYouTube,
  playTrack,
  playNext,
  playPrevious,
  togglePlayPause,
  closePlayer,
  createYouTubePlayer
};
