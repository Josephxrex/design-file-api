import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Template } from '../../models/template.model';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['header', 'footer', 'page', 'component']),
  canvasJSON: z.string(),
  thumbnail: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional()
});

const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/templates - list templates, optionally filter by category
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { category } = request.query as { category?: string };
    const query: any = {};
    if (category) {
      query.category = category;
    }
    
    // Podríamos añadir validación para que devuelva las del usuario actual + sistema
    const userId = (request.user as any).userId;
    query.$or = [{ userId }, { userId: { $exists: false } }];

    const templates = await Template.find(query).sort({ createdAt: -1 });
    return templates;
  });

  // POST /api/v1/templates - create a new template
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = createSchema.parse(request.body);
      const newTemplate = new Template({
        ...data,
        userId: (request.user as any).userId
      });
      await newTemplate.save();
      return reply.code(201).send(newTemplate);
    } catch (error) {
      return reply.code(400).send({ error: 'Data inválida', details: error });
    }
  });

  // DELETE /api/v1/templates/:id - delete a template
  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await Template.findOne({ _id: id, userId: (request.user as any).userId });
    
    if (!template) {
      return reply.code(404).send({ error: 'Template no encontrado o no autorizado' });
    }
    
    await Template.findByIdAndDelete(id);
    return { success: true };
  });

  // GET /api/v1/templates/:id - get a template by ID
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await Template.findOne({ _id: id, userId: (request.user as any).userId });
    
    if (!template) {
      return reply.code(404).send({ error: 'Template no encontrado' });
    }
    return template;
  });

  // PUT /api/v1/templates/:id - update a template
  fastify.put('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    
    const template = await Template.findOneAndUpdate(
      { _id: id, userId: (request.user as any).userId },
      { $set: body },
      { new: true }
    );
    
    if (!template) {
      return reply.code(404).send({ error: 'Template no encontrado' });
    }
    return template;
  });
};

export default templatesRoutes;
