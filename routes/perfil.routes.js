const express = require("express");
const router = express.Router();
const perfilController = require("../controllers/perfil.controller");

router.get("/profesor/:id", perfilController.getDatosProfesor);
router.get(
  "/grado/:idGrado/asistencia",
  perfilController.getEstadisticasAsistencia
);
router.get(
  "/grado/:idGrado/uniforme",
  perfilController.getEstadisticasUniforme
);

module.exports = router;
