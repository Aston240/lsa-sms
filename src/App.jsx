import { useState, useEffect, useCallback } from "react";

// ── seed data ─────────────────────────────────────────────────────────────────
const SEED_REPORTS = [
  { id: 1, submittedAt: "2025-12-16T13:51:50", incidentDate: "2025-12-10", title: "Comms failure", location: "5 miles North of Beckley Mast", aircraft: "G-EGTB", picType: "Instructor", operationalArea: "PPL Training", what: "On frequency change to OX Radar 125.090 initial contact was made, shortly after radio became intermittent, comm was lost around 5 miles north of Beckly Mast. Box 2 selected and receive only was able, extra troubleshooting unsuccessful, sqwark ident requested, orbit undertaken and instructed to maintain 4520 SQ, approach commenced and voice clearance to land, Green from the tower was not visual. Debriefed in the tower with controller and the playback for training purposes.", reporterDetails: "Rob Norris", source: "excel" },
  { id: 2, submittedAt: "2026-01-05T18:04:10", incidentDate: "2026-01-05", title: "Mags left on.", location: "Grass parking", aircraft: "N150PK", picType: "Instructor", operationalArea: "PPL Training", what: "Keys left in with mags on after flight.", reporterDetails: "Boothby", source: "excel" },
  { id: 3, submittedAt: "2026-01-15T14:30:51", incidentDate: "2026-01-14", title: "G-BOTN Transmitter Failure", location: "Within 10 nm radius of EGTK northbound", aircraft: "G-BOTN", picType: "Licence Holder", operationalArea: "Aircraft Operations", what: "This incident happened during a EGTK-EGFE round trip flight. After take-off from EGTK, Oxford radar informed me my readability was 2. Upon arrival overhead Moreton-in-Marsh, Oxford radar failed to receive any of my transmissions. Oxford radar and I resorted to communicate with speechless code.", reporterDetails: "Anonymous", source: "excel" },
  { id: 4, submittedAt: "2026-01-16T09:52:50", incidentDate: "2026-01-12", title: "Tie downs in the grass", location: "Grass parking", aircraft: "G-EGTB", picType: "Instructor", operationalArea: "PPL Training", what: "No incident, just tie downs left attached to ground pins.", reporterDetails: "", source: "excel" },
  { id: 5, submittedAt: "2026-01-26T13:35:51", incidentDate: "2026-01-26", title: "G-FIAT Weight and Balance Error", location: "Aircraft Documents", aircraft: "G-FIAT", picType: "Other", operationalArea: "", what: "Weight and balance calculation error.", reporterDetails: "", source: "excel" },
  { id: 6, submittedAt: "2026-02-02T16:44:01", incidentDate: "2026-02-02", title: "Front left cowling retention clip tabs not engaged", location: "Grass parking EGTK", aircraft: "G-BTGO", picType: "Other", operationalArea: "", what: "During initial walk-around before flight, it was discovered that the left front retaining clip for the engine cowling was not engaged with the tab, but the dzus fastener was engaged.", reporterDetails: "Daniel Smith & Brien Nelson", source: "excel" },
  { id: 7, submittedAt: "2026-02-04T17:51:22", incidentDate: "2026-02-04", title: "ATC attitude to solo student", location: "School line EGTK", aircraft: "GMKAS", picType: "Solo Student", operationalArea: "", what: "Solo student call for taxi after instructor left aircraft. ATC questioned purpose of flight, student responded, for circuits. ATC then had a go at student for not booking out as solo circuits and left the student feeling uncomfortable before second solo.", reporterDetails: "Brien Nelson", source: "excel" },
  { id: 8, submittedAt: "2026-02-04T17:59:07", incidentDate: "2026-01-29", title: "Strobe lights on taxi", location: "EGTK", aircraft: "GBOTN", picType: "Instructor", operationalArea: "", what: "Strobe lights are on with the beacon and no means of separation.", reporterDetails: "", source: "excel" },
  { id: 9, submittedAt: "2026-02-04T18:02:01", incidentDate: "2026-02-04", title: "Crew walking out in front of aircraft on apron", location: "EGTK apron north end", aircraft: "Other", picType: "Instructor", operationalArea: "", what: "Taxi on to apron from bravo taxiway, in the dark, crew from jet appeared in front with no intention of stopping, looking ahead and not acknowledging that he had seen us. Reflectors only work in direct light!!", reporterDetails: "", source: "excel" },
  { id: 10, submittedAt: "2026-02-06T08:39:57", incidentDate: "2026-02-04", title: "Incorrect frequency step on Garmin G430", location: "Oxford", aircraft: "G-BOTN", picType: "Instructor", operationalArea: "", what: "On start it was observed that the frequency spacing displayed was not 8.33, but ATIS and Tower were received strength 5. On transfer to radar aircraft was unreadable and we returned to tower and landed to rectify.", reporterDetails: "Donough Wilson", source: "excel" },
  { id: 11, submittedAt: "2026-02-10T10:26:34", incidentDate: "2026-02-09", title: "Alternator failure", location: "Overhead Charlbury", aircraft: "GMKAS", picType: "Instructor", operationalArea: "", what: "LV warning light illuminated just prior to starting a navigation exercise. Ammeter showed 0 charge. The alternator was turned off at the switch with any unnecessary electrical circuits disabled. Still showing no sign of charge. Reported issue to air traffic and recovered to EGTK. On base leg, having rejoined the circuit, the system spontaneously came back to life.", reporterDetails: "Dan Griffiths", source: "excel" },
  { id: 12, submittedAt: "2026-02-10T14:19:10", incidentDate: "2026-02-09", title: "Flight with pilot under 100 hours.", location: "EGTK", aircraft: "N150PK", picType: "Licence Holder", operationalArea: "", what: "Jake Painton was waiting for the crosswind to reduce to 12 knots. It was 13 and as I have the hours to use the aircraft's full crosswind limit, I offered to go with him. In hindsight, shouldn't have offered to go due to the PIC potentially having to be in command out of his club hour limits.", reporterDetails: "Joe Tomlin", source: "excel" },
  { id: 13, submittedAt: "2026-02-12T08:59:17", incidentDate: "2026-02-11", title: "Full flap failed to retract on G/A", location: "EGTB", aircraft: "G-ENLI", picType: "Instructor", operationalArea: "", what: "Practising Circuits. On short final selected full flap. Good landing, retracted flap to Take off position and applied full power. Aircraft took off and initial climb was sluggish. Instructor asked student to level off at 500ft and retracted flaps fully. Once landed and taxing checked flaps again and all positions worked as they should.", reporterDetails: "Tom Newell", source: "excel" },
  { id: 14, submittedAt: "2026-02-24T09:30:48", incidentDate: "2026-02-24", title: "Bald spot MKAS report", location: "EGTK", aircraft: "MKAS", picType: "Other", operationalArea: "", what: "Engineering report of bald spot on tyre. Will need to monitor brakes on landings.", reporterDetails: "", source: "excel" },
  { id: 15, submittedAt: "2026-02-26T09:56:17", incidentDate: "2026-02-25", title: "Aircraft bust through the circuit", location: "EGTK circuit", aircraft: "G-BTGO", picType: "Instructor", operationalArea: "", what: "Whilst in the orbit, late down wind, ATC asked us to get a visual with a PA28 that was going straight through the circuit at 1500 feet. The aircraft was located visually and the instructor took control of the aircraft to tighten up and avoid any conflict. ATC were trying to get hold of the aircraft on the radio but unsuccessfully.", reporterDetails: "Dan Griffiths", source: "excel" },
  { id: 16, submittedAt: "2026-03-01T09:55:05", incidentDate: "2026-02-28", title: "test line", location: "EGTK", aircraft: "GBTGO", picType: "Instructor", operationalArea: "", what: "Test report. Nothing happened.", reporterDetails: "Tom Newell", source: "excel" },
];

