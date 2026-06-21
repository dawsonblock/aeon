import app from "./api/app";
import path from "path";
import { createServer as createViteServer } from "vite";
import { config } from "./config";

async function startServer() {
  const port = config.port;

  // If we are in development, integrate the Vite dev server middleware
  if (config.nodeEnv !== "production") {
    console.log("Starting AEON dev server with Vite integration...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
        watch: process.env.DISABLE_HMR === "true" ? null : {},
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting AEON production server...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve Vite build assets
    app.use(express.static(distPath));
    
    // SPA routing fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`AEON Operating Spine actively online at http://0.0.0.0:${port}`);
    console.log(`Mode: ${config.nodeEnv}`);
  });
}

// Support standard Express static import or native tsx running
import express from "express";
startServer().catch((err) => {
  console.error("Critical failure during AEON system initial boot:", err);
});
