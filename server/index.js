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
 * Llena la cuadrícula principal de la aplicación.
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
 * Filtra por ID del tema padre y Dificultad.
 */
app.get('/api/ejercicios-detallados/:ejercicioId/:dificultad', async (req, res) => {
  try {
    const { ejercicioId, dificultad } = req.params;
    
    console.log(`Petición de Reto -> ID Tema: ${ejercicioId}, Nivel: ${dificultad}`);

    const query = `
      SELECT id, enunciado, formula_latex, respuesta_correcta 
      FROM ejercicios_detallados 
      WHERE ejercicio_id = $1 AND dificultad = $2 
      ORDER BY id ASC 
      LIMIT 5
    `;
    
    const result = await pool.query(query, [ejercicioId, dificultad]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "No se encontraron ejercicios para esta combinación." 
      });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error en la consulta detallada:", err.message);
    res.status(500).send("Error interno del servidor");
  }
});

/**
 * API 3: Obtener catálogo de Libros (NUEVA TABLA)
 * Llena la sección de Biblioteca Digital.
 */
app.get('/api/libros', async (req, res) => {
  try {
    const query = 'SELECT * FROM libros ORDER BY id ASC';
    const result = await pool.query(query);
    
    console.log(`Petición de Biblioteca -> ${result.rows.length} libros enviados`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/libros:", err.message);
    res.status(500).send("Error al obtener la biblioteca de libros");
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`🚀 Servidor ITVE AdaptiMath corriendo`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`📅 Estado: Operativo (CMMI L3 Standards)`);
  console.log(`📚 Nueva Ruta: /api/libros (Activa)`);
  console.log(`==========================================`);
});