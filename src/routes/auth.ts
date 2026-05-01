import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { registerSchema, loginSchema } from '../schemas/validation';

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/register
  fastify.post('/register', async (request, reply) => {
    const { email, password } = registerSchema.parse(request.body);
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return reply.status(400).send({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    return { message: 'Usuario registrado correctamente' };
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    
    const user = await User.findOne({ email });
    if (!user) {
      return reply.status(401).send({ message: 'Email o contraseña incorrectos' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return reply.status(401).send({ message: 'Email o contraseña incorrectos' });
    }

    const token = fastify.jwt.sign({ userId: user._id, email: user.email });
    return { token, user: { id: user._id, email: user.email } };
  });

  // GET /api/v1/auth/users
  fastify.get('/users', { preHandler: [fastify.authenticate] }, async (request) => {
    const users = await User.find({}, 'email _id');
    // Filtrar al usuario actual si se desea
    return users.filter(u => u._id.toString() !== (request.user as any).userId);
  });
}
