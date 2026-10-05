import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});

export const update = mutation({
  args: {
    bio: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return;
    }

    // Check if we've already stored this identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    // Clerk accounts don't always have a name (e.g. email-only sign-up)
    const name = identity.name || identity.email?.split("@")[0] || "Cook";

    if (user !== null) {
      // Keep an avatar the user set on their profile; only follow the
      // Clerk picture while they haven't chosen their own.
      const usesClerkAvatar = !user.avatarUrl || isClerkImage(user.avatarUrl);
      const avatarUrl = usesClerkAvatar ? identity.pictureUrl : user.avatarUrl;
      // If we've seen this identity before but the name or userId has changed/missing, patch the value.
      if (user.name !== name || user.userId !== identity.subject || user.avatarUrl !== avatarUrl) {
        await ctx.db.patch(user._id, {
          name,
          userId: identity.subject,
          avatarUrl,
        });
      }
      return user._id;
    }

    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      userId: identity.subject,
      avatarUrl: identity.pictureUrl,
    });
  },
});
