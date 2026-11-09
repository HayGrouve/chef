import { v, ConvexError } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getIdentity, getUserId, requireUserId } from "./lib/auth";
import { FALLBACK_NAME, nextSyncedAuthName } from "./lib/names";

const MAX_BIO = 500;

function isHttpsUrl(value: string) {
  try {
    return value.length <= 1000 && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isClerkImage(url: string) {
  try {
    return new URL(url).hostname === "img.clerk.com";
  } catch {
    return false;
  }
}

/** The profile row of a Clerk user, found by `subject` (stored as `userId`). */
async function findUser(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!user) return null;
    // Public profile: never expose email or the auth token identifier
    return {
      _id: user._id,
      userId: user.userId,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    };
  },
});

export const getMe = query({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return null;
    }
    return await findUser(ctx, userId);
  },
});

export const update = mutation({
  args: {
    bio: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await findUser(ctx, userId);

    if (!user) {
      throw new Error("User not found");
    }

    const bio = args.bio.trim();
    if (bio.length > MAX_BIO) {
      throw new ConvexError(`Keep your bio under ${MAX_BIO} characters.`);
    }
    const avatarUrl = args.avatarUrl?.trim() || undefined;
    if (avatarUrl && !isHttpsUrl(avatarUrl)) {
      throw new ConvexError("The avatar must be an https:// image link.");
    }

    await ctx.db.patch(user._id, { bio, avatarUrl });
  },
});

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getIdentity(ctx);
    if (!identity) {
      return;
    }
    const userId = identity.subject;
    const user = await findUser(ctx, userId);

    if (user !== null) {
      // Keep an avatar the user set on their profile; only follow the
      // Clerk picture while they haven't chosen their own.
      const usesClerkAvatar = !user.avatarUrl || isClerkImage(user.avatarUrl);
      const avatarUrl = usesClerkAvatar ? identity.pictureUrl : user.avatarUrl;
      // A token without a name (an email code sign-in) never renames anyone;
      // names change on /akaunt and arrive with the next token.
      const name = nextSyncedAuthName(user.name, identity.name);
      if (name !== undefined || user.avatarUrl !== avatarUrl) {
        await ctx.db.patch(user._id, {
          ...(name !== undefined && { name }),
          avatarUrl,
        });
      }
      if (name !== undefined) {
        await ctx.scheduler.runAfter(0, internal.recipes.refreshAuthorName, {
          userId,
          name,
        });
      }
      return user._id;
    }

    // Clerk accounts don't always have a name (e.g. email-only sign-up). The
    // name is public, so don't fall back to part of the email address.
    const name = identity.name?.trim() || FALLBACK_NAME;
    // Recipes saved before the profile existed have no author name yet
    await ctx.scheduler.runAfter(0, internal.recipes.refreshAuthorName, {
      userId,
      name,
    });
    // Email is not stored. `tokenIdentifier` is still written until the
    // retirement cleanup drops it; rows are found by `userId`.
    return await ctx.db.insert("users", {
      name,
      tokenIdentifier: identity.tokenIdentifier,
      userId,
      avatarUrl: identity.pictureUrl,
    });
  },
});
