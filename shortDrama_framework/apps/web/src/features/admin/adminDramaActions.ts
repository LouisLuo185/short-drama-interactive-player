import { deleteDrama, updateDrama } from "../../services/dramaApi";
import type { DramaCard } from "../../types/drama";

export function updateDramaTitle(dramaId: string, title: string) {
  return updateDrama(dramaId, { title });
}

export function updateDramaDescription(dramaId: string, description: string) {
  return updateDrama(dramaId, { description });
}

export function removeDrama(dramaId: string) {
  return deleteDrama(dramaId);
}

export function mergeDramaCard(dramas: DramaCard[], updated: DramaCard) {
  return dramas.map((drama) => (drama.id === updated.id ? updated : drama));
}
