#!/usr/bin/env node

const MigrationManager = require('../migrations');
const { initializeDatabases, closeDatabaseConnections } = require('../config/database');

async function runMigrations() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tenantId = args[1];
  const dbType = args[2] || 'both';

  try {
    console.log('Initializing databases...');
    await initializeDatabases();

    const migrationManager = new MigrationManager();

    switch (command) {
      case 'up':
        console.log(`Running migrations${tenantId ? ` for tenant: ${tenantId}` : ' globally'}...`);
        await migrationManager.runMigrations(tenantId, dbType);
        console.log('Migrations completed successfully!');
        break;

      case 'down':
        const steps = parseInt(args[3]) || 1;
        console.log(`Rolling back ${steps} migration(s)${tenantId ? ` for tenant: ${tenantId}` : ' globally'}...`);
        await migrationManager.rollback(tenantId, dbType, steps);
        console.log('Rollback completed successfully!');
        break;

      case 'status':
        console.log(`Migration status${tenantId ? ` for tenant: ${tenantId}` : ' globally'}:`);
        // Would need to implement status checking
        console.log('Status checking not yet implemented');
        break;

      default:
        console.log('Usage:');
        console.log('  node scripts/migrate.js up [tenantId] [dbType]           - Run migrations');
        console.log('  node scripts/migrate.js down [tenantId] [dbType] [steps] - Rollback migrations');
        console.log('  node scripts/migrate.js status [tenantId] [dbType]       - Show migration status');
        console.log('');
        console.log('Parameters:');
        console.log('  tenantId: Optional tenant ID for tenant-specific migrations');
        console.log('  dbType:   mysql, mongodb, or both (default: both)');
        console.log('  steps:    Number of migrations to rollback (default: 1)');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/migrate.js up                    # Run all migrations globally');
        console.log('  node scripts/migrate.js up 123 mysql          # Run MySQL migrations for tenant 123');
        console.log('  node scripts/migrate.js down 123 both 2       # Rollback 2 migrations for tenant 123');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnections();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };