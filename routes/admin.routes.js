const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
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
  adminController.getProfesores
);
router.post(
  "/profesores",
  authMiddleware.isAdmin,
  adminController.createProfesor
);
router.put(
  "/profesores/:id",
  authMiddleware.isAdmin,
  adminController.updateProfesor
);
router.delete(
  "/profesores/:id",
  authMiddleware.isAdmin,
  adminController.deleteProfesor
);

router.get(
  "/estadisticas/grados",
  authMiddleware.isAdmin,
  adminController.getEstadisticasGrados
);
router.get(
  "/estadisticas/asistencia/:idGrado",
  authMiddleware.isAdmin,
  adminController.getEstadisticasAsistencia
);
router.get(
  "/estadisticas/uniformes/:idGrado",
  authMiddleware.isAdmin,
  adminController.getEstadisticasUniforme
);

module.exports = router;
