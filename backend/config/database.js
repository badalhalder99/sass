const { MongoClient } = require('mongodb');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_NAME = 'multi_tenant_saas';

// MySQL Configuration
const MYSQL_CONFIG = {
  database: process.env.MYSQL_DATABASE || 'multi_tenant_saas',
  username: process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

let mongoClient;
let mongoDb;
let sequelize;
let tenantDatabases = new Map();

// MongoDB Connection
async function connectToMongoDB() {
  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    mongoDb = mongoClient.db(MONGODB_NAME);
    return mongoDb;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// MySQL Connection
async function connectToMySQL() {
  try {
    sequelize = new Sequelize(MYSQL_CONFIG);
    await sequelize.authenticate();
    console.log('Connected to MySQL successfully');
    return sequelize;
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    throw error;
  }
}

// Get MongoDB instance
function getMongoDb(tenantId = null) {
  if (!mongoClient) {
    throw new Error('MongoDB not initialized. Call connectToMongoDB first.');
  }
  
  if (tenantId) {
    return mongoClient.db(`tenant_${tenantId}`);
  }
  
  return mongoDb;
}

// Get MySQL instance with tenant-specific database
async function getMySQLInstance(tenantId = null) {
  if (!sequelize) {
    throw new Error('MySQL not initialized. Call connectToMySQL first.');
  }
  
  if (tenantId) {
    const tenantDbName = `tenant_${tenantId}`;
    
    if (!tenantDatabases.has(tenantId)) {
      const tenantConfig = {
        ...MYSQL_CONFIG,
        database: tenantDbName
      };
      
      const tenantSequelize = new Sequelize(tenantConfig);
      await tenantSequelize.authenticate();
      tenantDatabases.set(tenantId, tenantSequelize);
    }
    
    return tenantDatabases.get(tenantId);
  }
  
  return sequelize;
}

// Initialize both databases
async function initializeDatabases() {
  try {
    await connectToMongoDB();
    await connectToMySQL();
    console.log('All databases connected successfully');
  } catch (error) {
    console.error('Failed to initialize databases:', error);
    throw error;
  }
}

// Create tenant databases
async function createTenantDatabase(tenantId, dbType = 'both') {
  try {
    if (dbType === 'both' || dbType === 'mongodb') {
      // MongoDB databases are created automatically when first document is inserted
      // No need to explicitly create collections
      console.log(`MongoDB tenant database will be created for tenant: ${tenantId} when first document is inserted`);
    }
    
    if (dbType === 'both' || dbType === 'mysql') {
      const tenantDbName = `tenant_${tenantId}`;
      await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${tenantDbName}\``);
      console.log(`MySQL tenant database created for tenant: ${tenantId}`);
    }
  } catch (error) {
    console.error(`Failed to create tenant database for ${tenantId}:`, error);
    throw error;
  }
}

// Close all database connections
async function closeDatabaseConnections() {
  try {
    if (sequelize) {
      await sequelize.close();
    }
    
    for (const [tenantId, tenantSequelize] of tenantDatabases) {
      await tenantSequelize.close();
    }
    tenantDatabases.clear();
    
    console.log('All database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

module.exports = {
  connectToMongoDB,
  connectToMySQL,
  initializeDatabases,
  getMongoDb,
  getMySQLInstance,
  createTenantDatabase,
  closeDatabaseConnections,
  // Legacy support
  getDB: () => getMongoDb()
};