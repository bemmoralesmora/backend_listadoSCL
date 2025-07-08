const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const profesoresController = require("../controllers/profesores.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Rutas para autenticación de administradores
router.post("/login", adminController.loginAdmin);
router.get("/info", authMiddleware.isAdmin, adminController.getAdminInfo);
router.post(
  "/verify-password",
  authMiddleware.isAdmin,
  adminController.verifyPassword
);

// Recuperación de contraseña
router.post("/recuperar-contrasena", adminController.recuperarContrasena);
router.post("/verificar-codigo", adminController.verificarCodigo);
router.post("/actualizar-contrasena", adminController.actualizarContrasena);

// Rutas para gestión de profesores (protegidas por authMiddleware)
router.get(
  "/profesores",
  authMiddleware.isAdmin,
  profesoresController.getProfesores
);
router.post(
  "/profesores",
  authMiddleware.isAdmin,
  profesoresController.createProfesor
);
router.put(
  "/profesores/:id",
  authMiddleware.isAdmin,
  profesoresController.updateProfesor
);
router.delete(
  "/profesores/:id",
  authMiddleware.isAdmin,
  profesoresController.deleteProfesor
);

module.exports = router;
