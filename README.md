# Email Chat App

Small email-from-text demo (frontend/backend).

## What I improved

- Frontend
  - `frontend/style.css`: accessibility improvements (focus-visible), responsive tweaks, prefers-reduced-motion, better font stack
  - `frontend/index.html`: semantic structure (`<main>`), meta viewport, accessible labels, ARIA attributes, removed inline handlers
  - `frontend/script.js`: replaced inline handlers with event listeners, added validation, error handling, accessible status updates, keyboard shortcuts

- Backend
  - `backend/server.js`: input validation, safer fetch handling to the webhook, basic security headers, request size limit, and generic error handler

- Tooling
  - Added `.eslintrc.json` and Prettier config files to standardize formatting

## Run

1. Start the backend:

```bash
cd backend
npm install
node server.js
```

2. Open `frontend/index.html` in a browser (or serve it with a static server).

3. (Optional) Run a small smoke test to verify parsing:

```bash
cd backend
node test-smoke.js
```

## Linting (optional)

Install recommended tools locally:

```bash
npm install --save-dev eslint prettier
npx eslint --fix .
```

## Notes

- I kept changes minimal and dependency-free where possible. If you'd like I can add `helmet`, `express-rate-limit`, and unit tests next.
