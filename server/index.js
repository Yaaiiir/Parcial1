const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ITVE',
  password: 'QvzjP012', 
  port: 5432,
});

/**
 * API 1: Obtener el catálogo general de temas
 */
app.get('/api/ejercicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ejercicios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/ejercicios:", err.message);
    res.status(500).send("Error en el servidor");
  }
});

/**
 * API 2: Obtener retos detallados
 */
app.get('/api/ejercicios-detallados/:ejercicioId/:dificultad', async (req, res) => {
  try {
    const { ejercicioId, dificultad } = req.params;
    const query = `
      SELECT id, enunciado, formula_latex, respuesta_correcta 
      FROM ejercicios_detallados 
      WHERE ejercicio_id = $1 AND dificultad = $2 
      ORDER BY id ASC 
      LIMIT 5
    `;
    const result = await pool.query(query, [ejercicioId, dificultad]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No se encontraron ejercicios." });
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error en la consulta detallada:", err.message);
    res.status(500).send("Error interno del servidor");
  }
});

/**
 * API 3: Obtener catálogo de Libros
 */
app.get('/api/libros', async (req, res) => {
  try {
    const query = 'SELECT * FROM libros ORDER BY id ASC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/libros:", err.message);
    res.status(500).send("Error al obtener libros");
  }
});

/**
 * API 4: Obtener catálogo de Videos (NUEVA RUTA)
 * Llena la sección estilo YouTube de AdaptiMath.
 */
app.get('/api/videos', async (req, res) => {
  try {
    const query = 'SELECT * FROM videos ORDER BY id DESC'; // DESC para ver los más nuevos primero
    const result = await pool.query(query);
    
    console.log(`🎬 Petición de Videoteca -> ${result.rows.length} videos enviados`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/videos:", err.message);
    res.status(500).send("Error al obtener la lista de videos");
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`🚀 Servidor ITVE AdaptiMath corriendo`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`📅 Estado: Operativo (CMMI L3 Standards)`);
  console.log(`📚 Ruta Libros: /api/libros (Activa)`);
  console.log(`🎥 Ruta Videos: /api/videos (Activa)`); // Log de confirmación
  console.log(`==========================================`);
});