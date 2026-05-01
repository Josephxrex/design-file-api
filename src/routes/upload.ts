import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream';
import { Asset } from '../models/asset.model';

const pump = promisify(pipeline);

export default async function uploadRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/upload
  fastify.post('/upload', async (request: any, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ message: 'No se envió archivo' });

    const uploadDir = path.join(process.cwd(), 'uploads');
    const filename = `${Date.now()}-${data.filename}`;
    const filePath = path.join(uploadDir, filename);

    await pump(data.file, fs.createWriteStream(filePath));

    const url = `/uploads/${filename}`;
    const asset = new Asset({
      url,
      filename: data.filename,
      userId: request.user.userId
    });
    await asset.save();

    return { 
      url,
      id: asset._id,
      name: data.filename 
    };
  });
}
