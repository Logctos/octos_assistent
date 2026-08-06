"use client";

import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await getSupabaseClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="hud-button rounded-sm px-3 py-1 text-xs"
    >
      Sair
    </button>
  );
}
