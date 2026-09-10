import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DashboardLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div
      className="app-shell flex h-screen overflow-hidden relative"
    >
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 z-10">
        {/* Sticky Translucent Navbar */}
        <Navbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        {/* Scrollable Main Area */}
        <main className="app-main flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
