import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project, TextureWorkflow } from "@/lib/types";

const DB_NAME = "texture-atlas-ai";
const DB_VERSION = 1;

type ProjectRecord = Project;
type WorkflowRecord = TextureWorkflow;

interface TextureAtlasDb extends DBSchema {
  projects: {
    key: string;
    value: ProjectRecord;
    indexes: { "by-updated": string };
  };
  workflows: {
    key: string;
    value: WorkflowRecord;
    indexes: { "by-project": string; "by-updated": string };
  };
}

export interface TextureAtlasRepository {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  listWorkflows(projectId: string): Promise<TextureWorkflow[]>;
  getWorkflow(id: string): Promise<TextureWorkflow | undefined>;
  saveWorkflow(workflow: TextureWorkflow): Promise<void>;
  deleteWorkflow(id: string): Promise<void>;
  uploadReferenceImage(workflowId: string, imageId: string, file: File): Promise<{ storagePath: string; url: string }>;
  uploadUtilityImage(kind: "pbr" | "emissive", imageId: string, file: File): Promise<{ storagePath: string; url: string }>;
  getImageUrl(storagePath: string, fallbackUrl?: string): Promise<string>;
}

let dbPromise: Promise<IDBPDatabase<TextureAtlasDb>> | null = null;

function getDb() {
  dbPromise ??= openDB<TextureAtlasDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const projects = db.createObjectStore("projects", { keyPath: "id" });
      projects.createIndex("by-updated", "updatedAt");

      const workflows = db.createObjectStore("workflows", { keyPath: "id" });
      workflows.createIndex("by-project", "projectId");
      workflows.createIndex("by-updated", "updatedAt");
    },
  });

  return dbPromise;
}

export function resetRepositoryConnectionForTests() {
  dbPromise = null;
}

function newestFirst<T extends { updatedAt: string }>(items: T[]) {
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createIndexedDbRepository(): TextureAtlasRepository {
  return {
    async listProjects() {
      const db = await getDb();
      return newestFirst(await db.getAll("projects"));
    },

    async getProject(id) {
      const db = await getDb();
      return db.get("projects", id);
    },

    async saveProject(project) {
      const db = await getDb();
      await db.put("projects", project);
    },

    async deleteProject(id) {
      const db = await getDb();
      const tx = db.transaction(["projects", "workflows"], "readwrite");
      const workflows = await tx.objectStore("workflows").index("by-project").getAll(id);

      await Promise.all([
        tx.objectStore("projects").delete(id),
        ...workflows.map((workflow) => tx.objectStore("workflows").delete(workflow.id)),
      ]);
      await tx.done;
    },

    async listWorkflows(projectId) {
      const db = await getDb();
      const workflows = await db.getAllFromIndex("workflows", "by-project", projectId);
      return newestFirst(workflows);
    },

    async getWorkflow(id) {
      const db = await getDb();
      return db.get("workflows", id);
    },

    async saveWorkflow(workflow) {
      const db = await getDb();
      await db.put("workflows", workflow);
    },

    async deleteWorkflow(id) {
      const db = await getDb();
      await db.delete("workflows", id);
    },

    async uploadReferenceImage(_workflowId, _imageId, file) {
      return { storagePath: "", url: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(String(reader.result)));
        reader.addEventListener("error", () => reject(new Error(`Could not read ${file.name}.`)));
        reader.readAsDataURL(file);
      }) };
    },

    async uploadUtilityImage(_kind, _imageId, file) {
      return this.uploadReferenceImage("utility", "source", file);
    },

    async getImageUrl(_storagePath, fallbackUrl = "") {
      return fallbackUrl;
    },
  };
}
