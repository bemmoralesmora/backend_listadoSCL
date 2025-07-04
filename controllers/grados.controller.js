const pool = require("../config/database");

const gradosController = {
  getAllGrados: async (req, res) => {
    try {
      const query = `
        SELECT g.id_grado, g.nombre_grado, g.nivel, 
               COUNT(DISTINCT a.id_alumno) as cantidad_alumnos,
               COUNT(DISTINCT p.id_profesor) as cantidad_profesores
        FROM Grados g
        LEFT JOIN Alumnos a ON g.id_grado = a.id_grado
        LEFT JOIN Profesores p ON g.id_grado = p.id_grado_asignado
        GROUP BY g.id_grado, g.nombre_grado, g.nivel
        ORDER BY 
          CASE g.nivel
            WHEN 'Primaria' THEN 1
            WHEN 'Básico' THEN 2
            WHEN 'Diversificado' THEN 3
            ELSE 4
          END,
          g.nombre_grado
      `;
      const [results] = await pool.query(query);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getGradoByExactName: async (req, res) => {
    try {
      const { nombre } = req.params;
      const [results] = await pool.query(
        "SELECT * FROM Grados WHERE nombre_grado = ? LIMIT 1",
        [nombre]
      );

      if (results.length === 0) {
        return res.status(404).json({ error: "Grado no encontrado" });
      }
      res.json(results[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createGrado: async (req, res) => {
    try {
      const { nombre_grado, nivel } = req.body;

      if (!nombre_grado || !nivel) {
        return res.status(400).json({
          error: "Nombre y nivel del grado son requeridos",
        });
      }

      const [result] = await pool.query("INSERT IGNORE INTO Grados SET ?", {
        nombre_grado,
        nivel,
      });

      if (result.affectedRows === 0) {
        return res.status(409).json({ error: "Este grado ya existe" });
      }

      res.status(201).json({
        id: result.insertId,
        nombre_grado,
        nivel,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getAlumnosByGrado: async (req, res) => {
    try {
      const { id } = req.params;
      const [results] = await pool.query(
        `
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        WHERE a.id_grado = ?
      `,
        [id]
      );

      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getProfesoresByGrado: async (req, res) => {
    try {
      const { id } = req.params;
      const [results] = await pool.query(
        "SELECT * FROM Profesores WHERE id_grado_asignado = ?",
        [id]
      );
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = gradosController;
