"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── seed data (empty – data lives in Redis) ──────────────────────────────────
const SEED_REPORTS = [];
const SEED_RISKS = [];
const SEED_ACTIONS = [];

const ACTION_OWNERS = ["Tom Newell", "Tam Abrahams", "Joe Tomlin", "Liam Salt", "An Instructor"];
const HAZARD_CATEGORIES = ["Flight Operations – Airborne", "Flight Operations – Ground", "Aircraft & Technical", "Training & Supervision", "Human Factors", "Organisational / Administrative"];
const OPERATIONAL_AREAS = ["Pre-Flight / Dispatch", "Ground Handling", "Taxi Operations", "Take-off / Departure", "Circuit / Training Area Flying", "Navigation / En-route Flying", "Approach / Landing", "Aircraft Technical / Maintenance", "Air Traffic / Airspace", "Safety / Procedural", "Facilities / Airfield Environment", "Other / Not Listed"];
const POTENTIAL_CONSEQUENCES = ["Minor aircraft damage", "Significant aircraft damage", "Serious aircraft damage / hull loss", "Serious injury", "Fatal injury", "Airspace infringement", "Loss of separation", "CFIT / terrain conflict", "Loss of control in flight", "Loss of communications", "Regulatory non-compliance", "Reputational damage"];
const RISK_STATUSES = ["Open", "Under Review", "Mitigation In Progress", "Monitoring", "Closed"];
const PIC_TYPES = ["Instructor", "Solo Student", "Licence Holder", "Other"];

