const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const authMiddleware = {
  authenticate: async (req, res, next) => {
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Acceso no autorizado. Token requerido.",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verificar si el usuario (admin o profesor) existe
      let user;
      if (decoded.role === "admin") {
        const [admins] = await pool.query(
          "SELECT id_admin as id, nombre, apellido, email FROM Administradores WHERE id_admin = ?",
          [decoded.id]
        );
        user = admins[0];
      } else if (decoded.role === "profesor") {
        const [profesores] = await pool.query(
          "SELECT id_profesor as id, nombre, apellido, email FROM Profesores WHERE id_profesor = ?",
          [decoded.id]
        );
        user = profesores[0];
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      req.user = user;
      req.role = decoded.role;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      });
    }
  },

  isAdmin: (req, res, next) => {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. Se requieren privilegios de administrador.",
      });
    }
    next();
  },
};

module.exports = authMiddleware;
