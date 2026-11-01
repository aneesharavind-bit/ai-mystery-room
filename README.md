# AI Mystery Room

Create a fictional mystery from a short scenario, inspect the evidence, and make an accusation. The React client talks to an Express API; Gemini generates each case and MongoDB stores it. The answer is omitted from all case-reading API responses until the accusation endpoint is submitted.

## Requirements

- Node.js 18 or newer
- MongoDB (local or hosted)
- A Google Gemini API key

## Run locally

1. Install dependencies from the project root: `npm.cmd install` (Windows PowerShell) or `npm install` (macOS/Linux).
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `GEMINI_API_KEY`.
3. Start both apps with `npm.cmd run dev` (Windows PowerShell) or `npm run dev` (macOS/Linux).
4. Open `http://localhost:5173`.

The API listens on `http://localhost:5000`. Set `CLIENT_ORIGIN` if the client runs on another origin. Set `GEMINI_MODEL` to choose a model supported by your Gemini API account. The client API root can be changed with `VITE_API_URL`.

## API

- `POST /api/mysteries` — accepts `{ "scenario": "..." }`; scenario must be 1–1,200 characters.
- `GET /api/mysteries/:id` — returns the case, suspects, and evidence without its culprit or solution.
- `POST /api/mysteries/:id/accuse` — accepts `{ "suspectId": "..." }` and returns the verdict, culprit, explanation, and key evidence.
- `GET /api/health` — basic API and database status.

Cases are fictional. Images and recordings are represented as written descriptions or transcripts in this initial version, as allowed by the spec.
