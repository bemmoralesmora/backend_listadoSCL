module.exports = (err, req, res, next) => {
  console.error(err.stack);

  // Errores de validación
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Error de validación",
      details: err.message,
    });
  }

  // Errores de MySQL
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      error: "Entrada duplicada",
      details: err.sqlMessage,
    });
  }

  // Errores de sintaxis SQL
  if (err.code === "ER_PARSE_ERROR") {
    return res.status(400).json({
      error: "Error en la consulta SQL",
      details: err.sqlMessage,
    });
  }

  // Error genérico
  res.status(500).json({
    error: "Error interno del servidor",
    message: err.message,
  });
};
