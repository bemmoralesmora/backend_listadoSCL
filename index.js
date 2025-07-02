const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

const app = express();

// Configuración básica
app.use(
  cors({
    origin: "http://127.0.0.1:5501", // o usa '*' para permitir todos los orígenes (no recomendado para producción)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Conexión a MySQL (versión simplificada)
const db = mysql.createConnection({
  host: "b9samry19yq5e4x35vfy-mysql.services.clever-cloud.com",
  user: "ukqfgworavi3hxdt",
  password: "t6FDMvdbFqO7WPA2q6SC",
  database: "b9samry19yq5e4x35vfy",
  port: 3306, // cámbialo si Clever Cloud te indica otro
});

db.connect((err) => {
  if (err) {
    console.error("Error de conexión a MySQL:", err);
    process.exit(1); // Termina la aplicación si no puede conectar
  }
  console.log("Conectado a MySQL");
});

// Ruta básica de salud
app.get("/", (req, res) => {
  res.send("API funcionando");
});

// ==================== RUTAS PARA PROFESORES ====================

// GET /profesores - Obtiene todos los profesores con su grado asignado
app.get("/profesores", (req, res) => {
  const query = `
        SELECT p.*, g.nombre_grado 
        FROM Profesores p
        LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
    `;
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST /profesores - Crea un nuevo profesor (con validación de grado)
app.post("/profesores", (req, res) => {
  const { nombre, apellido, email, contraseña, id_grado_asignado } = req.body;

  // Validar que el grado exista si se está asignando
  if (id_grado_asignado) {
    const checkGradoQuery = "SELECT id_grado FROM Grados WHERE id_grado = ?";

    db.query(checkGradoQuery, [id_grado_asignado], (err, gradoResults) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (gradoResults.length === 0) {
        return res.status(400).json({ error: "El grado asignado no existe" });
      }

      // Si el grado existe, proceder con la inserción
      insertProfesor();
    });
  } else {
    // Si no se asigna grado, proceder directamente
    insertProfesor();
  }

  function insertProfesor() {
    const query = "INSERT INTO Profesores SET ?";
    db.query(
      query,
      { nombre, apellido, email, contraseña, id_grado_asignado },
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: result.insertId });
      }
    );
  }
});

// GET /profesores/:id - Obtiene un profesor específico por ID
app.get("/profesores/:id", (req, res) => {
  const { id } = req.params;
  const query = `
        SELECT p.*, g.nombre_grado 
        FROM Profesores p
        LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
        WHERE p.id_profesor = ?
    `;

  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }
    res.json(results[0]);
  });
});

// GET /profesores/:id/alumnos - Obtiene alumnos del grado asignado a un profesor
app.get("/profesores/:id/alumnos", (req, res) => {
  const { id } = req.params;

  // Primero obtener el grado asignado al profesor
  const getGradoQuery =
    "SELECT id_grado_asignado FROM Profesores WHERE id_profesor = ?";

  db.query(getGradoQuery, [id], (err, profesorResults) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (profesorResults.length === 0) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    const id_grado = profesorResults[0].id_grado_asignado;

    if (!id_grado) {
      return res
        .status(400)
        .json({ error: "Este profesor no tiene un grado asignado" });
    }

    // Obtener los alumnos del grado
    const getAlumnosQuery = `
            SELECT a.*, g.nombre_grado 
            FROM Alumnos a
            JOIN Grados g ON a.id_grado = g.id_grado
            WHERE a.id_grado = ?
        `;

    db.query(getAlumnosQuery, [id_grado], (err, alumnosResults) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(alumnosResults);
    });
  });
});

// PUT /profesores/:id/grado - Actualiza el grado asignado a un profesor
app.put("/profesores/:id/grado", (req, res) => {
  const { id } = req.params;
  const { id_grado_asignado } = req.body;

  if (id_grado_asignado === undefined) {
    return res.status(400).json({ error: "id_grado_asignado es requerido" });
  }

  // Verificar que el grado exista
  const checkGradoQuery = "SELECT id_grado FROM Grados WHERE id_grado = ?";

  db.query(checkGradoQuery, [id_grado_asignado], (err, gradoResults) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (gradoResults.length === 0 && id_grado_asignado !== null) {
      return res.status(400).json({ error: "El grado asignado no existe" });
    }

    // Actualizar el grado asignado
    const updateQuery =
      "UPDATE Profesores SET id_grado_asignado = ? WHERE id_profesor = ?";

    db.query(updateQuery, [id_grado_asignado, id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Profesor no encontrado" });
      }
      res.json({ success: true });
    });
  });
});

