// Demo data for local development and CI only. Every person and number here
// is made up: phone numbers are in Ofcom's drama range (07700 900xxx).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

if (process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true")) {
  console.error("Refusing to seed demo data into production.");
  process.exit(1);
}

const at = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  const existing = await prisma.agency.findUnique({ where: { slug: "demo-lettings" } });
  if (existing) await prisma.agency.delete({ where: { id: existing.id } });

  const agency = await prisma.agency.create({ data: { name: "Demo Lettings", slug: "demo-lettings", phone: "0117 496 0000", email: "office@tenurage.demo" } });
  const hash = await bcrypt.hash("tenurage123", 10);
  await prisma.user.createMany({
    data: [
      { agencyId: agency.id, email: "admin@tenurage.demo", passwordHash: hash, firstName: "Alex", lastName: "Morgan", role: "ADMIN", mobile: "+447700900001" },
      { agencyId: agency.id, email: "sam@tenurage.demo", passwordHash: hash, firstName: "Sam", lastName: "Patel", role: "NEGOTIATOR" },
    ],
  });

  const props = [
    { market: "LET", address: "14 Cotham Grove, Bristol", postcode: "BS6 6AL", kind: "flat", bedrooms: 2, price: 1450, summary: "Second-floor flat with a bay-fronted lounge.", features: ["Gas central heating", "Bike store", "Unfurnished"] },
    { market: "LET", address: "3 Ashley Hill, Bristol", postcode: "BS7 9LE", kind: "house", bedrooms: 3, price: 1850, summary: "Terraced house with a south-facing garden.", features: ["Garden", "Two reception rooms"] },
    { market: "SALE", address: "22 Gloucester Road, Bristol", postcode: "BS7 8AE", kind: "flat", bedrooms: 1, price: 235000, summary: "", features: [] },
    { market: "LET", address: "9 Whiteladies Road, Bristol", postcode: "BS8 1PB", kind: "flat", bedrooms: 1, price: 1100, summary: "Studio-style one bed above shops.", features: ["Furnished"], status: "LET_AGREED" },
  ];
  const created = [];
  for (const p of props) created.push(await prisma.property.create({ data: { agencyId: agency.id, ...p } }));

  const applicants = [
    { firstName: "Jordan", lastName: "Reid", phone: "+447700900101", market: "LET", minBedrooms: 2, maxPrice: 1600, areas: ["BS6", "BS7"] },
    { firstName: "Priya", lastName: "Shah", phone: "+447700900102", market: "LET", minBedrooms: 2, maxPrice: 2000, areas: ["Bristol"] },
    { firstName: "Tom", lastName: "Hughes", phone: "+447700900103", market: "LET", minBedrooms: 3, maxPrice: 1900, areas: ["BS7"] },
    { firstName: "Ellie", lastName: "Watts", phone: null, market: "LET", minBedrooms: 1, maxPrice: 1500, areas: ["BS6"] },
    { firstName: "Marcus", lastName: "Bell", phone: "+447700900105", market: "SALE", minBedrooms: 1, maxPrice: 260000, areas: ["BS7"] },
  ];
  const apps = [];
  for (const a of applicants) apps.push(await prisma.applicant.create({ data: { agencyId: agency.id, ...a } }));

  const [cotham, ashley] = created;
  for (const [day, h, m] of [[1, 17, 30], [1, 17, 50], [2, 12, 0]] as const) {
    await prisma.viewing.create({ data: { agencyId: agency.id, propertyId: cotham!.id, startAt: at(day, h, m), endAt: at(day, h, m + 15) } });
  }
  await prisma.viewing.create({ data: { agencyId: agency.id, propertyId: ashley!.id, applicantId: apps[2]!.id, status: "BOOKED", bookedVia: "office", bookedAt: new Date(), startAt: at(0, 18), endAt: at(0, 18, 20) } });
  await prisma.viewing.create({ data: { agencyId: agency.id, propertyId: ashley!.id, applicantId: apps[1]!.id, status: "DONE", startAt: at(-2, 11), endAt: at(-2, 11, 20), interest: 5, feedback: "Loved the garden, would like to apply." } });

  await prisma.linkbot.create({ data: { agencyId: agency.id } });
  console.log(`Seeded ${agency.name}: sign in as admin@tenurage.demo / tenurage123`);
}

main().finally(() => prisma.$disconnect());
