import { z } from 'zod';

export const emailSchema = z.string().email('E-mail inválido').min(1, 'E-mail é obrigatório');

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Deve conter pelo menos um número');

export const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens');

export const gameSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: slugSchema,
  description: z.string().min(1, 'Descrição é obrigatória'),
  genre: z.string().min(1, 'Gênero é obrigatório'),
  status: z.enum(['active', 'inactive']),
  popularity: z.number().min(0).max(100),
  tags: z.array(z.string()),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  siteUrl: z.string().url().optional().or(z.literal('')),
});

export const guildSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  tag: z.string().min(2).max(6),
  game: z.string().min(1),
  gm: z.string().min(1),
  status: z.enum(['active', 'inactive', 'banned']),
});

export const achievementSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category: z.string().min(1),
  xp: z.number().min(0),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  active: z.boolean(),
});

export const eventSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  date: z.string().min(1),
  registrations: z.number().min(0),
  limit: z.number().min(0),
  status: z.enum(['upcoming', 'open', 'ended']),
  description: z.string().optional(),
  banner: z.string().optional(),
});

export const userUpdateSchema = z.object({
  displayName: z.string().optional(),
  email: emailSchema.optional(),
  isActive: z.boolean().optional(),
  premium: z.boolean().optional(),
  xp: z.number().optional(),
});

export const notificationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  audience: z.enum(['all', 'premium', 'game', 'guild']),
  gameId: z.string().optional(),
  guildId: z.string().optional(),
  sendAt: z.string().optional(),
});
