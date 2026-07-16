# Vespera Commerce API

Premium commerce **demo platform** with a separately deployable Node API and a Next.js storefront. Built to show horizontal scale, safe public demos, and recruiter-friendly backend visibility — without shipping live secrets.

## What’s included

| Layer | Stack |
|---|---|
| Storefront | Next.js 15, PT / EN / ES language switcher, lightweight motion |
| API | Fastify (TypeScript), OpenAPI at `/docs` |
| Data | Postgres (Docker) or embedded **PGlite** for zero-ops local runs |
| Auth | Firebase Auth (Google) when configured · **Demo Auth** otherwise |
| Payments | Mock gateway by default · live adapter stub when secrets are set |
| Security | Helmet, CORS allowlist, HMAC webhooks, DB-backed IP rate limits, idempotent checkout, inventory race guard |

## Quick start

```bash
cp .env.example .env
npm install
npm run build -w @vespera/shared
npm run dev:api
# other terminal
npm run dev:web
```

- Storefront: http://localhost:3000  
- API health: http://localhost:4000/health  
- OpenAPI: http://localhost:4000/docs  
- Architecture page: http://localhost:3000/architecture  

### Demo login (recruiters)

1. Click **Sign in (demo)** on the storefront, or call the API with:

```http
Authorization: Bearer demo:recruiter@vespera.demo
```

2. Add products → checkout with Pix or card.  
3. For Pix, use **Simulate Pix paid** (calls `/v1/demo/simulate-pix-paid`).

### Optional real Postgres

```bash
docker compose up -d
# set in .env:
# DATABASE_URL=postgres://vespera:vespera@localhost:5432/vespera
```

### Optional Firebase Google sign-in

Set `FIREBASE_*` (API) and `NEXT_PUBLIC_FIREBASE_*` (web). Until then, Demo Auth remains available so the portfolio stays runnable.

### Optional live payment secrets

Set `PAYMENT_SECRET_KEY`, `PAYMENT_PUBLIC_KEY`, `PAYMENT_WEBHOOK_SECRET`, and `PAYMENT_PROVIDER=live`. The live path is a clear stub — drop your PSP SDK into `apps/api/src/services/payment.ts`. Mock mode stays fully functional without secrets.

## Deploy shape

- **Web** → Vercel (`apps/web`) with `NEXT_PUBLIC_API_URL` pointing at the API.
- **API** → any Node host (Railway, Fly, Render, VPS) behind a load balancer. Replicas stay stateless; rate limits live in Postgres.

## Security notes (public repo)

- Never commit `.env`.
- Logs redact `Authorization` and payment/Firebase private fields.
- Webhook verification uses timing-safe HMAC comparison.
- Rate limits are enforced per IP and route class.

## License

MIT © Thiago Alexandre Santos Silva
