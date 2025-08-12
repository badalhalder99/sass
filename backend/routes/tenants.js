const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');
const MigrationManager = require('../migrations');
const { createTenantDatabase } = require('../config/database');
const { requireTenant } = require('../middleware/tenant');

// Create a new tenant (public route)
router.post('/create', async (req, res) => {
  try {
    const { name, subdomain, plan_type = 'free', billing_cycle = 'monthly' } = req.body;

    if (!name || !subdomain) {
      return res.status(400).json({
        success: false,
        message: 'Name and subdomain are required'
      });
    }

    // Check if subdomain is already taken
    const existingTenant = await Tenant.findBySubdomain(subdomain, 'mysql');
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
        created_by: 'api',
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
    const planDetails = subscriptionPlans[plan_type];
    
    const subscription = new Subscription({
      tenant_id: tenantId,
      ...planDetails,
      billing_cycle,
      current_period_end: new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
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

// Get tenant details
router.get('/details', requireTenant, async (req, res) => {
  try {
    const subscription = await Subscription.findByTenantId(req.tenantId, 'mysql');

    res.json({
      success: true,
      data: {
        tenant: req.tenant,
        subscription
      }
    });
  } catch (error) {
    console.error('Get tenant details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant details'
    });
  }
});

// Update tenant settings
router.put('/settings', requireTenant, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Settings object is required'
      });
    }

    const tenant = new Tenant(req.tenant);
    const updatedSettings = { ...req.tenant.settings, ...settings };
    
    await tenant.update({ 
      settings: updatedSettings,
      updated_at: new Date()
    }, 'mysql');

    res.json({
      success: true,
      message: 'Tenant settings updated successfully',
      data: {
        settings: updatedSettings
      }
    });
  } catch (error) {
    console.error('Update tenant settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant settings'
    });
  }
});

// Get tenant statistics
router.get('/stats', requireTenant, async (req, res) => {
  try {
    const User = require('../models/User');
    
    const userCount = await User.getUsersCount(req.tenantId, 'mongodb');
    const subscription = await Subscription.findByTenantId(req.tenantId, 'mysql');

    const stats = {
      users: {
        total: userCount,
        limit: subscription?.max_users || 0,
        remaining: subscription?.max_users > 0 ? Math.max(0, subscription.max_users - userCount) : -1
      },
      subscription: {
        plan: subscription?.plan_type || 'unknown',
        status: subscription?.status || 'inactive',
        expires: subscription?.current_period_end,
        is_trial: subscription?.isInTrial() || false
      },
      tenant: {
        status: req.tenant.status,
        created: req.tenant.created_at,
        subdomain: req.tenant.subdomain
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant statistics'
    });
  }
});

// List all tenants (admin only - without tenant middleware)
router.get('/list', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    const tenants = await Tenant.findAll('mysql', {
      where: { status },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const totalCount = await Tenant.getActiveTenantsCount('mysql');

    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list tenants'
    });
  }
});

// Suspend tenant
router.post('/:tenantId/suspend', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    const tenant = await Tenant.findById(tenantId, 'mysql');
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenantInstance = new Tenant(tenant);
    await tenantInstance.update({
      status: 'suspended',
      settings: {
        ...tenant.settings,
        suspension_reason: reason,
        suspended_at: new Date()
      }
    }, 'mysql');

    res.json({
      success: true,
      message: 'Tenant suspended successfully'
    });
  } catch (error) {
    console.error('Suspend tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend tenant'
    });
  }
});

// Reactivate tenant
router.post('/:tenantId/activate', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findById(tenantId, 'mysql');
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenantInstance = new Tenant(tenant);
    const updatedSettings = { ...tenant.settings };
    delete updatedSettings.suspension_reason;
    delete updatedSettings.suspended_at;

    await tenantInstance.update({
      status: 'active',
      settings: updatedSettings
    }, 'mysql');

    res.json({
      success: true,
      message: 'Tenant reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate tenant'
    });
  }
});

module.exports = router;