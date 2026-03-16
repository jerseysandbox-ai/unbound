"use client";

/**
 * /admin/ub-manage-2026 — Unbound admin dashboard
 *
 * Secret URL. Not linked anywhere. Silently redirects non-admins to /.
 * Shows all users and plans, with actions to delete.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAILS = ["matthewnbrown@gmail.com", "nicoleannenewman@gmail.com"];

interface Plan {
  id: string;
  child_nickname: string | null;
  grade_level: string | null;
  created_at: string;
  plan_summary: string | null;
  payment_intent_id: string | null;
}

interface User {
  id: string;
  email: string;
  free_plan_used: boolean;
  plans_created: number;
  created_at: string;
  unbound_plans: Plan[];
  showPlans?: boolean;
}

interface Stats {
  totalUsers: number;
  totalPlans: number;
  newUsersThisWeek: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.status === 403) {
      // Silently redirect non-admins
      router.replace("/");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats);
    }
    setLoading(false);
  }, [router]);

  // Check auth and admin status on mount
  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
        router.replace("/");
        return;
      }
      loadData();
    };
    check();
  }, [router, loadData]);

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Delete user ${email} and ALL their data? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setActionMsg(`Deleted user ${email}`);
      loadData();
    } else {
      setActionMsg("Error deleting user");
    }
  }

  async function deletePlanData(userId: string, email: string) {
    if (!confirm(`Delete all plans for ${email}? The account will remain.`)) return;
    const res = await fetch("/api/admin/delete-plan-data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setActionMsg(`Cleared plan data for ${email}`);
      loadData();
    } else {
      setActionMsg("Error clearing plan data");
    }
  }

  function togglePlans(userId: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, showPlans: !u.showPlans } : u))
    );
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <p className="text-[#5b8f8a] font-medium">Loading admin data…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="text-[#5b8f8a] font-bold text-xl">Unbound</span>
          <h1 className="text-2xl font-bold text-[#2d2d2d] mt-1">Admin Dashboard</h1>
          <p className="text-[#8a8580] text-sm mt-1">🔒 Internal use only</p>
        </div>

        {actionMsg && (
          <div className="mb-4 bg-[#e8f4f3] text-[#3d6e69] text-sm px-4 py-3 rounded-xl">
            {actionMsg}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total users", value: stats.totalUsers },
              { label: "Total plans", value: stats.totalPlans },
              { label: "New this week", value: stats.newUsersThisWeek },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#e8e4e0] p-5 text-center shadow-sm">
                <div className="text-3xl font-bold text-[#5b8f8a]">{value ?? 0}</div>
                <div className="text-sm text-[#8a8580] mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-[#e8e4e0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e8e4e0]">
            <h2 className="font-semibold text-[#2d2d2d]">All users ({users.length})</h2>
          </div>

          {users.length === 0 ? (
            <p className="text-[#8a8580] text-sm p-5">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ece8] bg-[#faf9f6]">
                    <th className="text-left px-5 py-3 text-[#5b8f8a] font-semibold">Email</th>
                    <th className="text-left px-4 py-3 text-[#5b8f8a] font-semibold">Joined</th>
                    <th className="text-left px-4 py-3 text-[#5b8f8a] font-semibold">Free used?</th>
                    <th className="text-left px-4 py-3 text-[#5b8f8a] font-semibold">Plans</th>
                    <th className="text-left px-4 py-3 text-[#5b8f8a] font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <>
                      <tr key={user.id} className="border-b border-[#f5f3f0] hover:bg-[#faf9f6]">
                        <td className="px-5 py-3 text-[#2d2d2d] font-medium">{user.email}</td>
                        <td className="px-4 py-3 text-[#8a8580]">{fmt(user.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.free_plan_used ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#dcfce7] text-[#166534]"}`}>
                            {user.free_plan_used ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#2d2d2d]">{user.unbound_plans?.length ?? 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {(user.unbound_plans?.length ?? 0) > 0 && (
                              <button
                                onClick={() => togglePlans(user.id)}
                                className="text-xs text-[#5b8f8a] hover:underline"
                              >
                                {user.showPlans ? "Hide plans" : "View plans"}
                              </button>
                            )}
                            <button
                              onClick={() => deletePlanData(user.id, user.email)}
                              className="text-xs text-[#8a8580] hover:text-[#b45309] hover:underline"
                            >
                              Delete plan data
                            </button>
                            <button
                              onClick={() => deleteUser(user.id, user.email)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove user
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded plans for this user */}
                      {user.showPlans && user.unbound_plans?.map((plan) => (
                        <tr key={plan.id} className="bg-[#f8f6f3] border-b border-[#ede9e4]">
                          <td colSpan={5} className="px-8 py-3">
                            <div className="text-xs text-[#5a5550] space-y-0.5">
                              <p><span className="font-medium text-[#2d2d2d]">Plan ID:</span> {plan.id.slice(0, 8)}…</p>
                              {plan.child_nickname && <p><span className="font-medium text-[#2d2d2d]">Child:</span> {plan.child_nickname} · Grade {plan.grade_level}</p>}
                              {plan.plan_summary && <p><span className="font-medium text-[#2d2d2d]">Summary:</span> {plan.plan_summary}</p>}
                              <p><span className="font-medium text-[#2d2d2d]">Created:</span> {fmt(plan.created_at)}</p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
