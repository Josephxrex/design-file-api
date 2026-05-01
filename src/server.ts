import 'dotenv/config';
import Fastify from 'fastify';
import { connectDB } from './db';

// ─── Plugins ────────────────────────────────────────────────────────────────
import corsPlugin from './plugins/cors';
import jwtPlugin from './plugins/jwt';
import swaggerPlugin from './plugins/swagger';
import multipartPlugin from './plugins/multipart';
import staticPlugin from './plugins/static';
import socketPlugin from './plugins/socket';

// ─── Routes ─────────────────────────────────────────────────────────────────
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';
import uploadRoutes from './routes/upload';
import folderRoutes from './routes/folders';
import templatesRoutes from './routes/templates';

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// MONITOR DE RED: Ver todas las peticiones que entran
server.addHook('onRequest', async (request, reply) => {
  console.log(`📥 Recibida: ${request.method} ${request.url} | Origin: ${request.headers.origin}`);
});

async function bootstrap() {
  try {
    // 1. Conectar a MongoDB
    await connectDB();

    // 2. Registrar plugins globales (orden importante)
    console.log('📦 Registrando CORS...');
    await server.register(corsPlugin);
    console.log('📦 Registrando Swagger...');
    await server.register(swaggerPlugin);
    console.log('📦 Registrando JWT...');
    await server.register(jwtPlugin);
    console.log('📦 Registrando Multipart...');
    await server.register(multipartPlugin);
    console.log('📦 Registrando Static...');
    await server.register(staticPlugin);
    console.log('📦 Registrando Sockets Colaborativos...');
    await server.register(socketPlugin);
    console.log('✅ Todos los plugins registrados.');

    // 3. Registrar rutas con prefijo /api/v1
    await server.register(authRoutes, { prefix: '/api/v1/auth' });
    await server.register(projectsRoutes, { prefix: '/api/v1/projects' });
    await server.register(folderRoutes, { prefix: '/api/v1' });
    await server.register(uploadRoutes, { prefix: '/api/v1' });
    await server.register(templatesRoutes, { prefix: '/api/v1/templates' });
    console.log('✅ Rutas listas.');

    // 4. Health check
    server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // 5. Iniciar servidor
    const port = 3005;
    console.log(`🔌 Intentando abrir puerto ${port} en 127.0.0.1...`);
    
    server.listen({ port, host: '127.0.0.1' }, (err, address) => {
      if (err) {
        console.error('🔴 Error crítico al arrancar el servidor:', err);
        process.exit(1);
      }
      console.log(`🚀 SERVIDOR ACTIVO EN: ${address}`);
      console.log(`📚 Documentación: ${address}/docs`);
    });

  } catch (err) {
    console.error('💥 Error en el bootstrap:', err);
    process.exit(1);
  }
}

bootstrap();
