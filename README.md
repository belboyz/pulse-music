# Pulse Music v7.1

Pulse Music is a personal music-player PWA with a full Liquid Glass redesign.

## v7.1 redesign
- Mobile-first Liquid Glass visual system
- Large editorial Home hero with layered artwork treatment
- Floating glass navigation with centered player button
- Floating mini-player above navigation
- Redesigned Search with All / Audio / YouTube filters
- Search proxy preconfigured for the deployed Pulse Cloudflare Worker
- Redesigned Library with collection stats and tabs
- Redesigned Settings cards and switches
- Full player sheet with artwork, progress, controls, lyrics, queue and video
- Responsive desktop layout
- Favorites, history, queue and local playlists
- LRCLIB lyrics with synced highlighting
- Media Session controls for supported audio streams
- Audius audio playback for legitimate background-capable audio
- YouTube video playback through the official embedded player
- PWA/service worker with cache version bumped for v7.1

## Search proxy
The frontend uses this Cloudflare Worker by default:

`https://pulse-music-search.7dfwjtvpzn.workers.dev`

You can change it from **Settings → Search proxy**.

The proxy handles search metadata only. YouTube playback remains in the official embedded player. This project does not implement ad bypass, anti-adblock circumvention, DRM circumvention, or YouTube audio extraction.

## GitHub Pages
Upload the repository contents to the root of your GitHub repository and keep the existing GitHub Pages Actions workflow.

## Cloudflare Worker
`proxy/wrangler.jsonc` uses `worker.js` as its entry point. Deploy the `proxy` directory with the existing Workers Builds configuration.

## Local test
Use an HTTP server rather than `file://`:

`python3 -m http.server 8080`

Then open `http://localhost:8080/`.
