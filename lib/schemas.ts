import { z } from 'zod';

export const navigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().regex(/^(#|\/)/, 'Use an anchor or internal route.'),
});

export const navigationSchema = z.array(navigationItemSchema);
