import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        picture: v.optional(v.string()),
        uid: v.optional(v.string()),
        isAnonymous: v.optional(v.boolean())
    }),
    workspace:defineTable({
        messages:v.any(),
        fileData:v.optional(v.any()),
    })
});