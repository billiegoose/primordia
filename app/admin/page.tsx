// app/admin/page.tsx — Admin panel for managing user permissions.
// Only accessible to the first (owner) user. Others are redirected.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildPageTitle } from "@/lib/page-title";
import AdminPermissionsClient, { type AdminUser } from "@/components/AdminPermissionsClient";
import ForbiddenPage from "@/components/ForbiddenPage";

export function generateMetadata(): Metadata {
  return {
    title: buildPageTitle("Admin"),
    description: "Manage user permissions.",
  };
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!(await isAdmin(user.id))) {
    return (
      <ForbiddenPage
        pageDescription="This page lets you manage user roles and permissions. You can grant or revoke the 'can_evolve' role to control who can propose changes to the app."
        requiredConditions={["Be logged in", "Have the 'admin' role"]}
        metConditions={["You are logged in"]}
        unmetConditions={["You don't have the 'admin' role"]}
        howToFix={[
          "The 'admin' role is automatically held by the first user who registered on this Primordia instance. It cannot be granted by other users.",
        ]}
      />
    );
  }

  const db = await getDb();
  const [allUsers, adminUsers, evolveUsers, allRoles] = await Promise.all([
    db.getAllUsers(),
    db.getUsersWithRole("admin"),
    db.getUsersWithRole("can_evolve"),
    db.getAllRoles(),
  ]);

  const adminSet = new Set(adminUsers);
  const evolveSet = new Set(evolveUsers);

  const users: AdminUser[] = allUsers.map((u) => ({
    id: u.id,
    username: u.username,
    isAdmin: adminSet.has(u.id),
    canEvolve: evolveSet.has(u.id),
  }));

  const adminRoleName = allRoles.find((r) => r.name === "admin")?.displayName ?? "owner";
  const evolveRoleName = allRoles.find((r) => r.name === "can_evolve")?.displayName ?? "Evolver";

  return (
    <main className="flex flex-col w-full max-w-3xl mx-auto px-4 py-6 min-h-dvh">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-100">Admin</h1>
          <a
            href="/chat"
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← Back to chat
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Logged in as <span className="text-gray-300 font-mono">{user.username}</span> ({adminRoleName})
        </p>
      </header>

      <section>
        <h2 className="text-base font-medium text-gray-200 mb-3">Evolve permissions</h2>
        <p className="text-sm text-gray-500 mb-4">
          Control which users can access the evolve flow to propose changes to this app.
          The {adminRoleName} always has access.
        </p>
        <AdminPermissionsClient users={users} adminRoleName={adminRoleName} evolveRoleName={evolveRoleName} />
      </section>
    </main>
  );
}
