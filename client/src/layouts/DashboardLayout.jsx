import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import AssistantFab from "../components/AssistantFab";

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg)",
    }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", minWidth: 0 }}>
        <Navbar onToggleMobile={() => setMobileOpen((v) => !v)} />
        <main style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 24px",
          background: "var(--bg)",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <Outlet />
          </div>
        </main>
      </div>
      <AssistantFab />
    </div>
  );
};

export default DashboardLayout;
