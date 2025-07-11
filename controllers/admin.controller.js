require("dotenv").config();
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const adminController = {
  loginAdmin: async (req, res) => {
    try {
      const { email, contraseña } = req.body;

      if (typeof email !== "string" || typeof contraseña !== "string") {
        return res.status(400).json({ error: "Datos inválidos" });
      }

      console.log(`Intentando login para admin con email: ${email}`);

      const [rows] = await pool.query(
        "SELECT * FROM Administradores WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        console.log(`No se encontró admin con email: ${email}`);
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      const admin = rows[0];
      console.log(`Admin encontrado: ${admin.nombre} ${admin.apellido}`);

      const contraseñaValida = await bcrypt.compare(
        contraseña,
        admin.contraseña
      );

      if (!contraseñaValida) {
        console.log(`Contraseña incorrecta para admin: ${email}`);
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      return res.json({
        success: true,
        admin: {
          id: admin.id_admin,
          nombre: admin.nombre,
          apellido: admin.apellido,
          email: admin.email,
        },
      });
    } catch (err) {
      console.error("Error en login admin:", err);
      return res.status(500).json({
        error: "Error interno del servidor",
        details: err.message,
      });
    }
  },

  recuperarContrasena: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "El email es requerido",
      });
    }

    try {
      // Buscar admin por email
      const [admins] = await pool.query(
        "SELECT id_admin FROM Administradores WHERE email = ?",
        [email]
      );

      if (admins.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Correo no registrado",
        });
      }

      const id_admin = admins[0].id_admin;
      const codigo = Math.floor(1000 + Math.random() * 9000);

      // Eliminar códigos previos
      await pool.query(
        "DELETE FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
      );

      // Insertar nuevo código
      await pool.query(
        "INSERT INTO RecuperacionContraseñas (id_admin, codigo) VALUES (?, ?)",
        [id_admin, codigo]
      );

      // Enviar correo
      const mailOptions = {
        from: "tuemail@gmail.com", // Cambia por tu email real o usa variable de entorno
        to: email,
        subject: "Código de recuperación de contraseña",
        text: `Tu código de verificación es: ${codigo}`,
      };

      await transporter.sendMail(mailOptions);

      return res.json({
        success: true,
        message: "Código enviado al correo",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Error en el servidor",
      });
    }
  },

  verificarCodigo: async (req, res) => {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({
        success: false,
        message: "Email y código son requeridos",
      });
    }

    try {
      // Buscar admin
      const [admins] = await pool.query(
        "SELECT id_admin FROM Administradores WHERE email = ?",
        [email]
      );

      if (admins.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Correo no registrado",
        });
      }

      const id_admin = admins[0].id_admin;

      // Verificar código
      const [codigos] = await pool.query(
        "SELECT codigo FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
      );

      if (codigos.length === 0 || codigos[0].codigo != codigo) {
        return res.status(400).json({
          success: false,
          message: "Código incorrecto",
        });
      }

      return res.json({
        success: true,
        message: "Código verificado",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Error en el servidor",
      });
    }
  },

  actualizarContrasena: async (req, res) => {
    const { email, codigo, nuevaContraseña } = req.body;

    if (!email || !codigo || !nuevaContraseña) {
      return res.status(400).json({
        success: false,
        message: "Email, código y nueva contraseña son requeridos",
      });
    }

    try {
      // Buscar admin
      const [admins] = await pool.query(
        "SELECT id_admin FROM Administradores WHERE email = ?",
        [email]
      );

      if (admins.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Correo no registrado",
        });
      }

      const id_admin = admins[0].id_admin;

      // Verificar código
      const [codigos] = await pool.query(
        "SELECT codigo FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
      );

      if (codigos.length === 0 || codigos[0].codigo != codigo) {
        return res.status(400).json({
          success: false,
          message: "Código incorrecto",
        });
      }

      // Hashear nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(nuevaContraseña, salt);

      // Actualizar contraseña
      await pool.query(
        "UPDATE Administradores SET contraseña = ? WHERE id_admin = ?",
        [hash, id_admin]
      );

      // Borrar código de recuperación usado
      await pool.query(
        "DELETE FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
      );

      return res.json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Error en el servidor",
      });
    }
  },

  getAdminInfo: async (req, res) => {
    try {
      // 1. Verificar que el usuario está autenticado y tiene ID
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "No se proporcionó información de autenticación válida",
        });
      }

      // 2. Consulta más específica con campos explícitos
      const [adminData] = await pool.query(
        `SELECT 
        nombre, 
        apellido, 
        email 
       FROM Administradores 
       WHERE id_admin = ? 
       LIMIT 1`,
        [req.user.id]
      );

      // 3. Manejo de caso no encontrado
      if (!adminData || adminData.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No se encontró administrador con ID ${req.user.id}`,
          adminId: req.user.id, // Para debugging
        });
      }

      // 4. Respuesta exitosa
      res.json({
        success: true,
        data: adminData[0],
      });
    } catch (error) {
      console.error("Error en getAdminInfo:", {
        error: error.message,
        adminId: req.user?.id,
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        success: false,
        message: "Error interno al obtener información del administrador",
        systemMessage: error.message, // Solo para desarrollo, quitar en producción
        code: "ADMIN_INFO_FETCH_ERROR",
      });
    }
  },

  verifyPassword: async (req, res) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: "La contraseña es requerida",
        });
      }

      const [admins] = await pool.query(
        "SELECT contraseña FROM Administradores WHERE id_admin = ?",
        [req.user.id]
      );

      if (admins.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Administrador no encontrado",
        });
      }

      const contraseñaValida = await bcrypt.compare(
        password,
        admins[0].contraseña
      );

      if (!contraseñaValida) {
        return res.status(401).json({
          success: false,
          message: "Contraseña incorrecta",
        });
      }

      res.json({
        success: true,
        message: "Contraseña verificada",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Error al verificar la contraseña",
      });
    }
  },
  getProfesores: async (req, res) => {
    try {
      const [profesores] = await pool.query(`
        SELECT p.id_profesor, p.nombre, p.apellido, p.email, p.id_grado_asignado
        FROM Profesores p
        ORDER BY p.apellido, p.nombre
      `);

      res.json(profesores);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Error al obtener la lista de profesores",
      });
    }
  },

  createProfesor: async (req, res) => {
    try {
      const { nombre, apellido, email, id_grado_asignado, contraseña } =
        req.body;

      // Validar campos requeridos
      if (!nombre || !apellido || !email || !contraseña) {
        return res.status(400).json({
          success: false,
          message: "Nombre, apellido, email y contraseña son requeridos",
        });
      }

      // Verificar si el email ya existe
      const [existing] = await pool.query(
        "SELECT id_profesor FROM Profesores WHERE email = ?",
        [email]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: "El email ya está registrado",
        });
      }

      // Hashear la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(contraseña, salt);

      // Insertar nuevo profesor
      const [result] = await pool.query(
        "INSERT INTO Profesores (nombre, apellido, email, contraseña, id_grado_asignado) VALUES (?, ?, ?, ?, ?)",
        [nombre, apellido, email, hashedPassword, id_grado_asignado || null]
      );

      res.json({
        success: true,
        message: "Profesor creado exitosamente",
        id: result.insertId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Error al crear el profesor",
      });
    }
  },

  updateProfesor: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, apellido, email, id_grado_asignado } = req.body;

      // Validar campos requeridos
      if (!nombre || !apellido || !email) {
        return res.status(400).json({
          success: false,
          message: "Nombre, apellido y email son requeridos",
        });
      }

      // Verificar si el profesor existe
      const [existing] = await pool.query(
        "SELECT id_profesor FROM Profesores WHERE id_profesor = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Profesor no encontrado",
        });
      }

      // Verificar si el nuevo email ya existe (en otro profesor)
      const [emailCheck] = await pool.query(
        "SELECT id_profesor FROM Profesores WHERE email = ? AND id_profesor != ?",
        [email, id]
      );

      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: "El email ya está registrado por otro profesor",
        });
      }

      // Actualizar profesor
      await pool.query(
        "UPDATE Profesores SET nombre = ?, apellido = ?, email = ?, id_grado_asignado = ? WHERE id_profesor = ?",
        [nombre, apellido, email, id_grado_asignado || null, id]
      );

      res.json({
        success: true,
        message: "Profesor actualizado exitosamente",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Error al actualizar el profesor",
      });
    }
  },

  deleteProfesor: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar si el profesor existe
      const [existing] = await pool.query(
        "SELECT id_profesor FROM Profesores WHERE id_profesor = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Profesor no encontrado",
        });
      }

      // Eliminar profesor
      await pool.query("DELETE FROM Profesores WHERE id_profesor = ?", [id]);

      res.json({
        success: true,
        message: "Profesor eliminado exitosamente",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Error al eliminar el profesor",
      });
    }
  },
  getEstadisticasGrados: async (req, res) => {
    try {
      // Obtener todos los grados con información básica
      const [grados] = await pool.query(`
        SELECT g.id_grado, g.nombre_grado, g.nivel, 
               COUNT(p.id_profesor) as profesores_asignados,
               COUNT(a.id_alumno) as total_alumnos
        FROM Grados g
        LEFT JOIN Profesores p ON g.id_grado = p.id_grado_asignado
        LEFT JOIN Alumnos a ON g.id_grado = a.id_grado
        GROUP BY g.id_grado
        ORDER BY g.nivel, g.nombre_grado
      `);

      res.json(grados);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Error al obtener estadísticas de grados" });
    }
  },

  getEstadisticasAsistencia: async (req, res) => {
    try {
      const { idGrado } = req.params;
      const today = new Date().toISOString().split("T")[0];

      // Obtener estadísticas de asistencia para el grado
      const [asistencia] = await pool.query(
        `
        SELECT 
          COUNT(*) as total_alumnos,
          SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as ausentes
        FROM Asistencia a
        JOIN Alumnos al ON a.id_alumno = al.id_alumno
        WHERE al.id_grado = ? AND a.fecha = ?
      `,
        [idGrado, today]
      );

      res.json(
        asistencia[0] || { total_alumnos: 0, presentes: 0, ausentes: 0 }
      );
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Error al obtener estadísticas de asistencia" });
    }
  },

  getEstadisticasUniforme: async (req, res) => {
    try {
      const { idGrado } = req.params;
      const today = new Date().toISOString().split("T")[0];

      // Obtener estadísticas de uniforme (ajusta según tu esquema de DB)
      const [uniforme] = await pool.query(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN u.completo = 1 THEN 1 ELSE 0 END) as completos,
          SUM(CASE WHEN u.completo = 0 THEN 1 ELSE 0 END) as incompletos
        FROM UniformeRegistros u
        JOIN Alumnos a ON u.id_alumno = a.id_alumno
        WHERE a.id_grado = ? AND u.fecha = ?
      `,
        [idGrado, today]
      );

      const porcentaje =
        uniforme[0].total > 0
          ? Math.round((uniforme[0].completos / uniforme[0].total) * 100)
          : 0;

      res.json({
        ...uniforme[0],
        porcentaje_completo: porcentaje,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Error al obtener estadísticas de uniforme" });
    }
  },
};

module.exports = adminController;
