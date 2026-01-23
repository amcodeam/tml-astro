import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const getFeatureFlag = queryGeneric({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return existing?.enabled ?? false;
  },
});

export const setFeatureFlag = mutationGeneric({
  args: {
    key: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("featureFlags", {
      key: args.key,
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});
