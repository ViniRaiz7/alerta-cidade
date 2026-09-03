const { z } = require('zod');

const ADMIN_CREATABLE_ROLES = ['ADMIN', 'MODERADOR', 'SUPERADMIN'];

const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    password: z.string().min(4).max(72),
    role: z.enum(ADMIN_CREATABLE_ROLES, {
      errorMap: () => ({ message: `Função deve ser uma de: ${ADMIN_CREATABLE_ROLES.join(', ')}.` }),
    }),
  }),
});

const resetPasswordSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ password: z.string().min(4).max(72) }),
});

const listUsersQuerySchema = z.object({
  query: z.object({
    role: z.enum(['CIDADAO', 'MODERADOR', 'ADMIN', 'SUPERADMIN']).optional(),
    search: z.string().trim().max(160).optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { createUserSchema, resetPasswordSchema, listUsersQuerySchema, idParamSchema, ADMIN_CREATABLE_ROLES };
