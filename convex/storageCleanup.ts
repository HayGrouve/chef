// Deletes uploads no recipe uses. Upload URLs hand out storage before a recipe
// exists (the create form, photo import), so abandoned forms leave files behind.
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/** Files younger than this are left alone: someone may still be filling in the form. */
export const ORPHAN_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH = 100;

export const deleteOrphanUploads = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({ deleted: v.number(), aborted: v.boolean() }),
  handler: async (ctx, { cursor }) => {
    // Recipes reference photos by id string. If any id isn't a current-format
    // storage id, the by_storageId lookups below can't be trusted to find its
    // file, so delete nothing rather than risk removing a live photo.
    if (!cursor) {
      for await (const recipe of ctx.db.query("recipes")) {
        if (recipe.storageId && !ctx.db.system.normalizeId("_storage", recipe.storageId)) {
          console.error(`Skipping upload cleanup: recipe ${recipe._id} has an unrecognised storageId`);
          return { deleted: 0, aborted: true };
        }
      }
    }

    const cutoff = Date.now() - ORPHAN_GRACE_MS;
    const page = await ctx.db.system
      .query("_storage")
      .order("asc")
      .paginate({ numItems: BATCH, cursor: cursor ?? null });

    let deleted = 0;
    let reachedRecent = false;
    for (const file of page.page) {
      if (file._creationTime > cutoff) {
        reachedRecent = true;
        break;
      }
      const user = await ctx.db
        .query("recipes")
        .withIndex("by_storageId", (q) => q.eq("storageId", file._id))
        .first();
      if (!user) {
        await ctx.storage.delete(file._id);
        deleted++;
      }
    }

    if (!page.isDone && !reachedRecent) {
      await ctx.scheduler.runAfter(0, internal.storageCleanup.deleteOrphanUploads, {
        cursor: page.continueCursor,
      });
    }
    return { deleted, aborted: false };
  },
});
