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

      if (!email || !contraseña) {
        return res.status(400).json({
          error: "Email y contraseña son requeridos",
          details: {
            email: !email ? "Campo requerido" : undefined,
            contraseña: !contraseña ? "Campo requerido" : undefined,
          },
        });
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
};

module.exports = adminController;
