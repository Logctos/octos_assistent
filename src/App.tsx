import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedLayout } from "@/components/protected-layout";
import { RedirectIfAuthed } from "@/components/redirect-if-authed";
import { MarketingPage } from "@/routes/marketing";
import { LoginPage } from "@/routes/login";
import { AuthCallback } from "@/routes/auth-callback";
import { ChatRoute } from "@/routes/chat";
import { DespesasPage } from "@/routes/despesas";
import { ProjetosPage } from "@/routes/projetos";
import { SaudePage } from "@/routes/saude";
import { EstudosPage } from "@/routes/estudos";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <RedirectIfAuthed>
                <MarketingPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/app" element={<ChatRoute />} />
            <Route path="/despesas" element={<DespesasPage />} />
            <Route path="/projetos" element={<ProjetosPage />} />
            <Route path="/estudos" element={<EstudosPage />} />
            <Route path="/saude" element={<SaudePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
