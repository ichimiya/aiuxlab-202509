import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks for AWS Bedrock runtime
const invokedInputs: { body?: string }[] = [];
const sendMock = vi.fn();
vi.mock("@aws-sdk/client-bedrock-runtime", () => {
  class BedrockRuntimeClient {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts?: unknown) {}
    send = sendMock;
  }
  class InvokeModelCommand {
    constructor(input: { body?: string }) {
      invokedInputs.push(input);
    }
  }
  return { BedrockRuntimeClient, InvokeModelCommand };
});

import { BaseBedrockClient } from "./baseClient";

describe("BaseBedrockClient", () => {
  beforeEach(() => {
    invokedInputs.length = 0;
    sendMock.mockReset();
  });

  it("invokePromptでテキストを取得できる", async () => {
    const client = new BaseBedrockClient({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    });
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: '{"ok":true}' }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    const text = await client.invokePrompt("hello");
    expect(text).toBe('{"ok":true}');

    const last = invokedInputs.at(-1)!;
    const sent = JSON.parse(last.body || "{}");
    expect(sent.anthropic_version).toBe("bedrock-2023-05-31");
    expect(sent.messages?.[0]?.content).toBe("hello");
  });

  it("空レスポンスはエラー", async () => {
    const client = new BaseBedrockClient();
    const body = new TextEncoder().encode(JSON.stringify({ content: [] }));
    sendMock.mockResolvedValueOnce({ body });

    await expect(client.invokePrompt("x")).rejects.toThrow(/Empty response/);
  });
});
