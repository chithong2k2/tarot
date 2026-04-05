import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import telegramHandler from "./api/telegram.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Telegram Bot Logic (Webhook Mode) ---
app.all("/api/telegram", telegramHandler);

// --- Vite Middleware & Server Start ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server locally or on Cloud Run. 
// Vercel will use the exported app directly.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
