import type { QueryResultRow } from "@neondatabase/serverless";
import {
  getDefaultImageAiSelection,
  getImageAiStatus,
  getImageModelOptions,
  isImageModelAllowed,
  type ImageAiProviderName,
  type ImageAiSelection,
} from "@/lib/server/image-ai-provider";
import { query } from "./db";

type UserSettingsRow = QueryResultRow & {
  user_id: string;
  image_ai_provider: ImageAiProviderName;
  image_model: string;
  created_at: string | Date;
  updated_at: string | Date;
};

export type UserSettings = {
  userId: string;
  imageAi: ImageAiSelection;
  createdAt: string;
  updatedAt: string;
};

function iso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

function settingsFromRow(row: UserSettingsRow): UserSettings {
  return {
    userId: row.user_id,
    imageAi: {
      provider: row.image_ai_provider,
      model: row.image_model,
    },
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function normalizeProvider(value: unknown): ImageAiProviderName | undefined {
  return value === "google" || value === "openai" ? value : undefined;
}

export function parseImageAiSelection(input: unknown): ImageAiSelection {
  const value = input as { provider?: unknown; model?: unknown };
  const provider = normalizeProvider(value?.provider);
  const model = typeof value?.model === "string" ? value.model.trim() : "";

  if (!provider || !model) {
    throw new Error("Choose a valid image generation model.");
  }

  const selection = { provider, model };
  if (!isImageModelAllowed(selection)) {
    throw new Error("That image generation model is not available.");
  }

  return selection;
}

export async function ensureUserSettings(userId: string) {
  const fallback = getDefaultImageAiSelection();
  await query(
    `insert into user_settings (user_id, image_ai_provider, image_model, created_at, updated_at)
     values ($1, $2, $3, now(), now())
     on conflict (user_id) do nothing`,
    [userId, fallback.provider, fallback.model],
  );

  const result = await query<UserSettingsRow>("select * from user_settings where user_id = $1", [userId]);
  return settingsFromRow(result.rows[result.rows.length - 1]);
}

export async function updateUserImageAiSelection(userId: string, selection: ImageAiSelection) {
  if (!isImageModelAllowed(selection)) {
    throw new Error("That image generation model is not available.");
  }

  const result = await query<UserSettingsRow>(
    `insert into user_settings (user_id, image_ai_provider, image_model, created_at, updated_at)
     values ($1, $2, $3, now(), now())
     on conflict (user_id) do update set
       image_ai_provider = excluded.image_ai_provider,
       image_model = excluded.image_model,
       updated_at = now()
     returning *`,
    [userId, selection.provider, selection.model],
  );

  return settingsFromRow(result.rows[0]);
}

export async function getUserImageAiStatus(userId: string) {
  const settings = await ensureUserSettings(userId);
  return getImageAiStatus(settings.imageAi);
}

export async function getUserGenerationSettings(userId: string) {
  const settings = await ensureUserSettings(userId);

  return {
    imageAi: settings.imageAi,
    imageModelOptions: getImageModelOptions(),
    imageAiStatus: getImageAiStatus(settings.imageAi),
  };
}
