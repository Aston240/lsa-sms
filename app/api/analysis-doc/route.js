import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
         HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
         LevelFormat } from "docx";

export async function POST(req) {
  try {
    const { analysis, generatedAt } = await req.json();
    const date = new Date(generatedAt).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
    const time = new Date(generatedAt).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

    const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cellMargins = { top: 100, bottom: 100, left: 150, right: 150 };

    const urgencyColor = u => u === "HIGH" ? "EF4444" : u === "MEDIUM" ? "F59E0B" : "22C55E";

    const h1 = (text) => new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: "1E3A5F" })],
      spacing: { before: 320, after: 160 },
    });

    const h2 = (text) => new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: "2563EB" })],
      spacing: { before: 240, after: 120 },
    });

    const body = (text) => new Paragraph({
      children: [new TextRun({ text: text || "", font: "Arial", size: 22, color: "374151" })],
      spacing: { before: 60, after: 60 },
      line: 360,
    });

    const bullet = (text) => new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      children: [new TextRun({ text: text || "", font: "Arial", size: 22, color: "374151" })],
      spacing: { before: 40, after: 40 },
    });

    const rule = () => new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB", space: 1 } },
      spacing: { before: 120, after: 120 },
      children: [],
    });

    const metricTable = () => {
      const m = analysis.keyMetrics || {};
      const rows = [
        ["Total Reports", String(m.totalReports ?? "—")],
        ["Pending Review", String(m.pendingReview ?? "—")],
        ["High / Intolerable Risks", String(m.openHighRisks ?? "—")],
        ["Overdue Actions", String(m.overdueActions ?? "—")],
        ["Closed Risks", String(m.closedRisks ?? "—")],
      ];
      return new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [5500, 3526],
        rows: rows.map(([label, val]) => new TableRow({
          children: [
            new TableCell({
              borders, width: { size: 5500, type: WidthType.DXA },
              margins: cellMargins,
              shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 22, color: "374151" })] })],
            }),
            new TableCell({
              borders, width: { size: 3526, type: WidthType.DXA },
              margins: cellMargins,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: val, font: "Arial", size: 24, bold: true, color: "1E3A5F" })] })],
            }),
          ],
        })),
      });
    };

    const riskTable = () => {
      if (!analysis.topRisks?.length) return body("No high-priority risks identified.");
      const headerRow = new TableRow({
        children: ["Hazard ID", "Title", "Urgency", "Concern"].map((h, i) => new TableCell({
          borders, width: { size: [900, 2500, 900, 4726][i], type: WidthType.DXA },
          margins: cellMargins,
          shading: { fill: "1E3A5F", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: h, font: "Arial", size: 20, bold: true, color: "FFFFFF" })] })],
        })),
      });
      const dataRows = analysis.topRisks.map(r => new TableRow({
        children: [
          new TableCell({ borders, width:{size:900,type:WidthType.DXA}, margins:cellMargins, children:[new Paragraph({children:[new TextRun({text:r.id||"",font:"Arial",size:20,bold:true,color:"2563EB"})]})] }),
          new TableCell({ borders, width:{size:2500,type:WidthType.DXA}, margins:cellMargins, children:[new Paragraph({children:[new TextRun({text:r.title||"",font:"Arial",size:20,color:"374151"})]})] }),
          new TableCell({ borders, width:{size:900,type:WidthType.DXA}, margins:cellMargins, shading:{fill:urgencyColor(r.urgency),type:ShadingType.CLEAR}, children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.urgency||"",font:"Arial",size:20,bold:true,color:"FFFFFF"})]})] }),
          new TableCell({ borders, width:{size:4726,type:WidthType.DXA}, margins:cellMargins, children:[new Paragraph({children:[new TextRun({text:r.concern||"",font:"Arial",size:20,color:"374151"})]})] }),
        ],
      }));
      return new Table({ width:{size:9026,type:WidthType.DXA}, columnWidths:[900,2500,900,4726], rows:[headerRow,...dataRows] });
    };

    const overdueTable = () => {
      if (!analysis.overdueItems?.length) return body("No overdue actions.");
      const headerRow = new TableRow({
        children: ["Action ID", "Description", "Owner", "Days Overdue"].map((h, i) => new TableCell({
          borders, width:{size:[900,4500,2000,1626][i],type:WidthType.DXA}, margins:cellMargins,
          shading:{fill:"7F1D1D",type:ShadingType.CLEAR},
          children:[new Paragraph({children:[new TextRun({text:h,font:"Arial",size:20,bold:true,color:"FFFFFF"})]})]
        })),
      });
      const dataRows = analysis.overdueItems.map(a => new TableRow({
        children: [
          new TableCell({borders,width:{size:900,type:WidthType.DXA},margins:cellMargins,children:[new Paragraph({children:[new TextRun({text:a.id||"",font:"Arial",size:20,bold:true,color:"2563EB"})]})] }),
          new TableCell({borders,width:{size:4500,type:WidthType.DXA},margins:cellMargins,children:[new Paragraph({children:[new TextRun({text:a.description||"",font:"Arial",size:20,color:"374151"})]})] }),
          new TableCell({borders,width:{size:2000,type:WidthType.DXA},margins:cellMargins,children:[new Paragraph({children:[new TextRun({text:a.owner||"",font:"Arial",size:20,color:"374151"})]})] }),
          new TableCell({borders,width:{size:1626,type:WidthType.DXA},margins:cellMargins,shading:{fill:"FEE2E2",type:ShadingType.CLEAR},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:String(a.daysOverdue||""),font:"Arial",size:20,bold:true,color:"991B1B"})]})] }),
        ],
      }));
      return new Table({width:{size:9026,type:WidthType.DXA},columnWidths:[900,4500,2000,1626],rows:[headerRow,...dataRows]});
    };

    const children = [
      // Title page
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 240 },
        children: [new TextRun({ text: "LS AIRMOTIVE", font: "Arial", size: 48, bold: true, color: "1E3A5F" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: "Safety Management System", font: "Arial", size: 32, color: "6B7280" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "Safety Review Board Briefing", font: "Arial", size: 36, bold: true, color: "2563EB" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 1440 },
        children: [new TextRun({ text: `${date} · Generated at ${time}`, font: "Arial", size: 22, color: "9CA3AF" })],
      }),
      rule(),

      // Executive Summary
      h1("1. Executive Summary"),
      body(analysis.executiveSummary),
      rule(),

      // Key Metrics
      h1("2. Key Metrics"),
      metricTable(),
      new Paragraph({ children: [], spacing: { before: 160 } }),
      rule(),

      // Trend Analysis
      h1("3. Trend Analysis"),
      body(analysis.trendAnalysis),
      rule(),

      // Top Risks
      h1("4. Risks Requiring Board Attention"),
      riskTable(),
      new Paragraph({ children: [], spacing: { before: 160 } }),
      rule(),

      // Overdue Actions
      h1("5. Overdue Actions"),
      overdueTable(),
      new Paragraph({ children: [], spacing: { before: 160 } }),
      rule(),

      // Discussion Points
      h1("6. Board Discussion Points"),
      ...(analysis.discussionPoints || []).flatMap((d, i) => [
        h2(`${i + 1}. ${d.title}`),
        body(d.detail),
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: "Recommendation: ", font: "Arial", size: 22, bold: true, color: "15803D" }),
                     new TextRun({ text: d.recommendation || "", font: "Arial", size: 22, color: "15803D" })],
        }),
      ]),
      rule(),

      // Positives
      h1("7. Positive Indicators"),
      ...(analysis.positives || []).map(p => bullet(p)),
      new Paragraph({ children: [], spacing: { before: 120 } }),
      rule(),

      // Conclusion
      h1("8. Conclusion & Priority Actions"),
      body(analysis.conclusion),
      rule(),

      // Footer note
      new Paragraph({
        spacing: { before: 480 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `This report was generated by LS Airmotive SMS · ${date}`, font: "Arial", size: 18, color: "9CA3AF", italics: true })],
      }),
    ];

    const doc = new Document({
      numbering: {
        config: [{
          reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
        }],
      },
      styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 32, bold: true, font: "Arial", color: "1E3A5F" },
            paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 26, bold: true, font: "Arial", color: "2563EB" },
            paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
        ],
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="LSA-SMS-Safety-Review.docx"`,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
