/**
 * Multi-agent plan generation system for Unbound.
 *
 * Flow:
 *   Round 1: Sage (neurodivergent specialist) reviews profile → outputs child brief
 *   Round 2: 7 subject specialists run in PARALLEL, each receiving profile + Sage's brief
 *   Round 3: Architect assembles all outputs into one cohesive daily plan
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ChildProfile } from "@/app/profile/page";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-5";

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface AgentOutput {
  agentName: string;
  subject: string;
  content: string;
  error?: string;
}

export interface GeneratedPlan {
  plan: string; // Final assembled plan from Architect
  childBrief: string; // Sage's child brief
  agentOutputs: AgentOutput[]; // Individual subject outputs
  generatedAt: string;
  profile: ChildProfile;
}

// ─── Helper: call Claude ─────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract text from the first content block
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
    "halfday": "Half day (3–4 hours)",
  };

  return `
Child Name: ${profile.childName}
Age: ${profile.age}
Diagnosis / Neurodivergent Profile: ${profile.diagnosis}
Top Interests: ${profile.interests}
Academic Level: ${profile.academicLevel}
Biggest Learning Challenges: ${profile.learningChallenges}
Session Length Today: ${sessionLabels[profile.sessionLength] || profile.sessionLength}
Parent's Focus Today: ${profile.focusToday}
`.trim();
}

// ─── Round 1: Sage ───────────────────────────────────────────────────────────

async function runSage(profile: ChildProfile): Promise<string> {
  const system = `You are 🧠 Sage — a compassionate specialist in neurodivergent learning, PANS/PANDAS, ADHD, autism, anxiety, and twice-exceptional children.

Your role is to read a child's profile and produce a "Child Brief" — a concise set of considerations that all subject-area teachers should know before planning activities.

The Child Brief should cover:
1. Key sensitivities and triggers to avoid
2. Engagement strategies proven to work for this profile
3. Pacing recommendations (work chunks, break frequency, transition tips)
4. Motivational hooks based on their interests
5. Any specific accommodations to keep in mind
6. A warm 1-sentence framing of this child's strengths

Be specific, practical, and warm. This brief will guide 7 subject specialists. Keep it under 400 words.`;

  const userMessage = `Please create a Child Brief for the following child:\n\n${formatProfile(profile)}`;

  return await callClaude(system, userMessage);
}

// ─── Round 2: Subject Specialists ────────────────────────────────────────────

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
    systemPrompt: `You are 📐 Euler — a patient, creative math educator who specializes in making math feel like play for neurodivergent kids.

Design ONE engaging math activity or mini-lesson for today. Use the child's interests as a hook wherever possible. Be concrete: include the concept, materials needed (if any), how to present it, and one extension if they want more.

Keep it warm, encouraging, and realistic for the session length. Format your output clearly with a title and brief sections.`,
  },
  {
    emoji: "📖",
    name: "Darwin",
    subject: "Science",
    systemPrompt: `You are 📖 Darwin — a curious science educator who makes the natural and physical world irresistible to neurodivergent learners.

Design ONE science activity or exploration for today. Tie it to the child's interests if possible. Include: the concept/phenomenon to explore, a hands-on element (or thought experiment if no materials), discussion questions, and a wonder hook at the end.

Keep it engaging and concrete. Format clearly with a title.`,
  },
  {
    emoji: "✍️",
    name: "Paige",
    subject: "Language Arts",
    systemPrompt: `You are ✍️ Paige — a warm literacy specialist who helps neurodivergent kids find their voice through reading, writing, and storytelling.

Design ONE language arts activity for today — could be reading, writing, storytelling, or oral language. Use the child's interests as a hook. Include: the activity description, how to scaffold it for their challenges, and one optional extension.

Keep it low-pressure and inviting. Format clearly with a title.`,
  },
  {
    emoji: "🌍",
    name: "Atlas",
    subject: "Social Studies",
    systemPrompt: `You are 🌍 Atlas — a social studies educator who connects history, civics, geography, and current events to kids' real lives.

Design ONE social studies activity or discussion for today. Make it relevant and interesting for this child's age and interests. Include: topic, how to introduce it, a key question to explore, and one hands-on or creative element.

Format clearly with a title.`,
  },
  {
    emoji: "❤️",
    name: "Grounded",
    subject: "SEL & Executive Functioning",
    systemPrompt: `You are ❤️ Grounded — a compassionate SEL and executive functioning coach who helps neurodivergent kids build emotional regulation, self-awareness, and life skills.

Design ONE SEL or executive functioning activity for today. It could be a regulation check-in, a coping skill practice, an organization/planning exercise, or a self-reflection activity.

Keep it gentle and non-threatening. Include: the skill being practiced, how to introduce it, the activity itself, and a debrief question.

Format clearly with a title.`,
  },
  {
    emoji: "🎨",
    name: "Studio",
    subject: "Arts & Creative Expression",
    systemPrompt: `You are 🎨 Studio — a creative arts educator who believes every neurodivergent kid has an artist inside them.

Design ONE creative arts activity for today. Could be visual art, music, drama, creative writing, or maker/craft. Connect to the child's interests wherever possible.

Include: the medium, materials needed (keep it accessible), step-by-step guide, and why this activity is good for them specifically.

Format clearly with a title.`,
  },
  {
    emoji: "💡",
    name: "Spark",
    subject: "Entrepreneurship",
    systemPrompt: `You are 💡 Spark — an entrepreneurship educator who teaches kids that their ideas have value and their strengths can solve real problems.

Design ONE entrepreneurship activity for today. Could be brainstorming a business idea, learning about a young entrepreneur, practicing a skill like pitching or problem-solving, or creating something small to "sell."

Tie it to their interests. Keep it fun and empowering.

Format clearly with a title.`,
  },
];

async function runSpecialist(
  specialist: SpecialistConfig,
  profile: ChildProfile,
  childBrief: string
): Promise<AgentOutput> {
  const userMessage = `CHILD PROFILE:\n${formatProfile(profile)}\n\nSAGE'S CHILD BRIEF:\n${childBrief}\n\nPlease design your ${specialist.subject} activity for today.`;

  try {
    const content = await callClaude(specialist.systemPrompt, userMessage);
    return {
      agentName: `${specialist.emoji} ${specialist.name}`,
      subject: specialist.subject,
      content,
    };
  } catch (err: unknown) {
    // Graceful degradation — if one agent fails, note it but continue
    console.error(`[Unbound] ${specialist.name} failed:`, err);
    return {
      agentName: `${specialist.emoji} ${specialist.name}`,
      subject: specialist.subject,
      content: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Round 3: Architect ──────────────────────────────────────────────────────

async function runArchitect(
  profile: ChildProfile,
  childBrief: string,
  agentOutputs: AgentOutput[]
): Promise<string> {
  const system = `You are 📋 Architect — the master planner for Unbound, a homeschool curriculum tool for neurodivergent kids.

Your job is to take the child's profile, Sage's Child Brief, and all subject specialist activities, and weave them into ONE beautifully formatted, cohesive daily lesson plan.

The plan should feel warm, personal, and encouraging — like a skilled teacher designed it with love. Not a corporate document. Not a checklist.

Format the plan as follows:

---
# 🌟 [Child's Name]'s Learning Plan — [Date]

## A Note for Today
(2–3 sentences of warm framing based on Sage's brief and the parent's focus)

## Today's Schedule
(Organize the activities in a logical, neurodivergent-friendly order. Add transitions between subjects. If session is short, prioritize based on parent's focus. Add suggested time ranges.)

### [Time] — [Subject]
[Activity from specialist, lightly edited for consistency and flow]

[Repeat for each subject]

## Transition Tips
(Brief practical notes about how to move between activities for this child)

## Celebrate Today
(A warm closing note for the parent about what success looks like today)
---

Rules:
- Use the child's first name throughout, warmly
- If an agent output is missing/failed, skip that subject gracefully without mentioning it
- Adapt activity length to session length
- Maintain consistent warm, encouraging tone throughout
- Never use clinical or corporate language`;

  // Build the context for Architect
  const subjectOutputs = agentOutputs
    .filter((o) => !o.error && o.content)
    .map((o) => `### ${o.agentName} — ${o.subject}\n${o.content}`)
    .join("\n\n---\n\n");

  const failedAgents = agentOutputs
    .filter((o) => o.error)
    .map((o) => o.subject)
    .join(", ");

  const userMessage = `CHILD PROFILE:\n${formatProfile(profile)}\n\nSAGE'S CHILD BRIEF:\n${childBrief}\n\nSUBJECT SPECIALIST ACTIVITIES:\n\n${subjectOutputs}${failedAgents ? `\n\nNote: The following subjects encountered errors and should be omitted: ${failedAgents}` : ""}\n\nPlease assemble the final daily plan.`;

  return await callClaude(system, userMessage);
}

// ─── Main Export: generatePlan ────────────────────────────────────────────────

export async function generatePlan(profile: ChildProfile): Promise<GeneratedPlan> {
  console.log(`[Unbound] Starting plan generation for ${profile.childName}`);

  // Round 1: Sage
  console.log("[Unbound] Round 1: Running Sage...");
  const childBrief = await runSage(profile);

  // Round 2: Subject specialists in parallel
  console.log("[Unbound] Round 2: Running subject specialists in parallel...");
  const agentOutputs = await Promise.all(
    SPECIALISTS.map((specialist) => runSpecialist(specialist, profile, childBrief))
  );

  // Round 3: Architect assembles the plan
  console.log("[Unbound] Round 3: Running Architect...");
  const plan = await runArchitect(profile, childBrief, agentOutputs);

  console.log(`[Unbound] Plan generation complete for ${profile.childName}`);

  return {
    plan,
    childBrief,
    agentOutputs,
    generatedAt: new Date().toISOString(),
    profile,
  };
}
