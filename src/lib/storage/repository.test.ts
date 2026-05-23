import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { createIndexedDbRepository, resetRepositoryConnectionForTests } from "@/lib/storage/repository";
import type { Project, TextureWorkflow } from "@/lib/types";

describe("IndexedDB texture atlas repository", () => {
  beforeEach(async () => {
    resetRepositoryConnectionForTests();
    await deleteDB("texture-atlas-ai");
  });

  it("creates, reads, updates, and deletes projects with workflows", async () => {
    const repo = createIndexedDbRepository();
    const project: Project = {
      id: "project-1",
      name: "Facade project",
      createdAt: "2026-05-23T00:00:00.000Z",
      updatedAt: "2026-05-23T00:00:00.000Z",
    };
    const workflow: TextureWorkflow = {
      id: "workflow-1",
      projectId: project.id,
      name: "Main elevation",
      exclusions: "",
      images: [],
      atlases: [],
      status: "draft",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    await repo.saveProject(project);
    await repo.saveWorkflow(workflow);

    expect(await repo.getProject(project.id)).toMatchObject({ name: "Facade project" });
    expect(await repo.listWorkflows(project.id)).toHaveLength(1);

    await repo.saveProject({ ...project, name: "Updated facade", updatedAt: "2026-05-23T01:00:00.000Z" });
    expect(await repo.getProject(project.id)).toMatchObject({ name: "Updated facade" });

    await repo.deleteProject(project.id);
    expect(await repo.getProject(project.id)).toBeUndefined();
    expect(await repo.listWorkflows(project.id)).toHaveLength(0);
  });
});
