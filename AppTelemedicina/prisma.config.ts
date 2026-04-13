import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURACIÓN DE RUTAS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargamos el .env desde la carpeta 'serve'
const envPath = path.resolve(__dirname, 'serve/.env');
dotenv.config({ path: envPath });

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error(`❌ DATABASE_URL no encontrada en: ${envPath}`);
}

export default defineConfig({
  // Ruta relativa al archivo schema.prisma
  schema: './prisma/schema.prisma',

  datasource: {
    url: databaseUrl,
  },

  // --- CONFIGURACIÓN PARA EL SEED ---
  migrations: {
    // Esto le dice a Prisma cómo ejecutar tu archivo seed.ts
    // Usamos 'tsx' porque es compatible con ESM y TypeScript de forma nativa
    seed: 'npx tsx prisma/seed.ts',
  },
});
