# Pulse Music v7

Major Liquid Glass redesign of Pulse Music PWA.

## Features
- Redesigned Home, Search, Library and Settings
- Liquid Glass surfaces and adaptive artwork player styling
- Mini player + full-screen player
- Favorites, history, queue and local playlists
- LRCLIB lyrics with synced highlighting
- Media Session controls for supported audio streams
- YouTube video playback through the official embedded player
- Audius background-capable audio source
- PWA/service worker
- Cloudflare Worker search proxy (`proxy/worker.js`)
- GitHub Pages Actions deployment

## Search proxy
GitHub Pages is static, so it cannot execute a backend proxy. Deploy `proxy/worker.js` to Cloudflare Workers (or an equivalent serverless runtime), then open Pulse → Settings → Search proxy and paste the Worker URL.

The proxy only handles search metadata. YouTube video playback remains in the official embedded player. This project does not implement ad bypass, anti-adblock circumvention, DRM circumvention, or YouTube audio extraction.

## Local test
Use an HTTP server rather than `file://`:

`python3 -m http.server 8080`

Then open `http://localhost:8080/`.