const SEED_RISKS = [
  { id: "LS-SMS-001", reportId: 1, dateIdentified: "2025-12-10", aircraft: "G-EGTB", picType: "Instructor", location: "5 miles North of Beckley Mast", operationalArea: "PPL Training", hazardDescription: "Comms failure\n\nOn frequency change to OX Radar 125.090 initial contact was made, shortly after radio became intermittent.", potentialConsequence: "Loss of communications", hazardCategory: "Aircraft & Technical", initSeverity: 1, initLikelihood: 2, existingControls: "Standard lost comms procedure", additionalMitigation: "none", actionOwner: "Tom Newell", targetDate: "", status: "Closed", dateImplemented: "2026-03-01", residualSeverity: 1, residualLikelihood: 2, monitoringMethod: "Will watch for it happening again on this aircraft" },
  { id: "LS-SMS-002", reportId: 2, dateIdentified: "2026-01-05", aircraft: "N150PK", picType: "Instructor", location: "Grass parking", operationalArea: "PPL Training", hazardDescription: "Mags left on.\n\nKeys left in with mags on after flight.", potentialConsequence: "Serious injury", hazardCategory: "Training & Supervision", initSeverity: 1, initLikelihood: 2, existingControls: "Standard aircraft checklist", additionalMitigation: "none", actionOwner: "Tom Newell", targetDate: "", status: "Closed", dateImplemented: "2026-03-01", residualSeverity: 1, residualLikelihood: 2, monitoringMethod: "Will watch for it happening again" },
  { id: "LS-SMS-003", reportId: 3, dateIdentified: "2026-01-14", aircraft: "G-BOTN", picType: "Licence Holder", location: "Within 10 nm radius of EGTK northbound", operationalArea: "Aircraft Operations", hazardDescription: "G-BOTN Transmitter Failure", potentialConsequence: "Loss of communications", hazardCategory: "Aircraft & Technical", initSeverity: 2, initLikelihood: 2, existingControls: "Standard lost comms procedure", additionalMitigation: "none", actionOwner: "Tom Newell", targetDate: "2026-02-28", status: "Mitigation In Progress", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-004", reportId: 4, dateIdentified: "2026-01-12", aircraft: "G-EGTB", picType: "Instructor", location: "Grass parking", operationalArea: "PPL Training", hazardDescription: "Tie downs in the grass\n\nNo incident, just tie downs left attached to ground pins.", potentialConsequence: "Minor aircraft damage", hazardCategory: "Human Factors", initSeverity: 3, initLikelihood: 2, existingControls: "SOP - asking members and instructors to tidy tie downs away.", additionalMitigation: "Safety Notice", actionOwner: "Joe Tomlin", targetDate: "2026-02-28", status: "Mitigation In Progress", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-005", reportId: 5, dateIdentified: "2026-01-26", aircraft: "G-FIAT", picType: "Other", location: "Aircraft Documents", operationalArea: "", hazardDescription: "G-FIAT Weight and Balance Error\n\nWeight and balance calculation error.", potentialConsequence: "Serious aircraft damage / hull loss", hazardCategory: "Flight Operations – Ground", initSeverity: 1, initLikelihood: 1, existingControls: "Skydemon and paper W&B calculations must be done before each flight", additionalMitigation: "none", actionOwner: "Joe Tomlin", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-006", reportId: 6, dateIdentified: "2026-02-02", aircraft: "G-BTGO", picType: "Other", location: "Grass parking EGTK", operationalArea: "", hazardDescription: "Front left cowling retention clip tabs not engaged, discovered during walk-around.", potentialConsequence: "Minor aircraft damage", hazardCategory: "Flight Operations – Airborne", initSeverity: 1, initLikelihood: 3, existingControls: "Instructors to complete walkaround as PIC", additionalMitigation: "", actionOwner: "Tom Newell", targetDate: "", status: "Closed", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-007", reportId: 7, dateIdentified: "2026-02-04", aircraft: "GMKAS", picType: "Solo Student", location: "School line EGTK", operationalArea: "", hazardDescription: "ATC attitude to solo student\n\nSolo student left feeling uncomfortable before second solo.", potentialConsequence: "Reputational damage", hazardCategory: "Flight Operations – Airborne", initSeverity: 3, initLikelihood: 2, existingControls: "Student callsign", additionalMitigation: "", actionOwner: "Tom Newell", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-008", reportId: 8, dateIdentified: "2026-01-29", aircraft: "GBOTN", picType: "Instructor", location: "EGTK", operationalArea: "", hazardDescription: "Strobe lights on taxi\n\nStrobe lights are on with the beacon and no means of separation.", potentialConsequence: "Regulatory non-compliance", hazardCategory: "Aircraft & Technical", initSeverity: 1, initLikelihood: 1, existingControls: "Lights tied to one switch", additionalMitigation: "none", actionOwner: "Tom Newell", targetDate: "", status: "Closed", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-009", reportId: 9, dateIdentified: "2026-02-04", aircraft: "Other", picType: "Instructor", location: "EGTK apron north end", operationalArea: "", hazardDescription: "Crew walking out in front of aircraft on apron\n\nIn the dark, crew from jet appeared in front with no intention of stopping.", potentialConsequence: "Serious injury", hazardCategory: "Human Factors", initSeverity: 3, initLikelihood: 1, existingControls: "High Viz, eyes", additionalMitigation: "", actionOwner: "Joe Tomlin", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-010", reportId: 10, dateIdentified: "2026-02-04", aircraft: "G-BOTN", picType: "Instructor", location: "Oxford", operationalArea: "", hazardDescription: "Incorrect frequency step on Garmin G430\n\nFrequency spacing displayed was not 8.33, aircraft was unreadable on transfer to radar.", potentialConsequence: "Loss of communications", hazardCategory: "Flight Operations – Airborne", initSeverity: 2, initLikelihood: 2, existingControls: "Pre taxi checks and RT checks", additionalMitigation: "", actionOwner: "Joe Tomlin", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-011", reportId: 11, dateIdentified: "2026-02-09", aircraft: "GMKAS", picType: "Instructor", location: "Overhead Charlbury", operationalArea: "", hazardDescription: "Alternator failure\n\nLV warning light illuminated, ammeter showed 0 charge. System spontaneously came back to life on base leg.", potentialConsequence: "Loss of communications", hazardCategory: "Aircraft & Technical", initSeverity: 3, initLikelihood: 1, existingControls: "FREDA checks and emergency procedures", additionalMitigation: "", actionOwner: "Liam Salt", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-012", reportId: 12, dateIdentified: "2026-02-09", aircraft: "N150PK", picType: "Licence Holder", location: "EGTK", operationalArea: "", hazardDescription: "Flight with pilot under 100 hours.\n\nOffered to go with pilot operating outside his club hour limits.", potentialConsequence: "Significant aircraft damage", hazardCategory: "Training & Supervision", initSeverity: 4, initLikelihood: 2, existingControls: "Club Minima and FOB", additionalMitigation: "", actionOwner: "Joe Tomlin", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-013", reportId: 13, dateIdentified: "2026-02-11", aircraft: "G-ENLI", picType: "Instructor", location: "EGTB", operationalArea: "", hazardDescription: "Full flap failed to retract on G/A\n\nPractising Circuits. Initial climb was sluggish after go-around with full flap.", potentialConsequence: "CFIT / terrain conflict", hazardCategory: "Flight Operations – Airborne", initSeverity: 5, initLikelihood: 2, existingControls: "Recalculated performance & T/O flap only for landing in case of G/A", additionalMitigation: "", actionOwner: "Tom Newell", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-014", reportId: 14, dateIdentified: "2026-02-24", aircraft: "MKAS", picType: "Other", location: "EGTK", operationalArea: "", hazardDescription: "Bald spot MKAS report\n\nEngineering report of bald spot on tyre.", potentialConsequence: "Minor aircraft damage", hazardCategory: "Flight Operations – Ground", initSeverity: 2, initLikelihood: 3, existingControls: "Heels on floor before landing", additionalMitigation: "Instructors reminded at meeting", actionOwner: "Tom Newell", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-015", reportId: 15, dateIdentified: "2026-02-25", aircraft: "G-BTGO", picType: "Instructor", location: "EGTK circuit", operationalArea: "", hazardDescription: "Aircraft bust through the circuit\n\nPA28 went straight through the circuit at 1500 feet. Instructor took control to avoid conflict.", potentialConsequence: "Airspace infringement", hazardCategory: "Flight Operations – Airborne", initSeverity: 2, initLikelihood: 1, existingControls: "Standard ways to leave the circuit", additionalMitigation: "", actionOwner: "Tom Newell", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
  { id: "LS-SMS-016", reportId: 16, dateIdentified: "2026-02-28", aircraft: "GBTGO", picType: "Instructor", location: "EGTK", operationalArea: "", hazardDescription: "test line\n\nTest report. Nothing happened.", potentialConsequence: "Reputational damage", hazardCategory: "Organisational / Administrative", initSeverity: 1, initLikelihood: 1, existingControls: "", additionalMitigation: "", actionOwner: "Tam Abrahams", targetDate: "", status: "Monitoring", dateImplemented: "", residualSeverity: null, residualLikelihood: null, monitoringMethod: "" },
];

const SEED_ACTIONS = [
  { id: "ACT-001", hazardId: "LS-SMS-001", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-02-28", priority: "LOW", status: "Closed", evidence: "Not able to replicate issue again. No one else reported issues. Will wait.", closedDate: "2026-02-28" },
  { id: "ACT-002", hazardId: "LS-SMS-002", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-02-28", priority: "LOW", status: "Closed", evidence: "No recollection from instructor. Will monitor. Normal checks should prevent in future.", closedDate: "2026-02-28" },
  { id: "ACT-003", hazardId: "LS-SMS-004", description: "Review hazard and define mitigation / closure evidence", owner: "Joe Tomlin", targetDate: "2026-02-28", priority: "MEDIUM", status: "Open", evidence: "", closedDate: "" },
  { id: "ACT-004", hazardId: "LS-SMS-003", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-02-28", priority: "HIGH", status: "Open", evidence: "", closedDate: "" },
  { id: "ACT-005", hazardId: "LS-SMS-005", description: "Review hazard and define mitigation / closure evidence", owner: "Joe Tomlin", targetDate: "2026-03-15", priority: "LOW", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-006", hazardId: "LS-SMS-008", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-03-01", priority: "LOW", status: "Closed", evidence: "Lights tied to one switch. Won't be changed. Recommend use beacon as normal.", closedDate: "2026-03-01" },
  { id: "ACT-007", hazardId: "LS-SMS-006", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-02-27", priority: "MEDIUM", status: "Closed", evidence: "Instructors reminded during meeting on 27th Feb that they are responsible as P1.", closedDate: "2026-03-01" },
  { id: "ACT-008", hazardId: "LS-SMS-007", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-03-15", priority: "MEDIUM", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-009", hazardId: "LS-SMS-009", description: "Review hazard and define mitigation / closure evidence", owner: "Joe Tomlin", targetDate: "2026-03-15", priority: "LOW", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-010", hazardId: "LS-SMS-010", description: "Review hazard and define mitigation / closure evidence", owner: "Joe Tomlin", targetDate: "2026-03-15", priority: "LOW", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-011", hazardId: "LS-SMS-011", description: "Review hazard and define mitigation / closure evidence", owner: "Liam Salt", targetDate: "2026-03-15", priority: "LOW", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-012", hazardId: "LS-SMS-012", description: "Review hazard and define mitigation / closure evidence", owner: "Joe Tomlin", targetDate: "2026-03-15", priority: "MEDIUM", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-013", hazardId: "LS-SMS-013", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-03-15", priority: "MEDIUM", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-014", hazardId: "LS-SMS-014", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-03-15", priority: "LOW", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-015", hazardId: "LS-SMS-015", description: "Review hazard and define mitigation / closure evidence", owner: "Tom Newell", targetDate: "2026-03-15", priority: "LOW", status: "In Progress", evidence: "", closedDate: "" },
  { id: "ACT-016", hazardId: "LS-SMS-016", description: "Review hazard and define mitigation / closure evidence", owner: "Tam Abrahams", targetDate: "2026-03-15", priority: "LOW", status: "In Progress", evidence: "", closedDate: "" },
];

const ACTION_OWNERS = ["Tom Newell", "Tam Abrahams", "Joe Tomlin", "Liam Salt", "An Instructor"];
const HAZARD_CATEGORIES = ["Flight Operations – Airborne", "Flight Operations – Ground", "Aircraft & Technical", "Training & Supervision", "Human Factors", "Organisational / Administrative"];
const OPERATIONAL_AREAS = ["PPL Training", "IR(R) Training", "CBIR", "Aircraft Operations", "Ground Operations", "Maintenance Interface", "Airfield / ATC Interaction", "Administration / Scheduling"];
const POTENTIAL_CONSEQUENCES = ["Minor aircraft damage", "Significant aircraft damage", "Serious aircraft damage / hull loss", "Serious injury", "Fatal injury", "Airspace infringement", "Loss of separation", "CFIT / terrain conflict", "Loss of control in flight", "Loss of communications", "Regulatory non-compliance", "Reputational damage"];
const RISK_STATUSES = ["Open", "Under Review", "Mitigation In Progress", "Monitoring", "Closed"];
const PIC_TYPES = ["Instructor", "Solo Student", "Licence Holder", "Other"];

const riskScore = (s, l) => (s || 0) * (l || 0);
const riskLevel = score => { if (score <= 4) return { label: "Low", color: "#22c55e" }; if (score <= 9) return { label: "Medium", color: "#f59e0b" }; if (score <= 15) return { label: "High", color: "#ef4444" }; return { label: "Intolerable", color: "#7c3aed" }; };
const isOverdue = (targetDate, status) => !!(targetDate && status !== "Closed" && new Date(targetDate) < new Date());
const fmt = d => d ? new Date(d).toLocaleDateString("en-GB") : "—";

async function loadFromStorage(key, fallback) {
  try { const res = await window.storage.get(key); return res ? JSON.parse(res.value) : fallback; } catch { return fallback; }
}
async function saveToStorage(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch {}
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
const StatusBadge = ({ status }) => { const m = { "Open":"#ef4444","Under Review":"#f59e0b","Mitigation In Progress":"#f59e0b","Monitoring":"#38bdf8","Closed":"#22c55e","In Progress":"#f59e0b" }; return <Badge color={m[status]||"#64748b"}>{status}</Badge>; };
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
  const fromForms = reports.filter(r => r.source === "forms").length;
  const closedReports = risks.filter(r => r.status === "Closed").length;
  const openActions = actions.filter(a => a.status !== "Closed").length;
  const overdueActions = actions.filter(a => isOverdue(a.targetDate, a.status)).length;
  const highRisks = risks.filter(r => riskScore(r.initSeverity, r.initLikelihood) >= 10).length;
  const byCat = {}; risks.forEach(r => { byCat[r.hazardCategory] = (byCat[r.hazardCategory]||0)+1; });
  const catEntries = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const byAc = {}; risks.forEach(r => { byAc[r.aircraft] = (byAc[r.aircraft]||0)+1; });
  const acEntries = Object.entries(byAc).sort((a,b)=>b[1]-a[1]);
  const byMonth = {}; reports.forEach(r => { const m=r.incidentDate.slice(0,7); byMonth[m]=(byMonth[m]||0)+1; });
  const monthEntries = Object.entries(byMonth).sort();
  const maxCat = catEntries[0]?.[1]||1, maxAc = acEntries[0]?.[1]||1, maxMonth = Math.max(...Object.values(byMonth),1);
  const highRiskItems = risks.filter(r=>riskScore(r.initSeverity,r.initLikelihood)>=8 && r.status!=="Closed").slice(0,5);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:16}}>
        {[{label:"Total Reports",value:reports.length,color:"#38bdf8"},{label:"Via MS Forms",value:fromForms,color:"#818cf8"},{label:"Closed",value:closedReports,color:"#22c55e"},{label:"Open Actions",value:openActions,color:"#f59e0b"},{label:"Overdue",value:overdueActions,color:"#ef4444"},{label:"High / Intolerable",value:highRisks,color:"#7c3aed"}].map(k=>(
          <div key={k.label} style={{background:"#0f172a",border:`1px solid ${k.color}33`,borderRadius:10,padding:"18px 20px"}}>
            <div style={{fontSize:32,fontWeight:800,color:k.color,fontFamily:"'Bebas Neue',sans-serif",lineHeight:1}}>{k.value}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4,letterSpacing:".5px",textTransform:"uppercase"}}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={cardStyle}>
          <div style={cardHead}>Reports by Hazard Category</div>
          {catEntries.map(([cat,n])=>(
            <div key={cat} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:"#94a3b8"}}>{cat}</span><span style={{color:"#e2e8f0",fontWeight:700}}>{n}</span></div>
              <div style={{background:"#1e293b",borderRadius:4,height:6}}><div style={{width:`${(n/maxCat)*100}%`,height:6,background:"#38bdf8",borderRadius:4}}/></div>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <div style={cardHead}>Reports by Aircraft</div>
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
          <div style={{display:"flex",gap:8,alignItems:"flex-end",height:90,marginTop:8}}>
            {monthEntries.map(([m,n])=>(
              <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:"100%",background:"#22c55e",borderRadius:"4px 4px 0 0",height:`${(n/maxMonth)*70}px`,minHeight:4}}/>
                <span style={{fontSize:9,color:"#475569"}}>{m.slice(5)}/{m.slice(2,4)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardHead}>⚠ Items Needing Attention</div>
          {highRiskItems.length===0 && <div style={{color:"#64748b",fontSize:13}}>No high-risk open items.</div>}
          {highRiskItems.map(r=>{const score=riskScore(r.initSeverity,r.initLikelihood);const{label,color}=riskLevel(score);return(
            <div key={r.id} style={{borderLeft:`3px solid ${color}`,paddingLeft:10,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{r.id}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{r.hazardDescription.split("\n")[0]}</div>
              <div style={{marginTop:3}}><Badge color={color}>{score} – {label}</Badge></div>
            </div>
          );})}
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
function RawReports({ reports }) {
  const [search, setSearch] = useState("");
  const filtered = reports.filter(r=>r.title.toLowerCase().includes(search.toLowerCase())||r.aircraft.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={h2Style}>Raw Reports ({filtered.length})</h2>
        <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle,width:200}} />
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={tableStyle}>
          <thead><tr>{["ID","Source","Date","Title","Aircraft","Location","PIC Type","Reporter"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(r=>(
            <tr key={r.id}>
              <td style={tdStyle}>{r.id}</td>
              <td style={tdStyle}>{r.source==="forms"?<Badge color="#818cf8">MS Forms</Badge>:r.source==="manual"?<Badge color="#38bdf8">Manual</Badge>:<Badge color="#475569">Excel</Badge>}</td>
              <td style={tdStyle}>{fmt(r.incidentDate)}</td>
              <td style={{...tdStyle,maxWidth:260}}>{r.title}</td>
              <td style={tdStyle}>{r.aircraft}</td>
              <td style={tdStyle}>{r.location}</td>
              <td style={tdStyle}>{r.picType}</td>
              <td style={tdStyle}>{r.reporterDetails||<span style={{color:"#475569"}}>Anonymous</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Risk Register ─────────────────────────────────────────────────────────────
function RiskRegister({ risks, setRisks, actions }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const filtered = risks.filter(r=>(!search||(r.id+r.hazardDescription+r.aircraft).toLowerCase().includes(search.toLowerCase()))&&(!filterStatus||r.status===filterStatus));
  const save = updated => { setRisks(prev=>prev.map(r=>r.id===updated.id?updated:r)); setEditing(null); };
  if (editing) return <RiskEditor risk={editing} onSave={save} onCancel={()=>setEditing(null)} />;
  return (
    <div>
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
              <td style={tdStyle}><div style={{display:"flex",gap:6}}><button onClick={()=>setEditing(r)} style={btnSmall}>Edit</button>{overdue&&<Badge color="#ef4444">OVERDUE</Badge>}</div></td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function RiskEditor({ risk, onSave, onCancel }) {
  const [form, setForm] = useState({...risk});
  const set = k => v => setForm(f=>({...f,[k]:v}));
  return (
    <div style={{maxWidth:780}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={h2Style}>Edit Risk – {form.id}</h2>
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
      <button onClick={()=>onSave(form)} style={{...btnPrimary,marginTop:18}}>Save Changes</button>
    </div>
  );
}

// ── Action Log ────────────────────────────────────────────────────────────────
function ActionLog({ actions, setActions, risks }) {
  const [editing, setEditing] = useState(null);
  const [filterOwner, setFilterOwner] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const owners = [...new Set(actions.map(a=>a.owner))];
  const filtered = actions.filter(a=>(!filterOwner||a.owner===filterOwner)&&(!filterStatus||a.status===filterStatus));
  const save = updated => { setActions(prev=>prev.map(a=>a.id===updated.id?updated:a)); setEditing(null); };
  if (editing) return <ActionEditor action={editing} risks={risks} onSave={save} onCancel={()=>setEditing(null)} />;
  return (
    <div>
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
              <td style={tdStyle}><button onClick={()=>setEditing(a)} style={btnSmall}>Edit</button></td>
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
      const { read, utils } = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
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

  if (!ready) return <div style={{minHeight:"100vh",background:"#020617",display:"flex",alignItems:"center",justifyContent:"center",color:"#38bdf8",fontFamily:"sans-serif"}}>Loading SMS data…</div>;

  const importReports = useCallback((newOnes) => {
    setReports(prev => {
      let nextId = Math.max(...prev.map(r => r.id), 0) + 1;
      const toAdd = newOnes.map(r => ({ ...r, id: nextId++, submittedAt: r.submittedAt || new Date().toISOString() }));
      return [...prev, ...toAdd];
    });
  }, []);

  const tabs = [
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"submit",label:"✈ Submit Report"},
    {id:"import",label:"📥 Import from Forms"},
    {id:"rawreports",label:"📋 Raw Reports"},
    {id:"riskregister",label:"⚠ Risk Register"},
    {id:"actionlog",label:"✅ Action Log"},
    {id:"integration",label:"🔗 MS Forms Setup"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#020617",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#e2e8f0"}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={{background:"#0a0f1e",borderBottom:"1px solid #1e293b",padding:"0 24px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{padding:"16px 0"}}>
            <div style={{fontSize:22,fontWeight:800,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2,color:"#38bdf8"}}>✈ LSA SAFETY MANAGEMENT SYSTEM</div>
            <div style={{fontSize:11,color:"#334155",letterSpacing:1}}>LIGHT SPORT AVIATION · EGTK OXFORD</div>
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
        {tab==="rawreports"&&<RawReports reports={reports}/>}
        {tab==="riskregister"&&<RiskRegister risks={risks} setRisks={setRisks} actions={actions}/>}
        {tab==="actionlog"&&<ActionLog actions={actions} setActions={setActions} risks={risks}/>}
        {tab==="integration"&&<><IntegrationGuide webhookSecret={webhookSecret} onSecretChange={handleSecretChange}/><SimulateWebhook webhookSecret={webhookSecret} onIncoming={addReport}/></>}
      </div>
    </div>
  );
}
