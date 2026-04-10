/**
 * ==========================================
 *  ITVE AdaptiMath - Backend API
 *  Servidor Express + PostgreSQL
 *  Roles: Admin | Profesor | Estudiante
 * ==========================================
 */

const express = require('express');
const { Pool }  = require('pg');
const cors      = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────
//  CONFIGURACIÓN DE BASE DE DATOS
// ──────────────────────────────────────────
const pool = new Pool({
  user:     'postgres',
  host:     'localhost',
  database: 'ITVE',
  password: 'QvzjP012',
  port:     5432,
});


// ══════════════════════════════════════════
//  SECCIÓN 1 — AUTENTICACIÓN
// ══════════════════════════════════════════

/**
 * POST /api/login
 * Login universal por rol (admin / profesor / estudiante)
 */
app.post('/api/login', async (req, res) => {
  const { email, password, rol } = req.body;
  try {
    const query = `
      SELECT id, nombre, correo AS email, rol, nivel, grado
      FROM   usuarios
      WHERE  correo = $1 AND password = $2 AND rol = $3
    `;
    const result = await pool.query(query, [email, password, rol]);

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales o rol incorrectos' });
    }
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).send('Error en el servidor');
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 2 — USUARIOS
// ══════════════════════════════════════════

/**
 * GET /api/usuarios
 * Devuelve todos los usuarios. Filtra por ?rol= si se indica.
 */
app.get('/api/usuarios', async (req, res) => {
  const { rol } = req.query;
  try {
    let query  = 'SELECT id, nombre, correo, grado, nivel, rol FROM usuarios';
    const params = [];

    if (rol) {
      query += ' WHERE rol = $1';
      params.push(rol);
    }

    query += ' ORDER BY nombre ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en /api/usuarios:', err.message);
    res.status(500).send('Error de servidor');
  }
});

/**
 * POST /api/usuarios/registro
 * Registra un nuevo usuario (solo Admin)
 */
app.post('/api/usuarios/registro', async (req, res) => {
  const { nombre, correo, password, rol, nivel, grado } = req.body;
  try {
    const query = `
      INSERT INTO usuarios (nombre, correo, password, rol, nivel, grado)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await pool.query(query, [nombre, correo, password, rol, nivel, grado || 1]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/usuarios/:id
 * Actualiza nombre, correo y nivel de un usuario
 */
app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, nivel } = req.body;
  try {
    await pool.query(
      'UPDATE usuarios SET nombre = $1, correo = $2, nivel = $3 WHERE id = $4',
      [nombre, correo, nivel, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Error al actualizar');
  }
});

/**
 * DELETE /api/usuarios/:id
 * Elimina un usuario por ID
 */
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Error al eliminar');
  }
});

/**
 * GET /api/usuarios/:id/materias
 * Devuelve las materias asignadas a un profesor (checkboxes en modal de edición)
 */
app.get('/api/usuarios/:id/materias', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_materia FROM Materias_Destinadas WHERE id_profesor_asignador = $1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al consultar materias del docente' });
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 3 — MATERIAS
// ══════════════════════════════════════════

/**
 * GET /api/materias
 * Catálogo completo de materias (Secundaria / Preparatoria)
 */
app.get('/api/materias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materias ORDER BY nivel DESC, grado ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener materias:', err.message);
    res.status(500).send('Error en el servidor');
  }
});

/**
 * PUT /api/materias/:id
 * Actualiza nombre y bibliografía de una materia
 */
app.put('/api/materias/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, bibliografia } = req.body;
  try {
    await pool.query(
      'UPDATE materias SET nombre = $1, bibliografia = $2 WHERE id = $3',
      [nombre, bibliografia, id]
    );
    res.send('Materia actualizada');
  } catch (err) {
    res.status(500).send('Error al actualizar');
  }
});

/**
 * GET /api/materias/:id/alumnos
 * Devuelve alumnos de una materia con su progreso promedio real
 */
app.get('/api/materias/:id/alumnos', async (req, res) => {
  const id_materia = parseInt(req.params.id);
  try {
    const query = `
      SELECT
        u.id,
        u.nombre,
        COALESCE(AVG(p.porcentaje), 0) AS progreso,
        md.fecha_asignacion                AS ultimo_acceso
      FROM   usuarios u
      JOIN   materias_destinadas md ON u.id = md.id_estudiante
      LEFT JOIN ejercicios e
             ON LOWER(e.tema_padre) = (SELECT LOWER(nombre) FROM materias WHERE id = $1)
      LEFT JOIN progreso p
             ON u.id = p.id_usuario AND p.id_ejercicio = e.id
      WHERE  md.id_materia = $1 AND u.rol = 'estudiante'
      GROUP  BY u.id, u.nombre, md.fecha_asignacion
    `;
    const result = await pool.query(query, [id_materia]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en alumnos por materia:', err.message);
    res.status(500).send('Error al obtener alumnos');
  }
});

/**
 * POST /api/materias/asignar
 * Asigna una materia a un estudiante
 */
app.post('/api/materias/asignar', async (req, res) => {
  const { id_materia, id_estudiante, id_profesor } = req.body;
  try {
    const query = `
      INSERT INTO materias_destinadas (id_materia, id_estudiante, id_profesor_asignador)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [id_materia, id_estudiante, id_profesor]);
    res.json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error('Error al asignar materia:', err.message);
    res.status(500).json({ success: false, message: 'Error al vincular materia' });
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 4 — EJERCICIOS
// ══════════════════════════════════════════

/**
 * GET /api/ejercicios
 * Catálogo completo de ejercicios
 */
app.get('/api/ejercicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ejercicios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Error');
  }
});

