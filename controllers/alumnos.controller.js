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
      const { nombre, apellido, grado, email, contraseña } = req.body;

      // Validar campos requeridos
      if (!nombre || !apellido || !grado || !email || !contraseña) {
        return res.status(400).json({
          error:
            "Todos los campos son requeridos (nombre, apellido, grado, email, contraseña)",
        });
      }

      // Validar formato de email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Formato de email inválido" });
      }

      // Validar si el email ya existe
      const [emailExists] = await pool.query(
        "SELECT id_alumno FROM Alumnos WHERE email = ?",
        [email]
      );

      if (emailExists.length > 0) {
        return res.status(400).json({ error: "El email ya está registrado" });
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

      // Hash de la contraseña (usando bcrypt en producción)
      // const hashedPassword = await bcrypt.hash(contraseña, 10);
      // Por ahora guardamos la contraseña sin hashear (solo para desarrollo)
      const hashedPassword = contraseña;

      // Insertar alumno
      const [result] = await pool.query(
        "INSERT INTO Alumnos (nombre, apellido, id_grado, email, contraseña) VALUES (?, ?, ?, ?, ?)",
        [nombre, apellido, id_grado, email, hashedPassword]
      );

      // Obtener alumno creado
      const [alumnoResults] = await pool.query(
        `
        SELECT a.id_alumno, a.nombre, a.apellido, a.email, g.nombre_grado as grado 
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        WHERE a.id_alumno = ?
        `,
        [result.insertId]
      );

      res.status(201).json(alumnoResults[0]);
    } catch (err) {
      console.error("Error en createAlumno:", err);
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
