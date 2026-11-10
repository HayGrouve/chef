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

| Where | Convex deployment | Clerk instance |
| --- | --- | --- |
| Production (armyant.app) | `descriptive-snail-667` (prod) | Chef's old dev instance (`good-puma-58`) until the cutover (chef#33), then онова за production |
| Vercel previews | `hearty-kookabura-538` (dev) | онова за development (`fancy-bobcat-6703`) |
| Local dev | `hearty-kookabura-538` (dev) | онова за development (`fancy-bobcat-6703`) |

- Vercel's `NEXT_PUBLIC_CONVEX_URL` has one value for Production and another for Preview and Development, so previews and local dev never read or write production data.
- Vercel's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are split the same way: Preview and Development hold the онова за **dev** instance keys (`pk_live_` does not work on `*.vercel.app`), Production keeps its own. Each Convex deployment trusts its Clerk instance through `CLERK_JWT_ISSUER_DOMAIN`: dev has `https://fancy-bobcat-6703.clerk.accounts.dev`.
- Signed out, a protected page sends you to the dev Account Portal (`fancy-bobcat-6703.accounts.dev`), which says "онова за" and brings you back.
- Local setup: `vercel env pull .env.local --environment=development`, then keep `CONVEX_DEPLOYMENT=dev:hearty-kookabura-538` in `.env.local` (`npx convex dev` uses it). There is no `.env`; never commit `.env*` files.
- Push functions to dev with `npx convex dev --once`. The Vercel build runs `next build` only, so it never deploys Convex functions.
- Production Convex changes only through `npx convex deploy`, run from the PR head right before its merge, and only after the owner confirms.
- `POST /clerk/webhook` (`convex/http.ts`) erases a person on Clerk's `user.deleted`. It answers 503 until `CLERK_WEBHOOK_SIGNING_SECRET` is set on the Convex deployment; production gets its endpoint and secret at the cutover, not before.
- Dev data comes from the dev seed (`convex/devSeed.ts`), keyed by a Clerk user id and refused on any deployment but dev. Sign in once as a Clerk test user of the онова за dev instance (a `+clerk_test` email, code 424242; `clerk users create --app <онова за app> --instance dev --email you+clerk_test@example.com`), then: `npx convex run devSeed:seedTestUser '{"userId":"user_..."}'`.
- The cutover wipe (`migrations:cutoverWipe`, chef#27) runs on production once, on cutover day (chef#33). Always run it with `{"dryRun":true}` first.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
