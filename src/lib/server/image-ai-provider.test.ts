import { beforeEach, describe, expect, it, vi } from "vitest";

const openAiMocks = vi.hoisted(() => ({
  edit: vi.fn(),
  toFile: vi.fn(async (data: Buffer, name: string, options: { type: string }) => ({ data, name, options })),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    images = { edit: openAiMocks.edit };
  },
  toFile: openAiMocks.toFile,
}));

import { generateImageEdit, getImageAiStatus } from "./image-ai-provider";

describe("image AI provider", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.IMAGE_AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_IMAGE_MODEL;
    delete process.env.GOOGLE_IMAGE_SIZE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
  });

  it("defaults to the Google image provider and reports missing config", () => {
    expect(getImageAiStatus()).toEqual({
      configured: false,
      provider: "google",
      model: "gemini-2.5-flash-image",
      missingEnvVar: "GEMINI_API_KEY",
    });
  });

  it("reports OpenAI config when the OpenAI provider is selected", () => {
    process.env.IMAGE_AI_PROVIDER = "openai";

    expect(getImageAiStatus()).toEqual({
      configured: false,
      provider: "openai",
      model: "gpt-image-2",
      missingEnvVar: "OPENAI_API_KEY",
    });
  });

  it("falls back to Google for unknown provider values", () => {
    process.env.IMAGE_AI_PROVIDER = "other-provider";
    process.env.GEMINI_API_KEY = "gemini-key";

    expect(getImageAiStatus()).toEqual({
      configured: true,
      provider: "google",
      model: "gemini-2.5-flash-image",
      missingEnvVar: undefined,
    });
  });

  it("extracts inline image bytes from a Google response", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: "image/png", data: "google-b64" } }],
              },
            },
          ],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateImageEdit({
      prompt: "Create a texture",
      images: [{ data: Buffer.from("source"), mimeType: "image/png", filename: "source.png" }],
      size: "1024x1024",
      outputFormat: "png",
    });

    expect(result).toEqual({
      b64Json: "google-b64",
      mimeType: "image/png",
      provider: "google",
      model: "gemini-2.5-flash-image",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(init.headers["x-goog-api-key"]).toBe("gemini-key");
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[0].inlineData.data).toBe(Buffer.from("source").toString("base64"));
    expect(body.generationConfig.imageConfig.aspectRatio).toBe("1:1");
    expect(body.generationConfig.responseFormat).toBeUndefined();
  });

  it("uses image config and a default 2K image size for Gemini 3 image models", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.GOOGLE_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: "image/png", data: "gemini-3-b64" } }],
              },
            },
          ],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateImageEdit({
      prompt: "Create a texture",
      images: [{ data: Buffer.from("source"), mimeType: "image/png", filename: "source.png" }],
      size: "1024x1536",
      outputFormat: "png",
    });

    expect(result.model).toBe("gemini-3.1-flash-image-preview");
    expect(result.b64Json).toBe("gemini-3-b64");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.imageConfig).toEqual({
      aspectRatio: "2:3",
      imageSize: "2K",
    });
    expect(body.generationConfig.responseFormat).toBeUndefined();
  });

  it("allows overriding Gemini 3 image size", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.GOOGLE_IMAGE_MODEL = "gemini-3-pro-image-preview";
    process.env.GOOGLE_IMAGE_SIZE = "4K";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "gemini-3-b64" } }] } }] }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateImageEdit({
      prompt: "Create a texture",
      images: [{ data: Buffer.from("source"), mimeType: "image/png", filename: "source.png" }],
      size: "1024x1024",
      outputFormat: "png",
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.imageConfig.imageSize).toBe("4K");
    expect(body.generationConfig.responseFormat).toBeUndefined();
  });

  it("throws a clear error when Google returns no image part", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "No image" }] } }] }), { status: 200 })));

    await expect(
      generateImageEdit({
        prompt: "Create a texture",
        images: [{ data: Buffer.from("source"), mimeType: "image/png", filename: "source.png" }],
      }),
    ).rejects.toThrow("returned no image data");
  });

  it("preserves the OpenAI image edit request shape", async () => {
    process.env.IMAGE_AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "openai-key";
    openAiMocks.edit.mockResolvedValue({ data: [{ b64_json: "openai-b64" }] });

    const result = await generateImageEdit({
      prompt: "Create a texture",
      images: [{ data: Buffer.from("source"), mimeType: "image/png", filename: "source.png" }],
      size: "1024x1536",
      quality: "high",
      outputFormat: "png",
    });

    expect(result).toEqual({
      b64Json: "openai-b64",
      mimeType: "image/png",
      provider: "openai",
      model: "gpt-image-2",
    });
    expect(openAiMocks.edit).toHaveBeenCalledWith({
      model: "gpt-image-2",
      image: { data: Buffer.from("source"), name: "source.png", options: { type: "image/png" } },
      prompt: "Create a texture",
      n: 1,
      size: "1024x1536",
      quality: "high",
      output_format: "png",
    });
  });
});
