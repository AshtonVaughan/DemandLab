import { describe, expect, it } from "vitest";
import { decryptWorkspace, encryptWorkspace } from "./storage";

const workspace = {
  version: 1,
  profile: { organization: "Evidence Co" },
  projects: [{ id: "project_1", concept: { name: "Observed product" } }],
  activeProjectId: "project_1",
};

describe("encrypted workspace storage", () => {
  it("round-trips real workspace data without exposing plaintext", async () => {
    const envelope = await encryptWorkspace(workspace, "correct horse battery staple");

    expect(envelope.encrypted).toBe(true);
    expect(envelope.algorithm).toBe("AES-GCM");
    expect(JSON.stringify(envelope)).not.toContain("Observed product");

    const restored = await decryptWorkspace(envelope, "correct horse battery staple");
    expect(restored.projects[0].concept.name).toBe("Observed product");
    expect(restored.activeProjectId).toBe("project_1");
  });

  it("rejects a wrong passphrase", async () => {
    const envelope = await encryptWorkspace(workspace, "correct horse battery staple");

    await expect(decryptWorkspace(envelope, "incorrect passphrase")).rejects.toThrow(
      "The passphrase is incorrect or the encrypted workspace is damaged.",
    );
  });

  it("requires a meaningful passphrase", async () => {
    await expect(encryptWorkspace(workspace, "short")).rejects.toThrow(
      "Use a passphrase of at least eight characters.",
    );
  });
});
