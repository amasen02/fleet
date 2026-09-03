import React from "react";
import { render, screen } from "@testing-library/react";

import { renderWithSetup } from "test/test-utils";

import { generateAvailableTableHeaders } from "./HostTableConfig";

describe("HostTableConfig - Serial number column", () => {
  const headers = generateAvailableTableHeaders({
    isFreeTier: false,
    isOnlyObserver: false,
  });

  const serialColumn = headers.find((h) => h.id === "hardware_serial") as any;

  if (!serialColumn || typeof serialColumn.Cell !== "function") {
    throw new Error("hardware_serial column or Cell not found");
  }

  const Cell = serialColumn.Cell as React.ElementType;

  const renderCell = (
    serial: string,
    platform: string,
    mdm?: { enrollment_status: string }
  ) =>
    render(
      <Cell
        cell={{ value: serial }}
        row={{
          original: {
            platform,
            hardware_serial: serial,
            mdm,
          },
        }}
      />
    );

  it("shows the serial number for a macOS host", () => {
    renderCell("ABC123", "darwin", { enrollment_status: "On (automatic)" });
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.queryByText("Not supported")).not.toBeInTheDocument();
  });

  it("shows the serial number for a managed Android host", () => {
    renderCell("PIXEL10A", "android", { enrollment_status: "On (automatic)" });
    expect(screen.getByText("PIXEL10A")).toBeInTheDocument();
    expect(screen.queryByText("Not supported")).not.toBeInTheDocument();
  });

  it("shows the serial number for an Android host with no mdm data", () => {
    // Regression guard: the cell must not crash dereferencing a missing `mdm`.
    renderCell("PIXEL10A", "android", undefined);
    expect(screen.getByText("PIXEL10A")).toBeInTheDocument();
    expect(screen.queryByText("Not supported")).not.toBeInTheDocument();
  });

  it("shows the serial number for a managed (ADE) iPadOS host", () => {
    renderCell("IPAD123", "ipados", { enrollment_status: "On (automatic)" });
    expect(screen.getByText("IPAD123")).toBeInTheDocument();
    expect(screen.queryByText("Not supported")).not.toBeInTheDocument();
  });

  it("shows 'Not supported' for a personal (BYOD) Android host", () => {
    renderCell("", "android", { enrollment_status: "On (manual - personal)" });
    expect(screen.getByText("Not supported")).toBeInTheDocument();
  });

  it("shows 'Not supported' for a personal (BYOD) iOS host", () => {
    renderCell("", "ios", { enrollment_status: "On (manual - personal)" });
    expect(screen.getByText("Not supported")).toBeInTheDocument();
  });
});

describe("HostTableConfig - Last fetched column", () => {
  const headers = generateAvailableTableHeaders({
    isFreeTier: false,
    isOnlyObserver: false,
  });

  const lastFetchedColumn = headers.find(
    (h) => h.id === "detail_updated_at"
  ) as any;

  if (!lastFetchedColumn || typeof lastFetchedColumn.Cell !== "function") {
    throw new Error("detail_updated_at column or Cell not found");
  }

  const Cell = lastFetchedColumn.Cell as React.ElementType;

  const NEVER_FETCHED_TOOLTIP =
    "This host has not reported vitals yet, even if it has checked in.";

  const renderCell = (detailUpdatedAt: string) =>
    renderWithSetup(
      <Cell
        cell={{ value: detailUpdatedAt }}
        row={{ original: { platform: "darwin" } }}
      />
    );

  it("explains 'Never' for a host that has checked in but never reported vitals", async () => {
    // Hosts that never report vitals keep the server's "never" sentinel,
    // which predates Fleet's launch and so renders as "Never".
    const { user } = renderCell("2000-01-01T00:00:00Z");

    expect(screen.getByText("Never")).toBeInTheDocument();

    await user.hover(screen.getByText("Never"));

    expect(await screen.findByText(NEVER_FETCHED_TOOLTIP)).toBeInTheDocument();
  });

  it("shows the relative time with no vitals tooltip when the host has reported vitals", async () => {
    const { user } = renderCell("2024-04-27T12:00:00Z");

    expect(screen.queryByText("Never")).not.toBeInTheDocument();

    await user.hover(screen.getByText(/ago$/));

    expect(screen.queryByText(NEVER_FETCHED_TOOLTIP)).not.toBeInTheDocument();
  });

  it("shows 'Unavailable' with no vitals tooltip when there is no timestamp", async () => {
    const { user } = renderCell("");

    const cell = screen.getByText("Unavailable");
    expect(cell).toBeInTheDocument();

    await user.hover(cell);

    expect(screen.queryByText(NEVER_FETCHED_TOOLTIP)).not.toBeInTheDocument();
  });
});
