"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DEMO_MODE } from "@/lib/config";

export type ActionResult = { ok: boolean; message: string };

export async function createClientRecord(
  formData: FormData
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "client:manage")) {
    return { ok: false, message: "Anda tidak memiliki izin menambah client." };
  }

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  };

  if (!payload.name) {
    return { ok: false, message: "Nama client wajib diisi." };
  }

  if (DEMO_MODE) {
    return { ok: true, message: "Client berhasil ditambahkan (mode demo)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .insert({ ...payload, created_by: profile!.id });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/clients");
  return { ok: true, message: "Client berhasil ditambahkan." };
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "client:manage")) {
    return { ok: false, message: "Anda tidak memiliki izin menghapus client." };
  }
  if (DEMO_MODE) return { ok: true, message: "Client dihapus (mode demo)." };

  const supabase = await createClient();

  // A client with projects cannot be deleted (FK restrict) — explain clearly.
  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `Tidak bisa dihapus: client masih memiliki ${count} proyek. Hapus proyeknya dulu.`,
    };
  }

  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/clients");
  return { ok: true, message: "Client berhasil dihapus." };
}
