# Pulse Music v4

Pulse v4 is a GitHub Pages-ready PWA.

## Main goal
Search a playable audio catalog, press Play, leave the PWA, and use iPhone Lock Screen / Control Center media controls.

## Important source distinction
- Audius results are the background-audio path. The app uses the official Audius REST stream endpoint.
- YouTube results are video results. They are not converted into background audio.
- YouTube Data API key is optional and only needed for YouTube search.
- Audius API key is optional for read-only usage; a key can increase limits.

## Deploy
Upload the CONTENTS of this folder to the root of your GitHub repository. Do not put the folder itself inside another folder.

The workflow is:
.github/workflows/deploy.yml

Then open GitHub:
Settings -> Pages -> Source: GitHub Actions

## iPhone background playback
For best results:
1. Open the deployed site in Safari.
2. Use Share -> Add to Home Screen.
3. Open Pulse from the Home Screen.
4. Search an AUDIO result, not a YouTube video.
5. Press Play.
6. Return to the Home Screen or lock the iPhone.
7. Use the Lock Screen / Control Center media controls.

iOS/WebKit can still impose platform-level background-audio limitations or bugs. The app does not bypass those limitations.

## APIs
Audius: https://docs.audius.co/developers/introduction/overview/
YouTube Data API: https://developers.google.com/youtube/v3
LRCLIB: https://lrclib.net/
