# TML Astro

Astro site backed by Convex for data and feature flags.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment files from the template:

```bash
cp example.env .env
cp example.env .env.local
```

3. Update the values in `.env` and `.env.local` as described in the template.

## Convex development

Run this in a separate terminal so Convex can sync functions and data:

```bash
npx convex dev
```

## Convex production deploy

Deploy functions and schema to production:

```bash
npx convex deploy
```

## Astro commands

```bash
npm run dev
npm run build
npm run preview
```

## Notes

- `.env` is for public variables (like `PUBLIC_CONVEX_URL`).
- `.env.local` is for local-only secrets (like `CONVEX_DEPLOYMENT`, `CONVEX_URL`).
- Never commit real Convex deployment URLs or keys.
- Add `hSj.png` and `jSh.png` to the repo root (these are personal images and should stay untracked).
