import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

/**
 * Plugin CORS: permite peticiones desde el frontend Angular.
 * En producción, reemplazar FRONTEND_URL con el dominio real.
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin: true, // Permitir cualquier origen en desarrollo para debuggear
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
    credentials: true,
  });
});