const riskScore = (s, l) => (s || 0) * (l || 0);
const riskLevel = score => { if (score <= 4) return { label: "Low", color: "#22c55e" }; if (score <= 9) return { label: "Medium", color: "#f59e0b" }; if (score <= 15) return { label: "High", color: "#ef4444" }; return { label: "Intolerable", color: "#7c3aed" }; };
const isOverdue = (targetDate, status) => !!(targetDate && status !== "Closed" && new Date(targetDate) < new Date());
const fmt = d => d ? new Date(d).toLocaleDateString("en-GB") : "—";

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
const StatusBadge = ({ status }) => { const m = { "Open":"#ef4444","Under Review":"#f59e0b","Mitigation In Progress":"#f59e0b","Monitoring":"#f59e0b","Closed":"#22c55e","In Progress":"#f59e0b" }; return <Badge color={m[status]||"#64748b"}>{status}</Badge>; };
const PriBadge = ({ p }) => { const m = { HIGH:"#ef4444", MEDIUM:"#f59e0b", LOW:"#22c55e" }; return <Badge color={m[p]||"#64748b"}>{p}</Badge>; };
const Input = ({ label, value, onChange, type="text", options, required, rows }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:".8px", textTransform:"uppercase" }}>{label}{required && <span style={{color:"#ef4444"}}> *</span>}</label>}
    {options ? <select value={value} onChange={e=>onChange(e.target.value)} style={inputStyle}><option value="">— select —</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>
     : rows ? <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} style={{...inputStyle,resize:"vertical"}} />
     : <input type={type} value={value} onChange={e=>onChange(e.target.value)} style={inputStyle} />}
  </div>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ reports, risks, actions }) {
  const closedRisks = risks.filter(r => r.status === "Closed").length;
  const openActions = actions.filter(a => a.status !== "Closed").length;
  const overdueActions = actions.filter(a => isOverdue(a.targetDate, a.status)).length;
  const highRisks = risks.filter(r => riskScore(r.initSeverity, r.initLikelihood) >= 10).length;
  const pendingReports = reports.filter(r => !r.acknowledged).length;
  const byCat = {}; risks.forEach(r => { byCat[r.hazardCategory] = (byCat[r.hazardCategory]||0)+1; });
  const catEntries = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const byAc = {}; risks.forEach(r => { byAc[r.aircraft] = (byAc[r.aircraft]||0)+1; });
  const acEntries = Object.entries(byAc).sort((a,b)=>b[1]-a[1]);
  const byMonth = {}; reports.forEach(r => { const m=r.incidentDate.slice(0,7); byMonth[m]=(byMonth[m]||0)+1; });
  const monthEntries = Object.entries(byMonth).sort();
  const maxCat = catEntries[0]?.[1]||1, maxAc = acEntries[0]?.[1]||1, maxMonth = Math.max(...Object.values(byMonth),1);
  const BAR_COLORS = ["#38bdf8","#a78bfa","#22c55e","#f59e0b","#ef4444","#818cf8","#34d399","#fb923c","#e879f9","#facc15","#60a5fa","#f472b6"];
  const attentionItems = [
    ...reports.filter(r=>!r.acknowledged).map(r=>({type:"report",label:`Report: ${r.title}`,sub:`#${r.id} · ${fmt(r.incidentDate)}`,color:"#f59e0b"})),
    ...actions.filter(a=>isOverdue(a.targetDate,a.status)).map(a=>({type:"action",label:`Overdue: ${a.description||a.id}`,sub:`${a.hazardId} · Due ${fmt(a.targetDate)}`,color:"#ef4444"})),
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:16}}>
        {[{label:"Total Reports",value:reports.length,color:"#38bdf8"},{label:"Pending Review",value:pendingReports,color:"#f59e0b"},{label:"Closed Risks",value:closedRisks,color:"#22c55e"},{label:"Open Actions",value:openActions,color:"#818cf8"},{label:"Overdue",value:overdueActions,color:"#ef4444"},{label:"High / Intolerable",value:highRisks,color:"#7c3aed"}].map(k=>(
          <div key={k.label} style={{background:"#0f172a",border:`1px solid ${k.color}33`,borderRadius:10,padding:"18px 20px"}}>
            <div style={{fontSize:32,fontWeight:800,color:k.color,fontFamily:"'Bebas Neue',sans-serif",lineHeight:1}}>{k.value}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4,letterSpacing:".5px",textTransform:"uppercase"}}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={cardStyle}>
          <div style={cardHead}>Reports by Hazard Category</div>
          {catEntries.length===0 && <div style={{color:"#475569",fontSize:13}}>No data yet.</div>}
          {catEntries.map(([cat,n])=>(
            <div key={cat} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:"#94a3b8"}}>{cat}</span><span style={{color:"#e2e8f0",fontWeight:700}}>{n}</span></div>
              <div style={{background:"#1e293b",borderRadius:4,height:6}}><div style={{width:`${(n/maxCat)*100}%`,height:6,background:"#38bdf8",borderRadius:4}}/></div>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <div style={cardHead}>Reports by Aircraft</div>
          {acEntries.length===0 && <div style={{color:"#475569",fontSize:13}}>No data yet.</div>}
          {acEntries.map(([ac,n])=>(
            <div key={ac} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:"#94a3b8"}}>{ac}</span><span style={{color:"#e2e8f0",fontWeight:700}}>{n}</span></div>
              <div style={{background:"#1e293b",borderRadius:4,height:6}}><div style={{width:`${(n/maxAc)*100}%`,height:6,background:"#a78bfa",borderRadius:4}}/></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={cardStyle}>
          <div style={cardHead}>Incidents by Month</div>
          {monthEntries.length===0 && <div style={{color:"#475569",fontSize:13}}>No data yet.</div>}
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:110,marginTop:12}}>
            {monthEntries.map(([m,n],i)=>(
              <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <span style={{fontSize:11,color:"#e2e8f0",fontWeight:700}}>{n}</span>
                <div style={{width:"100%",background:BAR_COLORS[i%BAR_COLORS.length],borderRadius:"4px 4px 0 0",height:`${Math.max((n/maxMonth)*70,4)}px`}}/>
                <span style={{fontSize:9,color:"#475569",textAlign:"center"}}>{m.slice(5)}/{m.slice(2,4)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardHead}>⚠ Items Needing Attention</div>
          {attentionItems.length===0
            ? <div style={{display:"flex",alignItems:"center",gap:8,color:"#22c55e",fontSize:13,fontWeight:600}}><span style={{fontSize:18}}>✓</span> All Clear — no pending reports or overdue actions.</div>
            : attentionItems.map((item,i)=>(
              <div key={i} style={{borderLeft:`3px solid ${item.color}`,paddingLeft:10,marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{item.label}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{item.sub}</div>
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
  const blank = {incidentDate:"",title:"",location:"",aircraft:"",picType:"",operationalArea:"",what:"",reporterDetails:""};
  const [form, setForm] = useState(blank);
  const [done, setDone] = useState(false);
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const submit = () => {
    if (!form.title||!form.incidentDate||!form.what) return alert("Please fill in required fields.");
    onSubmit({...form,source:"manual"}); setForm(blank); setDone(true); setTimeout(()=>setDone(false),4000);
  };
  return (
    <div style={{maxWidth:720}}>
      <h2 style={h2Style}>Submit a Safety Report</h2>
      <p style={{color:"#64748b",marginBottom:20,fontSize:13}}>All reports are treated confidentially. You may remain anonymous.</p>
      {done && <div style={{background:"#14532d",border:"1px solid #22c55e",borderRadius:8,padding:"12px 16px",marginBottom:16,color:"#86efac"}}>✓ Report submitted successfully.</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Input label="Date of Incident" value={form.incidentDate} onChange={set("incidentDate")} type="date" required />
        <Input label="Aircraft Registration" value={form.aircraft} onChange={set("aircraft")} />
        <div style={{gridColumn:"1/-1"}}><Input label="Brief Title of Incident" value={form.title} onChange={set("title")} required /></div>
        <Input label="Location" value={form.location} onChange={set("location")} />
        <Input label="PIC Type" value={form.picType} onChange={set("picType")} options={PIC_TYPES} />
        <Input label="Operational Area" value={form.operationalArea} onChange={set("operationalArea")} options={["", ...OPERATIONAL_AREAS]} />
        <div style={{gridColumn:"1/-1"}}><Input label="What happened (factual recap)" value={form.what} onChange={set("what")} rows={5} required /></div>
        <div style={{gridColumn:"1/-1"}}><Input label="Reporter Details (optional)" value={form.reporterDetails} onChange={set("reporterDetails")} /></div>
      </div>
      <button onClick={submit} style={{...btnPrimary,marginTop:16}}>Submit Report</button>
    </div>
  );
}

// ── Raw Reports ───────────────────────────────────────────────────────────────
function RawReports({ reports, onRaise, setReports }) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const filtered = reports.filter(r=>r.title.toLowerCase().includes(search.toLowerCase())||r.aircraft.toLowerCase().includes(search.toLowerCase()));
  const doDelete = id => { setReports(prev=>prev.filter(r=>r.id!==id)); setConfirmDelete(null); };
  return (
    <div>
      {confirmDelete && (
        <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#0f172a",border:"1px solid #ef4444",borderRadius:10,padding:28,maxWidth:400,width:"90%"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#e2e8f0",marginBottom:8}}>Delete Report?</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:20}}>Are you sure you want to delete report <strong style={{color:"#38bdf8"}}>#{confirmDelete.id} — {confirmDelete.title}</strong>? This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>doDelete(confirmDelete.id)} style={{...btnPrimary,background:"#ef4444"}}>Yes, Delete</button>
              <button onClick={()=>setConfirmDelete(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={h2Style}>Raw Reports ({filtered.length})</h2>
        <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle,width:200}} />
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={tableStyle}>
          <thead><tr>{["ID","Source","Date","Title","Aircraft","Location","PIC Type","Reporter","Status",""].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(r=>(
            <tr key={r.id}>
              <td style={tdStyle}>{r.id}</td>
              <td style={tdStyle}>{r.source==="forms"?<Badge color="#818cf8">MS Forms</Badge>:r.source==="manual"?<Badge color="#38bdf8">Manual</Badge>:r.source==="excel-import"?<Badge color="#38bdf8">Import</Badge>:<Badge color="#475569">Excel</Badge>}</td>
              <td style={tdStyle}>{fmt(r.incidentDate)}</td>
              <td style={{...tdStyle,maxWidth:220}}>{r.title}</td>
              <td style={tdStyle}>{r.aircraft}</td>
              <td style={tdStyle}>{r.location}</td>
              <td style={tdStyle}>{r.picType}</td>
              <td style={tdStyle}>{r.reporterDetails||<span style={{color:"#475569"}}>Anonymous</span>}</td>
              <td style={tdStyle}>{r.acknowledged ? <Badge color="#22c55e">✓ Acknowledged</Badge> : <Badge color="#f59e0b">Pending Review</Badge>}</td>
              <td style={tdStyle}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {!r.acknowledged && (
                    <button onClick={()=>onRaise(r)} style={{...btnSmall,background:"#0ea5e933",color:"#38bdf8",border:"1px solid #0ea5e955"}}>↗ Raise</button>
                  )}
                  <button onClick={()=>setConfirmDelete(r)} style={{...btnSmall,background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444"}}>🗑</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Risk Register ─────────────────────────────────────────────────────────────
function RiskRegister({ risks, setRisks, actions, setActions, raiseTarget, onRaiseSave, onRaiseCancel }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmDeleteRisk, setConfirmDeleteRisk] = useState(null);
  const filtered = risks.filter(r=>(!search||(r.id+r.hazardDescription+r.aircraft).toLowerCase().includes(search.toLowerCase()))&&(!filterStatus||r.status===filterStatus));
  const save = updated => { setRisks(prev=>prev.map(r=>r.id===updated.id?updated:r)); setEditing(null); };
  const addAction = newAction => {
    setActions(prev => {
      const nums = prev.map(a=>parseInt((a.id||"ACT-000").split("-")[1]||0));
      const nextId = "ACT-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,"0");
      return [...prev, {...newAction, id: nextId}];
    });
  };

  // Show pre-filled new risk form when raising from a report
  if (raiseTarget) {
    const prefilled = {
      id: "NEW",
      reportId: raiseTarget.id,
      dateIdentified: raiseTarget.incidentDate || new Date().toISOString().slice(0,10),
      aircraft: raiseTarget.aircraft || "",
      picType: raiseTarget.picType || "",
      location: raiseTarget.location || "",
      operationalArea: raiseTarget.operationalArea || "",
      hazardDescription: raiseTarget.title + (raiseTarget.what ? "\n\n" + raiseTarget.what : ""),
      potentialConsequence: "",
      hazardCategory: "",
      initSeverity: 1,
      initLikelihood: 1,
      existingControls: "",
      additionalMitigation: "",
      actionOwner: "",
      targetDate: "",
      status: "Open",
      dateImplemented: "",
      residualSeverity: null,
      residualLikelihood: null,
      monitoringMethod: "",
    };
    return (
      <div>
        <div style={{background:"#0f172a",border:"1px solid #0ea5e955",borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:18}}>✈</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#38bdf8"}}>Raising Report #{raiseTarget.id} to Risk Register</div>
            <div style={{fontSize:12,color:"#64748b"}}>{raiseTarget.title} · {raiseTarget.aircraft}</div>
          </div>
        </div>
        <RiskEditor risk={prefilled} onSave={onRaiseSave} onCancel={onRaiseCancel} onAddAction={addAction} isNew />
      </div>
    );
  }

  if (editing) return <RiskEditor risk={editing} onSave={save} onCancel={()=>setEditing(null)} onAddAction={addAction} />;
  return (
    <div>
      {confirmDeleteRisk && (
        <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#0f172a",border:"1px solid #ef4444",borderRadius:10,padding:28,maxWidth:400,width:"90%"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#e2e8f0",marginBottom:8}}>Delete Risk Entry?</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:20}}>Are you sure you want to delete <strong style={{color:"#38bdf8"}}>{confirmDeleteRisk.id}</strong>? This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{ setRisks(prev=>prev.filter(r=>r.id!==confirmDeleteRisk.id)); setConfirmDeleteRisk(null); }} style={{...btnPrimary,background:"#ef4444"}}>Yes, Delete</button>
              <button onClick={()=>setConfirmDeleteRisk(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <h2 style={{...h2Style,marginBottom:0}}>Risk Register ({filtered.length})</h2>
        <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle,width:200}} />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...inputStyle,width:180}}>
          <option value="">All Statuses</option>{RISK_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={tableStyle}>
          <thead><tr>{["Hazard ID","Date","Aircraft","Hazard Title","Category","Consequence","Init. Risk","Status","Owner",""].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(r=>{
            const score=riskScore(r.initSeverity,r.initLikelihood);const{label,color}=riskLevel(score);
            const overdue=actions.filter(a=>a.hazardId===r.id).some(a=>isOverdue(a.targetDate,a.status));
            return(<tr key={r.id}>
              <td style={tdStyle}><span style={{color:"#38bdf8",fontWeight:700}}>{r.id}</span></td>
              <td style={tdStyle}>{fmt(r.dateIdentified)}</td>
              <td style={tdStyle}>{r.aircraft}</td>
              <td style={{...tdStyle,maxWidth:220,color:"#e2e8f0"}}>{r.hazardDescription.split("\n")[0]}</td>
              <td style={{...tdStyle,fontSize:11,color:"#94a3b8"}}>{r.hazardCategory}</td>
              <td style={{...tdStyle,fontSize:11,color:"#94a3b8"}}>{r.potentialConsequence}</td>
              <td style={tdStyle}><Badge color={color}>{score} – {label}</Badge></td>
              <td style={tdStyle}><StatusBadge status={r.status}/></td>
              <td style={{...tdStyle,fontSize:12}}>{r.actionOwner}</td>
              <td style={tdStyle}><div style={{display:"flex",gap:6,alignItems:"center"}}><button onClick={()=>setEditing(r)} style={btnSmall}>Edit</button>{overdue&&<Badge color="#ef4444">OVERDUE</Badge>}<button onClick={()=>setConfirmDeleteRisk(r)} style={{...btnSmall,background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444"}}>🗑</button></div></td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function RiskEditor({ risk, onSave, onCancel, isNew, onAddAction }) {
  const [form, setForm] = useState({...risk});
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ description:"", owner: risk.actionOwner||"", targetDate:"", priority:"MEDIUM", status:"Open" });
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const setAct = k => v => setActionForm(f=>({...f,[k]:v}));
  return (
    <div style={{maxWidth:780}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={h2Style}>{isNew ? "New Risk Entry" : "Edit Risk – " + form.id}</h2>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Input label="Date Identified" value={form.dateIdentified} onChange={set("dateIdentified")} type="date" />
        <Input label="Aircraft Reg" value={form.aircraft} onChange={set("aircraft")} />
        <Input label="Location" value={form.location} onChange={set("location")} />
        <Input label="Operational Area" value={form.operationalArea} onChange={set("operationalArea")} options={["", ...OPERATIONAL_AREAS]} />
        <div style={{gridColumn:"1/-1"}}><Input label="Hazard Description" value={form.hazardDescription} onChange={set("hazardDescription")} rows={4} /></div>
        <Input label="Hazard Category" value={form.hazardCategory} onChange={set("hazardCategory")} options={HAZARD_CATEGORIES} />
        <Input label="Potential Consequence" value={form.potentialConsequence} onChange={set("potentialConsequence")} options={POTENTIAL_CONSEQUENCES} />
        <Input label="Initial Severity (1–5)" value={form.initSeverity} onChange={v=>set("initSeverity")(Number(v))} options={["1","2","3","4","5"]} />
        <Input label="Initial Likelihood (1–5)" value={form.initLikelihood} onChange={v=>set("initLikelihood")(Number(v))} options={["1","2","3","4","5"]} />
      </div>
      <div style={{margin:"12px 0",display:"flex",alignItems:"center",gap:12}}>
        <span style={{color:"#64748b",fontSize:12}}>Initial Risk Score:</span><RiskBadge s={form.initSeverity} l={form.initLikelihood} />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{gridColumn:"1/-1"}}><Input label="Existing Controls" value={form.existingControls} onChange={set("existingControls")} rows={2} /></div>
        <div style={{gridColumn:"1/-1"}}><Input label="Additional Mitigation Required" value={form.additionalMitigation} onChange={set("additionalMitigation")} rows={2} /></div>
        <Input label="Action Owner" value={form.actionOwner} onChange={set("actionOwner")} options={ACTION_OWNERS} />
        <Input label="Target Completion Date" value={form.targetDate} onChange={set("targetDate")} type="date" />
        <Input label="Status" value={form.status} onChange={set("status")} options={RISK_STATUSES} />
        <Input label="Date Action Implemented" value={form.dateImplemented} onChange={set("dateImplemented")} type="date" />
        <Input label="Residual Severity (1–5)" value={form.residualSeverity||""} onChange={v=>set("residualSeverity")(Number(v)||null)} options={["","1","2","3","4","5"]} />
        <Input label="Residual Likelihood (1–5)" value={form.residualLikelihood||""} onChange={v=>set("residualLikelihood")(Number(v)||null)} options={["","1","2","3","4","5"]} />
      </div>
      {form.residualSeverity&&form.residualLikelihood&&<div style={{margin:"12px 0",display:"flex",alignItems:"center",gap:12}}><span style={{color:"#64748b",fontSize:12}}>Residual Risk Score:</span><RiskBadge s={form.residualSeverity} l={form.residualLikelihood} /></div>}
      <div style={{marginTop:14}}><Input label="Monitoring Method" value={form.monitoringMethod} onChange={set("monitoringMethod")} rows={2} /></div>
      <button onClick={()=>onSave(form)} style={{...btnPrimary,marginTop:18}}>{isNew ? "✓ Save to Risk Register" : "Save Changes"}</button>

      {!isNew && (
        <div style={{marginTop:24,padding:16,background:"#0f172a",border:"1px solid #1e293b",borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:"#475569",letterSpacing:"1px",textTransform:"uppercase"}}>Actions for this Risk</span>
            <button onClick={()=>setShowActionForm(v=>!v)} style={{...btnSmall,background:"#7c3aed22",color:"#a78bfa",border:"1px solid #7c3aed44"}}>
              {showActionForm ? "✕ Cancel" : "＋ Create Action"}
            </button>
          </div>
          {showActionForm && (
            <div style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><Input label="Action Description" value={actionForm.description} onChange={setAct("description")} rows={2} /></div>
              <Input label="Action Owner" value={actionForm.owner} onChange={setAct("owner")} options={["", ...ACTION_OWNERS]} />
              <Input label="Target Date" value={actionForm.targetDate} onChange={setAct("targetDate")} type="date" />
              <Input label="Priority" value={actionForm.priority} onChange={setAct("priority")} options={["LOW","MEDIUM","HIGH"]} />
              <Input label="Status" value={actionForm.status} onChange={setAct("status")} options={["Open","In Progress","Closed"]} />
              <div style={{gridColumn:"1/-1"}}>
                <button onClick={()=>{ onAddAction({...actionForm, hazardId: form.id}); setActionForm({description:"",owner:form.actionOwner||"",targetDate:"",priority:"MEDIUM",status:"Open"}); setShowActionForm(false); }} style={{...btnPrimary,background:"#7c3aed"}}>＋ Add Action</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Action Log ────────────────────────────────────────────────────────────────
function ActionLog({ actions, setActions, risks }) {
  const [editing, setEditing] = useState(null);
  const [filterOwner, setFilterOwner] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmDeleteAction, setConfirmDeleteAction] = useState(null);
  const owners = [...new Set(actions.map(a=>a.owner))];
  const filtered = actions.filter(a=>(!filterOwner||a.owner===filterOwner)&&(!filterStatus||a.status===filterStatus));
  const save = updated => { setActions(prev=>prev.map(a=>a.id===updated.id?updated:a)); setEditing(null); };
  if (editing) return <ActionEditor action={editing} risks={risks} onSave={save} onCancel={()=>setEditing(null)} />;
  return (
    <div>
      {confirmDeleteAction && (
        <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#0f172a",border:"1px solid #ef4444",borderRadius:10,padding:28,maxWidth:400,width:"90%"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#e2e8f0",marginBottom:8}}>Delete Action?</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:20}}>Are you sure you want to delete action <strong style={{color:"#38bdf8"}}>{confirmDeleteAction.id}</strong>? This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{ setActions(prev=>prev.filter(a=>a.id!==confirmDeleteAction.id)); setConfirmDeleteAction(null); }} style={{...btnPrimary,background:"#ef4444"}}>Yes, Delete</button>
              <button onClick={()=>setConfirmDeleteAction(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <h2 style={{...h2Style,marginBottom:0}}>Action Log ({filtered.length})</h2>
        <select value={filterOwner} onChange={e=>setFilterOwner(e.target.value)} style={{...inputStyle,width:160}}><option value="">All Owners</option>{owners.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...inputStyle,width:160}}><option value="">All Statuses</option>{["Open","In Progress","Closed"].map(s=><option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={tableStyle}>
          <thead><tr>{["Action ID","Hazard ID","Description","Owner","Target Date","Priority","Status","Overdue",""].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(a=>{const od=isOverdue(a.targetDate,a.status);return(
            <tr key={a.id} style={{background:od?"#450a0a22":undefined}}>
              <td style={tdStyle}><span style={{color:"#38bdf8",fontWeight:700}}>{a.id}</span></td>
              <td style={tdStyle}><span style={{color:"#a78bfa"}}>{a.hazardId}</span></td>
              <td style={{...tdStyle,maxWidth:260}}>{a.description}</td>
              <td style={tdStyle}>{a.owner}</td>
              <td style={tdStyle}>{fmt(a.targetDate)}</td>
              <td style={tdStyle}><PriBadge p={a.priority}/></td>
              <td style={tdStyle}><StatusBadge status={a.status}/></td>
              <td style={tdStyle}>{od&&<Badge color="#ef4444">OVERDUE</Badge>}</td>
              <td style={tdStyle}><div style={{display:"flex",gap:6}}><button onClick={()=>setEditing(a)} style={btnSmall}>Edit</button><button onClick={()=>setConfirmDeleteAction(a)} style={{...btnSmall,background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444"}}>🗑</button></div></td>
            </tr>
          );})}</tbody>
        </table>
      </div>
    </div>
  );
}

function ActionEditor({ action, risks, onSave, onCancel }) {
  const [form, setForm] = useState({...action});
  const set = k => v => setForm(f=>({...f,[k]:v}));
  return (
    <div style={{maxWidth:680}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={h2Style}>Edit Action – {form.id}</h2>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Input label="Linked Hazard ID" value={form.hazardId} onChange={set("hazardId")} options={risks.map(r=>r.id)} />
        <Input label="Action Owner" value={form.owner} onChange={set("owner")} options={ACTION_OWNERS} />
        <div style={{gridColumn:"1/-1"}}><Input label="Action Description" value={form.description} onChange={set("description")} rows={2} /></div>
        <Input label="Target Date" value={form.targetDate} onChange={set("targetDate")} type="date" />
        <Input label="Priority" value={form.priority} onChange={set("priority")} options={["LOW","MEDIUM","HIGH"]} />
        <Input label="Status" value={form.status} onChange={set("status")} options={["Open","In Progress","Closed"]} />
        <Input label="Closed Date" value={form.closedDate} onChange={set("closedDate")} type="date" />
        <div style={{gridColumn:"1/-1"}}><Input label="Evidence / Closure Notes" value={form.evidence} onChange={set("evidence")} rows={3} /></div>
      </div>
      <button onClick={()=>onSave(form)} style={{...btnPrimary,marginTop:18}}>Save Changes</button>
    </div>
  );
}

// ── Excel Import ──────────────────────────────────────────────────────────────
function ExcelImport({ reports, onImport }) {
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus(null); setPreview(null);

    try {
      const { read, utils } = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { defval: "" });

      if (!rows.length) { setStatus({ ok: false, msg: "No data found in file." }); return; }

      // Detect MS Forms column names
      const first = rows[0];
      const keys = Object.keys(first);

      // Map columns — try to auto-detect by fuzzy matching
      const find = (...terms) => keys.find(k => terms.some(t => k.toLowerCase().includes(t.toLowerCase()))) || "";

      const titleCol = find("title", "brief");
      const dateCol = find("date of incident", "incident date", "date");
      const locationCol = find("location", "where", "place");
      const aircraftCol = find("aircraft", "reg");
      const picCol = find("pic", "who was");
      const whatCol = find("what happened", "factual", "what");
      const reporterCol = find("reporter", "name", "contact", "details");
      const submittedCol = find("start time", "submitted", "completion");

      if (!titleCol && !whatCol) {
        setStatus({ ok: false, msg: "Could not recognise this file format. Make sure it's a Microsoft Forms Excel export." });
        return;
      }

      // Build candidate reports
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

      // Deduplicate against existing reports
      const existingKeys = new Set(reports.map(r => dedupeKey(r)));
      const newOnes = candidates.filter(c => !existingKeys.has(dedupeKey(c)));
      const dupes = candidates.length - newOnes.length;

      setPreview({ candidates, newOnes, dupes, totalRows: rows.length });
    } catch (err) {
      setStatus({ ok: false, msg: "Error reading file: " + err.message });
    }
    e.target.value = "";
  };

  const dedupeKey = (r) => `${r.incidentDate}__${String(r.title || "").trim().toLowerCase().slice(0, 40)}`;

  const formatExcelDate = (val) => {
    if (!val) return "";
    if (typeof val === "number") {
      // Excel serial date
      const d = new Date((val - 25569) * 86400 * 1000);
      return d.toISOString().slice(0, 10);
    }
    try { return new Date(val).toISOString().slice(0, 10); } catch { return String(val); }
  };

  const confirmImport = () => {
    if (!preview?.newOnes?.length) return;
    setImporting(true);
    onImport(preview.newOnes);
    setStatus({ ok: true, msg: `✅ ${preview.newOnes.length} new report${preview.newOnes.length !== 1 ? "s" : ""} imported successfully. ${preview.dupes > 0 ? `${preview.dupes} duplicate${preview.dupes !== 1 ? "s" : ""} skipped.` : ""}` });
    setPreview(null);
    setImporting(false);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={h2Style}>📥 Import from Microsoft Forms Excel</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
        Download your responses from Microsoft Forms as Excel, then drag the file here. The app will automatically skip any reports already in the system — so you can import as often as you like without creating duplicates.
      </p>

      <div style={{ background: "#0f172a", border: "2px dashed #334155", borderRadius: 10, padding: "32px 24px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>Drag your Excel file here or click to browse</div>
        <label style={{ ...btnPrimary, cursor: "pointer", display: "inline-block" }}>
          Choose Excel File
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
        </label>
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>How to export from Microsoft Forms</div>
        {[
          "Go to forms.microsoft.com and open your safety report form",
          'Click "Responses" at the top',
          'Click the Excel icon or "Open in Excel" button',
          "Save the downloaded file to your computer",
          "Drag it into the box above",
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 13, color: "#94a3b8" }}>
            <span style={{ color: "#38bdf8", fontWeight: 700, minWidth: 18 }}>{i + 1}.</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {status && (
        <div style={{ background: status.ok ? "#14532d" : "#450a0a", border: `1px solid ${status.ok ? "#22c55e" : "#ef4444"}`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: status.ok ? "#86efac" : "#fca5a5", fontSize: 13 }}>
          {status.msg}
        </div>
      )}

      {preview && (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>Preview</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#020617", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#38bdf8", fontFamily: "'Bebas Neue', sans-serif" }}>{preview.totalRows}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>ROWS IN FILE</div>
            </div>
            <div style={{ background: "#020617", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#22c55e", fontFamily: "'Bebas Neue', sans-serif" }}>{preview.newOnes.length}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>NEW TO IMPORT</div>
            </div>
            <div style={{ background: "#020617", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", fontFamily: "'Bebas Neue', sans-serif" }}>{preview.dupes}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>DUPLICATES SKIPPED</div>
            </div>
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
              <button onClick={confirmImport} disabled={importing} style={{ ...btnPrimary, background: "#22c55e" }}>
                ✓ Import {preview.newOnes.length} New Report{preview.newOnes.length !== 1 ? "s" : ""}
              </button>
            </>
          ) : (
            <div style={{ color: "#f59e0b", fontSize: 13 }}>⚠ All {preview.totalRows} rows already exist in the system — nothing new to import.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MS Forms Integration Guide ────────────────────────────────────────────────
function IntegrationGuide({ webhookSecret, onSecretChange }) {
  const [copied, setCopied] = useState(null);
  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),2000); };

  const jsonTemplate = JSON.stringify({
    secret: webhookSecret||"YOUR_SECRET_HERE",
    incidentDate: "REPLACE_WITH_DYNAMIC: Date of incident question",
    title: "REPLACE_WITH_DYNAMIC: Brief title question",
    location: "REPLACE_WITH_DYNAMIC: Location question",
    aircraft: "REPLACE_WITH_DYNAMIC: Aircraft registration question",
    picType: "REPLACE_WITH_DYNAMIC: Who was PIC question",
    operationalArea: "REPLACE_WITH_DYNAMIC: Operational area question",
    what: "REPLACE_WITH_DYNAMIC: What happened question",
    reporterDetails: "REPLACE_WITH_DYNAMIC: Reporter details question"
  }, null, 2);

  return (
    <div style={{maxWidth:780}}>
      <h2 style={h2Style}>🔗 Microsoft Forms → Power Automate Setup</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:28}}>Follow these 8 steps to automatically push new Microsoft Forms submissions into this SMS system in real time.</p>

      {/* Step 1 */}
      <Step n="1" title="Set your Webhook Secret">
        <p style={stepP}>This is a shared password between your Power Automate flow and this app. It prevents anyone else from sending fake reports.</p>
        <div style={{display:"flex",gap:10,alignItems:"center",marginTop:10}}>
          <input value={webhookSecret} onChange={e=>onSecretChange(e.target.value)} placeholder="e.g. lsa-sms-2026" style={{...inputStyle,maxWidth:320}} />
          <button onClick={()=>copy(webhookSecret,"secret")} style={btnSmall}>{copied==="secret"?"✓ Copied":"Copy"}</button>
        </div>
        <p style={{...stepP,color:"#f59e0b",marginTop:8,fontSize:12}}>⚠ Save this somewhere safe — you'll need it in Step 6.</p>
      </Step>

      {/* Step 2 */}
      <Step n="2" title="Go to Power Automate">
        <p style={stepP}>Open <strong style={{color:"#38bdf8"}}>flow.microsoft.com</strong> and sign in with your Microsoft 365 account. Click <strong style={{color:"#e2e8f0"}}>+ Create</strong> → <strong style={{color:"#e2e8f0"}}>Automated cloud flow</strong>. Name it something like "LSA SMS – New Report".</p>
      </Step>

      {/* Step 3 */}
      <Step n="3" title='Add Trigger: "When a new response is submitted"'>
        <p style={stepP}>Search for <strong style={{color:"#e2e8f0"}}>Microsoft Forms</strong> in the trigger search box. Select <strong style={{color:"#e2e8f0"}}>When a new response is submitted</strong>. In the Form ID dropdown, choose your safety report form.</p>
      </Step>

      {/* Step 4 */}
      <Step n="4" title='Add Action: "Get response details"'>
        <p style={stepP}>Click <strong style={{color:"#e2e8f0"}}>+ New step</strong> and search for <strong style={{color:"#e2e8f0"}}>Get response details</strong> (Microsoft Forms). Set Form ID to your form again, and set Response ID to the dynamic value <code style={codeStyle}>List of response notifications Response Id</code> from the trigger.</p>
      </Step>

      {/* Step 5 */}
      <Step n="5" title="Add Action: HTTP POST">
        <p style={stepP}>Add another step and search for <strong style={{color:"#e2e8f0"}}>HTTP</strong> (the built-in connector, not a premium one). Configure it like this:</p>
        <div style={{background:"#020617",border:"1px solid #1e293b",borderRadius:8,padding:14,marginTop:10,fontFamily:"monospace",fontSize:12,color:"#94a3b8"}}>
          <div><span style={{color:"#475569"}}>Method: </span><span style={{color:"#22c55e"}}>POST</span></div>
          <div style={{marginTop:6}}><span style={{color:"#475569"}}>URI: </span><span style={{color:"#38bdf8"}}>https://your-hosted-sms-app.com/api/webhook</span></div>
          <div style={{marginTop:6}}><span style={{color:"#475569"}}>Headers: </span><span style={{color:"#e2e8f0"}}>Content-Type: application/json</span></div>
        </div>
        <div style={{background:"#1c1917",border:"1px solid #f59e0b33",borderRadius:8,padding:"10px 14px",marginTop:10}}>
          <p style={{...stepP,color:"#fbbf24",fontSize:12}}>📌 <strong>Running in Claude.ai?</strong> Use the "Simulate Webhook" panel below to test the integration — this app currently runs in Claude's sandbox so can't receive live HTTP calls. To go fully live, host the app on your own server (e.g. Vercel, Netlify, or a club server) where it can expose a real <code style={codeStyle}>/api/webhook</code> endpoint.</p>
        </div>
      </Step>

      {/* Step 6 */}
      <Step n="6" title="Build the JSON body — map your form fields">
        <p style={stepP}>In the HTTP action's Body field, paste the template below, then replace each <code style={codeStyle}>REPLACE_WITH_DYNAMIC</code> value with the actual dynamic content from your "Get response details" step (click the lightning bolt icon in Power Automate to insert dynamic values):</p>
        <div style={{position:"relative",marginTop:10}}>
          <pre style={{background:"#020617",border:"1px solid #1e293b",borderRadius:8,padding:14,fontSize:11,color:"#94a3b8",overflow:"auto",maxHeight:300}}>{jsonTemplate}</pre>
          <button onClick={()=>copy(jsonTemplate,"json")} style={{...btnSmall,position:"absolute",top:12,right:12}}>{copied==="json"?"✓ Copied":"Copy template"}</button>
        </div>
        <p style={{...stepP,color:"#f59e0b",marginTop:8,fontSize:12}}>⚠ Make sure the <code style={codeStyle}>secret</code> field exactly matches your secret from Step 1: <strong style={{color:"#38bdf8"}}>{webhookSecret||"(set a secret above)"}</strong></p>
      </Step>

      {/* Step 7 */}
      <Step n="7" title="Save and enable the flow">
        <p style={stepP}>Click <strong style={{color:"#e2e8f0"}}>Save</strong> in Power Automate. The flow will now trigger automatically every time someone submits your Microsoft Form. You can test it by submitting a dummy response — it should appear in Raw Reports within seconds with a <Badge color="#818cf8">MS Forms</Badge> badge.</p>
      </Step>

      {/* Step 8 */}
      <Step n="8" title="Field name mapping reference">
        <p style={{...stepP,marginBottom:10}}>Here's how your Microsoft Forms questions should map to the JSON fields:</p>
        <table style={{...tableStyle,fontSize:12}}>
          <thead><tr><th style={thStyle}>JSON Field</th><th style={thStyle}>Your MS Forms Question (example)</th></tr></thead>
          <tbody>{[
            ["incidentDate","Date of the incident"],
            ["title","Brief title of the incident"],
            ["location","Where did the incident take place?"],
            ["aircraft","Aircraft registration"],
            ["picType","Who was PIC? (Instructor / Solo Student / Licence Holder / Other)"],
            ["operationalArea","Operational area"],
            ["what","What happened? (factual recap)"],
            ["reporterDetails","Your name / contact details (optional)"],
          ].map(([f,q])=>(
            <tr key={f}><td style={{...tdStyle,color:"#38bdf8",fontFamily:"monospace",fontSize:11}}>{f}</td><td style={{...tdStyle,color:"#94a3b8"}}>{q}</td></tr>
          ))}</tbody>
        </table>
      </Step>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div style={{display:"flex",gap:16,marginBottom:28}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:"#0ea5e9",color:"#fff",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Bebas Neue',sans-serif"}}>{n}</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:8,fontSize:14}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ── Simulate Webhook ──────────────────────────────────────────────────────────
function SimulateWebhook({ webhookSecret, onIncoming }) {
  const blank = {incidentDate:"",title:"",location:"",aircraft:"",picType:"",operationalArea:"",what:"",reporterDetails:"",secret:webhookSecret};
  const [form, setForm] = useState(blank);
  const [result, setResult] = useState(null);
  const set = k => v => setForm(f=>({...f,[k]:v}));
  useEffect(()=>{ setForm(f=>({...f,secret:webhookSecret})); },[webhookSecret]);
  const simulate = () => {
    if (form.secret!==webhookSecret) { setResult({ok:false,msg:"❌ Secret mismatch – request rejected."}); return; }
    if (!form.title||!form.incidentDate) { setResult({ok:false,msg:"❌ Missing required fields: title and incidentDate."}); return; }
    onIncoming({...form,source:"forms"});
    setForm({...blank,secret:webhookSecret});
    setResult({ok:true,msg:"✅ Webhook accepted – report added to Raw Reports with MS Forms badge."});
    setTimeout(()=>setResult(null),5000);
  };
  return (
    <div style={{maxWidth:680,marginTop:40,borderTop:"1px solid #1e293b",paddingTop:32}}>
      <h3 style={{...h2Style,fontSize:16,color:"#a78bfa"}}>🧪 Simulate Incoming Webhook</h3>
      <p style={{color:"#64748b",fontSize:12,marginBottom:16}}>Manually inject a report as if it came from Power Automate. Use this to test the field mapping before going live.</p>
      {result&&<div style={{background:result.ok?"#14532d":"#450a0a",border:`1px solid ${result.ok?"#22c55e":"#ef4444"}`,borderRadius:8,padding:"10px 14px",marginBottom:14,color:result.ok?"#86efac":"#fca5a5",fontSize:13}}>{result.msg}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Webhook Secret ⬅ must match" value={form.secret} onChange={set("secret")} />
        <Input label="Date of Incident *" value={form.incidentDate} onChange={set("incidentDate")} type="date" />
        <div style={{gridColumn:"1/-1"}}><Input label="Title *" value={form.title} onChange={set("title")} /></div>
        <Input label="Location" value={form.location} onChange={set("location")} />
        <Input label="Aircraft" value={form.aircraft} onChange={set("aircraft")} />
        <Input label="PIC Type" value={form.picType} onChange={set("picType")} options={PIC_TYPES} />
        <Input label="Operational Area" value={form.operationalArea} onChange={set("operationalArea")} options={["", ...OPERATIONAL_AREAS]} />
        <div style={{gridColumn:"1/-1"}}><Input label="What happened" value={form.what} onChange={set("what")} rows={3} /></div>
        <Input label="Reporter Details" value={form.reporterDetails} onChange={set("reporterDetails")} />
      </div>
      <button onClick={simulate} style={{...btnPrimary,marginTop:14,background:"#7c3aed"}}>⚡ Simulate Incoming Webhook</button>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("lsa_auth") !== "true") {
      router.replace("/");
    }
  }, []);

  const [tab, setTab] = useState("dashboard");
  const [reports, setReports] = useState(null);
  const [risks, setRisks] = useState(null);
  const [actions, setActions] = useState(null);
  const [webhookSecret, setWebhookSecret] = useState("lsa-sms-secret");
  const [ready, setReady] = useState(false);

  useEffect(()=>{
    (async()=>{
      const [r,ri,a,s] = await Promise.all([
        loadFromStorage("sms:reports", SEED_REPORTS),
        loadFromStorage("sms:risks", SEED_RISKS),
        loadFromStorage("sms:actions", SEED_ACTIONS),
        loadFromStorage("sms:webhookSecret", "lsa-sms-secret"),
      ]);
      setReports(r); setRisks(ri); setActions(a); setWebhookSecret(s); setReady(true);
    })();
  },[]);

  useEffect(()=>{ if(reports) saveToStorage("sms:reports", reports); },[reports]);
  useEffect(()=>{ if(risks) saveToStorage("sms:risks", risks); },[risks]);
  useEffect(()=>{ if(actions) saveToStorage("sms:actions", actions); },[actions]);
  useEffect(()=>{ saveToStorage("sms:webhookSecret", webhookSecret); },[webhookSecret]);

  const addReport = useCallback((form)=>{
    setReports(prev=>{
      const newId = Math.max(...prev.map(r=>r.id),0)+1;
      return [...prev, {id:newId, submittedAt:new Date().toISOString(), ...form}];
    });
  },[]);

  const handleSecretChange = (s) => { setWebhookSecret(s); };

  const [raiseTarget, setRaiseTarget] = useState(null);

  const raiseToRiskRegister = useCallback((report) => {
    setRaiseTarget(report);
    setTab("riskregister");
  }, []);

  const handleRaiseSave = useCallback((newRisk) => {
    setRisks(prev => {
      const nextId = "LS-SMS-" + String(Math.max(...prev.map(r => parseInt(r.id.split("-")[2]||0)), 0) + 1).padStart(3,"0");
      return [...prev, { ...newRisk, id: nextId }];
    });
    setReports(prev => prev.map(r => r.id === raiseTarget.id ? { ...r, acknowledged: true } : r));
    setRaiseTarget(null);
  }, [raiseTarget]);

  const importReports = useCallback((newOnes) => {
    setReports(prev => {
      let nextId = Math.max(...prev.map(r => r.id), 0) + 1;
      const toAdd = newOnes.map(r => ({ ...r, id: nextId++, submittedAt: r.submittedAt || new Date().toISOString() }));
      return [...prev, ...toAdd];
    });
  }, []);

  if (!ready) return <div style={{minHeight:"100vh",background:"#020617",display:"flex",alignItems:"center",justifyContent:"center",color:"#38bdf8",fontFamily:"sans-serif"}}>Loading SMS data…</div>;

  const tabs = [
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"submit",label:"✈ Submit Report"},
    {id:"import",label:"📥 Import from Forms"},
    {id:"rawreports",label:"📋 Raw Reports"},
    {id:"riskregister",label:"⚠ Risk Register"},
    {id:"actionlog",label:"✅ Action Log"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#020617",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#e2e8f0"}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={{background:"#0a0f1e",borderBottom:"1px solid #1e293b",padding:"0 24px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{padding:"16px 0"}}>
            <div style={{fontSize:22,fontWeight:800,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2,color:"#38bdf8"}}>✈ LS AIRMOTIVE SAFETY MANAGEMENT SYSTEM</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e"}}/>
            <span style={{fontSize:11,color:"#475569"}}>Storage active · {reports?.length} reports</span>
          </div>
        </div>
      </div>
      <div style={{background:"#0a0f1e",borderBottom:"1px solid #0f172a",padding:"0 24px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",gap:0,overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",borderBottom:tab===t.id?"2px solid #38bdf8":"2px solid transparent",padding:"12px 16px",color:tab===t.id?"#38bdf8":"#475569",cursor:"pointer",fontSize:12,fontWeight:700,letterSpacing:".5px",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 24px"}}>
        {tab==="dashboard"&&<Dashboard reports={reports} risks={risks} actions={actions}/>}
        {tab==="submit"&&<SubmitReport onSubmit={addReport}/>}
        {tab==="import"&&<ExcelImport reports={reports} onImport={importReports}/>}
        {tab==="rawreports"&&<RawReports reports={reports} onRaise={raiseToRiskRegister} setReports={setReports}/>}
        {tab==="riskregister"&&<RiskRegister risks={risks} setRisks={setRisks} actions={actions} setActions={setActions} raiseTarget={raiseTarget} onRaiseSave={handleRaiseSave} onRaiseCancel={()=>setRaiseTarget(null)}/>}
        {tab==="actionlog"&&<ActionLog actions={actions} setActions={setActions} risks={risks}/>}
      </div>
    </div>
  );
}
