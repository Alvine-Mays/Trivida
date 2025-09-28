import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';

export let app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('trivida');
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri, { dbName: 'trivida' });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
