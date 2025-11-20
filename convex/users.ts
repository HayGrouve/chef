import { v } from "convex/values";
import { mutation } from "./_generated/server";

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

    if (user !== null) {
      // If we've seen this identity before but the name or userId has changed/missing, patch the value.
      if (user.name !== identity.name || user.userId !== identity.subject) {
        await ctx.db.patch(user._id, { 
            name: identity.name!,
            userId: identity.subject
        });
      }
      return user._id;
    }

    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: identity.name!,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      userId: identity.subject,
    });
  },
});
