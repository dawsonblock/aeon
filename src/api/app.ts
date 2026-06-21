import express from "express";
import healthRoutes from "./routes/health.routes";
import chatRoutes from "./routes/chat.routes";
import tracesRoutes from "./routes/traces.routes";
import eventsRoutes from "./routes/events.routes";

const app = express();

// Standard middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routing namespaces
app.use("/api", healthRoutes);
app.use("/api", chatRoutes);
app.use("/api", tracesRoutes);
app.use("/api", eventsRoutes);

export default app;
