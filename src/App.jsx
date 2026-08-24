import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileClock,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Gauge,
  ImagePlus,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { parseCsv, csvToText } from "./lib/csv";
import {
  analyzeProject,
  calculateScenario,
  evaluateSafety,
  formatMoney,
  formatNumber,
  recommendExperiment,
  sourceCoverage,
  toNumber,
} from "./lib/analysis";
import {
  clearWorkspace,
  createId,
  downloadTextFile,
  exportWorkspace,
  importWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "./lib/storage";

const EMPTY_CONCEPT = {
  name: "",
  description: "",
  category: "",
  subcategory: "",
  features: "",
  audience: "",
  positioning: "",
  retailPrice: "",
  unitCost: "",
  region: "",
  channels: [],
  monthlyTraffic: "",
  conversionLow: "",
  conversionExpected: "",
  conversionHigh: "",
  cac: "",
  marketingBudget: "",
  bundleSize: "1",
  subscription: false,
  differentiationScore: "",
  audienceFitScore: "",
  trendMomentumScore: "",
  channelFitScore: "",
  imageData: "",
};

const DEFAULT_WORKSPACE = {
  version: 1,
  profile: {
    name: "",
    email: "",
    organization: "My workspace",
    role: "Founder",
    plan: "Free",
    currency: "AUD",
    stripePaymentLink: "",
    privateDataTrainingConsent: false,
  },
  projects: [],
  activeProjectId: null,
  createdAt: new Date().toISOString(),
};

const CHANNELS = ["Own website", "Marketplace", "Retail", "Wholesale", "Social commerce"];
const NAV_ITEMS = [
  ["Overview", LayoutDashboard],
  ["Projects", Boxes],
  ["Comparables", Search],
  ["Experiments", FlaskConical],
  ["Reports", FileText],
  ["Data sources", Database],
  ["Settings", Settings],
];

const clone = (value) => JSON.parse(JSON.stringify(value));

function Logo() {
  return (
    <div className="logo-mark" aria-label="DemandLab">
      <span className="logo-cube cube-one" />
      <span className="logo-cube cube-two" />
      <span className="logo-cube cube-three" />
    </div>
  );
}

function Modal({ title, children, onClose, width = "560px" }) {
  useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-panel" style={{ maxWidth: width }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        {children}
      </section>
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  return <div className={`app-toast ${toast.type || "success"}`}><Check size={16} /><span>{toast.message}</span><button onClick={onClose}><X size={14} /></button></div>;
}

function SideNav({ active, onNavigate, collapsed, setCollapsed, workspace, onHelp }) {
  const experimentCount = workspace.projects.reduce((sum, project) => sum + (project.experiments?.length || 0), 0);
  const counts = { Projects: workspace.projects.length, Experiments: experimentCount };
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand-row">
        <Logo />
        <span className="brand-name">DemandLab</span>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar"><Menu size={18} /></button>
      </div>
      <nav className="primary-nav" aria-label="Primary navigation">
        {NAV_ITEMS.slice(0, 5).map(([label, Icon]) => (
          <button key={label} aria-label={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => onNavigate(label)}>
            <Icon size={18} /><span>{label}</span>{counts[label] > 0 && <em>{counts[label]}</em>}
          </button>
        ))}
        {NAV_ITEMS.slice(5).map(([label, Icon]) => (
          <button key={`mobile-${label}`} aria-label={label} className={`nav-item mobile-nav-item ${active === label ? "active" : ""}`} onClick={() => onNavigate(label)}>
            <Icon size={18} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-divider" />
      <p className="nav-caption">Workspace</p>
      <button className="workspace-switcher" onClick={() => onNavigate("Settings")}>
        <span className="workspace-logo">{(workspace.profile.organization || "DL").slice(0, 2).toUpperCase()}</span>
        <span className="workspace-text"><b>{workspace.profile.organization || "My workspace"}</b><small>{workspace.profile.plan} plan</small></span>
        <ChevronDown size={15} />
      </button>
      <div className="sidebar-spacer" />
      <div className="privacy-card"><LockKeyhole size={16} /><p><b>No demo data</b><br />Only supplied evidence is analysed.</p></div>
      <nav className="secondary-nav">
        <button className={active === "Data sources" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("Data sources")}><Database size={18} /><span>Data sources</span></button>
        <button className={active === "Settings" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("Settings")}><Settings size={18} /><span>Settings</span></button>
        <button className="nav-item" onClick={onHelp}><CircleHelp size={18} /><span>Help & feedback</span></button>
      </nav>
    </aside>
  );
}

function TopBar({ active, project, workspace, onOpenSettings }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = [];
  if (!workspace.projects.length) notifications.push("Create your first evidence-backed project.");
  if (project) {
    const analysis = analyzeProject(project);
    if (!project.catalogue) notifications.push("Comparable-product evidence is not attached.");
    if (!analysis.planningReady) notifications.push("Historical traffic or conversion inputs are incomplete.");
  }
  return (
    <header className="topbar">
      <div className="breadcrumb"><span>{active}</span>{project && <><b>/</b><strong>{project.concept.name}</strong></>}</div>
      <div className="top-actions">
        <span className="truth-badge"><ShieldCheck size={14} /> Traceable inputs only</span>
        <div className="popover-anchor">
          <button className="icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} />{notifications.length > 0 && <i />}</button>
          {notificationsOpen && <div className="notification-popover"><b>Workspace checks</b>{notifications.length ? notifications.map((item) => <p key={item}>{item}</p>) : <p>Everything is up to date.</p>}</div>}
        </div>
        <button className="avatar-button" onClick={onOpenSettings}>
          <span>{(workspace.profile.name || workspace.profile.organization || "DL").slice(0, 2).toUpperCase()}</span>
          <div><b>{workspace.profile.name || "Local account"}</b><small>{workspace.profile.role}</small></div><ChevronDown size={15} />
        </button>
      </div>
    </header>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, hint, required, min, max, step }) {
  return (
    <label className="setup-field">
      <span>{label}{required && <em>Required</em>}</span>
      <input name={name} value={value ?? ""} onChange={onChange} type={type} placeholder={placeholder} min={min ?? (type === "number" ? 0 : undefined)} max={max} step={step ?? (type === "number" ? "any" : undefined)} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function CsvPreview({ catalogue }) {
  if (!catalogue) return null;
  const previewHeaders = catalogue.headers.slice(0, 6);
  return (
    <div className="csv-preview">
      <div className="csv-preview-head"><span>Preview</span><span>First {Math.min(3, catalogue.data.length)} rows</span></div>
      <div className="csv-table-wrap"><table><thead><tr>{previewHeaders.map((header) => <th key={header}>{header.replaceAll("_", " ")}</th>)}</tr></thead><tbody>
        {catalogue.data.slice(0, 3).map((record, rowIndex) => <tr key={rowIndex}>{previewHeaders.map((header) => <td key={header}>{record[header] || "—"}</td>)}</tr>)}
      </tbody></table></div>
    </div>
  );
}

function ProjectEditor({ draft, setDraft, catalogue, setCatalogue, error, setError, onSave, onCancel, isEditing }) {
  const csvInput = useRef(null);
  const imageInput = useRef(null);
  const requiredComplete = draft.name.trim() && draft.category.trim() && draft.region.trim() && toNumber(draft.retailPrice) !== null;
  const change = (event) => setDraft((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const toggleChannel = (channel) => setDraft((current) => ({ ...current, channels: current.channels.includes(channel) ? current.channels.filter((item) => item !== channel) : [...current.channels, channel] }));

  const handleCsv = async (file) => {
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".csv")) return setError("Choose a CSV file.");
    try {
      const parsed = parseCsv(await file.text());
      setCatalogue({ ...parsed, fileName: file.name, uploadedAt: new Date().toISOString(), reliability: "User supplied" });
    } catch (csvError) {
      setError(csvError.message);
    }
  };

  const handleImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > 1_500_000) return setError("Keep product images under 1.5 MB so the local workspace remains reliable.");
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, imageData: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="content setup-content">
      <section className="setup-hero">
        <div><span className="eyebrow"><span className="live-dot" /> {isEditing ? "Editing project" : "New project"}</span><h1>{isEditing ? "Update the evidence profile." : "Start with evidence you own."}</h1><p>DemandLab calculates only from supplied inputs. Missing evidence remains visibly unavailable.</p></div>
        <span className="no-demo-pill"><ShieldCheck size={15} /> Zero synthetic records</span>
      </section>
      <section className="setup-layout">
        <div className="setup-main">
          <article className="card setup-card">
            <div className="setup-card-head"><span className="step-number">1</span><div><h2>Product concept</h2><p>Core commercial facts, audience, positioning, and channel.</p></div></div>
            <div className="field-grid">
              <Field label="Product name" name="name" value={draft.name} onChange={change} placeholder="Enter product name" required />
              <Field label="Category" name="category" value={draft.category} onChange={change} placeholder="Enter category" required />
              <Field label="Subcategory" name="subcategory" value={draft.subcategory} onChange={change} placeholder="Enter subcategory" />
              <Field label="Sales region" name="region" value={draft.region} onChange={change} placeholder="Enter region" required />
              <Field label="Target audience" name="audience" value={draft.audience} onChange={change} placeholder="Describe the intended audience" />
              <Field label="Retail price (AUD)" name="retailPrice" value={draft.retailPrice} onChange={change} type="number" placeholder="0.00" required />
              <Field label="Unit cost (AUD)" name="unitCost" value={draft.unitCost} onChange={change} type="number" placeholder="0.00" />
              <Field label="Marketing budget (AUD)" name="marketingBudget" value={draft.marketingBudget} onChange={change} type="number" placeholder="0.00" />
              <label className="setup-field full-span"><span>Features, materials, or ingredients</span><textarea name="features" value={draft.features} onChange={change} rows="3" placeholder="Enter only known product attributes." /></label>
              <label className="setup-field full-span"><span>Positioning</span><textarea name="positioning" value={draft.positioning} onChange={change} rows="3" placeholder="Describe the intended market position." /></label>
              <label className="setup-field full-span"><span>Concept description</span><textarea name="description" value={draft.description} onChange={change} rows="4" placeholder="Describe the concept and claims." /></label>
              <div className="setup-field full-span"><span>Sales channels</span><div className="choice-row">{CHANNELS.map((channel) => <button type="button" key={channel} className={draft.channels.includes(channel) ? "choice-chip selected" : "choice-chip"} onClick={() => toggleChannel(channel)}>{draft.channels.includes(channel) && <Check size={12} />}{channel}</button>)}</div></div>
              <div className="setup-field full-span"><span>Product image or mockup</span><input ref={imageInput} className="hidden-input" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} /><div className="image-input-row">{draft.imageData ? <img src={draft.imageData} alt="Product preview" /> : <span><ImagePlus size={20} /></span>}<button className="button secondary" type="button" onClick={() => imageInput.current?.click()}>{draft.imageData ? "Replace image" : "Choose image"}</button>{draft.imageData && <button className="text-link danger-link" type="button" onClick={() => setDraft((current) => ({ ...current, imageData: "" }))}>Remove</button>}</div></div>
            </div>
          </article>

          <article className="card setup-card">
            <div className="setup-card-head"><span className="step-number">2</span><div><h2>Comparable-product evidence</h2><p>Upload a permitted product catalogue or observed market dataset.</p></div>{catalogue && <span className="verified-file"><Check size={13} /> Parsed</span>}</div>
            <input ref={csvInput} className="hidden-input" type="file" accept=".csv,text/csv" onChange={(event) => handleCsv(event.target.files?.[0])} />
            <button className={`upload-zone ${catalogue ? "has-file" : ""}`} onClick={() => csvInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleCsv(event.dataTransfer.files?.[0]); }}>
              <span className="upload-icon">{catalogue ? <FileSpreadsheet size={23} /> : <Upload size={23} />}</span>
              {catalogue ? <><b>{catalogue.fileName}</b><span>{catalogue.data.length} records · {catalogue.headers.length} columns</span><small>Choose a different CSV</small></> : <><b>Drop a CSV here or choose a file</b><span>Parsed and stored locally in this browser.</span><small>Use product_name, brand, category, features, price, rating, reviews, monthly_sales, conversion_rate, cac, source, observed_at</small></>}
            </button>
            {error && <div className="file-error"><AlertCircle size={15} /> {error}</div>}
            <CsvPreview catalogue={catalogue} />
          </article>

          <article className="card setup-card">
            <div className="setup-card-head"><span className="step-number">3</span><div><h2>Historical performance</h2><p>These inputs drive transparent planning ranges and break-even arithmetic.</p></div></div>
            <div className="field-grid performance-grid">
              <Field label="Monthly qualified traffic" name="monthlyTraffic" value={draft.monthlyTraffic} onChange={change} type="number" placeholder="0" />
              <Field label="Low conversion (%)" name="conversionLow" value={draft.conversionLow} onChange={change} type="number" placeholder="0.0" />
              <Field label="Expected conversion (%)" name="conversionExpected" value={draft.conversionExpected} onChange={change} type="number" placeholder="0.0" />
              <Field label="High conversion (%)" name="conversionHigh" value={draft.conversionHigh} onChange={change} type="number" placeholder="0.0" />
              <Field label="Observed CAC (AUD)" name="cac" value={draft.cac} onChange={change} type="number" placeholder="0.00" />
              <Field label="Bundle size" name="bundleSize" value={draft.bundleSize} onChange={change} type="number" min="1" step="1" />
              <label className="toggle-field"><span><b>Subscription option</b><small>Use an observed or intended 15% discount.</small></span><input type="checkbox" name="subscription" checked={draft.subscription} onChange={change} /></label>
            </div>
            <div className="formula-note"><BarChart3 size={16} /><span>Revenue range = monthly traffic × supplied conversion × effective price × 12. This is arithmetic, not a guaranteed forecast.</span></div>
          </article>

          <article className="card setup-card">
            <div className="setup-card-head"><span className="step-number">4</span><div><h2>Qualified evidence assessments</h2><p>Optional zero-to-100 assessments. Enter only when supported by research you can cite.</p></div></div>
            <div className="field-grid performance-grid">
              <Field label="Differentiation" name="differentiationScore" value={draft.differentiationScore} onChange={change} type="number" min="0" max="100" />
              <Field label="Audience fit" name="audienceFitScore" value={draft.audienceFitScore} onChange={change} type="number" min="0" max="100" />
              <Field label="Trend momentum" name="trendMomentumScore" value={draft.trendMomentumScore} onChange={change} type="number" min="0" max="100" />
              <Field label="Channel fit" name="channelFitScore" value={draft.channelFitScore} onChange={change} type="number" min="0" max="100" />
            </div>
          </article>

          <div className="setup-submit-row"><p><ShieldCheck size={15} /> Project data is saved locally and can be exported or deleted.</p><div className="action-pair">{isEditing && <button className="button secondary" onClick={onCancel}>Cancel</button>}<button className="button dark create-button" disabled={!requiredComplete} onClick={onSave}><Save size={15} /> {isEditing ? "Save new version" : "Create project"}</button></div></div>
        </div>
        <aside className="setup-aside">
          <article className="card readiness-card"><span className="section-label"><Gauge size={17} /> Analysis readiness</span><h3>{requiredComplete ? "Ready to save" : "Required facts missing"}</h3><p>Additional evidence unlocks more outputs without inventing values.</p><div className="requirement-list">{[
            ["Product identity", Boolean(draft.name.trim())],
            ["Category and region", Boolean(draft.category.trim() && draft.region.trim())],
            ["Proposed retail price", toNumber(draft.retailPrice) !== null],
            ["Comparable records", Boolean(catalogue?.data.length)],
            ["Historical traffic", toNumber(draft.monthlyTraffic) !== null],
            ["Conversion range", [draft.conversionLow, draft.conversionExpected, draft.conversionHigh].every((item) => toNumber(item) !== null)],
          ].map(([label, complete]) => <div key={label} className={complete ? "complete" : ""}><span>{complete ? <Check size={13} /> : null}</span>{label}</div>)}</div></article>
          <article className="truth-card"><Database size={19} /><div><b>Source policy</b><p>Use customer-authorized, licensed, or permitted public evidence. DemandLab does not scrape restricted sources.</p></div></article>
        </aside>
      </section>
    </div>
  );
}

function EvidenceRing({ value, emptyLabel = "ready" }) {
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Number.isFinite(value) ? value : 0;
  return <div className="score-ring-wrap"><svg className="score-ring" viewBox="0 0 112 112" role="img" aria-label={Number.isFinite(value) ? `${value} out of 100` : "Unavailable"}><circle className="score-track" cx="56" cy="56" r={radius} /><circle className="score-progress" cx="56" cy="56" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference - safeValue / 100 * circumference} /></svg><div className="score-value"><strong>{Number.isFinite(value) ? value : "—"}</strong><span>{emptyLabel}</span></div></div>;
}

