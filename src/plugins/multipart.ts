import fp from 'fastify-plugin';
import fastifyMultipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';

/**
 * Plugin Multipart: Permite la subida de archivos (imágenes para el canvas).
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1,
    },
  });
});
