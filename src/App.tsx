import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/layout";
import Estudiantes from "./pages/estudiantes";
import Modulos from "./pages/modulos";
import Profesores from "./pages/profesores";
import Dashboard from "./pages/dashboard";
import Pagos from "./pages/pagos";
import Notas from "./pages/notas";
import "./styles/modalConfirmar.css";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/estudiantes"  element={<Estudiantes />} />
        <Route path="/profesores" element={<Profesores />} />
        <Route path="/modulos" element={<Modulos />} />
        <Route path="/notas" element={<Notas />} />
        <Route path="/pagos" element={<Pagos />} />
      </Routes>
    </Layout>
  );
}



