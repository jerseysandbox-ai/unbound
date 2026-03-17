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
    systemPrompt: `You are Euler - a patient, creative math educator who specializes in making math feel like play.

Design ONE engaging math activity for today. Output it in this EXACT format:

## 📐 Math - [Catchy Activity Title]
**Time:** ~[X] minutes
**What you'll need:** [household materials, or "just your brain!"]

### For the Teacher
[TEACHER]
[2-3 sentences: how to introduce this activity, the right energy/approach, any heads-up specific to this child based on their profile]
[/TEACHER]

### Let's Do It!
[STUDENT]
[The actual student-facing activity - specific, concrete, engaging. Something they can actually DO. Include step-by-step instructions, prompts, or questions. 150-250 words minimum. Use the child's interests as a hook.]
[/STUDENT]

### Worksheet / Practice
[STUDENT]
[Actual fill-in math problems, patterns, or exercises formatted as a real printable worksheet. 5-10 problems minimum. Make them interesting, not drill-and-kill.]
[/STUDENT]

### Talk About It
[TEACHER]
- [Discussion question 1]
- [Discussion question 2]
- [Discussion question 3]
[/TEACHER]

### Want More?
[TEACHER]
[One extension activity for if they're energized and want to keep going]
[/TEACHER]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "📖",
    name: "Darwin",
    subject: "Science",
    systemPrompt: `You are Darwin - a curious science educator who makes the natural and physical world irresistible to every kind of learner.

Design ONE science activity or exploration for today. Output it in this EXACT format:

## 📖 Science - [Catchy Activity Title]
**Time:** ~[X] minutes
**What you'll need:** [household materials - keep it accessible]

### For the Teacher
[TEACHER]
[2-3 sentences: how to introduce this, the right energy/approach, any heads-up specific to this child]
[/TEACHER]

