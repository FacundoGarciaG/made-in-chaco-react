import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";
import { AuthPublicoProvider } from "./context/AuthPublicoContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HeaderComponent } from "./components/HeaderComponent";
import { FullscreenToggle } from "./components/FullscreenToggle";
import { UnderConstruction } from "./components/UnderConstruction";

const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const ProjectPage = lazy(() => import("./pages/ProjectPage").then(m => ({ default: m.ProjectPage })));
const MapChaco = lazy(() => import("./pages/MapChaco").then(m => ({ default: m.MapChaco })));
const ContactPage = lazy(() => import("./pages/ContactPage").then(m => ({ default: m.ContactPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const AdminPanel = lazy(() => import("./admin/AdminPanel").then(m => ({ default: m.AdminPanel })));
const EntidadDetallePage = lazy(() => import("./pages/EntidadDetallePage").then(m => ({ default: m.EntidadDetallePage })));
const RecorridosPage = lazy(() => import("./pages/RecorridosPage").then(m => ({ default: m.RecorridosPage })));
const RecorridoDetallePage = lazy(() => import("./pages/RecorridoDetallePage").then(m => ({ default: m.RecorridoDetallePage })));
const SolicitarSelloPage = lazy(() => import("./pages/SolicitarSelloPage").then(m => ({ default: m.SolicitarSelloPage })));
const SolicitarEdicionPage = lazy(() => import("./pages/SolicitarEdicionPage").then(m => ({ default: m.SolicitarEdicionPage })));
const QuienesSomosPage = lazy(() => import("./pages/QuienesSomosPage").then(m => ({ default: m.QuienesSomosPage })));
const PalabraDetallePage = lazy(() => import("./pages/PalabraDetallePage").then(m => ({ default: m.PalabraDetallePage })));
const WikiaPage = lazy(() => import("./pages/WikiaPage").then(m => ({ default: m.WikiaPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const UserLoginPage = lazy(() => import("./pages/UserLoginPage").then(m => ({ default: m.UserLoginPage })));
const OlvidarContrasenaPage = lazy(() => import("./pages/OlvidarContrasenaPage").then(m => ({ default: m.OlvidarContrasenaPage })));
const ReestablecerContrasenaPage = lazy(() => import("./pages/ReestablecerContrasenaPage").then(m => ({ default: m.ReestablecerContrasenaPage })));
const PerfilPage = lazy(() => import("./pages/PerfilPage").then(m => ({ default: m.PerfilPage })));
const VerificarCuentaPage = lazy(() => import("./pages/VerificarCuentaPage").then(m => ({ default: m.VerificarCuentaPage })));

function RouteFallback() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      color: "#863819",
      fontFamily: "Cinzel, serif",
      fontSize: "1.2rem",
    }}>
      Cargando...
    </div>
  );
}

function MadeInChacoApp() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
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
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
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
            <Route path="/entidad/:id/editar" element={<SolicitarEdicionPage />} />
            <Route path="/recorridos" element={<RecorridosPage />} />
            <Route path="/recorrido/:slug" element={<RecorridoDetallePage />} />
            <Route path="/solicitar-sello" element={<SolicitarSelloPage />} />
            <Route path="/quienes-somos" element={<QuienesSomosPage />} />
            <Route path="/registrarse" element={<RegisterPage />} />
            <Route path="/iniciar-sesion" element={<UserLoginPage />} />
            <Route path="/olvide-contrasena" element={<OlvidarContrasenaPage />} />
            <Route path="/reestablecer-contrasena/:token" element={<ReestablecerContrasenaPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/verificar/:token" element={<VerificarCuentaPage />} />
            <Route path="/palabra/:id" element={<PalabraDetallePage />} />
            <Route path="/wikia" element={<WikiaPage />} />
            <Route path="/wikia/:slug" element={<PalabraDetallePage />} />
            <Route path="/*" element={<Navigate to="/" />}></Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );

  return (
    <HelmetProvider>
      <AuthProvider>
        <AuthPublicoProvider>
          <NotificationProvider>
            {isAdmin ? content : <UnderConstruction>{content}</UnderConstruction>}
          </NotificationProvider>
        </AuthPublicoProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default MadeInChacoApp;
