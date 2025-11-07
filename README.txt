My PDF App (Full) — PWA with thumbnails + search using PDF.js

How to use:
1) Place your PDF as 'your.pdf' next to index.html (or update index.html iframe URL).
2) Deploy to any static host (GitHub Pages, Netlify, Vercel). HTTPS required.
3) Mobile: Add to Home Screen / Install app for fullscreen mode.

Features:
- Thumbnails sidebar (toggle with ☰)
- Page prev/next and direct page input
- Zoom in/out, Fit Width
- Search (next/prev). It jumps to pages that contain the term.
- Offline caching via Service Worker (after first load).

To change PDF file name:
- Edit index.html -> iframe src="pdfjs/viewer.html?file=../YOURFILE.pdf#zoom=page-width"
