# Quiet Playground Site

This repo contains the Games homepage plus the AVL Local page, served by a small Node server.

## Local development

```bash
npm install
npm run dev
```

The site starts on `http://127.0.0.1:8080` by default.

## Deploying to Render

This repo includes a root [`render.yaml`](./render.yaml) for a Render web service deployment.

### Option 1: Blueprint deploy

1. Push this project to a new GitHub repository.
2. In Render, create a new Blueprint and connect that repo.
3. Render will read `render.yaml` and create the service automatically.

### Option 2: Manual web service setup

If you prefer to create the service manually in Render, use:

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/healthz`

## Notes

- The server already respects Render's `PORT` environment variable.
- The AVL Local page depends on live upstream event and parkway sources. If an upstream provider is unavailable, the page falls back to an unavailable state instead of crashing.
