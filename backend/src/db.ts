import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectMongo() {
  if (!config.mongoUri) throw new Error('MONGODB_URI missing');
  const serverSelectionTimeoutMS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000);
  const socketTimeoutMS = Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 20000);
  const opts: any = { dbName: 'trivida', serverSelectionTimeoutMS, socketTimeoutMS };
  if ((process.env.MONGODB_TLS_INSECURE === '1' || process.env.MONGODB_ALLOW_INVALID_CERT === '1')) {
    // À utiliser uniquement en DEV si nécessaire
    opts.tlsAllowInvalidCertificates = true;
  }
  await mongoose.connect(config.mongoUri, opts);
}

export default mongoose;
