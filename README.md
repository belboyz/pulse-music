# Pulse Music — Invidious Search Edition

Versi ini mengganti Brave Search API dengan pencarian video berbasis **Invidious API**. Pengguna tidak perlu memasukkan Brave API key.

## Search
- Ketik judul lagu atau nama artis.
- Tab **YouTube** mengambil hasil dari endpoint Invidious `/api/v1/search`.
- Tab **Background audio** menggunakan Audius.
- Tab **All** menggabungkan keduanya.
- Tidak ada YouTube Data API key yang diperlukan untuk pencarian.

## Fallback instance
Aplikasi mencoba beberapa instance Invidious yang tercantum pada dokumentasi resmi. Jika satu instance gagal/timeout, aplikasi mencoba instance berikutnya. Ketersediaan instance publik dapat berubah. Untuk penggunaan yang lebih stabil, host instance Invidious sendiri.

## Playback
Hasil YouTube tetap diputar sebagai video YouTube melalui player yang ada. Background audio Pulse memakai `<audio>` dari sumber audio yang menyediakan stream dan Media Session API. Versi ini tidak menambahkan bypass iklan, DRM circumvention, atau ekstraksi audio YouTube.

## Deploy GitHub Pages
Upload seluruh isi folder ke repository dan gunakan GitHub Actions sebagai source GitHub Pages.
