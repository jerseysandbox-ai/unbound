import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { planId, rating, comment, gradeLevel, subjects } = body;

  if (!planId || !rating || !["up", "down"].includes(rating)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Insert feedback
  const { data: feedback, error: insertError } = await supabase
    .from("unbound_feedback")
    .insert({
      user_id: user.id,
      plan_id: planId,
      rating,
      comment: comment || null,
      grade_level: gradeLevel || null,
      subjects: subjects || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Feedback insert error:", insertError);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  // Send email notification via Resend
  try {
    const ratingLabel = rating === "up" ? "👍 Helpful" : "👎 Not quite";
    const commentText = comment || "No comment left";
    const createdAt = feedback?.created_at
      ? new Date(feedback.created_at).toLocaleString("en-US", { timeZone: "America/Denver" })
      : new Date().toLocaleString("en-US", { timeZone: "America/Denver" });

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #2d2d2d;">
        <h2 style="color: #5b8f8a; margin-bottom: 16px;">New Unbound Feedback</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: 600; color: #5b8f8a; width: 120px;">Rating</td><td style="padding: 8px 0;">${ratingLabel}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #5b8f8a;">Comment</td><td style="padding: 8px 0;">${commentText}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #5b8f8a;">Grade level</td><td style="padding: 8px 0;">${gradeLevel || "Not specified"}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #5b8f8a;">Subjects</td><td style="padding: 8px 0;">${subjects || "Not specified"}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #5b8f8a;">Time</td><td style="padding: 8px 0;">${createdAt} MT</td></tr>
        </table>
      </div>
    `;

    const plainText = [
      `Rating: ${ratingLabel}`,
      `Comment: ${commentText}`,
      `Grade level: ${gradeLevel || "Not specified"}`,
      `Subjects: ${subjects || "Not specified"}`,
      `Time: ${createdAt} MT`,
    ].join("\n");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Unbound <hello@unboundlearner.com>",
        to: "nicoleannenewman@gmail.com",
        subject: `New feedback — [${ratingLabel}]`,
        html: htmlBody,
        text: plainText,
      }),
    });
  } catch (emailErr) {
    // Don't fail the request if email sending fails
    console.error("Email notification error:", emailErr);
  }

  return NextResponse.json({ success: true });
}
