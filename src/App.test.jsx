import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

  beforeEach(() => { localStorage.clear(); window.confirm = () => true; });
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

  it("lets a user cancel a new project without leaving a draft behind", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Create project/i }));
    await user.type(screen.getByLabelText(/Product name/i), "Unsaved QA Draft");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(screen.queryByText("Unsaved QA Draft")).not.toBeInTheDocument();
  });

  it("uploads and removes an image, rejects an invalid CSV, and previews a valid CSV", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("button", { name: /Create project/i }));

    const [imageInput, csvInput] = container.querySelectorAll('input[type="file"]');
    await user.upload(imageInput, new File(["<svg></svg>"], "qa-image.svg", { type: "image/svg+xml" }));
    expect(await screen.findByRole("button", { name: "Replace image" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Choose image" })).toBeInTheDocument();

    await user.upload(csvInput, new File(["name,product_name\nDuplicate,Header"], "invalid.csv", { type: "text/csv" }));
    expect(await screen.findByText(/same field name/i)).toBeInTheDocument();

    const validCsv = "product_name,brand,category,price,rating,reviews,monthly_sales,observed_at\nQA Input Serum,QA Brand,Skincare,42,4.6,310,185,2026-08-20";
    await user.upload(csvInput, new File([validCsv], "qa-input.csv", { type: "text/csv" }));
    expect(await screen.findByText("QA Input Serum")).toBeInTheDocument();
    expect(screen.getByText(/1 records/)).toBeInTheDocument();
  });

  it("validates Stripe links and renders configured checkout actions as real links", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /^Settings/i })[0]);

    await user.click(screen.getByText("Pro").closest("button"));
    expect(screen.getByText(/Add a Stripe Payment Link/i)).toBeInTheDocument();

    const paymentLink = screen.getByLabelText(/Stripe Payment Link/i);
    await user.type(paymentLink, "https://example.com/not-stripe");
    await user.click(screen.getByRole("button", { name: /Save settings/i }));
    expect(screen.getByText(/Use a valid https:\/\/buy\.stripe\.com/i)).toBeInTheDocument();

    await user.clear(paymentLink);
    await user.type(paymentLink, "https://buy.stripe.com/test_qa_demandlab");
    const checkoutLinks = screen.getAllByRole("link", { name: /Open checkout/i });
    expect(checkoutLinks).toHaveLength(3);
    checkoutLinks.forEach((link) => expect(link).toHaveAttribute("href", "https://buy.stripe.com/test_qa_demandlab"));
  });

  it("asks before replacing a populated workspace from a backup", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await createProject(user, "Keep This Project");
    await user.click(screen.getAllByRole("button", { name: /^Settings/i })[0]);
    const restoreInput = container.querySelector('input[accept="application/json,.json"]');
    const emptyBackup = JSON.stringify({
      version: 1,
      profile: { name: "Restored", email: "", organization: "Restored Workspace", role: "Founder", currency: "AUD", plan: "Free", stripePaymentLink: "", privateDataTrainingConsent: false },
      projects: [],
      activeProjectId: null,
    });

    window.confirm = () => false;
    await user.upload(restoreInput, new File([emptyBackup], "dismissed-backup.json", { type: "application/json" }));
    await user.click(screen.getAllByRole("button", { name: /^Projects/i })[0]);
    expect(screen.getAllByText("Keep This Project").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /^Settings/i })[0]);
    window.confirm = () => true;
    const currentRestoreInput = container.querySelector('input[accept="application/json,.json"]');
    await user.upload(currentRestoreInput, new File([emptyBackup], "accepted-backup.json", { type: "application/json" }));
    await user.click(screen.getAllByRole("button", { name: /^Projects/i })[0]);
    expect(screen.getByRole("heading", { name: "No projects yet" })).toBeInTheDocument();
  });

  it("encrypts the workspace and requires its session-only passphrase after reload", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);
    await user.click(screen.getAllByRole("button", { name: /^Settings/i })[0]);
    await user.type(screen.getByLabelText(/^Passphrase$/i), "secure evidence passphrase");
    await user.type(screen.getByLabelText(/Confirm passphrase/i), "secure evidence passphrase");
    await user.click(screen.getByRole("button", { name: /Enable encryption/i }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("demandlab.workspace.v1"));
      expect(stored.encrypted).toBe(true);
      expect(JSON.stringify(stored)).not.toContain("DemandLab workspace");
    });

    firstRender.unmount();
    render(<App />);
    expect(screen.getByRole("heading", { name: /Unlock your workspace/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Passphrase$/i), "secure evidence passphrase");
    await user.click(screen.getByRole("button", { name: /Unlock workspace/i }));
    expect(await screen.findByRole("heading", { name: /Start your first evidence profile/i })).toBeInTheDocument();
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
