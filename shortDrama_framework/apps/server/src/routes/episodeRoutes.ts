import { Router } from "express";
import { getEpisodeDetail } from "../services/episodeService.js";

export const episodeRouter = Router();

episodeRouter.get("/:episodeId", (req, res) => {
  const episode = getEpisodeDetail(req.params.episodeId);

  if (!episode) {
    res.status(404).json({ data: null, error: "EPISODE_NOT_FOUND" });
    return;
  }

  res.json({ data: episode });
});
