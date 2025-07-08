const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

router.post("/login-admin", adminController.loginAdmin);
router.post("/recuperarPass", adminController.recuperarContraseña);
router.post("/verificarCodigo", adminController.verificarCodigo);
router.post("/actualizarPass", adminController.actualizarContraseña);

module.exports = router;
