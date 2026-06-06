import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobProvider } from "../../context/JobContext";
import UploadForm from "./UploadForm";

describe("UploadForm", () => {
  it("renders dropzone", () => {
    render(
      <JobProvider>
        <UploadForm />
      </JobProvider>
    );
    expect(screen.getByText(/Drop PDFs here/)).toBeDefined();
  });
});
