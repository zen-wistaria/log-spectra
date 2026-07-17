import express, { type Request, type Response } from "express";
import router from "./routes";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(router);

// ─────────────────────────────────────────────
// 404 catch-all — any unmatched route
// ─────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "not found" });
});

app.listen(PORT, () => {
  console.log(`Sample app running on http://localhost:${PORT}`);
});

export default app;
