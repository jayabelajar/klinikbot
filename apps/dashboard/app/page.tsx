import Link from "next/link";

async function getSummary() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"}/dashboard/summary`, {
      cache: "no-store"
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const summary = await getSummary();

  return (
    <main className="container">
      <h1>KlinikBot Admin Dashboard</h1>
      <p>Ringkasan data klinik real-time.</p>

      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Total Pasien</h3>
          <p>{summary?.totalPatients ?? "-"}</p>
        </div>
        <div className="card">
          <h3>Booking Hari Ini</h3>
          <p>{summary?.bookingsToday ?? "-"}</p>
        </div>
        <div className="card">
          <h3>Antrian Aktif</h3>
          <p>{summary?.activeQueue ?? "-"}</p>
        </div>
        <div className="card">
          <h3>Booking Selesai</h3>
          <p>{summary?.completedToday ?? "-"}</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Manajemen</h2>
          <ul>
            <li><Link href="/patients">Pasien</Link></li>
            <li><Link href="/doctors">Dokter</Link></li>
            <li><Link href="/bookings">Booking</Link></li>
            <li><Link href="/queues">Antrian</Link></li>
          </ul>
        </div>
        <div className="card">
          <h2>Broadcast</h2>
          <p>Gunakan endpoint API `/messages` untuk kirim pengumuman massal pada iterasi berikutnya.</p>
        </div>
      </div>
    </main>
  );
}
