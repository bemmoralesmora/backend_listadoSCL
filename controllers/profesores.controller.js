const pool = require("../config/database");

const profesoresController = {
  getAllProfesores: async (req, res) => {
    try {
      const query = `
        SELECT p.*, g.nombre_grado 
        FROM Profesores p
        LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
      `;
      const [results] = await pool.query(query);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createProfesor: async (req, res) => {
    try {
      const { nombre, apellido, email, contraseña, id_grado_asignado } =
        req.body;

      if (id_grado_asignado) {
        const [gradoResults] = await pool.query(
          "SELECT id_grado FROM Grados WHERE id_grado = ?",
          [id_grado_asignado]
        );

        if (gradoResults.length === 0) {
          return res.status(400).json({ error: "El grado asignado no existe" });
        }
      }

      const [result] = await pool.query("INSERT INTO Profesores SET ?", {
        nombre,
        apellido,
        email,
        contraseña,
        id_grado_asignado,
      });

      res.status(201).json({ id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getProfesorById: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
        SELECT p.*, g.nombre_grado 
        FROM Profesores p
        LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
        WHERE p.id_profesor = ?
      `;
      const [results] = await pool.query(query, [id]);

      if (results.length === 0) {
        return res.status(404).json({ error: "Profesor no encontrado" });
      }
      res.json(results[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getAlumnosByProfesor: async (req, res) => {
    try {
      const { id } = req.params;
      const [profesorResults] = await pool.query(
        "SELECT id_grado_asignado FROM Profesores WHERE id_profesor = ?",
        [id]
      );

      if (profesorResults.length === 0) {
        return res.status(404).json({ error: "Profesor no encontrado" });
      }

      const id_grado = profesorResults[0].id_grado_asignado;

      if (!id_grado) {
        return res.status(400).json({
          error: "Este profesor no tiene un grado asignado",
        });
      }

      const [alumnosResults] = await pool.query(
        `
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        WHERE a.id_grado = ?
      `,
        [id_grado]
      );

      res.json(alumnosResults);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  updateGradoAsignado: async (req, res) => {
    try {
      const { id } = req.params;
      const { id_grado_asignado } = req.body;

      if (id_grado_asignado === undefined) {
        return res
          .status(400)
          .json({ error: "id_grado_asignado es requerido" });
      }

      if (id_grado_asignado !== null) {
        const [gradoResults] = await pool.query(
          "SELECT id_grado FROM Grados WHERE id_grado = ?",
          [id_grado_asignado]
        );

        if (gradoResults.length === 0) {
          return res.status(400).json({ error: "El grado asignado no existe" });
        }
      }

      const [result] = await pool.query(
        "UPDATE Profesores SET id_grado_asignado = ? WHERE id_profesor = ?",
        [id_grado_asignado, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Profesor no encontrado" });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  loginProfesor: async (req, res) => {
    try {
      const { email, contraseña } = req.body;

      if (!email || !contraseña) {
        return res.status(400).json({
          error: "Email y contraseña son requeridos",
          details: {
            email: !email ? "Campo requerido" : undefined,
            contraseña: !contraseña ? "Campo requerido" : undefined,
          },
        });
      }

      const [results] = await pool.query(
        `
        SELECT p.*, g.nombre_grado 
        FROM Profesores p
        LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
        WHERE p.email = ?
      `,
        [email]
      );

      if (results.length === 0) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      const profesor = results[0];

      if (profesor.contraseña !== contraseña) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      res.json({
        success: true,
        profesor: {
          id: profesor.id_profesor,
          nombre: profesor.nombre,
          apellido: profesor.apellido,
          email: profesor.email,
          id_grado_asignado: profesor.id_grado_asignado,
          nombre_grado: profesor.nombre_grado,
        },
      });
    } catch (err) {
      console.error("Error en login:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
};

module.exports = profesoresController;
