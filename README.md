# Cloudsurf Texture AI

Local-first Next.js app for creating architectural texture extraction workflows and generating two texture atlas outputs from reference images:

- Repeatable seamless material atlas, finalized to `1024 x 2048`
- Unique facade element atlas, finalized to `4096 x 4096`

Projects, workflows, exclusions, and generated atlas metadata are stored in Neon Postgres behind the dashboard API. Uploaded references, generated atlases, PBR maps, and utility outputs are stored in Cloudflare R2 and referenced by signed URLs.

Authentication is handled by Neon Auth through the `@neondatabase/auth` Next.js SDK.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If that port is occupied, run `npm run dev -- --port 3001`.

## App Configuration

Copy `.env.example` to `.env.local` and set:

```bash
NEON_AUTH_BASE_URL=...
NEON_AUTH_JWKS_URL=...
NEON_AUTH_COOKIE_SECRET=...
DATABASE_URL=postgresql://...neon.tech/...sslmode=require
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

`NEON_AUTH_BASE_URL` and `NEON_AUTH_JWKS_URL` come from the Neon Auth configuration screen. Generate `NEON_AUTH_COOKIE_SECRET` yourself with `openssl rand -base64 32`; it signs the app's local session cache cookie.

## Image AI Configuration

Generation is disabled until the selected image AI provider key is available to the Next.js server. The default trial provider is Google.

```bash
IMAGE_AI_PROVIDER=google
GEMINI_API_KEY=...
GOOGLE_IMAGE_MODEL=gemini-3.1-flash-image-preview
GOOGLE_IMAGE_SIZE=2K

# Fallback provider:
IMAGE_AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-2
```

`IMAGE_AI_PROVIDER` supports `google` and `openai`. Google defaults to `gemini-2.5-flash-image`, but `gemini-3.1-flash-image-preview` is the recommended quality trial. `GOOGLE_IMAGE_SIZE` applies to Gemini 3 image models and supports `0.5K`, `1K`, `2K`, and `4K`. OpenAI defaults to `gpt-image-2`.

## Paddle Billing

Credit recharges use Paddle one-time prices and fulfill credits from the `transaction.completed` webhook. The starter pack is 25 credits for `$39`, production is 100 credits for `$129`, and studio is 250 credits for `$279`; these prices are intentionally based on OpenAI image usage as the cost floor.

```bash
PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
PADDLE_CHECKOUT_URL=http://localhost:3000/checkout
APP_URL=http://localhost:3000
PADDLE_STARTER_PRICE_ID=pri_...
PADDLE_PRODUCTION_PRICE_ID=pri_...
PADDLE_STUDIO_PRICE_ID=pri_...
```

Set Paddle's default payment link to `/checkout` for the matching environment. The page loads Paddle.js and opens the `_ptxn` transaction returned by Paddle. Configure your webhook endpoint at `/api/paddle/webhook`.

## Generated Files

Generated textures are saved to Cloudflare R2. The app stores only R2 object keys and metadata in Neon Postgres.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:ui
```

`npm run verify:ui` expects the dev server to be running. Override the target with `VERIFY_BASE_URL=http://localhost:3001 npm run verify:ui`.
