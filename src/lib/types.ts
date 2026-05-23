export type AtlasKind = "materials" | "facade";
export type PbrMapKind = "normal" | "roughness" | "metallic";

export type Project = {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReferenceImage = {
  id: string;
  workflowId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  storagePath?: string;
  createdAt: string;
};

export type PbrMap = {
  kind: PbrMapKind;
  title: string;
  width: number;
  height: number;
  url: string;
  storagePath?: string;
  model: string;
  generatedAt: string;
};

export type GeneratedAtlas = {
  kind: AtlasKind;
  title: string;
  width: number;
  height: number;
  url: string;
  storagePath?: string;
  dataUrl?: string;
  model: string;
  generatedAt: string;
  pbrMaps?: PbrMap[];
};

export type WorkflowStatus = "draft" | "ready" | "generating" | "complete" | "error";

export type TextureWorkflow = {
  id: string;
  userId?: string;
  projectId: string;
  name: string;
  exclusions: string;
  images: ReferenceImage[];
  atlases: GeneratedAtlas[];
  status: WorkflowStatus;
  statusMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppRouteState =
  | { view: "projects" }
  | { view: "account" }
  | { view: "utilities" }
  | { view: "project"; projectId: string }
  | { view: "workflow"; projectId: string; workflowId: string };
