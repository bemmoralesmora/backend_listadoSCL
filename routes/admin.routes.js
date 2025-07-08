const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

// Rutas de autenticación
router.post("/login", adminController.loginAdmin);
router.post("/recuperar-contrasena", adminController.recuperarContraseña);
router.post("/verificar-codigo", adminController.verificarCodigo);
router.post("/actualizar-contrasena", adminController.actualizarContraseña);

module.exports = router;
