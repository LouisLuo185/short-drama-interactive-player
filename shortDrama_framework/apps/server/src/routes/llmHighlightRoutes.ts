import { Router } from "express";
import {
  getEpisodeLlmHighlightDebug,
  getEpisodeLlmHighlightMarkers,
  getEpisodeLlmHighlightOverrides,
  saveEpisodeLlmHighlightOverride
} from "../services/llmHighlightService.js";

export const llmHighlightRouter = Router();

llmHighlightRouter.get("/:episodeId/llm-highlights", (req, res) => {
  const episodeId = req.params.episodeId;
  const markers = getEpisodeLlmHighlightMarkers(episodeId);

  res.json({
    data: {
      episodeId,
      markers
    }
  });
});

llmHighlightRouter.get("/:episodeId/llm-highlight-candidates", (req, res) => {
  const episodeId = req.params.episodeId;
  const debug = getEpisodeLlmHighlightDebug(episodeId);

  res.json({ data: debug });
});

llmHighlightRouter.get("/:episodeId/llm-highlight-overrides", (req, res) => {
  const episodeId = req.params.episodeId;
  const result = getEpisodeLlmHighlightOverrides(episodeId);

  res.json({ data: result });
});

llmHighlightRouter.put("/:episodeId/llm-highlight-overrides/:candidateId", (req, res) => {
  try {
    const result = saveEpisodeLlmHighlightOverride(req.params.episodeId, {
      ...req.body,
      candidateId: req.params.candidateId
    });

    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ data: null, error: message });
  }
});
