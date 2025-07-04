const pool = require("../config/database");

const asistenciaController = {
  getAsistenciaByGradoId: async (req, res) => {
    try {
      const { id_grado } = req.params;
      const { fecha } = req.query;

      if (!fecha) {
        return res.status(400).json({ error: "Parámetro fecha es requerido" });
      }

      const query = `
        SELECT 
          a.id_alumno, 
          a.nombre, 
          a.apellido, 
          g.nombre_grado,
          ? as fecha,
          IFNULL(asis.estado, 'ausente') as estado,
          IFNULL(asis.comentario, '') as comentario,
          IFNULL(asis.id_asistencia, NULL) as id_asistencia,
          u.zapatos, u.playera, u.pantalon, u.sueter, u.corte_pelo, u.observacion
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        LEFT JOIN Asistencia asis ON a.id_alumno = asis.id_alumno AND asis.fecha = ?
        LEFT JOIN Uniforme u ON asis.id_asistencia = u.id_asistencia
        WHERE a.id_grado = ?
        ORDER BY a.apellido, a.nombre
      `;

      const [results] = await pool.query(query, [fecha, fecha, id_grado]);
      res.json(results);
    } catch (error) {
      console.error("Error en consulta de asistencia:", error);
      res.status(500).json({
        error: "Error al obtener asistencia",
        details: error.message,
      });
    }
  },

  getAsistenciaByGradoNombre: async (req, res) => {
    try {
      const { nombre_grado } = req.params;
      const { fecha } = req.query;

      if (!fecha) {
        return res.status(400).json({ error: "Parámetro fecha es requerido" });
      }

      const query = `
        SELECT 
          a.id_alumno, 
          a.nombre, 
          a.apellido, 
          g.nombre_grado,
          asis.fecha,
          IFNULL(asis.estado, 'ausente') as estado,
          IFNULL(asis.comentario, '') as comentario,
          asis.id_asistencia,
          u.zapatos, u.playera, u.pantalon, u.sueter, u.corte_pelo, u.observacion
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        LEFT JOIN Asistencia asis ON a.id_alumno = asis.id_alumno AND asis.fecha = ?
        LEFT JOIN Uniforme u ON asis.id_asistencia = u.id_asistencia
        WHERE g.nombre_grado = ?
        ORDER BY a.apellido, a.nombre
      `;

      const [results] = await pool.query(query, [fecha, nombre_grado]);
      res.json(results);
    } catch (error) {
      console.error("Error en consulta de asistencia:", error);
      res.status(500).json({
        error: "Error al obtener asistencia",
        details: error.message,
      });
    }
  },

  saveBatchAsistencia: async (req, res) => {
    try {
      const { asistencias } = req.body;
      console.log("Datos recibidos:", asistencias);

      if (!asistencias || !Array.isArray(asistencias)) {
        return res
          .status(400)
          .json({ error: "Lista de asistencias es requerida" });
      }

      // Validaciones
      const estadosPermitidos = ["presente", "ausente", "justificado"];
      for (const asistencia of asistencias) {
        if (!asistencia.id_alumno || !asistencia.fecha || !asistencia.estado) {
          return res.status(400).json({
            error: "Cada registro debe tener id_alumno, fecha y estado",
            registro_invalido: asistencia,
          });
        }

        if (!estadosPermitidos.includes(asistencia.estado.toLowerCase())) {
          return res.status(400).json({
            error: `Estado '${
              asistencia.estado
            }' no permitido. Use: ${estadosPermitidos.join(", ")}`,
          });
        }
      }

      // Transacción
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        for (const asistencia of asistencias) {
          // Insertar/actualizar asistencia
          const [result] = await connection.query(
            `
            INSERT INTO Asistencia (id_alumno, fecha, estado, comentario)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              estado = VALUES(estado),
              comentario = VALUES(comentario)
          `,
            [
              asistencia.id_alumno,
              asistencia.fecha,
              asistencia.estado.toLowerCase(),
              asistencia.comentario || "",
            ]
          );

          // Si hay uniforme y se insertó/actualizó asistencia
          if (
            (asistencia.uniforme && result.insertId) ||
            result.affectedRows > 0
          ) {
            const idAsistencia = result.insertId || asistencia.id_asistencia;
            await connection.query(
              `
              INSERT INTO Uniforme 
                (id_asistencia, zapatos, playera, pantalon, sueter, corte_pelo, observacion)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                zapatos=VALUES(zapatos), playera=VALUES(playera), pantalon=VALUES(pantalon),
                sueter=VALUES(sueter), corte_pelo=VALUES(corte_pelo), observacion=VALUES(observacion)
            `,
              [
                idAsistencia,
                asistencia.uniforme.zapatos || 0,
                asistencia.uniforme.playera || 0,
                asistencia.uniforme.pantalon || 0,
                asistencia.uniforme.sueter || 0,
                asistencia.uniforme.corte_pelo || 0,
                asistencia.uniforme.observacion || "",
              ]
            );
          }
        }

        await connection.commit();
        res.json({
          success: true,
          message: `Asistencia guardada para ${asistencias.length} alumnos`,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error en batch de asistencias:", error);
      res.status(500).json({
        error: "Error al guardar asistencias",
        details: error.message,
        sqlMessage: error.sqlMessage,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    }
  },

  updateMultipleAsistencias: async (req, res) => {
    try {
      const { asistencias } = req.body;

      if (!asistencias || !Array.isArray(asistencias)) {
        return res
          .status(400)
          .json({ error: "Lista de asistencias es requerida" });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        for (const asistencia of asistencias) {
          if (asistencia.id_asistencia) {
            await connection.query(
              "UPDATE Asistencia SET estado = ?, comentario = ? WHERE id_asistencia = ?",
              [
                asistencia.estado,
                asistencia.comentario || "",
                asistencia.id_asistencia,
              ]
            );
          } else if (asistencia.id_alumno && asistencia.fecha) {
            await connection.query(
              "INSERT INTO Asistencia (id_alumno, fecha, estado, comentario) VALUES (?, ?, ?, ?)",
              [
                asistencia.id_alumno,
                asistencia.fecha,
                asistencia.estado,
                asistencia.comentario || "",
              ]
            );
          }
        }

        await connection.commit();
        res.json({
          success: true,
          message: "Asistencias actualizadas correctamente",
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error al actualizar asistencias:", error);
      res.status(500).json({
        error: "Error al actualizar asistencias",
        details: error.message,
      });
    }
  },

  getAsistenciaByNivel: async (req, res) => {
    try {
      const { fecha, nivel } = req.query;

      if (!fecha) {
        return res.status(400).json({ error: "Fecha es requerida" });
      }

      let query = `
        SELECT 
          a.*, 
          g.nombre_grado, 
          g.nivel,
          asi.estado,
          asi.comentario,
          asi.id_asistencia,
          u.zapatos, u.playera, u.pantalon, u.sueter, u.corte_pelo, u.observacion
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        LEFT JOIN Asistencia asi ON a.id_alumno = asi.id_alumno AND asi.fecha = ?
        LEFT JOIN Uniforme u ON asi.id_asistencia = u.id_asistencia
      `;

      const params = [fecha];

      if (nivel) {
        query += " WHERE g.nivel = ?";
        params.push(nivel);
      }

      const [results] = await pool.query(query, params);
      res.json(results);
    } catch (error) {
      res.status(500).json({
        error: error.message,
        details: "Error al obtener asistencia por nivel",
      });
    }
  },

  buscarAlumnosAsistencia: async (req, res) => {
    try {
      const { nombre } = req.query;

      if (!nombre || nombre.trim().length < 3) {
        return res.status(400).json({
          error: "Debe proporcionar un nombre de al menos 3 caracteres",
        });
      }

      const searchQuery = `
        SELECT 
          a.id_alumno,
          a.nombre,
          a.apellido,
          g.nombre_grado,
          COUNT(CASE WHEN asi.estado = 'presente' THEN 1 END) as total_presentes,
          COUNT(CASE WHEN asi.estado = 'ausente' THEN 1 END) as total_ausentes,
          COUNT(CASE WHEN asi.estado = 'justificado' THEN 1 END) as total_justificados,
          COUNT(*) as total_asistencias
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        LEFT JOIN Asistencia asi ON a.id_alumno = asi.id_alumno
        WHERE CONCAT(a.nombre, ' ', a.apellido) LIKE ?
        GROUP BY a.id_alumno
        ORDER BY a.apellido, a.nombre
        LIMIT 10
      `;

      const [results] = await pool.query(searchQuery, [`%${nombre}%`]);
      res.json(results);
    } catch (error) {
      console.error("Error en búsqueda:", error);
      res.status(500).json({
        error: "Error en la búsqueda",
        details: error.message,
      });
    }
  },
};

module.exports = asistenciaController;
