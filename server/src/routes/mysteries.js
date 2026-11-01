import { Router } from 'express';
import Mystery from '../models/Mystery.js';
import { generateMystery } from '../services/generateMystery.js';

const router = Router();
const settings = {
  difficulty: ['easy', 'medium', 'hard'],
  style: ['classic', 'psychological', 'thriller', 'heist'],
  depth: ['quick', 'standard', 'deep']
};
const publicCase = (mystery) => ({
  id: String(mystery._id), title: mystery.title, introduction: mystery.introduction,
  difficulty: mystery.difficulty || 'medium', style: mystery.style || 'classic', depth: mystery.depth || 'standard',
  crimeDescription: mystery.crimeDescription, suspects: mystery.suspects,
  evidence: mystery.evidence, createdAt: mystery.createdAt,
  status: mystery.submittedSuspectId ? 'solved' : 'active',
  result: mystery.submittedSuspectId ? {
    isCorrect: mystery.isCorrect,
    culprit: mystery.suspects.find((suspect) => suspect.id === mystery.culpritId),
    solutionExplanation: mystery.solutionExplanation,
    keyEvidence: mystery.evidence.filter((item) => mystery.keyEvidenceIds.includes(item.id))
  } : null
});

// The app has no accounts yet, so the browser supplies its locally saved case IDs.
router.get('/', async (req, res, next) => {
  try {
    const rawIds = typeof req.query.ids === 'string' ? req.query.ids.split(',') : [];
    const ids = [...new Set(rawIds.filter((id) => /^[a-f\d]{24}$/i.test(id)))].slice(0, 100);
    if (!ids.length) return res.json({ cases: [] });
    const mysteries = await Mystery.find({ _id: { $in: ids } }).sort({ createdAt: -1 });
    res.json({ cases: mysteries.map((mystery) => ({ ...publicCase(mystery), scenario: mystery.scenario })) });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const scenario = typeof req.body?.scenario === 'string' ? req.body.scenario.trim() : '';
    if (!scenario) return res.status(400).json({ error: 'Enter a scenario to create your mystery.' });
    if (scenario.length > 1200) return res.status(400).json({ error: 'Keep your scenario under 1,200 characters.' });
    const preferences = {
      difficulty: req.body?.difficulty || 'medium',
      style: req.body?.style || 'classic',
      depth: req.body?.depth || 'standard'
    };
    for (const key of Object.keys(settings)) {
      if (!settings[key].includes(preferences[key])) return res.status(400).json({ error: `Choose a valid ${key}.` });
    }
    const generated = await generateMystery(scenario, preferences);
    const mystery = await Mystery.create({ ...generated, ...preferences, scenario });
    res.status(201).json({ mystery: publicCase(mystery) });
  } catch (error) { next(error); }
});

router.patch('/:id/title', async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Mystery not found.' });
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (title.length < 3 || title.length > 80) return res.status(400).json({ error: 'A case title must be between 3 and 80 characters.' });
    const mystery = await Mystery.findById(req.params.id);
    if (!mystery) return res.status(404).json({ error: 'Mystery not found.' });
    mystery.title = title;
    await mystery.save();
    res.json({ mystery: publicCase(mystery) });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Mystery not found.' });
    const mystery = await Mystery.findById(req.params.id);
    if (!mystery) return res.status(404).json({ error: 'Mystery not found.' });
    res.json({ mystery: publicCase(mystery) });
  } catch (error) { next(error); }
});

router.post('/:id/accuse', async (req, res, next) => {
  try {
    const { suspectId } = req.body || {};
    const mystery = /^[a-f\d]{24}$/i.test(req.params.id) ? await Mystery.findById(req.params.id) : null;
    if (!mystery) return res.status(404).json({ error: 'Mystery not found.' });
    if (mystery.submittedSuspectId) return res.status(409).json({ error: 'An accusation has already been submitted for this case.' });
    if (typeof suspectId !== 'string' || !mystery.suspects.some((suspect) => suspect.id === suspectId)) return res.status(400).json({ error: 'Choose a suspect from this case.' });
    mystery.submittedSuspectId = suspectId;
    mystery.isCorrect = suspectId === mystery.culpritId;
    await mystery.save();
    const culprit = mystery.suspects.find((suspect) => suspect.id === mystery.culpritId);
    const keyEvidence = mystery.evidence.filter((item) => mystery.keyEvidenceIds.includes(item.id));
    res.json({ result: { isCorrect: mystery.isCorrect, culprit, solutionExplanation: mystery.solutionExplanation, keyEvidence } });
  } catch (error) { next(error); }
});

export default router;
