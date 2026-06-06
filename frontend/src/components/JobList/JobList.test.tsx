import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobProvider } from "../../context/JobContext";
import JobList from "./JobList";

describe("JobList", () => {
  it("shows empty state when no jobs", () => {
    render(
      <JobProvider>
        <JobList />
      </JobProvider>
    );
    expect(screen.getByText("No documents yet")).toBeDefined();
  });
});
