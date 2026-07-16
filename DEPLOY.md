# Deploy Vespera API (Railway or Render)

The storefront on Vercel must **not** call `localhost` (Chrome shows a scary local-network permission popup). Host this API, then set `NEXT_PUBLIC_API_URL` on the Vercel project `vespera-commerce`.

## Option A — Railway (recommended)

1. Create an account at https://railway.app and install the CLI: `npm i -g @railway/cli`
2. In a terminal:
   ```bash
   cd commerce-api
   railway login
   railway init
   railway up
   ```
3. In the Railway dashboard → service → Variables, set:
   - `CORS_ORIGIN=https://vespera-commerce.vercel.app`
   - `PUBLIC_WEB_URL=https://vespera-commerce.vercel.app`
   - `PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app`
   - `NODE_ENV=production`
   - Optional: `DATABASE_URL` (Postgres). Without it, the API uses PGlite under `/data/pglite`.
4. Copy the public HTTPS URL.
5. In Vercel → `vespera-commerce` → Settings → Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app`
6. Redeploy the Vercel frontend.

## Option B — Render

1. https://dashboard.render.com → New → Blueprint
2. Connect the `commerce-api` GitHub repo (uses `render.yaml` + `Dockerfile`)
3. Set `CORS_ORIGIN` / `PUBLIC_WEB_URL` / `PUBLIC_API_URL` as above
4. Point Vercel `NEXT_PUBLIC_API_URL` at the Render URL and redeploy
