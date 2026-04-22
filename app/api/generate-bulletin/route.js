// PATH: app/api/generate-bulletin/route.js
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

const NAVY = [12, 35, 64];
const BLUE = [24, 95, 165];
const LIGHTBLUE = [230, 241, 251];
const MIDGRAY = [241, 239, 232];
const GREEN = [234, 243, 222];
const DARKGREEN = [39, 80, 10];
const SUBTEXT = [95, 94, 90];
const TEXTGRAY = [68, 68, 65];
const WHITE = [255, 255, 255];
const AMBER = [250, 238, 218];
const AMBERTEXT = [133, 79, 11];

function hex(rgb) { return rgb; }

export async function POST(req) {
  try {
    const { bulletin, meta } = await req.json();
    const { themes = [], whatWeActed = [] } = bulletin;
    const { issueNumber, dateFrom, dateTo, reportCount, themeCount, closedActionCount } = meta;

    // Use jsPDF via dynamic import
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const H = 297;
    const ML = 14; // margin left
    const MR = 14; // margin right
    const CW = W - ML - MR; // content width

    const setColor = (rgb, type = "fill") => {
      if (type === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      else doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    };

    const setFont = (bold = false, size = 9) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
    };

    // ── HEADER ──────────────────────────────────────────────────────────────
    setColor(BLUE);
    doc.rect(0, 0, W, 28, "F");

    // White logo box
    setColor(WHITE);
    doc.roundedRect(ML, 8, 52, 12, 1.5, 1.5, "F");
    setColor(NAVY, "text");
    setFont(true, 11);
    doc.text("LS AIRMOTIVE", ML + 4, 16.5);

    // Divider
    setColor([255, 255, 255]);
    doc.setFillColor(255, 255, 255);
    doc.setGState && doc.setGState(doc.GState ? doc.GState({ opacity: 0.3 }) : {});
    doc.rect(70, 5, 0.4, 18, "F");

    // Title text
    setColor(WHITE, "text");
    setFont(true, 13);
    doc.text("Flight Safety Bulletin", 75, 13);
    setFont(false, 8);
    doc.setTextColor(181, 212, 244);
    doc.text(`Issue ${issueNumber}  ·  ${dateFrom} to ${dateTo}`, 75, 20);

    // Stats boxes
    const stats = [
      { val: String(reportCount), label: "REPORTS", amber: false },
      { val: String(themeCount), label: "THEMES", amber: false },
      { val: String(closedActionCount), label: "ACTIONS CLOSED", amber: true },
    ];
    let bx = W - MR;
    const bw = 28, bh = 16, bgap = 2;
    for (let i = stats.length - 1; i >= 0; i--) {
      bx -= bw;
      const by = 6;
      if (stats[i].amber) {
        doc.setFillColor(250, 238, 218);
      } else {
        doc.setFillColor(255, 255, 255, 0.15);
        doc.setFillColor(40, 80, 130);
      }
      doc.roundedRect(bx, by, bw, bh, 1.5, 1.5, "F");
      if (stats[i].amber) {
        doc.setTextColor(133, 79, 11);
      } else {
        doc.setTextColor(255, 255, 255);
      }
      setFont(true, 12);
      doc.text(stats[i].val, bx + bw / 2, by + 8, { align: "center" });
      setFont(false, 6.5);
      doc.text(stats[i].label, bx + bw / 2, by + 13, { align: "center" });
      bx -= bgap;
    }

    // ── CONTENT ──────────────────────────────────────────────────────────────
    let y = 34; // start below header
    const PAD = 3.5;
    const LINE_H = 5;

    function measureText(text, maxW, fontSize) {
      setFont(false, fontSize);
      const lines = doc.splitTextToSize(text, maxW - PAD * 2);
      return lines.length * (fontSize * 0.352778 * 1.4) + PAD * 2;
    }

    function colorBlock(x, blockW, yPos, bgRgb, labelText, bodyText, labelRgb, bodyRgb, bold = false) {
      const fontSize = 9;
      const labelSize = 7.5;
      setFont(false, fontSize);
      const bodyLines = doc.splitTextToSize(bodyText || "", blockW - PAD * 2);
      const labelLines = doc.splitTextToSize(labelText || "", blockW - PAD * 2);
      const bodyH = bodyLines.length * (fontSize * 0.352778 * 1.5);
      const labelH = labelLines.length * (labelSize * 0.352778 * 1.4);
      const blockH = PAD + labelH + 2 + bodyH + PAD;

      doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
      doc.roundedRect(x, yPos, blockW, blockH, 2, 2, "F");

      let ty = yPos + PAD + labelSize * 0.352778;
      doc.setTextColor(labelRgb[0], labelRgb[1], labelRgb[2]);
      setFont(true, labelSize);
      doc.text(labelText.toUpperCase(), x + PAD, ty);
      ty += labelH + 1.5;

      doc.setTextColor(bodyRgb[0], bodyRgb[1], bodyRgb[2]);
      setFont(false, fontSize);
      doc.text(bodyLines, x + PAD, ty);

      return blockH;
    }

    const GAP = 3;

    if (themes.length === 1) {
      const th = themes[0];
      let bh = colorBlock(ML, CW, y, NAVY, `Trend — ${th.category || ""}`, th.trendSummary || "", [126, 184, 232], WHITE);
      y += bh + GAP;
      bh = colorBlock(ML, CW, y, MIDGRAY, "Lesson Learned", th.lessonLearned || "", TEXTGRAY, SUBTEXT);
      y += bh + GAP;
      bh = colorBlock(ML, CW, y, GREEN, "Actions for Pilots", (th.actionsForPilots || "").replace(/^·/gm, "\u2022"), DARKGREEN, DARKGREEN);
      y += bh + GAP;
    } else {
      const hw = (CW - GAP) / 2;

      // Trend boxes side by side
      let maxH = 0;
      const trendHeights = themes.slice(0, 2).map((th, i) => {
        const bh = colorBlock(ML + i * (hw + GAP), hw, y, NAVY, `Trend — ${th.category || ""}`, th.trendSummary || "", [126, 184, 232], WHITE);
        if (bh > maxH) maxH = bh;
        return bh;
      });
      y += maxH + GAP;

      // Lesson learned side by side
      maxH = 0;
      themes.slice(0, 2).forEach((th, i) => {
        const label = themes.length > 1 ? `Lesson Learned — ${th.title || ""}` : "Lesson Learned";
        const bh = colorBlock(ML + i * (hw + GAP), hw, y, MIDGRAY, label, th.lessonLearned || "", TEXTGRAY, SUBTEXT);
        if (bh > maxH) maxH = bh;
      });
      y += maxH + GAP;

      // Combined pilot actions
      const combined = themes.slice(0, 2).map(th => (th.actionsForPilots || "").trim()).join("\n");
      let bh = colorBlock(ML, CW, y, GREEN, "Actions for Pilots", combined.replace(/^·/gm, "\u2022"), DARKGREEN, DARKGREEN);
      y += bh + GAP;

      // Third theme if exists
      if (themes.length > 2) {
        const th = themes[2];
        bh = colorBlock(ML, CW, y, LIGHTBLUE, `Further Trend — ${th.category || ""}`, th.trendSummary || "", BLUE, NAVY);
        y += bh + GAP;
        bh = colorBlock(ML, CW, y, MIDGRAY, "Lesson Learned", th.lessonLearned || "", TEXTGRAY, SUBTEXT);
        y += bh + GAP;
        bh = colorBlock(ML, CW, y, GREEN, "Additional Actions for Pilots", (th.actionsForPilots || "").replace(/^·/gm, "\u2022"), DARKGREEN, DARKGREEN);
        y += bh + GAP;
      }
    }

    // What we acted
    if (whatWeActed && whatWeActed.length > 0) {
      const actedText = whatWeActed.map(a => `\u2022 ${a.change || ""}`).join("\n");
      colorBlock(ML, CW, y, NAVY, "You Reported — We Acted", actedText, [126, 184, 232], WHITE);
    }

    // ── FOOTER ───────────────────────────────────────────────────────────────
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.rect(0, H - 8, W, 1, "F");
    doc.setTextColor(SUBTEXT[0], SUBTEXT[1], SUBTEXT[2]);
    setFont(false, 7.5);
    doc.text("LS Airmotive DTO.0258  \u00B7  Oxford Airport EGTK  \u00B7  lsa-sms.vercel.app", ML, H - 4);
    doc.text("Head of Training: T. Newell  FE.466104D", W - MR, H - 4, { align: "right" });

    const pdfBase64 = doc.output("datauristring").split(",")[1];
    return NextResponse.json({ ok: true, pdf: pdfBase64 });

  } catch (err) {
    console.error("generate-bulletin error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
