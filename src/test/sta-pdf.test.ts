import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { fillStaPdf, sha256Hex, staTemplateSha256 } from "@/lib/staPdf";

describe("official STA PDF", () => {
  it("matches the pinned official template", async () => {
    const template = new Uint8Array(await readFile("public/forms/ncidose-software-transfer-agreement.pdf"));
    expect(await sha256Hex(template)).toBe(staTemplateSha256);
  });

  it("fills recipient fields while preserving four pages and blank signature fields", async () => {
    const template = new Uint8Array(await readFile("public/forms/ncidose-software-transfer-agreement.pdf"));
    const output = await fillStaPdf(template, {
      recipientInstitution: "Example University",
      nonprofit: "yes",
      commercialReplacement: "no",
      clinicalUse: "no",
      researchUse: "Non-clinical research use.",
      officialName: "Authorized Official",
      officialTitle: "Director",
      investigatorName: "Research Investigator",
      investigatorTitle: "Professor",
      mailingAddress: "123 Research Way",
      legalEmail: "researcher@example.edu",
      legalPhone: "+1 555 0100",
      tools: ["NCICT", "NCINM"],
    });
    const document = await PDFDocument.load(output);
    const form = document.getForm();

    expect(document.getPageCount()).toBe(4);
    expect(form.getTextField("Recipient Institution").getText()).toBe("Example University");
    expect(form.getRadioGroup("YesNo").getSelected()).toBe("Yes");
    expect(form.getCheckBox("NCI Dosimetry System for Computed Tomography").isChecked()).toBe(true);
    expect(form.getCheckBox("Computational human phantom series").isChecked()).toBe(false);
    expect(form.getTextField("NCI Reference#").getText()).toBeUndefined();
    expect(form.getTextField("Name_3").getText()).toBeUndefined();
    expect(form.getTextField("Date_1").getText()).toBeUndefined();
    expect(form.getTextField("Date_2").getText()).toBeUndefined();
    expect(form.getTextField("Date_3").getText()).toBeUndefined();
    expect(form.getTextField("Date_4").getText()).toBeUndefined();
  });
});
