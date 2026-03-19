/**
 * GET /api/book-companion/pdf/[id]?type=teacher|student
 *
 * Generates and streams a PDF for a Book Companion result.
 * - type=teacher  → full guide: summary, discussion Q&A, full vocabulary, tip, cross-subject
 * - type=student  → student packet: questions only (no answers), vocab word+definition only, journaling prompt
 *
 * Auth: requires authenticated Supabase session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

Font.register({ family: "DejaVu",      src: "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf" });
Font.register({ family: "DejaVu-Bold", src: "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" });
Font.register({ family: "DejaVu-Sans", src: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" });
Font.register({ family: "DejaVu-Sans-Bold", src: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" });

const TEAL = "#1a5c5a";
const LIGHT_TEAL = "#e8f4f3";
const GREY = "#f5f5f5";
const MUTED = "#666666";

const styles = StyleSheet.create({
  page:        { fontFamily: "DejaVu-Sans", fontSize: 10, padding: 50, color: "#1a1a1a" },
  title:       { fontFamily: "DejaVu-Bold", fontSize: 18, color: TEAL, marginBottom: 4 },
  subtitle:    { fontSize: 9, color: MUTED, marginBottom: 20 },
  h2:          { fontFamily: "DejaVu-Sans-Bold", fontSize: 12, color: TEAL, marginTop: 16, marginBottom: 6 },
  h3:          { fontFamily: "DejaVu-Sans-Bold", fontSize: 10, color: "#1a1a1a", marginBottom: 3 },
  body:        { fontSize: 9.5, lineHeight: 1.5, marginBottom: 4 },
  label:       { fontFamily: "DejaVu-Sans-Bold", fontSize: 9, color: MUTED, marginBottom: 1 },
  vocabCard:   { backgroundColor: GREY, borderRadius: 4, padding: 8, marginBottom: 6 },
  vocabWord:   { fontFamily: "DejaVu-Sans-Bold", fontSize: 11, color: TEAL, marginBottom: 3 },
  tip:         { backgroundColor: "#fef9ed", padding: 10, borderRadius: 4, marginBottom: 6 },
  cross:       { backgroundColor: LIGHT_TEAL, padding: 10, borderRadius: 4, marginBottom: 6 },
  qBox:        { marginBottom: 8 },
  qNum:        { fontFamily: "DejaVu-Sans-Bold", fontSize: 9.5, color: TEAL },
  ansBox:      { backgroundColor: GREY, padding: 8, borderRadius: 4, marginTop: 4 },
  ansLabel:    { fontFamily: "DejaVu-Sans-Bold", fontSize: 8, color: MUTED, marginBottom: 2 },
  blankLine:   { borderBottom: "0.5 solid #cccccc", marginBottom: 14 },
  journalBox:  { border: "0.5 solid #cccccc", borderRadius: 4, height: 80, marginTop: 6 },
  divider:     { borderBottom: "0.5 solid #dddddd", marginVertical: 10 },
});

// ── Section parsers (duplicated server-side for PDF generation) ────────────────

function parseSection(content: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[\\w|$)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

interface VocabEntry {
  word: string; definition: string;
  bookSentence: string; exampleSentence: string; synonyms: string;
}

function parseVocabulary(section: string): VocabEntry[] {
  const entries: VocabEntry[] = [];
  const blocks = section.split(/(?=^WORD:)/m).filter(b => b.trim());
  for (const block of blocks) {
    const word          = block.match(/^WORD:\s*(.+)/m)?.[1]?.trim() ?? "";
    const definition    = block.match(/^DEFINITION:\s*(.+)/m)?.[1]?.trim() ?? "";
    const bookSentence  = block.match(/^BOOK_SENTENCE:\s*(.+)/m)?.[1]?.trim() ?? "";
    const exampleSentence = block.match(/^EXAMPLE_SENTENCE:\s*(.+)/m)?.[1]?.trim() ?? "";
    const synonyms      = block.match(/^SYNONYMS:\s*(.+)/m)?.[1]?.trim() ?? "";
    if (word) entries.push({ word, definition, bookSentence, exampleSentence, synonyms });
  }
  return entries;
}

interface QA { question: string; answer: string; }

function parseDiscussion(section: string): QA[] {
  const pairs: QA[] = [];
  const blocks = section.split(/Q\d+:/m).filter(b => b.trim());
  for (const block of blocks) {
    const parts = block.split(/ANSWER:/i);
    if (parts.length >= 2) {
      pairs.push({ question: parts[0].trim(), answer: parts[1].trim() });
    }
  }
  return pairs;
}

// ── PDF Documents ─────────────────────────────────────────────────────────────

function TeacherGuide({ title, author, chapter, summary, discussion, vocabulary, readAloudTip, crossSubject }: {
  title: string; author: string; chapter: string; summary: string;
  discussion: QA[]; vocabulary: VocabEntry[]; readAloudTip: string; crossSubject: string;
}) {
  const showCross = crossSubject && !crossSubject.toLowerCase().startsWith("none");
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {author ? `${author} · ` : ""}{chapter} · Teacher Guide
        </Text>

        <Text style={styles.h2}>Chapter Summary</Text>
        <Text style={styles.body}>{summary}</Text>

        <View style={styles.divider} />
        <Text style={styles.h2}>Discussion Questions</Text>
        {discussion.map((qa, i) => (
          <View key={i} style={styles.qBox}>
            <Text style={styles.qNum}>Q{i + 1}: {qa.question}</Text>
            <View style={styles.ansBox}>
              <Text style={styles.ansLabel}>Model Answer</Text>
              <Text style={styles.body}>{qa.answer}</Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />
        <Text style={styles.h2}>Vocabulary</Text>
        {vocabulary.map((v, i) => (
          <View key={i} style={styles.vocabCard}>
            <Text style={styles.vocabWord}>{v.word}</Text>
            <Text style={styles.label}>Definition</Text>
            <Text style={styles.body}>{v.definition}</Text>
            <Text style={styles.label}>From the book</Text>
            <Text style={styles.body}>{v.bookSentence}</Text>
            <Text style={styles.label}>Example sentence</Text>
            <Text style={styles.body}>{v.exampleSentence}</Text>
            <Text style={styles.label}>Synonyms</Text>
            <Text style={styles.body}>{v.synonyms}</Text>
          </View>
        ))}

        {readAloudTip && (
          <>
            <View style={styles.divider} />
            <Text style={styles.h2}>Read-Aloud Tip</Text>
            <View style={styles.tip}>
              <Text style={styles.body}>{readAloudTip}</Text>
            </View>
          </>
        )}

        {showCross && (
          <>
            <View style={styles.divider} />
            <Text style={styles.h2}>Cross-Subject Connection</Text>
            <View style={styles.cross}>
              <Text style={styles.body}>{crossSubject}</Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}

function StudentPacket({ title, author, chapter, discussion, vocabulary }: {
  title: string; author: string; chapter: string;
  discussion: QA[]; vocabulary: VocabEntry[];
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {author ? `${author} · ` : ""}{chapter} · Student Packet
        </Text>

        <Text style={styles.h2}>Discussion Questions</Text>
        <Text style={{ ...styles.body, color: MUTED, fontSize: 8.5, marginBottom: 8 }}>
          Answer each question in your own words. There is no single right answer - back up your thinking.
        </Text>
        {discussion.map((qa, i) => (
          <View key={i} style={styles.qBox}>
            <Text style={styles.qNum}>Q{i + 1}: {qa.question}</Text>
            {[0, 1, 2, 3].map(j => (
              <View key={j} style={styles.blankLine} />
            ))}
          </View>
        ))}

        <View style={styles.divider} />
        <Text style={styles.h2}>Vocabulary</Text>
        {vocabulary.map((v, i) => (
          <View key={i} style={styles.vocabCard}>
            <Text style={styles.vocabWord}>{v.word}</Text>
            <Text style={styles.body}>{v.definition}</Text>
          </View>
        ))}

        <View style={styles.divider} />
        <Text style={styles.h2}>Reading Journal</Text>
        <Text style={styles.body}>
          What was the most interesting or surprising moment in this chapter? Describe it and explain why it stood out to you.
        </Text>
        <View style={styles.journalBox} />
      </Page>
    </Document>
  );
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "student" ? "student" : "teacher";

    // Verify auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const raw = await readFile(join("/tmp", `book-companion-${id}.json`), "utf-8");
    const record = JSON.parse(raw);

    const summary = parseSection(record.content, "SUMMARY");
    const vocabulary = parseVocabulary(parseSection(record.content, "VOCABULARY"));
    const discussion = parseDiscussion(parseSection(record.content, "DISCUSSION_QUESTIONS"));
    const readAloudTip = parseSection(record.content, "READ_ALOUD_TIP");
    const crossSubject = parseSection(record.content, "CROSS_SUBJECT");

    const doc = type === "teacher"
      ? React.createElement(TeacherGuide, {
          title: record.title, author: record.author, chapter: record.chapter,
          summary, discussion, vocabulary, readAloudTip, crossSubject,
        })
      : React.createElement(StudentPacket, {
          title: record.title, author: record.author, chapter: record.chapter,
          discussion, vocabulary,
        });

    const buffer = await renderToBuffer(doc);
    const filename = type === "teacher"
      ? `${record.title.replace(/[^a-z0-9]/gi, "-")}-Teacher-Guide.pdf`
      : `${record.title.replace(/[^a-z0-9]/gi, "-")}-Student-Packet.pdf`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[book-companion/pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
