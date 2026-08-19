import { describe, expect, it } from "vitest";
import { isModerateOrSevere } from "./summaryJob";

describe("daily stress-summary filtering", () => {
  it("notifies only moderate and severe field conditions", () => {
    expect(isModerateOrSevere("optimal")).toBe(false);
    expect(isModerateOrSevere("mild")).toBe(false);
    expect(isModerateOrSevere("moderate")).toBe(true);
    expect(isModerateOrSevere("severe")).toBe(true);
  });
});
