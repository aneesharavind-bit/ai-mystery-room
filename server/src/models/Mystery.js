import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  relationshipToCase: { type: String, required: true },
  possibleMotive: { type: String, default: '' }
}, { _id: false });

const evidenceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['WhatsApp Message', 'Image', 'CCTV Recording', 'Document', 'Witness Statement'], required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  relatedSuspectIds: [{ type: String }]
}, { _id: false });

const mysterySchema = new mongoose.Schema({
  scenario: { type: String, required: true },
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  style: { type: String, enum: ['classic', 'psychological', 'thriller', 'heist'], default: 'classic' },
  depth: { type: String, enum: ['quick', 'standard', 'deep'], default: 'standard' },
  introduction: { type: String, required: true },
  crimeDescription: { type: String, required: true },
  suspects: { type: [suspectSchema], required: true },
  evidence: { type: [evidenceSchema], required: true },
  culpritId: { type: String, required: true },
  solutionExplanation: { type: String, required: true },
  keyEvidenceIds: [{ type: String }],
  submittedSuspectId: { type: String },
  isCorrect: { type: Boolean }
}, { timestamps: true });

export default mongoose.model('Mystery', mysterySchema);
