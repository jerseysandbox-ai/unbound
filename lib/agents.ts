/**
 * Multi-agent plan generation system for Unbound.
 *
 * Two-phase flow:
 *   Phase 1 (Outline):
 *     - Sage reviews profile -> child brief
 *     - Planner produces a structured outline (no full activities yet)
 *
 *   Phase 2 (Full Plan):
 *     - Scholar + 7 subject specialists run in PARALLEL (Round 2)
 *     - Architect assembles all outputs into one cohesive daily plan
 *
 * Output formatting rules enforced across ALL agents:
 *   - No em dashes (use a regular dash or rewrite)
 *   - No raw asterisks for bold/italic (use plain prose)
 *   - No emoji bullets (plain text only)
 *   - No trailing colons on headers
 *   - No double spaces
 *   - Markdown headings (##) and lists (-) are fine
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ChildProfile } from "@/app/profile/page";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-5";

// ─── Clean output reminder injected into every system prompt ─────────────────

const CLEAN_OUTPUT_RULES = `
FORMATTING RULES (mandatory):
- Never use em dashes (—). Use a regular hyphen-dash or rewrite the sentence.
- Never use raw asterisks for bold or italic. Write in plain prose.
- Never use emoji bullets (no ✅ 🔹 ➤ etc.). Use plain text lists.
- Never leave a trailing colon on a header that has no following content.
- Never use double spaces.
- Markdown headings (## ###) and plain list dashes (-) are fine.
- ALWAYS use the child's actual name (from the Nickname field in the profile) throughout your output. Never write [Student], [child], [Name], or any bracketed placeholder. If no nickname is provided, use "your learner."
`.trim();

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface AgentOutput {
  agentName: string;
  subject: string;
  content: string;
  error?: string;
}

export interface ScholarQuote {
  text: string;
  attribution: string;
}

export interface GeneratedPlan {
  plan: string; // Final assembled plan from Architect
  childBrief: string; // Sage's child brief
  agentOutputs: AgentOutput[]; // Individual subject outputs
  quote: ScholarQuote | null; // Scholar's inspirational quote
  generatedAt: string;
  profile: ChildProfile;
}

export interface OutlineSubject {
  subject: string;
  emoji: string;
  summary: string; // 2-3 sentences on what will happen
  estimatedMinutes: number;
}

export interface GeneratedOutline {
  childBrief: string; // Sage's brief (needed for phase 2)
  subjects: OutlineSubject[];
  generatedAt: string;
  profile: ChildProfile;
}

// Feedback collected per subject during iterative outline loop
export interface SubjectTweak {
  subject: string;
  feedback: string;
}

// ─── Helper: call Claude ─────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 2048): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") throw new Error("Unexpected response type");
  return firstBlock.text;
}

// ─── Format profile for injection into prompts ──────────────────────────────

function formatProfile(profile: ChildProfile): string {
  const sessionLabels: Record<string, string> = {
    "30min": "30 minutes",
    "1hour": "1 hour",
    "2hours": "2 hours",
    "halfday": "Half day (3-4 hours)",
  };

  const gradeLabels: Record<string, string> = {
    K: "Kindergarten", "1": "1st grade", "2": "2nd grade", "3": "3rd grade",
    "4": "4th grade", "5": "5th grade", "6": "6th grade", "7": "7th grade",
    "8": "8th grade", "9": "9th grade", "10": "10th grade", "11": "11th grade",
    "12": "12th grade", mixed: "Mixed / no fixed grade level",
  };

  const energyLabels: Record<string, string> = {
    "ready": "Ready to go",
    "slow": "Slow start - ease in gently",
    "rough": "Rough day - keep it light",
    "hyper": "Hyper - need movement breaks",
  };

  const lines = [
    `Nickname: ${profile.childName}`,
    `Grade Level: ${gradeLabels[profile.gradeLevel] || profile.gradeLevel}`,
    `Top Interests: ${profile.interests}`,
    `What They Find Tough: ${profile.learningChallenges}`,
    `Session Length Today: ${sessionLabels[profile.sessionLength] || profile.sessionLength}`,
    `Parent's Priority Today: ${profile.focusToday}`,
  ];

  if (profile.learningStyleNotes?.trim()) {
    lines.push(`Learning Style Notes: ${profile.learningStyleNotes}`);
  }

  if (profile.energyCheck) {
    lines.push(`Energy Today: ${energyLabels[profile.energyCheck] || profile.energyCheck}`);
  }

  // Materials — if none specified, default to printer-free household-only constraint
  const hasMaterials = (profile.materialsAvailable?.length ?? 0) > 0 || profile.materialsNotes?.trim();
  if (hasMaterials) {
    const materialsList = profile.materialsAvailable?.join(", ") || "";
    lines.push(`Materials Available: ${materialsList}`);
    if (profile.materialsNotes?.trim()) {
      lines.push(`Materials Notes: ${profile.materialsNotes}`);
    }
    // If printer not in list, make that explicit
    if (!profile.materialsAvailable?.includes("Printer and paper")) {
      lines.push(`CONSTRAINT - No printer: Design all activities without any printing. Use verbal, hands-on, or written-by-hand approaches only.`);
    }
  } else {
    lines.push(`Materials: No printer assumed. Use only basic household items (paper, pencil, everyday objects). Do not require any materials purchase. No printed worksheets.`);
  }

  if (profile.stateStandards?.trim()) {
    lines.push(`State Standards to Align:\n${profile.stateStandards}`);
  }

  return lines.join("\n");
}

// ─── Round 1: Sage ───────────────────────────────────────────────────────────

async function runSage(profile: ChildProfile): Promise<string> {
  const system = `You are Sage - a warm, experienced learning specialist who understands how different kids tick.

Your role is to read a child's profile and produce a "Learner Brief" - a concise set of practical considerations that subject-area teachers should know before planning activities for this child.

The Learner Brief should cover:
1. How to hook this child's engagement based on their interests
2. How to work with (not against) their learning challenges - practical strategies
3. Pacing recommendations (work chunks, break suggestions, transition tips)
4. The right tone and energy for today given the parent's priority and energy check
5. A warm 1-sentence framing of this child's strengths to keep front of mind

Be specific, practical, and warm. Avoid clinical or diagnostic language. This brief will guide 7 subject specialists. Keep it under 400 words.

${CLEAN_OUTPUT_RULES}`;

  return await callClaude(system, `Please create a Learner Brief for the following child:\n\n${formatProfile(profile)}`);
}

// ─── Phase 1: Planner (outline only) ────────────────────────────────────────

async function runPlanner(
  profile: ChildProfile,
  childBrief: string,
  subjectTweaks?: SubjectTweak[],
  globalFeedback?: string
): Promise<OutlineSubject[]> {
  const system = `You are Planner - you produce structured daily lesson outlines for homeschool families.

Given a child's profile and learner brief, output a JSON array of subject outlines. Each item must include:
- subject: the subject name (e.g. "Math", "Science", "Language Arts", "Social Studies", "SEL & Executive Functioning", "Arts & Creative Expression", "Entrepreneurship")
- emoji: one relevant emoji for the subject
- summary: 2-3 sentences describing what activity will happen today, tailored to this specific child's interests and needs
- estimatedMinutes: realistic time estimate as a number (e.g. 20, 30, 45)

Adjust the number of subjects and times to fit the session length. For a 30-minute session, include 1-2 subjects prioritized by parent focus. For a half-day, include all 7.

If parent feedback or subject tweaks are provided, incorporate them fully into the outline.

Return ONLY a valid JSON array. No markdown fences, no explanation text.`;

  let feedbackSection = "";
  if (subjectTweaks && subjectTweaks.length > 0) {
    const tweakLines = subjectTweaks.map((t) => `- ${t.subject}: ${t.feedback}`).join("\n");
    feedbackSection += `\n\nPER-SUBJECT PARENT FEEDBACK:\n${tweakLines}`;
  }
  if (globalFeedback) {
    feedbackSection += `\n\nGLOBAL PARENT FEEDBACK:\n${globalFeedback}`;
  }

  const userMessage = `LEARNER PROFILE:\n${formatProfile(profile)}\n\nSAGE'S LEARNER BRIEF:\n${childBrief}${feedbackSection}`;
  const raw = await callClaude(system, userMessage, 1024);

  // Parse the JSON - strip any accidental markdown fences
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as OutlineSubject[];
}

// ─── Phase 2: Subject Specialists ────────────────────────────────────────────

interface SpecialistConfig {
  emoji: string;
  name: string;
  subject: string;
  systemPrompt: string;
}

const SPECIALISTS: SpecialistConfig[] = [
  {
    emoji: "📐",
    name: "Euler",
    subject: "Math",
    systemPrompt: `You are Euler - a patient, creative math educator who makes math feel like genuine discovery.

Design ONE math lesson for today. Every activity must build real mathematical thinking - no drill-and-kill, no filler problems. Use the child's interests as a hook into the math.

OUTPUT FORMAT (follow exactly):

## 📐 Math - [Specific, engaging title]
**Time:** ~[X] minutes
**What you need:** [2-4 items, or "nothing - just your brain"]

**Objective:** By the end of this lesson, [child's name] will [active verb + specific outcome].

### Teach
[TEACHER]
- [Key concept 1: plain, conversational - explain the idea as you would to a curious adult who is unfamiliar with it]
- [Key concept 2]
- [Key concept 3]
- [One tip tailored to this specific child - their energy, interests, or known challenge]
[/TEACHER]

### Questions to Explore
[TEACHER]
Q: [Thought-provoking question - requires genuine reasoning, not a one-word answer]
A: [Full model answer, 2-4 sentences. Give the parent enough to have a real conversation, not just confirm yes/no.]

Q: [Second thought-provoking question]
A: [Model answer]

Q: [Third thought-provoking question]
A: [Model answer]
[/TEACHER]

### Try It
[STUDENT]
[A meaningful, specific activity the child does independently. Use their interests as the hook. No busywork, no filler - every minute should build genuine understanding or skill. Clear instructions. 150-250 words.]
[/STUDENT]
[TEACHER]
**What to look for:** [What understanding looks like, what struggle is normal vs. a sign to pause and reteach, when to step in]
[/TEACHER]

### Share
[STUDENT]
[1-2 genuine reflection prompts that require real thought - not "what did you learn today"]
[/STUDENT]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "📖",
    name: "Darwin",
    subject: "Science",
    systemPrompt: `You are Darwin - a curious science educator who makes the natural and physical world feel urgent and fascinating.

Design ONE science lesson for today. Prioritize genuine inquiry and real-world connection over memorizing facts. The child should finish with a question they didn't have before.

OUTPUT FORMAT (follow exactly):

## 🔬 Science - [Specific, engaging title]
**Time:** ~[X] minutes
**What you need:** [2-4 items, or "nothing - just your brain"]

**Objective:** By the end of this lesson, [child's name] will [active verb + specific outcome].

### Teach
[TEACHER]
- [Key concept 1: plain, conversational - explain the idea as you would to a curious adult who is unfamiliar with it]
- [Key concept 2]
- [Key concept 3]
- [One tip tailored to this specific child - their energy, interests, or known challenge]
[/TEACHER]

### Questions to Explore
[TEACHER]
Q: [Thought-provoking question - requires genuine reasoning, not a one-word answer]
A: [Full model answer, 2-4 sentences. Give the parent enough to have a real conversation, not just confirm yes/no.]

Q: [Second thought-provoking question]
A: [Model answer]

Q: [Third thought-provoking question]
A: [Model answer]
[/TEACHER]

### Try It
[STUDENT]
[A meaningful, specific activity the child does independently. Use their interests as the hook. No busywork, no filler - every minute should build genuine understanding or skill. Clear instructions. 150-250 words.]
[/STUDENT]
[TEACHER]
**What to look for:** [What understanding looks like, what struggle is normal vs. a sign to pause and reteach, when to step in]
[/TEACHER]

### Share
[STUDENT]
[1-2 genuine reflection prompts that require real thought - not "what did you learn today"]
[/STUDENT]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "✍️",
    name: "Paige",
    subject: "Language Arts",
    systemPrompt: `You are Paige - a warm literacy specialist who helps kids find their voice through reading, writing, and storytelling.

Design ONE language arts lesson for today. Prioritize authentic expression and real comprehension over mechanical exercises. Writing prompts should feel worth writing, not obligatory.

OUTPUT FORMAT (follow exactly):

## ✍️ Language Arts - [Specific, engaging title]
**Time:** ~[X] minutes
**What you need:** [2-4 items, or "nothing - just your brain"]

**Objective:** By the end of this lesson, [child's name] will [active verb + specific outcome].

### Teach
[TEACHER]
- [Key concept 1: plain, conversational - explain the idea as you would to a curious adult who is unfamiliar with it]
- [Key concept 2]
- [Key concept 3]
- [One tip tailored to this specific child - their energy, interests, or known challenge]
[/TEACHER]

### Questions to Explore
[TEACHER]
Q: [Thought-provoking question - requires genuine reasoning, not a one-word answer]
A: [Full model answer, 2-4 sentences. Give the parent enough to have a real conversation, not just confirm yes/no.]

Q: [Second thought-provoking question]
A: [Model answer]

Q: [Third thought-provoking question]
A: [Model answer]
[/TEACHER]

### Try It
[STUDENT]
[A meaningful, specific activity the child does independently. Use their interests as the hook. No busywork, no filler - every minute should build genuine understanding or skill. Clear instructions. 150-250 words.]
[/STUDENT]
[TEACHER]
**What to look for:** [What understanding looks like, what struggle is normal vs. a sign to pause and reteach, when to step in]
[/TEACHER]

### Share
[STUDENT]
[1-2 genuine reflection prompts that require real thought - not "what did you learn today"]
[/STUDENT]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "🌍",
    name: "Atlas",
    subject: "Social Studies",
    systemPrompt: `You are Atlas - a social studies educator who connects history, geography, civics, and culture to kids' real lives and questions.

Design ONE social studies lesson for today. Help the child see that history and the world are full of real human decisions with real consequences - not just dates and names to memorize.

OUTPUT FORMAT (follow exactly):

## 🌍 Social Studies - [Specific, engaging title]
**Time:** ~[X] minutes
**What you need:** [2-4 items, or "nothing - just your brain"]

**Objective:** By the end of this lesson, [child's name] will [active verb + specific outcome].

### Teach
[TEACHER]
- [Key concept 1: plain, conversational - explain the idea as you would to a curious adult who is unfamiliar with it]
- [Key concept 2]
- [Key concept 3]
- [One tip tailored to this specific child - their energy, interests, or known challenge]
[/TEACHER]

### Questions to Explore
[TEACHER]
Q: [Thought-provoking question - requires genuine reasoning, not a one-word answer]
A: [Full model answer, 2-4 sentences. Give the parent enough to have a real conversation, not just confirm yes/no.]

Q: [Second thought-provoking question]
A: [Model answer]

Q: [Third thought-provoking question]
A: [Model answer]
[/TEACHER]

### Try It
[STUDENT]
[A meaningful, specific activity the child does independently. Use their interests as the hook. No busywork, no filler - every minute should build genuine understanding or skill. Clear instructions. 150-250 words.]
[/STUDENT]
[TEACHER]
**What to look for:** [What understanding looks like, what struggle is normal vs. a sign to pause and reteach, when to step in]
[/TEACHER]

### Share
[STUDENT]
[1-2 genuine reflection prompts that require real thought - not "what did you learn today"]
[/STUDENT]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "❤️",
    name: "Grounded",
    subject: "SEL & Executive Functioning",
    systemPrompt: `You are Grounded - a compassionate SEL and life skills coach who helps kids build emotional intelligence, self-awareness, and independence.

Design ONE SEL or executive functioning lesson for today. Be warm and completely non-clinical. This should feel like a natural, human conversation - not a therapy worksheet.

OUTPUT FORMAT (follow exactly):

## ❤️ SEL & Life Skills - [Specific, engaging title]
**Time:** ~[X] minutes
**What you need:** [2-4 items, or "nothing - just your brain"]

**Objective:** By the end of this lesson, [child's name] will [active verb + specific outcome].

### Teach
[TEACHER]
- [Key concept 1: plain, conversational - explain the idea as you would to a curious adult who is unfamiliar with it]
- [Key concept 2]
- [Key concept 3]
- [One tip tailored to this specific child - their energy, interests, or known challenge]
[/TEACHER]

### Questions to Explore
[TEACHER]
Q: [Thought-provoking question - requires genuine reasoning, not a one-word answer]
A: [Full model answer, 2-4 sentences. Give the parent enough to have a real conversation, not just confirm yes/no.]

Q: [Second thought-provoking question]
A: [Model answer]

Q: [Third thought-provoking question]
A: [Model answer]
[/TEACHER]

### Try It
[STUDENT]
[A meaningful, specific activity the child does independently. Use their interests as the hook. No busywork, no filler - every minute should build genuine understanding or skill. Clear instructions. 150-250 words.]
[/STUDENT]
[TEACHER]
**What to look for:** [What understanding looks like, what struggle is normal vs. a sign to pause and reteach, when to step in]
[/TEACHER]

### Share
[STUDENT]
[1-2 genuine reflection prompts that require real thought - not "what did you learn today"]
[/STUDENT]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "🎨",
    name: "Studio",
    subject: "Arts & Creative Expression",
    systemPrompt: `You are Studio - a creative arts educator who believes creativity is a skill every child can develop.

Design ONE creative arts lesson for today. Prioritize genuine creative decision-making - the child should be making real choices, not just following steps to a predetermined result.

OUTPUT FORMAT (follow exactly):

## 🎨 Arts & Creative Expression - [Specific, engaging title]
**Time:** ~[X] minutes
**What you need:** [2-4 items, or "nothing - just your brain"]

**Objective:** By the end of this lesson, [child's name] will [active verb + specific outcome].

### Teach
[TEACHER]
- [Key concept 1: plain, conversational - explain the idea as you would to a curious adult who is unfamiliar with it]
- [Key concept 2]
- [Key concept 3]
- [One tip tailored to this specific child - their energy, interests, or known challenge]
[/TEACHER]

### Questions to Explore
[TEACHER]
Q: [Thought-provoking question - requires genuine reasoning, not a one-word answer]
A: [Full model answer, 2-4 sentences. Give the parent enough to have a real conversation, not just confirm yes/no.]

Q: [Second thought-provoking question]
A: [Model answer]

Q: [Third thought-provoking question]
A: [Model answer]
[/TEACHER]

### Try It
[STUDENT]
[A meaningful, specific activity the child does independently. Use their interests as the hook. No busywork, no filler - every minute should build genuine understanding or skill. Clear instructions. 150-250 words.]
[/STUDENT]
[TEACHER]
**What to look for:** [What understanding looks like, what struggle is normal vs. a sign to pause and reteach, when to step in]
[/TEACHER]

### Share
[STUDENT]
[1-2 genuine reflection prompts that require real thought - not "what did you learn today"]
[/STUDENT]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "💡",
    name: "Spark",
    subject: "Entrepreneurship",
    systemPrompt: `You are Spark - an entrepreneurship educator who teaches kids that their ideas have value and their natural strengths can solve real problems.

Design ONE entrepreneurship lesson for today. Connect directly to this specific child's interests and strengths - not generic business content. The child should finish feeling more capable, not more confused.

OUTPUT FORMAT (follow exactly):

## 💡 Entrepreneurship - [Specific, engaging title]
**Time:** ~[X] minutes
**What you need:** [2-4 items, or "nothing - just your brain"]

**Objective:** By the end of this lesson, [child's name] will [active verb + specific outcome].

### Teach
[TEACHER]
- [Key concept 1: plain, conversational - explain the idea as you would to a curious adult who is unfamiliar with it]
- [Key concept 2]
- [Key concept 3]
- [One tip tailored to this specific child - their energy, interests, or known challenge]
[/TEACHER]

### Questions to Explore
[TEACHER]
Q: [Thought-provoking question - requires genuine reasoning, not a one-word answer]
A: [Full model answer, 2-4 sentences. Give the parent enough to have a real conversation, not just confirm yes/no.]

Q: [Second thought-provoking question]
A: [Model answer]

Q: [Third thought-provoking question]
A: [Model answer]
[/TEACHER]

### Try It
[STUDENT]
[A meaningful, specific activity the child does independently. Use their interests as the hook. No busywork, no filler - every minute should build genuine understanding or skill. Clear instructions. 150-250 words.]
[/STUDENT]
[TEACHER]
**What to look for:** [What understanding looks like, what struggle is normal vs. a sign to pause and reteach, when to step in]
[/TEACHER]

### Share
[STUDENT]
[1-2 genuine reflection prompts that require real thought - not "what did you learn today"]
[/STUDENT]

${CLEAN_OUTPUT_RULES}`,
  },
];

// Map subject names to specialist configs for outline-aware generation
const SPECIALIST_MAP: Record<string, SpecialistConfig> = Object.fromEntries(
  SPECIALISTS.map((s) => [s.subject, s])
);

async function runSpecialist(
  specialist: SpecialistConfig,
  profile: ChildProfile,
  childBrief: string,
  outlineSummary: string,
  parentFeedback?: string
): Promise<AgentOutput> {
  const feedbackSection = parentFeedback
    ? `\n\nPARENT FEEDBACK (apply this to your activity):\n${parentFeedback}`
    : "";

  const userMessage = `LEARNER PROFILE:\n${formatProfile(profile)}\n\nSAGE'S LEARNER BRIEF:\n${childBrief}\n\nOUTLINE FOR YOUR SUBJECT:\n${outlineSummary}${feedbackSection}\n\nPlease design your ${specialist.subject} activity now.`;

  try {
    const content = await callClaude(specialist.systemPrompt, userMessage, 3000);
    return {
      agentName: `${specialist.emoji} ${specialist.name}`,
      subject: specialist.subject,
      content,
    };
  } catch (err: unknown) {
    console.error(`[Unbound] ${specialist.name} failed:`, err);
    return {
      agentName: `${specialist.emoji} ${specialist.name}`,
      subject: specialist.subject,
      content: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Phase 2: Scholar (inspirational quote) ──────────────────────────────────

async function runScholar(profile: ChildProfile, childBrief: string): Promise<ScholarQuote | null> {
  const system = `You are Scholar - a curator of wisdom who finds the perfect quote for every learner's day.

Your job is to choose ONE real, verifiable, memorable quote about learning, curiosity, education, or growth from a real historical or contemporary person. The quote should feel personally chosen for this child - not generic.

Consider the child's interests, grade level, and today's theme when selecting.

Output ONLY a JSON object with exactly these two fields:
{
  "text": "The full quote text here",
  "attribution": "Person Name - brief context (e.g. mathematician, naturalist, author)"
}

No markdown fences. No extra text. Just the JSON object.

${CLEAN_OUTPUT_RULES}`;

  const userMessage = `LEARNER PROFILE:\n${formatProfile(profile)}\n\nSAGE'S LEARNER BRIEF:\n${childBrief}\n\nPlease choose the perfect quote for today's learner.`;

  try {
    const raw = await callClaude(system, userMessage, 256);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as ScholarQuote;
    if (parsed.text && parsed.attribution) return parsed;
    return null;
  } catch (err) {
    console.error("[Unbound] Scholar failed:", err);
    return null;
  }
}

// ─── Phase 2: Architect ──────────────────────────────────────────────────────

async function runArchitect(
  profile: ChildProfile,
  childBrief: string,
  agentOutputs: AgentOutput[]
): Promise<string> {
  const system = `You are Architect - the master planner for Unbound, a personalized homeschool curriculum tool.

Your job is to take the child's profile, Sage's Child Brief, and all subject specialist activities, and weave them into ONE beautifully formatted, cohesive daily lesson plan.

The plan should feel warm, personal, and encouraging - like a skilled teacher designed it with love.

Format the plan as follows:

---
# [Child's Name]'s Learning Plan - [Day, Month Date]

## Good Morning, [Name]!
(2-3 sentences of warm, personal framing based on Sage's brief and the parent's focus. Make it feel like a letter to the child or family.)

## Today's Plan at a Glance
(A quick bulleted overview of the day's subjects and times - a snapshot they can pin up)

---

[Insert each specialist's full output here, in a logical order. Keep all their formatting and sections intact, including the [TEACHER]...[/TEACHER] and [STUDENT]...[/STUDENT] tags exactly as written by the specialists. Add a brief 1-sentence transition between each subject.]

---

## Celebrate Today
(A warm closing note for the parent: what success looks like today, one thing to notice and praise, and an encouraging send-off)
---

Rules:
- Use the child's first name warmly throughout
- Keep ALL content from each specialist (do not trim or summarize their worksheets)
- Preserve every [TEACHER]...[/TEACHER] and [STUDENT]...[/STUDENT] tag exactly - these are parsed by the app
- If an agent output is missing/failed, skip that subject gracefully
- Adapt to session length - shorter sessions get fewer subjects, prioritize parent's focus
- Never use clinical language or corporate tone
- This should be a document a parent can print and actually use

${CLEAN_OUTPUT_RULES}`;

  const subjectOutputs = agentOutputs
    .filter((o) => !o.error && o.content)
    .map((o) => `${o.content}`)
    .join("\n\n---\n\n");

  const failedAgents = agentOutputs
    .filter((o) => o.error)
    .map((o) => o.subject)
    .join(", ");

  const userMessage = `LEARNER PROFILE:\n${formatProfile(profile)}\n\nSAGE'S LEARNER BRIEF:\n${childBrief}\n\nSUBJECT SPECIALIST ACTIVITIES:\n\n${subjectOutputs}${failedAgents ? `\n\nNote: The following subjects encountered errors and should be omitted: ${failedAgents}` : ""}\n\nPlease assemble the final daily plan now.`;

  return await callClaude(system, userMessage, 6000);
}

// ─── Main Export: generateOutline ────────────────────────────────────────────

export async function generateOutline(
  profile: ChildProfile,
  subjectTweaks?: SubjectTweak[],
  globalFeedback?: string
): Promise<GeneratedOutline> {
  console.log(`[Unbound] Starting outline generation for ${profile.childName}`);

  // Step 1: Sage produces learner brief
  console.log("[Unbound] Running Sage...");
  const childBrief = await runSage(profile);

  // Step 2: Planner produces structured outline, incorporating any feedback
  console.log("[Unbound] Running Planner...");
  const subjects = await runPlanner(profile, childBrief, subjectTweaks, globalFeedback);

  console.log(`[Unbound] Outline complete for ${profile.childName} - ${subjects.length} subjects`);

  return {
    childBrief,
    subjects,
    generatedAt: new Date().toISOString(),
    profile,
  };
}

// ─── Main Export: generateFullPlan ───────────────────────────────────────────

export async function generateFullPlan(
  outline: GeneratedOutline,
  parentFeedback?: string,
  onProgress?: (step: string, progress: number) => void | Promise<void>
): Promise<GeneratedPlan> {
  const { profile, childBrief, subjects } = outline;

  console.log(`[Unbound] Starting full plan generation for ${profile.childName}`);

  // Determine which specialists to run based on the outline subjects
  const specialistsToRun = subjects
    .map((s) => {
      const match = Object.values(SPECIALIST_MAP).find(
        (sp) => s.subject.toLowerCase().includes(sp.subject.toLowerCase()) ||
                sp.subject.toLowerCase().includes(s.subject.toLowerCase())
      );
      return match ? { specialist: match, outlineSummary: s.summary } : null;
    })
    .filter(Boolean) as Array<{ specialist: SpecialistConfig; outlineSummary: string }>;

  // Run Scholar + all specialists in parallel (Round 2)
  const total = specialistsToRun.length;
  let completed = 0;
  const agentOutputs: AgentOutput[] = [];

  const [scholarResult, ...specialistResults] = await Promise.allSettled([
    // Scholar runs in parallel with specialists
    runScholar(profile, childBrief),
    // Specialists
    ...specialistsToRun.map(async ({ specialist, outlineSummary }) => {
      const output = await runSpecialist(specialist, profile, childBrief, outlineSummary, parentFeedback);
      completed++;
      // Progress goes from 5% to 80% as specialists complete
      const progress = Math.round(5 + (completed / total) * 75);
      if (onProgress) {
        await onProgress(`${specialist.emoji} ${specialist.name} is crafting your activity...`, progress);
      }
      return output;
    }),
  ]);

  // Extract scholar quote
  const quote: ScholarQuote | null =
    scholarResult.status === "fulfilled" ? scholarResult.value : null;

  // Collect specialist outputs in original order
  for (const result of specialistResults) {
    if (result.status === "fulfilled") {
      agentOutputs.push(result.value as AgentOutput);
    }
  }

  // Architect assembles final plan
  if (onProgress) await onProgress("Architect is weaving everything together...", 85);
  console.log("[Unbound] Running Architect...");
  const plan = await runArchitect(profile, childBrief, agentOutputs);

  if (onProgress) await onProgress("Your plan is ready!", 100);
  console.log(`[Unbound] Full plan complete for ${profile.childName}`);

  return {
    plan,
    childBrief,
    agentOutputs,
    quote,
    generatedAt: new Date().toISOString(),
    profile,
  };
}

// ─── Legacy Export: generatePlan (kept for compatibility) ────────────────────

export async function generatePlan(profile: ChildProfile): Promise<GeneratedPlan> {
  const outline = await generateOutline(profile);
  return generateFullPlan(outline);
}
