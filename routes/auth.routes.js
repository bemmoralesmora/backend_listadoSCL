const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// Autenticación
router.post("/login", authController.login);
router.post("/recuperar-pass", authController.recuperarPassword);
router.post("/verificar-codigo", authController.verificarCodigo);
router.post("/actualizar-pass", authController.actualizarPassword);

module.exports = router;
