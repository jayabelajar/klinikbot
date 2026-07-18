"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  ListOrdered,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  HeartPulse
} from "lucide-react";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    
    if (!storedToken) {
      setIsAuthenticated(false);
      if (pathname !== "/login") {
        router.push("/login");
      }
    } else {
      setIsAuthenticated(true);
      if (pathname === "/login") {
        router.push("/");
      }
    }
    setLoading(false);
  }, [pathname, router]);

  // Close sidebar drawer automatically on page transitions
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100vw", height: "100vh", fontFamily: "sans-serif", background: "#f1f5f9" }}>
        <h3 style={{ color: "#334155" }}>Memuat KlinikBot...</h3>
      </div>
    );
  }

  // If on login page or not authenticated, don't render sidebar
  if (pathname === "/login" || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      {/* Mobile Top Navbar Header */}
      <header className="mobile-header">
        <Link href="/" className="mobile-brand">
          <HeartPulse size={24} /> Klinik<span>Bot</span>
        </Link>
        <button 
          className="menu-toggle-btn" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Dimmed Overlay Backdrop */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} 
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <HeartPulse size={28} /> Klinik<span>Bot</span>
        </div>
        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            <li>
              <Link href="/" className={`sidebar-link ${pathname === "/" ? "active" : ""}`}>
                <LayoutDashboard size={18} /> Dashboard
              </Link>
            </li>
            <li>
              <Link href="/patients" className={`sidebar-link ${pathname.startsWith("/patients") ? "active" : ""}`}>
                <Users size={18} /> Pasien
              </Link>
            </li>
            <li>
              <Link href="/doctors" className={`sidebar-link ${pathname.startsWith("/doctors") ? "active" : ""}`}>
                <Stethoscope size={18} /> Dokter
              </Link>
            </li>
            <li>
              <Link href="/bookings" className={`sidebar-link ${pathname.startsWith("/bookings") ? "active" : ""}`}>
                <Calendar size={18} /> Booking
              </Link>
            </li>
            <li>
              <Link href="/queues" className={`sidebar-link ${pathname.startsWith("/queues") ? "active" : ""}`}>
                <ListOrdered size={18} /> Antrian
              </Link>
            </li>
            <li>
              <Link href="/broadcast" className={`sidebar-link ${pathname.startsWith("/broadcast") ? "active" : ""}`}>
                <Megaphone size={18} /> Broadcast
              </Link>
            </li>
            <li>
              <Link href="/reports" className={`sidebar-link ${pathname.startsWith("/reports") ? "active" : ""}`}>
                <BarChart3 size={18} /> Laporan
              </Link>
            </li>
            <li>
              <Link href="/settings" className={`sidebar-link ${pathname.startsWith("/settings") ? "active" : ""}`}>
                <Settings size={18} /> Pengaturan
              </Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>
      <div className="main-wrapper">{children}</div>
    </div>
  );
}
