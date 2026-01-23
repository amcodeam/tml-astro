import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  artistCounts: defineTable({
    artist: v.string(),
    overall: v.number(),
    week1: v.number(),
    week2: v.number(),
    updatedAt: v.number(),
  }).index("by_artist", ["artist"]),
  featureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
