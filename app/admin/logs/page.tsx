// app/admin/logs/page.tsx — Server logs viewer.
// Streams production server logs in real time.
// Admin only.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildPageTitle } from "@/lib/page-title";
import ForbiddenPage from "@/components/ForbiddenPage";
import { PageNavBar } from "@/components/PageNavBar";
import AdminSubNav from "@/components/AdminSubNav";
import ServerLogsClient from "@/components/ServerLogsClient";

export function generateMetadata(): Metadata {
  return {
    title: buildPageTitle("Server Logs"),
    description: "Tail the primordia systemd service journal.",
  };
}

export default async function AdminLogsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const [adminCheck, allRoles] = await Promise.all([
    isAdmin(user.id),
    db.getAllRoles(),
  ]);

  const adminRoleName = allRoles.find((r) => r.name === "admin")?.displayName ?? "admin";

  if (!adminCheck) {
    return (
      <ForbiddenPage
        pageDescription="This page streams live output from the primordia systemd service journal."
        requiredConditions={["Be logged in", `Have the "${adminRoleName}" role`]}
        metConditions={["You are logged in"]}
        unmetConditions={[`You don't have the "${adminRoleName}" role`]}
        howToFix={[
          `The "${adminRoleName}" role is automatically held by the first user who registered on this Primordia instance.`,
        ]}
      />
    );
  }

  const sessionUser = { id: user.id, username: user.username, isAdmin: true };

  // In production (REVERSE_PROXY_PORT set), the prod server logs come from the
  // reverse proxy via SSE — journalctl -u primordia returns nothing because there
  // is no separate primordia unit. Skip the server-side prefetch; the SSE
  // connection will deliver the buffered log on connect.
  // In local dev (no proxy), pre-fetch via journalctl for a faster first paint.
  const { spawnSync } = await import("child_process");
  const initialLogs = process.env.REVERSE_PROXY_PORT
    ? ""
    : (spawnSync("journalctl", ["-u", "primordia", "-n", "100", "--no-pager"], { encoding: "utf8" }).stdout ?? "");

  return (
    <main className="flex flex-col w-full max-w-3xl mx-auto px-4 py-6 min-h-dvh">
      <PageNavBar subtitle="Admin" currentPage="admin" initialSession={sessionUser} />
      <AdminSubNav currentTab="logs" />
      <ServerLogsClient initialOutput={initialLogs} />
    </main>
  );
}
