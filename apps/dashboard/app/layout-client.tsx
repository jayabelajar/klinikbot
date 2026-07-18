"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      <aside className="sidebar">
        <div className="sidebar-brand">
          🏥 Klinik<span>Bot</span>
        </div>
        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            <li>
              <Link href="/" className={`sidebar-link ${pathname === "/" ? "active" : ""}`}>
                🏠 Dashboard
              </Link>
            </li>
            <li>
              <Link href="/patients" className={`sidebar-link ${pathname.startsWith("/patients") ? "active" : ""}`}>
                👥 Pasien
              </Link>
            </li>
            <li>
              <Link href="/doctors" className={`sidebar-link ${pathname.startsWith("/doctors") ? "active" : ""}`}>
                🩺 Dokter
              </Link>
            </li>
            <li>
              <Link href="/bookings" className={`sidebar-link ${pathname.startsWith("/bookings") ? "active" : ""}`}>
                📅 Booking
              </Link>
            </li>
            <li>
              <Link href="/queues" className={`sidebar-link ${pathname.startsWith("/queues") ? "active" : ""}`}>
                🚶 Antrian
              </Link>
            </li>
            <li>
              <Link href="/broadcast" className={`sidebar-link ${pathname.startsWith("/broadcast") ? "active" : ""}`}>
                📢 Broadcast
              </Link>
            </li>
            <li>
              <Link href="/reports" className={`sidebar-link ${pathname.startsWith("/reports") ? "active" : ""}`}>
                📊 Laporan
              </Link>
            </li>
            <li>
              <Link href="/settings" className={`sidebar-link ${pathname.startsWith("/settings") ? "active" : ""}`}>
                ⚙️ Pengaturan
              </Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Keluar
          </button>
        </div>
      </aside>
      <div className="main-wrapper">{children}</div>
    </div>
  );
}
