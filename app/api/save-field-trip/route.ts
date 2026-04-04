/**
 * POST /api/save-field-trip
 *
 * Saves a field trip result to the field_trips table.
 * Auth required. Best-effort save from the client.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RequestBody {
  subject: string;
  zip: string;
  distance: string;
  suggestions: string[];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { subject, zip, distance, suggestions } = body;

    if (!subject?.trim() || !zip?.trim() || !distance || !Array.isArray(suggestions)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data, error: insertError } = await supabase
      .from("field_trips")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        zip: zip.trim(),
        distance,
        suggestions: JSON.stringify(suggestions),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[save-field-trip]", insertError);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[save-field-trip]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
