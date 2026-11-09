// Auditoría rápida de la conexión a la base de datos: `npm run db:check`
import 'dotenv/config';
import { prisma, connectWithRetry } from './prisma.js';

try {
  await connectWithRetry({ retries: 1 });
  const tablas = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`;
  console.log(`[DB] Tablas (${tablas.length}): ${tablas.map((t) => t.table_name).join(', ') || '(ninguna — ejecuta npm run db:push)'}`);
  const [usuarios, transacciones] = await Promise.all([
    prisma.usuario.count().catch(() => 'n/a'),
    prisma.transaccion.count().catch(() => 'n/a')
  ]);
  console.log(`[DB] Registros → usuarios: ${usuarios}, transacciones: ${transacciones}`);
} catch (e) {
  console.error('[DB] La auditoría falló:', e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
