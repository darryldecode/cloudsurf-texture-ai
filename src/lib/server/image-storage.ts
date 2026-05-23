import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

let r2Client: S3Client | null = null;

function getBucket() {
  if (!process.env.R2_BUCKET) {
    throw new Error("R2_BUCKET is required for texture asset storage.");
  }

  return process.env.R2_BUCKET;
}

function getEndpoint() {
  if (process.env.R2_ENDPOINT) {
    return process.env.R2_ENDPOINT;
  }

  if (!process.env.R2_ACCOUNT_ID) {
    throw new Error("R2_ACCOUNT_ID or R2_ENDPOINT is required for Cloudflare R2 storage.");
  }

  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

function getCredentials() {
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required for Cloudflare R2 storage.");
  }

  return {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  };
}

function getR2Client() {
  r2Client ??= new S3Client({
    region: "auto",
    endpoint: getEndpoint(),
    credentials: getCredentials(),
  });

  return r2Client;
}

export async function readR2ImageFile(key: string) {
  const response = await getR2Client().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));

  if (!response.Body) {
    throw new Error("R2 object returned no body.");
  }

  return Buffer.from(await response.Body.transformToByteArray());
}

export async function saveR2ImageFile({
  userId,
  pathSegments,
  filename,
  buffer,
}: {
  userId: string;
  pathSegments: string[];
  filename: string;
  buffer: Buffer;
}) {
  const key = [safePathSegment(userId), ...pathSegments.map(safePathSegment), filename].join("/");
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    }),
  );

  return { storagePath: key, url: await getR2ImageUrl(key) };
}

export async function uploadR2File({
  userId,
  pathSegments,
  filename,
  file,
}: {
  userId: string;
  pathSegments: string[];
  filename: string;
  file: File;
}) {
  const key = [safePathSegment(userId), ...pathSegments.map(safePathSegment), filename].join("/");
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return { storagePath: key, url: await getR2ImageUrl(key) };
}

export async function getR2ImageUrl(key: string) {
  return getSignedUrl(getR2Client(), new GetObjectCommand({ Bucket: getBucket(), Key: key }), { expiresIn: 60 * 60 * 24 * 7 });
}

export async function deleteR2Objects(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)));
  if (!uniqueKeys.length) return;

  const client = getR2Client();
  const bucket = getBucket();

  for (let index = 0; index < uniqueKeys.length; index += 1000) {
    const chunk = uniqueKeys.slice(index, index + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}
