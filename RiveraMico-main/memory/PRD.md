# MICRO Rivera - Real-time Bus Tracker

## Architecture
- **Frontend-only**: React + MapLibre GL JS, works as static site on GitHub Pages
- **Data source**: External XML API at http://microltda.ddns.net:8705/pub/avl.xml (CORS enabled)
- **Persistence**: localStorage for last-seen bus positions
- **Fetch strategy**: Backend proxy → Direct fetch → HTTPS CORS proxy → localStorage cache

## What's Been Implemented
- MapLibre GL JS fullscreen map (dark/light toggle)
- Pure SVG markers with directional arrows
- Bus position persistence in localStorage (2h TTL)
- Ghost bus display for recently-seen buses
- Bottom sheet details, bus list panel, line filter
- Mobile responsive, glassmorphism UI
- GitHub Pages compatible (no backend required)

## For GitHub Pages Deployment
- Run `yarn build` in /app/frontend
- Deploy the `build/` folder to GitHub Pages
- Set homepage in package.json if needed
- The app will use CORS proxies (corsproxy.io, allorigins.win) to reach the HTTP API from HTTPS
