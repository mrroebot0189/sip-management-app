/**
 * Seed script - creates an initial admin user for first login
 * Run: npm run seed
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from './config/database';
import { User } from './models';
import { UserRole } from './types';

const seed = async () => {
  try {
    await connectDatabase();
    console.log('[Seed] Seeding initial data...');

    // Create admin user
    await User.findOrCreate({
      where: { email: 'admin@yourorganisation.com' },
      defaults: {
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@yourorganisation.com',
        passwordHash: 'Admin@123456', // will be hashed by beforeCreate hook
        role: UserRole.ADMIN,
      },
    });

    console.log('[Seed] Initial data seeded successfully.');
    console.log('[Seed] Admin login: admin@yourorganisation.com / Admin@123456');
    console.log('[Seed] IMPORTANT: Change default passwords after first login!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Seeding failed:', error);
    process.exit(1);
  }
};

seed();
