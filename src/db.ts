import mongoose from 'mongoose';

/**
 * Conecta a MongoDB usando la URI del entorno.
 * Usa la caché de conexión de Mongoose para evitar reconexiones duplicadas.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definida en las variables de entorno');
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB conectado correctamente');
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err);
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Error en MongoDB:', err);
  });
}
