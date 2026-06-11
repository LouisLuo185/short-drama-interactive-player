export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type DoubaoOptions = {
  temperature?: number;
  maxTokens?: number;
};

export async function callDoubao(messages: ChatMessage[], options: DoubaoOptions = {}) {
  const apiKey = process.env.ARK_API_KEY;
  const baseUrl = process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3";
  const model = process.env.ARK_MODEL ?? "doubao-seed-2-0-lite-260428";
  const jsonMode = process.env.ARK_JSON_MODE === "true";

  if (!apiKey) {
    throw new Error("ARK_API_KEY is missing. Set it before running Doubao analysis.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {})
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Doubao API failed: ${response.status} ${responseText}`);
  }

  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Doubao API returned empty content: ${responseText}`);
  }

  return content;
}
