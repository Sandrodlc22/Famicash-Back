import { PrismaClient } from '@prisma/client';

// Instancia global de Prisma Client (FamiCash v2)
export const prisma = new PrismaClient({
  log: ['warn', 'error']
});

// Describe el destino de DATABASE_URL sin exponer credenciales.
export function describeDatabaseUrl(url = process.env.DATABASE_URL) {
  if (!url) return '(DATABASE_URL no definida)';
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? u.username + ':***@' : ''}${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '(DATABASE_URL con formato inválido)';
  }
}

// Conecta con reintentos y deja registro (auditoría) del resultado.
export async function connectWithRetry({ retries = 5, delayMs = 3000 } = {}) {
  const destino = describeDatabaseUrl();
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida. Configúrala (en Railway: ${{Postgres.DATABASE_URL}}).');
  }
  for (let intento = 1; intento <= retries; intento++) {
    const t = Date.now();
    try {
      await prisma.$connect();
      const [info] = await prisma.$queryRaw`SELECT current_database() AS db, version() AS version`;
      console.log(`[DB] ✅ Conectado a ${destino} en ${Date.now() - t}ms (db=${info.db}, ${String(info.version).split(' ').slice(0, 2).join(' ')})`);
      return true;
    } catch (err) {
      console.error(`[DB] ❌ Intento ${intento}/${retries} fallido hacia ${destino}: ${err.message.split('\n').pop()}`);
      if (intento === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}
