import React, { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CalendarDays, Check,
  ChevronRight, CircleHelp, Clock3, FileText, Fingerprint, FolderOpen, Image as ImageIcon,
  LoaderCircle, LockKeyhole, MessageCircle, Pencil, Search, ShieldAlert, Sparkles, UserRound,
  Video, X
} from 'lucide-react';
import { getCaseNotes, getSavedCaseIds, hasSeenBriefing, markBriefingSeen, rememberCase, saveCaseNotes } from './caseStorage.js';

const API = import.meta.env.VITE_API_URL || 'https://ai-mystery-room-dmrx.onrender.com/api';
const typeIcons = { 'WhatsApp Message': MessageCircle, Image: ImageIcon, 'CCTV Recording': Video, Document: FileText, 'Witness Statement': UserRound };

async function request(path, options) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  let data;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  if (!data || typeof data !== 'object') throw new Error('The server returned an unexpected response. Please try again.');
  return data;
}

async function fetchSavedCases() {
  const ids = getSavedCaseIds();
  if (!ids.length) return [];
  const { cases } = await request(`/mysteries?ids=${encodeURIComponent(ids.join(','))}`);
  return Array.isArray(cases) ? cases : [];
}

function isSolved(item) {
  return item.status === 'solved' || Boolean(item.result);
}

