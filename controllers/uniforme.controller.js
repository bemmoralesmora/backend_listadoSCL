const pool = require("../config/database");

const uniformeController = {
  saveUniforme: async (req, res) => {
    try {
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

      const [result] = await pool.query(query, [
        id_asistencia,
        zapatos,
        playera,
        pantalon,
        sueter,
        corte_pelo,
        observacion,
      ]);

      res.json({
        success: true,
        message: "Uniforme guardado correctamente",
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error("Error al guardar uniforme:", error);
      res.status(500).json({
        error: "Error al guardar uniforme",
        details: error.message,
      });
    }
  },

  getUniforme: async (req, res) => {
    try {
      const { id_asistencia } = req.params;
      const [results] = await pool.query(
        "SELECT * FROM Uniforme WHERE id_asistencia = ?",
        [id_asistencia]
      );

      res.json(results[0] || null);
    } catch (error) {
      console.error("Error al obtener uniforme:", error);
      res.status(500).json({
        error: "Error al obtener uniforme",
        details: error.message,
      });
    }
  },
};

module.exports = uniformeController;
