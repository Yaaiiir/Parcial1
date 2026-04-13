import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import express from 'express';
import cors from 'cors';
import PDFDocument from 'pdfkit'; // Cambia el 'require' por este 'import'

const app = express();
const PORT = 3000;

// 1. Configuración de la Base de Datos
const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('❌ DATABASE_URL no definida');

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// 2. Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- RUTAS GENERALES ---

app.get('/', (req, res) => res.send('🚀 Servidor TeleMed Online con Prisma 7'));

/**
 * LOGIN
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.usuario.findUnique({ where: { email: String(email) } });

    if (user && user.password === password) {
      const { password: _, ...userSafe } = user;
      res.json({ success: true, user: userSafe });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

/**
 * LISTA DE MÉDICOS
 */
app.get('/api/medicos', async (req, res) => {
  try {
    const medicos = await prisma.usuario.findMany({
      where: { rol: 'MEDICO' }
    });
    res.json(medicos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener médicos' });
  }
});

/**
 * CONSULTAS Y AGENDA
 */
app.get('/api/consultas/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const consultas = await prisma.consulta.findMany({
      where: { usuarioId: Number(userId) },
      include: { medico: true },
      orderBy: { fecha: 'asc' }
    });
    res.json(consultas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener consultas' });
  }
});

app.get('/api/doctor/agenda/:medicoId', async (req, res) => {
  try {
    const { medicoId } = req.params;
    const agenda = await prisma.consulta.findMany({
      where: { medicoId: Number(medicoId) },
      include: { usuario: true },
      orderBy: { fecha: 'asc' }
    });
    res.json(agenda);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la agenda' });
  }
});

app.put('/api/consultas/:id/completar', async (req, res) => {
  try {
    const { id } = req.params;
    const consulta = await prisma.consulta.update({
      where: { id: Number(id) },
      data: { motivo: `[ATENDIDA] ${req.body.motivo || ''}` }
    });
    res.json({ success: true, consulta });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la cita' });
  }
});

/**
 * ANÁLISIS Y ESTADÍSTICAS
 */
app.get('/api/doctor/analisis/:medicoId', async (req, res) => {
  try {
    const { medicoId } = req.params;
    const id = Number(medicoId);

    const totalConsultas = await prisma.consulta.count({ where: { medicoId: id } });
    const doctor = await prisma.usuario.findUnique({ where: { id } });
    const nombreFull = `${doctor?.nombre} ${doctor?.apellido}`;

    const totalRecetas = await prisma.receta.count({ where: { doctorNombre: nombreFull } });

    const agenda = await prisma.consulta.findMany({
      where: { medicoId: id },
      select: { usuarioId: true }
    });
    const pacientesUnicos = new Set(agenda.map(a => a.usuarioId)).size;

    res.json({
      totalConsultas,
      totalRecetas,
      pacientesUnicos,
      promedioRecetas: totalConsultas > 0 ? (totalRecetas / totalConsultas).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar análisis' });
  }
});

/**
 * CRUD DE RECETAS
 */
app.get('/api/recetas/medico/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    const nombreCompleto = `${doctor?.nombre} ${doctor?.apellido}`;

    const recetas = await prisma.receta.findMany({
      where: { doctorNombre: nombreCompleto },
      include: { usuario: true },
      orderBy: { fechaEmision: 'desc' }
    });
    res.json(recetas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

app.post('/api/recetas', async (req, res) => {
  try {
    const { usuarioId, medicamento, indicaciones, doctorNombre } = req.body;
    const nuevaReceta = await prisma.receta.create({
      data: {
        medicamento,
        indicaciones,
        doctorNombre,
        estatus: "ACTIVA",
        usuario: { connect: { id: Number(usuarioId) } }
      }
    });
    res.json(nuevaReceta);
  } catch (error: any) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error al crear receta' });
  }
});

/**
 * AGENDAR NUEVA CITA
 */
app.post('/api/consultas', async (req, res) => {
  try {
    const { usuarioId, medicoId, fecha, motivo, tipo } = req.body;

    // Validación básica de datos recibidos
    if (!usuarioId || !medicoId || !fecha) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios (usuarioId, medicoId o fecha)'
      });
    }

    const nuevaConsulta = await prisma.consulta.create({
      data: {
        fecha: new Date(fecha), // Prisma necesita un objeto Date
        motivo: motivo || 'Consulta general',
        tipo: tipo || 'PRESENCIAL',
        // Conexiones usando los IDs (deben ser números)
        usuario: { connect: { id: Number(usuarioId) } },
        medico: { connect: { id: Number(medicoId) } }
      },
      include: {
        medico: true // Devolvemos el médico para que el frontend lo vea de una vez
      }
    });

    res.json({ success: true, consulta: nuevaConsulta });
  } catch (error: any) {
    console.error("Error al agendar cita:", error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la cita en la base de datos',
      error: error.message
    });
  }
});

app.delete('/api/recetas/:id', async (req, res) => {
  try {
    await prisma.receta.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar receta' });
  }
});

/**
 * CRUD DE METAS (ANÁLISIS DOCTOR)
 */

