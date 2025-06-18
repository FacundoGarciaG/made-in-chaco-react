import { Navigate, Route, Routes } from "react-router-dom";
import { HeaderComponent } from "./components/HeaderComponent";
import { MapPage } from "./pages/mapPage";
import { HomePage } from "./pages/HomePage";
import { ProjectPage } from "./pages/ProjectPage";

function MadeInChacoApp() {
  return (
    <>
      <HeaderComponent />
      <Routes>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/descubre" element={<MapPage />}></Route>
        <Route path="/proyecto" element={<ProjectPage />}></Route>
        <Route path="/*" element={<Navigate to="/" />}></Route>
      </Routes>
    </>
  );
}

export default MadeInChacoApp;
