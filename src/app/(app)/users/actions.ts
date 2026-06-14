"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/rbac";
import { DEMO_MODE } from "@/lib/config";
import type { StaffCategory, UserRole } from "@/lib/constants";

export type ActionResult = { ok: boolean; message: string };

export async function createUser(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isSuperAdmin(profile?.role)) {
    return { ok: false, message: "Hanya Super Admin yang dapat membuat pengguna." };
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "staff") as UserRole;
  const staff_category =
    (String(formData.get("staff_category") ?? "").trim() || null) as StaffCategory | null;
  const client_id = String(formData.get("client_id") ?? "").trim() || null;

  if (!full_name || !email || !password) {
    return { ok: false, message: "Nama, email, dan password wajib diisi." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password minimal 6 karakter." };
  }
  if (role === "client" && !client_id) {
    return { ok: false, message: "Pengguna client harus ditautkan ke sebuah client." };
  }

  if (DEMO_MODE) {
    return { ok: true, message: "Pengguna berhasil dibuat (mode demo)." };
  }

  const admin = createAdminClient();

  // 1. Create the auth user (auto-confirmed). The handle_new_user trigger
  //    creates the base profile row from user_metadata.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) return { ok: false, message: error.message };

  const userId = data.user?.id;
  if (userId) {
    // 2. Upsert profile to set role-specific fields (robust if trigger lagged).
    await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name,
      role,
      staff_category: role === "staff" ? staff_category : null,
      client_id: role === "client" ? client_id : null,
      is_active: true,
    });
  }

  revalidatePath("/users");
  return { ok: true, message: "Pengguna berhasil dibuat." };
}
