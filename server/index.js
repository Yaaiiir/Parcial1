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
 * API 1: Búsqueda Global Unificada
 * Busca en fórmulas, videos, libros y ejercicios simultáneamente.
 */
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const searchTerm = `%${q}%`;
    
    // Consultas optimizadas para cada categoría
    const queries = [
      pool.query("SELECT id, titulo, categoria as info, 'formula' as tipo FROM formulas WHERE titulo ILIKE $1 OR categoria ILIKE $1", [searchTerm]),
      pool.query("SELECT id, titulo, autor as info, 'libro' as tipo FROM libros WHERE titulo ILIKE $1 OR autor ILIKE $1", [searchTerm]),
      pool.query("SELECT id, titulo, nivel as info, 'ejercicio' as tipo FROM ejercicios WHERE titulo ILIKE $1", [searchTerm]),
      pool.query("SELECT id, titulo, canal as info, 'video' as tipo FROM videos WHERE titulo ILIKE $1", [searchTerm])
    ];

    const results = await Promise.all(queries);
    const flattenedResults = results.flatMap(r => r.rows);
    
    console.log(`🔍 Búsqueda: "${q}" -> ${flattenedResults.length} coincidencias`);
    res.json(flattenedResults);
  } catch (err) {
    console.error("Error en búsqueda global:", err.message);
    res.status(500).send("Error en el servidor");
  }
});

/**
 * API 2: Catálogo de Retos
 */
app.get('/api/ejercicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ejercicios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
});

/**
 * API 3: Retos detallados por dificultad
 */
app.get('/api/ejercicios-detallados/:ejercicioId/:dificultad', async (req, res) => {
  try {
    const { ejercicioId, dificultad } = req.params;
    const query = `
      SELECT id, enunciado, formula_latex, respuesta_correcta 
      FROM ejercicios_detallados 
      WHERE ejercicio_id = $1 AND dificultad = $2 
      ORDER BY id ASC LIMIT 5
    `;
    const result = await pool.query(query, [ejercicioId, dificultad]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error interno");
  }
});

/**
 * API 4: Catálogo de Libros y Videos
 */
app.get('/api/libros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM libros ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error");
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM videos ORDER BY id DESC'); 
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error");
  }
});

/**
 * API 5: Fórmulas y Problemas Resueltos
 */
app.get('/api/formulas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM formulas ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error");
  }
});

app.get('/api/problemas-resueltos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM problemas_resueltos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error");
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`🚀 Servidor ITVE AdaptiMath corriendo`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`📅 Estado: Operativo (CMMI L3 Standards)`);
  console.log(`🔍 Ruta Búsqueda: /api/search?q=... (Activa)`);
  console.log(`📐 Ruta Fórmulas: /api/formulas (Activa)`);
  console.log(`✅ Ruta Resueltos: /api/problemas-resueltos (Activa)`);
  console.log(`==========================================`);
});