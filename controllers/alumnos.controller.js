const pool = require("../config/database");

const alumnosController = {
  getAllAlumnos: async (req, res) => {
    try {
      const [results] = await pool.query(`
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        LEFT JOIN Grados g ON a.id_grado = g.id_grado
      `);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createAlumno: async (req, res) => {
    try {
      const { nombre, apellido, grado } = req.body;

      if (!nombre || !apellido || !grado) {
        return res.status(400).json({
          error: "Nombre, apellido y grado son requeridos",
        });
      }

      // Buscar el grado
      const [gradoResults] = await pool.query(
        "SELECT id_grado FROM Grados WHERE nombre_grado = ?",
        [grado]
      );

      if (gradoResults.length === 0) {
        return res.status(404).json({ error: "Grado no encontrado" });
      }

      const id_grado = gradoResults[0].id_grado;

      // Insertar alumno
      const [result] = await pool.query(
        "INSERT INTO Alumnos (nombre, apellido, id_grado) VALUES (?, ?, ?)",
        [nombre, apellido, id_grado]
      );

      // Obtener alumno creado
      const [alumnoResults] = await pool.query(
        `
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        WHERE a.id_alumno = ?
      `,
        [result.insertId]
      );

      res.status(201).json(alumnoResults[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getAlumnoById: async (req, res) => {
    try {
      const { id } = req.params;
      const [results] = await pool.query(
        `
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        LEFT JOIN Grados g ON a.id_grado = g.id_grado
        WHERE a.id_alumno = ?
      `,
        [id]
      );

      if (results.length === 0) {
        return res.status(404).json({ error: "Alumno no encontrado" });
      }
      res.json(results[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getAsistenciaByAlumno: async (req, res) => {
    try {
      const { id } = req.params;
      const [results] = await pool.query(
        "SELECT * FROM Asistencia WHERE id_alumno = ? ORDER BY fecha DESC",
        [id]
      );
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = alumnosController;
