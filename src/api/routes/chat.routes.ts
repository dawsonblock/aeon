import { Router } from "express";
import { ChatRequestSchema } from "../../schemas/chat.schema";
import { processChat } from "../../services/chat.service";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const validated = ChatRequestSchema.parse(req.body);
    const response = await processChat(validated);
    res.json(response);
  } catch (error: any) {
    console.error("Chat route error:", error);
    if (error.name === "ZodError" || error.errors) {
      res.status(400).json({ error: "Validation failed", details: error.errors || error.message });
    } else {
      res.status(500).json({ error: error.message || "Failed to process chat" });
    }
  }
});

export default router;
