const express = require("express");
const router = express.Router();
const uniformeController = require("../controllers/uniforme.controller");

// POST /uniforme - Guardar datos del uniforme
router.post("/", uniformeController.saveUniforme);

// GET /uniforme/:id_asistencia - Obtener datos del uniforme
router.get("/:id_asistencia", uniformeController.getUniforme);

module.exports = router;
