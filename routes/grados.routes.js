const express = require("express");
const router = express.Router();
const gradosController = require("../controllers/grados.controller");

// GET /grados - Todos los grados con conteos
router.get("/", gradosController.getAllGrados);

// GET /grados/exacto/:nombre - Buscar por nombre exacto
router.get("/exacto/:nombre", gradosController.getGradoByExactName);

// POST /grados - Crear nuevo grado
router.post("/", gradosController.createGrado);

// GET /grados/:id/alumnos - Alumnos de un grado
router.get("/:id/alumnos", gradosController.getAlumnosByGrado);

// GET /grados/:id/profesores - Profesores de un grado
router.get("/:id/profesores", gradosController.getProfesoresByGrado);

module.exports = router;
