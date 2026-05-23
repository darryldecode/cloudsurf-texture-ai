import type { Project, TextureWorkflow } from "@/lib/types";
import type { TextureAtlasRepository } from "./repository";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data as T;
}

export function createApiRepository(): TextureAtlasRepository {
  return {
    async listProjects() {
      const data = await jsonRequest<{ projects: Project[] }>("/api/dashboard/projects");
      return data.projects;
    },

    async getProject(id) {
      const data = await jsonRequest<{ project?: Project }>(`/api/dashboard/projects/${id}`);
      return data.project;
    },

    async saveProject(project) {
      await jsonRequest("/api/dashboard/projects", { method: "POST", body: JSON.stringify({ project }) });
    },

    async deleteProject(id) {
      await jsonRequest(`/api/dashboard/projects/${id}`, { method: "DELETE" });
    },

    async listWorkflows(projectId) {
      const data = await jsonRequest<{ workflows: TextureWorkflow[] }>(`/api/dashboard/workflows?projectId=${encodeURIComponent(projectId)}`);
      return data.workflows;
    },

    async getWorkflow(id) {
      const data = await jsonRequest<{ workflow?: TextureWorkflow }>(`/api/dashboard/workflows/${id}`);
      return data.workflow;
    },

    async saveWorkflow(workflow) {
      await jsonRequest("/api/dashboard/workflows", { method: "POST", body: JSON.stringify({ workflow }) });
    },

    async deleteWorkflow(id) {
      await jsonRequest(`/api/dashboard/workflows/${id}`, { method: "DELETE" });
    },

    async uploadReferenceImage(workflowId, imageId, file) {
      const formData = new FormData();
      formData.set("workflowId", workflowId);
      formData.set("imageId", imageId);
      formData.set("file", file);
      return jsonRequest<{ storagePath: string; url: string }>("/api/dashboard/uploads/reference", { method: "POST", body: formData });
    },

    async uploadUtilityImage(kind, imageId, file) {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("imageId", imageId);
      formData.set("file", file);
      return jsonRequest<{ storagePath: string; url: string }>("/api/dashboard/uploads/utility", { method: "POST", body: formData });
    },

    async getImageUrl(storagePath, fallbackUrl = "") {
      const data = await jsonRequest<{ url: string }>(`/api/dashboard/uploads/url?key=${encodeURIComponent(storagePath)}&fallback=${encodeURIComponent(fallbackUrl)}`);
      return data.url;
    },
  };
}