// 1. Obtener Metas
app.get('/api/analisis/metas/:medicoId', async (req, res) => {
  try {
    const metas = await prisma.analisisMeta.findMany({
      where: { medicoId: Number(req.params.medicoId) },
      orderBy: { fecha: 'desc' }
    });
    res.json(metas);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar metas" });
  }
});

// 2. Crear Meta
app.post('/api/analisis/metas', async (req, res) => {
  try {
    const { titulo, medicoId } = req.body;
    const nuevaMeta = await prisma.analisisMeta.create({
      data: {
        titulo,
        medicoId: Number(medicoId),
        completada: false
      }
    });
    res.json(nuevaMeta);
  } catch (error) {
    res.status(500).json({ error: "No se pudo crear la meta" });
  }
});

// 3. Actualizar Meta (Checkbox)
app.put('/api/analisis/metas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completada } = req.body;
    const metaActualizada = await prisma.analisisMeta.update({
      where: { id: Number(id) },
      data: { completada: Boolean(completada) }
    });
    res.json(metaActualizada);
  } catch (error) {
    res.status(500).json({ error: "No se pudo actualizar la meta" });
  }
});

// Borrar Meta en la Base de Datos
app.delete('/api/analisis/metas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.analisisMeta.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true, message: 'Meta eliminada correctamente' });
  } catch (error) {
    console.error("Error al eliminar meta:", error);
    res.status(500).json({ error: "No se pudo borrar la meta de la base de datos" });
  }
});

/**
 * --- MÓDULO DE ADMINISTRACIÓN (CRUD DE USUARIOS) ---
 */

// 1. Obtener todos los usuarios (para la lista del Admin)
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'desc' } // Los más nuevos primero
    });
    // Enviamos el arreglo directamente para que coincida con tu frontend
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: 'Error al obtener la lista de usuarios' });
  }
});

// 2. Crear un nuevo usuario desde el Panel de Admin
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, telefono, especialidad, cedula } = req.body;

    // Verificamos si el correo ya existe para evitar errores de Prisma
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
    }

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        password,
        rol, // El Enum en Prisma debe coincidir: 'ADMIN', 'MEDICO', 'PACIENTE'
        telefono,
        especialidad,
        cedula
      }
    });

    res.json({ success: true, user: nuevoUsuario });
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Actualizar un usuario
app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dataUpdate = req.body;

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: dataUpdate
    });

    res.json({ success: true, user: usuarioActualizado });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
});

// 4. Eliminar un usuario permanentemente
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Importante: Si el usuario tiene citas o recetas, Prisma podría dar error
    // por integridad referencial si no está configurado el OnDelete Cascade.
    await prisma.usuario.delete({
      where: { id: Number(id) }
    });

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: 'No se puede eliminar el usuario (posiblemente tiene citas o recetas vinculadas)'
    });
  }
});

// Ejemplo de cómo debería estar en tu backend
app.get('/api/recetas/usuario/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const recetas = await prisma.receta.findMany({
      where: { usuarioId: parseInt(id) }
    });
    res.json(recetas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// Ejemplo en tu archivo de rutas del servidor (index.js o rutas/recetas.js)
app.get('/api/recetas/generar-pdf/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const receta = await prisma.receta.findUnique({ where: { id: parseInt(id) } });
    if (!receta) return res.status(404).send('Receta no encontrada');

    // 1. Configuración de cabeceras para PDF real
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=receta_${id}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res); // Conecta el PDF a la respuesta del navegador

    // --- CONTENIDO DEL PDF CORREGIDO ---

    // Título Principal
    doc.fillColor('#2c3e50')
       .font('Helvetica-Bold') // Seteamos negrita
       .fontSize(22)
       .text('RECETA MÉDICA DIGITAL', { align: 'center' });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(2);

    // Información del Doctor (Cambiando fuentes manualmente)
    doc.fillColor('black').fontSize(12);

    doc.font('Helvetica-Bold').text('Doctor(a): ', { continued: true });
    doc.font('Helvetica').text(receta.doctorNombre);

    doc.font('Helvetica-Bold').text('Fecha: ', { continued: true });
    doc.font('Helvetica').text(new Date(receta.fechaEmision).toLocaleDateString());

    doc.moveDown(2);

    // Sección de Prescripción
    doc.fontSize(14)
       .fillColor('#2980b9')
       .font('Helvetica-Bold')
       .text('PRESCRIPCIÓN:');

    doc.fontSize(16)
       .fillColor('black')
       .font('Helvetica')
       .text(receta.medicamento);

    doc.moveDown();

    // Sección de Indicaciones
    doc.fontSize(14)
       .fillColor('#2980b9')
       .font('Helvetica-Bold')
       .text('INDICACIONES:');

    doc.fontSize(12)
       .fillColor('black')
       .font('Helvetica')
       .text(receta.indicaciones || 'Seguir instrucciones indicadas.');

    // Pie de página decorativo
    doc.moveDown(4);
    doc.fontSize(10)
       .fillColor('grey')
       .text('Este es un documento oficial emitido mediante TeleMedicina.', { align: 'center' });

    // 2. Finaliza y envía el flujo de datos
    doc.end();

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).send('Error al generar el archivo');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('--------------------------------------------------');
  console.log(`🚀 Servidor en Red Local: http://192.168.0.18:${PORT}`);
  console.log('--------------------------------------------------');
});
