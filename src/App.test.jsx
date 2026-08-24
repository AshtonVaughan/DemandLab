import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("DemandLab application", () => {
  async function createProject(user, name = "User Product") {
    await user.click(screen.getByRole("button", { name: /Create project/i }));
    await user.type(screen.getByLabelText(/Product name/i), name);
    await user.type(screen.getByLabelText(/^Category/i), "Skincare");
    await user.type(screen.getByLabelText(/Sales region/i), "Australia");
    await user.type(screen.getByLabelText(/Retail price/i), "49");
    await user.click(screen.getByRole("button", { name: /Create project/i }));
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("starts empty without fabricated product data", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Start your first evidence profile/i })).toBeInTheDocument();
    expect(screen.queryByText(/Ceramide Recovery Serum/i)).not.toBeInTheDocument();
  });

  it("creates a project from required user inputs and exposes all core views", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Create project/i }));
    const save = screen.getByRole("button", { name: /Create project/i });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText(/Product name/i), "User Product");
    await user.type(screen.getByLabelText(/^Category/i), "Skincare");
    await user.type(screen.getByLabelText(/Sales region/i), "Australia");
    await user.type(screen.getByLabelText(/Retail price/i), "49");
    expect(save).toBeEnabled();
    await user.click(save);
    expect(screen.getByRole("heading", { name: "User Product" })).toBeInTheDocument();
    expect(screen.getByText(/No synthetic records/i)).toBeInTheDocument();

    for (const section of ["Projects", "Comparables", "Experiments", "Reports", "Data sources", "Settings"]) {
      const button = screen.getAllByRole("button", { name: new RegExp(`^${section}`, "i") })[0];
      await user.click(button);
      expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    }
  });

  it("persists a created project in local storage", async () => {
    const user = userEvent.setup();
    render(<App />);
    await createProject(user, "Persistent Product");
    const stored = JSON.parse(localStorage.getItem("demandlab.workspace.v1"));
    expect(stored.projects[0].concept.name).toBe("Persistent Product");
  });

  it("saves scenarios, experiments, report snapshots, source checks, and organization settings", async () => {
    const user = userEvent.setup();
    render(<App />);
    await createProject(user, "Workflow Product");

    await user.click(screen.getByRole("button", { name: /Save scenario/i }));
    expect(screen.getByText(/Scenario saved/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Experiments/i }));
    await user.click(screen.getByRole("button", { name: /New experiment/i }));
    expect(screen.getByRole("dialog", { name: /Create experiment/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Save experiment/i }));
    expect(screen.getByText(/Experiment saved/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Reports/i }));
    await user.click(screen.getByRole("button", { name: /Save snapshot/i }));
    expect(screen.getByText(/Report snapshot saved/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^Data sources/i })[0]);
    await user.click(screen.getByRole("button", { name: /Refresh checks/i }));
    expect(screen.getByText(/Source health recalculated/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^Settings/i })[0]);
    await user.clear(screen.getByLabelText("Organization"));
    await user.type(screen.getByLabelText("Organization"), "Evidence Org");
    await user.click(screen.getByRole("button", { name: /Save settings/i }));
    expect(screen.getByText("Evidence Org")).toBeInTheDocument();
  });
});
