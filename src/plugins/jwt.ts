import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Plugin JWT: Maneja la autenticación y validación de tokens.
 */
export default fp(async function (fastify: FastifyInstance) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'super-secret-key-pdf-creator',
  });

  // Decorador para proteger rutas
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});

// Aumentamos los tipos para incluir el decorador y el payload
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}
