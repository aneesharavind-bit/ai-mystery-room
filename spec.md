# AI Mystery Room — Product & Technical Specification

**Version:** 1.0  
**Status:** Source of Truth  
**Purpose:** This document defines the complete requirements, architecture, features, user flows, and constraints for the AI Mystery Room application.

> **Important:** This document is the single source of truth for development. When implementing features, all decisions should follow this specification. Do not introduce major features, change architecture, or alter user flows unless this specification is updated first.

---

# 1. Project Overview

## 1.1 Project Name

**AI Mystery Room**

## 1.2 Project Description

AI Mystery Room is an AI-powered mystery-solving web application.

A user provides a short scenario, story, or idea. Based on that input, the backend uses AI to generate a complete fictional mystery investigation.

The generated mystery contains:

- A fictional crime or mystery scenario
- Multiple suspects
- One predetermined culprit
- A collection of AI-generated evidence
- A final challenge where the user must identify the culprit

The evidence may include fictional:

- WhatsApp conversations
- Images
- CCTV or camera recordings
- Written documents
- Witness statements
- Other relevant clues

The user investigates the case by reviewing the available evidence and then selects the person they believe is responsible.

The system reveals whether the user's answer is correct and explains how the evidence connects to the actual culprit.

---

# 2. Project Goals

The primary goals of the application are:

1. Create an engaging mystery-solving experience.
2. Allow users to generate unique mystery cases using their own ideas.
3. Use Gemini AI to dynamically create investigations and evidence.
4. Ensure every generated mystery has a logically consistent solution.
5. Provide a modern and immersive user interface.
6. Build the application using a scalable MERN architecture.

---

# 3. Target User

The target users are:

- Mystery and detective game enthusiasts
- Casual users looking for an interactive AI experience
- Students and developers interested in AI-generated content
- Users who enjoy solving fictional crimes and puzzles

The application should be simple enough for a first-time user to understand without instructions.

---

# 4. Technology Stack

## 4.1 Frontend

- React
- JavaScript
- HTML5
- CSS3
- React Router
- Axios or Fetch API

## 4.2 Backend

- Node.js
- Express.js

## 4.3 Database

- MongoDB
- Mongoose

## 4.4 Artificial Intelligence

- Google Gemini API

Gemini will be responsible for generating the structured mystery content.

## 4.5 Media Generation

AI-generated media may include:

- Images representing evidence
- Simulated chat screenshots
- Simulated CCTV footage or recordings

The initial implementation must support evidence objects in the database even if some advanced media-generation features are implemented as placeholders or simulations first.

---

# 5. Core User Flow

## Step 1: User Arrives at the Website

The user lands on the home page.

The home page should clearly explain the concept:

> Create a mystery. Investigate the evidence. Find the culprit.

The user should see a primary call-to-action button:

**Create a Mystery**

---

## Step 2: User Provides a Scenario

The user is presented with a form where they can enter a short scenario or story.

Example:

> A valuable painting disappeared from an art gallery during a private exhibition. There were four people inside the building at the time.

The user submits the scenario.

### Scenario Input Requirements

The input should:

- Accept plain text
- Have a reasonable character limit
- Reject empty submissions
- Display a loading state while the mystery is being generated

---

## Step 3: AI Generates the Mystery

The frontend sends the scenario to the backend.

The backend sends a carefully structured prompt to Gemini.

Gemini must generate a complete mystery containing:

1. Case title
2. Case introduction
3. Crime or mystery description
4. Suspect list
5. Evidence items
6. The actual culprit
7. The reasoning behind the solution

The backend must validate the generated response before saving it.

---

## Step 4: Mystery Investigation Room

After generation, the user enters the Mystery Room.

The user can explore:

- Case information
- Suspects
- Evidence

The identity of the actual culprit must never be shown before the user submits an answer.

---

## Step 5: User Reviews Evidence

The user investigates the case by opening different evidence items.

Each evidence item should contain:

- Title
- Evidence type
- Description
- Generated content or media

Evidence types include:

- WhatsApp Message
- Image
- CCTV Recording
- Document
- Witness Statement

---

## Step 6: User Selects a Culprit

After reviewing the evidence, the user is presented with all suspects.

The user selects one suspect as the culprit.

Before submission, the application should ask for confirmation.

Example:

> Are you sure you want to accuse this person?

Once confirmed, the answer is submitted to the backend.

---

## Step 7: Result Screen

The backend checks whether the selected suspect matches the actual culprit.

The user is shown:

- Whether their answer was correct
- The actual culprit
- An explanation of the solution
- Important evidence that reveals the culprit

The user should also have the option to:

- Create another mystery
- Return to the home page

---

# 6. Functional Requirements

## 6.1 Mystery Generation

### Requirement

The system must generate a complete mystery based on the user's scenario.

### Input

```text
scenario: String
```

### Output

The generated mystery must include:

```text
title
introduction
crimeDescription
suspects
evidence
culprit
solutionExplanation
```

### Rules

- There must be at least 3 suspects.
- There must be exactly 1 culprit.
- The culprit must exist in the suspect list.
- Evidence must logically support the solution.
- The generated content must be fictional.
- The mystery must contain enough information for the user to reasonably identify the culprit.

---

## 6.2 Suspect System

Each mystery contains multiple suspects.

Each suspect must have:

```json
{
  "id": "unique identifier",
  "name": "Full name",
  "description": "Short description",
  "relationshipToCase": "Connection to the mystery",
  "possible