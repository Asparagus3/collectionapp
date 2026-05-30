import Anthropic from "@anthropic-ai/sdk";

export type DetectedItem = {
  type: "book" | "music";
  title: string;
  author_artist: string;
};

type RequestBody = {
  image: string;   // base64 エンコード済み
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

const SYSTEM_PROMPT = `あなたは書籍・CDの識別専門家です。
ユーザーが送信した本棚・CD棚の写真を解析し、写真に写っているすべての本・CDを検出してください。

必ず以下のJSON配列のみを返してください。説明文・マークダウン・コードブロックは一切不要です。
[
  { "type": "book" | "music", "title": "タイトル", "author_artist": "著者またはアーティスト名" }
]

検出できない場合は空配列 [] を返してください。`;

function buildClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

function parseItems(text: string): DetectedItem[] {
  // コードブロックやテキストが混入した場合でも JSON 部分を抽出する
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  const parsed: unknown = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).title !== "string" ||
      typeof (item as Record<string, unknown>).author_artist !== "string" ||
      !["book", "music"].includes((item as Record<string, unknown>).type as string)
    ) {
      return [];
    }
    return [item as DetectedItem];
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  if (!body.image || !body.mediaType) {
    return Response.json(
      { error: "image と mediaType は必須です" },
      { status: 400 }
    );
  }

  try {
    const client = buildClient();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // システムプロンプトをキャッシュして繰り返しリクエストのコストを削減
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: body.mediaType,
                data: body.image,
              },
            },
            {
              type: "text",
              text: "この写真に写っている本・CDをすべて検出してJSON配列で返してください。",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ items: [] });
    }

    const items = parseItems(textBlock.text);
    return Response.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return Response.json(
      { error: `Claude API エラー: ${message}` },
      { status: 502 }
    );
  }
}
