import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import MadeInChacoApp from "./MadeInChacoApp.jsx";
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <StrictMode>
      <MadeInChacoApp />
    </StrictMode>
  </BrowserRouter>
);