function isUsableMystery(mystery) {
  return mystery && typeof mystery === 'object' && typeof mystery.title === 'string' &&
    typeof mystery.introduction === 'string' && typeof mystery.crimeDescription === 'string' &&
    Array.isArray(mystery.suspects) && mystery.suspects.length >= 3 &&
    mystery.suspects.every((suspect) => suspect && typeof suspect.id === 'string' && typeof suspect.name === 'string') &&
    Array.isArray(mystery.evidence) && mystery.evidence.length > 0 &&
    mystery.evidence.every((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.type === 'string');
}

function isUsableResult(result) {
  return result && typeof result.isCorrect === 'boolean' && result.culprit &&
    typeof result.culprit.name === 'string' && typeof result.solutionExplanation === 'string' &&
    Array.isArray(result.keyEvidence) && result.keyEvidence.every((item) => item && typeof item.id === 'string' && typeof item.title === 'string');
}

function Header({ compact = false }) {
  return <header className="topbar">
    <Link to="/" className="brand"><span className="brand-mark"><Fingerprint size={19} /></span><span>CASEFILE<span className="brand-dot">.</span></span></Link>
    <div className="topbar-right">
      <span className="secure-label"><span className="status-dot" /> FICTIONAL CASEWORK</span>
      <nav className="top-nav" aria-label="Main navigation">
        <Link className="top-link" to="/archive"><FolderOpen size={14} /> Case archive</Link>
        {!compact && <a className="top-link how-link" href="#how-it-works">How it works <ArrowDown size={14} /></a>}
      </nav>
    </div>
  </header>;
}

function CaseCard({ item, compact = false }) {
  const solved = isSolved(item);
  const preview = item.scenario || item.introduction || 'An investigation is waiting to be reopened.';
  return <article className={`archive-card ${compact ? 'archive-card-compact' : ''}`}>
    <div className="archive-card-top"><span className={`archive-status ${solved ? 'solved' : 'active'}`}><span />{solved ? 'SOLVED' : 'IN PROGRESS'}</span><span className="archive-file">FILE / {String(item.id).slice(-6).toUpperCase()}</span></div>
    <h3>{item.title}</h3>
    <div className="archive-tags"><span>{item.difficulty || 'medium'} difficulty</span><span>{(item.style || 'classic').replace('-', ' ')}</span><span>{(item.depth || 'standard').replace('-', ' ')}</span></div>
    <p className="archive-preview">{preview}</p>
    <div className="archive-meta">
      <span><CalendarDays size={13} /> {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable'}</span>
      <span><UserRound size={13} /> {item.suspects?.length ?? 0} suspects</span>
      <span><FileText size={13} /> {item.evidence?.length ?? 0} evidence</span>
    </div>
    <Link className="archive-action" to={`/case/${item.id}`}>{solved ? 'Review case' : 'Continue investigation'} <ArrowRight size={15} /></Link>
  </article>;
}

function Dashboard({ cases, loading, error }) {
  const active = cases.filter((item) => !isSolved(item)).length;
  const solved = cases.length - active;
  const recent = cases.slice(0, 3);
  return <section className="dashboard-block" aria-label="Case dashboard">
    <div className="dashboard-head"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR DESK</div><h2>Investigation overview</h2></div><Link className="text-button archive-all" to="/archive">Open case archive <ArrowRight size={14} /></Link></div>
    <div className="stat-strip">
      <div className="stat-card"><span>TOTAL CASES</span><strong>{loading ? '—' : cases.length.toString().padStart(2, '0')}</strong><small>In your archive</small></div>
      <div className="stat-card"><span>ACTIVE</span><strong>{loading ? '—' : active.toString().padStart(2, '0')}</strong><small>Still under investigation</small></div>
      <div className="stat-card"><span>SOLVED</span><strong>{loading ? '—' : solved.toString().padStart(2, '0')}</strong><small>Cases brought to a close</small></div>
    </div>
    <div className="recent-head"><h3>Recent cases</h3><span>{cases.length ? 'LATEST FILES' : 'YOUR NEXT CASE STARTS HERE'}</span></div>
    {error && <p className="inline-error"><CircleHelp size={15} /> {error}</p>}
    {loading ? <div className="archive-empty compact-empty"><LoaderCircle className="spin" size={20} /><span>Retrieving your case files…</span></div> : recent.length ? <div className="recent-grid">{recent.map((item) => <CaseCard key={item.id} item={item} compact />)}</div> : <div className="archive-empty compact-empty"><FolderOpen size={21} /><span>No saved cases yet. Create your first investigation above.</span></div>}
  </section>;
}

function Home() {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [style, setStyle] = useState('classic');
  const [depth, setDepth] = useState('standard');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [archiveError, setArchiveError] = useState('');

  const loadingMessages = ['Reviewing witness statements…', 'Following the trail…', 'Cross-referencing the evidence…', 'Something doesn’t add up…'];

  useEffect(() => {
    if (!loading) return undefined;
    const timer = window.setInterval(() => setLoadingMessage((index) => (index + 1) % loadingMessages.length), 2400);
    return () => window.clearInterval(timer);
  }, [loading, loadingMessages.length]);

  useEffect(() => {
    let active = true;
    fetchSavedCases().then((items) => { if (active) setCases(items); })
      .catch((err) => { if (active) setArchiveError(err.message); })
      .finally(() => { if (active) setCasesLoading(false); });
    return () => { active = false; };
  }, []);

  async function createCase(event) {
    event.preventDefault(); setError('');
    if (!scenario.trim()) { setError('Write a short scenario to begin.'); return; }
    setLoading(true);
    try {
      const { mystery } = await request('/mysteries', { method: 'POST', body: JSON.stringify({ scenario: scenario.trim(), difficulty, style, depth }) });
      rememberCase(mystery.id);
      navigate(`/case/${mystery.id}`);
    } catch (err) { setError(err.message); setLoading(false); }
  }

  return <><Header /><main className="home">
    <div className="hero-grid">
      <section className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE CASE ISN’T CLOSED</div><h1>Some truths<br />are <em>buried.</em></h1><p className="hero-lede">Every story leaves a trace. Set the scene, enter a living case file, and follow the details someone hoped you’d miss.</p><div className="hero-meta"><span><span className="mini-dot" /> YOUR STORY, RECAST AS A CASE</span><span className="meta-divider" /><span><LockKeyhole size={13} /> THE CULPRIT STAYS SEALED</span></div><Link className="hero-archive-link" to="/archive"><FolderOpen size={14} /> Browse your case archive <ArrowRight size={14} /></Link></section>
      <section className="form-card"><div className="card-overline"><span>01 / OPEN A NEW FILE</span><span className="card-stamp"><ShieldAlert size={14} /> CLASSIFIED</span></div><h2>Start with a secret.</h2><p className="form-subtitle">Give us the first detail. We’ll build the case around it.</p><form onSubmit={createCase}><label htmlFor="scenario">YOUR SCENARIO</label><textarea id="scenario" maxLength={1200} value={scenario} onChange={(event) => setScenario(event.target.value)} placeholder="A priceless painting vanishes from a private gallery. Four people were inside. The storm has sealed every exit…" /><div className="field-foot"><span>Leave room for the unexpected.</span><span>{scenario.length} / 1,200</span></div><div className="case-settings"><label className="setting-control"><span>DIFFICULTY</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">Easy · clear clues</option><option value="medium">Medium · subtle links</option><option value="hard">Hard · layered clues</option></select></label><label className="setting-control"><span>MYSTERY STYLE</span><select value={style} onChange={(event) => setStyle(event.target.value)}><option value="classic">Classic Detective</option><option value="psychological">Psychological</option><option value="thriller">Thriller</option><option value="heist">Heist / Disappearance</option></select></label><label className="setting-control"><span>CASE DEPTH</span><select value={depth} onChange={(event) => setDepth(event.target.value)}><option value="quick">Quick Case</option><option value="standard">Standard Case</option><option value="deep">Deep Investigation</option></select></label></div>{error && <div className="error-note"><CircleHelp size={15} /> {error}</div>}<button className="button-primary" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Building your case…</> : <>Create a mystery <ArrowRight size={16} /></>}</button>{loading && <div className="generation-caption" role="status"><span className="generation-pulse" /> {loadingMessages[loadingMessage]}</div>}<p className="form-note"><LockKeyhole size={12} /> AI creates the title. The solution stays sealed until your accusation.</p></form></section>
    </div>
    <Dashboard cases={cases} loading={casesLoading} error={archiveError} />
    <section className="teaser-strip"><div className="teaser-heading"><span className="eyebrow"><span className="eyebrow-line" /> THE DETAILS NEVER LIE</span><h2>But they don’t always<br />tell the same story.</h2><p>A timestamp out of place. A witness who remembers too much. The smallest detail can turn a case inside out.</p></div><div className="teaser-clues"><article><span>EXHIBIT 01</span><strong>12:08 AM</strong><small>The camera clock was four minutes slow.</small></article><article><span>STATEMENT 02</span><strong>“I never left.”</strong><small>Someone else remembers the door opening.</small></article><article><span>OBJECT 03</span><strong>Still warm.</strong><small>The room was supposed to be empty.</small></article></div></section>
    <section className="how" id="how-it-works"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE INVESTIGATION</div><h2>Three steps. One truth.</h2></div><span className="section-aside">A GOOD DETECTIVE KNOWS<br />WHEN TO LOOK CLOSER.</span></div><div className="steps"><article className="step"><span className="step-number">01</span><div className="step-icon"><Sparkles size={18} /></div><h3>Set the scene</h3><p>Start with a place, a person, a disappearance. Your idea becomes the seed of a new case.</p></article><article className="step"><span className="step-number">02</span><div className="step-icon"><FileText size={18} /></div><h3>Follow the evidence</h3><p>Study statements, messages, records and more. Every detail might change the picture.</p></article><article className="step"><span className="step-number">03</span><div className="step-icon"><Fingerprint size={18} /></div><h3>Name your suspect</h3><p>Make your accusation. Then find out if you saw through the story—or missed a clue.</p></article></div></section>
  </main><footer className="footer"><span>CASEFILE<span className="brand-dot">.</span> <span className="footer-muted">AN AI MYSTERY ROOM</span></span><span>ALL CASES ARE FICTIONAL</span></footer></>;
}

function Archive() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let active = true;
    fetchSavedCases().then((items) => { if (active) setCases(items); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = cases.filter((item) => {
    const solved = isSolved(item);
    const matchesStatus = filter === 'all' || (filter === 'solved' ? solved : !solved);
    const searchable = `${item.title} ${item.scenario || ''} ${item.introduction || ''}`.toLowerCase();
    return matchesStatus && searchable.includes(query.trim().toLowerCase());
  }).sort((a, b) => {
    const difference = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    return sort === 'newest' ? difference : -difference;
  });

  return <><Header compact /><main className="archive-page">
    <div className="archive-title-row"><div><Link to="/" className="back-link"><ArrowLeft size={15} /> INVESTIGATION DESK</Link><div className="eyebrow archive-eyebrow"><span className="eyebrow-line" /> CASE MANAGEMENT</div><h1>Case archive<span className="brand-dot">.</span></h1><p>Every lead, every decision, kept on file.</p></div><Link to="/" className="button-primary archive-create">Start a new case <ArrowRight size={15} /></Link></div>
    <section className="archive-controls" aria-label="Filter cases"><label className="archive-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case files…" aria-label="Search case files" /></label><div className="archive-filters" role="group" aria-label="Filter by case status">{[['all', 'All cases'], ['active', 'Active'], ['solved', 'Solved']].map(([key, label]) => <button key={key} className={`filter-button ${filter === key ? 'is-active' : ''}`} onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}<span>{key === 'all' ? cases.length : cases.filter((item) => isSolved(item) === (key === 'solved')).length}</span></button>)}</div><label className="sort-select"><span>SORT</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort cases"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></section>
    <div className="archive-results-head"><span>{loading ? 'RETRIEVING FILES…' : `${filtered.length} ${filtered.length === 1 ? 'CASE' : 'CASES'}`}</span><span>PRIVATE CASE INDEX · THIS BROWSER</span></div>
    {error && <div className="error-note archive-error"><CircleHelp size={15} /> {error}</div>}
    {loading ? <div className="archive-empty"><LoaderCircle className="spin" size={22} /><span>Opening the archive…</span></div> : filtered.length ? <div className="archive-grid">{filtered.map((item) => <CaseCard key={item.id} item={item} />)}</div> : <div className="archive-empty"><FolderOpen size={27} /><h2>{cases.length ? 'No matching files.' : 'The archive is ready.'}</h2><p>{cases.length ? 'Try another search or status filter.' : 'Create a mystery and it will be filed here for your next visit.'}</p>{!cases.length && <Link className="button-primary" to="/">Create your first case <ArrowRight size={15} /></Link>}</div>}
  </main><footer className="footer"><span>CASEFILE<span className="brand-dot">.</span> <span className="footer-muted">AN AI MYSTERY ROOM</span></span><span>ALL CASES ARE FICTIONAL</span></footer></>;
}

function CaseRoom() {
  const { id } = useParams(); const navigate = useNavigate();
  const [mystery, setMystery] = useState(null); const [selected, setSelected] = useState(null); const [activeEvidence, setActiveEvidence] = useState(null); const [confirm, setConfirm] = useState(false); const [result, setResult] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [caseNotes, setCaseNotes] = useState(() => getCaseNotes(id));
  const reviewedIds = caseNotes.reviewedIds;
  const importantIds = caseNotes.importantIds;

  useEffect(() => {
    const controller = new AbortController();
    setMystery(null); setResult(null); setError(''); setSelected(null);
    setCaseNotes(getCaseNotes(id));
    request(`/mysteries/${id}`, { signal: controller.signal }).then((data) => {
      if (!isUsableMystery(data.mystery)) throw new Error('This case file is incomplete. Please return to the desk and create a new case.');
      setMystery(data.mystery);
      if (data.mystery.result) {
        if (!isUsableResult(data.mystery.result)) throw new Error('The result for this case could not be loaded. Please refresh the case file.');
        setResult(data.mystery.result);
        setBriefingOpen(false);
      } else setBriefingOpen(!hasSeenBriefing(id));
      setTitleDraft(data.mystery.title);
    }).catch((err) => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [id]);

  useEffect(() => { saveCaseNotes(id, caseNotes); }, [id, caseNotes]);

  function openEvidence(item) {
    setActiveEvidence(item);
    setCaseNotes((current) => ({ ...current, reviewedIds: [...new Set([...current.reviewedIds, item.id])] }));
  }
  function toggleImportant(itemId) {
    setCaseNotes((current) => ({ ...current, importantIds: current.importantIds.includes(itemId) ? current.importantIds.filter((savedId) => savedId !== itemId) : [...current.importantIds, itemId] }));
  }
  function beginInvestigation() {
    markBriefingSeen(id);
    setBriefingOpen(false);
  }
  async function saveTitle() {
    const title = titleDraft.trim();
    if (title.length < 3 || title.length > 80) { setError('A case title must be between 3 and 80 characters.'); return; }
    setSavingTitle(true); setError('');
    try {
      const data = await request(`/mysteries/${id}/title`, { method: 'PATCH', body: JSON.stringify({ title }) });
      setMystery((current) => ({ ...current, title: data.mystery.title }));
      setTitleDraft(data.mystery.title); setEditingTitle(false);
    } catch (err) { setError(err.message); }
    finally { setSavingTitle(false); }
  }
  async function accuse() {
    if (!selected || result) return;
    setLoading(true); setError('');
    try { const data = await request(`/mysteries/${id}/accuse`, { method: 'POST', body: JSON.stringify({ suspectId: selected }) }); if (!isUsableResult(data.result)) throw new Error('The case result could not be loaded. Refresh the case file to see your result.'); setResult(data.result); setConfirm(false); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (error && !mystery) return <><Header compact /><main className="state-page"><div className="state-icon"><CircleHelp /></div><p className="eyebrow">CASE FILE UNAVAILABLE</p><h1>We lost the trail.</h1><p>{error}</p><Link className="button-primary link-button" to="/">Return to the desk <ArrowRight size={16} /></Link></main></>;
  if (!mystery) return <><Header compact /><main className="state-page"><LoaderCircle className="spin" /><p className="eyebrow">OPENING CASE FILE</p><h1>Gathering the evidence.</h1></main></>;

  const progress = mystery.evidence.length ? Math.round((reviewedIds.length / mystery.evidence.length) * 100) : 0;
  const importantItems = mystery.evidence.filter((item) => importantIds.includes(item.id));
  return <><Header compact /><main className="case-page">
    <div className="case-topline"><Link to="/archive" className="back-link"><ArrowLeft size={15} /> CASE ARCHIVE</Link><div className={`case-badge ${result ? 'solved-badge' : ''}`}><span className="status-dot" /> {result ? 'CASE SOLVED' : 'ACTIVE INVESTIGATION'}</div><span className="case-ref">FILE NO. {id.slice(-6).toUpperCase()}</span></div>
    <section className="case-intro"><div className="eyebrow"><span className="eyebrow-line" /> CASE BRIEFING</div><div className="case-title-row">{editingTitle ? <div className="title-editor"><input value={titleDraft} maxLength={80} onChange={(event) => setTitleDraft(event.target.value)} aria-label="Edit case title" onKeyDown={(event) => { if (event.key === 'Enter') saveTitle(); if (event.key === 'Escape') { setTitleDraft(mystery.title); setEditingTitle(false); } }} /><button className="title-save" onClick={saveTitle} disabled={savingTitle}>{savingTitle ? <LoaderCircle className="spin" size={15} /> : 'Save'}</button><button className="title-cancel" onClick={() => { setTitleDraft(mystery.title); setEditingTitle(false); }}>Cancel</button></div> : <><h1>{mystery.title}</h1><button className="edit-title-button" onClick={() => { setTitleDraft(mystery.title); setEditingTitle(true); }} aria-label="Edit case title"><Pencil size={14} /> Edit title</button></>}</div><div className="case-detail-tags"><span>{mystery.difficulty || 'medium'} difficulty</span><span>{(mystery.style || 'classic').replace('-', ' ')}</span><span>{(mystery.depth || 'standard').replace('-', ' ')}</span></div><p className="case-description">{mystery.introduction}</p><div className="crime-box"><div className="crime-label"><ShieldAlert size={15} /> THE INCIDENT</div><p>{mystery.crimeDescription}</p></div></section>
    <section className="case-progress" aria-label="Investigation progress"><div className="progress-copy"><div><span className="eyebrow"><span className="eyebrow-line" /> INVESTIGATION STATUS</span><strong>{result ? 'Case completed' : selected ? 'Suspect selected' : 'Investigation in progress'}</strong></div><span className="progress-count">{reviewedIds.length} reviewed · {importantIds.length} marked important</span></div><div className="progress-track"><span style={{ width: `${Math.min(progress, 100)}%` }} /></div><div className="progress-steps"><span className="step-done"><Check size={12} /> Case opened</span><span className={reviewedIds.length ? 'step-done' : ''}><Check size={12} /> Evidence reviewed</span><span className={selected ? 'step-done' : ''}><Check size={12} /> Suspect selected</span><span className={result ? 'step-done' : ''}><Check size={12} /> Case solved</span></div></section>
    <section className="investigation-grid"><div className="suspects-panel"><div className="panel-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> PERSONS OF INTEREST</span><h2>Who had the means?</h2></div><span className="count-tag">{String(mystery.suspects.length).padStart(2, '0')} SUSPECTS</span></div><div className="suspect-list">{mystery.suspects.map((suspect, index) => <button key={suspect.id} className={`suspect-card ${selected === suspect.id ? 'selected' : ''}`} onClick={() => !result && setSelected(suspect.id)} disabled={Boolean(result)} aria-pressed={selected === suspect.id}><span className="suspect-index">0{index + 1}</span><span className="avatar"><UserRound size={18} /></span><span className="suspect-info"><strong>{suspect.name}</strong><small>{suspect.relationshipToCase}</small></span>{selected === suspect.id ? <span className="selected-check"><Check size={15} /></span> : <ChevronRight size={17} className="suspect-arrow" />}</button>)}</div><div className="accusation-box"><div><span className="eyebrow">YOUR CONCLUSION</span><p>{result ? <>Accusation filed. <strong>Case closed.</strong></> : selected ? <>You’re considering <strong>{mystery.suspects.find((item) => item.id === selected)?.name}</strong>.</> : 'Review the evidence, then select your suspect.'}</p></div><button className="button-primary accuse-button" disabled={!selected || Boolean(result)} onClick={() => setConfirm(true)}>{result ? 'Investigation complete' : 'Make accusation'} {!result && <ArrowRight size={15} />}</button></div></div>
      <aside className="evidence-panel"><div className="panel-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> EVIDENCE LOCKER</span><h2>Look closer.</h2></div><span className="count-tag">{String(mystery.evidence.length).padStart(2, '0')} ITEMS</span></div><div className="evidence-progress"><span>Evidence reviewed</span><strong>{reviewedIds.length} / {mystery.evidence.length}</strong><div className="progress-track"><span style={{ width: `${Math.min(progress, 100)}%` }} /></div></div><p className="evidence-hint">Open every item. Small details can make a big difference.</p><div className="evidence-list">{mystery.evidence.map((item, index) => { const Icon = typeIcons[item.type] || FileText; const reviewed = reviewedIds.includes(item.id); return <button className={`evidence-row ${reviewed ? 'reviewed' : ''}`} key={item.id} onClick={() => openEvidence(item)}><span className="evidence-index">{String(index + 1).padStart(2, '0')}</span><span className="evidence-icon"><Icon size={16} /></span><span className="evidence-copy"><strong>{item.title}</strong><small>{item.type}{reviewed ? ' · REVIEWED' : ''}</small></span>{importantIds.includes(item.id) && <BookmarkCheck size={15} className="evidence-bookmark" />}{reviewed ? <Check size={15} className="evidence-arrow" /> : <ArrowRight size={15} className="evidence-arrow" />}</button>; })}</div>{importantItems.length > 0 && <div className="important-tray"><span className="eyebrow"><BookmarkCheck size={13} /> IMPORTANT EVIDENCE</span><div>{importantItems.map((item) => <button key={item.id} onClick={() => openEvidence(item)}>{item.title}</button>)}</div></div>}<div className="locker-note"><LockKeyhole size={13} /> {result ? 'The solution is now part of this case record.' : 'The solution is sealed until your accusation.'}</div></aside>
    </section>{error && <p className="inline-error">{error}</p>}
  </main>
    {briefingOpen && <div className="modal-backdrop briefing-backdrop"><section className="modal briefing-modal" role="dialog" aria-modal="true" aria-labelledby="briefing-title"><div className="briefing-stamp"><ShieldAlert size={15} /> RESTRICTED CASE FILE</div><span className="eyebrow"><span className="eyebrow-line" /> INITIAL BRIEFING / {id.slice(-6).toUpperCase()}</span><h2 id="briefing-title">{mystery.title}</h2><p className="briefing-intro">Before you enter the room, review the shape of the case. The solution remains sealed.</p><div className="briefing-tags"><span>{mystery.difficulty || 'medium'} difficulty</span><span>{(mystery.style || 'classic').replace('-', ' ')}</span><span>{(mystery.depth || 'standard').replace('-', ' ')}</span></div><p className="briefing-summary">{mystery.introduction}</p><div className="briefing-stats"><div><UserRound size={15} /><strong>{mystery.suspects.length}</strong><span>suspects</span></div><div><FileText size={15} /><strong>{mystery.evidence.length}</strong><span>evidence files</span></div><div><LockKeyhole size={15} /><strong>1</strong><span>sealed solution</span></div></div><button className="button-primary briefing-start" onClick={beginInvestigation}>Enter investigation room <ArrowRight size={16} /></button></section></div>}
    {activeEvidence && <div className="modal-backdrop" onClick={() => setActiveEvidence(null)}><section className="modal evidence-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setActiveEvidence(null)} aria-label="Close"><X size={18} /></button><span className="eyebrow"><span className="eyebrow-line" /> EVIDENCE / {activeEvidence.type.toUpperCase()}</span><h2 id="evidence-title">{activeEvidence.title}</h2><p className="modal-description">{activeEvidence.description}</p><div className="evidence-content">{activeEvidence.content}</div><div className="evidence-mark-row"><button className={`mark-important ${importantIds.includes(activeEvidence.id) ? 'marked' : ''}`} onClick={() => toggleImportant(activeEvidence.id)}>{importantIds.includes(activeEvidence.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{importantIds.includes(activeEvidence.id) ? 'Marked important' : 'Mark as important'}</button><span>{reviewedIds.includes(activeEvidence.id) ? 'REVIEWED' : 'NEW EVIDENCE'}</span></div><div className="modal-foot"><span><Clock3 size={13} /> FILED IN CASE RECORD</span><button className="text-button" onClick={() => setActiveEvidence(null)}>Back to investigation <ArrowRight size={14} /></button></div></section></div>}
    {confirm && <div className="modal-backdrop" onClick={() => setConfirm(false)}><section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setConfirm(false)} aria-label="Close"><X size={18} /></button><div className="confirm-symbol"><Fingerprint size={22} /></div><span className="eyebrow">FINAL DECISION</span><h2 id="confirm-title">Make it official?</h2><p>You’re about to accuse <strong>{mystery.suspects.find((item) => item.id === selected)?.name}</strong>. Once submitted, your choice is locked.</p><div className="confirm-actions"><button className="button-secondary" onClick={() => setConfirm(false)}>Review the evidence</button><button className="button-primary" disabled={loading} onClick={accuse}>{loading ? <LoaderCircle className="spin" size={16} /> : <>Submit accusation <ArrowRight size={15} /></>}</button></div></section></div>}
    {result && <div className="modal-backdrop result-backdrop"><section className="modal result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className={`result-banner ${result.isCorrect ? 'correct' : 'incorrect'}`}><span>{result.isCorrect ? <Check size={22} /> : <Fingerprint size={22} />}</span><div><span className="eyebrow">CASE REVEALED</span><h2 id="result-title">{result.isCorrect ? 'You read the room.' : 'The truth was elsewhere.'}</h2></div></div><div className="result-body"><p className="result-culprit-label">THE CULPRIT</p><h3>{result.culprit.name}</h3><p className="result-culprit-desc">{result.culprit.description}</p><div className="solution-divider" /><span className="eyebrow"><span className="eyebrow-line" /> HOW THE CLUES CONNECT</span><p className="solution-copy">{result.solutionExplanation}</p><div className="key-clues"><span className="eyebrow">KEY EVIDENCE</span>{result.keyEvidence.map((item) => <div className="key-clue" key={item.id}><Check size={14} /><span><strong>{item.title}</strong><small>{item.content}</small></span></div>)}</div><div className="result-actions"><button className="button-secondary" onClick={() => navigate('/archive')}>View case archive</button><button className="button-primary" onClick={() => navigate('/')}>Create another case <ArrowRight size={15} /></button></div></div></section></div>}
  </>;
}

export default function App() {
  return <Routes><Route path="/" element={<Home />} /><Route path="/archive" element={<Archive />} /><Route path="/case/:id" element={<CaseRoom />} /><Route path="*" element={<Home />} /></Routes>;
}
