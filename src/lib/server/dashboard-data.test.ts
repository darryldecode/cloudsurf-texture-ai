import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  query: vi.fn(),
}));

vi.mock("./image-storage", () => ({
  deleteR2Objects: vi.fn(),
  getR2ImageUrl: vi.fn(async (key: string) => `signed:${key}`),
}));

import { deleteWorkflow } from "./dashboard-data";
import { query } from "./db";
import { deleteR2Objects } from "./image-storage";

describe("dashboard data workflow deletion", () => {
  const queryMock = vi.mocked(query);
  const deleteR2ObjectsMock = vi.mocked(deleteR2Objects);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes related R2 objects before deleting the workflow row", async () => {
    queryMock.mockImplementation(async (text) => {
      const sql = String(text);

      if (sql.startsWith("select * from workflows")) {
        return {
          rows: [
            {
              id: "workflow-1",
              user_id: "user-1",
              project_id: "project-1",
              name: "Facade",
              exclusions: "",
              images: [
                {
                  id: "image-1",
                  workflowId: "workflow-1",
                  name: "reference.png",
                  type: "image/png",
                  size: 100,
                  dataUrl: "",
                  storagePath: "user-1/workflows/workflow-1/references/image-1.png",
                  createdAt: "2026-05-23T00:00:00.000Z",
                },
              ],
              atlases: [
                {
                  kind: "materials",
                  title: "Materials",
                  width: 1024,
                  height: 2048,
                  url: "",
                  storagePath: "user-1/workflows/workflow-1/atlases/materials.png",
                  model: "gpt-image-1.5",
                  generatedAt: "2026-05-23T00:00:00.000Z",
                  pbrMaps: [
                    {
                      kind: "normal",
                      title: "Normal",
                      width: 1024,
                      height: 2048,
                      url: "",
                      storagePath: "user-1/workflows/workflow-1/pbr/normal.png",
                      model: "gpt-image-1.5",
                      generatedAt: "2026-05-23T00:00:00.000Z",
                    },
                  ],
                },
              ],
              status: "complete",
              status_message: null,
              created_at: "2026-05-23T00:00:00.000Z",
              updated_at: "2026-05-23T00:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const deleted = await deleteWorkflow("user-1", "workflow-1");

    expect(deleted).toBe(true);
    expect(deleteR2ObjectsMock).toHaveBeenCalledWith([
      "user-1/workflows/workflow-1/references/image-1.png",
      "user-1/workflows/workflow-1/atlases/materials.png",
      "user-1/workflows/workflow-1/pbr/normal.png",
    ]);
    expect(queryMock).toHaveBeenCalledWith("delete from workflows where user_id = $1 and id = $2", ["user-1", "workflow-1"]);
    expect(queryMock).toHaveBeenCalledWith("update projects set updated_at = $3 where user_id = $1 and id = $2", [
      "user-1",
      "project-1",
      expect.any(String),
    ]);
  });

  it("returns false and skips R2 deletion when workflow is missing", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const deleted = await deleteWorkflow("user-1", "missing-workflow");

    expect(deleted).toBe(false);
    expect(deleteR2ObjectsMock).not.toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
