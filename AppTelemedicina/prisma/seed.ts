import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURACIÓN PARA ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // 1. Cargamos el .env desde la carpeta 'serve'
  const envPath = path.resolve(__dirname, '../serve/.env');
  dotenv.config({ path: envPath });

  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error(`❌ DATABASE_URL no encontrada en: ${envPath}`);
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool as any);
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Iniciando el sembrado de datos (Prisma 7)...');

  try {
    // --- 2. CREAR ADMINISTRADOR ---
    const admin = await prisma.usuario.upsert({
      where: { email: 'admin@telemed.com' },
      update: {},
      create: {
        email: 'admin@telemed.com',
        password: 'adminpassword',
        nombre: 'Administrador',
        apellido: 'Sistema',
        rol: 'ADMIN',
        telefono: '9511234567',
        activo: true
      },
    });

    // --- 3. CREAR MÉDICO (Elena Ramos) ---
    const medico = await prisma.usuario.upsert({
      where: { email: 'doctor@telemed.com' },
      update: {},
      create: {
        email: 'doctor@telemed.com',
        password: 'password123',
        nombre: 'Elena',
        apellido: 'Ramos',
        rol: 'MEDICO',
        especialidad: 'Cardiología',
        cedula: 'CED-78945612', // Requerido por el nuevo esquema
        telefono: '9519876543',
        activo: true
      },
    });

    // --- 4. CREAR PACIENTE (Sashid Pérez) Y VINCULAR CONSULTAS ---
    const usuario = await prisma.usuario.upsert({
      where: { email: 'paciente@telemed.com' },
      update: {},
      create: {
        email: 'paciente@telemed.com',
        password: 'password123',
        nombre: 'Sashid',
        apellido: 'Pérez',
        rol: 'PACIENTE',
        telefono: '9715554433',
        activo: true,
        consultas: {
          create: [
            {
              fecha: new Date('2026-03-27T10:00:00Z'),
              motivo: 'Chequeo general de rutina',
              tipo: 'PRESENCIAL',
              medicoId: medico.id
            },
            {
              fecha: new Date('2026-03-30T15:30:00Z'),
              motivo: 'Seguimiento de presión arterial',
              tipo: 'VIDEOLLAMADA',
              medicoId: medico.id
            }
          ]
        }
      },
    });

    console.log('✅ Base de datos poblada con éxito.');
    console.log('--------------------------------------------------');
    console.log(`🔑 Admin:    ${admin.email}`);
    console.log(`👨‍⚕️ Médico:   ${medico.email} (ID: ${medico.id})`);
    console.log(`👤 Paciente: ${usuario.email} (ID: ${usuario.id})`);
    console.log('--------------------------------------------------');

  } catch (error) {
    console.error('❌ Error durante la ejecución del seed:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Error fatal en el seed:', e);
  process.exit(1);
});
