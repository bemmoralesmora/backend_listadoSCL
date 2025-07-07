const express = require("express");
const router = express.Router();
const profesoresController = require("../controllers/profesores.controller");

// GET /profesores - Obtiene todos los profesores
router.get("/", profesoresController.getAllProfesores);

// POST /profesores - Crea un nuevo profesor
router.post("/", profesoresController.createProfesor);

// GET /profesores/:id - Obtiene un profesor específico
router.get("/:id", profesoresController.getProfesorById);

// GET /profesores/:id/alumnos - Obtiene alumnos del grado asignado
router.get("/:id/alumnos", profesoresController.getAlumnosByProfesor);

// PUT /profesores/:id/grado - Actualiza el grado asignado
router.put("/:id/grado", profesoresController.updateGradoAsignado);

// POST /login-profesor - Autenticación
router.post("/login-profesor", profesoresController.loginProfesor);

router.post("/recuperarPass", profesoresController.recuperarContraseña);

router.post("/verificarCodigo", profesoresController.verificarCodigo);

router.post("/actualizarContraseña", profesoresController.actualizarContraseña);

module.exports = router;
