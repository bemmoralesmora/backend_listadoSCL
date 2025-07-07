const pool = require("../config/database");

const perfilController = {
  getDatosProfesor: async (req, res) => {
    try {
      const { id } = req.params;

      // Obtener datos básicos del profesor
      const [profesor] = await pool.query(
        `SELECT p.*, g.nombre_grado 
         FROM Profesores p
         LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
         WHERE p.id_profesor = ?`,
        [id]
      );

      if (!profesor.length) {
        return res.status(404).json({ message: "Profesor no encontrado" });
      }

      res.json(profesor[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al obtener datos del profesor" });
    }
  },

  getEstadisticasAsistencia: async (req, res) => {
    try {
      const { idGrado } = req.params;

      // Obtener conteo de alumnos en el grado
      const [alumnos] = await pool.query(
        `SELECT COUNT(*) as total FROM Alumnos WHERE id_grado = ?`,
        [idGrado]
      );

      // Obtener estadísticas de asistencia
      const [asistencias] = await pool.query(
        `SELECT 
          COUNT(CASE WHEN a.estado = 'presente' THEN 1 END) as presentes,
          COUNT(CASE WHEN a.estado = 'ausente' THEN 1 END) as ausentes,
          COUNT(*) as total_registros
         FROM Asistencia a
         JOIN Alumnos al ON a.id_alumno = al.id_alumno
         WHERE al.id_grado = ?`,
        [idGrado]
      );

      const estadisticas = {
        totalAlumnos: alumnos[0].total,
        presentes: asistencias[0].presentes,
        ausentes: asistencias[0].ausentes,
        porcentajePresentes: (
          (asistencias[0].presentes / asistencias[0].total_registros) *
          100
        ).toFixed(2),
        porcentajeAusentes: (
          (asistencias[0].ausentes / asistencias[0].total_registros) *
          100
        ).toFixed(2),
      };

      res.json(estadisticas);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Error al obtener estadísticas de asistencia" });
    }
  },

  getEstadisticasUniforme: async (req, res) => {
    try {
      const { idGrado } = req.params;

      // Obtener estadísticas de uniforme
      const [uniformes] = await pool.query(
        `SELECT 
          COUNT(CASE WHEN u.zapatos = 1 THEN 1 END) as zapatos_correctos,
          COUNT(CASE WHEN u.playera = 1 THEN 1 END) as playeras_correctas,
          COUNT(CASE WHEN u.pantalon = 1 THEN 1 END) as pantalones_correctos,
          COUNT(CASE WHEN u.sueter = 1 THEN 1 END) as sueteres_correctos,
          COUNT(CASE WHEN u.corte_pelo = 1 THEN 1 END) as cortes_correctos,
          COUNT(*) as total_registros
         FROM Uniforme u
         JOIN Asistencia a ON u.id_asistencia = a.id_asistencia
         JOIN Alumnos al ON a.id_alumno = al.id_alumno
         WHERE al.id_grado = ?`,
        [idGrado]
      );

      const total = uniformes[0].total_registros;
      const estadisticas = {
        zapatos: ((uniformes[0].zapatos_correctos / total) * 100).toFixed(2),
        playera: ((uniformes[0].playeras_correctas / total) * 100).toFixed(2),
        pantalon: ((uniformes[0].pantalones_correctos / total) * 100).toFixed(
          2
        ),
        sueter: ((uniformes[0].sueteres_correctos / total) * 100).toFixed(2),
        corte_pelo: ((uniformes[0].cortes_correctos / total) * 100).toFixed(2),
      };

      res.json(estadisticas);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Error al obtener estadísticas de uniforme" });
    }
  },
};

module.exports = perfilController;
