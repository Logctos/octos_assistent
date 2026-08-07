import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
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