// POST /login-profesor - Autenticación de profesores
app.post("/login-profesor", (req, res) => {
  const { email, contraseña } = req.body;

  if (!email || !contraseña) {
    return res.status(400).json({
      error: "Email y contraseña son requeridos",
      details: {
        email: !email ? "Campo requerido" : undefined,
        contraseña: !contraseña ? "Campo requerido" : undefined,
      },
    });
  }

  const query = `
        SELECT p.*, g.nombre_grado 
        FROM Profesores p
        LEFT JOIN Grados g ON p.id_grado_asignado = g.id_grado
        WHERE p.email = ?
    `;

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Error en consulta SQL:", err);
      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        error: "Credenciales incorrectas",
      });
    }

    const profesor = results[0];

    if (profesor.contraseña !== contraseña) {
      return res.status(401).json({
        error: "Credenciales incorrectas",
      });
    }

    res.json({
      success: true,
      profesor: {
        id: profesor.id_profesor,
        nombre: profesor.nombre,
        apellido: profesor.apellido,
        email: profesor.email,
        id_grado_asignado: profesor.id_grado_asignado,
        nombre_grado: profesor.nombre_grado,
      },
    });
  });
});

// ==================== RUTAS PARA GRADOS ====================

// GET /grados - Obtiene todos los grados con conteo de alumnos y profesores
app.get("/grados", (req, res) => {
  const query = `
        SELECT g.id_grado, g.nombre_grado, g.nivel, 
               COUNT(a.id_alumno) as cantidad_alumnos,
               COUNT(p.id_profesor) as cantidad_profesores
        FROM Grados g
        LEFT JOIN Alumnos a ON g.id_grado = a.id_grado
        LEFT JOIN Profesores p ON g.id_grado = p.id_grado_asignado
        GROUP BY g.id_grado, g.nombre_grado, g.nivel
        ORDER BY 
            CASE g.nivel
                WHEN 'Primaria' THEN 1
                WHEN 'Básico' THEN 2
                WHEN 'Diversificado' THEN 3
                ELSE 4
            END,
            g.nombre_grado
    `;
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// GET /grados/exacto/:nombre - Busca grado por nombre exacto
app.get("/grados/exacto/:nombre", (req, res) => {
  const { nombre } = req.params;
  const query = "SELECT * FROM Grados WHERE nombre_grado = ? LIMIT 1";

  db.query(query, [nombre], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Grado no encontrado" });
    }
    res.json(results[0]);
  });
});

// POST /grados - Crea un nuevo grado
app.post("/grados", (req, res) => {
  const { nombre_grado, nivel } = req.body;

  if (!nombre_grado || !nivel) {
    return res
      .status(400)
      .json({ error: "Nombre y nivel del grado son requeridos" });
  }

  // Usar INSERT IGNORE para evitar errores de duplicados
  const query = "INSERT IGNORE INTO Grados SET ?";
  db.query(query, { nombre_grado, nivel }, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: "Este grado ya existe" });
    }

    res.status(201).json({
      id: result.insertId,
      nombre_grado,
      nivel,
    });
  });
});

// GET /grados/:id/alumnos - Obtiene alumnos de un grado específico
app.get("/grados/:id/alumnos", (req, res) => {
  const { id } = req.params;
  const query = `
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        WHERE a.id_grado = ?
    `;
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// GET /grados/:id/profesores - Obtiene profesores asignados a un grado
app.get("/grados/:id/profesores", (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM Profesores WHERE id_grado_asignado = ?";

  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ==================== RUTAS PARA ALUMNOS ====================

// GET /alumnos - Obtiene todos los alumnos con su grado
app.get("/alumnos", (req, res) => {
  const query = `
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        LEFT JOIN Grados g ON a.id_grado = g.id_grado
    `;
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST /alumnos - Crea un nuevo alumno (con búsqueda de grado por nombre)
app.post("/alumnos", (req, res) => {
  const { nombre, apellido, grado } = req.body;

  if (!nombre || !apellido || !grado) {
    return res
      .status(400)
      .json({ error: "Nombre, apellido y grado son requeridos" });
  }

  // Primero encontrar el ID del grado
  const findGradoQuery = "SELECT id_grado FROM Grados WHERE nombre_grado = ?";

  db.query(findGradoQuery, [grado], (err, gradoResults) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (gradoResults.length === 0) {
      return res.status(404).json({ error: "Grado no encontrado" });
    }

    const id_grado = gradoResults[0].id_grado;

    // Insertar el alumno
    const insertQuery =
      "INSERT INTO Alumnos (nombre, apellido, id_grado) VALUES (?, ?, ?)";

    db.query(insertQuery, [nombre, apellido, id_grado], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Obtener los datos completos del alumno recién creado
      const getAlumnoQuery = `
                SELECT a.*, g.nombre_grado 
                FROM Alumnos a
                JOIN Grados g ON a.id_grado = g.id_grado
                WHERE a.id_alumno = ?
            `;

      db.query(getAlumnoQuery, [result.insertId], (err, alumnoResults) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json(alumnoResults[0]);
      });
    });
  });
});

// GET /alumnos/:id - Obtiene un alumno específico por ID
app.get("/alumnos/:id", (req, res) => {
  const { id } = req.params;
  const query = `
        SELECT a.*, g.nombre_grado 
        FROM Alumnos a
        LEFT JOIN Grados g ON a.id_grado = g.id_grado
        WHERE a.id_alumno = ?
    `;
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Alumno no encontrado" });
    }
    res.json(results[0]);
  });
});

