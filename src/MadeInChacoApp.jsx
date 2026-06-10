import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HeaderComponent } from "./components/HeaderComponent";
import { FullscreenToggle } from "./components/FullscreenToggle";
import { UnderConstruction } from "./components/UnderConstruction";
import { HomePage } from "./pages/HomePage";
import { ProjectPage } from "./pages/ProjectPage";
import { MapChaco } from "./pages/MapChaco";
import { ContactPage } from "./pages/ContactPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPanel } from "./admin/AdminPanel";
import { EntidadDetallePage } from "./pages/EntidadDetallePage";
import { RecorridosPage } from "./pages/RecorridosPage";
import { RecorridoDetallePage } from "./pages/RecorridoDetallePage";
import { SolicitarSelloPage } from "./pages/SolicitarSelloPage";
import { QuienesSomosPage } from "./pages/QuienesSomosPage";
import { PalabraDetallePage } from "./pages/PalabraDetallePage";

function MadeInChacoApp() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  }, [location]);

  const content = (
    <>
      {!isAdmin && <HeaderComponent />}
      <FullscreenToggle />
      <Routes>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/descubre" element={<MapChaco />}></Route>
        <Route path="/proyecto" element={<ProjectPage />}></Route>
        <Route path="/contacto" element={<ContactPage />}></Route>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route path="/entidad/:slug" element={<EntidadDetallePage />} />
        <Route path="/recorridos" element={<RecorridosPage />} />
        <Route path="/recorrido/:slug" element={<RecorridoDetallePage />} />
        <Route path="/solicitar-sello" element={<SolicitarSelloPage />} />
        <Route path="/quienes-somos" element={<QuienesSomosPage />} />
        <Route path="/palabra/:id" element={<PalabraDetallePage />} />
        <Route path="/*" element={<Navigate to="/" />}></Route>
      </Routes>
    </>
  );

  return (
    <AuthProvider>
      {isAdmin ? content : <UnderConstruction>{content}</UnderConstruction>}
    </AuthProvider>
  );
}

export default MadeInChacoApp;
