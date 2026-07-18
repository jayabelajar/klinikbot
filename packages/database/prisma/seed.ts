import { PrismaClient, UserRole, DoctorStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create Default Admin User
  const adminUsername = "admin";
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername }
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        password: "admin123", // In a real production app, this would be hashed
        role: UserRole.ADMIN
      }
    });
    console.log(`Created default admin user: ${admin.username}`);
  } else {
    console.log(`Admin user already exists: ${existingAdmin.username}`);
  }

  // 2. Create Default Doctors (to help with WhatsApp Bot scheduling)
  const defaultDoctors = [
    {
      name: "dr. Andi Wijaya",
      specialization: "Poli Umum",
      schedule: "Senin - Jumat (08:00 - 12:00)",
      status: DoctorStatus.ACTIVE
    },
    {
      name: "dr. Budi Santoso",
      specialization: "Poli Gigi",
      schedule: "Senin - Kamis (13:00 - 17:00)",
      status: DoctorStatus.ACTIVE
    },
    {
      name: "dr. Citra Lestari",
      specialization: "Poli Anak",
      schedule: "Selasa, Kamis, Sabtu (09:00 - 13:00)",
      status: DoctorStatus.ACTIVE
    }
  ];

  for (const doc of defaultDoctors) {
    const existingDoctor = await prisma.doctor.findFirst({
      where: { name: doc.name }
    });

    if (!existingDoctor) {
      const newDoc = await prisma.doctor.create({ data: doc });
      console.log(`Created doctor: ${newDoc.name} (${newDoc.specialization})`);
    } else {
      console.log(`Doctor already exists: ${existingDoctor.name}`);
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
