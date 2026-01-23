import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const normalizeArtist = (artist: string) => artist.trim();

const toWeekKey = (week: "W1" | "W2") => (week === "W1" ? "week1" : "week2");

export const updateArtistCount = mutationGeneric({
  args: {
    artist: v.string(),
    week: v.union(v.literal("W1"), v.literal("W2")),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const artist = normalizeArtist(args.artist);
    if (!artist || artist.toLowerCase() === "to be announced") {
      return;
    }

    const weekKey = toWeekKey(args.week);
    const existing = await ctx.db
      .query("artistCounts")
      .withIndex("by_artist", (q) => q.eq("artist", artist))
      .unique();

    const currentOverall = existing?.overall ?? 0;
    const currentWeek = existing?.[weekKey] ?? 0;
    const nextOverall = Math.max(0, currentOverall + args.delta);
    const nextWeek = Math.max(0, currentWeek + args.delta);

    if (existing) {
      await ctx.db.patch(existing._id, {
        overall: nextOverall,
        [weekKey]: nextWeek,
        updatedAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("artistCounts", {
      artist,
      overall: nextOverall,
      week1: weekKey === "week1" ? nextWeek : 0,
      week2: weekKey === "week2" ? nextWeek : 0,
      updatedAt: Date.now(),
    });
  },
});

export const topArtistsOverall = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("artistCounts").collect();
    return entries
      .map((entry) => ({ artist: entry.artist, count: entry.overall }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.artist.localeCompare(b.artist))
      .slice(0, 10);
  },
});

export const topArtistsByWeek = queryGeneric({
  args: {
    week: v.union(v.literal("W1"), v.literal("W2")),
  },
  handler: async (ctx, args) => {
    const weekKey = toWeekKey(args.week);
    const entries = await ctx.db.query("artistCounts").collect();
    return entries
      .map((entry) => ({ artist: entry.artist, count: entry[weekKey] }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.artist.localeCompare(b.artist))
      .slice(0, 10);
  },
});
