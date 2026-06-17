import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const appointmentInclude = {
      customer: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, businessName: true, ownerId: true } },
      service: true,
      staff: { include: { user: { select: { id: true, name: true, email: true } } } },
      resource: true,
    };
    
    // Test count
    const count = await prisma.appointment.count({});
    console.log("Count:", count);
    
    // Test findMany
    const items = await prisma.appointment.findMany({
      include: appointmentInclude,
      orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
      skip: 0,
      take: 5
    });
    console.log("Items count:", items.length);
  } catch (e) {
    console.error("PRISMA ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
