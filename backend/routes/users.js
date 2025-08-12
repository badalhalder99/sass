const express = require('express');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const { requireTenant } = require('../middleware/tenant');
const router = express.Router();

// Get all tenants for frontend dropdown
router.get('/tenants', async (req, res) => {
  try {
    const { getMySQLInstance } = require('../config/database');
    const sequelize = await getMySQLInstance();
    const Tenant = require('../models/Tenant');
    
    // Initialize Tenant model
    const TenantModel = Tenant.initializeMySQL(sequelize);
    
    const tenants = await TenantModel.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'subdomain', 'status', 'created_at'],
      order: [['created_at', 'ASC']]
    });
    
    res.json({ success: true, data: tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenants' });
  }
});

// Create new tenant from frontend
router.post('/tenants', async (req, res) => {
  try {
    const { name, subdomain } = req.body;
    
    if (!name || !subdomain) {
      return res.status(400).json({
        success: false,
        message: 'Name and subdomain are required'
      });
    }

    // Check if subdomain is already taken
    const { getMySQLInstance } = require('../config/database');
    const sequelize = await getMySQLInstance();
    const Tenant = require('../models/Tenant');
    const Subscription = require('../models/Subscription');
    const MigrationManager = require('../migrations');
    const { createTenantDatabase } = require('../config/database');
    
    // Initialize Tenant model
    const TenantModel = Tenant.initializeMySQL(sequelize);
    
    const existingTenant = await TenantModel.findOne({
      where: { subdomain }
    });
    
    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }

    // Create tenant
    const tenant = new Tenant({
      name,
      subdomain,
      database_name: `tenant_${subdomain}`,
      status: 'active',
      settings: {
        created_by: 'frontend',
        onboarding_completed: false
      }
    });

    const tenantResult = await tenant.save('mysql');
    const tenantId = tenantResult.mysql.id;

    // Create tenant databases
    await createTenantDatabase(tenantId, 'both');

    // Run migrations for tenant
    const migrationManager = new MigrationManager();
    await migrationManager.runMigrations(tenantId, 'both');

    // Create default subscription
    const subscriptionPlans = Subscription.getDefaultPlans();
    const planDetails = subscriptionPlans['free'];
    
    const subscription = new Subscription({
      tenant_id: tenantId,
      ...planDetails,
      billing_cycle: 'monthly',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await subscription.save('mysql');

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenant: tenantResult.mysql,
        subscription: subscription
      }
    });
  } catch (error) {
    console.error('Tenant creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
      error: error.message
    });
  }
});

// Get all users - Multi-tenant aware with option to view all tenants
router.get('/', async (req, res) => {
  try {
    const { tenant_id, all_tenants } = req.query;
    
    // Use direct database access for frontend compatibility
    const { getMongoDb } = require('../config/database');
    const db = getMongoDb(); // Use main database
    const collection = db.collection('users');

    let query = {};
    
    if (all_tenants === 'true') {
      // Return users from all tenants
      console.log('Fetching users from all tenants');
    } else if (tenant_id) {
      // Use specific tenant ID from query parameter
      // Handle both string and number formats due to data inconsistency
      const tenantIdNum = parseInt(tenant_id);
      const tenantIdStr = tenant_id.toString();
      query.$or = [
        { tenant_id: tenantIdNum },  // Number format
        { tenant_id: tenantIdStr }   // String format
      ];
      console.log('Fetching users for specific tenant ID (both formats):', tenant_id);
    } else {
      // Use tenant ID from middleware, fallback to 1 for backward compatibility
      const tenantId = req.tenantId || 1;
      query.tenant_id = tenantId;
      console.log('Fetching users for tenant ID (default):', tenantId);
    }

    const users = await collection.find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    
    console.log('Found users:', users.length);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Create new user - Multi-tenant aware with tenant selection
router.post('/', async (req, res) => {
  try {
    const { name, email, age, profession, summary, tenant_id } = req.body;
    
    // Validation
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
      });
    }

    // Use tenant ID from request body, middleware, or fallback to 1
    const tenantId = tenant_id || req.tenantId || 1;
    console.log('Creating user for tenant ID:', tenantId);

    // Create user in both main database and tenant-specific database for proper multi-tenancy
    const { getMongoDb } = require('../config/database');
    
    const userData = {
      tenant_id: tenantId,
      name,
      email,
      age: age ? parseInt(age) : null,
      profession,
      summary,
      role: 'user',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log('Creating user for tenant ID:', tenantId, 'with data:', JSON.stringify(userData));
    
    // 1. Create user in main database (for cross-tenant queries and frontend compatibility)
    const mainDb = getMongoDb(); // Main database
    const mainCollection = mainDb.collection('users');
    const mainResult = await mainCollection.insertOne(userData);
    console.log('User created in main database with ID:', mainResult.insertedId);
    
    // 2. Create user in tenant-specific database (for true multi-tenancy)
    let tenantResult = null;
    if (tenantId > 1) { // Only create in tenant DB if it's not the default tenant
      try {
        const tenantDb = getMongoDb(tenantId); // Tenant-specific database
        const tenantCollection = tenantDb.collection('users');
        tenantResult = await tenantCollection.insertOne({
          ...userData,
          _id: mainResult.insertedId // Use same ID for consistency
        });
        console.log('User also created in tenant database:', `tenant_${tenantId}`);
      } catch (tenantError) {
        console.error('Error creating user in tenant database:', tenantError);
        // Continue execution - main database creation succeeded
      }
    }
    
    const result = mainResult; // Use main result for response
    
    // Return user data
    const responseData = {
      _id: result.insertedId,
      ...userData
    };
    
    res.status(201).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create user' 
    });
  }
});

// Get single user - Multi-tenant aware
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const tenantId = req.tenantId || 1;
    
    const user = await User.findById(userId, tenantId, 'mongodb');
    
    if (user) {
      // Remove password from response
      const { password, ...userData } = user;
      res.json({ success: true, data: userData });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// Update user - Multi-tenant aware
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, age, profession, summary } = req.body;
    const tenantId = req.tenantId || 1;
    
    const updateData = {
      name,
      email,
      age: age ? parseInt(age) : null,
      profession,
      summary,
      updated_at: new Date()
    };

    const result = await User.updateById(userId, updateData, tenantId, 'mongodb');

    if (result.modifiedCount > 0) {
      // Fetch updated user
      const updatedUser = await User.findById(userId, tenantId, 'mongodb');
      const { password, ...userData } = updatedUser;
      res.json({ success: true, data: userData });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update user' 
    });
  }
});

// Delete user - Multi-tenant aware
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const tenantId = req.tenantId || 1;
    
    const result = await User.deleteById(userId, tenantId, 'mongodb');
    
    if (result.deletedCount > 0) {
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete user' 
    });
  }
});

module.exports = router;