import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ComponentDefinition } from '../models/component.model';

const pageFormatSchema = z.union([
  z.enum(['A4', 'LETTER', 'LEGAL']),
  z.object({ width: z.number(), height: z.number() }),
]);

const elementSchema = z.record(z.any());

const variantSchema = z.object({
  pageFormat: pageFormatSchema,
  width: z.number(),
  height: z.number(),
  elements: z.array(elementSchema).default([]),
});

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['header', 'footer', 'cover', 'table', 'text-section', 'info-box', 'signature', 'graphic']),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
  visibility: z.enum(['private', 'team', 'public']).optional(),
  variants: z.array(variantSchema).min(1),
});

const componentsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/components - listar catálogo, filtros opcionales por type y pageFormat
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request) => {
    const { type, pageFormat } = request.query as { type?: string; pageFormat?: string };
    const userId = (request.user as any).userId;

    const query: any = { $or: [{ ownerId: userId }, { visibility: { $in: ['team', 'public'] } }] };
    if (type) query.type = type;

    let components = await ComponentDefinition.find(query).sort({ createdAt: -1 });
    if (pageFormat) {
      components = components.filter((c) => c.variants.some((v) => JSON.stringify(v.pageFormat) === JSON.stringify(pageFormat) || v.pageFormat === pageFormat));
    }
    return components;
  });

  // POST /api/v1/components - crear componente con al menos una variante
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = createSchema.parse(request.body);
      const created = new ComponentDefinition({
        ...data,
        ownerId: (request.user as any).userId,
      });
      await created.save();
      return reply.code(201).send(created);
    } catch (error) {
      return reply.code(400).send({ error: 'Data inválida', details: error });
    }
  });

  // GET /api/v1/components/:id
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).userId;
    const component = await ComponentDefinition.findOne({
      _id: id,
      $or: [{ ownerId: userId }, { visibility: { $in: ['team', 'public'] } }],
    });
    if (!component) return reply.code(404).send({ error: 'Componente no encontrado' });
    return component;
  });

  // PUT /api/v1/components/:id - actualiza metadatos y/o variantes completas
  fastify.put('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).userId;
    const body = request.body as any;

    const component = await ComponentDefinition.findOneAndUpdate(
      { _id: id, ownerId: userId },
      { $set: body },
      { new: true }
    );
    if (!component) return reply.code(404).send({ error: 'Componente no encontrado o no autorizado' });
    return component;
  });

  // DELETE /api/v1/components/:id
  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).userId;
    const component = await ComponentDefinition.findOneAndDelete({ _id: id, ownerId: userId });
    if (!component) return reply.code(404).send({ error: 'Componente no encontrado o no autorizado' });
    return { success: true };
  });

  // POST /api/v1/components/:id/variants - agrega o reemplaza la variante de un pageFormat
  fastify.post('/:id/variants', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).userId;

    let variant;
    try {
      variant = variantSchema.parse(request.body);
    } catch (error) {
      return reply.code(400).send({ error: 'Variante inválida', details: error });
    }

    const component = await ComponentDefinition.findOne({ _id: id, ownerId: userId });
    if (!component) return reply.code(404).send({ error: 'Componente no encontrado o no autorizado' });

    const existingIndex = component.variants.findIndex(
      (v) => JSON.stringify(v.pageFormat) === JSON.stringify(variant!.pageFormat)
    );
    if (existingIndex > -1) component.variants[existingIndex] = variant as any;
    else component.variants.push(variant as any);

    await component.save();
    return component;
  });
};

export default componentsRoutes;
