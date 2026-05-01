import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Project } from '../models/project.model';
import { createProjectSchema, updateProjectSchema } from '../schemas/validation';

export default async function projectsRoutes(fastify: FastifyInstance) {
  // Aplicar middleware de autenticación a todas las rutas de este plugin
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /api/v1/projects - Listar proyectos (propios y colaboraciones)
  fastify.get('/', async (request: any) => {
    const userId = request.user.userId;
    return await Project.find({
      $or: [
        { userId },
        { 'collaborators.userId': userId }
      ]
    }).sort({ createdAt: -1 });
  });

  // GET /api/v1/projects/:id - Obtener un proyecto
  fastify.get('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const userId = request.user.userId;
    const project = await Project.findOne({
      _id: id,
      $or: [
        { userId },
        { 'collaborators.userId': userId }
      ]
    });
    if (!project) return reply.status(404).send({ message: 'Proyecto no encontrado' });
    return project;
  });

  // POST /api/v1/projects - Crear proyecto
  fastify.post('/', async (request: any) => {
    const { name, folderId } = request.body;
    const project = new Project({
      name,
      folderId: folderId || null,
      userId: request.user.userId,
      canvasJSON: JSON.stringify({ version: "5.3.0", objects: [] })
    });
    return await project.save();
  });

  // PUT /api/v1/projects/:id - Guardar canvas
  fastify.put('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const data = updateProjectSchema.parse(request.body);
    
    const project = await Project.findOneAndUpdate(
      { _id: id, userId: request.user.userId },
      { $set: data },
      { new: true }
    );

    if (!project) return reply.status(404).send({ message: 'Proyecto no encontrado' });
    return project;
  });

  // DELETE /api/v1/projects/:id - Eliminar proyecto
  fastify.delete('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const project = await Project.findOneAndDelete({ _id: id, userId: request.user.userId });
    if (!project) return reply.status(404).send({ message: 'Proyecto no encontrado o no tienes permiso' });
    return { message: 'Proyecto eliminado' };
  });

  // POST /api/v1/projects/:id/collaborators - Añadir/Actualizar colaborador
  fastify.post('/:id/collaborators', async (request: any, reply) => {
    const { id } = request.params;
    const { collaboratorId, role } = request.body;
    
    // Solo el dueño puede añadir colaboradores
    const project = await Project.findOne({ _id: id, userId: request.user.userId });
    if (!project) return reply.status(403).send({ message: 'No tienes permiso para gestionar colaboradores' });

    // Buscar si ya existe
    const existingIndex = project.collaborators.findIndex(c => c.userId.toString() === collaboratorId);
    
    if (existingIndex > -1) {
      project.collaborators[existingIndex].role = role;
    } else {
      project.collaborators.push({ userId: collaboratorId, role });
    }

    await project.save();
    return project;
  });
}
