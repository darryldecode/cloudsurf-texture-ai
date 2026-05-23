import type { GeneratedAtlas, PbrMap, Project, ReferenceImage, TextureWorkflow, WorkflowStatus } from "@/lib/types";
import { deleteR2Objects, getR2ImageUrl } from "./image-storage";
import { query } from "./db";

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type WorkflowRow = {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  exclusions: string;
  images: ReferenceImage[];
  atlases: GeneratedAtlas[];
  status: WorkflowStatus;
  status_message: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function iso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function listProjects(userId: string) {
  const result = await query<ProjectRow>(
    "select * from projects where user_id = $1 order by updated_at desc",
    [userId],
  );
  return result.rows.map(projectFromRow);
}

export async function getProject(userId: string, id: string) {
  const result = await query<ProjectRow>("select * from projects where user_id = $1 and id = $2", [userId, id]);
  return result.rows[0] ? projectFromRow(result.rows[0]) : undefined;
}

export async function saveProject(userId: string, project: Project) {
  await query(
    `insert into projects (id, user_id, name, description, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update set name = excluded.name, description = excluded.description, updated_at = excluded.updated_at
     where projects.user_id = excluded.user_id`,
    [project.id, userId, project.name, project.description ?? null, project.createdAt, project.updatedAt],
  );
}

export async function deleteProject(userId: string, id: string) {
  await query("delete from projects where user_id = $1 and id = $2", [userId, id]);
}

export async function touchProject(userId: string, id: string, updatedAt: string) {
  await query("update projects set updated_at = $3 where user_id = $1 and id = $2", [userId, id, updatedAt]);
}

async function signPbrMaps(maps?: PbrMap[]) {
  if (!maps) return undefined;
  return Promise.all(maps.map(async (map) => ({ ...map, url: map.storagePath ? await getR2ImageUrl(map.storagePath) : map.url })));
}

async function signAtlases(atlases: GeneratedAtlas[]) {
  return Promise.all(
    atlases.map(async (atlas) => ({
      ...atlas,
      url: atlas.storagePath ? await getR2ImageUrl(atlas.storagePath) : atlas.url,
      pbrMaps: await signPbrMaps(atlas.pbrMaps),
    })),
  );
}

async function workflowFromRow(row: WorkflowRow): Promise<TextureWorkflow> {
  const images = await Promise.all(
    (row.images ?? []).map(async (image) => ({
      ...image,
      dataUrl: image.storagePath ? await getR2ImageUrl(image.storagePath) : image.dataUrl,
    })),
  );

  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    name: row.name,
    exclusions: row.exclusions,
    images,
    atlases: await signAtlases(row.atlases ?? []),
    status: row.status,
    statusMessage: row.status_message ?? undefined,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function listWorkflows(userId: string, projectId: string) {
  const result = await query<WorkflowRow>(
    "select * from workflows where user_id = $1 and project_id = $2 order by updated_at desc",
    [userId, projectId],
  );
  return Promise.all(result.rows.map(workflowFromRow));
}

export async function getWorkflow(userId: string, id: string) {
  const result = await query<WorkflowRow>("select * from workflows where user_id = $1 and id = $2", [userId, id]);
  return result.rows[0] ? workflowFromRow(result.rows[0]) : undefined;
}

export async function saveWorkflow(userId: string, workflow: TextureWorkflow) {
  await query(
    `insert into workflows (id, user_id, project_id, name, exclusions, images, atlases, status, status_message, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11)
     on conflict (id) do update set
       project_id = excluded.project_id,
       name = excluded.name,
       exclusions = excluded.exclusions,
       images = excluded.images,
       atlases = excluded.atlases,
       status = excluded.status,
       status_message = excluded.status_message,
       updated_at = excluded.updated_at
     where workflows.user_id = excluded.user_id`,
    [
      workflow.id,
      userId,
      workflow.projectId,
      workflow.name,
      workflow.exclusions,
      JSON.stringify(workflow.images),
      JSON.stringify(workflow.atlases),
      workflow.status,
      workflow.statusMessage ?? null,
      workflow.createdAt,
      workflow.updatedAt,
    ],
  );
}

function workflowStorageKeys(row: WorkflowRow) {
  const atlasKeys = (row.atlases ?? []).flatMap((atlas) => [
    atlas.storagePath,
    ...(atlas.pbrMaps ?? []).map((map) => map.storagePath),
  ]);

  return [
    ...(row.images ?? []).map((image) => image.storagePath),
    ...atlasKeys,
  ].filter((key): key is string => Boolean(key));
}

export async function deleteWorkflow(userId: string, id: string) {
  const result = await query<WorkflowRow>("select * from workflows where user_id = $1 and id = $2", [userId, id]);
  const workflow = result.rows[0];
  if (!workflow) return false;

  await deleteR2Objects(workflowStorageKeys(workflow));
  await query("delete from workflows where user_id = $1 and id = $2", [userId, id]);
  await touchProject(userId, workflow.project_id, new Date().toISOString());
  return true;
}
