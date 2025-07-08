const profesoresController = require("./profesores.controller");
const adminController = require("./admin.controller");
const alumnosController = require("./alumnos.controller");

const authController = {
  login: async (req, res) => {
    const { email, password, role } = req.body;

    try {
      let result;
      switch (role) {
        case "profesor":
          result = await profesoresController.loginProfesor(req, res, true);
          break;
        case "admin":
          result = await adminController.loginAdmin(req, res, true);
          break;
        case "alumno":
          result = await alumnosController.loginAlumno(req, res, true);
          break;
        default:
          return res.status(400).json({ error: "Rol no válido" });
      }
      return result;
    } catch (error) {
      console.error("Error en auth controller:", error);
      return res.status(500).json({ error: "Error en el servidor" });
    }
  },

  recuperarPassword: async (req, res) => {
    const { email, role } = req.body;

    try {
      let result;
      switch (role) {
        case "profesor":
          result = await profesoresController.recuperarContraseña(
            req,
            res,
            true
          );
          break;
        case "admin":
          result = await adminController.recuperarContraseña(req, res, true);
          break;
        case "alumno":
          result = await alumnosController.recuperarContraseña(req, res, true);
          break;
        default:
          return res.status(400).json({ error: "Rol no válido" });
      }
      return result;
    } catch (error) {
      console.error("Error al recuperar contraseña:", error);
      return res.status(500).json({ error: "Error en el servidor" });
    }
  },

  verificarCodigo: async (req, res) => {
    const { email, codigo, role } = req.body;

    try {
      let result;
      switch (role) {
        case "profesor":
          result = await profesoresController.verificarCodigo(req, res, true);
          break;
        case "admin":
          result = await adminController.verificarCodigo(req, res, true);
          break;
        case "alumno":
          result = await alumnosController.verificarCodigo(req, res, true);
          break;
        default:
          return res.status(400).json({ error: "Rol no válido" });
      }
      return result;
    } catch (error) {
      console.error("Error al verificar código:", error);
      return res.status(500).json({ error: "Error en el servidor" });
    }
  },

  actualizarPassword: async (req, res) => {
    const { email, codigo, nuevaContraseña, role } = req.body;

    try {
      let result;
      switch (role) {
        case "profesor":
          result = await profesoresController.actualizarContraseña(
            req,
            res,
            true
          );
          break;
        case "admin":
          result = await adminController.actualizarContraseña(req, res, true);
          break;
        case "alumno":
          result = await alumnosController.actualizarContraseña(req, res, true);
          break;
        default:
          return res.status(400).json({ error: "Rol no válido" });
      }
      return result;
    } catch (error) {
      console.error("Error al actualizar contraseña:", error);
      return res.status(500).json({ error: "Error en el servidor" });
    }
  },
};

module.exports = authController;