/**
 * GET /api/ejercicios/:id/progreso
 * Progreso de todos los estudiantes en un ejercicio (vista del profesor)
 */
app.get('/api/ejercicios/:id/progreso', async (req, res) => {
  const id_ejercicio = parseInt(req.params.id);
  try {
    const query = `
      SELECT
        u.id                                     AS id_estudiante,
        u.nombre                                 AS nombre_estudiante,
        COALESCE(p.completado,  false)           AS completado,
        COALESCE(p.porcentaje,  0)               AS porcentaje,
        COALESCE(p.calificacion, 0)              AS calificacion,
        p.fecha_actualizacion
      FROM   usuarios u
      LEFT JOIN progreso p
             ON u.id = p.id_usuario AND p.id_ejercicio = $1
      WHERE  u.rol = 'estudiante'
      ORDER  BY u.nombre ASC
    `;
    const result = await pool.query(query, [id_ejercicio]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener progreso detallado:', err.message);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

/**
 * GET /api/ejercicios/profesor/:id
 * Ejercicios visibles para un profesor:
 *   - Opción A: El profesor es el creador directo
 *   - Opción B: El tema del ejercicio coincide con una materia asignada al profesor
 */
app.get('/api/ejercicios/profesor/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT DISTINCT
        e.id,
        e.nivel,
        e.titulo,
        e.descripcion,
        e.tema_padre,
        e.dificultad_base,
        COALESCE(m.nombre, e.tema_padre, 'General') AS nombre_materia
      FROM   ejercicios e
      LEFT JOIN materias_destinadas md ON md.id_profesor_asignador = $1
      LEFT JOIN materias             m  ON md.id_materia = m.id
      WHERE
        e.id_creador = $1
        OR (
          LOWER(TRIM(e.tema_padre)) = LOWER(TRIM(m.nombre))
          AND m.nombre IS NOT NULL
        )
      ORDER BY e.id DESC
    `;
    const result = await pool.query(query, [id]);

    console.log(`[DEBUG] Ejercicios para Profesor ID ${id}: ${result.rowCount} encontrados`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en ejercicios/profesor:', err.message);
    res.status(500).json({ error: 'Error al sincronizar temas' });
  }
});

/**
 * GET /api/ejercicios-detallados/:ejercicioId/:dificultad
 * Retos detallados por dificultad (máx. 5 por consulta)
 */
app.get('/api/ejercicios-detallados/:ejercicioId/:dificultad', async (req, res) => {
  const { ejercicioId, dificultad } = req.params;
  try {
    const query = `
      SELECT id, enunciado, formula_latex, respuesta_correcta
      FROM   ejercicios_detallados
      WHERE  ejercicio_id = $1 AND dificultad = $2
      ORDER  BY id ASC
      LIMIT  5
    `;
    const result = await pool.query(query, [ejercicioId, dificultad]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Error interno');
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 5 — PROGRESO
// ══════════════════════════════════════════

/**
 * POST /api/progreso/actualizar
 * Upsert de progreso del estudiante en un ejercicio.
 * - Acumula tiempo_empleado
 * - Conserva la calificación máxima
 */
app.post('/api/progreso/actualizar', async (req, res) => {
  const { id_usuario, id_ejercicio, porcentaje, tiempo_empleado, calificacion, completado } = req.body;

  console.log(`[RECIBIDO] Usuario: ${id_usuario}, Ejercicio: ${id_ejercicio}, Avance: ${porcentaje}%`);

  if (!id_usuario || !id_ejercicio) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (id_usuario o id_ejercicio)' });
  }

  try {
    const query = `
      INSERT INTO progreso
        (id_usuario, id_ejercicio, porcentaje, tiempo_empleado, calificacion, completado, fecha_actualizacion)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (id_usuario, id_ejercicio) DO UPDATE SET
        porcentaje        = EXCLUDED.porcentaje,
        tiempo_empleado   = progreso.tiempo_empleado + EXCLUDED.tiempo_empleado,
        calificacion      = GREATEST(progreso.calificacion, EXCLUDED.calificacion),
        completado        = EXCLUDED.completado,
        fecha_actualizacion = CURRENT_TIMESTAMP
    `;
    await pool.query(query, [
      parseInt(id_usuario),
      parseInt(id_ejercicio),
      Math.round(porcentaje    || 0),
      Math.round(tiempo_empleado || 0),
      Math.round(calificacion  || 0),
      completado || false,
    ]);

    res.json({ success: true, message: 'Progreso guardado en la base de datos' });
  } catch (error) {
    console.error('ERROR EN DB:', error.message);
    res.status(500).json({ error: 'No se pudo guardar el progreso' });
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 6 — LIBROS Y VIDEOS
// ══════════════════════════════════════════

/**
 * GET /api/libros
 * Catálogo completo de libros
 */
app.get('/api/libros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM libros ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Error');
  }
});

/**
 * GET /api/videos
 * Catálogo completo de videos (más recientes primero)
 */
app.get('/api/videos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM videos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Error');
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 7 — BÚSQUEDA GLOBAL
// ══════════════════════════════════════════

/**
 * GET /api/search?q=...
 * Búsqueda unificada en fórmulas, libros, ejercicios y videos
 */
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const term = `%${q}%`;
    const queries = [
      pool.query(
        "SELECT id, titulo, categoria AS info, 'formula'   AS tipo FROM formulas  WHERE titulo ILIKE $1 OR categoria ILIKE $1",
        [term]
      ),
      pool.query(
        "SELECT id, titulo, autor     AS info, 'libro'     AS tipo FROM libros     WHERE titulo ILIKE $1 OR autor ILIKE $1",
        [term]
      ),
      pool.query(
        "SELECT id, titulo, nivel     AS info, 'ejercicio' AS tipo FROM ejercicios WHERE titulo ILIKE $1",
        [term]
      ),
      pool.query(
        "SELECT id, titulo, canal     AS info, 'video'     AS tipo FROM videos     WHERE titulo ILIKE $1",
        [term]
      ),
    ];

    const results = await Promise.all(queries);
    res.json(results.flatMap(r => r.rows));
  } catch (err) {
    console.error('Error en búsqueda:', err.message);
    res.status(500).send('Error');
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 8 — REPORTES (PROFESOR)
// ══════════════════════════════════════════

/**
 * POST /api/reportes
 * Guarda un nuevo reporte académico generado por el profesor
 */
app.post('/api/reportes', async (req, res) => {
  const {
    id_estudiante,
    id_materia,
    id_profesor,
    asistencia_escuela,
    disciplina_escuela,
    asistencia_plataforma,
    disciplina_plataforma,
    comentario,
    progreso_actual,
  } = req.body;

  try {
    const query = `
      INSERT INTO reportes (
        id_estudiante, id_materia, id_profesor,
        asistencia_escuela, disciplina_escuela,
        asistencia_plataforma, disciplina_plataforma,
        comentario, progreso_actual, fecha_reporte
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const values = [
      id_estudiante, id_materia, id_profesor,
      asistencia_escuela, disciplina_escuela,
      asistencia_plataforma, disciplina_plataforma,
      comentario, progreso_actual,
    ];
    const result = await pool.query(query, values);

    res.status(201).json({ message: 'Reporte guardado exitosamente', reporte: result.rows[0] });
  } catch (err) {
    console.error('Error al insertar reporte:', err);
    res.status(500).send('Error interno al guardar el reporte');
  }
});

/**
 * GET /api/profesor/:id/reportes
 * Historial de reportes creados por un profesor
 */
app.get('/api/profesor/:id/reportes', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT
        r.*,
        u.nombre AS nombre_estudiante,
        m.nombre AS nombre_materia
      FROM   reportes r
      JOIN   usuarios u ON r.id_estudiante = u.id
      JOIN   materias m ON r.id_materia    = m.id
      WHERE  r.id_profesor = $1
      ORDER  BY r.fecha_reporte DESC
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener el historial de reportes');
  }
});

/**
 * PUT /api/reportes/:id/enviar
 * Marca un reporte como enviado al administrador
 */
app.put('/api/reportes/:id/enviar', async (req, res) => {
  const { id } = req.params;
  const { enviado_admin, fecha_envio } = req.body;
  try {
    const query = `
      UPDATE reportes
      SET    enviado_admin      = $1,
             fecha_envio_admin  = $2
      WHERE  id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [
      enviado_admin ?? true,
      fecha_envio   || new Date(),
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json({
      success: true,
      message: 'Reporte enviado al administrador correctamente',
      reporte: result.rows[0],
    });
  } catch (err) {
    console.error('Error al actualizar estado del reporte:', err.message);
    res.status(500).json({ error: 'Error interno al procesar el envío' });
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 9 — PANEL ADMINISTRADOR
// ══════════════════════════════════════════

/**
 * GET /api/admin/estadisticas
 * Conteos rápidos para el dashboard del admin
 */
app.get('/api/admin/estadisticas', async (req, res) => {
  try {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM usuarios  WHERE rol = 'estudiante')      AS total_estudiantes,
        (SELECT COUNT(*) FROM usuarios  WHERE rol = 'profesor')        AS total_profesores,
        (SELECT COUNT(*) FROM ejercicios)                              AS total_ejercicios,
        (SELECT COUNT(*) FROM progreso  WHERE completado = true)       AS retos_completados
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Error al generar estadísticas');
  }
});

/**
 * GET /api/admin/materias
 * Todas las materias disponibles (panel admin)
 */
app.get('/api/admin/materias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Materias ORDER BY nivel, nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener materias' });
  }
});

/**
 * GET /api/admin/materias-destinadas
 * Lista de asignaciones materia ↔ estudiante con nombres completos
 */
app.get('/api/admin/materias-destinadas', async (req, res) => {
  try {
    const query = `
      SELECT
        md.id,
        u.nombre AS nombre_estudiante,
        m.nombre AS nombre_materia,
        md.fecha_asignacion
      FROM   materias_destinadas md
      JOIN   usuarios u ON md.id_estudiante = u.id
      JOIN   materias m ON md.id_materia    = m.id
      ORDER  BY md.fecha_asignacion DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener materias destinadas:', err.message);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/admin/materias-destinadas
 * Crea una nueva asignación materia ↔ estudiante
 */
app.post('/api/admin/materias-destinadas', async (req, res) => {
  const { id_materia, id_estudiante, id_profesor_asignador } = req.body;
  try {
    const query = `
      INSERT INTO materias_destinadas (id_materia, id_estudiante, id_profesor_asignador)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [id_materia, id_estudiante, id_profesor_asignador || 1]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al asignar:', err.message);
    res.status(500).json({ error: 'No se pudo asignar la materia' });
  }
});

/**
 * DELETE /api/admin/materias-destinadas/:id
 * Revoca una asignación materia ↔ estudiante
 */
app.delete('/api/admin/materias-destinadas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM materias_destinadas WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Error al revocar');
  }
});

/**
 * POST /api/admin/asignar-materias-profesor
 * Sincroniza las materias de un profesor (borra las previas e inserta las nuevas)
 */
app.post('/api/admin/asignar-materias-profesor', async (req, res) => {
  const { id_profesor, materias } = req.body;
  try {
    await pool.query('BEGIN');

    await pool.query(
      'DELETE FROM Materias_Destinadas WHERE id_profesor_asignador = $1',
      [id_profesor]
    );

    if (materias && materias.length > 0) {
      for (const id_materia of materias) {
        await pool.query(
          'INSERT INTO Materias_Destinadas (id_materia, id_profesor_asignador) VALUES ($1, $2)',
          [id_materia, id_profesor]
        );
      }
    }

    await pool.query('COMMIT');
    res.json({ message: 'Materias sincronizadas correctamente' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error en asignación:', err.message);
    res.status(500).json({ error: 'Error al asignar materias' });
  }
});

/**
 * GET /api/admin/ejercicios
 * Todos los ejercicios para el panel admin
 */
app.get('/api/admin/ejercicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ejercicios ORDER BY titulo ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ejercicios:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

/**
 * POST /api/admin/ejercicios
 * Crea un nuevo ejercicio desde el panel admin
 */
app.post('/api/admin/ejercicios', async (req, res) => {
  const { titulo, descripcion, nivel, badge, tema_padre, id_creador } = req.body;
  try {
    const query = `
      INSERT INTO ejercicios (titulo, descripcion, nivel, badge, tema_padre, id_creador)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      titulo, descripcion, nivel, badge,
      tema_padre || 'General',
      id_creador,
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear ejercicio:', err.message);
    res.status(500).json({ error: 'Error al crear ejercicio' });
  }
});

/**
 * PUT /api/admin/ejercicios/:id/asignar
 * Vincula un ejercicio existente a un profesor (actualiza id_creador)
 */
app.put('/api/admin/ejercicios/:id/asignar', async (req, res) => {
  const { id } = req.params;
  const { id_profesor } = req.body;
  try {
    const query = `
      UPDATE ejercicios
      SET    id_creador = $1
      WHERE  id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [id_profesor, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    res.json({ success: true, message: 'Ejercicio vinculado al profesor' });
  } catch (err) {
    console.error('Error al vincular ejercicio:', err.message);
    res.status(500).json({ error: 'Error interno al vincular' });
  }
});


// ══════════════════════════════════════════
//  SECCIÓN 10 — REPORTES (ADMINISTRADOR)
// ══════════════════════════════════════════

/**
 * GET /api/admin/reportes-detallados
 * Reportes académicos enviados por profesores (Rendimiento)
 */
app.get('/api/admin/reportes-detallados', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, 
        u_est.nombre AS nombre_estudiante, 
        u_prof.nombre AS nombre_profesor, 
        m.nombre AS nombre_materia, 
        r.progreso_actual, 
        r.asistencia_escuela, 
        r.disciplina_escuela, 
        r.comentario, 
        r.fecha_reporte, 
        r.fecha_envio_admin
      FROM reportes r
      INNER JOIN usuarios u_est ON r.id_estudiante = u_est.id
      INNER JOIN usuarios u_prof ON r.id_profesor = u_prof.id
      INNER JOIN materias m ON r.id_materia = m.id
      WHERE r.enviado_admin = TRUE 
        AND r.estado_admin = 'pendiente'
      ORDER BY r.fecha_envio_admin DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ ERROR EN FETCH DE REPORTES ACADÉMICOS:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/reportes-admin
 * Crea reportes de sistema (Recuperación de contraseña, fallos, etc.)
 */
app.post('/api/reportes-admin', async (req, res) => {
    const { titulo, descripcion, categoria, prioridad, autor_nombre, estado } = req.body;
    try {
        await pool.query(
            'INSERT INTO reportes_admin (titulo, descripcion, categoria, prioridad, autor_nombre, estado) VALUES ($1, $2, $3, $4, $5, $6)',
            [titulo, descripcion, categoria, prioridad, autor_nombre, estado || 'pendiente']
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error al guardar reporte de sistema:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/reportes-admin
 * Obtiene los reportes de sistema filtrados por categoría (Ej: Actualización)
 */
app.get('/api/reportes-admin', async (req, res) => {
    const { categoria } = req.query;
    try {
        let query = 'SELECT * FROM reportes_admin';
        const params = [];

        if (categoria) {
            query += ' WHERE categoria = $1';
            params.push(categoria);
        }

        query += ' ORDER BY id DESC'; // O usar fecha_creacion si existe la columna

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener reportes_admin:', err.message);
        res.status(500).json({ error: 'Error al obtener reportes de sistema' });
    }
});

/**
 * PUT /api/reportes-admin/:id
 * Actualiza el estado de una solicitud de sistema (Atendido/Revisado)
 */
app.put('/api/reportes-admin/:id', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        await pool.query(
            'UPDATE reportes_admin SET estado = $1 WHERE id = $2',
            [estado || 'revisado', id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error al actualizar reporte_admin:', err.message);
        res.status(500).send('Error al actualizar estado');
    }
});

/**
 * PUT /api/admin/reportes/:id/archivar
 * Archiva reportes ACADÉMICOS
 */
app.put('/api/admin/reportes/:id/archivar', async (req, res) => {
  try {
    await pool.query(
      "UPDATE reportes SET estado_admin = 'revisado' WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Error al archivar reporte académico');
  }
});

// ══════════════════════════════════════════
//  SECCIÓN 11 — PANEL PROFESOR (extras)
// ══════════════════════════════════════════

/**
 * GET /api/profesor/:id/materias
 * Materias asignadas a un profesor (sin id_estudiante, solo del profe)
 */
app.get('/api/profesor/:id/materias', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT m.*
      FROM   materias m
      JOIN   materias_destinadas md ON m.id = md.id_materia
      WHERE  md.id_profesor_asignador = $1 AND md.id_estudiante IS NULL
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error al obtener materias del profesor');
  }
});


// ──────────────────────────────────────────
//  INICIO DEL SERVIDOR
// ──────────────────────────────────────────
const PORT = 5000;
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🚀 Servidor ITVE AdaptiMath corriendo');
  console.log(`📡 Puerto: ${PORT}`);
  console.log('👤 Roles Soportados: Admin, Profesor, Estudiante');
  console.log('📊 Reportes de Rendimiento: Activos');
  console.log('==========================================');
});