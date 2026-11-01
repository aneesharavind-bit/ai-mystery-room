const CASE_IDS_KEY = 'casefile.caseIds';
const CASE_NOTES_KEY = 'casefile.caseNotes';
const BRIEFINGS_KEY = 'casefile.briefingsSeen';

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function getSavedCaseIds() {
  const value = readJson(CASE_IDS_KEY, []);
  return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)))].slice(0, 100) : [];
}

export function rememberCase(id) {
  const ids = getSavedCaseIds().filter((savedId) => savedId !== id);
  try { localStorage.setItem(CASE_IDS_KEY, JSON.stringify([id, ...ids].slice(0, 100))); } catch { /* storage may be disabled or full */ }
}

export function getCaseNotes(id) {
  const notes = readJson(CASE_NOTES_KEY, {});
  const record = notes && typeof notes === 'object' ? notes[id] : null;
  return {
    reviewedIds: Array.isArray(record?.reviewedIds) ? record.reviewedIds.filter((item) => typeof item === 'string') : [],
    importantIds: Array.isArray(record?.importantIds) ? record.importantIds.filter((item) => typeof item === 'string') : []
  };
}

export function saveCaseNotes(id, caseNotes) {
  const notes = readJson(CASE_NOTES_KEY, {});
  try { localStorage.setItem(CASE_NOTES_KEY, JSON.stringify({ ...(notes && typeof notes === 'object' ? notes : {}), [id]: caseNotes })); } catch { /* the investigation still works when storage is unavailable */ }
}

export function hasSeenBriefing(id) {
  const ids = readJson(BRIEFINGS_KEY, []);
  return Array.isArray(ids) && ids.includes(id);
}

export function markBriefingSeen(id) {
  const ids = readJson(BRIEFINGS_KEY, []);
  try { localStorage.setItem(BRIEFINGS_KEY, JSON.stringify([...new Set([...(Array.isArray(ids) ? ids : []), id])].slice(-100))); } catch { /* briefing can be shown again if storage is unavailable */ }
}
