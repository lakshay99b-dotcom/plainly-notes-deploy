import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlainlyApp } from "@/components/plainly/app";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlainlyApp />
  </StrictMode>,
);
