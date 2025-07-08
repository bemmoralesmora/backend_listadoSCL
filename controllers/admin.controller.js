const pool = require("../config/database");
const bcrypt = require("bcrypt");

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

      // Añadir logs para depuración
      console.log(`Intentando login para admin con email: ${email}`);

      const query = "SELECT * FROM Administradores WHERE email = ?";
      const [results] = await pool.query(query, [email]);

      if (results.length === 0) {
        console.log(`No se encontró admin con email: ${email}`);
        return res.status(401).json({
          error: "Credenciales incorrectas",
        });
      }

      const admin = results[0];
      console.log(`Admin encontrado: ${admin.nombre} ${admin.apellido}`);

      // Verificar contraseña
      const contraseñaValida = await bcrypt.compare(
        contraseña,
        admin.contraseña
      );

      if (!contraseñaValida) {
        console.log(`Contraseña incorrecta para admin: ${email}`);
        return res.status(401).json({
          error: "Credenciales incorrectas",
        });
      }

      res.json({
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
      res.status(500).json({
        error: "Error interno del servidor",
        details: err.message,
      });
    }
  },

  // Funciones para recuperación de contraseña (similar a profesores)
  recuperarContraseña: async (req, res) => {
    const { email } = req.body;

    try {
      const [admin] = await pool.query(
        "SELECT id_admin FROM Administradores WHERE email = ?",
        [email]
      );

      if (!admin || admin.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Correo no registrado" });
      }

      const id_admin = admin[0].id_admin;
      const codigo = Math.floor(1000 + Math.random() * 9000);

      await pool.query(
        "DELETE FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
      );

      await pool.query(
        "INSERT INTO RecuperacionContraseñas (id_admin, codigo) VALUES (?, ?)",
        [id_admin, codigo]
      );

      // Enviar correo (usar el mismo transporter que en profesores)
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
      const [admin] = await pool.query(
        "SELECT id_admin FROM Administradores WHERE email = ?",
        [email]
      );

      if (!admin || admin.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Correo no registrado" });
      }

      const id_admin = admin[0].id_admin;

      const [codigoDB] = await pool.query(
        "SELECT codigo FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
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
      const [admin] = await pool.query(
        "SELECT id_admin FROM Administradores WHERE email = ?",
        [email]
      );

      if (!admin || admin.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Correo no registrado" });
      }

      const id_admin = admin[0].id_admin;

      const [codigoDB] = await pool.query(
        "SELECT codigo FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
      );

      if (!codigoDB || codigoDB.length === 0 || codigoDB[0].codigo != codigo) {
        return res
          .status(400)
          .json({ success: false, message: "Código incorrecto" });
      }

      const salt = await bcrypt.genSalt(10);
      const contraseñaHash = await bcrypt.hash(nuevaContraseña, salt);

      await pool.query(
        "UPDATE Administradores SET contraseña = ? WHERE id_admin = ?",
        [contraseñaHash, id_admin]
      );

      await pool.query(
        "DELETE FROM RecuperacionContraseñas WHERE id_admin = ?",
        [id_admin]
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

module.exports = adminController;
