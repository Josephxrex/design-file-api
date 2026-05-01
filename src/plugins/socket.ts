import fp from 'fastify-plugin';
import socketio from 'fastify-socket.io';
import type { FastifyInstance } from 'fastify';

export default fp(async function (fastify: FastifyInstance) {
  // 1. Registro del plugin sin bloqueos
  await fastify.register(socketio, {
    cors: {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    }
  });

  // 2. Decoración y eventos (usando setTimeout para no bloquear el hilo de arranque)
  setTimeout(() => {
    const io = (fastify as any).io;
    if (!io) return console.error('🔴 Sockets no disponibles tras arranque');

    io.on('connection', (socket: any) => {
      console.log(`👤 Conexión colaborativa: ${socket.id}`);

      socket.on('join-project', (projectId: string) => {
        socket.join(projectId);
      });

      socket.on('canvas-update', (data: any) => {
        socket.to(data.projectId).emit('canvas-sync', data.json);
      });

      socket.on('cursor-move', (data: any) => {
        socket.to(data.projectId).emit('cursor-sync', data);
      });

      socket.on('disconnect', () => {
        console.log(`👋 Desconexión: ${socket.id}`);
      });
    });
    
    console.log('✅ Sockets configurados y listos.');
  }, 100);
});