// GET /alumnos/:id/asistencia - Obtiene el historial de asistencia de un alumno
app.get("/alumnos/:id/asistencia", (req, res) => {
  const { id } = req.params;
  const query =
    "SELECT * FROM Asistencia WHERE id_alumno = ? ORDER BY fecha DESC";
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ==================== RUTAS PARA UNIFORME ====================

// POST /uniforme - Guardar datos del uniforme
app.post("/uniforme", async (req, res) => {
  const {
    id_asistencia,
    zapatos,
    playera,
    pantalon,
    sueter,
    corte_pelo,
    observacion,
  } = req.body;

  if (!id_asistencia) {
    return res.status(400).json({ error: "ID de asistencia es requerido" });
  }

  try {
    const query = `
      INSERT INTO Uniforme 
        (id_asistencia, zapatos, playera, pantalon, sueter, corte_pelo, observacion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        zapatos = VALUES(zapatos),
        playera = VALUES(playera),
        pantalon = VALUES(pantalon),
        sueter = VALUES(sueter),
        corte_pelo = VALUES(corte_pelo),
        observacion = VALUES(observacion)
    `;

    db.query(
      query,
      [
        id_asistencia,
        zapatos,
        playera,
        pantalon,
        sueter,
        corte_pelo,
        observacion,
      ],
      (err, result) => {
        if (err) {
          console.error("Error al guardar uniforme:", err);
          return res.status(500).json({ error: "Error al guardar uniforme" });
        }
        res.json({ success: true, message: "Uniforme guardado correctamente" });
      }
    );
  } catch (error) {
    console.error("Error en ruta /uniforme:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /uniforme/:id_asistencia - Obtener datos del uniforme
app.get("/uniforme/:id_asistencia", (req, res) => {
  const { id_asistencia } = req.params;

  db.query(
    "SELECT * FROM Uniforme WHERE id_asistencia = ?",
    [id_asistencia],
    (err, results) => {
      if (err) {
        console.error("Error al obtener uniforme:", err);
        return res.status(500).json({ error: "Error al obtener uniforme" });
      }
      res.json(results[0] || null);
    }
  );
});

// ==================== RUTAS MODIFICADAS PARA ASISTENCIA ====================

// Modificamos la ruta GET /asistencia/grado/:id_grado para incluir uniforme
app.get("/asistencia/grado/:id_grado", (req, res) => {
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

  db.query(query, [fecha, fecha, id_grado], (err, results) => {
    if (err) {
      console.error("Error en consulta de asistencia:", err);
      return res.status(500).json({ error: "Error al obtener asistencia" });
    }
    res.json(results);
  });
});

// POST /asistencia/batch - Guarda múltiples registros de asistencia (transaccional)
app.post("/asistencia/batch", async (req, res) => {
  const { asistencias } = req.body;

  if (!asistencias || !Array.isArray(asistencias)) {
    return res.status(400).json({ error: "Lista de asistencias es requerida" });
  }

  try {
    // Validar cada asistencia
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

    // Iniciar transacción
    await db.beginTransaction();

    const queries = asistencias.map((asistencia) => {
      return new Promise((resolve, reject) => {
        const sql = `
                    INSERT INTO Asistencia (id_alumno, fecha, estado, comentario)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        estado = VALUES(estado),
                        comentario = VALUES(comentario)
                `;
        db.query(
          sql,
          [
            asistencia.id_alumno,
            asistencia.fecha,
            asistencia.estado.toLowerCase(), // Asegurar minúsculas
            asistencia.comentario || "",
          ],
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });
    });

    await Promise.all(queries);
    await db.commit();

    res.json({
      success: true,
      message: `Asistencia guardada para ${asistencias.length} alumnos`,
    });
  } catch (error) {
    await db.rollback();
    console.error("Error en batch de asistencias:", error);
    res.status(500).json({
      error: "Error al guardar asistencias",
      details: error.message,
      sqlMessage: error.sqlMessage,
    });
  }
});

// PUT /asistencia/update-multiple - Alternativa para actualizar múltiples asistencias
app.put("/asistencia/update-multiple", (req, res) => {
  const { asistencias } = req.body;

  if (!asistencias || !Array.isArray(asistencias)) {
    return res.status(400).json({ error: "Lista de asistencias es requerida" });
  }

  const updates = [];

  // Preparar consultas de actualización
  asistencias.forEach((asistencia) => {
    if (asistencia.id_asistencia) {
      updates.push(
        db.query(
          "UPDATE Asistencia SET estado = ?, comentario = ? WHERE id_asistencia = ?",
          [
            asistencia.estado,
            asistencia.comentario || "",
            asistencia.id_asistencia,
          ]
        )
      );
    } else if (asistencia.id_alumno && asistencia.fecha) {
      updates.push(
        db.query(
          "INSERT INTO Asistencia (id_alumno, fecha, estado, comentario) VALUES (?, ?, ?, ?)",
          [
            asistencia.id_alumno,
            asistencia.fecha,
            asistencia.estado,
            asistencia.comentario || "",
          ]
        )
      );
    }
  });

  // Ejecutar todas las actualizaciones
  Promise.all(updates)
    .then(() => {
      res.json({
        success: true,
        message: "Asistencias actualizadas correctamente",
      });
    })
    .catch((error) => {
      console.error("Error al actualizar asistencias:", error);
      res.status(500).json({ error: "Error al actualizar asistencias" });
    });
});

app.get("/asistencia/grado/:nombre_grado", (req, res) => {
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
      u.zapatos, 
      u.playera, 
      u.pantalon, 
      u.sueter, 
      u.corte_pelo, 
      u.observacion
    FROM Alumnos a
    JOIN Grados g ON a.id_grado = g.id_grado
    LEFT JOIN Asistencia asis ON a.id_alumno = asis.id_alumno AND asis.fecha = ?
    LEFT JOIN Uniforme u ON asis.id_asistencia = u.id_asistencia
    WHERE g.nombre_grado = ?
    ORDER BY a.apellido, a.nombre
  `;

  db.query(query, [fecha, nombre_grado], (err, results) => {
    if (err) {
      console.error("Error en consulta de asistencia:", err);
      return res.status(500).json({ error: "Error al obtener asistencia" });
    }
    res.json(results);
  });
});

// En backend.js - Ruta POST /asistencia/batch
app.post("/asistencia/batch", async (req, res) => {
  try {
    const { asistencias } = req.body;
    console.log("Datos recibidos:", asistencias); // ← Añade esto para depuración

    // ... resto del código ...

    // Dentro del map de asistencias:
    if (asistencia.uniforme) {
      console.log("Uniforme a guardar:", asistencia.uniforme); // ← Depuración
      await db.query(
        `INSERT INTO Uniforme 
         (id_asistencia, zapatos, playera, pantalon, sueter, corte_pelo, observacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           zapatos=VALUES(zapatos), playera=VALUES(playera), pantalon=VALUES(pantalon),
           sueter=VALUES(sueter), corte_pelo=VALUES(corte_pelo), observacion=VALUES(observacion)`,
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

    // ... resto del código ...
  } catch (error) {
    console.error("Error completo:", error); // ← Mejor logging de errores
    res.status(500).json({
      error: "Error al guardar",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// ==================== MEJORAS A RUTAS EXISTENTES ====================

// GET /asistencia/grado/ - Obtiene asistencia por nivel (sin ID específico)
app.get("/asistencia/grado/", (req, res) => {
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
            asi.id_asistencia
        FROM Alumnos a
        JOIN Grados g ON a.id_grado = g.id_grado
        LEFT JOIN Asistencia asi ON a.id_alumno = asi.id_alumno AND asi.fecha = ?
    `;

  const params = [fecha];

  if (nivel) {
    query += " WHERE g.nivel = ?";
    params.push(nivel);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// GET /asistencia/buscar - Busca alumnos y sus asistencias por nombre
app.get("/asistencia/buscar", async (req, res) => {
  const { nombre } = req.query;

  if (!nombre || nombre.trim().length < 3) {
    return res.status(400).json({
      error: "Debe proporcionar un nombre de al menos 3 caracteres",
    });
  }

  try {
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

    db.query(searchQuery, [`%${nombre}%`], (err, results) => {
      if (err) {
        console.error("Error en búsqueda:", err);
        return res.status(500).json({ error: "Error en la búsqueda" });
      }

      res.json(results);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Configuración del puerto
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

module.exports = app;
