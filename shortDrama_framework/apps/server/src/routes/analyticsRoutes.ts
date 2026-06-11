import { Router } from "express";
import { recordInteractionEvent, recordPlaybackEvent } from "../services/analyticsService.js";

export const analyticsRouter = Router();

analyticsRouter.post("/playback", (req, res) => {
  try {
    recordPlaybackEvent(req.body);
    res.status(201).json({ data: { ok: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ data: null, error: message });
  }
});

analyticsRouter.post("/interaction", (req, res) => {
  try {
    recordInteractionEvent(req.body);
    res.status(201).json({ data: { ok: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ data: null, error: message });
  }
});
