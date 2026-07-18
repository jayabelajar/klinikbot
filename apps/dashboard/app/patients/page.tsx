async function getPatients() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"}/patients`, {
      cache: "no-store"
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function PatientsPage() {
  const patients = await getPatients();

  return (
    <main className="container">
      <h1>Pasien</h1>
      <div className="card">
        <table width="100%" cellPadding={8}>
          <thead>
            <tr>
              <th align="left">Kode</th>
              <th align="left">Nama</th>
              <th align="left">Gender</th>
              <th align="left">Phone</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p: any) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.gender}</td>
                <td>{p.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
