import { Router } from "express";
import { deleteDrama, getDramaDetail, listDramas, updateDrama } from "../services/dramaService.js";

export const dramaRouter = Router();

dramaRouter.get("/", (_req, res) => {
  res.json({ data: listDramas() });
});

dramaRouter.get("/:dramaId", (req, res) => {
  const drama = getDramaDetail(req.params.dramaId);

  if (!drama) {
    res.status(404).json({ data: null, error: "DRAMA_NOT_FOUND" });
    return;
  }

  res.json({ data: drama });
});

dramaRouter.patch("/:dramaId", (req, res) => {
  try {
    const drama = updateDrama(req.params.dramaId, req.body);

    if (!drama) {
      res.status(404).json({ data: null, error: "DRAMA_NOT_FOUND" });
      return;
    }

    res.json({ data: drama });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ data: null, error: message });
  }
});

dramaRouter.delete("/:dramaId", (req, res) => {
  const result = deleteDrama(req.params.dramaId);

  if (!result) {
    res.status(404).json({ data: null, error: "DRAMA_NOT_FOUND" });
    return;
  }

  res.json({ data: result });
});
