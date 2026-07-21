const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const MANDALS = [
  { id: 1, name: "Adarsh Mandal", color: "#E53E3E", abbreviation: "AD", logoUrl: "Adarsh mandal.jpg" },
  { id: 2, name: "Sankalp Mandal", color: "#3182CE", abbreviation: "SK", logoUrl: "Sankalp mandal.jpg" },
  { id: 3, name: "Chanakya Mandal", color: "#38A169", abbreviation: "CH", logoUrl: "Chanakya mandal.jpg" },
  { id: 4, name: "Vijay Mandal", color: "#D69E2E", abbreviation: "VJ", logoUrl: "vijay mandal.jpg" },
  { id: 5, name: "Utkarsh Mandal", color: "#805AD5", abbreviation: "UK", logoUrl: "Utkarsh mandal.jpg" },
  { id: 6, name: "Rakshak Mandal", color: "#DD6B20", abbreviation: "RK", logoUrl: "Rakshak mandal.jpg" },
  { id: 7, name: "Shaurya Mandal", color: "#2C7A7B", abbreviation: "SH", logoUrl: "Shaurya mandal.jpg" },
];

async function main() {
  console.log("Seeding started...");

  // Seed Mandals
  for (const mandal of MANDALS) {
    await prisma.mandal.upsert({
      where: { id: mandal.id },
      update: {},
      create: {
        id: mandal.id,
        name: mandal.name,
        color: mandal.color,
        abbreviation: mandal.abbreviation,
        logoUrl: mandal.logoUrl,
      },
    });
  }
  console.log("Mandals seeded.");

  // Seed Admin Users
  const roles = [
    { username: "admin", role: "SUPER_ADMIN", password: "admin123" },
    { username: "organiser", role: "ORGANISER_TEAM", password: "organiser123" },
    { username: "creator", role: "CREATOR_TEAM", password: "creator123" },
    { username: "media", role: "MEDIA_TEAM", password: "media123" },
  ];

  for (const user of roles) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        role: user.role,
        passwordHash: passwordHash,
      },
      create: {
        username: user.username,
        role: user.role,
        passwordHash: passwordHash,
      },
    });
  }
  console.log("Admin users seeded.");
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
