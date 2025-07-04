const express = require("express");
const router = express.Router();
const alumnosController = require("../controllers/alumnos.controller");

// GET /alumnos - Todos los alumnos
router.get("/", alumnosController.getAllAlumnos);

// POST /alumnos - Crear nuevo alumno
router.post("/", alumnosController.createAlumno);

// GET /alumnos/:id - Obtener alumno por ID
router.get("/:id", alumnosController.getAlumnoById);

// GET /alumnos/:id/asistencia - Historial de asistencia
router.get("/:id/asistencia", alumnosController.getAsistenciaByAlumno);

module.exports = router;
