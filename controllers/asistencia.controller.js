const pool = require("../config/database");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "parismirnov@gmail.com",
    pass: "vfeffjshcdbrttdo",
  },
});

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

  enviarEmail: async (req, res) => {
    try {
      const { destinatario, asunto, mensaje } = req.body;

      // Validar los datos recibidos
      if (!destinatario || !asunto || !mensaje) {
        return res.status(400).json({
          success: false,
          message: "Faltan campos requeridos: destinatario, asunto o mensaje",
        });
      }

      // Configurar el correo electrónico
      const mailOptions = {
        from: '"Sistema de Asistencia" <parismirnov@gmail.com>',
        to: destinatario,
        subject: asunto,
        text: mensaje,
        // También puedes usar html si quieres formato:
        // html: `<p>${mensaje}</p>`
      };

      // Enviar el correo
      const info = await transporter.sendMail(mailOptions);

      console.log("Correo enviado:", info.messageId);

      res.json({
        success: true,
        message: "Correo enviado con éxito",
        info: info.messageId,
      });
    } catch (error) {
      console.error("Error al enviar correo:", error);
      res.status(500).json({
        success: false,
        message: "Error al enviar el correo",
        error: error.message,
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

  // Obtener comentarios de un alumno
  obtenerComentariosAlumno: async (req, res) => {
    try {
      const { id_alumno } = req.params;

      const query = `
      SELECT fecha, comentario 
      FROM Asistencia 
      WHERE id_alumno = ? AND comentario IS NOT NULL AND comentario != ''
      ORDER BY fecha DESC
    `;

      const [comentarios] = await pool.query(query, [id_alumno]);
      res.json(comentarios);
    } catch (error) {
      console.error("Error al obtener comentarios:", error);
      res.status(500).json({ error: "Error al obtener comentarios" });
    }
  },

  // Obtener datos del uniforme de un alumno
  obtenerUniformeAlumno: async (req, res) => {
    try {
      const { id_alumno } = req.params;

      const query = `
      SELECT 
        u.zapatos,
        u.playera,
        u.pantalon,
        u.sueter,
        u.corte_pelo,
        u.observacion,
        a.fecha
      FROM Uniforme u
      JOIN Asistencia a ON u.id_asistencia = a.id_asistencia
      WHERE a.id_alumno = ?
      ORDER BY a.fecha DESC
      LIMIT 1
    `;

      const [uniforme] = await pool.query(query, [id_alumno]);

      if (uniforme.length === 0) {
        return res
          .status(404)
          .json({ error: "No se encontraron registros de uniforme" });
      }

      res.json(uniforme[0]);
    } catch (error) {
      console.error("Error al obtener uniforme:", error);
      res.status(500).json({ error: "Error al obtener datos del uniforme" });
    }
  },

  // Eliminar un alumno
  eliminarAlumno: async (req, res) => {
    try {
      const { id_alumno } = req.params;
      const { profesor_email, profesor_password } = req.body;

      if (!profesor_email || !profesor_password) {
        return res.status(400).json({
          error: "Credenciales de profesor requeridas",
        });
      }

      // Verificar credenciales del profesor
      const [profesor] = await pool.query(
        "SELECT * FROM Profesores WHERE email = ? AND contraseña = ?",
        [profesor_email, profesor_password]
      );

      if (profesor.length === 0) {
        return res.status(401).json({
          error: "Credenciales de profesor inválidas",
        });
      }

      // Verificar si el alumno existe
      const [alumno] = await pool.query(
        "SELECT * FROM Alumnos WHERE id_alumno = ?",
        [id_alumno]
      );
      if (alumno.length === 0) {
        return res.status(404).json({ error: "Alumno no encontrado" });
      }

      // Iniciar transacción
      await pool.query("START TRANSACTION");

      try {
        // Eliminar registros relacionados
        await pool.query(
          `
          DELETE u FROM Uniforme u
          JOIN Asistencia a ON u.id_asistencia = a.id_asistencia
          WHERE a.id_alumno = ?
        `,
          [id_alumno]
        );

        await pool.query("DELETE FROM Asistencia WHERE id_alumno = ?", [
          id_alumno,
        ]);
        await pool.query("DELETE FROM Alumnos WHERE id_alumno = ?", [
          id_alumno,
        ]);

        await pool.query("COMMIT");
        res.json({ success: true, message: "Alumno eliminado correctamente" });
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error al eliminar alumno:", error);
      res.status(500).json({ error: "Error al eliminar alumno" });
    }
  },
};

module.exports = asistenciaController;
