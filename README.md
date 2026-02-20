# Grolab

**Personal Web Engineering Lab** — a collection of developer tools built with Vue 3 + Vite.

Crawl websites, inspect HTML/CSS, run experiments. Built for learning, designed for real work.

🌐 **[grolab.work](https://grolab.work)**

---

## Tools

| Tool | Status | Description |
|------|--------|-------------|
| Website Crawler | ✅ Ready | Enter a URL, inspect HTML, CSS, assets, metadata |
| HTML Viewer | ✅ Ready | Paste HTML, view formatted with line numbers |
| CSS Inspector | 🔜 Planned | Extract and analyze CSS rules |
| Experiments | ✅ Ready | JS console sandbox, prototyping area |

---

## Tech Stack

- **Vue 3** — Composition API, `<script setup>`
- **Vite** — Fast dev server + production builds
- **Vue Router** — Client-side routing with lazy-loaded views
- **Modern CSS** — Custom properties, no frameworks
- **Mock-first architecture** — Backend-ready API layer

---

## Architecture

```
src/
├── main.js              # App bootstrap
├── App.vue              # Root shell (navbar + router-view + footer)
├── router/index.js      # Route definitions
├── views/               # Page-level components (one per route)
├── components/          # Reusable UI components
├── services/            # API layer + business logic
│   ├── api.js           # Central fetch interface (mock ↔ real)
│   └── crawlerService.js
├── mock/                # Mock backend responses
└── assets/main.css      # Design system + global styles
```

**Key design decisions:**

- **Views never fetch directly.** All data flows through `services/`.
- **API layer is swappable.** Set `VITE_API_URL` to switch from mock to real backend.
- **Components are reusable.** `CodeViewer`, `ToolCard`, `Loader` work across all tools.
- **CSS uses design tokens.** Change `--color-accent` and the whole app updates.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Deploy to GitHub Pages

1. Build: `npm run build`
2. The `dist/` folder is your deploy target
3. Push to `gh-pages` branch, or use GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Adding a Backend

When you're ready to connect a real server:

1. Create `.env.local`:
   ```
   VITE_API_URL=https://api.grolab.work
   ```
2. Implement the endpoints that `services/api.js` expects
3. The UI doesn't change — only the API layer switches from mock to live

---

## Adding a New Tool

1. Create `src/views/NewTool.vue`
2. Add route in `src/router/index.js`
3. Add card to `tools` array in `Dashboard.vue`
4. Add nav link in `Navbar.vue`
5. If it needs backend data, add a service in `src/services/`

---

## License

Personal project. Built for learning.
