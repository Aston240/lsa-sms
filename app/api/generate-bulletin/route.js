// PATH: app/api/generate-bulletin/route.js
import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(req) {
  try {
    const { bulletin, meta } = await req.json();
    // bulletin = { themes, whatWeActed }
    // meta = { issueNumber, dateFrom, dateTo, reportCount, closedActionCount }

    const dataPath = join(tmpdir(), `bulletin_data_${Date.now()}.json`);
    const outPath = join(tmpdir(), `bulletin_${Date.now()}.pdf`);

    writeFileSync(dataPath, JSON.stringify({ bulletin, meta }));

    const script = `
import json, sys, os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

with open(${JSON.stringify(dataPath)}) as f:
    data = json.load(f)

bulletin = data['bulletin']
meta = data['meta']

NAVY = colors.HexColor('#0c2340')
BLUE = colors.HexColor('#185fa5')
LIGHTBLUE = colors.HexColor('#e6f1fb')
DARKGRAY = colors.HexColor('#0c2340')
MIDGRAY = colors.HexColor('#f1efe8')
GREEN = colors.HexColor('#eaf3de')
DARKGREEN = colors.HexColor('#27500a')
TEXTGRAY = colors.HexColor('#444441')
SUBTEXT = colors.HexColor('#5f5e5a')
WHITE = colors.white

W, H = A4
doc = SimpleDocTemplate(
    ${JSON.stringify(outPath)},
    pagesize=A4,
    leftMargin=14*mm, rightMargin=14*mm,
    topMargin=0*mm, bottomMargin=10*mm
)

def header_footer(canvas, doc):
    canvas.saveState()
    # Full-width navy header bar
    canvas.setFillColor(BLUE)
    canvas.rect(0, H - 28*mm, W, 28*mm, fill=1, stroke=0)

    # White logo box
    canvas.setFillColor(WHITE)
    canvas.roundRect(14*mm, H - 22*mm, 52*mm, 12*mm, 2, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.setFont('Helvetica-Bold', 11)
    canvas.drawString(17*mm, H - 17.5*mm, 'LS AIRMOTIVE')

    # Divider line
    canvas.setFillColor(colors.HexColor('#ffffff44'))
    canvas.rect(70*mm, H - 24*mm, 0.4*mm, 20*mm, fill=1, stroke=0)

    # Bulletin title
    canvas.setFillColor(WHITE)
    canvas.setFont('Helvetica-Bold', 13)
    canvas.drawString(75*mm, H - 16*mm, 'Flight Safety Bulletin')
    canvas.setFillColor(colors.HexColor('#b5d4f4'))
    canvas.setFont('Helvetica', 9)
    issue_text = 'Issue ' + str(meta.get('issueNumber','—')) + '  ·  ' + str(meta.get('dateFrom','')) + ' to ' + str(meta.get('dateTo',''))
    canvas.drawString(75*mm, H - 22*mm, issue_text)

    # Stats boxes top right
    stats = [
        (str(meta.get('reportCount', 0)), 'Reports'),
        (str(meta.get('themeCount', 0)), 'Themes'),
        (str(meta.get('closedActionCount', 0)), 'Actions closed'),
    ]
    x_start = W - 14*mm
    box_w = 28*mm
    box_h = 16*mm
    gap = 2*mm
    for i, (val, label) in enumerate(reversed(stats)):
        bx = x_start - (i+1)*(box_w + gap)
        by = H - 26*mm
        is_actions = label == 'Actions closed'
        bg = colors.HexColor('#faeeda') if is_actions else colors.HexColor('#ffffff26')
        canvas.setFillColor(bg)
        canvas.roundRect(bx, by, box_w, box_h, 2, fill=1, stroke=0)
        val_color = colors.HexColor('#854f0b') if is_actions else WHITE
        label_color = colors.HexColor('#854f0b') if is_actions else colors.HexColor('#b5d4f4')
        canvas.setFillColor(val_color)
        canvas.setFont('Helvetica-Bold', 14)
        canvas.drawCentredString(bx + box_w/2, by + 8*mm, val)
        canvas.setFillColor(label_color)
        canvas.setFont('Helvetica', 7)
        canvas.drawCentredString(bx + box_w/2, by + 3*mm, label.upper())

    # Footer
    canvas.setFillColor(SUBTEXT)
    canvas.setFont('Helvetica', 7.5)
    canvas.drawString(14*mm, 6*mm, 'LS Airmotive DTO.0258  ·  Oxford Airport EGTK  ·  lsa-sms.vercel.app')
    canvas.setFont('Helvetica', 7.5)
    canvas.drawRightString(W - 14*mm, 6*mm, 'Head of Training: T. Newell  FE.466104D')
    canvas.setFillColor(BLUE)
    canvas.rect(0, 4*mm, W, 0.8*mm, fill=1, stroke=0)
    canvas.restoreState()

story = []
story.append(Spacer(1, 30*mm))  # space for header

themes = bulletin.get('themes', [])
acted = bulletin.get('whatWeActed', [])

CONTENT_W = W - 28*mm

def make_style(name, size=9, leading=13, color=TEXTGRAY, bold=False, align=TA_LEFT, space_before=0, space_after=4):
    return ParagraphStyle(
        name,
        fontName='Helvetica-Bold' if bold else 'Helvetica',
        fontSize=size,
        leading=leading,
        textColor=color,
        alignment=align,
        spaceBefore=space_before,
        spaceAfter=space_after,
    )

label_style = make_style('label', size=7.5, color=colors.HexColor('#185fa5'), bold=True, space_before=0, space_after=3)
body_style = make_style('body', size=9, leading=14, color=SUBTEXT)
white_label = make_style('wlabel', size=7.5, color=colors.HexColor('#7eb8e8'), bold=True, space_before=0, space_after=3)
white_body = make_style('wbody', size=9, leading=14, color=WHITE)
green_label = make_style('glabel', size=7.5, color=colors.HexColor('#3b6d11'), bold=True, space_before=0, space_after=3)
green_body = make_style('gbody', size=9, leading=14, color=DARKGREEN)

def color_block(bg, label_text, body_text, lbl_style, bdy_style, border_color=None):
    inner = [
        Paragraph(label_text.upper(), lbl_style),
        Paragraph(body_text, bdy_style),
    ]
    ts = [
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('ROUNDEDCORNERS', [4,4,4,4]),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]
    if border_color:
        ts.append(('BOX', (0,0), (-1,-1), 0.5, border_color))
    t = Table([[inner]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle(ts))
    return t

# Render themes — two per row if multiple
if len(themes) == 1:
    th = themes[0]
    story.append(color_block(NAVY, 'Trend — ' + th.get('category',''), th.get('trendSummary',''), white_label, white_body))
    story.append(Spacer(1, 3*mm))
    story.append(color_block(MIDGRAY, 'Lesson learned', th.get('lessonLearned',''), make_style('ml', size=7.5, color=TEXTGRAY, bold=True, space_after=3), make_style('mb', size=9, leading=14, color=SUBTEXT)))
    story.append(Spacer(1, 3*mm))
    story.append(color_block(GREEN, 'Actions for pilots', th.get('actionsForPilots','').replace('·', '&#8226;'), green_label, green_body))
    story.append(Spacer(1, 3*mm))
elif len(themes) >= 2:
    # Two trend boxes side by side
    half_w = (CONTENT_W - 4*mm) / 2
    row_cells = []
    for th in themes[:2]:
        inner = [
            Paragraph(('Trend — ' + th.get('category','')).upper(), white_label),
            Paragraph(th.get('trendSummary',''), white_body),
        ]
        ts = [
            ('BACKGROUND', (0,0), (-1,-1), NAVY),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]
        t = Table([[inner]], colWidths=[half_w])
        t.setStyle(TableStyle(ts))
        row_cells.append(t)
    trend_row = Table([row_cells], colWidths=[half_w, half_w], hAlign='LEFT')
    trend_row.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),('COLPADDING',(0,0),(-1,-1),2*mm)]))
    story.append(trend_row)
    story.append(Spacer(1, 3*mm))

    # Lessons learned side by side
    lesson_cells = []
    for i, th in enumerate(themes[:2]):
        inner = [
            Paragraph(('Lesson learned' + (' — ' + th.get('title','') if len(themes)>1 else '')).upper(), make_style('ll'+str(i), size=7.5, color=TEXTGRAY, bold=True, space_after=3)),
            Paragraph(th.get('lessonLearned',''), make_style('lb'+str(i), size=9, leading=14, color=SUBTEXT)),
        ]
        ts = [('BACKGROUND',(0,0),(-1,-1),MIDGRAY),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10)]
        t = Table([[inner]], colWidths=[half_w])
        t.setStyle(TableStyle(ts))
        lesson_cells.append(t)
    lesson_row = Table([lesson_cells], colWidths=[half_w, half_w], hAlign='LEFT')
    lesson_row.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),('COLPADDING',(0,0),(-1,-1),2*mm)]))
    story.append(lesson_row)
    story.append(Spacer(1, 3*mm))

    # Combined pilot actions
    combined_actions = ''
    for th in themes[:2]:
        combined_actions += th.get('actionsForPilots','') + '\n'
    story.append(color_block(GREEN, 'Actions for pilots', combined_actions.strip().replace('·','&#8226;'), green_label, green_body))
    story.append(Spacer(1, 3*mm))

    # Third theme on next section if exists
    if len(themes) > 2:
        th = themes[2]
        story.append(color_block(LIGHTBLUE, 'Further trend — ' + th.get('category',''), th.get('trendSummary',''), make_style('ft', size=7.5, color=BLUE, bold=True, space_after=3), make_style('fb', size=9, leading=14, color=NAVY)))
        story.append(Spacer(1, 2*mm))
        story.append(color_block(MIDGRAY, 'Lesson learned', th.get('lessonLearned',''), make_style('fl', size=7.5, color=TEXTGRAY, bold=True, space_after=3), make_style('flb', size=9, leading=14, color=SUBTEXT)))
        story.append(Spacer(1, 2*mm))
        story.append(color_block(GREEN, 'Additional actions for pilots', th.get('actionsForPilots','').replace('·','&#8226;'), green_label, green_body))
        story.append(Spacer(1, 3*mm))

# What we acted section
if acted:
    acted_text = '<br/>'.join(['&#8226; <b>' + a.get('change','').split(':')[0] + (':</b> ' + ':'.join(a.get('change','').split(':')[1:]) if ':' in a.get('change','') else '</b>') for a in acted])
    story.append(color_block(NAVY, 'You reported — we acted', acted_text,
        make_style('ya', size=7.5, color=colors.HexColor('#7eb8e8'), bold=True, space_after=3),
        make_style('yb', size=9, leading=14, color=WHITE)))

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print("OK:" + ${JSON.stringify(outPath)})
`;

    const scriptPath = join(tmpdir(), `gen_bulletin_${Date.now()}.py`);
    writeFileSync(scriptPath, script);

    let output;
    try {
      output = execSync(`pip install reportlab --break-system-packages -q && python3 "${scriptPath}"`, {
        timeout: 60000,
        encoding: "utf8",
      });
    } catch (e) {
      console.error("Python error:", e.stdout, e.stderr);
      return NextResponse.json({ error: "PDF generation failed: " + (e.stderr || e.message) }, { status: 500 });
    }

    if (!output.includes("OK:")) {
      return NextResponse.json({ error: "PDF generation failed — no output path returned" }, { status: 500 });
    }

    const pdfBuffer = readFileSync(outPath);
    const base64 = pdfBuffer.toString("base64");

    try { unlinkSync(dataPath); unlinkSync(scriptPath); unlinkSync(outPath); } catch {}

    return NextResponse.json({ ok: true, pdf: base64 });
  } catch (err) {
    console.error("generate-bulletin error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
