import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export interface BaseBedrockConfig {
  region?: string;
  modelId?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
  maxTokens?: number;
  temperature?: number;
}

export class BaseBedrockClient {
  protected readonly client: BedrockRuntimeClient;
  protected readonly modelId: string;
  protected readonly maxTokens: number;
  protected readonly temperature: number;

  constructor(config: BaseBedrockConfig = {}) {
    this.client = new BedrockRuntimeClient({
      region: config.region || process.env.AWS_REGION || "us-east-1",
      credentials: config.credentials || {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    this.modelId =
      config.modelId ||
      process.env.BEDROCK_MODEL_ID ||
      "anthropic.claude-3-haiku-20240307-v1:0";
    this.maxTokens = config.maxTokens ?? 1200;
    this.temperature = config.temperature ?? 0.3;
  }

  async invokePrompt(prompt: string): Promise<string> {
    const command = new InvokeModelCommand({
      modelId: this.modelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const response = await this.client.send(command);
    const raw = JSON.parse(new TextDecoder().decode(response.body)) as {
      content?: Array<{ text?: string }>;
    };
    const text = raw?.content?.[0]?.text;
    if (!text) throw new Error("Empty response");
    return text;
  }
}
