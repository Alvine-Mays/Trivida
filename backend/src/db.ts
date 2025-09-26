import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectMongo() {
  if (!config.mongoUri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(config.mongoUri, { dbName: 'trivida' });
}

export default mongoose;
