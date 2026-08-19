import { describe, expect, it } from "vitest";
import { requireOwned } from "./agri";

describe("field ownership protection", () => {
  it("does not expose a missing or unowned field as a valid resource", () => {
    expect(() => requireOwned(undefined)).toThrow("not found or is not available");
  });

  it("passes through a resource only after ownership lookup succeeds", () => {
    expect(requireOwned({ id: 7, name: "North field" })).toEqual({ id: 7, name: "North field" });
  });
});