function Overview({ project, onEdit, onDelete, onUpdate, onNavigate, notify }) {
  const analysis = useMemo(() => analyzeProject(project), [project]);
  const safety = useMemo(() => evaluateSafety(project), [project]);
  const previousAnalysis = useMemo(() => {
    if ((project.versions || []).length < 2) return null;
    const previous = project.versions[project.versions.length - 2];
    return analyzeProject({ concept: previous.concept, catalogue: previous.catalogue, experiments: project.experiments || [] });
  }, [project]);
  const recommendation = useMemo(() => recommendExperiment(analysis), [analysis]);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [scenario, setScenario] = useState(() => ({
    price: project.concept.retailPrice,
    conversionExpected: project.concept.conversionExpected,
    bundleSize: project.concept.bundleSize || "1",
    subscription: Boolean(project.concept.subscription),
    audience: project.concept.audience,
    positioning: project.concept.positioning,
    channel: project.concept.channels?.[0] || "",
    marketingBudget: project.concept.marketingBudget,
  }));
  const scenarioResult = useMemo(() => calculateScenario(project, scenario), [project, scenario]);
  const changeScenario = (event) => setScenario((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const saveScenario = () => {
    onUpdate({ ...project, scenarios: [...(project.scenarios || []), { id: createId("scenario"), ...scenario, result: scenarioResult, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() });
    notify("Scenario saved to project history.");
  };
  const createRecommendedExperiment = () => {
    const experiment = { id: createId("experiment"), ...recommendation, status: "Planned", actualResult: "", outcome: "Pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    onUpdate({ ...project, experiments: [...(project.experiments || []), experiment], updatedAt: new Date().toISOString() });
    notify("Recommended experiment added.");
    onNavigate("Experiments");
  };
  return (
    <div className="content real-dashboard">
      <section className="page-heading"><div><span className="eyebrow"><span className="live-dot" /> Updated {new Date(project.updatedAt).toLocaleString()}</span><h1>{project.concept.name}</h1><p>{project.concept.category} · {project.concept.region}{project.concept.audience ? ` · ${project.concept.audience}` : ""}</p></div><div className="heading-actions"><button className="button secondary" onClick={onEdit}><Pencil size={15} /> Edit inputs</button><button className="button secondary" onClick={() => onNavigate("Reports")}><FileText size={15} /> Report</button><button className="icon-button more" aria-label="Delete project" onClick={onDelete}><Trash2 size={17} /></button></div></section>
      <div className="source-boundary"><ShieldCheck size={16} /><p><b>No synthetic records.</b> Calculated values use your inputs and the attached catalogue. Missing signals remain unavailable.</p></div>
      <div className={`safety-boundary ${safety.level.toLowerCase().replaceAll(" ", "-")}`}><ShieldCheck size={16} /><p><b>Safety check: {safety.level}.</b> {safety.reason}</p></div>
      <section className="card score-card complete-score-card">
        <div className="score-summary"><div className="section-label"><Gauge size={17} /> Demand score</div><div className="score-main"><EvidenceRing value={analysis.demandScore} emptyLabel="score" /><div className="score-copy">{analysis.demandScore !== null ? <span className="rating-pill"><Sparkles size={13} /> Rules-based estimate</span> : <span className="neutral-pill"><AlertCircle size={13} /> Insufficient evidence</span>}<h2>{analysis.demandScore !== null ? `${analysis.demandScore}/100 opportunity estimate` : "Not enough supported sub-scores"}</h2><p>A total appears only when at least five traceable sub-scores are available. Model: {analysis.modelVersion}.</p></div></div></div>
        <div className="score-breakdown"><div className="breakdown-head"><span>Visible sub-scores</span><span>Evidence and change</span></div>{analysis.scoreParts.map((part) => { const previous = previousAnalysis?.scoreParts.find((item) => item.key === part.key)?.value; const delta = Number.isFinite(part.value) && Number.isFinite(previous) ? part.value - previous : null; return <div className="score-row expanded" key={part.key}><span>{part.label}</span><div className="score-bar"><i className={Number.isFinite(part.value) ? "mint" : "empty"} style={{ width: `${part.value || 0}%` }} /></div><strong>{Number.isFinite(part.value) ? part.value : "—"}</strong><em className="source-label">{delta !== null && delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} · ` : ""}{part.source}</em></div>; })}</div>
      </section>
      <section className="actual-metrics"><article className="card actual-metric"><span>Evidence readiness</span><strong>{analysis.evidenceReadiness}%</strong><small>Input coverage</small></article><article className="card actual-metric"><span>Comparable median</span><strong>{formatMoney(analysis.medianPrice, 2)}</strong><small>{analysis.rowCount ? `${analysis.rowCount} records` : "No catalogue"}</small></article><article className="card actual-metric"><span>Gross margin</span><strong>{analysis.margin === null ? "—" : `${formatNumber(analysis.margin, 1)}%`}</strong><small>Before fulfilment and returns</small></article><article className="card actual-metric"><span>Break-even volume</span><strong>{formatNumber(analysis.breakEvenVolume)}</strong><small>Marketing budget ÷ unit contribution</small></article><article className="card actual-metric"><span>Confidence</span><strong>{analysis.confidence}</strong><small>Based on evidence coverage</small></article></section>
      <section className="recommendation-grid"><article className="card recommendation-card"><span className="section-label"><CreditCard size={17} /> Price recommendation</span>{analysis.priceRecommendation ? <><h3>{analysis.priceRecommendation.status}</h3><p>{analysis.priceRecommendation.message}</p><small>{analysis.priceRecommendation.source}</small></> : <><h3>Unavailable</h3><p>Upload at least two comparable prices to generate a supported range.</p></>}</article><article className="card recommendation-card"><span className="section-label"><Sparkles size={17} /> Positioning recommendation</span>{analysis.positioningRecommendation ? <><h3>{analysis.positioningRecommendation.status}</h3><p>{analysis.positioningRecommendation.message}</p><small>{analysis.positioningRecommendation.source}</small></> : <><h3>Unavailable</h3><p>Add review_complaints to the comparable CSV to surface observed positioning gaps.</p></>}</article></section>
      <section className="workspace-grid real-grid">
        <div className="left-stack">
          <article className="card planning-card"><div className="card-title-row"><div><span className="section-label"><TrendingUp size={17} /> Three-scenario range</span><p>Traceable arithmetic from supplied traffic, conversion, and price. Source: {analysis.forecastSource}.</p></div><span className="calculation-pill">{analysis.forecastVersion}</span></div>{analysis.planningReady ? <><div className="projection-grid">{Object.entries(analysis.projection).map(([key, value]) => <div key={key}><span>{key}</span><strong>{formatMoney(value.revenue)}</strong><small>{formatNumber(value.units)} units · {formatNumber(value.conversion, 2)}%</small></div>)}</div><div className="forecast-detail-grid"><div><span>Observed CAC</span><b>{formatMoney(analysis.experimentCac ?? toNumber(project.concept.cac), 2)}</b></div><div><span>Gross margin</span><b>{analysis.margin === null ? "—" : `${formatNumber(analysis.margin, 1)}%`}</b></div><div><span>Break-even volume</span><b>{formatNumber(analysis.breakEvenVolume)}</b></div><div><span>Confidence</span><b>{analysis.confidence}</b></div></div></> : <div className="missing-state"><span><AlertCircle size={21} /></span><div><h3>Range unavailable</h3><p>Add monthly traffic plus low, expected, and high conversion inputs.</p></div><button className="button secondary" onClick={onEdit}>Add inputs</button></div>}<button className="assumption-button" onClick={() => setShowAssumptions(!showAssumptions)}><CircleHelp size={15} /> Assumptions and invalidators <ChevronDown size={14} /></button>{showAssumptions && <div className="assumption-panel"><div><b>Major assumptions</b>{analysis.assumptions.length ? analysis.assumptions.map((item) => <p key={item}><Check size={12} />{item}</p>) : <p>No forecast assumptions are available.</p>}</div><div><b>Could invalidate this range</b>{analysis.invalidators.map((item) => <p key={item}><AlertCircle size={12} />{item}</p>)}</div></div>}</article>
          <article className="card scenario-card"><div className="card-title-row"><div><span className="section-label"><SlidersHorizontal size={17} /> Scenario simulator</span><p>Compare commercial choices without changing the baseline project.</p></div><button className="button secondary" onClick={saveScenario}><Save size={14} /> Save scenario</button></div><div className="scenario-form-grid"><Field label="Price" name="price" value={scenario.price} onChange={changeScenario} type="number" /><Field label="Expected conversion (%)" name="conversionExpected" value={scenario.conversionExpected} onChange={changeScenario} type="number" /><Field label="Bundle size" name="bundleSize" value={scenario.bundleSize} onChange={changeScenario} type="number" min="1" step="1" /><Field label="Marketing budget" name="marketingBudget" value={scenario.marketingBudget} onChange={changeScenario} type="number" /><Field label="Audience" name="audience" value={scenario.audience} onChange={changeScenario} /><Field label="Positioning" name="positioning" value={scenario.positioning} onChange={changeScenario} /><label className="setup-field"><span>Launch channel</span><select name="channel" value={scenario.channel} onChange={changeScenario}><option value="">Choose channel</option>{CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}</select></label><label className="toggle-field compact"><span><b>Subscription</b><small>15% discount</small></span><input type="checkbox" name="subscription" checked={scenario.subscription} onChange={changeScenario} /></label></div><div className="scenario-results"><div><span>Effective price</span><strong>{formatMoney(scenarioResult.effectivePrice, 2)}</strong></div><div><span>Annual units</span><strong>{formatNumber(scenarioResult.annualUnits)}</strong></div><div><span>Annual revenue</span><strong>{formatMoney(scenarioResult.annualRevenue)}</strong></div><div><span>Gross margin</span><strong>{scenarioResult.grossMargin === null ? "—" : `${formatNumber(scenarioResult.grossMargin, 1)}%`}</strong></div></div></article>
        </div>
        <aside className="right-stack">
          <article className="next-step-card honest-next-step"><span className="next-icon"><Target size={19} /></span><div className="next-copy"><span className="eyebrow">Recommended next test</span><h3>{recommendation.title}</h3><p>{recommendation.reason}</p><div className="test-stats"><span>{recommendation.duration} days</span><span>{formatMoney(recommendation.budget)}</span></div><button onClick={createRecommendedExperiment}>Create experiment <ArrowRight size={14} /></button></div></article>
          <article className="card evidence-gaps-card"><span className="section-label"><AlertCircle size={17} /> Evidence gaps</span><p>These gaps reduce confidence.</p><div className="gap-list">{analysis.invalidators.map((item) => <div key={item}><span />{item}</div>)}</div></article>
          <article className="card lineage-card"><span className="section-label"><BookOpen size={17} /> Data lineage</span><div><span className="lineage-dot user" /><p><b>Concept inputs</b><small>User supplied · version {project.versions?.length || 1}</small></p></div>{project.catalogue && <div><span className="lineage-dot csv" /><p><b>{project.catalogue.fileName}</b><small>{analysis.rowCount} locally parsed rows</small></p></div>}<div><span className="lineage-dot missing" /><p><b>External integrations</b><small>Not connected</small></p></div></article>
        </aside>
      </section>
    </div>
  );
}

function ProjectsView({ workspace, activeProjectId, onOpen, onNew, onDuplicate, onDelete, onRestoreVersion }) {
  const [expanded, setExpanded] = useState(null);
  return <div className="content section-page"><section className="page-heading"><div><span className="eyebrow">Workspace portfolio</span><h1>Projects</h1><p>Create, compare, restore, and manage evidence profiles.</p></div><button className="button dark" onClick={onNew}><Plus size={16} /> New project</button></section>{workspace.projects.length ? <div className="project-grid">{workspace.projects.map((project) => { const analysis = analyzeProject(project); return <article className={`card project-card ${project.id === activeProjectId ? "selected" : ""}`} key={project.id}><div className="project-card-top">{project.concept.imageData ? <img src={project.concept.imageData} alt="" /> : <span><Boxes size={21} /></span>}<div><b>{project.concept.name}</b><small>{project.concept.category} · {project.concept.region}</small></div><button onClick={() => setExpanded(expanded === project.id ? null : project.id)} aria-label="Project menu"><MoreHorizontal size={18} /></button></div><div className="project-card-metrics"><div><span>Demand score</span><b>{analysis.demandScore ?? "—"}</b></div><div><span>Evidence</span><b>{analysis.evidenceReadiness}%</b></div><div><span>Records</span><b>{analysis.rowCount}</b></div></div><div className="project-card-foot"><span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span><button onClick={() => onOpen(project.id)}>Open <ArrowRight size={13} /></button></div>{expanded === project.id && <div className="project-menu"><button onClick={() => onDuplicate(project.id)}><Copy size={14} /> Duplicate</button><button onClick={() => setExpanded(`${project.id}:history`)}><FileClock size={14} /> History</button><button className="danger-link" onClick={() => onDelete(project.id)}><Trash2 size={14} /> Delete</button></div>}{expanded === `${project.id}:history` && <div className="version-panel"><button className="version-back" onClick={() => setExpanded(project.id)}><ArrowLeft size={13} /> Back</button><b>Project history</b>{(project.versions || []).slice().reverse().map((version) => <button key={version.id} onClick={() => onRestoreVersion(project.id, version.id)}><span>{new Date(version.createdAt).toLocaleString()}</span><small>{version.note}</small></button>)}</div>}</article>; })}</div> : <EmptyState icon={Boxes} title="No projects yet" text="Create a project from your own product and market evidence." action="Create project" onAction={onNew} />}</div>;
}

function ComparablesView({ project, onEdit, notify }) {
  const analysis = useMemo(() => project ? analyzeProject(project) : null, [project]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("similarity");
  if (!project) return <SectionNeedsProject title="Comparables" onAction={onEdit} />;
  const filtered = analysis.comparableRows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))).sort((a, b) => {
    if (sort === "price") return (toNumber(a.price) ?? Infinity) - (toNumber(b.price) ?? Infinity);
    if (sort === "rating") return (toNumber(b.rating) ?? -1) - (toNumber(a.rating) ?? -1);
    return (b.similarity ?? -1) - (a.similarity ?? -1);
  });
  const exportRows = () => {
    if (!project.catalogue) return;
    const headers = [...project.catalogue.headers, "similarity"];
    downloadTextFile(`${project.concept.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-comparables.csv`, csvToText(headers, analysis.comparableRows), "text/csv");
    notify("Comparable CSV exported.");
  };
  return <div className="content section-page"><section className="page-heading"><div><span className="eyebrow">Traceable product evidence</span><h1>Comparables</h1><p>Similarity uses category, language overlap, and price proximity.</p></div><div className="heading-actions"><button className="button secondary" onClick={onEdit}><Upload size={15} /> {project.catalogue ? "Replace CSV" : "Upload CSV"}</button><button className="button dark" disabled={!analysis.rowCount} onClick={exportRows}><Download size={15} /> Export</button></div></section>{analysis.rowCount ? <article className="card comparable-workbench"><div className="table-toolbar"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search uploaded records" /></label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="similarity">Best match</option><option value="price">Lowest price</option><option value="rating">Highest rating</option></select><span>{filtered.length} of {analysis.rowCount}</span></div><div className="records-table-wrap"><table className="records-table comparable-table"><thead><tr><th>Product</th><th>Brand</th><th>Similarity</th><th>Price</th><th>Rating</th><th>Reviews</th><th>Observed sales</th><th>Source</th></tr></thead><tbody>{filtered.map((row, index) => <tr key={`${row.__row}-${index}`}><td><b>{row.product_name || "Unnamed"}</b><small>{row.category || "—"}</small></td><td>{row.brand || "—"}</td><td>{row.similarity === null ? "—" : `${row.similarity}%`}</td><td>{row.price || "—"}</td><td>{row.rating || "—"}</td><td>{row.reviews || "—"}</td><td>{row.monthly_sales || "—"}</td><td>{row.url ? <a href={row.url} target="_blank" rel="noreferrer">Open <ExternalLink size={11} /></a> : row.source || "—"}</td></tr>)}</tbody></table></div></article> : <EmptyState icon={FileSpreadsheet} title="No comparable records" text="Attach a permitted CSV to discover and rank comparable products." action="Upload CSV" onAction={onEdit} />}</div>;
}

function ExperimentEditor({ initial, recommendation, onSave, onClose }) {
  const [form, setForm] = useState(initial || { type: recommendation?.type || "Landing-page smoke test", title: recommendation?.title || "", reason: recommendation?.reason || "", duration: recommendation?.duration || 7, budget: recommendation?.budget || 0, successMetric: recommendation?.successMetric || "", status: "Planned", actualResult: "", outcome: "Pending", observedTraffic: "", observedConversion: "", observedCac: "", observedSales: "" });
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  return <Modal title={initial ? "Update experiment" : "Create experiment"} onClose={onClose}><div className="modal-form"><label><span>Experiment type</span><select name="type" value={form.type} onChange={change}>{["Landing-page smoke test", "Pricing test", "Concept survey", "Advertising creative test", "Wait-list campaign", "Preorder experiment", "Small production run", "Customer interview plan", "Comparable research"].map((type) => <option key={type}>{type}</option>)}</select></label><label><span>Title</span><input name="title" value={form.title} onChange={change} /></label><label><span>Rationale</span><textarea name="reason" value={form.reason} onChange={change} rows="3" /></label><div className="modal-form-grid"><label><span>Duration (days)</span><input type="number" name="duration" value={form.duration} onChange={change} min="1" /></label><label><span>Budget (AUD)</span><input type="number" name="budget" value={form.budget} onChange={change} min="0" /></label></div><label><span>Success metric</span><input name="successMetric" value={form.successMetric} onChange={change} /></label><div className="modal-form-grid"><label><span>Status</span><select name="status" value={form.status} onChange={change}><option>Planned</option><option>Running</option><option>Complete</option></select></label><label><span>Outcome</span><select name="outcome" value={form.outcome} onChange={change}><option>Pending</option><option>Passed</option><option>Mixed</option><option>Failed</option></select></label></div><label><span>Actual result</span><textarea name="actualResult" value={form.actualResult} onChange={change} rows="4" placeholder="Enter observed results, not estimates." /></label><div className="modal-form-grid"><label><span>Observed traffic</span><input type="number" name="observedTraffic" value={form.observedTraffic || ""} onChange={change} min="0" /></label><label><span>Observed conversion (%)</span><input type="number" name="observedConversion" value={form.observedConversion || ""} onChange={change} min="0" /></label><label><span>Observed CAC (AUD)</span><input type="number" name="observedCac" value={form.observedCac || ""} onChange={change} min="0" /></label><label><span>Observed sales</span><input type="number" name="observedSales" value={form.observedSales || ""} onChange={change} min="0" /></label></div><div className="modal-actions"><button className="button secondary" onClick={onClose}>Cancel</button><button className="button dark" disabled={!form.title.trim()} onClick={() => onSave(form)}><Save size={14} /> Save experiment</button></div></div></Modal>;
}

function ExperimentsView({ project, onUpdate, onEdit, notify }) {
  const [editor, setEditor] = useState(null);
  if (!project) return <SectionNeedsProject title="Experiments" onAction={onEdit} />;
  const analysis = analyzeProject(project);
  const recommendation = recommendExperiment(analysis);
  const save = (form) => {
    const existing = editor?.id;
    const experiments = existing ? project.experiments.map((item) => item.id === existing ? { ...item, ...form, updatedAt: new Date().toISOString() } : item) : [...project.experiments, { id: createId("experiment"), ...form, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    onUpdate({ ...project, experiments, updatedAt: new Date().toISOString() }); setEditor(null); notify("Experiment saved.");
  };
  const remove = (id) => { if (window.confirm("Delete this experiment?")) { onUpdate({ ...project, experiments: project.experiments.filter((item) => item.id !== id), updatedAt: new Date().toISOString() }); notify("Experiment deleted."); } };
  return <div className="content section-page"><section className="page-heading"><div><span className="eyebrow">Forecast → experiment → actual result</span><h1>Experiments</h1><p>Capture real validation results; completed conversion and CAC results feed the next forecast.</p></div><button className="button dark" onClick={() => setEditor({ mode: "new" })}><Plus size={16} /> New experiment</button></section><article className="next-step-card experiment-recommendation"><span className="next-icon"><Target size={19} /></span><div className="next-copy"><span className="eyebrow">Recommended next test</span><h3>{recommendation.title}</h3><p>{recommendation.reason}</p><button onClick={() => setEditor({ mode: "new", recommendation })}>Use this plan <ArrowRight size={14} /></button></div></article>{project.experiments.length ? <div className="experiment-grid">{project.experiments.map((experiment) => <article className="card experiment-card" key={experiment.id}><div className="experiment-card-head"><span className={`status-pill ${experiment.status.toLowerCase()}`}>{experiment.status}</span><button onClick={() => setEditor(experiment)} aria-label="Edit experiment"><Pencil size={15} /></button></div><span className="eyebrow">{experiment.type}</span><h3>{experiment.title}</h3><p>{experiment.reason}</p><div className="experiment-meta"><span>{experiment.duration} days</span><span>{formatMoney(toNumber(experiment.budget))}</span><span>{experiment.outcome}</span></div><div className="experiment-result"><span>Success metric</span><p>{experiment.successMetric || "Not set"}</p><span>Actual result</span><p>{experiment.actualResult || "No result entered yet."}</p>{Number.isFinite(toNumber(experiment.observedConversion)) && <><span>Observed calibration</span><p>{formatNumber(toNumber(experiment.observedConversion), 2)}% conversion · {formatMoney(toNumber(experiment.observedCac), 2)} CAC</p></>}</div><button className="text-link danger-link" onClick={() => remove(experiment.id)}><Trash2 size={13} /> Delete</button></article>)}</div> : <EmptyState icon={FlaskConical} title="No experiments yet" text="Create a validation plan and record actual outcomes here." action="Create experiment" onAction={() => setEditor({ mode: "new" })} />}{editor && <ExperimentEditor initial={editor.id ? editor : null} recommendation={editor.recommendation || (editor.mode === "new" ? recommendation : null)} onSave={save} onClose={() => setEditor(null)} />}</div>;
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }

function buildReportHtml(project, analysis, organization) {
  const scenarios = analysis.projection ? Object.entries(analysis.projection).map(([key, item]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(formatMoney(item.revenue))}</td><td>${escapeHtml(formatNumber(item.units))}</td><td>${escapeHtml(formatNumber(item.conversion, 2))}%</td></tr>`).join("") : `<tr><td colspan="4">Unavailable: traffic and conversion range are incomplete.</td></tr>`;
  const subscores = analysis.scoreParts.map((part) => `<tr><td>${escapeHtml(part.label)}</td><td>${Number.isFinite(part.value) ? part.value : "Unavailable"}</td><td>${escapeHtml(part.source)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(project.concept.name)} — DemandLab report</title><style>body{font:14px Arial;color:#17231f;max-width:900px;margin:40px auto;padding:0 24px}header{border-bottom:3px solid #176b4d;padding-bottom:20px}h1{font-size:32px;margin:8px 0}small{color:#68756f}section{margin:28px 0}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.notice{padding:12px;background:#f0f6f2;border-left:3px solid #176b4d}.meta{display:flex;gap:30px}.meta div{flex:1;padding:15px;background:#f7f8f7}.footer{margin-top:40px;color:#77827d;font-size:11px}</style></head><body><header><small>${escapeHtml(organization || "DemandLab")}</small><h1>${escapeHtml(project.concept.name)}</h1><p>${escapeHtml(project.concept.category)} · ${escapeHtml(project.concept.region)}</p></header><p class="notice">Decision-support report based only on supplied evidence. It is not a guarantee of commercial success.</p><section><h2>Summary</h2><div class="meta"><div><small>Demand score</small><h2>${analysis.demandScore ?? "Unavailable"}</h2></div><div><small>Evidence readiness</small><h2>${analysis.evidenceReadiness}%</h2></div><div><small>Confidence</small><h2>${analysis.confidence}</h2></div></div></section><section><h2>Visible sub-scores</h2><table><thead><tr><th>Signal</th><th>Score</th><th>Source</th></tr></thead><tbody>${subscores}</tbody></table></section><section><h2>Three-scenario planning range</h2><table><thead><tr><th>Scenario</th><th>Revenue</th><th>Units</th><th>Conversion</th></tr></thead><tbody>${scenarios}</tbody></table></section><section><h2>Assumptions</h2><ul>${analysis.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>None available.</li>"}</ul><h2>Could invalidate this analysis</h2><ul>${analysis.invalidators.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><p class="footer">Model ${escapeHtml(analysis.modelVersion)} · Forecast ${escapeHtml(analysis.forecastVersion)} · Generated ${new Date().toISOString()}</p></body></html>`;
}

function ReportsView({ project, organization, onUpdate, onEdit, notify }) {
  if (!project) return <SectionNeedsProject title="Reports" onAction={onEdit} />;
  const analysis = analyzeProject(project);
  const downloadReport = () => { downloadTextFile(`${project.concept.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-demandlab-report.html`, buildReportHtml(project, analysis, organization), "text/html"); notify("Standalone report downloaded."); };
  const saveSnapshot = () => { const snapshot = { id: createId("report"), createdAt: new Date().toISOString(), demandScore: analysis.demandScore, evidenceReadiness: analysis.evidenceReadiness, confidence: analysis.confidence, modelVersion: analysis.modelVersion, forecastVersion: analysis.forecastVersion }; onUpdate({ ...project, reports: [...project.reports, snapshot], updatedAt: new Date().toISOString() }); notify("Report snapshot saved."); };
  const copySummary = async () => { await navigator.clipboard.writeText(`${project.concept.name}\nDemand score: ${analysis.demandScore ?? "Unavailable"}\nEvidence readiness: ${analysis.evidenceReadiness}%\nConfidence: ${analysis.confidence}\nDecision support only; not a guarantee.`); notify("Report summary copied."); };
  return <div className="content section-page report-page"><section className="page-heading"><div><span className="eyebrow">Versioned decision support</span><h1>Reports</h1><p>Generate a traceable report from the current project state.</p></div><div className="heading-actions"><button className="button secondary" onClick={saveSnapshot}><Save size={15} /> Save snapshot</button><button className="button secondary" onClick={copySummary}><Copy size={15} /> Copy summary</button><button className="button dark" onClick={downloadReport}><Download size={15} /> Download report</button></div></section><article className="card report-preview"><div className="report-preview-head"><div><Logo /><span>DemandLab report</span></div><small>Generated {new Date().toLocaleString()}</small></div><h2>{project.concept.name}</h2><p>{project.concept.category} · {project.concept.region}</p><div className="source-boundary"><ShieldCheck size={16} /><p>Decision support based on supplied evidence. No result is guaranteed.</p></div><div className="report-score-grid"><div><span>Demand score</span><strong>{analysis.demandScore ?? "—"}</strong></div><div><span>Evidence readiness</span><strong>{analysis.evidenceReadiness}%</strong></div><div><span>Confidence</span><strong>{analysis.confidence}</strong></div><div><span>Comparable records</span><strong>{analysis.rowCount}</strong></div></div><div className="report-sections"><div><h3>Positioning</h3><p>{project.concept.positioning || "Unavailable"}</p></div><div><h3>Assumptions</h3>{analysis.assumptions.map((item) => <p key={item}>• {item}</p>)}</div><div><h3>Invalidators</h3>{analysis.invalidators.map((item) => <p key={item}>• {item}</p>)}</div></div></article><section className="history-section"><div className="card-title-row"><div><span className="section-label"><FileClock size={17} /> Report history</span><p>Snapshots record model and data context.</p></div></div>{project.reports.length ? <div className="report-history-list">{project.reports.slice().reverse().map((report) => <div className="card" key={report.id}><span>{new Date(report.createdAt).toLocaleString()}</span><b>Score {report.demandScore ?? "—"}</b><b>Evidence {report.evidenceReadiness}%</b><small>{report.modelVersion}</small></div>)}</div> : <p className="inline-empty">No report snapshots saved yet.</p>}</section></div>;
}

function DataSourcesView({ project, onEdit, onUpdate, notify }) {
  if (!project) return <SectionNeedsProject title="Data sources" onAction={onEdit} />;
  const coverage = sourceCoverage(project);
  const [checkedAt, setCheckedAt] = useState(project.sourceCheckedAt || null);
  const refresh = () => { const now = new Date().toISOString(); setCheckedAt(now); onUpdate({ ...project, sourceCheckedAt: now, updatedAt: now }); notify("Source health recalculated."); };
  return <div className="content section-page"><section className="page-heading"><div><span className="eyebrow">Administrative monitoring</span><h1>Data sources</h1><p>Coverage, freshness, provenance, and reliability for every signal.</p></div><button className="button dark" onClick={refresh}><RefreshCw size={15} /> Refresh checks</button></section><div className="source-health-grid"><article className="card actual-metric"><span>Coverage</span><strong>{coverage.coverage}%</strong><small>Populated expected fields</small></article><article className="card actual-metric"><span>Freshest observation</span><strong>{coverage.freshest ? new Date(coverage.freshest).toLocaleDateString() : "—"}</strong><small>From observed_at</small></article><article className="card actual-metric"><span>Records</span><strong>{coverage.rowCount}</strong><small>Parsed locally</small></article><article className="card actual-metric"><span>Last health check</span><strong>{checkedAt ? new Date(checkedAt).toLocaleTimeString() : "Never"}</strong><small>Manual check</small></article></div><article className="card source-monitor"><div className="card-title-row"><div><span className="section-label"><Database size={17} /> Source register</span><p>Only sources actually attached to this project appear here.</p></div></div><div className="source-row"><span className="lineage-dot user" /><div><b>Product concept</b><small>User-entered data</small></div><span>Fresh</span><span>Core fields</span><strong>User supplied</strong><button onClick={onEdit}><Pencil size={14} /> Edit</button></div>{project.catalogue ? <div className="source-row"><span className="lineage-dot csv" /><div><b>{project.catalogue.fileName}</b><small>{coverage.rowCount} rows · added {new Date(project.catalogue.uploadedAt).toLocaleDateString()}</small></div><span>{coverage.freshest ? new Date(coverage.freshest).toLocaleDateString() : "Unknown"}</span><span>{coverage.coverage}%</span><strong>{project.catalogue.reliability}</strong><button onClick={onEdit}><Upload size={14} /> Replace</button></div> : <div className="source-row missing-source"><span className="lineage-dot missing" /><div><b>Comparable catalogue</b><small>Not connected</small></div><span>—</span><span>0%</span><strong>Unavailable</strong><button onClick={onEdit}><Plus size={14} /> Add</button></div>}<div className="source-row missing-source"><span className="lineage-dot missing" /><div><b>Live market integrations</b><small>No external API or licensed source configured</small></div><span>—</span><span>0%</span><strong>Unavailable</strong><button onClick={() => notify("Live integrations require provider credentials and a server-side connector.", "info")}><Link2 size={14} /> Details</button></div></article><article className="card source-columns"><span className="section-label"><ClipboardCheck size={17} /> Field coverage</span><div>{coverage.expected.map((field) => <span className={coverage.present.includes(field) ? "present" : ""} key={field}>{coverage.present.includes(field) ? <Check size={11} /> : <X size={11} />}{field}</span>)}</div></article></div>;
}

function SettingsView({ workspace, setWorkspace, notify }) {
  const [profile, setProfile] = useState(workspace.profile);
  const importInput = useRef(null);
  useEffect(() => setProfile(workspace.profile), [workspace.profile]);
  const change = (event) => setProfile((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const save = () => { setWorkspace((current) => ({ ...current, profile })); notify("Workspace settings saved."); };
  const importBackup = async (file) => { try { const imported = await importWorkspace(file); setWorkspace(imported); notify("Workspace backup restored."); } catch (error) { notify(error.message, "error"); } };
  const upgrade = (plan) => {
    if (!profile.stripePaymentLink) return notify("Add a Stripe Payment Link before opening checkout.", "info");
    window.open(profile.stripePaymentLink, "_blank", "noopener,noreferrer");
    notify(`${plan} checkout opened in a new tab.`);
  };
  return <div className="content section-page settings-page"><section className="page-heading"><div><span className="eyebrow">Account and organization</span><h1>Settings</h1><p>Manage local identity, billing configuration, privacy, and backups.</p></div><button className="button dark" onClick={save}><Save size={15} /> Save settings</button></section><div className="settings-grid"><div className="left-stack"><article className="card settings-card"><span className="section-label"><Users size={17} /> Organization</span><div className="field-grid"><Field label="Your name" name="name" value={profile.name} onChange={change} /><Field label="Email" name="email" value={profile.email} onChange={change} type="email" /><Field label="Organization" name="organization" value={profile.organization} onChange={change} /><label className="setup-field"><span>Role</span><select name="role" value={profile.role} onChange={change}><option>Founder</option><option>Product manager</option><option>Agency</option><option>Investor</option><option>Analyst</option></select></label><label className="setup-field"><span>Currency</span><select name="currency" value={profile.currency} onChange={change}><option>AUD</option><option>USD</option><option>GBP</option><option>EUR</option></select></label></div></article><article className="card settings-card"><span className="section-label"><CreditCard size={17} /> Billing</span><p className="settings-intro">GitHub Pages cannot safely hold secret Stripe keys. Add a public Stripe Payment Link to enable checkout buttons.</p><div className="billing-current"><span>Current plan</span><strong>{profile.plan}</strong></div><Field label="Stripe Payment Link" name="stripePaymentLink" value={profile.stripePaymentLink} onChange={change} type="url" placeholder="https://buy.stripe.com/..." hint="Public payment links only—never enter a secret key." /><div className="plan-grid">{[["Pro", "$99–$299/mo"],["Agency", "$500–$2,000/mo"],["Enterprise", "Custom"]].map(([plan, price]) => <button key={plan} onClick={() => upgrade(plan)}><b>{plan}</b><span>{price}</span><small>Open checkout <ExternalLink size={11} /></small></button>)}</div></article><article className="card settings-card"><span className="section-label"><ShieldCheck size={17} /> Privacy and training</span><label className="consent-row"><input type="checkbox" name="privateDataTrainingConsent" checked={profile.privateDataTrainingConsent} onChange={change} /><span><b>Allow private project data to be used for shared model improvement</b><small>Off by default. This local version does not transmit project data.</small></span></label></article></div><aside className="right-stack"><article className="card settings-card"><span className="section-label"><Database size={17} /> Backup and restore</span><p className="settings-intro">Export a complete JSON backup before clearing browser storage or switching devices.</p><button className="button secondary full" onClick={() => exportWorkspace(workspace)}><Download size={15} /> Export workspace</button><input ref={importInput} className="hidden-input" type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} /><button className="button secondary full" onClick={() => importInput.current?.click()}><Upload size={15} /> Restore backup</button></article><article className="card settings-card danger-zone"><span className="section-label"><Trash2 size={17} /> Delete workspace</span><p className="settings-intro">Permanently remove all locally stored projects, reports, experiments, and settings.</p><button className="button danger full" onClick={() => { if (window.confirm("Delete every DemandLab project and setting from this browser? This cannot be undone.")) { clearWorkspace(); setWorkspace(clone(DEFAULT_WORKSPACE)); notify("Local workspace deleted."); } }}><Trash2 size={15} /> Delete all local data</button></article></aside></div></div>;
}

function EmptyState({ icon: Icon, title, text, action, onAction }) { return <div className="empty-section card"><span><Icon size={27} /></span><h2>{title}</h2><p>{text}</p><button className="button dark" onClick={onAction}><Plus size={16} /> {action}</button></div>; }
function SectionNeedsProject({ title, onAction }) { return <div className="content empty-section-content"><EmptyState icon={Database} title={`No project selected for ${title.toLowerCase()}`} text="Open a project or create one using your own evidence." action="Go to projects" onAction={onAction} /></div>; }

function HelpModal({ onClose }) { return <Modal title="DemandLab help" onClose={onClose}><div className="help-content"><p><b>1. Create a project</b><br />Enter a real concept and optional historical performance.</p><p><b>2. Attach comparable evidence</b><br />Use a permitted CSV. No restricted scraping is performed.</p><p><b>3. Review traceable outputs</b><br />Unavailable evidence remains unavailable. Every score exposes its source.</p><p><b>4. Run an experiment</b><br />Record actual results to improve future decisions.</p><p><b>5. Export and back up</b><br />Reports and workspace backups work entirely in your browser.</p><div className="formula-note"><ShieldCheck size={16} /> DemandLab is decision-support software, not a guarantee of product success.</div></div></Modal>; }

export default function App() {
  const [workspace, setWorkspace] = useState(() => loadWorkspace() || clone(DEFAULT_WORKSPACE));
  const [active, setActive] = useState("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(clone(EMPTY_CONCEPT));
  const [draftCatalogue, setDraftCatalogue] = useState(null);
  const [editorError, setEditorError] = useState("");
  const [toast, setToast] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!saveWorkspace(workspace)) setToast({ message: "Browser storage is full. Export a backup, then remove large images or old projects.", type: "error", id: Date.now() });
  }, [workspace]);
  const activeProject = workspace.projects.find((project) => project.id === workspace.activeProjectId) || null;
  const notify = (message, type = "success") => setToast({ message, type, id: Date.now() });
  const navigate = (section) => { setActive(section); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const beginNew = () => { setDraft(clone(EMPTY_CONCEPT)); setDraftCatalogue(null); setEditorError(""); setEditing("new"); navigate("Projects"); };
  const beginEdit = () => { if (!activeProject) return beginNew(); setDraft(clone(activeProject.concept)); setDraftCatalogue(clone(activeProject.catalogue)); setEditorError(""); setEditing(activeProject.id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const saveProject = () => {
    const now = new Date().toISOString();
    if (editing === "new") {
      const id = createId("project");
      const project = { id, concept: clone(draft), catalogue: clone(draftCatalogue), experiments: [], scenarios: [], reports: [], versions: [{ id: createId("version"), createdAt: now, note: "Project created", concept: clone(draft), catalogue: clone(draftCatalogue) }], createdAt: now, updatedAt: now };
      setWorkspace((current) => ({ ...current, projects: [...current.projects, project], activeProjectId: id }));
      notify("Project created.");
    } else {
      setWorkspace((current) => ({ ...current, projects: current.projects.map((project) => project.id === editing ? { ...project, concept: clone(draft), catalogue: clone(draftCatalogue), updatedAt: now, versions: [...project.versions, { id: createId("version"), createdAt: now, note: "Inputs updated", concept: clone(draft), catalogue: clone(draftCatalogue) }] } : project) }));
      notify("Project saved as a new version.");
    }
    setEditing(null); navigate("Overview");
  };
  const updateProject = (updated) => setWorkspace((current) => ({ ...current, projects: current.projects.map((project) => project.id === updated.id ? updated : project) }));
  const openProject = (id) => { setWorkspace((current) => ({ ...current, activeProjectId: id })); setEditing(null); navigate("Overview"); };
  const deleteProject = (id = activeProject?.id) => { if (!id || !window.confirm("Delete this project and all of its experiments, reports, and versions?")) return; setWorkspace((current) => { const projects = current.projects.filter((project) => project.id !== id); return { ...current, projects, activeProjectId: current.activeProjectId === id ? projects[0]?.id || null : current.activeProjectId }; }); setEditing(null); navigate("Projects"); notify("Project deleted."); };
  const duplicateProject = (id) => { const source = workspace.projects.find((project) => project.id === id); if (!source) return; const now = new Date().toISOString(); const copy = clone(source); copy.id = createId("project"); copy.concept.name = `${source.concept.name} copy`; copy.createdAt = now; copy.updatedAt = now; copy.versions = [{ id: createId("version"), createdAt: now, note: "Duplicated project", concept: clone(copy.concept), catalogue: clone(copy.catalogue) }]; setWorkspace((current) => ({ ...current, projects: [...current.projects, copy], activeProjectId: copy.id })); notify("Project duplicated."); };
  const restoreVersion = (projectId, versionId) => { setWorkspace((current) => ({ ...current, projects: current.projects.map((project) => { if (project.id !== projectId) return project; const version = project.versions.find((item) => item.id === versionId); if (!version) return project; const now = new Date().toISOString(); return { ...project, concept: clone(version.concept), catalogue: clone(version.catalogue), updatedAt: now, versions: [...project.versions, { id: createId("version"), createdAt: now, note: "Restored earlier version", concept: clone(version.concept), catalogue: clone(version.catalogue) }] }; }) })); notify("Project version restored."); };

  let view;
  if (editing) view = <ProjectEditor draft={draft} setDraft={setDraft} catalogue={draftCatalogue} setCatalogue={setDraftCatalogue} error={editorError} setError={setEditorError} onSave={saveProject} onCancel={() => setEditing(null)} isEditing={editing !== "new"} />;
  else if (active === "Overview") view = activeProject ? <Overview project={activeProject} onEdit={beginEdit} onDelete={() => deleteProject()} onUpdate={updateProject} onNavigate={navigate} notify={notify} /> : <div className="content empty-section-content"><EmptyState icon={Gauge} title="Start your first evidence profile" text="DemandLab begins empty and analyses only the product and market evidence you supply." action="Create project" onAction={beginNew} /></div>;
  else if (active === "Projects") view = <ProjectsView workspace={workspace} activeProjectId={workspace.activeProjectId} onOpen={openProject} onNew={beginNew} onDuplicate={duplicateProject} onDelete={deleteProject} onRestoreVersion={restoreVersion} />;
  else if (active === "Comparables") view = <ComparablesView project={activeProject} onEdit={activeProject ? beginEdit : () => navigate("Projects")} notify={notify} />;
  else if (active === "Experiments") view = <ExperimentsView project={activeProject} onUpdate={updateProject} onEdit={() => navigate("Projects")} notify={notify} />;
  else if (active === "Reports") view = <ReportsView project={activeProject} organization={workspace.profile.organization} onUpdate={updateProject} onEdit={() => navigate("Projects")} notify={notify} />;
  else if (active === "Data sources") view = <DataSourcesView project={activeProject} onEdit={activeProject ? beginEdit : () => navigate("Projects")} onUpdate={updateProject} notify={notify} />;
  else view = <SettingsView workspace={workspace} setWorkspace={setWorkspace} notify={notify} />;

  return <div className="app-shell"><SideNav active={active} onNavigate={navigate} collapsed={collapsed} setCollapsed={setCollapsed} workspace={workspace} onHelp={() => setHelpOpen(true)} /><main className="main-area"><TopBar active={active} project={activeProject} workspace={workspace} onOpenSettings={() => navigate("Settings")} />{view}</main><Toast toast={toast} onClose={() => setToast(null)} />{helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}</div>;
}
