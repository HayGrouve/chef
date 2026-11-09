import { v } from "convex/values";
import type { Doc, TableNames } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { authorNamePatch } from "./recipes";
import schema from "./schema";

export const backfillSearchText = internalMutation({
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").collect();
    
    let count = 0;
    for (const recipe of recipes) {
      if (!recipe.searchText || !recipe.authorName) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_userId", (q) => q.eq("userId", recipe.userId))
          .unique();
          
        const authorName = user?.name || "";
        const searchText = `${recipe.title} ${authorName}`.toLowerCase();
        
        await ctx.db.patch(recipe._id, {
          authorName,
          searchText,
        });
        count++;
      }
    }
    
    return `Backfilled ${count} recipes`;
  },
});

/** What every recipe's owner becomes at the cutover: unclaimable, with no personal data. */
export const ANONYMOUS_CHEF = "Анонимен готвач";
/** Tables the wipe keeps (owners anonymised, every recipe); every other table is emptied. */
const KEPT_TABLES: readonly TableNames[] = ["users", "recipes"];

type Counts = { keep: number; drop: number };

/**
 * The cutover wipe (chef#27, decision 14; people decided in onova-za#22).
 * Nobody from Chef moves into the Акаунт: every recipe and its photo stay,
 * each owner becomes an "Анонимен готвач" no sign-in can match, and the rest
 * goes: other `users` rows and every row of every other table (favourites,
 * shopping lists, meal plans, rate-limit counters, ...), plus stored files no
 * kept recipe points at. One transaction (about 110 writes on prod today).
 * Pending `refreshAuthorName` jobs are cancelled so none can restore a real
 * name afterwards. With `dryRun` it writes nothing and returns the same counts.
 *
 *   npx convex run migrations:cutoverWipe '{"dryRun":true}'
 */
export const cutoverWipe = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const write = async (op: () => Promise<unknown>) => {
      if (!dryRun) await op();
    };
    const tables: Record<string, Counts> = {};

    // Every recipe stays; their owners become anonymous chefs
    const recipes = await ctx.db.query("recipes").collect();
    const owners = [...new Set(recipes.map((recipe) => recipe.userId))].sort();
    const ownerSet = new Set(owners);

    const users = await ctx.db.query("users").collect();
    const anonymous = new Map<string, Doc<"users">["_id"] | null>(owners.map((owner) => [owner, null]));
    let createdOwners = 0;
    tables.users = { keep: 0, drop: 0 };
    for (const user of users) {
      const owner = user.userId;
      if (owner && ownerSet.has(owner) && anonymous.get(owner) === null) {
        anonymous.set(owner, user._id);
        tables.users.keep++;
      } else {
        // Not an owner, or a duplicate row for one
        tables.users.drop++;
        await write(() => ctx.db.delete(user._id));
      }
    }
    for (const [index, owner] of owners.entries()) {
      const fields = {
        name: ANONYMOUS_CHEF,
        // Real token identifiers are "<issuer URL>|<subject>"; this one matches no sign-in
        tokenIdentifier: `anonymous|${index + 1}`,
        email: undefined,
        avatarUrl: undefined,
        bio: undefined,
      };
      const existing = anonymous.get(owner);
      if (existing) {
        await write(() => ctx.db.patch(existing, fields));
      } else {
        // Recipes whose owner never had a profile row get one, so /profile/<id> works
        createdOwners++;
        tables.users.keep++;
        await write(() => ctx.db.insert("users", { ...fields, userId: owner }));
      }
    }

    // Same rewrite as recipes.refreshAuthorName, in this transaction
    let renamedRecipes = 0;
    for (const recipe of recipes) {
      const patch = authorNamePatch(recipe, ANONYMOUS_CHEF);
      if (!patch) continue;
      renamedRecipes++;
      await write(() => ctx.db.patch(recipe._id, patch));
    }
    tables.recipes = { keep: recipes.length, drop: 0 };

    for (const table of (Object.keys(schema.tables) as TableNames[]).sort()) {
      if (KEPT_TABLES.includes(table)) continue;
      const rows = await ctx.db.query(table).collect();
      tables[table] = { keep: 0, drop: rows.length };
      for (const row of rows) await write(() => ctx.db.delete(row._id));
    }

    // Files: keep every one a recipe points at, delete the rest. A storage id
    // that isn't a current-format id can't be matched to its file, so then
    // delete no file at all (as storageCleanup does).
    const referenced = new Set<string>();
    let unrecognisedStorageIds = 0;
    for (const recipe of recipes) {
      if (!recipe.storageId) continue;
      const fileId = ctx.db.system.normalizeId("_storage", recipe.storageId);
      if (fileId) referenced.add(fileId);
      else unrecognisedStorageIds++;
    }
    const files = await ctx.db.system.query("_storage").collect();
    tables._storage = { keep: 0, drop: 0 };
    for (const file of files) {
      if (referenced.has(file._id) || unrecognisedStorageIds > 0) {
        tables._storage.keep++;
      } else {
        tables._storage.drop++;
        await write(() => ctx.storage.delete(file._id));
      }
    }

    // A queued refreshAuthorName would write a real name back
    const pending = (await ctx.db.system.query("_scheduled_functions").collect()).filter(
      (job) => job.state.kind === "pending" || job.state.kind === "inProgress"
    );
    const pendingByName: Record<string, number> = {};
    let cancelledRenames = 0;
    for (const job of pending) {
      pendingByName[job.name] = (pendingByName[job.name] ?? 0) + 1;
      if (job.state.kind === "pending" && job.name.endsWith("refreshAuthorName")) {
        cancelledRenames++;
        await write(() => ctx.scheduler.cancel(job._id));
      }
    }

    return {
      dryRun,
      tables,
      owners: owners.length,
      createdOwners,
      renamedRecipes,
      unrecognisedStorageIds,
      pendingScheduled: pendingByName,
      cancelledRenames,
    };
  },
});