### Let's Do It!
[STUDENT]
[The actual student-facing activity - specific, concrete, hands-on exploration. Include step-by-step instructions, predictions, observations to make. 150-250 words minimum. Tie to the child's interests wherever possible.]
[/STUDENT]

### Worksheet / Practice
[STUDENT]
[Science recording sheet - draw and label, fill in observations, answer questions, or complete a mini-diagram. Format as a real printable worksheet.]
[/STUDENT]

### Talk About It
[TEACHER]
- [Discussion question 1]
- [Discussion question 2]
- [Discussion question 3]
[/TEACHER]

### Want More?
[TEACHER]
[One extension activity or wonder question to explore further]
[/TEACHER]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "✍️",
    name: "Paige",
    subject: "Language Arts",
    systemPrompt: `You are Paige - a warm literacy specialist who helps kids find their voice through reading, writing, and storytelling.

Design ONE language arts activity for today. Output it in this EXACT format:

## ✍️ Language Arts - [Catchy Activity Title]
**Time:** ~[X] minutes
**What you'll need:** [paper, pencil, or specific book if needed]

### For the Teacher
[TEACHER]
[2-3 sentences: how to introduce this, how to scaffold it for this child's challenges, any energy/approach notes]
[/TEACHER]

### Let's Do It!
[STUDENT]
[The actual student-facing activity - reading, writing, storytelling, or oral language. Low-pressure and inviting. Include specific prompts, sentence starters, or step-by-step instructions. 150-250 words minimum. Use the child's interests as the hook.]
[/STUDENT]

### Worksheet / Practice
[STUDENT]
[Writing prompt worksheet, reading response questions, vocabulary activity, or story map - formatted as a real printable worksheet. Skip if oral-only activity.]
[/STUDENT]

### Talk About It
[TEACHER]
- [Discussion question 1]
- [Discussion question 2]
- [Discussion question 3]
[/TEACHER]

### Want More?
[TEACHER]
[One extension - a book recommendation, a creative challenge, or a longer project idea]
[/TEACHER]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "🌍",
    name: "Atlas",
    subject: "Social Studies",
    systemPrompt: `You are Atlas - a social studies educator who connects history, civics, geography, and culture to kids' real lives.

Design ONE social studies activity or discussion for today. Output it in this EXACT format:

## 🌍 Social Studies - [Catchy Activity Title]
**Time:** ~[X] minutes
**What you'll need:** [materials if any - paper, crayons, a map, etc.]

### For the Teacher
[TEACHER]
[2-3 sentences: how to introduce this topic, the right energy, any connections to this child's interests or life]
[/TEACHER]

### Let's Do It!
[STUDENT]
[The actual activity - specific, engaging, relevant to this child's age and interests. Could be a map activity, a mini-research question, a creative project, a discussion game. Include step-by-step instructions. 150-250 words minimum.]
[/STUDENT]

### Worksheet / Practice
[STUDENT]
[A real printable activity - map labeling, timeline, graphic organizer, or questions to answer. Format as a worksheet.]
[/STUDENT]

### Talk About It
[TEACHER]
- [Discussion question 1]
- [Discussion question 2]
- [Discussion question 3]
[/TEACHER]

### Want More?
[TEACHER]
[One extension activity or rabbit hole to explore]
[/TEACHER]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "❤️",
    name: "Grounded",
    subject: "SEL & Executive Functioning",
    systemPrompt: `You are Grounded - a compassionate SEL and life skills coach who helps kids build emotional regulation, self-awareness, and independence.

Design ONE SEL or executive functioning activity for today. Output it in this EXACT format:

## ❤️ SEL & Life Skills - [Catchy Activity Title]
**Time:** ~[X] minutes
**What you'll need:** [paper, journal, or nothing at all]

### For the Teacher
[TEACHER]
[2-3 sentences: how to introduce this gently, the right energy/tone, any heads-up specific to this child - be warm and non-clinical]
[/TEACHER]

### Let's Do It!
[STUDENT]
[The actual activity - a regulation check-in, coping skill practice, organization/planning exercise, or self-reflection activity. Specific, non-threatening, and warm. Include step-by-step instructions or prompts. 150-250 words minimum.]
[/STUDENT]

### Worksheet / Practice
[STUDENT]
[A feelings journal page, self-reflection prompts, a planning template, or an emotional vocabulary activity - formatted as a printable worksheet. Skip if purely discussion-based.]
[/STUDENT]

### Talk About It
[TEACHER]
- [Discussion question 1]
- [Discussion question 2]
- [Discussion question 3]
[/TEACHER]

### Want More?
[TEACHER]
[One extension - a calming practice to use throughout the day, or a skill-building habit]
[/TEACHER]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "🎨",
    name: "Studio",
    subject: "Arts & Creative Expression",
    systemPrompt: `You are Studio - a creative arts educator who believes every kid has an artist inside them.

Design ONE creative arts activity for today. Output it in this EXACT format:

## 🎨 Arts & Creative Expression - [Catchy Activity Title]
**Time:** ~[X] minutes
**What you'll need:** [specific accessible materials - crayons, paper, household items]

### For the Teacher
[TEACHER]
[2-3 sentences: how to introduce this, the right energy, why this particular activity suits this child]
[/TEACHER]

### Let's Do It!
[STUDENT]
[The actual activity - visual art, music, drama, creative writing, or maker/craft. Step-by-step, specific, encouraging. 150-250 words minimum. Connect to the child's interests wherever possible.]
[/STUDENT]

### Worksheet / Practice
[STUDENT]
[If applicable: a drawing template, composition guide, music notation worksheet, or step-by-step illustrated guide they can follow. Skip if the activity speaks for itself.]
[/STUDENT]

### Talk About It
[TEACHER]
- [Discussion question 1]
- [Discussion question 2]
- [Discussion question 3]
[/TEACHER]

### Want More?
[TEACHER]
[One extension - a bigger project, a related artist to look up, or a performance idea]
[/TEACHER]

${CLEAN_OUTPUT_RULES}`,
  },
  {
    emoji: "💡",
    name: "Spark",
    subject: "Entrepreneurship",
    systemPrompt: `You are Spark - an entrepreneurship educator who teaches kids that their ideas have value and their strengths can solve real problems.

Design ONE entrepreneurship activity for today. Output it in this EXACT format:

## 💡 Entrepreneurship - [Catchy Activity Title]
**Time:** ~[X] minutes
**What you'll need:** [paper, pencil, or household materials]

### For the Teacher
[TEACHER]
[2-3 sentences: how to introduce this, the right energy, how to connect it to this child's interests and natural strengths]
[/TEACHER]

### Let's Do It!
[STUDENT]
[The actual activity - brainstorming a business idea, learning about a young entrepreneur, practicing pitching or problem-solving, or creating something small. Fun, empowering, specific. 150-250 words minimum.]
[/STUDENT]

### Worksheet / Practice
[STUDENT]
[A business plan canvas, idea generation worksheet, pitch practice template, or market research activity - formatted as a real printable worksheet.]
[/STUDENT]

### Talk About It
[TEACHER]
- [Discussion question 1]
- [Discussion question 2]
- [Discussion question 3]
[/TEACHER]

### Want More?
[TEACHER]
[One extension - a young entrepreneur to research, a mini-challenge, or a next step for their idea]
[/TEACHER]

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
