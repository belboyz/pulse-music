# Pulse v2 — Personal Music PWA

Version 2 adds real YouTube catalog search, a richer player, video playback, LRCLIB lyrics, favorites/history/queue, and local playlists.

## 1. YouTube search setup
The static site uses the official YouTube Data API v3 from the browser. Create a Google Cloud project, enable **YouTube Data API v3**, create an API key, then open Pulse → Settings → YouTube Data API key.

For a public GitHub Pages site, restrict the API key by HTTP referrer to your exact Pages origin and restrict the API to YouTube Data API v3. Do not commit the key into source code.

The key is stored only in this browser's localStorage. Because this is a static client-side app, an API key used by the browser is not a server secret.

## 2. Lyrics
Lyrics use LRCLIB's public `/api/get` endpoint. It does not require an API key. Requests should be made responsibly and sequentially according to LRCLIB's documentation.

## 3. Player
Playback uses YouTube's official IFrame Player API. The player is controlled through JavaScript and can load/play/pause videos, track state, and queue videos.

## 4. GitHub Pages
Push the folder to the `main` branch. The included GitHub Actions workflow deploys the repository to GitHub Pages.

## 5. Important limitation
This project does not extract YouTube media streams, bypass DRM, remove platform ads, or scrape private endpoints. It uses official browser APIs/embeds.
