import { deleteJson, getJson, patchJson } from "./http";
import type { DramaCard, DramaDetail } from "../types/drama";

export function fetchDramas() {
  return getJson<DramaCard[]>("/api/dramas");
}

export function fetchDramaDetail(dramaId: string) {
  return getJson<DramaDetail>(`/api/dramas/${dramaId}`);
}

export function updateDrama(
  dramaId: string,
  payload: Partial<Pick<DramaCard, "title" | "description" | "tags" | "coverUrl">>
) {
  return patchJson<DramaCard>(`/api/dramas/${dramaId}`, payload);
}

export function deleteDrama(dramaId: string) {
  return deleteJson<{ deletedDramaId: string }>(`/api/dramas/${dramaId}`);
}
