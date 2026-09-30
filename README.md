# Pulse Music — Final

Static PWA music interface for GitHub Pages with a Cloudflare Worker search proxy.

## Upload
Upload the **contents of this folder** to the root of the GitHub repository. Do not create an extra `pulse-music-main` folder inside the repository.

## Search
The frontend is preconfigured to use:

`https://pulse-music-search.7dfwjtvpzn.workers.dev`

The Worker proxies YouTube catalog search through available Invidious instances.

## Cloudflare Worker
The Worker source is in `proxy/worker.js` and its Wrangler configuration is `proxy/wrangler.jsonc`.

If Cloudflare Workers Builds is already connected to the repository, keep its Root directory set to `/proxy` and deploy with:

`npx wrangler deploy`

## GitHub Pages
The included `.github/workflows/deploy.yml` deploys the repository root to GitHub Pages.

## Features
- Liquid Glass responsive UI
- Home, Search, Library and Settings
- Floating mobile navigation
- Mini player and full player
- Local favorites/history/queue/playlists
- Lyrics via LRCLIB
- YouTube video playback via official embed
- Audius audio playback for background-capable audio
- Media Session controls where supported
- PWA/service-worker caching

YouTube video playback is kept separate from background audio; the PWA does not bypass YouTube ads, DRM, or playback restrictions.
