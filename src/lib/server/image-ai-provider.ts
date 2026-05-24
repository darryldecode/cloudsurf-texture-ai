import OpenAI, { toFile } from "openai";

export type ImageAiProviderName = "google" | "openai";
export type ImageOutputFormat = "png" | "jpeg" | "webp";
export type ImageGenerationQuality = "low" | "medium" | "high" | "auto";
export type GoogleImageSize = "0.5K" | "1K" | "2K" | "4K";

export type ImageSource = {
  data: Buffer | Uint8Array | ArrayBuffer | File;
  mimeType?: string;
  filename?: string;
};

export type ImageGenerationRequest = {
  prompt: string;
  images: ImageSource[];
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  aspectRatio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
  quality?: ImageGenerationQuality;
  outputFormat?: ImageOutputFormat;
};

export type ImageGenerationResult = {
  b64Json: string;
  mimeType: string;
  provider: ImageAiProviderName;
  model: string;
};

export type ImageAiStatus = {
  configured: boolean;
  provider: ImageAiProviderName;
  model: string;
  missingEnvVar?: string;
};

const DEFAULT_PROVIDER: ImageAiProviderName = "google";
const DEFAULT_GOOGLE_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_GOOGLE_GEMINI_3_IMAGE_SIZE: GoogleImageSize = "2K";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";

let openai: OpenAI | null = null;

function getConfiguredProvider(): ImageAiProviderName {
  const provider = process.env.IMAGE_AI_PROVIDER?.trim().toLowerCase();
  return provider === "openai" || provider === "google" ? provider : DEFAULT_PROVIDER;
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(imageAiConfigurationMessage(getImageAiStatus()));
  }

  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

export function getImageAiStatus(): ImageAiStatus {
  const provider = getConfiguredProvider();

  if (provider === "openai") {
    return {
      configured: Boolean(process.env.OPENAI_API_KEY),
      provider,
      model: process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL,
      missingEnvVar: process.env.OPENAI_API_KEY ? undefined : "OPENAI_API_KEY",
    };
  }

  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    provider,
    model: process.env.GOOGLE_IMAGE_MODEL || DEFAULT_GOOGLE_IMAGE_MODEL,
    missingEnvVar: process.env.GEMINI_API_KEY ? undefined : "GEMINI_API_KEY",
  };
}

export function imageAiConfigurationMessage(status = getImageAiStatus()) {
  return status.missingEnvVar
    ? `Image AI provider "${status.provider}" is not configured. Set ${status.missingEnvVar}.`
    : `Image AI provider "${status.provider}" is not configured.`;
}

export async function generateImageEdit(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const status = getImageAiStatus();

  if (!status.configured) {
    throw new Error(imageAiConfigurationMessage(status));
  }

  if (status.provider === "openai") {
    return generateOpenAIImageEdit(request, status.model);
  }

  return generateGoogleImageEdit(request, status.model);
}

async function generateOpenAIImageEdit(request: ImageGenerationRequest, model: string): Promise<ImageGenerationResult> {
  const images = await Promise.all(
    request.images.map(async (image, index) =>
      toFile(await imageSourceToBuffer(image), image.filename ?? `source-${index + 1}.png`, {
        type: image.mimeType ?? imageSourceMimeType(image),
      }),
    ),
  );
  const response = await getOpenAI().images.edit({
    model,
    image: images.length === 1 ? images[0] : images,
    prompt: request.prompt,
    n: 1,
    size: request.size ?? "1024x1024",
    quality: request.quality ?? "high",
    output_format: request.outputFormat ?? "png",
  });
  const b64 = response.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("Image AI provider returned no image data.");
  }

  return {
    b64Json: b64,
    mimeType: `image/${request.outputFormat ?? "png"}`,
    provider: "openai",
    model,
  };
}

async function generateGoogleImageEdit(request: ImageGenerationRequest, model: string): Promise<ImageGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(imageAiConfigurationMessage(getImageAiStatus()));
  }

  const imageParts = await Promise.all(
    request.images.map(async (image) => ({
      inlineData: {
        mimeType: image.mimeType ?? imageSourceMimeType(image),
        data: (await imageSourceToBuffer(image)).toString("base64"),
      },
    })),
  );
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [...imageParts, { text: request.prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        ...googleImageGenerationConfig(model, request),
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Image AI provider "google" request failed with ${response.status}${detail ? `: ${detail}` : "."}`);
  }

  const payload = (await response.json()) as GoogleGenerateContentResponse;
  const imagePart = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = (imagePart?.inlineData ?? imagePart?.inline_data) as
    | {
        mimeType?: string;
        mime_type?: string;
        data?: string;
      }
    | undefined;

  if (!inlineData?.data) {
    throw new Error("Image AI provider returned no image data.");
  }

  return {
    b64Json: inlineData.data,
    mimeType: inlineData.mimeType ?? inlineData.mime_type ?? "image/png",
    provider: "google",
    model,
  };
}

async function imageSourceToBuffer(source: ImageSource) {
  if (source.data instanceof File) {
    return Buffer.from(await source.data.arrayBuffer());
  }

  if (source.data instanceof ArrayBuffer) {
    return Buffer.from(source.data);
  }

  return Buffer.from(source.data);
}

function imageSourceMimeType(source: ImageSource) {
  if (source.data instanceof File && source.data.type) {
    return source.data.type;
  }

  return "image/png";
}

function aspectRatioFromSize(size: ImageGenerationRequest["size"]) {
  if (size === "1024x1536") return "2:3";
  if (size === "1536x1024") return "3:2";
  return "1:1";
}

function googleImageGenerationConfig(model: string, request: ImageGenerationRequest) {
  const aspectRatio = request.aspectRatio ?? aspectRatioFromSize(request.size);

  if (isGemini3ImageModel(model)) {
    return {
      imageConfig: {
        aspectRatio,
        imageSize: getGoogleImageSize(),
      },
    };
  }

  return {
    imageConfig: {
      aspectRatio,
    },
  };
}

function isGemini3ImageModel(model: string) {
  return model.startsWith("gemini-3") && model.includes("image");
}

function getGoogleImageSize(): GoogleImageSize {
  const value = process.env.GOOGLE_IMAGE_SIZE?.trim().toUpperCase();
  if (value === "0.5K" || value === "1K" || value === "2K" || value === "4K") {
    return value;
  }

  return DEFAULT_GOOGLE_GEMINI_3_IMAGE_SIZE;
}

type GoogleGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
        inline_data?: {
          mime_type?: string;
          data?: string;
        };
      }>;
    };
  }>;
};
