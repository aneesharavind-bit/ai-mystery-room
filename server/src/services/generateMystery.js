import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'node:crypto';

const evidenceTypes = ['WhatsApp Message', 'Image', 'CCTV Recording', 'Document', 'Witness Statement'];

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export function validateMystery(data, { depth = 'standard' } = {}) {
  if (!data || !['title', 'introduction', 'crimeDescription', 'solutionExplanation'].every((key) => typeof data[key] === 'string' && data[key].trim()) || !Array.isArray(data.suspects) || !Array.isArray(data.evidence) || typeof data.culpritId !== 'string' || !data.culpritId.trim()) {
    throw new Error('The generated case was missing required information. Please try again.');
  }
  if (data.suspects.length < 3) throw new Error('The generated case needs at least three suspects. Please try again.');
  const minimumEvidence = depth === 'quick' ? 4 : depth === 'deep' ? 7 : 5;
  if (data.evidence.length < minimumEvidence) throw new Error('The generated case needs more evidence. Please try again.');
  if (data.suspects.some((suspect) => !suspect || typeof suspect !== 'object' || Array.isArray(suspect)) || data.evidence.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('The generated case contained malformed records. Please try again.');
  data.suspects = data.suspects.map((suspect) => ({ ...suspect, id: String(suspect.id || randomUUID()) }));
  data.evidence = data.evidence.map((item) => ({ ...item, id: String(item.id || randomUUID()), type: evidenceTypes.includes(item.type) ? item.type : 'Document', relatedSuspectIds: Array.isArray(item.relatedSuspectIds) ? item.relatedSuspectIds.map(String) : [] }));
  if (new Set(data.suspects.map((suspect) => suspect.id)).size !== data.suspects.length) throw new Error('The generated case contained duplicate suspect IDs. Please try again.');
  if (new Set(data.evidence.map((item) => item.id)).size !== data.evidence.length) throw new Error('The generated case contained duplicate evidence IDs. Please try again.');
  if (!data.suspects.some((suspect) => suspect.id === String(data.culpritId))) throw new Error('The generated solution did not match a suspect. Please try again.');
  if (data.suspects.some((suspect) => !suspect || !['name', 'description', 'relationshipToCase'].every((key) => typeof suspect[key] === 'string' && suspect[key].trim()))) throw new Error('A suspect profile was incomplete. Please try again.');
  if (data.evidence.some((item) => !item || !['title', 'description', 'content'].every((key) => typeof item[key] === 'string' && item[key].trim()))) throw new Error('An evidence item was incomplete. Please try again.');
  data.culpritId = String(data.culpritId);
  data.keyEvidenceIds = Array.isArray(data.keyEvidenceIds) ? data.keyEvidenceIds.map(String) : data.evidence.slice(0, 2).map((item) => item.id);
  const evidenceIds = new Set(data.evidence.map((item) => item.id));
  if (!data.keyEvidenceIds.length || data.keyEvidenceIds.some((id) => !evidenceIds.has(id))) throw new Error('The generated solution referenced missing evidence. Please try again.');
  const suspectIds = new Set(data.suspects.map((suspect) => suspect.id));
  if (data.evidence.some((item) => item.relatedSuspectIds.some((id) => !suspectIds.has(id)))) throw new Error('The generated evidence referenced a missing suspect. Please try again.');
  return data;
}

export async function generateMystery(scenario, settings = {}) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Mystery generation is not configured yet. Add GEMINI_API_KEY to server/.env.');
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.6-flash', generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } });
  const difficulty = {
    easy: 'Easy: make the key clues clear and the deduction straightforward, with minimal ambiguity.',
    medium: 'Medium: use subtle connections and one plausible misleading detail while keeping the solution fair.',
    hard: 'Hard: build a layered clue chain with credible red herrings; require comparing several details, but make the solution uniquely defensible.'
  }[settings.difficulty] || 'Medium: use subtle connections and one plausible misleading detail while keeping the solution fair.';
  const style = {
    classic: 'Classic Detective: emphasize alibis, motive, opportunity, and careful deduction.',
    psychological: 'Psychological Mystery: emphasize conflicting memories, relationships, and unreliable interpretations without making the facts arbitrary.',
    thriller: 'Thriller: emphasize urgency, escalating stakes, and time-sensitive evidence while keeping all events fictional.',
    heist: 'Heist or Disappearance: center the case on a missing person, object, or carefully planned disappearance.'
  }[settings.style] || 'Classic Detective: emphasize alibis, motive, opportunity, and careful deduction.';
  const depth = {
    quick: 'Quick Case: concise briefing, 3 suspects, and 4-5 focused evidence items.',
    standard: 'Standard Case: balanced narrative, 3-5 suspects, and 5-7 varied evidence items.',
    deep: 'Deep Investigation: richer narrative connections, 4-5 suspects, and 7-9 distinct evidence items.'
  }[settings.depth] || 'Standard Case: balanced narrative, 3-5 suspects, and 5-7 varied evidence items.';
  const prompt = `Create an original, fully fictional, fair-play mystery investigation inspired by this user scenario: ${JSON.stringify(scenario)}\n\nInvestigation settings:\n- Difficulty: ${difficulty}\n- Mystery style: ${style}\n- Depth: ${depth}\nHonor these settings in the number and subtlety of clues, story tone, and amount of material.\n\nReturn only JSON with this shape: {"title":"...","introduction":"...","crimeDescription":"...","suspects":[{"id":"s1","name":"...","description":"...","relationshipToCase":"...","possibleMotive":"..."}],"evidence":[{"id":"e1","title":"...","type":"WhatsApp Message|Image|CCTV Recording|Document|Witness Statement","description":"...","content":"...","relatedSuspectIds":["s1"]}],"culpritId":"s1","solutionExplanation":"...","keyEvidenceIds":["e1"]}. Give every suspect a plausible motive or reason for suspicion. Exactly one culprit must be named by culpritId and be in suspects. The clues must provide enough fair, specific information to deduce the culprit; at least two clues should combine to distinguish them. Evidence content should be readable text (describe visual/audio media as a transcript or scene description). Keep the culprit and solution out of introduction, crimeDescription, suspect descriptions, and evidence titles/descriptions/content: those must not reveal the answer outright. Explain the clue chain in solutionExplanation and list key evidence IDs.`;
  const result = await model.generateContent(prompt);
  return validateMystery(parseJson(result.response.text()), settings);
}
