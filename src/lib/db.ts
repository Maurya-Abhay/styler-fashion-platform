import mongoose, { type Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && process.env.NODE_ENV !== "test") {
  // Do not throw during module import; throw when a DB connection is actually requested.
}

type MongooseCache = { conn: Mongoose | null; promise: Promise<Mongoose> | null };
const globalForMongoose = globalThis as typeof globalThis & { __stylerMongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose.__stylerMongoose ?? { conn: null, promise: null };
globalForMongoose.__stylerMongoose = cache;

export async function connectDB(): Promise<Mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE ?? 10),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SELECTION_TIMEOUT_MS ?? 10000),
    });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  cache.conn = null;
  cache.promise = null;
  await mongoose.disconnect();
}
