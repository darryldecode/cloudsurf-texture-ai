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

## OpenAI Configuration

Generation is disabled until `OPENAI_API_KEY` is available to the Next.js server.

```bash
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1.5
```

`OPENAI_IMAGE_MODEL` is optional and defaults to `gpt-image-1.5`.

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
