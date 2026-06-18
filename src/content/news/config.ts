// src/content/news/config.ts
import { defineCollection, z } from 'astro:content';

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subheadline: z.string().optional(),
    date: z.string(),           // YYYY-MM-DD
    location: z.string().optional(),
    slug: z.string(),
    image: z.string().optional(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
