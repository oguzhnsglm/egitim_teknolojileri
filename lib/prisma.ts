type PrismaClient = import('@prisma/client').PrismaClient;

declare global {
  var prismaGlobal: PrismaClient | null | undefined;
}

let prismaInstance: PrismaClient | null = null;
let isAvailable = false;

if (process.env.DATABASE_URL) {
  try {
    if (typeof globalThis.prismaGlobal === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaClient: PrismaClientConstructor } = require('@prisma/client');
      const client = new PrismaClientConstructor({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : undefined,
      });
      globalThis.prismaGlobal = client;
    }
    prismaInstance = globalThis.prismaGlobal ?? null;
    isAvailable = prismaInstance !== null;
  } catch (error) {
    prismaInstance = null;
    isAvailable = false;
    if (process.env.NODE_ENV === 'development') {
      console.warn('[prisma] Prisma Client unavailable, falling back to in-memory store.', error);
    }
  }
} else if (process.env.NODE_ENV === 'development') {
  console.warn('[prisma] DATABASE_URL not set, using in-memory store.');
}

export const prisma = prismaInstance;
export const prismaAvailable = isAvailable;

