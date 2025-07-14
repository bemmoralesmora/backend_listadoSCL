const allowedOrigins = [
  "http://127.0.0.1:5501",
  "http://127.0.0.1:5502",
  "http://localhost:5500",
  "https://bemmoralesmora.github.io",
  "https://bemmoralesmora.github.io/Listado_scl",
  "https://listado-scl.vercel.app",
];

const corsConfig = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

module.exports = corsConfig;
