const express = require("express");
const router = express.Router();
const asistenciaController = require("../controllers/asistencia.controller");

// GET /asistencia/grado/:id_grado - Obtener asistencia por grado (ID)
router.get("/grado/:id_grado", asistenciaController.getAsistenciaByGradoId);

// GET /asistencia/grado/:nombre_grado - Obtener asistencia por grado (nombre)
router.get(
  "/grado/:nombre_grado",
  asistenciaController.getAsistenciaByGradoNombre
);

// POST /asistencia/batch - Guardar múltiples registros
router.post("/batch", asistenciaController.saveBatchAsistencia);

// PUT /asistencia/update-multiple - Actualizar múltiples registros
router.put("/update-multiple", asistenciaController.updateMultipleAsistencias);

// GET /asistencia/grado/ - Por nivel
router.get("/grado/", asistenciaController.getAsistenciaByNivel);

// GET /asistencia/buscar - Buscar alumnos
router.get("/buscar", asistenciaController.buscarAlumnosAsistencia);

// Agrega estas nuevas rutas
router.get(
  "/:id_alumno/comentarios",
  asistenciaController.obtenerComentariosAlumno
);

router.get("/:id_alumno/uniforme", asistenciaController.obtenerUniformeAlumno);

router.delete("/:id_alumno", asistenciaController.eliminarAlumno);

module.exports = router;
