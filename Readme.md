# Birthday Surprise — Setup Guide

## 1. Add your song
Put an MP3 file at:
```
assets/music/song.mp3
```
It autoplays (muted-safe) right after "Open Your Gift" is tapped, and loops for the rest of the site. If no file is found, the player still shows and works — it just stays silent until you add one.

## 2. Add real photos (Page 5 carousel)
The carousel currently shows 5 elegant placeholder cards. To use real photos:
1. Drop images into `assets/photos/` (e.g. `1.jpg`, `2.jpg`...).
2. In `script.js`, find `initCarousel()` and replace the placeholder `<div class="car-placeholder">` markup with `<img src="assets/photos/1.jpg" alt="...">` for each slide.

## 3. Deploy
This is a fully static site — just push `index.html`, `style.css`, `script.js`, and `assets/` to GitHub Pages, Vercel, or Netlify. No build step required.

## 4. QR code
The QR on the landing page automatically encodes the page's own URL (generated live via qrcode.js), so once it's hosted, scanning it opens the same experience.

## Structure
```
index.html
style.css
script.js
assets/
  music/    → song.mp3 goes here
  images/   → album-art.svg (music player cover)
  photos/   → your real photos for the carousel
  flowers/  → reserved if you want custom flower/petal images later (site currently uses emoji + canvas petals, no images required)
```