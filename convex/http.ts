import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { parseClerkEvent, verifyClerkWebhook } from "./lib/clerkWebhook";

const http = httpRouter();

/**
 * Clerk webhooks (Svix), copied from Сметката. Someone who deletes their
 * Акаунт (`user.deleted`) has everything Кухнята holds about them erased by
 * `accountDeletion.deleteUserData`, rate-limit counters included. Answers 503
 * until `CLERK_WEBHOOK_SIGNING_SECRET` is set (the cutover creates the
 * production endpoint).
 */
http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      return new Response("Clerk webhooks are not configured", { status: 503 });
    }

    const payload = await request.text();
    const eventId = request.headers.get("svix-id");
    const verified = await verifyClerkWebhook({
      payload,
      headers: {
        id: eventId,
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      secret,
      nowMs: Date.now(),
    });
    if (!verified || !eventId) {
      return new Response("Invalid signature", { status: 400 });
    }

    const event = parseClerkEvent(payload);
    if (!event) return new Response("Malformed event", { status: 400 });

    if (event.type === "user.deleted" && event.userId) {
      await ctx.runMutation(internal.accountDeletion.recordUserDeleted, {
        eventId,
        userId: event.userId,
      });
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
