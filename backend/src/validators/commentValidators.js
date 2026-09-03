const { z } = require('zod');

const createCommentSchema = z.object({
  params: z.object({ id: z.string().uuid() }), // id da denúncia
  body: z.object({
    text: z.string().trim().min(1).max(300),
    parentId: z.string().uuid().optional(),
  }),
});

const commentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),      // id da denúncia
    commentId: z.string().uuid(),
  }),
});

module.exports = { createCommentSchema, commentIdParamSchema };
