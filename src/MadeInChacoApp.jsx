import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HeaderComponent } from "./components/HeaderComponent";
import { FullscreenToggle } from "./components/FullscreenToggle";
import { HomePage } from "./pages/HomePage";
import { ProjectPage } from "./pages/ProjectPage";
import { MapChaco } from "./pages/MapChaco";
import { ContactPage } from "./pages/ContactPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPanel } from "./admin/AdminPanel";
import { EntidadDetallePage } from "./pages/EntidadDetallePage";
import { RecorridosPage } from "./pages/RecorridosPage";
import { RecorridoDetallePage } from "./pages/RecorridoDetallePage";

function MadeInChacoApp() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <AuthProvider>
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
        <Route path="/*" element={<Navigate to="/" />}></Route>
      </Routes>
    </AuthProvider>
  );
}

export default MadeInChacoApp;
