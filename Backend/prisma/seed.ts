import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@saas.local';
  const ownerEmail = 'owner@saas.local';
  const customerEmail = 'customer@saas.local';

  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: adminEmail,
      password: passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      name: 'Business Owner',
      email: ownerEmail,
      password: passwordHash,
      role: UserRole.BUSINESS_OWNER,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    update: {},
    create: {
      name: 'Demo Customer',
      email: customerEmail,
      password: passwordHash,
      role: UserRole.CUSTOMER,
    },
  });

  const business = await prisma.business.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      ownerId: owner.id,
      businessName: 'Demo Wellness Studio',
      businessType: 'Wellness',
      phone: '+1-555-0100',
      email: 'studio@demo.local',
      address: '123 Main Street',
      subscriptionStatus: 'ACTIVE',
    },
  });

  await prisma.service.upsert({
    where: { id: '00000000-0000-4000-8000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000101',
      businessId: business.id,
      serviceName: 'Consultation',
      durationMinutes: 30,
      price: 49.99,
      description: 'Initial consultation session',
    },
  });

  console.log('Seed completed');
  console.log({ admin: admin.email, owner: owner.email, customer: customer.email });
  console.log('Default password for all seed users: Admin123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
