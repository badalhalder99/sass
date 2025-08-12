#!/usr/bin/env node

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { initializeDatabases, createTenantDatabase, closeDatabaseConnections } = require('../config/database');
const MigrationManager = require('../migrations');

async function seedDatabase() {
  try {
    console.log('Initializing databases...');
    await initializeDatabases();

    console.log('Running global migrations...');
    const migrationManager = new MigrationManager();
    await migrationManager.runMigrations(null, 'both');

    // Create demo tenants
    const demoTenants = [
      {
        name: 'Acme Corporation',
        subdomain: 'acme',
        plan_type: 'premium'
      },
      {
        name: 'TechStart Inc',
        subdomain: 'techstart',
        plan_type: 'basic'
      },
      {
        name: 'Small Business',
        subdomain: 'smallbiz',
        plan_type: 'free'
      }
    ];

    for (const tenantData of demoTenants) {
      console.log(`Creating tenant: ${tenantData.name}...`);
      
      // Create tenant
      const tenant = new Tenant({
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        database_name: `tenant_${tenantData.subdomain}`,
        status: 'active',
        settings: {
          created_by: 'seed_script',
          onboarding_completed: true
        }
      });

      const tenantResult = await tenant.save('mysql');
      const tenantId = tenantResult.mysql.id;

      // Create tenant databases
      await createTenantDatabase(tenantId, 'both');

      // Run tenant migrations
      await migrationManager.runMigrations(tenantId, 'both');

      // Create subscription
      const subscriptionPlans = Subscription.getDefaultPlans();
      const planDetails = subscriptionPlans[tenantData.plan_type];
      
      const subscription = new Subscription({
        tenant_id: tenantId,
        ...planDetails,
        billing_cycle: 'monthly',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      await subscription.save('mysql');

      // Create demo users for each tenant
      const demoUsers = [
        {
          name: 'Admin User',
          email: `admin@${tenantData.subdomain}.com`,
          role: 'admin',
          password: await User.hashPassword('admin123'),
          age: 35,
          profession: 'Administrator'
        },
        {
          name: 'John Doe',
          email: `john@${tenantData.subdomain}.com`,
          role: 'user',
          password: await User.hashPassword('user123'),
          age: 28,
          profession: 'Developer'
        },
        {
          name: 'Jane Smith',
          email: `jane@${tenantData.subdomain}.com`,
          role: 'moderator',
          password: await User.hashPassword('user123'),
          age: 32,
          profession: 'Manager'
        }
      ];

      for (const userData of demoUsers) {
        const user = new User({
          tenant_id: tenantId,
          ...userData,
          status: 'active',
          email_verified: true
        });

        await user.save('both', tenantId);
        console.log(`  Created user: ${userData.email}`);
      }

      console.log(`✓ Tenant ${tenantData.name} created with ${demoUsers.length} users`);
    }

    console.log('\n🎉 Seed data created successfully!');
    console.log('\nDemo tenants:');
    console.log('- http://acme.localhost:3000 (Premium plan)');
    console.log('- http://techstart.localhost:3000 (Basic plan)'); 
    console.log('- http://smallbiz.localhost:3000 (Free plan)');
    console.log('\nLogin credentials:');
    console.log('- admin@[tenant].com / admin123 (Admin)');
    console.log('- john@[tenant].com / user123 (User)');
    console.log('- jane@[tenant].com / user123 (Moderator)');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnections();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };