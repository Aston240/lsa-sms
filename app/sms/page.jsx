// PATH: app/sms/page.jsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── seed data ─────────────────────────────────────────────────────────────────
const SEED_REPORTS = [];
const SEED_RISKS = [];
const SEED_ACTIONS = [];

const ACTION_OWNERS = ["Tom Newell", "Tam Abrahams", "Joe Tomlin", "Liam Salt", "An Instructor"];
const HAZARD_CATEGORIES = ["Flight Operations – Airborne", "Flight Operations – Ground", "Aircraft & Technical", "Training & Supervision", "Human Factors", "Organisational / Administrative"];
const OPERATIONAL_AREAS = ["Pre-Flight / Dispatch", "Ground Handling", "Taxi Operations", "Take-off / Departure", "Circuit / Training Area Flying", "Navigation / En-route Flying", "Approach / Landing", "Aircraft Technical / Maintenance", "Air Traffic / Airspace", "Safety / Procedural", "Facilities / Airfield Environment", "Other / Not Listed"];
const POTENTIAL_CONSEQUENCES = ["Minor aircraft damage", "Significant aircraft damage", "Serious aircraft damage / hull loss", "Serious injury", "Fatal injury", "Airspace infringement", "Loss of separation", "CFIT / terrain conflict", "Loss of control in flight", "Loss of communications", "Regulatory non-compliance", "Reputational damage"];
const RISK_STATUSES = ["Open", "Under Review", "Mitigation In Progress", "Monitoring", "Closed"];
const PIC_TYPES = ["Instructor", "Solo Student", "Licence Holder", "Other"];
const BACKUP_SLOTS = 10;

const riskScore = (s, l) => (s || 0) * (l || 0);
const riskLevel = score => { if (score <= 4) return { label: "Low", color: "#22c55e" }; if (score <= 9) return { label: "Medium", color: "#f59e0b" }; if (score <= 15) return { label: "High", color: "#ef4444" }; return { label: "Intolerable", color: "#7c3aed" }; };
const isOverdue = (targetDate, status) => !!(targetDate && status !== "Closed" && new Date(targetDate) < new Date());
const fmt = d => d ? new Date(d).toLocaleDateString("en-GB") : "—";
const fmtFull = d => d ? new Date(d).toLocaleString("en-GB") : "—";

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getStoredUser() {
  try {
    const token = localStorage.getItem("sms_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp < Date.now()) { localStorage.removeItem("sms_token"); localStorage.removeItem("sms_user"); return null; }
    return payload;
  } catch { return null; }
}
function authHeaders() {
  const token = localStorage.getItem("sms_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Storage helpers ───────────────────────────────────────────────────────────
async function loadFromStorage(key, fallback) {
  try {
    const res = await fetch('/api/data?key=' + encodeURIComponent(key));
    const data = await res.json();
    return data.value ?? fallback;
  } catch { return fallback; }
}
async function saveToStorage(key, value) {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  } catch {}
}

// ── Audit helper ──────────────────────────────────────────────────────────────
async function writeAudit(actor, action, tab, detail, recordId = null) {
  try {
    const raw = await loadFromStorage("sms:audit", []);
    const audit = Array.isArray(raw) ? raw : [];
    audit.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: actor?.name || "Unknown",
      email: actor?.email || "",
      action,
      tab,
      detail,
      recordId,
    });
    await saveToStorage("sms:audit", audit);
  } catch {}
}

// ── Backup helpers ────────────────────────────────────────────────────────────
async function takeBackup(reports, risks, actions) {
  try {
    const slotMeta = await loadFromStorage("sms:backup:meta", { next: 1 });
    const slot = ((slotMeta.next - 1) % BACKUP_SLOTS) + 1;
    const next = (slot % BACKUP_SLOTS) + 1;
    await saveToStorage(`sms:backup:${slot}`, {
      takenAt: new Date().toISOString(),
      slot,
      reports,
      risks,
      actions,
    });
    await saveToStorage("sms:backup:meta", { next, lastBackup: new Date().toISOString() });
  } catch {}
}

async function loadBackups() {
  const results = [];
  for (let i = 1; i <= BACKUP_SLOTS; i++) {
    const b = await loadFromStorage(`sms:backup:${i}`, null);
    if (b) results.push(b);
  }
  return results.sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));
}

// ── styles ────────────────────────────────────────────────────────────────────
const inputStyle = { background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const cardStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "18px 20px" };
const cardHead = { fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14 };
const h2Style = { color: "#e2e8f0", fontSize: 20, fontWeight: 800, margin: "0 0 16px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const thStyle = { textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #1e293b", color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px 12px", borderBottom: "1px solid #0f172a", color: "#94a3b8", verticalAlign: "middle" };
const btnPrimary = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 7, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13 };
const btnSecondary = { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 7, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13 };
const btnSmall = { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 5, padding: "4px 10px", fontWeight: 600, cursor: "pointer", fontSize: 11 };
const stepP = { color: "#94a3b8", fontSize: 13, margin: 0, lineHeight: 1.6 };
const codeStyle = { background: "#1e293b", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 12 };

// ── shared components ─────────────────────────────────────────────────────────
const Badge = ({ children, color }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".5px", whiteSpace: "nowrap" }}>{children}</span>
);
const RiskBadge = ({ s, l }) => { const score = riskScore(s, l); const { label, color } = riskLevel(score); return <Badge color={color}>{score} – {label}</Badge>; };
const StatusBadge = ({ status }) => { const m = { "Open": "#ef4444", "Under Review": "#f59e0b", "Mitigation In Progress": "#f59e0b", "Monitoring": "#f59e0b", "Closed": "#22c55e", "In Progress": "#f59e0b" }; return <Badge color={m[status] || "#64748b"}>{status}</Badge>; };
const PriBadge = ({ p }) => { const m = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" }; return <Badge color={m[p] || "#64748b"}>{p}</Badge>; };
const Input = ({ label, value, onChange, type = "text", options, required, rows }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase" }}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>}
    {options ? <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}><option value="">— select —</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
      : rows ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} style={{ ...inputStyle, resize: "vertical" }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />}
  </div>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ reports, risks, actions }) {
  const activeReports = reports.filter(r => !r.deletedAt);
  const activeRisks = risks.filter(r => !r.deletedAt);
  const activeActions = actions.filter(a => !a.deletedAt);
  const closedRisks = activeRisks.filter(r => r.status === "Closed").length;
  const openActions = activeActions.filter(a => a.status !== "Closed").length;
  const overdueActions = activeActions.filter(a => isOverdue(a.targetDate, a.status)).length;
  const highRisks = activeRisks.filter(r => riskScore(r.initSeverity, r.initLikelihood) >= 10).length;
  const pendingReports = activeReports.filter(r => !r.acknowledged).length;
  const byCat = {}; activeRisks.forEach(r => { byCat[r.hazardCategory] = (byCat[r.hazardCategory] || 0) + 1; });
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const byAc = {}; activeRisks.forEach(r => { byAc[r.aircraft] = (byAc[r.aircraft] || 0) + 1; });
  const acEntries = Object.entries(byAc).sort((a, b) => b[1] - a[1]);
  const byMonth = {}; activeReports.forEach(r => { const m = r.incidentDate.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; });
  const monthEntries = Object.entries(byMonth).sort();
  const maxCat = catEntries[0]?.[1] || 1, maxAc = acEntries[0]?.[1] || 1, maxMonth = Math.max(...Object.values(byMonth), 1);
  const BAR_COLORS = ["#38bdf8", "#a78bfa", "#22c55e", "#f59e0b", "#ef4444", "#818cf8", "#34d399", "#fb923c", "#e879f9", "#facc15", "#60a5fa", "#f472b6"];
  const attentionItems = [
    ...activeReports.filter(r => !r.acknowledged).map(r => ({ type: "report", label: `Report: ${r.title}`, sub: `#${r.id} · ${fmt(r.incidentDate)}`, color: "#f59e0b" })),
    ...activeActions.filter(a => isOverdue(a.targetDate, a.status)).map(a => ({ type: "action", label: `Overdue: ${a.description || a.id}`, sub: `${a.hazardId} · Due ${fmt(a.targetDate)}`, color: "#ef4444" })),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16 }}>
        {[{ label: "Total Reports", value: activeReports.length, color: "#38bdf8" }, { label: "Pending Review", value: pendingReports, color: "#f59e0b" }, { label: "Closed Risks", value: closedRisks, color: "#22c55e" }, { label: "Open Actions", value: openActions, color: "#818cf8" }, { label: "Overdue", value: overdueActions, color: "#ef4444" }, { label: "High / Intolerable", value: highRisks, color: "#7c3aed" }].map(k => (
          <div key={k.label} style={{ background: "#0f172a", border: `1px solid ${k.color}33`, borderRadius: 10, padding: "18px 20px" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: k.color, fontFamily: "'Bebas Neue',sans-serif", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, letterSpacing: ".5px", textTransform: "uppercase" }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={cardStyle}>
          <div style={cardHead}>Reports by Hazard Category</div>
          {catEntries.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No data yet.</div>}
          {catEntries.map(([cat, n]) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#94a3b8" }}>{cat}</span><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{n}</span></div>
              <div style={{ background: "#1e293b", borderRadius: 4, height: 6 }}><div style={{ width: `${(n / maxCat) * 100}%`, height: 6, background: "#38bdf8", borderRadius: 4 }} /></div>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <div style={cardHead}>Reports by Aircraft</div>
          {acEntries.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No data yet.</div>}
          {acEntries.map(([ac, n]) => (
            <div key={ac} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#94a3b8" }}>{ac}</span><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{n}</span></div>
              <div style={{ background: "#1e293b", borderRadius: 4, height: 6 }}><div style={{ width: `${(n / maxAc) * 100}%`, height: 6, background: "#a78bfa", borderRadius: 4 }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={cardStyle}>
          <div style={cardHead}>Incidents by Month</div>
          {monthEntries.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No data yet.</div>}
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 110, marginTop: 12 }}>
            {monthEntries.map(([m, n], i) => (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700 }}>{n}</span>
                <div style={{ width: "100%", background: BAR_COLORS[i % BAR_COLORS.length], borderRadius: "4px 4px 0 0", height: `${Math.max((n / maxMonth) * 70, 4)}px` }} />
                <span style={{ fontSize: 9, color: "#475569", textAlign: "center" }}>{m.slice(5)}/{m.slice(2, 4)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardHead}>⚠ Items Needing Attention</div>
          {attentionItems.length === 0
            ? <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#22c55e", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 18 }}>✓</span> All Clear — no pending reports or overdue actions.</div>
            : attentionItems.map((item, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${item.color}`, paddingLeft: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{item.sub}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Submit Report ─────────────────────────────────────────────────────────────
function SubmitReport({ onSubmit }) {
  const blank = { incidentDate: "", title: "", location: "", aircraft: "", picType: "", operationalArea: "", what: "", reporterDetails: "" };
  const [form, setForm] = useState(blank);
  const [done, setDone] = useState(false);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.title || !form.incidentDate || !form.what) return alert("Please fill in required fields.");
    onSubmit({ ...form, source: "manual" }); setForm(blank); setDone(true); setTimeout(() => setDone(false), 4000);
  };
  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={h2Style}>Submit a Safety Report</h2>
      <p style={{ color: "#64748b", marginBottom: 20, fontSize: 13 }}>All reports are treated confidentially. You may remain anonymous.</p>
      {done && <div style={{ background: "#14532d", border: "1px solid #22c55e", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#86efac" }}>✓ Report submitted successfully.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input label="Date of Incident" value={form.incidentDate} onChange={set("incidentDate")} type="date" required />
        <Input label="Aircraft Registration" value={form.aircraft} onChange={set("aircraft")} />
        <div style={{ gridColumn: "1/-1" }}><Input label="Brief Title of Incident" value={form.title} onChange={set("title")} required /></div>
        <Input label="Location" value={form.location} onChange={set("location")} />
        <Input label="PIC Type" value={form.picType} onChange={set("picType")} options={PIC_TYPES} />
        <Input label="Operational Area" value={form.operationalArea} onChange={set("operationalArea")} options={["", ...OPERATIONAL_AREAS]} />
        <div style={{ gridColumn: "1/-1" }}><Input label="What happened (factual recap)" value={form.what} onChange={set("what")} rows={5} required /></div>
        <div style={{ gridColumn: "1/-1" }}><Input label="Reporter Details (optional)" value={form.reporterDetails} onChange={set("reporterDetails")} /></div>
      </div>
      <button onClick={submit} style={{ ...btnPrimary, marginTop: 16 }}>Submit Report</button>
    </div>
  );
}

// ── Raw Reports ───────────────────────────────────────────────────────────────
function AIReportPanel({ report, allReports, risks, onRaise, onAudit }) {
  const [state, setState] = useState("idle");
  const [analysis, setAnalysis] = useState(null);
  const [chatHistory, setChatHistory] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedActions, setSelectedActions] = useState([]);
  const [actionsSaved, setActionsSaved] = useState(false);

  const toggleAction = (i) => setSelectedActions(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const runAnalysis = async () => {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ report, allReports, risks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      const text = data.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAnalysis(parsed);
      setSelectedActions(parsed.suggestedActions?.map((_, i) => i) || []);
      const activeReports = (allReports || []).filter(r => !r.deletedAt && r.id !== report.id);
      const activeRisks = (risks || []).filter(r => !r.deletedAt);
      setChatHistory([
        { role: "user", content: `Context: Analysing report #${report.id} "${report.title}" (${report.incidentDate}). Aircraft: ${report.aircraft}. What happened: ${report.what}\n\nExisting reports: ${activeReports.length} in system. Risk register: ${activeRisks.length} active risks.\n\nInitial analysis: ${text}` },
        { role: "assistant", content: text },
      ]);
      onAudit("AI_ANALYSIS", "Raw Reports", `AI analysed report #${report.id}: ${report.title}`, String(report.id));
      setState("done");
    } catch (err) {
      setErrorMsg(err.message);
      setState("error");
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const newHistory = [...chatHistory, { role: "user", content: userMsg }];
      const res = await fetch("/api/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ report, chatHistory: newHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      const reply = data.text || "";
      setChatHistory([...newHistory, { role: "assistant", content: reply }]);
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", text: "⚠ Error: " + err.message }]);
    }
    setChatLoading(false);
  };

  const handleAcceptRisk = () => {
    if (!analysis?.proposedRisk) return;
    const enrichedReport = {
      ...report,
      hazardDescription: analysis.proposedRisk.hazardDescription,
      hazardCategory: analysis.proposedRisk.hazardCategory,
      potentialConsequence: analysis.proposedRisk.potentialConsequence,
      existingControls: analysis.proposedRisk.existingControls,
      additionalMitigation: analysis.proposedRisk.additionalMitigation,
      initSeverity: analysis.suggestedSeverity,
      initLikelihood: analysis.suggestedLikelihood,
    };
    onRaise(enrichedReport);
  };

  const score = analysis ? (analysis.suggestedSeverity || 1) * (analysis.suggestedLikelihood || 1) : 0;
  const { label: riskLabel, color: riskColor } = score > 0 ? riskLevel(score) : { label: "", color: "#64748b" };

  if (state === "idle") return (
    <tr>
      <td colSpan={10} style={{ padding: "0 12px 12px", background: "#060c1a" }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>AI Report Analysis</div>
            <div style={{ fontSize: 11, color: "#475569" }}>Categorise, rate risk, find similar reports and get suggested actions</div>
          </div>
          <button onClick={runAnalysis} style={{ ...btnPrimary, background: "#7c3aed", fontSize: 12, padding: "8px 18px" }}>🤖 Run Analysis</button>
        </div>
      </td>
    </tr>
  );

  if (state === "loading") return (
    <tr>
      <td colSpan={10} style={{ padding: "0 12px 12px", background: "#060c1a" }}>
        <div style={{ background: "#0f172a", border: "1px solid #7c3aed33", borderRadius: 8, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>🤖 Analysing report…</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Reviewing incident details, checking for similar reports, assessing risk…</div>
        </div>
      </td>
    </tr>
  );

  if (state === "error") return (
    <tr>
      <td colSpan={10} style={{ padding: "0 12px 12px", background: "#060c1a" }}>
        <div style={{ background: "#450a0a", border: "1px solid #ef444433", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <span>⚠</span>
          <div style={{ flex: 1, fontSize: 12, color: "#fca5a5" }}>Analysis failed: {errorMsg}</div>
          <button onClick={runAnalysis} style={btnSmall}>Retry</button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr>
      <td colSpan={10} style={{ padding: "0 12px 16px", background: "#060c1a" }}>
        <div style={{ background: "#0a0f1e", border: "1px solid #7c3aed44", borderRadius: 10, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>🤖 AI Analysis — Report #{report.id}</div>
            <button onClick={() => { setState("idle"); setAnalysis(null); setChatMessages([]); setSelectedActions([]); setActionsSaved(false); }} style={{ ...btnSmall, fontSize: 10 }}>✕ Close</button>
          </div>
          {analysis.summary && (
            <div style={{ background: "#1e1040", border: "1px solid #7c3aed33", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#c4b5fd", lineHeight: 1.6 }}>
              {analysis.summary}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Suggested Category</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{analysis.category}</div>
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Suggested Risk Rating</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>S:{analysis.suggestedSeverity} × L:{analysis.suggestedLikelihood}</span>
                <span style={{ background: riskColor + "22", color: riskColor, border: `1px solid ${riskColor}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{score} – {riskLabel}</span>
              </div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>S: {analysis.severityRationale}</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>L: {analysis.likelihoodRationale}</div>
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Similar Reports</div>
              {analysis.similarReports?.length > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                    {analysis.similarReports.map(id => <span key={id} style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700 }}>#{id}</span>)}
                  </div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{analysis.similarReportsSummary}</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#22c55e" }}>✓ No similar reports found</div>
              )}
            </div>
          </div>
          {analysis.proposedRisk && (
            <div style={{ background: "#0f172a", border: "1px solid #0ea5e933", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: ".8px" }}>⚠ Proposed Risk Register Entry</div>
                <button onClick={handleAcceptRisk} style={{ ...btnSmall, background: "#0ea5e933", color: "#38bdf8", border: "1px solid #0ea5e955", fontSize: 11 }}>↗ Accept &amp; Raise to Risk Register</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>HAZARD</div>
                  <div style={{ fontSize: 12, color: "#e2e8f0" }}>{analysis.proposedRisk.hazardDescription}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>CATEGORY / CONSEQUENCE</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{analysis.proposedRisk.hazardCategory}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{analysis.proposedRisk.potentialConsequence}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>EXISTING CONTROLS</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{analysis.proposedRisk.existingControls}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>ADDITIONAL MITIGATION</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{analysis.proposedRisk.additionalMitigation}</div>
                </div>
              </div>
            </div>
          )}
          {analysis.suggestedActions?.length > 0 && (
            <div style={{ background: "#0f172a", border: "1px solid #22c55e33", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: ".8px" }}>✅ Suggested Actions</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#475569" }}>{selectedActions.length} of {analysis.suggestedActions.length} selected</span>
                  {actionsSaved
                    ? <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Added to Risk Register queue</span>
                    : <button
                        onClick={() => {
                          if (selectedActions.length === 0) return;
                          const enrichedReport = {
                            ...report,
                            hazardDescription: analysis.proposedRisk?.hazardDescription || (report.title + (report.what ? "\n\n" + report.what : "")),
                            hazardCategory: analysis.proposedRisk?.hazardCategory || "",
                            potentialConsequence: analysis.proposedRisk?.potentialConsequence || "",
                            existingControls: analysis.proposedRisk?.existingControls || "",
                            additionalMitigation: analysis.proposedRisk?.additionalMitigation || "",
                            initSeverity: analysis.suggestedSeverity,
                            initLikelihood: analysis.suggestedLikelihood,
                            _selectedActions: selectedActions.map(i => analysis.suggestedActions[i]),
                          };
                          onRaise(enrichedReport);
                          setActionsSaved(true);
                        }}
                        disabled={selectedActions.length === 0}
                        style={{ ...btnSmall, background: selectedActions.length > 0 ? "#22c55e22" : "#1e293b", color: selectedActions.length > 0 ? "#22c55e" : "#475569", border: `1px solid ${selectedActions.length > 0 ? "#22c55e44" : "#334155"}`, fontSize: 11 }}
                      >↗ Raise with Selected Actions</button>
                  }
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analysis.suggestedActions.map((action, i) => {
                  const selected = selectedActions.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleAction(i)}
                      style={{ background: selected ? "#0a1f0a" : "#060c1a", border: `1px solid ${selected ? "#22c55e44" : "#1e293b"}`, borderRadius: 6, padding: "10px 12px", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}
                    >
                      <div style={{ marginTop: 1, flexShrink: 0 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${selected ? "#22c55e" : "#334155"}`, background: selected ? "#22c55e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {selected && <span style={{ color: "#000", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: selected ? "#e2e8f0" : "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{action.description}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Suggested owner: {action.owner} · {action.rationale}</div>
                      </div>
                      <span style={{ background: action.priority === "HIGH" ? "#ef444422" : action.priority === "MEDIUM" ? "#f59e0b22" : "#22c55e22", color: action.priority === "HIGH" ? "#ef4444" : action.priority === "MEDIUM" ? "#f59e0b" : "#22c55e", border: `1px solid ${action.priority === "HIGH" ? "#ef444444" : action.priority === "MEDIUM" ? "#f59e0b44" : "#22c55e44"}`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{action.priority}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>Click an action to select or deselect it, then raise to the Risk Register.</div>
            </div>
          )}
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>💬 Ask a Follow-up Question</div>
            {chatMessages.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, maxHeight: 280, overflowY: "auto" }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "80%", background: msg.role === "user" ? "#1e293b" : "#1e1040", border: `1px solid ${msg.role === "user" ? "#334155" : "#7c3aed33"}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: msg.role === "user" ? "#e2e8f0" : "#c4b5fd", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ background: "#1e1040", border: "1px solid #7c3aed33", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#7c3aed" }}>Thinking…</div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="e.g. What regulatory reference applies here? Suggest a more specific action…" style={{ ...inputStyle, flex: 1, fontSize: 12 }} disabled={chatLoading} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ ...btnPrimary, background: "#7c3aed", padding: "8px 16px", fontSize: 12, opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>Send</button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function RawReports({ reports, risks, onRaise, setReports, currentUser, onAudit }) {
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openAiPanel, setOpenAiPanel] = useState(null);
  const isAdmin = currentUser?.role === "admin";
  const active = reports.filter(r => !r.deletedAt);
  const deleted = reports.filter(r => !!r.deletedAt);
  const list = showDeleted ? deleted : active;
  const filtered = list.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || (r.aircraft || "").toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.id - a.id);
  const doDelete = id => {
    const report = reports.find(r => r.id === id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r));
    onAudit("REPORT_DELETED", "Raw Reports", `Deleted report #${id}: ${report?.title}`, String(id));
    setConfirmDelete(null);
  };
  const doRestore = id => {
    const report = reports.find(r => r.id === id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, deletedAt: null } : r));
    onAudit("REPORT_RESTORED", "Raw Reports", `Restored report #${id}: ${report?.title}`, String(id));
  };
  const handleRaise = (report) => {
    onRaise(report);
  };
  return (
    <div>
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f172a", border: "1px solid #ef4444", borderRadius: 10, padding: 28, maxWidth: 400, width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Delete Report?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>This will move report <strong style={{ color: "#38bdf8" }}>#{confirmDelete.id} — {confirmDelete.title}</strong> to Recently Deleted where it can be restored.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => doDelete(confirmDelete.id)} style={{ ...btnPrimary, background: "#ef4444" }}>Yes, Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ ...h2Style, marginBottom: 0 }}>Raw Reports ({filtered.length})</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 200 }} />
          <button onClick={() => setShowDeleted(v => !v)} style={{ ...btnSmall, background: showDeleted ? "#7c3aed22" : "#1e293b", color: showDeleted ? "#a78bfa" : "#94a3b8", border: showDeleted ? "1px solid #7c3aed44" : "1px solid #334155" }}>
            🗑 Recently Deleted {deleted.length > 0 && `(${deleted.length})`}
          </button>
        </div>
      </div>
      {showDeleted && (
        <div style={{ background: "#1c0a2e", border: "1px solid #7c3aed44", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#a78bfa" }}>
          Showing recently deleted reports. Click Restore to recover any item.
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead><tr>{["ID", "Source", "Date", "Title", "Aircraft", "Location", "PIC Type", "Reporter", "Status", ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(r => (
            <>
              <tr key={r.id} style={{ opacity: r.deletedAt ? 0.6 : 1, background: openAiPanel === r.id ? "#060c1a" : undefined }}>
                <td style={tdStyle}>{r.id}</td>
                <td style={tdStyle}>{r.source === "forms" ? <Badge color="#818cf8">MS Forms</Badge> : r.source === "manual" ? <Badge color="#38bdf8">Manual</Badge> : r.source === "excel-import" ? <Badge color="#38bdf8">Import</Badge> : <Badge color="#475569">Excel</Badge>}</td>
                <td style={tdStyle}>{fmt(r.incidentDate)}</td>
                <td style={{ ...tdStyle, maxWidth: 220 }}>{r.title}</td>
                <td style={tdStyle}>{r.aircraft}</td>
                <td style={tdStyle}>{r.location}</td>
                <td style={tdStyle}>{r.picType}</td>
                <td style={tdStyle}>{r.reporterDetails || <span style={{ color: "#475569" }}>Anonymous</span>}</td>
                <td style={tdStyle}>{r.deletedAt ? <Badge color="#7c3aed">Deleted {fmt(r.deletedAt)}</Badge> : r.acknowledged ? <Badge color="#22c55e">✓ Acknowledged</Badge> : <Badge color="#f59e0b">Pending Review</Badge>}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {r.deletedAt ? (
                      <button onClick={() => doRestore(r.id)} style={{ ...btnSmall, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44" }}>↩ Restore</button>
                    ) : (
                      <>
                        {isAdmin && (
                          <button onClick={() => setOpenAiPanel(prev => prev === r.id ? null : r.id)} style={{ ...btnSmall, background: openAiPanel === r.id ? "#7c3aed33" : "#1e293b", color: openAiPanel === r.id ? "#a78bfa" : "#94a3b8", border: openAiPanel === r.id ? "1px solid #7c3aed55" : "1px solid #334155" }}>🤖</button>
                        )}
                        <button onClick={() => handleRaise(r)} style={{ ...btnSmall, background: "#0ea5e933", color: "#38bdf8", border: "1px solid #0ea5e955" }}>{r.acknowledged ? "↗ Re-raise" : "↗ Raise"}</button>
                        <button onClick={() => setConfirmDelete(r)} style={{ ...btnSmall, background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444" }}>🗑</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              {isAdmin && openAiPanel === r.id && (
                <AIReportPanel key={`ai-${r.id}`} report={r} allReports={reports} risks={risks} onRaise={handleRaise} onAudit={onAudit} />
              )}
            </>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Risk Register ─────────────────────────────────────────────────────────────
function RiskRegister({ risks, setRisks, actions, setActions, raiseTarget, onRaiseSave, onRaiseCancel, onAudit }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirmDeleteRisk, setConfirmDeleteRisk] = useState(null);
  const active = risks.filter(r => !r.deletedAt);
  const deleted = risks.filter(r => !!r.deletedAt);
  const list = showDeleted ? deleted : active;
  const filtered = list.filter(r => (!search || (r.id + r.hazardDescription + r.aircraft).toLowerCase().includes(search.toLowerCase())) && (!filterStatus || r.status === filterStatus)).sort((a, b) => b.id.localeCompare(a.id));
  const save = updated => {
    const isNew = updated.id === "NEW";
    setRisks(prev => prev.map(r => r.id === updated.id ? updated : r));
    onAudit("RISK_UPDATED", "Risk Register", `Updated risk ${updated.id}: ${updated.hazardDescription?.slice(0, 60)}`, updated.id);
    setEditing(null);
  };
  const addAction = newAction => {
    setActions(prev => {
      const nums = prev.map(a => parseInt((a.id || "ACT-000").split("-")[1] || 0));
      const nextId = "ACT-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
      const action = { ...newAction, id: nextId };
      onAudit("ACTION_CREATED", "Action Log", `Created action ${nextId}: ${newAction.description?.slice(0, 60)}`, nextId);
      return [...prev, action];
    });
  };
  const doDelete = id => {
    const risk = risks.find(r => r.id === id);
    setRisks(prev => prev.map(r => r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r));
    onAudit("RISK_DELETED", "Risk Register", `Deleted risk ${id}: ${risk?.hazardDescription?.slice(0, 60)}`, id);
    setConfirmDeleteRisk(null);
  };
  const doRestore = id => {
    const risk = risks.find(r => r.id === id);
    setRisks(prev => prev.map(r => r.id === id ? { ...r, deletedAt: null } : r));
    onAudit("RISK_RESTORED", "Risk Register", `Restored risk ${id}: ${risk?.hazardDescription?.slice(0, 60)}`, id);
  };

  if (raiseTarget) {
    const prefilled = {
      id: "NEW", reportId: raiseTarget.id,
      dateIdentified: raiseTarget.incidentDate || new Date().toISOString().slice(0, 10),
      aircraft: raiseTarget.aircraft || "", picType: raiseTarget.picType || "",
      location: raiseTarget.location || "", operationalArea: raiseTarget.operationalArea || "",
      hazardDescription: raiseTarget.hazardDescription || (raiseTarget.title + (raiseTarget.what ? "\n\n" + raiseTarget.what : "")),
      potentialConsequence: raiseTarget.potentialConsequence || "",
      hazardCategory: raiseTarget.hazardCategory || "",
      initSeverity: raiseTarget.initSeverity || 1,
      initLikelihood: raiseTarget.initLikelihood || 1,
      existingControls: raiseTarget.existingControls || "",
      additionalMitigation: raiseTarget.additionalMitigation || "",
      actionOwner: "", targetDate: "",
      status: "Open", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "",
    };
    return (
      <div>
        <div style={{ background: "#0f172a", border: "1px solid #0ea5e955", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>✈</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>Raising Report #{raiseTarget.id} to Risk Register{raiseTarget.hazardCategory ? " (AI pre-filled)" : ""}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{raiseTarget.title} · {raiseTarget.aircraft}</div>
          </div>
          {raiseTarget.hazardCategory && <span style={{ background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>🤖 AI Pre-filled</span>}
        </div>
        <RiskEditor risk={prefilled} onSave={onRaiseSave} onCancel={onRaiseCancel} onAddAction={addAction} isNew />
      </div>
    );
  }

  if (editing) return <RiskEditor risk={editing} onSave={save} onCancel={() => setEditing(null)} onAddAction={addAction} />;
  return (
    <div>
      {confirmDeleteRisk && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f172a", border: "1px solid #ef4444", borderRadius: 10, padding: 28, maxWidth: 400, width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Delete Risk Entry?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>This will move <strong style={{ color: "#38bdf8" }}>{confirmDeleteRisk.id}</strong> to Recently Deleted where it can be restored.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => doDelete(confirmDeleteRisk.id)} style={{ ...btnPrimary, background: "#ef4444" }}>Yes, Delete</button>
              <button onClick={() => setConfirmDeleteRisk(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ ...h2Style, marginBottom: 0 }}>Risk Register ({filtered.length})</h2>
        <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 180 }}>
          <option value="">All Statuses</option>{RISK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowDeleted(v => !v)} style={{ ...btnSmall, background: showDeleted ? "#7c3aed22" : "#1e293b", color: showDeleted ? "#a78bfa" : "#94a3b8", border: showDeleted ? "1px solid #7c3aed44" : "1px solid #334155" }}>
          🗑 Recently Deleted {deleted.length > 0 && `(${deleted.length})`}
        </button>
      </div>
      {showDeleted && (
        <div style={{ background: "#1c0a2e", border: "1px solid #7c3aed44", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#a78bfa" }}>
          Showing recently deleted risks. Click Restore to recover any item.
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead><tr>{["Hazard ID", "Date", "Aircraft", "Hazard Title", "Category", "Init. Risk", "Residual Risk", "Actions", "Status", "Owner", ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(r => {
            const score = riskScore(r.initSeverity, r.initLikelihood); const { label, color } = riskLevel(score);
            const resScore = riskScore(r.residualSeverity, r.residualLikelihood);
            const resLevel = resScore > 0 ? riskLevel(resScore) : null;
            const riskActions = actions.filter(a => a.hazardId === r.id && !a.deletedAt);
            const overdue = riskActions.some(a => isOverdue(a.targetDate, a.status));
            return (<tr key={r.id} style={{ opacity: r.deletedAt ? 0.6 : 1 }}>
              <td style={tdStyle}><span style={{ color: "#38bdf8", fontWeight: 700 }}>{r.id}</span></td>
              <td style={tdStyle}>{fmt(r.dateIdentified)}</td>
              <td style={tdStyle}>{r.aircraft}</td>
              <td style={{ ...tdStyle, maxWidth: 200, color: "#e2e8f0" }}>{r.hazardDescription.split("\n")[0]}</td>
              <td style={{ ...tdStyle, fontSize: 11, color: "#94a3b8" }}>{r.hazardCategory}</td>
              <td style={tdStyle}><Badge color={color}>{score} – {label}</Badge></td>
              <td style={tdStyle}>{resLevel ? <Badge color={resLevel.color}>{resScore} – {resLevel.label}</Badge> : <span style={{ color: "#475569", fontSize: 11 }}>—</span>}</td>
              <td style={tdStyle}>
                {riskActions.length > 0
                  ? <Badge color={overdue ? "#ef4444" : "#38bdf8"}>{riskActions.length} action{riskActions.length !== 1 ? "s" : ""}{overdue ? " ⚠" : ""}</Badge>
                  : <span style={{ color: "#475569", fontSize: 11 }}>none</span>
                }
              </td>
              <td style={tdStyle}><StatusBadge status={r.status} /></td>
              <td style={{ ...tdStyle, fontSize: 12 }}>{r.actionOwner}</td>
              <td style={tdStyle}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {r.deletedAt ? (
                    <button onClick={() => doRestore(r.id)} style={{ ...btnSmall, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44" }}>↩ Restore</button>
                  ) : (
                    <>
                      <button onClick={() => setEditing(r)} style={btnSmall}>Edit</button>
                      <button onClick={() => setConfirmDeleteRisk(r)} style={{ ...btnSmall, background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444" }}>🗑</button>
                    </>
                  )}
                </div>
              </td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function RiskEditor({ risk, onSave, onCancel, isNew, onAddAction }) {
  const [form, setForm] = useState({ ...risk });
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ description: "", owner: risk.actionOwner || "", targetDate: "", priority: "MEDIUM", status: "Open" });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const setAct = k => v => setActionForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={h2Style}>{isNew ? "New Risk Entry" : "Edit Risk – " + form.id}</h2>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input label="Date Identified" value={form.dateIdentified} onChange={set("dateIdentified")} type="date" />
        <Input label="Aircraft Reg" value={form.aircraft} onChange={set("aircraft")} />
        <Input label="Location" value={form.location} onChange={set("location")} />
        <Input label="Operational Area" value={form.operationalArea} onChange={set("operationalArea")} options={["", ...OPERATIONAL_AREAS]} />
        <div style={{ gridColumn: "1/-1" }}><Input label="Hazard Description" value={form.hazardDescription} onChange={set("hazardDescription")} rows={4} /></div>
        <Input label="Hazard Category" value={form.hazardCategory} onChange={set("hazardCategory")} options={HAZARD_CATEGORIES} />
        <Input label="Potential Consequence" value={form.potentialConsequence} onChange={set("potentialConsequence")} options={POTENTIAL_CONSEQUENCES} />
        <Input label="Initial Severity (1–5)" value={form.initSeverity} onChange={v => set("initSeverity")(Number(v))} options={["1", "2", "3", "4", "5"]} />
        <Input label="Initial Likelihood (1–5)" value={form.initLikelihood} onChange={v => set("initLikelihood")(Number(v))} options={["1", "2", "3", "4", "5"]} />
      </div>
      <div style={{ margin: "12px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#64748b", fontSize: 12 }}>Initial Risk Score:</span><RiskBadge s={form.initSeverity} l={form.initLikelihood} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1/-1" }}><Input label="Existing Controls" value={form.existingControls} onChange={set("existingControls")} rows={2} /></div>
        <div style={{ gridColumn: "1/-1" }}><Input label="Additional Mitigation Required" value={form.additionalMitigation} onChange={set("additionalMitigation")} rows={2} /></div>
        <Input label="Action Owner" value={form.actionOwner} onChange={set("actionOwner")} options={ACTION_OWNERS} />
        <Input label="Target Completion Date" value={form.targetDate} onChange={set("targetDate")} type="date" />
        <Input label="Status" value={form.status} onChange={set("status")} options={RISK_STATUSES} />
        <Input label="Date Action Implemented" value={form.dateImplemented} onChange={set("dateImplemented")} type="date" />
        <Input label="Residual Severity (1–5)" value={form.residualSeverity || ""} onChange={v => set("residualSeverity")(Number(v) || null)} options={["", "1", "2", "3", "4", "5"]} />
        <Input label="Residual Likelihood (1–5)" value={form.residualLikelihood || ""} onChange={v => set("residualLikelihood")(Number(v) || null)} options={["", "1", "2", "3", "4", "5"]} />
      </div>
      {form.residualSeverity && form.residualLikelihood && <div style={{ margin: "12px 0", display: "flex", alignItems: "center", gap: 12 }}><span style={{ color: "#64748b", fontSize: 12 }}>Residual Risk Score:</span><RiskBadge s={form.residualSeverity} l={form.residualLikelihood} /></div>}
      <div style={{ marginTop: 14 }}><Input label="Monitoring Method" value={form.monitoringMethod} onChange={set("monitoringMethod")} rows={2} /></div>
      <button onClick={() => onSave(form)} style={{ ...btnPrimary, marginTop: 18 }}>{isNew ? "✓ Save to Risk Register" : "Save Changes"}</button>
      {!isNew && (
        <div style={{ marginTop: 24, padding: 16, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "1px", textTransform: "uppercase" }}>Actions for this Risk</span>
            <button onClick={() => setShowActionForm(v => !v)} style={{ ...btnSmall, background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
              {showActionForm ? "✕ Cancel" : "＋ Create Action"}
            </button>
          </div>
          {showActionForm && (
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1" }}><Input label="Action Description" value={actionForm.description} onChange={setAct("description")} rows={2} /></div>
              <Input label="Action Owner" value={actionForm.owner} onChange={setAct("owner")} options={["", ...ACTION_OWNERS]} />
              <Input label="Target Date" value={actionForm.targetDate} onChange={setAct("targetDate")} type="date" />
              <Input label="Priority" value={actionForm.priority} onChange={setAct("priority")} options={["LOW", "MEDIUM", "HIGH"]} />
              <Input label="Status" value={actionForm.status} onChange={setAct("status")} options={["Open", "In Progress", "Closed"]} />
              <div style={{ gridColumn: "1/-1" }}>
                <button onClick={() => { onAddAction({ ...actionForm, hazardId: form.id }); setActionForm({ description: "", owner: form.actionOwner || "", targetDate: "", priority: "MEDIUM", status: "Open" }); setShowActionForm(false); }} style={{ ...btnPrimary, background: "#7c3aed" }}>＋ Add Action</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Action Log ────────────────────────────────────────────────────────────────
function ActionLog({ actions, setActions, risks, onAudit }) {
  const [editing, setEditing] = useState(null);
  const [filterOwner, setFilterOwner] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirmDeleteAction, setConfirmDeleteAction] = useState(null);
  const active = actions.filter(a => !a.deletedAt);
  const deleted = actions.filter(a => !!a.deletedAt);
  const list = showDeleted ? deleted : active;
  const owners = [...new Set(active.map(a => a.owner))];
  const filtered = list.filter(a => (!filterOwner || a.owner === filterOwner) && (!filterStatus || a.status === filterStatus));
  const save = updated => {
    setActions(prev => prev.map(a => a.id === updated.id ? updated : a));
    onAudit("ACTION_UPDATED", "Action Log", `Updated action ${updated.id}: ${updated.description?.slice(0, 60)}`, updated.id);
    setEditing(null);
  };
  const doDelete = id => {
    const action = actions.find(a => a.id === id);
    setActions(prev => prev.map(a => a.id === id ? { ...a, deletedAt: new Date().toISOString() } : a));
    onAudit("ACTION_DELETED", "Action Log", `Deleted action ${id}: ${action?.description?.slice(0, 60)}`, id);
    setConfirmDeleteAction(null);
  };
  const doRestore = id => {
    const action = actions.find(a => a.id === id);
    setActions(prev => prev.map(a => a.id === id ? { ...a, deletedAt: null } : a));
    onAudit("ACTION_RESTORED", "Action Log", `Restored action ${id}: ${action?.description?.slice(0, 60)}`, id);
  };
  if (editing) return <ActionEditor action={editing} risks={risks} onSave={save} onCancel={() => setEditing(null)} />;
  return (
    <div>
      {confirmDeleteAction && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f172a", border: "1px solid #ef4444", borderRadius: 10, padding: 28, maxWidth: 400, width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Delete Action?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>This will move action <strong style={{ color: "#38bdf8" }}>{confirmDeleteAction.id}</strong> to Recently Deleted where it can be restored.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => doDelete(confirmDeleteAction.id)} style={{ ...btnPrimary, background: "#ef4444" }}>Yes, Delete</button>
              <button onClick={() => setConfirmDeleteAction(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ ...h2Style, marginBottom: 0 }}>Action Log ({filtered.length})</h2>
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={{ ...inputStyle, width: 160 }}><option value="">All Owners</option>{owners.map(o => <option key={o} value={o}>{o}</option>)}</select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 160 }}><option value="">All Statuses</option>{["Open", "In Progress", "Closed"].map(s => <option key={s} value={s}>{s}</option>)}</select>
        <button onClick={() => setShowDeleted(v => !v)} style={{ ...btnSmall, background: showDeleted ? "#7c3aed22" : "#1e293b", color: showDeleted ? "#a78bfa" : "#94a3b8", border: showDeleted ? "1px solid #7c3aed44" : "1px solid #334155" }}>
          🗑 Recently Deleted {deleted.length > 0 && `(${deleted.length})`}
        </button>
      </div>
      {showDeleted && (
        <div style={{ background: "#1c0a2e", border: "1px solid #7c3aed44", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#a78bfa" }}>
          Showing recently deleted actions. Click Restore to recover any item.
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead><tr>{["Action ID", "Hazard ID", "Description", "Owner", "Target Date", "Priority", "Status", "Overdue", ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(a => { const od = isOverdue(a.targetDate, a.status); return (
            <tr key={a.id} style={{ background: od && !a.deletedAt ? "#450a0a22" : undefined, opacity: a.deletedAt ? 0.6 : 1 }}>
              <td style={tdStyle}><span style={{ color: "#38bdf8", fontWeight: 700 }}>{a.id}</span></td>
              <td style={tdStyle}><span style={{ color: "#a78bfa" }}>{a.hazardId}</span></td>
              <td style={{ ...tdStyle, maxWidth: 260 }}>{a.description}</td>
              <td style={tdStyle}>{a.owner}</td>
              <td style={tdStyle}>{fmt(a.targetDate)}</td>
              <td style={tdStyle}><PriBadge p={a.priority} /></td>
              <td style={tdStyle}><StatusBadge status={a.status} /></td>
              <td style={tdStyle}>{od && !a.deletedAt && <Badge color="#ef4444">OVERDUE</Badge>}</td>
              <td style={tdStyle}>
                <div style={{ display: "flex", gap: 6 }}>
                  {a.deletedAt ? (
                    <button onClick={() => doRestore(a.id)} style={{ ...btnSmall, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44" }}>↩ Restore</button>
                  ) : (
                    <>
                      <button onClick={() => setEditing(a)} style={btnSmall}>Edit</button>
                      <button onClick={() => setConfirmDeleteAction(a)} style={{ ...btnSmall, background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444" }}>🗑</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ); })}</tbody>
        </table>
      </div>
    </div>
  );
}

function ActionEditor({ action, risks, onSave, onCancel }) {
  const [form, setForm] = useState({ ...action });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={h2Style}>Edit Action – {form.id}</h2>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input label="Linked Hazard ID" value={form.hazardId} onChange={set("hazardId")} options={risks.map(r => r.id)} />
        <Input label="Action Owner" value={form.owner} onChange={set("owner")} options={ACTION_OWNERS} />
        <div style={{ gridColumn: "1/-1" }}><Input label="Action Description" value={form.description} onChange={set("description")} rows={2} /></div>
        <Input label="Target Date" value={form.targetDate} onChange={set("targetDate")} type="date" />
        <Input label="Priority" value={form.priority} onChange={set("priority")} options={["LOW", "MEDIUM", "HIGH"]} />
        <Input label="Status" value={form.status} onChange={set("status")} options={["Open", "In Progress", "Closed"]} />
        <Input label="Closed Date" value={form.closedDate} onChange={set("closedDate")} type="date" />
        <div style={{ gridColumn: "1/-1" }}><Input label="Evidence / Closure Notes" value={form.evidence} onChange={set("evidence")} rows={3} /></div>
      </div>
      <button onClick={() => onSave(form)} style={{ ...btnPrimary, marginTop: 18 }}>Save Changes</button>
    </div>
  );
}

// ── Excel Import ──────────────────────────────────────────────────────────────
function ExcelImport({ reports, onImport }) {
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setStatus(null); setPreview(null);
    try {
      const { read, utils } = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { defval: "" });
      if (!rows.length) { setStatus({ ok: false, msg: "No data found in file." }); return; }
      const first = rows[0]; const keys = Object.keys(first);
      const find = (...terms) => keys.find(k => terms.some(t => k.toLowerCase().includes(t.toLowerCase()))) || "";
      const titleCol = find("title", "brief"); const dateCol = find("date of incident", "incident date", "date");
      const locationCol = find("location", "where", "place"); const aircraftCol = find("aircraft", "reg");
      const picCol = find("pic", "who was"); const whatCol = find("what happened", "factual", "what");
      const reporterCol = find("reporter", "name", "contact", "details"); const submittedCol = find("start time", "submitted", "completion");
      if (!titleCol && !whatCol) { setStatus({ ok: false, msg: "Could not recognise this file format." }); return; }
      const candidates = rows.map((row, i) => ({
        _rowIndex: i,
        submittedAt: submittedCol && row[submittedCol] ? new Date(row[submittedCol]).toISOString() : new Date().toISOString(),
        incidentDate: dateCol && row[dateCol] ? formatExcelDate(row[dateCol]) : "",
        title: titleCol ? String(row[titleCol] || "").trim() : "",
        location: locationCol ? String(row[locationCol] || "").trim() : "",
        aircraft: aircraftCol ? String(row[aircraftCol] || "").trim() : "",
        picType: picCol ? String(row[picCol] || "").trim() : "",
        operationalArea: "",
        what: whatCol ? String(row[whatCol] || "").trim() : "",
        reporterDetails: reporterCol ? String(row[reporterCol] || "").trim() : "",
        source: "excel-import",
      }));
      const existingKeys = new Set(reports.map(r => dedupeKey(r)));
      const newOnes = candidates.filter(c => !existingKeys.has(dedupeKey(c)));
      const dupes = candidates.length - newOnes.length;
      setPreview({ candidates, newOnes, dupes, totalRows: rows.length });
    } catch (err) { setStatus({ ok: false, msg: "Error reading file: " + err.message }); }
    e.target.value = "";
  };
  const dedupeKey = (r) => `${r.incidentDate}__${String(r.title || "").trim().toLowerCase().slice(0, 40)}`;
  const formatExcelDate = (val) => {
    if (!val) return "";
    if (typeof val === "number") { const d = new Date((val - 25569) * 86400 * 1000); return d.toISOString().slice(0, 10); }
    try { return new Date(val).toISOString().slice(0, 10); } catch { return String(val); }
  };
  const confirmImport = () => {
    if (!preview?.newOnes?.length) return;
    setImporting(true);
    onImport(preview.newOnes);
    setStatus({ ok: true, msg: `✅ ${preview.newOnes.length} new report${preview.newOnes.length !== 1 ? "s" : ""} imported successfully. ${preview.dupes > 0 ? `${preview.dupes} duplicate${preview.dupes !== 1 ? "s" : ""} skipped.` : ""}` });
    setPreview(null); setImporting(false);
  };
  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={h2Style}>📥 Import from Microsoft Forms Excel</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Download your responses from Microsoft Forms as Excel, then drag the file here. The app will automatically skip any reports already in the system.</p>
      <div style={{ background: "#0f172a", border: "2px dashed #334155", borderRadius: 10, padding: "32px 24px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>Drag your Excel file here or click to browse</div>
        <label style={{ ...btnPrimary, cursor: "pointer", display: "inline-block" }}>
          Choose Excel File
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
        </label>
      </div>
      {status && <div style={{ background: status.ok ? "#14532d" : "#450a0a", border: `1px solid ${status.ok ? "#22c55e" : "#ef4444"}`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: status.ok ? "#86efac" : "#fca5a5", fontSize: 13 }}>{status.msg}</div>}
      {preview && (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>Preview</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[{ v: preview.totalRows, l: "ROWS IN FILE", c: "#38bdf8" }, { v: preview.newOnes.length, l: "NEW TO IMPORT", c: "#22c55e" }, { v: preview.dupes, l: "DUPLICATES SKIPPED", c: "#f59e0b" }].map(({ v, l, c }) => (
              <div key={l} style={{ background: "#020617", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: c, fontFamily: "'Bebas Neue', sans-serif" }}>{v}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{l}</div>
              </div>
            ))}
          </div>
          {preview.newOnes.length > 0 ? (
            <>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>New reports to be added:</div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
                {preview.newOnes.map((r, i) => (
                  <div key={i} style={{ borderLeft: "3px solid #22c55e", paddingLeft: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{r.title || "Untitled"}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{fmt(r.incidentDate)} · {r.aircraft || "No aircraft"}</div>
                  </div>
                ))}
              </div>
              <button onClick={confirmImport} disabled={importing} style={{ ...btnPrimary, background: "#22c55e" }}>✓ Import {preview.newOnes.length} New Report{preview.newOnes.length !== 1 ? "s" : ""}</button>
            </>
          ) : (
            <div style={{ color: "#f59e0b", fontSize: 13 }}>⚠ All {preview.totalRows} rows already exist — nothing new to import.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Backups ───────────────────────────────────────────────────────────────────
function BackupsTab({ onRestore }) {
  const [backups, setBackups] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  useEffect(() => { loadBackups().then(b => { setBackups(b); setLoading(false); }); }, []);
  const doRestore = async (backup) => { setRestoring(true); await onRestore(backup); setConfirmRestore(null); setRestoring(false); };
  return (
    <div style={{ maxWidth: 780 }}>
      {confirmRestore && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f172a", border: "1px solid #f59e0b", borderRadius: 10, padding: 28, maxWidth: 440, width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>⚠ Restore this Backup?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>This will replace all current reports, risks, and actions with the backup taken on:</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 20 }}>{fmtFull(confirmRestore.takenAt)}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>A backup of your current data will be taken automatically before restoring.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => doRestore(confirmRestore)} disabled={restoring} style={{ ...btnPrimary, background: "#f59e0b", color: "#000" }}>{restoring ? "Restoring…" : "Yes, Restore"}</button>
              <button onClick={() => setConfirmRestore(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <h2 style={h2Style}>🔄 Backups & Recovery</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>The system automatically backs up all data on every login and every 24 hours. The last {BACKUP_SLOTS} backups are stored.</p>
      {loading ? <div style={{ color: "#475569", fontSize: 13 }}>Loading backups…</div> : backups.length === 0 ? (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 24, color: "#475569", fontSize: 13 }}>No backups yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {backups.map((b, i) => (
            <div key={b.slot} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{i === 0 && <Badge color="#22c55e">Latest</Badge>} Backup — Slot {b.slot}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{fmtFull(b.takenAt)}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{b.reports?.length ?? 0} reports · {b.risks?.length ?? 0} risks · {b.actions?.length ?? 0} actions</div>
              </div>
              <button onClick={() => setConfirmRestore(b)} style={{ ...btnSmall, background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }}>↩ Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
function ExportTab({ reports, risks, actions }) {
  const [exporting, setExporting] = useState(false);
  const doExport = async (activeOnly) => {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const r = activeOnly ? reports.filter(x => !x.deletedAt) : reports;
      const ri = activeOnly ? risks.filter(x => !x.deletedAt) : risks;
      const a = activeOnly ? actions.filter(x => !x.deletedAt) : actions;
      const reportRows = r.map(x => ({ "ID": x.id, "Submitted At": x.submittedAt ? new Date(x.submittedAt).toLocaleString("en-GB") : "", "Incident Date": x.incidentDate ? new Date(x.incidentDate).toLocaleDateString("en-GB") : "", "Title": x.title, "Location": x.location, "Aircraft": x.aircraft, "PIC Type": x.picType, "Operational Area": x.operationalArea, "What Happened": x.what, "Reporter Details": x.reporterDetails, "Source": x.source, "Acknowledged": x.acknowledged ? "Yes" : "No", "Deleted": x.deletedAt ? new Date(x.deletedAt).toLocaleString("en-GB") : "" }));
      const riskRows = ri.map(x => ({ "Hazard ID": x.id, "Report ID": x.reportId, "Date Identified": x.dateIdentified ? new Date(x.dateIdentified).toLocaleDateString("en-GB") : "", "Aircraft": x.aircraft, "Hazard Description": x.hazardDescription, "Hazard Category": x.hazardCategory, "Initial Severity": x.initSeverity, "Initial Likelihood": x.initLikelihood, "Initial Risk Score": (x.initSeverity || 0) * (x.initLikelihood || 0), "Status": x.status, "Residual Severity": x.residualSeverity || "", "Residual Likelihood": x.residualLikelihood || "", "Residual Risk Score": x.residualSeverity && x.residualLikelihood ? x.residualSeverity * x.residualLikelihood : "" }));
      const actionRows = a.map(x => ({ "Action ID": x.id, "Hazard ID": x.hazardId, "Description": x.description, "Owner": x.owner, "Target Date": x.targetDate ? new Date(x.targetDate).toLocaleDateString("en-GB") : "", "Priority": x.priority, "Status": x.status, "Evidence": x.evidence, "Overdue": x.status !== "Closed" && x.targetDate && new Date(x.targetDate) < new Date() ? "Yes" : "No" }));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, utils.json_to_sheet(reportRows), "Raw Reports");
      utils.book_append_sheet(wb, utils.json_to_sheet(riskRows), "Risk Register");
      utils.book_append_sheet(wb, utils.json_to_sheet(actionRows), "Action Log");
      const date = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
      writeFile(wb, `LSA-SMS-Export-${activeOnly ? "Active" : "Full"}-${date}.xlsx`);
    } catch (err) { alert("Export failed: " + err.message); }
    setExporting(false);
  };
  const activeReports = reports.filter(r => !r.deletedAt);
  const activeRisks = risks.filter(r => !r.deletedAt);
  const activeActions = actions.filter(a => !a.deletedAt);
  return (
    <div style={{ maxWidth: 680 }}>
      <h2 style={h2Style}>📤 Export Data</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 32 }}>Download all SMS data as an Excel file with three sheets.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#0f172a", border: "1px solid #22c55e33", borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Active Records</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Excludes deleted items.</div>
          {[{ label: "Reports", count: activeReports.length, color: "#38bdf8" }, { label: "Risks", count: activeRisks.length, color: "#a78bfa" }, { label: "Actions", count: activeActions.length, color: "#22c55e" }].map(({ label, count, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ color: "#64748b" }}>{label}</span><span style={{ color, fontWeight: 700 }}>{count} records</span></div>
          ))}
          <button onClick={() => doExport(true)} disabled={exporting} style={{ ...btnPrimary, width: "100%", background: "#22c55e", fontSize: 13, marginTop: 16 }}>{exporting ? "Exporting…" : "⬇ Download Active Export"}</button>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #38bdf833", borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🗄️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Full Backup Export</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Includes deleted items.</div>
          {[{ label: "Reports", count: reports.length, color: "#38bdf8" }, { label: "Risks", count: risks.length, color: "#a78bfa" }, { label: "Actions", count: actions.length, color: "#22c55e" }].map(({ label, count, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ color: "#64748b" }}>{label}</span><span style={{ color, fontWeight: 700 }}>{count} records</span></div>
          ))}
          <button onClick={() => doExport(false)} disabled={exporting} style={{ ...btnPrimary, width: "100%", fontSize: 13, marginTop: 16 }}>{exporting ? "Exporting…" : "⬇ Download Full Export"}</button>
        </div>
      </div>
    </div>
  );
}

// ── AI Analysis ───────────────────────────────────────────────────────────────
function AIAnalysis({ reports, risks, actions }) {
  const [copied, setCopied] = useState(false);
  const activeReports = reports.filter(r => !r.deletedAt);
  const activeRisks = risks.filter(r => !r.deletedAt);
  const activeActions = actions.filter(a => !a.deletedAt);
  const buildPrompt = () => `You are a General Aviation safety expert with 25 years of experience in aviation safety management, regulatory compliance, and risk assessment. You are presenting to a Safety Review Board for a GA flying school (LS Airmotive) based at Oxford Airport (EGTK).\n\nHere is the complete SMS data for this organisation:\n\nREPORTS (${activeReports.length} total):\n${JSON.stringify(activeReports, null, 2)}\n\nRISK REGISTER (${activeRisks.length} entries):\n${JSON.stringify(activeRisks, null, 2)}\n\nACTION LOG (${activeActions.length} actions):\n${JSON.stringify(activeActions, null, 2)}\n\nPlease provide a comprehensive Safety Review Board briefing covering:\n\n1. EXECUTIVE SUMMARY\n2. KEY METRICS\n3. TREND ANALYSIS\n4. RISKS REQUIRING BOARD ATTENTION\n5. OVERDUE ACTIONS\n6. BOARD DISCUSSION POINTS\n7. POSITIVE INDICATORS\n8. CONCLUSION\n\nBe direct, professional, and specific. Reference actual data points, hazard IDs, aircraft registrations, and dates where relevant.`;
  const copyPrompt = () => { navigator.clipboard.writeText(buildPrompt()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); }); };
  return (
    <div style={{ maxWidth: 780 }}>
      <h2 style={h2Style}>🤖 AI Safety Analysis</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Generate a comprehensive Safety Review Board briefing from your live SMS data using Claude AI.</p>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[{ label: "Reports", count: activeReports.length, color: "#38bdf8" }, { label: "Risks", count: activeRisks.length, color: "#a78bfa" }, { label: "Actions", count: activeActions.length, color: "#22c55e" }].map(({ label, count, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Bebas Neue',sans-serif", lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: ".5px", marginTop: 4 }}>{label} included</div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={copyPrompt} style={{ ...btnPrimary, background: copied ? "#22c55e" : "#7c3aed", fontSize: 14, padding: "14px 32px", width: "100%" }}>
        {copied ? "✓ Copied! Now paste into Claude.ai" : "📋 Copy Analysis Prompt to Clipboard"}
      </button>
      {copied && <div style={{ background: "#14532d", border: "1px solid #22c55e", borderRadius: 8, padding: "12px 16px", marginTop: 16, fontSize: 13, color: "#86efac" }}>✓ Prompt copied — open <strong>claude.ai</strong>, start a new chat, and paste it in.</div>}
    </div>
  );
}

// ── Team Members ─────────────────────────────────────────────────────────────
function TeamMembers({ team, setTeam, actions }) {
  const blank = { name: "", email: "" };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(blank);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saved, setSaved] = useState(false);
  const activeActions = actions.filter(a => !a.deletedAt && a.status !== "Closed");
  const addMember = () => {
    if (!form.name.trim() || !form.email.trim()) return alert("Please enter both a name and email address.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return alert("Please enter a valid email address.");
    setTeam(prev => [...(prev || []), { id: Date.now(), name: form.name.trim(), email: form.email.trim() }]);
    setForm(blank); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const saveEdit = (id) => {
    if (!editForm.name.trim() || !editForm.email.trim()) return alert("Please enter both a name and email address.");
    setTeam(prev => prev.map(m => m.id === id ? { ...m, name: editForm.name.trim(), email: editForm.email.trim() } : m));
    setEditingId(null);
  };
  const doDelete = (id) => { setTeam(prev => prev.filter(m => m.id !== id)); setConfirmDelete(null); };
  const getMemberActions = (name) => activeActions.filter(a => a.owner === name);
  const getOverdue = (name) => activeActions.filter(a => a.owner === name && isOverdue(a.targetDate, a.status));
  return (
    <div style={{ maxWidth: 780 }}>
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f172a", border: "1px solid #ef4444", borderRadius: 10, padding: 28, maxWidth: 400, width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Remove Team Member?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Remove <strong style={{ color: "#38bdf8" }}>{confirmDelete.name}</strong>? They will no longer receive email notifications.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => doDelete(confirmDelete.id)} style={{ ...btnPrimary, background: "#ef4444" }}>Yes, Remove</button>
              <button onClick={() => setConfirmDelete(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <h2 style={h2Style}>👥 Team Members</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Manage people who can be assigned actions. Names must exactly match action owner names in the Action Log.</p>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "20px", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14 }}>Add New Member</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Full Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tom Newell" style={inputStyle} onKeyDown={e => e.key === "Enter" && addMember()} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Email Address</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. tom@lsairmotive.co.uk" style={inputStyle} onKeyDown={e => e.key === "Enter" && addMember()} />
          </div>
          <button onClick={addMember} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>＋ Add</button>
        </div>
        {saved && <div style={{ fontSize: 12, color: "#22c55e", marginTop: 10 }}>✓ Member added.</div>}
      </div>
      {(!team || team.length === 0) ? (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 24, color: "#475569", fontSize: 13, textAlign: "center" }}>No team members yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {team.map(member => {
            const memberActions = getMemberActions(member.name);
            const overdue = getOverdue(member.name);
            const isEditing = editingId === member.id;
            return (
              <div key={member.id} style={{ background: "#0f172a", border: `1px solid ${overdue.length > 0 ? "#ef444433" : "#1e293b"}`, borderRadius: 10, padding: "16px 20px" }}>
                {isEditing ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, alignItems: "center" }}>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
                    <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                    <button onClick={() => saveEdit(member.id)} style={{ ...btnSmall, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44" }}>✓ Save</button>
                    <button onClick={() => setEditingId(null)} style={btnSmall}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{member.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{member.email}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {memberActions.length > 0 ? <Badge color="#38bdf8">{memberActions.length} open action{memberActions.length !== 1 ? "s" : ""}</Badge> : <span style={{ fontSize: 11, color: "#475569" }}>No open actions</span>}
                        {overdue.length > 0 && <Badge color="#ef4444">{overdue.length} overdue</Badge>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setEditingId(member.id); setEditForm({ name: member.name, email: member.email }); }} style={btnSmall}>Edit</button>
                      <button onClick={() => setConfirmDelete(member)} style={{ ...btnSmall, background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444" }}>🗑</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Users Tab (admin only) ────────────────────────────────────────────────────
function UsersTab({ currentUser, onAudit }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const blank = { name: "", email: "", role: "member", tempPassword: "" };
  const [form, setForm] = useState(blank);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [resetPass, setResetPass] = useState({});

  const headers = { "Content-Type": "application/json", ...authHeaders() };

  useEffect(() => {
    fetch("/api/users", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d); else setError(d.error); })
      .finally(() => setLoading(false));
  }, []);

  const addUser = async () => {
    if (!form.name || !form.email || !form.tempPassword) return alert("Please fill in all fields.");
    setSaving(true);
    const res = await fetch("/api/users", { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); setSaving(false); return; }
    setUsers(prev => [...prev, data]);
    setForm(blank); setShowAdd(false); setSaving(false);
    onAudit("USER_CREATED", "Users", `Created user: ${form.name} (${form.email})`, data.id);
  };

  const saveEdit = async (id) => {
    setSaving(true);
    const payload = { id, ...editForm };
    const res = await fetch("/api/users", { method: "PUT", headers, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); setSaving(false); return; }
    setUsers(prev => prev.map(u => u.id === id ? data : u));
    setEditingId(null); setSaving(false);
  };

  const deleteUser = async (id) => {
    const user = users.find(u => u.id === id);
    const res = await fetch("/api/users", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setUsers(prev => prev.filter(u => u.id !== id));
    setConfirmDelete(null);
    onAudit("USER_DELETED", "Users", `Deleted user: ${user?.name}`, id);
  };

  const adminResetPassword = async (id, newPassword) => {
    if (!newPassword || newPassword.length < 8) return alert("Password must be at least 8 characters.");
    const user = users.find(u => u.id === id);
    const res = await fetch("/api/users", { method: "PUT", headers, body: JSON.stringify({ id, newPassword }) });
    if (!res.ok) { alert("Failed to reset password"); return; }
    setResetPass({});
    onAudit("PASSWORD_RESET_ADMIN", "Users", `Admin reset password for: ${user?.name}`, id);
    alert(`Password reset for ${user?.name}. They will be prompted to change it on next login.`);
  };

  if (loading) return <div style={{ color: "#475569", fontSize: 13 }}>Loading users…</div>;
  if (error) return <div style={{ color: "#ef4444", fontSize: 13 }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: 860 }}>
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f172a", border: "1px solid #ef4444", borderRadius: 10, padding: 28, maxWidth: 400, width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Delete User?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Remove <strong style={{ color: "#38bdf8" }}>{confirmDelete.name}</strong> ({confirmDelete.email})? They will lose access immediately.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => deleteUser(confirmDelete.id)} style={{ ...btnPrimary, background: "#ef4444" }}>Yes, Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ ...h2Style, marginBottom: 0 }}>👤 User Management</h2>
        <button onClick={() => setShowAdd(v => !v)} style={{ ...btnPrimary, background: showAdd ? "#334155" : "#0ea5e9" }}>
          {showAdd ? "✕ Cancel" : "＋ Add User"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "#0f172a", border: "1px solid #0ea5e944", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14 }}>New User</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
            <Input label="Email Address" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
            <Input label="Role" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={["member", "admin"]} />
            <Input label="Temporary Password" value={form.tempPassword} onChange={v => setForm(f => ({ ...f, tempPassword: v }))} type="password" required />
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 10, marginBottom: 14 }}>⚠ The user will be prompted to set their own password on first login.</div>
          <button onClick={addUser} disabled={saving} style={{ ...btnPrimary, background: "#22c55e" }}>{saving ? "Adding…" : "✓ Create User"}</button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>{["Name", "Email", "Role", "Status", "Created", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{u.name}</div>
                  {u.id === currentUser?.id && <div style={{ fontSize: 10, color: "#38bdf8" }}>← you</div>}
                </td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>
                  <Badge color={u.role === "admin" ? "#f59e0b" : "#38bdf8"}>{u.role}</Badge>
                </td>
                <td style={tdStyle}>
                  {u.mustChangePassword
                    ? <Badge color="#f59e0b">Must change password</Badge>
                    : <Badge color="#22c55e">Active</Badge>
                  }
                </td>
                <td style={tdStyle}>{fmt(u.createdAt)}</td>
                <td style={tdStyle}>
                  {editingId === u.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 260 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ ...inputStyle, fontSize: 12 }} />
                        <input value={editForm.email || ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" style={{ ...inputStyle, fontSize: 12 }} />
                        <select value={editForm.role || "member"} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, fontSize: 12 }}>
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveEdit(u.id)} disabled={saving} style={{ ...btnSmall, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44" }}>✓ Save</button>
                        <button onClick={() => setEditingId(null)} style={btnSmall}>✕</button>
                      </div>
                      {/* Admin password reset inline */}
                      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 8 }}>
                        <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Reset password:</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="password"
                            placeholder="New password (min 8 chars)"
                            value={resetPass[u.id] || ""}
                            onChange={e => setResetPass(p => ({ ...p, [u.id]: e.target.value }))}
                            style={{ ...inputStyle, fontSize: 12, flex: 1 }}
                          />
                          <button onClick={() => adminResetPassword(u.id, resetPass[u.id])} style={{ ...btnSmall, background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", whiteSpace: "nowrap" }}>Reset</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingId(u.id); setEditForm({ name: u.name, email: u.email, role: u.role }); }} style={btnSmall}>Edit</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => setConfirmDelete(u)} style={{ ...btnSmall, background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444" }}>🗑</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Audit Log Tab (admin only) ────────────────────────────────────────────────
function AuditLogTab() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterTab, setFilterTab] = useState("");

  useEffect(() => {
    fetch("/api/audit", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLog(d); })
      .finally(() => setLoading(false));
  }, []);

  const ACTION_COLORS = {
    LOGIN: "#22c55e", LOGOUT: "#64748b",
    REPORT_DELETED: "#ef4444", REPORT_RESTORED: "#22c55e", REPORT_SUBMITTED: "#38bdf8",
    RISK_DELETED: "#ef4444", RISK_RESTORED: "#22c55e", RISK_UPDATED: "#f59e0b", RISK_CREATED: "#38bdf8",
    ACTION_DELETED: "#ef4444", ACTION_RESTORED: "#22c55e", ACTION_UPDATED: "#f59e0b", ACTION_CREATED: "#38bdf8",
    BACKUP_RESTORE: "#f59e0b",
    USER_CREATED: "#38bdf8", USER_UPDATED: "#f59e0b", USER_DELETED: "#ef4444",
    PASSWORD_RESET: "#a78bfa", PASSWORD_CHANGED: "#a78bfa", PASSWORD_RESET_ADMIN: "#f59e0b",
  };

  const uniqueUsers = [...new Set(log.map(e => e.user))].filter(Boolean);
  const uniqueActions = [...new Set(log.map(e => e.action))].filter(Boolean);
  const uniqueTabs = [...new Set(log.map(e => e.tab))].filter(Boolean);

  const filtered = log.filter(e =>
    (!filterAction || e.action === filterAction) &&
    (!filterUser || e.user === filterUser) &&
    (!filterTab || e.tab === filterTab)
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ ...h2Style, marginBottom: 0 }}>📜 Audit Log ({filtered.length})</h2>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">All Users</option>{uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ ...inputStyle, width: 200 }}>
          <option value="">All Actions</option>{uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterTab} onChange={e => setFilterTab(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">All Tabs</option>{uniqueTabs.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {loading ? (
        <div style={{ color: "#475569", fontSize: 13 }}>Loading audit log…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 24, color: "#475569", fontSize: 13 }}>No audit entries yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Timestamp", "User", "Action", "Tab", "Detail", "Record ID"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: 11 }}>{fmtFull(e.timestamp)}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 12 }}>{e.user}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{e.email}</div>
                  </td>
                  <td style={tdStyle}>
                    <Badge color={ACTION_COLORS[e.action] || "#64748b"}>{e.action}</Badge>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{e.tab}</td>
                  <td style={{ ...tdStyle, maxWidth: 300, fontSize: 11 }}>{e.detail}</td>
                  <td style={{ ...tdStyle, fontSize: 11, fontFamily: "monospace" }}>{e.recordId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 16px", marginTop: 16, fontSize: 11, color: "#475569" }}>
        💡 The audit log is also synced to Google Sheets daily via Google Apps Script — check "LSA SMS Audit Log" in Drive for a permanent scrollable record.
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [reports, setReports] = useState(null);
  const [risks, setRisks] = useState(null);
  const [actions, setActions] = useState(null);
  const [team, setTeam] = useState(null);
  const [webhookSecret, setWebhookSecret] = useState("lsa-sms-secret");
  const [ready, setReady] = useState(false);

  // ── Auth check on mount ──
  useEffect(() => {
    const user = getStoredUser();
    if (!user) { router.replace("/"); return; }
    setCurrentUser(user);
  }, []);

  // ── Load data ──
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const [r, ri, a, s, t] = await Promise.all([
        loadFromStorage("sms:reports", SEED_REPORTS),
        loadFromStorage("sms:risks", SEED_RISKS),
        loadFromStorage("sms:actions", SEED_ACTIONS),
        loadFromStorage("sms:webhookSecret", "lsa-sms-secret"),
        loadFromStorage("sms:team", []),
      ]);
      setReports(r); setRisks(ri); setActions(a); setWebhookSecret(s); setTeam(t); setReady(true);
      takeBackup(r, ri, a);
    })();
  }, [currentUser]);

  // ── Persist on change ──
  useEffect(() => { if (reports) saveToStorage("sms:reports", reports); }, [reports]);
  useEffect(() => { if (risks) saveToStorage("sms:risks", risks); }, [risks]);
  useEffect(() => { if (actions) saveToStorage("sms:actions", actions); }, [actions]);
  useEffect(() => { if (team) saveToStorage("sms:team", team); }, [team]);
  useEffect(() => { saveToStorage("sms:webhookSecret", webhookSecret); }, [webhookSecret]);

  // ── Audit writer ──
  const onAudit = useCallback((action, tabName, detail, recordId = null) => {
    writeAudit(currentUser, action, tabName, detail, recordId);
  }, [currentUser]);

  // ── Logout ──
  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName: currentUser?.name, userEmail: currentUser?.email }),
    });
    localStorage.removeItem("sms_token");
    localStorage.removeItem("sms_user");
    router.replace("/");
  };

  const addReport = useCallback((form) => {
    setReports(prev => {
      const newId = Math.max(...prev.map(r => r.id), 0) + 1;
      const report = { id: newId, submittedAt: new Date().toISOString(), ...form };
      onAudit("REPORT_SUBMITTED", "Raw Reports", `Submitted report #${newId}: ${form.title}`, String(newId));
      return [...prev, report];
    });
  }, [onAudit]);

  const [raiseTarget, setRaiseTarget] = useState(null);

  const raiseToRiskRegister = useCallback((report) => {
    setRaiseTarget(report); setTab("riskregister");
  }, []);

  const handleRaiseSave = useCallback((newRisk) => {
    // Calculate the new risk ID synchronously from current risks state
    const newRiskId = "LS-SMS-" + String(Math.max(...risks.map(r => parseInt(r.id.split("-")[2] || 0)), 0) + 1).padStart(3, "0");
    const risk = { ...newRisk, id: newRiskId };

    // Save the risk
    setRisks(prev => {
      onAudit("RISK_CREATED", "Risk Register", `Created risk ${newRiskId} from report #${raiseTarget.id}: ${newRisk.hazardDescription?.slice(0, 60)}`, newRiskId);
      return [...prev, risk];
    });

    // Save any AI-selected actions, linked to the new risk ID
    const selectedActions = raiseTarget._selectedActions;
    if (selectedActions?.length > 0) {
      setActions(prev => {
        const nums = prev.map(a => parseInt((a.id || "ACT-000").split("-")[1] || 0));
        let nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
        const newActions = selectedActions.map(action => {
          const id = "ACT-" + String(nextNum++).padStart(3, "0");
          onAudit("ACTION_CREATED", "Action Log", `AI-suggested action ${id}: ${action.description?.slice(0, 60)}`, id);
          return { id, hazardId: newRiskId, description: action.description, owner: action.owner, priority: action.priority, status: "Open", targetDate: "", evidence: "", closedDate: "" };
        });
        return [...prev, ...newActions];
      });
    }

    setReports(prev => prev.map(r => r.id === raiseTarget.id ? { ...r, acknowledged: true } : r));
    onAudit("REPORT_ACKNOWLEDGED", "Raw Reports", `Acknowledged report #${raiseTarget.id}: ${raiseTarget.title}`, String(raiseTarget.id));
    setRaiseTarget(null);
  }, [risks, raiseTarget, onAudit]);

  const importReports = useCallback((newOnes) => {
    setReports(prev => {
      let nextId = Math.max(...prev.map(r => r.id), 0) + 1;
      const toAdd = newOnes.map(r => ({ ...r, id: nextId++, submittedAt: r.submittedAt || new Date().toISOString() }));
      onAudit("REPORTS_IMPORTED", "Import", `Imported ${newOnes.length} reports from Excel`, null);
      return [...prev, ...toAdd];
    });
  }, [onAudit]);

  const handleRestore = useCallback(async (backup) => {
    await takeBackup(reports, risks, actions);
    onAudit("BACKUP_RESTORE", "Backups", `Restored backup from ${fmtFull(backup.takenAt)} (slot ${backup.slot})`, String(backup.slot));
    setReports(backup.reports); setRisks(backup.risks); setActions(backup.actions);
    await saveToStorage("sms:reports", backup.reports);
    await saveToStorage("sms:risks", backup.risks);
    await saveToStorage("sms:actions", backup.actions);
    setTab("dashboard");
  }, [reports, risks, actions, onAudit]);

  if (!currentUser || !ready) return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontFamily: "sans-serif" }}>
      Loading…
    </div>
  );

  const isAdmin = currentUser?.role === "admin";

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "submit", label: "✈ Submit Report" },
    { id: "import", label: "📥 Import from Forms" },
    { id: "rawreports", label: "📋 Raw Reports" },
    { id: "riskregister", label: "⚠ Risk Register" },
    { id: "actionlog", label: "✅ Action Log" },
    { id: "backups", label: "🔄 Backups" },
    { id: "export", label: "📤 Export" },
    { id: "analysis", label: "🤖 AI Analysis" },
    { id: "team", label: "👥 Team Members" },
    ...(isAdmin ? [{ id: "users", label: "👤 Users" }, { id: "auditlog", label: "📜 Audit Log" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020617", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: "0 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ padding: "16px 0" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 2, color: "#38bdf8" }}>✈ LS AIRMOTIVE SAFETY MANAGEMENT SYSTEM</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              <span style={{ fontSize: 11, color: "#475569" }}>{reports?.filter(r => !r.deletedAt).length} reports</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, borderLeft: "1px solid #1e293b", paddingLeft: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{currentUser.name}</div>
                <div style={{ fontSize: 10, color: isAdmin ? "#f59e0b" : "#475569" }}>{isAdmin ? "Admin" : "Member"}</div>
              </div>
              <button onClick={handleLogout} style={{ ...btnSmall, background: "#1e293b", color: "#94a3b8" }}>Sign Out</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #0f172a", padding: "0 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 0, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #38bdf8" : "2px solid transparent", padding: "12px 16px", color: tab === t.id ? "#38bdf8" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: ".5px", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
        {tab === "dashboard" && <Dashboard reports={reports} risks={risks} actions={actions} />}
        {tab === "submit" && <SubmitReport onSubmit={addReport} />}
        {tab === "import" && <ExcelImport reports={reports} onImport={importReports} />}
        {tab === "rawreports" && <RawReports reports={reports} risks={risks} onRaise={raiseToRiskRegister} setReports={setReports} currentUser={currentUser} onAudit={onAudit} />}
        {tab === "riskregister" && <RiskRegister risks={risks} setRisks={setRisks} actions={actions} setActions={setActions} raiseTarget={raiseTarget} onRaiseSave={handleRaiseSave} onRaiseCancel={() => setRaiseTarget(null)} onAudit={onAudit} />}
        {tab === "actionlog" && <ActionLog actions={actions} setActions={setActions} risks={risks} onAudit={onAudit} />}
        {tab === "backups" && <BackupsTab onRestore={handleRestore} />}
        {tab === "export" && <ExportTab reports={reports} risks={risks} actions={actions} />}
        {tab === "analysis" && <AIAnalysis reports={reports} risks={risks} actions={actions} />}
        {tab === "team" && <TeamMembers team={team} setTeam={setTeam} actions={actions} />}
        {tab === "users" && isAdmin && <UsersTab currentUser={currentUser} onAudit={onAudit} />}
        {tab === "auditlog" && isAdmin && <AuditLogTab />}
      </div>
    </div>
  );
}
