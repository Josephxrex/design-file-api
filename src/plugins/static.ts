import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import type { FastifyInstance } from 'fastify';

/**
 * Plugin Static: Sirve archivos desde la carpeta 'uploads'.
 */
export default fp(async function (fastify: FastifyInstance) {
  const uploadDir = path.join(process.cwd(), 'uploads');
  
  // Asegurar que la carpeta existe
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await fastify.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
    }
  });
});
