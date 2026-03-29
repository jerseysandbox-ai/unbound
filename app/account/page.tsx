"use client";

/**
 * /account
 *
 * Auth-gated plan history page. Shows all plans the user has generated,
 * ordered newest first, with links to view or download each.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

interface PlanRecord {
  id: string;
  kv_session_id: string | null;
  child_nickname: string | null;
  grade_level: string | null;
  subjects: string | null;
  plan_summary: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("unbound_plans")
        .select("id, kv_session_id, child_nickname, grade_level, subjects, plan_summary, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Failed to load plans. Please try again.");
      } else {
        setPlans(data ?? []);
      }
      setLoading(false);
    }

    load();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      {/* Header */}
      <div className="bg-[#5b8f8a] text-white px-4 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href="/" className="font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
              Unbound
            </a>
            <p className="text-sm text-white/80 mt-0.5">Your plan history</p>
          </div>
          <a
            href="/profile"
            className="bg-white text-[#5b8f8a] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#e8f4f3] transition-colors"
          >
            + Generate a new plan
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🌱</div>
            <p className="text-[#5b8f8a] font-medium">Loading your plans...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">😔</div>
            <p className="text-[#8a8580]">{error}</p>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-[#2d2d2d] mb-2">No plans yet</h2>
            <p className="text-[#8a8580] mb-6">Your generated plans will appear here.</p>
            <a
              href="/profile"
              className="inline-block bg-[#5b8f8a] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#3d6e69] transition-colors"
            >
              Generate your first plan
            </a>
          </div>
        )}

        {!loading && plans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#8a8580] uppercase tracking-wide mb-6">
              {plans.length} plan{plans.length !== 1 ? "s" : ""}
            </h2>

            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-[#e8e4e0] shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {/* Date */}
                    <p className="text-xs text-[#8a8580] mb-1">{formatDate(plan.created_at)}</p>

                    {/* Child + grade */}
                    <h3 className="font-semibold text-[#2d2d2d] text-base">
                      {plan.child_nickname ?? "Unnamed child"}
                      {plan.grade_level ? (
                        <span className="text-[#5b8f8a] font-normal ml-2 text-sm">
                          {plan.grade_level}
                        </span>
                      ) : null}
                    </h3>

                    {/* Subjects */}
                    {plan.subjects && (
                      <p className="text-sm text-[#8a8580] mt-1 truncate">{plan.subjects}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  {plan.kv_session_id && (
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`/plan/${plan.kv_session_id}`}
                        className="bg-[#5b8f8a] text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[#3d6e69] transition-colors whitespace-nowrap"
                      >
                        View Plan
                      </a>
                      <a
                        href={`/api/download-pdf-stored/${plan.kv_session_id}`}
                        download
                        className="border border-[#5b8f8a] text-[#5b8f8a] text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[#e8f4f3] transition-colors whitespace-nowrap"
                      >
                        Download PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
