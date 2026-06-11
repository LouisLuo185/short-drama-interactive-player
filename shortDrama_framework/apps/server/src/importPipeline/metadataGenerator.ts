import fs from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "../db/database.js";
import { callDoubao } from "../llm/doubaoClient.js";
import type { ChatMessage } from "../llm/doubaoClient.js";

export type DramaMetadata = {
  title?: string;
  description: string;
  tags: string[];
  short_summary?: string;
  selling_points?: string[];
  generated_at: string;
};

export async function generateDramaMetadata(params: {
  dataRoot: string;
  dramaSlug: string;
  title: string;
  dramaId?: string;
}) {
  const contextDir = path.join(params.dataRoot, "3.5.doubao--story_context", params.dramaSlug);
  const storyContext = await readContextFiles(contextDir);
  const raw = await callDoubao(buildMetadataMessages(params.title, storyContext), {
    temperature: 0.2,
    maxTokens: 1600
  });
  const parsed = parseJsonObject(raw) ?? {};
  const metadata: DramaMetadata = {
    title: asString(parsed.title, params.title),
    description: asString(parsed.description, `${params.title} 的剧情简介待补充。`),
    tags: asStringArray(parsed.tags).slice(0, 6),
    short_summary: asString(parsed.short_summary, ""),
    selling_points: asStringArray(parsed.selling_points).slice(0, 5),
    generated_at: new Date().toISOString()
  };

  await fs.mkdir(contextDir, { recursive: true });
  await fs.writeFile(
    path.join(contextDir, "drama_metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(path.join(contextDir, "metadata_raw_response.json"), `${raw}\n`, "utf8");

  if (params.dramaId) {
    updateDramaMetadata(params.dramaId, metadata);
  }

  return metadata;
}

function buildMetadataMessages(title: string, storyContext: Record<string, unknown>): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是短剧平台的内容运营编辑。",
        "你需要根据剧情上下文，为短剧生成适合剧库卡片展示的简介和标签。",
        "简介要自然、准确、有吸引力，但不要剧透全部结局。",
        "标签应为中文短标签，2-6 个字，最多 6 个。",
        "输出必须是合法 JSON，不要 Markdown。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `短剧标题：${title}`,
        "",
        "剧情上下文：",
        JSON.stringify(storyContext, null, 2),
        "",
        "请输出：",
        JSON.stringify(
          {
            title,
            description: "",
            tags: ["逆袭", "身份反转"],
            short_summary: "",
            selling_points: []
          },
          null,
          2
        )
      ].join("\n")
    }
  ];
}

async function readContextFiles(contextDir: string) {
  const entries = await Promise.all([
    readOptionalJson(path.join(contextDir, "drama_context.json")),
    readOptionalJson(path.join(contextDir, "character_map.json")),
    readOptionalJson(path.join(contextDir, "episode_summaries.json")),
    readOptionalJson(path.join(contextDir, "danmaku_signals.json")),
    readOptionalJson(path.join(contextDir, "danmu_signals.json"))
  ]);

  return {
    drama_context: entries[0],
    character_map: entries[1],
    episode_summaries: entries[2],
    danmaku_signals: entries[3] ?? entries[4]
  };
}

async function readOptionalJson(filePath: string) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function updateDramaMetadata(dramaId: string, metadata: DramaMetadata) {
  const db = getDatabase();
  db.prepare(
    `UPDATE dramas
     SET title = ?, description = ?, tags_json = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    metadata.title ?? "",
    metadata.description,
    JSON.stringify(metadata.tags),
    new Date().toISOString(),
    dramaId
  );
}

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}
