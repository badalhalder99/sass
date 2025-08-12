const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const { getMySQLInstance, getMongoDb } = require('../config/database');

class MigrationManager {
  constructor() {
    this.migrationsPath = __dirname;
    this.migrationTable = 'migrations';
  }

  async initializeMigrationTable(sequelize) {
    const Migration = sequelize.define('Migration', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      batch: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      executed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'migrations',
      timestamps: false
    });

    await Migration.sync();
    return Migration;
  }

  async getExecutedMigrations(sequelize) {
    const Migration = await this.initializeMigrationTable(sequelize);
    const executed = await Migration.findAll({
      order: [['batch', 'ASC'], ['name', 'ASC']]
    });
    return executed.map(m => m.name);
  }

  async recordMigration(sequelize, name, batch) {
    const Migration = await this.initializeMigrationTable(sequelize);
    await Migration.create({ name, batch });
  }

  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js') && file !== 'index.js')
      .sort();
    return files;
  }

  async runMigrations(tenantId = null, dbType = 'both') {
    console.log(`Running migrations for tenant: ${tenantId || 'global'}, database: ${dbType}`);
    
    const migrationFiles = this.getMigrationFiles();
    
    if (dbType === 'both' || dbType === 'mysql') {
      await this.runMySQLMigrations(tenantId, migrationFiles);
    }
    
    if (dbType === 'both' || dbType === 'mongodb') {
      await this.runMongoDBMigrations(tenantId, migrationFiles);
    }
  }

  async runMySQLMigrations(tenantId, migrationFiles) {
    const sequelize = await getMySQLInstance(tenantId);
    const executedMigrations = await this.getExecutedMigrations(sequelize);
    const nextBatch = executedMigrations.length > 0 ? 
      Math.max(...(await sequelize.models.Migration.findAll()).map(m => m.batch)) + 1 : 1;

    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.js');
      
      if (!executedMigrations.includes(migrationName)) {
        console.log(`Running MySQL migration: ${migrationName}`);
        
        try {
          const migration = require(path.join(this.migrationsPath, file));
          
          if (migration.mysql && migration.mysql.up) {
            await migration.mysql.up(sequelize, DataTypes);
            await this.recordMigration(sequelize, migrationName, nextBatch);
            console.log(`✓ MySQL migration completed: ${migrationName}`);
          }
        } catch (error) {
          console.error(`✗ MySQL migration failed: ${migrationName}`, error);
          throw error;
        }
      }
    }
  }

  async runMongoDBMigrations(tenantId, migrationFiles) {
    const db = getMongoDb(tenantId);
    const migrationsCollection = db.collection('migrations');
    
    const executedMigrations = await migrationsCollection
      .find({})
      .sort({ batch: 1, name: 1 })
      .toArray();
    
    const executedNames = executedMigrations.map(m => m.name);
    const nextBatch = executedMigrations.length > 0 ? 
      Math.max(...executedMigrations.map(m => m.batch)) + 1 : 1;

    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.js');
      
      if (!executedNames.includes(migrationName)) {
        console.log(`Running MongoDB migration: ${migrationName}`);
        
        try {
          const migration = require(path.join(this.migrationsPath, file));
          
          if (migration.mongodb && migration.mongodb.up) {
            await migration.mongodb.up(db);
            await migrationsCollection.insertOne({
              name: migrationName,
              batch: nextBatch,
              executed_at: new Date()
            });
            console.log(`✓ MongoDB migration completed: ${migrationName}`);
          }
        } catch (error) {
          console.error(`✗ MongoDB migration failed: ${migrationName}`, error);
          throw error;
        }
      }
    }
  }

  async rollback(tenantId = null, dbType = 'both', steps = 1) {
    console.log(`Rolling back ${steps} migration(s) for tenant: ${tenantId || 'global'}, database: ${dbType}`);
    
    if (dbType === 'both' || dbType === 'mysql') {
      await this.rollbackMySQL(tenantId, steps);
    }
    
    if (dbType === 'both' || dbType === 'mongodb') {
      await this.rollbackMongoDB(tenantId, steps);
    }
  }

  async rollbackMySQL(tenantId, steps) {
    const sequelize = await getMySQLInstance(tenantId);
    const Migration = await this.initializeMigrationTable(sequelize);
    
    const lastMigrations = await Migration.findAll({
      order: [['batch', 'DESC'], ['name', 'DESC']],
      limit: steps
    });

    for (const migrationRecord of lastMigrations) {
      const migrationFile = `${migrationRecord.name}.js`;
      const migrationPath = path.join(this.migrationsPath, migrationFile);
      
      if (fs.existsSync(migrationPath)) {
        console.log(`Rolling back MySQL migration: ${migrationRecord.name}`);
        
        try {
          const migration = require(migrationPath);
          
          if (migration.mysql && migration.mysql.down) {
            await migration.mysql.down(sequelize, DataTypes);
            await Migration.destroy({ where: { id: migrationRecord.id } });
            console.log(`✓ MySQL rollback completed: ${migrationRecord.name}`);
          }
        } catch (error) {
          console.error(`✗ MySQL rollback failed: ${migrationRecord.name}`, error);
          throw error;
        }
      }
    }
  }

  async rollbackMongoDB(tenantId, steps) {
    const db = getMongoDb(tenantId);
    const migrationsCollection = db.collection('migrations');
    
    const lastMigrations = await migrationsCollection
      .find({})
      .sort({ batch: -1, name: -1 })
      .limit(steps)
      .toArray();

    for (const migrationRecord of lastMigrations) {
      const migrationFile = `${migrationRecord.name}.js`;
      const migrationPath = path.join(this.migrationsPath, migrationFile);
      
      if (fs.existsSync(migrationPath)) {
        console.log(`Rolling back MongoDB migration: ${migrationRecord.name}`);
        
        try {
          const migration = require(migrationPath);
          
          if (migration.mongodb && migration.mongodb.down) {
            await migration.mongodb.down(db);
            await migrationsCollection.deleteOne({ _id: migrationRecord._id });
            console.log(`✓ MongoDB rollback completed: ${migrationRecord.name}`);
          }
        } catch (error) {
          console.error(`✗ MongoDB rollback failed: ${migrationRecord.name}`, error);
          throw error;
        }
      }
    }
  }
}

module.exports = MigrationManager;