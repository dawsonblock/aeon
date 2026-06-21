import { Router } from "express";
import { getEvent } from "../../db/repositories/events.repo";

const router = Router();

// GET /events/:eventId
router.get("/events/:eventId", async (req, res) => {
  try {
    const event = await getEvent(req.params.eventId);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve event" });
  }
});

// Explicit rejection of mutations for immutable audit compliance
router.all("/events/:eventId", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.status(405).json({
      error: "Method Not Allowed",
      message: "The event log is an immutable append-only ledger. Mutations are prohibited.",
    });
  } else {
    next();
  }
});

export default router;
