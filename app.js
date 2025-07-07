const express = require("express");
const cors = require("cors");
const corsConfig = require("./config/cors");
const app = express();

const profesoresRouter = require("./routes/profesores.routes");
const gradosRouter = require("./routes/grados.routes");
const alumnosRouter = require("./routes/alumnos.routes");
const uniformeRouter = require("./routes/uniforme.routes");
const asistenciaRouter = require("./routes/asistencia.routes");
const perfilRoutes = require("./routes/perfil.routes");

app.use(express.json());
app.use(cors(corsConfig));

app.use("/profesores", profesoresRouter);
app.use("/grados", gradosRouter);
app.use("/alumnos", alumnosRouter);
app.use("/uniforme", uniformeRouter);
app.use("/asistencia", asistenciaRouter);
app.use("/perfil", perfilRoutes);

// Ruta básica de salud
app.get("/", (req, res) => {
  res.send("API funcionando");
});

module.exports = app;
