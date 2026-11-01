import { describe, expect, it } from "vitest";
import { extractApoe, extractPct, parseChecks, plainClassification, sourceLabel } from "./genome";

const trace =
  "review=criteria provided, multiple submitters, no conflicts; submissions=3; year=2025; age=1y; variant_copies=1; gnomAD v4 sas checked";

describe("evidence checks", () => {
  it("passes all four for a good trace", () => {
    expect(parseChecks(trace)!.map((c) => c.pass)).toEqual([true, true, true, true]);
    expect(parseChecks(trace)![2]!.name).toBe("3 lab reports");
  });
  it("fails labs agree when conflicting", () => {
    expect(parseChecks("review=conflicting; submissions=1; year=2015; age=10y")!.map((c) => c.pass)).toEqual([false, false, false, false]);
  });
  it("hides checks for refused or missing", () => {
    expect(parseChecks(trace, "refused")).toBeNull();
    expect(parseChecks(null)).toBeNull();
  });
});

describe("extractors", () => {
  it("reads APOE type", () => expect(extractApoe(["Your APOE type is e3/e4."])).toBe("e3/e4"));
  it("rounds first percentage", () => expect(extractPct("About 12.6% of South Asians, 3% elsewhere")).toBe(13));
  it("translates classification", () => {
    expect(plainClassification("Likely pathogenic")).toBe("it probably causes disease");
    expect(plainClassification("Pathogenic")).toBe("it causes disease");
    expect(plainClassification("Uncertain significance")).toBe("nobody knows yet");
  });
  it("labels sources", () => {
    expect(sourceLabel("https://www.ncbi.nlm.nih.gov/clinvar/x")).toBe("ClinVar — what labs say");
    expect(sourceLabel("https://gnomad.broadinstitute.org/x")).toBe("gnomAD — who has it");
    expect(sourceLabel("https://pubmed.org")).toBe("The study");
  });
});
