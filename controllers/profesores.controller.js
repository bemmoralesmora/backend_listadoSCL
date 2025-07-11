const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const pool = require("../config/database");

// Configuración del transporter para nodemailer (debes configurar esto con tus credenciales SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "parismirnov@gmail.com",
    pass: "vfeffjshcdbrttdo",
  },
});

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

      // Validación de campos requeridos
      if (!email || !contraseña) {
        return res.status(400).json({
          success: false,
          error: "Email y contraseña son requeridos",
          details: {
            email: !email ? "Campo requerido" : undefined,
            contraseña: !contraseña ? "Campo requerido" : undefined,
          },
        });
      }

      const query = `
        SELECT p.*, g.nombre_grado 
        FROM Profesores p
        LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
        WHERE p.email = ?
      `;

      const [results] = await pool.query(query, [email.trim()]);

      if (results.length === 0) {
        return res.status(401).json({
          success: false,
          error: "Credenciales incorrectas",
          details: "Email no registrado",
        });
      }

      const profesor = results[0];
      let contraseñaValida = false;

      // Verificación flexible de contraseña (hasheada o no)
      if (profesor.contraseña.startsWith("$2b$")) {
        // Contraseña hasheada
        contraseñaValida = await bcrypt.compare(
          contraseña,
          profesor.contraseña
        );
      } else {
        // Contraseña no hasheada (comparación directa)
        contraseñaValida = contraseña === profesor.contraseña;

        // Opcional: Hashear la contraseña antigua y actualizarla en la base de datos
        if (contraseñaValida) {
          const hashedPassword = await bcrypt.hash(contraseña, 10);
          await pool.query(
            "UPDATE Profesores SET contraseña = ? WHERE id_profesor = ?",
            [hashedPassword, profesor.id_profesor]
          );
        }
      }

      if (!contraseñaValida) {
        return res.status(401).json({
          success: false,
          error: "Credenciales incorrectas",
          details: "Contraseña inválida",
        });
      }

      // Eliminar información sensible del objeto profesor
      const { contraseña: _, ...profesorSinPassword } = profesor;

      res.json({
        success: true,
        message: "Inicio de sesión exitoso",
        profesor: {
          id: profesorSinPassword.id_profesor,
          nombre: profesorSinPassword.nombre,
          apellido: profesorSinPassword.apellido,
          email: profesorSinPassword.email,
          id_grado_asignado: profesorSinPassword.id_grado_asignado,
          nombre_grado: profesorSinPassword.nombre_grado,
        },
      });
    } catch (err) {
      console.error("Error en login:", err);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  recuperarContraseña: async (req, res) => {
    const { email } = req.body;

    try {
      const [profesor] = await pool.query(
        "SELECT id_profesor FROM Profesores WHERE email = ?",
        [email]
      );

      if (!profesor || profesor.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Correo no registrado" });
      }

      const id_profesor = profesor[0].id_profesor;

      const codigo = Math.floor(1000 + Math.random() * 9000);

      await pool.query(
        "DELETE FROM RecuperacionContraseñas WHERE id_profesor = ?",
        [id_profesor]
      );

      await pool.query(
        "INSERT INTO RecuperacionContraseñas (id_profesor, codigo) VALUES (?, ?)",
        [id_profesor, codigo]
      );

      const mailOptions = {
        from: "tuemail@gmail.com",
        to: email,
        subject: "Código de recuperación de contraseña",
        text: `Tu código de verificación es: ${codigo}`,
      };

      await transporter.sendMail(mailOptions);

      res.json({ success: true, message: "Código enviado al correo" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error en el servidor" });
    }
  },

  verificarCodigo: async (req, res) => {
    const { email, codigo } = req.body;

    try {
      const [profesor] = await pool.query(
        "SELECT id_profesor FROM Profesores WHERE email = ?",
        [email]
      );

      if (!profesor || profesor.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Correo no registrado" });
      }

      const id_profesor = profesor[0].id_profesor;

      const [codigoDB] = await pool.query(
        "SELECT codigo FROM RecuperacionContraseñas WHERE id_profesor = ?",
        [id_profesor]
      );

      if (!codigoDB || codigoDB.length === 0 || codigoDB[0].codigo != codigo) {
        return res
          .status(400)
          .json({ success: false, message: "Código incorrecto" });
      }

      res.json({ success: true, message: "Código verificado" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error en el servidor" });
    }
  },

  actualizarContraseña: async (req, res) => {
    const { email, codigo, nuevaContraseña } = req.body;

    try {
      const [profesor] = await pool.query(
        "SELECT id_profesor FROM Profesores WHERE email = ?",
        [email]
      );

      if (!profesor || profesor.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Correo no registrado" });
      }

      const id_profesor = profesor[0].id_profesor;

      const [codigoDB] = await pool.query(
        "SELECT codigo FROM RecuperacionContraseñas WHERE id_profesor = ?",
        [id_profesor]
      );

      if (!codigoDB || codigoDB.length === 0 || codigoDB[0].codigo != codigo) {
        return res
          .status(400)
          .json({ success: false, message: "Código incorrecto" });
      }

      const salt = await bcrypt.genSalt(10);
      const contraseñaHash = await bcrypt.hash(nuevaContraseña, salt);

      await pool.query(
        "UPDATE Profesores SET contraseña = ? WHERE id_profesor = ?",
        [contraseñaHash, id_profesor]
      );

      await pool.query(
        "DELETE FROM RecuperacionContraseñas WHERE id_profesor = ?",
        [id_profesor]
      );

      res.json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error en el servidor" });
    }
  },
};

module.exports = profesoresController;
