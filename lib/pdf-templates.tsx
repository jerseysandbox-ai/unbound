/**
 * React-PDF templates for Unbound Teacher Guide and Student Packet.
 *
 * Design principles:
 * - Clean, warm, professional typography
 * - Child's name on every page header
 * - No mention of AI, agents, or chatbots anywhere
 * - Teacher Guide: full solutions, discussion answers, formulas
 * - Student Packet: questions and workspace only
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { GeneratedPlan, ScholarQuote } from "@/lib/agents";

// ─── Fonts ────────────────────────────────────────────────────────────────────
// Use built-in Helvetica family — clean, universally readable, no external fetch

// ─── Shared styles ────────────────────────────────────────────────────────────

const TEAL = "#3d6e69";
const DARK = "#1a2e2d";
const BODY = "#2d2d2d";
const LIGHT_BG = "#f4faf9";
const BORDER = "#c8e0de";
const MUTED = "#6b8f8b";
const ACCENT = "#e8f4f3";
const GOLD = "#8a6a2a";
const STUDENT_GREEN = "#2a5e3a";
const STUDENT_BG = "#f0f8f2";
const STUDENT_BORDER = "#a8d4b4";

const shared = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BODY,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    backgroundColor: "#ffffff",
  },
  // Header bar across top of every page
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: TEAL,
    paddingBottom: 8,
    marginBottom: 20,
  },
  pageHeaderLeft: {
    flexDirection: "column",
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: TEAL,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerChildName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: DARK,
    marginTop: 2,
  },
  headerDate: {
    fontSize: 9,
    color: MUTED,
    marginTop: 1,
  },
  headerRight: {
    fontSize: 8,
    color: MUTED,
    textAlign: "right",
  },
  // Cover / title section
  coverSection: {
    alignItems: "center",
    paddingVertical: 28,
    marginBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  coverDocType: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: TEAL,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  coverChildName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    color: DARK,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 4,
  },
  coverDate: {
    fontSize: 10,
    color: MUTED,
  },
  // Quote block
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 20,
    backgroundColor: LIGHT_BG,
  },
  quoteText: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 10,
    color: DARK,
    lineHeight: 1.6,
    marginBottom: 4,
  },
  quoteAttribution: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: TEAL,
  },
  // Section heading (subject name)
  sectionHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: TEAL,
    marginTop: 18,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: BORDER,
  },
  // Subsection heading (e.g. For the Teacher, Let's Do It)
  subHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: DARK,
    marginTop: 10,
    marginBottom: 3,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  body: {
    fontSize: 10,
    color: BODY,
    lineHeight: 1.65,
    marginBottom: 4,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 8,
  },
  bulletDot: {
    fontSize: 10,
    color: TEAL,
    marginRight: 5,
    width: 10,
  },
  bulletText: {
    fontSize: 10,
    color: BODY,
    lineHeight: 1.6,
    flex: 1,
  },
  // Formula / answer box
  formulaBox: {
    backgroundColor: ACCENT,
    borderWidth: 0.75,
    borderColor: TEAL,
    borderRadius: 4,
    padding: 10,
    marginVertical: 6,
  },
  formulaLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: TEAL,
    marginBottom: 3,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  formulaText: {
    fontFamily: "Helvetica-BoldOblique",
    fontSize: 11,
    color: DARK,
  },
  // Teacher note box
  teacherBox: {
    backgroundColor: "#fefce8",
    borderWidth: 0.75,
    borderColor: "#d4a800",
    borderRadius: 4,
    padding: 10,
    marginVertical: 6,
  },
  teacherBoxLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: GOLD,
    marginBottom: 3,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  teacherBoxText: {
    fontSize: 9.5,
    color: "#4a3800",
    lineHeight: 1.55,
  },
  // Answer box (teacher only)
  answerBox: {
    backgroundColor: "#f0faf4",
    borderWidth: 0.75,
    borderColor: "#3a8c60",
    borderRadius: 4,
    padding: 10,
    marginVertical: 6,
  },
  answerLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: STUDENT_GREEN,
    marginBottom: 3,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  answerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: STUDENT_GREEN,
    lineHeight: 1.55,
  },
  // Student work box
  workBox: {
    borderWidth: 0.75,
    borderColor: BORDER,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 40,
    marginVertical: 6,
    backgroundColor: "#fafffe",
  },
  workBoxLabel: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 2,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: MUTED,
  },
});

// ─── Markdown-to-PDF line renderer ───────────────────────────────────────────
// Converts simple markdown to React-PDF primitives.
// Handles: ## headings, - bullets, plain paragraphs.
// Does NOT try to handle all markdown — just what Unbound agents produce.

function renderMarkdownLines(
  text: string,
  isTeacher: boolean
): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // ## Subject heading
    if (line.startsWith("## ")) {
      elements.push(
        <Text key={i} style={shared.sectionHeading}>
          {line.replace(/^##\s+/, "").replace(/^[^\w]*/, "")}
        </Text>
      );
      i++;
      continue;
    }

    // ### Sub-heading
    if (line.startsWith("### ")) {
      elements.push(
        <Text key={i} style={shared.subHeading}>
          {line.replace(/^###\s+/, "")}
        </Text>
      );
      i++;
      continue;
    }

    // Bullet
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <View key={i} style={shared.bullet}>
          <Text style={shared.bulletDot}>•</Text>
          <Text style={shared.bulletText}>
            {line.replace(/^[-*]\s+/, "")}
          </Text>
        </View>
      );
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <View key={i} style={shared.bullet}>
          <Text style={shared.bulletDot}>{line.match(/^\d+/)?.[0]}.</Text>
          <Text style={shared.bulletText}>
            {line.replace(/^\d+\.\s+/, "")}
          </Text>
        </View>
      );
      i++;
      continue;
    }

    // Bold-ish "For the Teacher:" label lines — teacher only
    if (isTeacher && /^(for the teacher|teacher note|teacher:|note:)/i.test(line)) {
      // collect following lines until next heading/blank
      const noteLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("#")) {
        noteLines.push(lines[i].trim());
        i++;
      }
      elements.push(
        <View key={`note-${i}`} style={shared.teacherBox}>
          <Text style={shared.teacherBoxLabel}>Teacher Note</Text>
          <Text style={shared.teacherBoxText}>{noteLines.join(" ").replace(/^(for the teacher:?|teacher note:?|teacher:|note:)\s*/i, "")}</Text>
        </View>
      );
      continue;
    }

    // Plain paragraph
    elements.push(
      <Text key={i} style={shared.body}>
        {line}
      </Text>
    );
    i++;
  }

  return elements;
}

