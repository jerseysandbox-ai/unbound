/**
 * GET /api/download-pdf/[id]?type=teacher|student
 *
 * Generates and streams a polished PDF for a completed plan.
 * - type=teacher  → Teacher Guide (full solutions, notes, formulas)
 * - type=student  → Student Packet (questions and workspace only)
 *
 * Security: requires authentication and plan ownership (same checks as get-plan).
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedPlan } from "@/lib/agents";
import { generateTeacherPdf, generateStudentPdf } from "@/lib/pdf-templates";

interface StoredPlan extends GeneratedPlan {
  userId?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "student" ? "student" : "teacher";

    if (!id) {
      return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
    }

    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const plan = await kv.get<StoredPlan>(`plan:${id}`);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found or expired" },
        { status: 404 }
      );
    }

    // Ownership check — fail closed
    let ownerId: string | null = null;
    if (plan.userId) {
      ownerId = plan.userId;
    } else if (id.startsWith("free_")) {
      ownerId = await kv.get<string>(`free_user:${id}`);
    }

    if (!ownerId || ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Format date for PDF header
    const date = new Date(plan.generatedAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const childName = plan.profile.childName || "Learner";

    // Generate the correct PDF
    const pdfBytes =
      type === "student"
        ? await generateStudentPdf(plan, date)
        : await generateTeacherPdf(plan, date);

    const filename =
      type === "student"
        ? `${childName}-Learning-Packet-${new Date(plan.generatedAt).toISOString().split("T")[0]}.pdf`
        : `${childName}-Teacher-Guide-${new Date(plan.generatedAt).toISOString().split("T")[0]}.pdf`;

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("[download-pdf] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
