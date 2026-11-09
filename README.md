This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environments and Convex

| Where | Convex deployment |
| --- | --- |
| Production (armyant.app) | `descriptive-snail-667` (prod) |
| Vercel previews | `hearty-kookabura-538` (dev) |
| Local dev | `hearty-kookabura-538` (dev) |

- Vercel's `NEXT_PUBLIC_CONVEX_URL` has one value for Production and another for Preview and Development, so previews and local dev never read or write production data.
- Local setup: `vercel env pull .env.local --environment=development`, then keep `CONVEX_DEPLOYMENT=dev:hearty-kookabura-538` in `.env.local` (`npx convex dev` uses it). There is no `.env`; never commit `.env*` files.
- Push functions to dev with `npx convex dev --once`. The Vercel build runs `next build` only, so it never deploys Convex functions.
- Production Convex changes only through `npx convex deploy`, run from the PR head right before its merge, and only after the owner confirms.
- Dev data comes from the dev seed (`convex/devSeed.ts`), keyed by a Clerk user id and limited to Clerk test users (`+clerk_test` emails): `npx convex run devSeed:seedTestUser '{"userId":"user_..."}'`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
