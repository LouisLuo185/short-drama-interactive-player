import { Router } from "express";
import { listEpisodeHighlights } from "../services/highlightService.js";

export const highlightRouter = Router();

highlightRouter.get("/:episodeId/highlights", (req, res) => {
  res.json({ data: listEpisodeHighlights(req.params.episodeId) });
});
