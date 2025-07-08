const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

// Rutas para autenticación de administradores
router.post("/login", adminController.loginAdmin);

// Recuperación de contraseña
router.post("/recuperar-contrasena", adminController.recuperarContrasena);
router.post("/verificar-codigo", adminController.verificarCodigo);
router.post("/actualizar-contrasena", adminController.actualizarContrasena);

module.exports = router;
