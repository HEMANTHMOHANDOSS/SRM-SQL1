// main.tsx or App.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './index.css';
import { PythonAuthProvider } from './contexts/PythonAuthContext';// ✅ correct file
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PythonAuthProvider> {/* ✅ Ensure this wraps ALL children */}
        <App />
      </PythonAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