// ─── Page header component ────────────────────────────────────────────────────

function PageHeader({
  childName,
  docType,
  date,
  pageLabel,
}: {
  childName: string;
  docType: string;
  date: string;
  pageLabel: string;
}) {
  return (
    <View style={shared.pageHeader} fixed>
      <View style={shared.pageHeaderLeft}>
        <Text style={shared.headerTitle}>{docType}</Text>
        <Text style={shared.headerChildName}>{childName}&apos;s Learning Plan</Text>
        <Text style={shared.headerDate}>{date}</Text>
      </View>
      <Text style={shared.headerRight}>{pageLabel}</Text>
    </View>
  );
}

// ─── Footer component ─────────────────────────────────────────────────────────

function PageFooter({ childName }: { childName: string }) {
  return (
    <View style={shared.footer} fixed>
      <Text style={shared.footerText}>{childName}&apos;s Learning Plan</Text>
      <Text
        style={shared.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverSection({
  childName,
  docType,
  docSubtitle,
  date,
}: {
  childName: string;
  docType: string;
  docSubtitle: string;
  date: string;
}) {
  return (
    <View style={shared.coverSection}>
      <Text style={shared.coverDocType}>{docType}</Text>
      <Text style={shared.coverChildName}>{childName}</Text>
      <Text style={shared.coverSubtitle}>{docSubtitle}</Text>
      <Text style={shared.coverDate}>{date}</Text>
    </View>
  );
}

// ─── Quote block ──────────────────────────────────────────────────────────────

function QuotePdf({ quote }: { quote: ScholarQuote }) {
  return (
    <View style={shared.quoteBlock}>
      <Text style={shared.quoteText}>&ldquo;{quote.text}&rdquo;</Text>
      <Text style={shared.quoteAttribution}>- {quote.attribution}</Text>
    </View>
  );
}

// ─── TEACHER GUIDE DOCUMENT ───────────────────────────────────────────────────

export function TeacherGuideDocument({
  plan,
  date,
}: {
  plan: GeneratedPlan;
  date: string;
}) {
  const childName = plan.profile.childName || "Your Learner";
  const content = extractTeacherContent(plan.plan);

  return (
    <Document title={`${childName} - Teacher Guide - ${date}`} author="Unbound">
      <Page size="LETTER" style={shared.page}>
        <PageHeader
          childName={childName}
          docType="Teacher Guide"
          date={date}
          pageLabel="Confidential - For Educator Use"
        />

        <CoverSection
          childName={childName}
          docType="Teacher Guide"
          docSubtitle="Daily Lesson Plan with Solutions and Notes"
          date={date}
        />

        {plan.quote && <QuotePdf quote={plan.quote} />}

        {renderMarkdownLines(content, true)}

        <PageFooter childName={childName} />
      </Page>
    </Document>
  );
}

// ─── STUDENT PACKET DOCUMENT ──────────────────────────────────────────────────

export function StudentPacketDocument({
  plan,
  date,
}: {
  plan: GeneratedPlan;
  date: string;
}) {
  const childName = plan.profile.childName || "Your Learner";
  const content = extractStudentContent(plan.plan);

  return (
    <Document title={`${childName} - Learning Packet - ${date}`} author="Unbound">
      <Page size="LETTER" style={shared.page}>
        <PageHeader
          childName={childName}
          docType="Learning Packet"
          date={date}
          pageLabel={childName}
        />

        <CoverSection
          childName={childName}
          docType={`${childName}'s Learning Packet`}
          docSubtitle="Activities and Exercises for Today"
          date={date}
        />

        {plan.quote && <QuotePdf quote={plan.quote} />}

        {/* Name / date line for student */}
        <View
          style={{
            flexDirection: "row",
            gap: 40,
            marginBottom: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: BORDER,
            paddingBottom: 10,
          }}
        >
          <Text style={shared.body}>Name: ________________________________</Text>
          <Text style={shared.body}>Date: ________________</Text>
        </View>

        {renderMarkdownLines(content, false)}

        <PageFooter childName={childName} />
      </Page>
    </Document>
  );
}

// ─── Content extraction helpers (mirrors plan page logic) ─────────────────────

function extractTeacherContent(plan: string): string {
  return plan
    .replace(/\[STUDENT\][\s\S]*?\[\/STUDENT\]/g, "")
    .replace(/\[TEACHER\]/g, "")
    .replace(/\[\/TEACHER\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractStudentContent(plan: string): string {
  const lines = plan.split("\n");
  const studentChunks: string[] = [];
  let currentHeading = "";
  let headingAdded = false;
  let insideStudent = false;
  let studentBuffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      currentHeading = line;
      headingAdded = false;
    }
    if (line.trim() === "[STUDENT]") {
      insideStudent = true;
      studentBuffer = [];
      continue;
    }
    if (line.trim() === "[/STUDENT]") {
      insideStudent = false;
      if (studentBuffer.length > 0) {
        if (!headingAdded && currentHeading) {
          studentChunks.push(currentHeading);
          headingAdded = true;
        }
        studentChunks.push(studentBuffer.join("\n"));
        studentChunks.push("");
      }
      continue;
    }
    if (insideStudent) studentBuffer.push(line);
  }

  return studentChunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ─── PDF generation helpers ────────────────────────────────────────────────────

export async function generateTeacherPdf(
  plan: GeneratedPlan,
  date: string
): Promise<Uint8Array> {
  const doc = <TeacherGuideDocument plan={plan} date={date} />;
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function generateStudentPdf(
  plan: GeneratedPlan,
  date: string
): Promise<Uint8Array> {
  const doc = <StudentPacketDocument plan={plan} date={date} />;
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// ─── Book Companion PDF types ──────────────────────────────────────────────────

export interface VocabEntry {
  word: string;
  definition: string;
  bookSentence: string;
  exampleSentence: string;
  synonyms: string;
}

export interface DiscussionQA {
  question: string;
  answer: string;
}

export interface BookCompanionData {
  title: string;
  author: string;
  chapter: string;
  summary: string;
  discussion: DiscussionQA[];
  vocabulary: VocabEntry[];
  readAloudTip: string;
  crossSubject: string;
}

// ─── Book Companion: Teacher Guide PDF ────────────────────────────────────────

const bookStyles = StyleSheet.create({
  page:      { fontFamily: "Helvetica", fontSize: 10, padding: 50, color: "#1a1a1a", backgroundColor: "#ffffff" },
  titleText: { fontSize: 18, color: "#1a5c5a", marginBottom: 3, fontFamily: "Helvetica-Bold" },
  sub:       { fontSize: 9,  color: "#666666", marginBottom: 18 },
  h2:        { fontSize: 12, color: "#1a5c5a", marginTop: 14, marginBottom: 5, fontFamily: "Helvetica-Bold" },
  body:      { fontSize: 9.5, lineHeight: 1.5, marginBottom: 3 },
  label:     { fontSize: 8.5, color: "#555555", fontFamily: "Helvetica-Bold", marginBottom: 1 },
  divider:   { borderBottom: "0.5 solid #dddddd", marginVertical: 8 },
  vocabCard: { backgroundColor: "#f5f5f5", borderRadius: 4, padding: 8, marginBottom: 6 },
  vocabWord: { fontSize: 11, color: "#1a5c5a", fontFamily: "Helvetica-Bold", marginBottom: 3 },
  tip:       { backgroundColor: "#fef9ed", padding: 9, borderRadius: 4 },
  cross:     { backgroundColor: "#e8f4f3", padding: 9, borderRadius: 4 },
  qBox:      { marginBottom: 8 },
  qLabel:    { fontSize: 9.5, color: "#1a5c5a", fontFamily: "Helvetica-Bold" },
  ansBox:    { backgroundColor: "#f5f5f5", padding: 8, borderRadius: 4, marginTop: 3 },
  ansLabel:  { fontSize: 8, color: "#888888", fontFamily: "Helvetica-Bold", marginBottom: 2 },
  blankLine: { borderBottom: "0.5 solid #cccccc", marginBottom: 14 },
  journalBox:{ border: "0.5 solid #cccccc", borderRadius: 4, height: 80, marginTop: 6 },
});

const BookTeacherGuide = ({ data }: { data: BookCompanionData }) => {
  const showCross = data.crossSubject && !data.crossSubject.toLowerCase().startsWith("none");
  return (
    <Document>
      <Page size="LETTER" style={bookStyles.page}>
        <Text style={bookStyles.titleText}>{data.title}</Text>
        <Text style={bookStyles.sub}>
          {data.author ? `${data.author} · ` : ""}{data.chapter} · Teacher Guide
        </Text>

        <Text style={bookStyles.h2}>Chapter Summary</Text>
        <Text style={bookStyles.body}>{data.summary}</Text>

        <View style={bookStyles.divider} />
        <Text style={bookStyles.h2}>Discussion Questions</Text>
        {data.discussion.map((qa, i) => (
          <View key={i} style={bookStyles.qBox}>
            <Text style={bookStyles.qLabel}>Q{i + 1}: {qa.question}</Text>
            <View style={bookStyles.ansBox}>
              <Text style={bookStyles.ansLabel}>Model Answer</Text>
              <Text style={bookStyles.body}>{qa.answer}</Text>
            </View>
          </View>
        ))}

        <View style={bookStyles.divider} />
        <Text style={bookStyles.h2}>Vocabulary</Text>
        {data.vocabulary.map((v, i) => (
          <View key={i} style={bookStyles.vocabCard}>
            <Text style={bookStyles.vocabWord}>{v.word}</Text>
            <Text style={bookStyles.label}>Definition</Text>
            <Text style={bookStyles.body}>{v.definition}</Text>
            <Text style={bookStyles.label}>From the book</Text>
            <Text style={bookStyles.body}>{v.bookSentence}</Text>
            <Text style={bookStyles.label}>Example sentence</Text>
            <Text style={bookStyles.body}>{v.exampleSentence}</Text>
            <Text style={bookStyles.label}>Synonyms</Text>
            <Text style={bookStyles.body}>{v.synonyms}</Text>
          </View>
        ))}

        {data.readAloudTip ? (
          <>
            <View style={bookStyles.divider} />
            <Text style={bookStyles.h2}>Read-Aloud Tip</Text>
            <View style={bookStyles.tip}>
              <Text style={bookStyles.body}>{data.readAloudTip}</Text>
            </View>
          </>
        ) : null}

        {showCross ? (
          <>
            <View style={bookStyles.divider} />
            <Text style={bookStyles.h2}>Cross-Subject Connection</Text>
            <View style={bookStyles.cross}>
              <Text style={bookStyles.body}>{data.crossSubject}</Text>
            </View>
          </>
        ) : null}
      </Page>
    </Document>
  );
};

const BookStudentPacket = ({ data }: { data: BookCompanionData }) => (
  <Document>
    <Page size="LETTER" style={bookStyles.page}>
      <Text style={bookStyles.titleText}>{data.title}</Text>
      <Text style={bookStyles.sub}>
        {data.author ? `${data.author} · ` : ""}{data.chapter} · Student Packet
      </Text>

      <Text style={bookStyles.h2}>Discussion Questions</Text>
      {data.discussion.map((qa, i) => (
        <View key={i} style={bookStyles.qBox}>
          <Text style={bookStyles.qLabel}>Q{i + 1}: {qa.question}</Text>
          {[0, 1, 2, 3].map(j => (
            <View key={j} style={bookStyles.blankLine} />
          ))}
        </View>
      ))}

      <View style={bookStyles.divider} />
      <Text style={bookStyles.h2}>Vocabulary</Text>
      {data.vocabulary.map((v, i) => (
        <View key={i} style={bookStyles.vocabCard}>
          <Text style={bookStyles.vocabWord}>{v.word}</Text>
          <Text style={bookStyles.body}>{v.definition}</Text>
        </View>
      ))}

      <View style={bookStyles.divider} />
      <Text style={bookStyles.h2}>Reading Journal</Text>
      <Text style={bookStyles.body}>
        What was the most interesting or surprising moment in this chapter? Describe it and explain why it stood out to you.
      </Text>
      <View style={bookStyles.journalBox} />
    </Page>
  </Document>
);

// ─── Book Companion PDF export helpers ────────────────────────────────────────

export async function generateBookTeacherPdf(data: BookCompanionData): Promise<Uint8Array> {
  const doc = <BookTeacherGuide data={data} />;
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

export async function generateBookStudentPdf(data: BookCompanionData): Promise<Uint8Array> {
  const doc = <BookStudentPacket data={data} />;
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}
