import { Router, type Request, type Response } from "express";

const router = Router();

// ─────────────────────────────────────────────
// Exact match routes — no dynamic params
// ─────────────────────────────────────────────

// GET / — redirect ke /layanan
router.get("/", (_req: Request, res: Response) => {
  res.redirect("/layanan");
});

// Auth
router.get("/login", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});
router.post("/login", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// SSO
router.get("/sso/login", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});
router.get("/sso/callback", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Logout
router.get("/logout", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Verifikasi dokumen
router.get("/verifikasi-dokumen", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Support
router.get("/support/officer", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Surat pernyataan
router.get("/surat-pernyataan", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Layanan index
router.get("/layanan", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Webhook
router.post("/webhook", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ─────────────────────────────────────────────
// Dynamic param routes — {registrationNumber}, {slug}
// ─────────────────────────────────────────────

// Validasi group — /validasi/{registrationNumber}[/...]
router.get("/validasi/:registrationNumber", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});
router.get("/validasi/:registrationNumber/pratinjau", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});
router.get("/validasi/:registrationNumber/unduh", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Layanan detail — /layanan/{slug}
router.get("/layanan/:slug", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default router;
