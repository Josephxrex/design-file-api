import { FastifyInstance } from 'fastify';
import { Folder } from '../models/folder.model';

export default async function folderRoutes(fastify: FastifyInstance) {
  // Aplicar middleware de autenticación
  fastify.addHook('onRequest', fastify.authenticate);

  // GET ALL FOLDERS
  fastify.get('/folders', async (request: any) => {
    return await Folder.find({ userId: request.user.userId }).sort({ createdAt: -1 });
  });

  // CREATE FOLDER
  fastify.post('/folders', async (request: any, reply) => {
    try {
      const { name } = request.body as { name: string };
      const folder = new Folder({
        name,
        userId: request.user.userId
      });
      await folder.save();
      return folder;
    } catch (err) {
      return reply.status(500).send({ message: 'Error al crear carpeta' });
    }
  });

  // DELETE FOLDER
  fastify.delete('/folders/:id', async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      await Folder.findOneAndDelete({ _id: id, userId: request.user.userId });
      return { message: 'Carpeta eliminada' };
    } catch (err) {
      return reply.status(500).send({ message: 'Error al eliminar carpeta' });
    }
  });
}
