require("dotenv/config");

const { PrismaLibSql } = require("@prisma/adapter-libsql");
const { PrismaClient, Role, ProjectStatus, TaskStatus, Priority } = require("@prisma/client");
const bcrypt = require("bcrypt");

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("[seed] Iniciando...");

  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  console.log("[seed] Base de datos limpiada");

  const password = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Carlos Mendoza",
      email: "admin@novatech.mx",
      passwordHash: password,
      role: Role.ADMIN,
    },
  });

  const gerente = await prisma.user.create({
    data: {
      name: "Laura Vargas",
      email: "gerente@novatech.mx",
      passwordHash: password,
      role: Role.GERENTE,
    },
  });

  const lider = await prisma.user.create({
    data: {
      name: "Andres Torres",
      email: "lider@novatech.mx",
      passwordHash: password,
      role: Role.LIDER,
    },
  });

  const empleado1 = await prisma.user.create({
    data: {
      name: "Maria Ramirez",
      email: "empleado1@novatech.mx",
      passwordHash: password,
      role: Role.EMPLEADO,
    },
  });

  const empleado2 = await prisma.user.create({
    data: {
      name: "Diego Flores",
      email: "empleado2@novatech.mx",
      passwordHash: password,
      role: Role.EMPLEADO,
    },
  });
  console.log("[seed] Usuarios creados");

  const proyecto1 = await prisma.project.create({
    data: {
      name: "Portal Web Cliente Bancario",
      description: "Portal web responsivo para gestion de cuentas, transferencias e historial de movimientos.",
      startDate: new Date("2026-03-01"),
      deadline: new Date("2026-04-15"),
      status: ProjectStatus.ACTIVO,
      creatorId: gerente.id,
      leaderId: lider.id,
    },
  });

  const proyecto2 = await prisma.project.create({
    data: {
      name: "App Movil Inventario",
      description: "Aplicacion movil para control de inventario en tiempo real con lector de codigo de barras.",
      startDate: new Date("2026-02-01"),
      deadline: new Date("2026-05-30"),
      status: ProjectStatus.PAUSADO,
      creatorId: gerente.id,
      leaderId: lider.id,
    },
  });

  const proyecto3 = await prisma.project.create({
    data: {
      name: "Sistema de Nomina Inteligente",
      description: "Modernizacion del sistema de nomina con reportes, aprobaciones y portal de colaboradores.",
      startDate: new Date("2026-02-20"),
      deadline: new Date("2026-04-28"),
      status: ProjectStatus.ACTIVO,
      creatorId: admin.id,
      leaderId: lider.id,
    },
  });
  console.log("[seed] Proyectos creados");

  await prisma.projectMember.createMany({
    data: [
      { projectId: proyecto1.id, userId: lider.id },
      { projectId: proyecto1.id, userId: empleado1.id },
      { projectId: proyecto1.id, userId: empleado2.id },
      { projectId: proyecto2.id, userId: lider.id },
      { projectId: proyecto2.id, userId: empleado1.id },
      { projectId: proyecto2.id, userId: empleado2.id },
      { projectId: proyecto3.id, userId: lider.id },
      { projectId: proyecto3.id, userId: empleado2.id },
      { projectId: proyecto3.id, userId: gerente.id },
    ],
  });
  console.log("[seed] Membresias creadas");

  const tarea1 = await prisma.task.create({
    data: {
      title: "Diseno de wireframes del portal",
      description: "Crear wireframes de baja fidelidad para las pantallas principales del portal.",
      status: TaskStatus.COMPLETADA,
      priority: Priority.ALTA,
      deadline: new Date("2026-03-10"),
      completedAt: new Date("2026-03-09"),
      projectId: proyecto1.id,
      assigneeId: empleado1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Configuracion del entorno de desarrollo",
      description: "Preparar Angular, Express, Prisma, base de datos y flujos de trabajo en GitHub.",
      status: TaskStatus.COMPLETADA,
      priority: Priority.ALTA,
      deadline: new Date("2026-03-08"),
      completedAt: new Date("2026-03-07"),
      projectId: proyecto1.id,
      assigneeId: empleado2.id,
    },
  });

  const tarea3 = await prisma.task.create({
    data: {
      title: "Desarrollo del modulo de autenticacion",
      description: "Implementar login con JWT, guards por rol e interceptor de autorizacion.",
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.ALTA,
      deadline: new Date("2026-03-20"),
      projectId: proyecto1.id,
      assigneeId: empleado2.id,
    },
  });

  const tarea4 = await prisma.task.create({
    data: {
      title: "Diseno de base de datos del modulo de transferencias",
      description: "Modelar tablas, relaciones y primeras migraciones con Prisma.",
      status: TaskStatus.EN_REVISION,
      priority: Priority.ALTA,
      deadline: new Date("2026-03-18"),
      projectId: proyecto1.id,
      assigneeId: empleado1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Implementar historial de movimientos",
      description: "Crear endpoint con paginacion, filtros por fecha y exportacion a CSV.",
      status: TaskStatus.PENDIENTE,
      priority: Priority.MEDIA,
      deadline: new Date("2026-04-01"),
      projectId: proyecto1.id,
      assigneeId: empleado1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Pruebas de usabilidad con usuarios reales",
      description: "Aplicar cuestionario SUS y documentar hallazgos.",
      status: TaskStatus.PENDIENTE,
      priority: Priority.BAJA,
      deadline: new Date("2026-04-10"),
      projectId: proyecto1.id,
      assigneeId: empleado1.id,
    },
  });

  const tarea7 = await prisma.task.create({
    data: {
      title: "Definir reglas de aprobacion de nomina",
      description: "Documentar flujo de autorizacion para incidencias, bonos y horas extra.",
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.MEDIA,
      deadline: new Date("2026-04-05"),
      projectId: proyecto3.id,
      assigneeId: gerente.id,
    },
  });

  const tarea8 = await prisma.task.create({
    data: {
      title: "Validar integracion con reportes de RH",
      description: "Revisar widgets operativos y validar consistencia de datos.",
      status: TaskStatus.PENDIENTE,
      priority: Priority.ALTA,
      deadline: new Date("2026-04-08"),
      projectId: proyecto3.id,
      assigneeId: lider.id,
    },
  });

  const tarea9 = await prisma.task.create({
    data: {
      title: "Ajustar exportacion de recibos a PDF",
      description: "Corregir formato, logo y margenes para la descarga de recibos.",
      status: TaskStatus.PENDIENTE,
      priority: Priority.MEDIA,
      deadline: new Date("2026-04-09"),
      projectId: proyecto2.id,
      assigneeId: empleado2.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Crear tablero de alertas de inventario",
      description: "Disenar pantalla de stock minimo y notificaciones de reabastecimiento.",
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.ALTA,
      deadline: new Date("2026-04-12"),
      projectId: proyecto2.id,
      assigneeId: empleado1.id,
    },
  });

  const tarea11 = await prisma.task.create({
    data: {
      title: "Preparar reporte ejecutivo para direccion",
      description: "Consolidar avance, riesgos y metricas clave del sistema.",
      status: TaskStatus.PENDIENTE,
      priority: Priority.MEDIA,
      deadline: new Date("2026-04-18"),
      projectId: proyecto3.id,
      assigneeId: gerente.id,
    },
  });
  console.log("[seed] Tareas creadas");

  await prisma.comment.createMany({
    data: [
      {
        content: "Wireframes listos y validados con el cliente.",
        taskId: tarea1.id,
        authorId: empleado1.id,
      },
      {
        content: "Aprobado para continuar con el prototipo de alta fidelidad.",
        taskId: tarea1.id,
        authorId: lider.id,
      },
      {
        content: "Tengo un bloqueo con la persistencia del token entre recargas.",
        taskId: tarea3.id,
        authorId: empleado2.id,
      },
      {
        content: "Revisa el guardado del token en localStorage desde el servicio.",
        taskId: tarea3.id,
        authorId: lider.id,
      },
      {
        content: "Schema listo, pendiente validar relaciones con datos reales.",
        taskId: tarea4.id,
        authorId: empleado1.id,
      },
      {
        content: "Necesito validar estas reglas con RH antes de cerrar el flujo.",
        taskId: tarea7.id,
        authorId: gerente.id,
      },
      {
        content: "Voy a revisar la parte del PDF junto con los estilos del frontend.",
        taskId: tarea9.id,
        authorId: empleado2.id,
      },
      {
        content: "La gerencia quiere ver alertas por prioridad y fecha limite.",
        taskId: tarea11.id,
        authorId: admin.id,
      },
    ],
  });
  console.log("[seed] Comentarios creados");

  console.log("[seed] Resumen:");
  console.log("  Usuarios: 5");
  console.log("  Proyectos: 3");
  console.log("  Membresias: 9");
  console.log("  Tareas: 11");
  console.log("  Comentarios: 8");
  console.log("  Password comun: Password123!");
}

main()
  .catch((error) => {
    console.error("[seed] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
