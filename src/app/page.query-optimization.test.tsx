/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Providers } from "./providers";
import Home from "./page";

vi.mock("@/features/research/components/ResearchInterface", () => ({
  ResearchInterface: () => <div data-testid="research-interface" />,
}));

describe("Home page - Query Optimization entry", () => {
  it("ページにクエリ最適化UIの入力とボタンが表示される", () => {
    render(
      <Providers>
        <Home />
      </Providers>,
    );
    expect(screen.getByLabelText("クエリ")).toBeTruthy();
    expect(screen.getByRole("button", { name: "最適化" })).toBeTruthy();
  });
});
