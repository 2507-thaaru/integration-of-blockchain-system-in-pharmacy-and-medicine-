require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const mongoose   = require("mongoose");

const { initBlockchain } = require("./config/blockchain");
const pharmaRoutes       = require("./routes/pharmaRoutes");
const authRoutes         = require("./routes/authRoutes");

const app = express();

app.use(helmet());
// UPDATED LINE: Added http://localhost:5173 to the origins array
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5001"],
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: "Too many requests" } }));

app.get("/health", (_req, res) => res.json({
  status: "ok", service: "PharmaChain API",
  timestamp: new Date().toISOString(),
  mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
}));

app.use("/api/auth",   authRoutes);
app.use("/api/pharma", pharmaRoutes);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error("Server error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
  await initBlockchain();
  console.log("Blockchain ready");
  const PORT = process.env.PORT || 5001; // Ensure this matches your frontend API calls
  app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
}

start().catch((err) => { console.error("Startup failed:", err.message); process.exit(1); });