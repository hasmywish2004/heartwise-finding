import { test, expect } from "vitest";
import { buildReportPdf } from "./report-pdf";
test("pdf", async () => {
  const f: any = { id:"1", upload_id:"u", label:"contested", headline:"LDLR rs123 — test", supports:"x", disputes:"y", evidence_age:"2020", population:"1% in South Asians", source_urls:["https://a.b"], rule_trace:"conflicting submissions=3 year=2022 sas checked", is_stale:true, previous_classification:"Benign", classification:"Pathogenic", checked_at:"2026-01-01", created_at:"2026-01-01" };
  const b = await buildReportPdf({ filename:"a.txt", created_at:"2026-01-01" } as any, [f, {...f, id:"2", label:"refused", is_stale:false}]);
  const buf = Buffer.from(await b.arrayBuffer()); (await import("fs")).writeFileSync("/tmp/p/r.pdf", buf);
  expect(buf.length).toBeGreaterThan(1000);
});
