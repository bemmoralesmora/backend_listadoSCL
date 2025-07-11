const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const authMiddleware = {
  authenticate: async (req, res, next) => {
    try {
      // 1. Obtener y validar el token
      const authHeader = req.header("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Formato de autorización inválido. Use 'Bearer [token]'",
        });
      }

      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token no proporcionado",
        });
      }

      // 2. Verificar y decodificar el token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      );

      // 3. Validar estructura básica del token decodificado
      if (!decoded.id || !decoded.role) {
        return res.status(401).json({
          success: false,
          message: "Token malformado",
        });
      }

      // 4. Buscar usuario en la base de datos según su rol
      let user;
      try {
        if (decoded.role === "admin") {
          const [admins] = await pool.query(
            "SELECT id_admin as id, nombre, apellido, email, activo FROM Administradores WHERE id_admin = ?",
            [decoded.id]
          );
          user = admins[0];
        } else if (decoded.role === "profesor") {
          const [profesores] = await pool.query(
            "SELECT id_profesor as id, nombre, apellido, email, activo FROM Profesores WHERE id_profesor = ?",
            [decoded.id]
          );
          user = profesores[0];
        } else {
          return res.status(401).json({
            success: false,
            message: "Rol no reconocido",
          });
        }
      } catch (dbError) {
        console.error("Error en consulta a DB:", dbError);
        return res.status(500).json({
          success: false,
          message: "Error al verificar usuario",
        });
      }

      // 5. Verificar si el usuario existe y está activo
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      if (user.activo !== 1) {
        return res.status(403).json({
          success: false,
          message: "Cuenta desactivada",
        });
      }

      // 6. Adjuntar información al request
      req.user = {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      console.error("Error en autenticación:", error);

      let message = "Error de autenticación";
      if (error.name === "TokenExpiredError") {
        message = "Token expirado";
      } else if (error.name === "JsonWebTokenError") {
        message = "Token inválido";
      }

      res.status(401).json({
        success: false,
        message,
      });
    }
  },

  isAdmin: (req, res, next) => {
    // Verificar primero el objeto user
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Usuario no autenticado",
      });
    }

    // Verificar el rol
    if (req.user.role !== "admin") {
      console.error(
        `Intento de acceso no autorizado. User ID: ${req.user.id}, Rol: ${req.user.role}`
      );
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. Se requieren privilegios de administrador.",
        userRole: req.user.role, // Para debugging
      });
    }
    next();
  },
};

module.exports = authMiddleware;
