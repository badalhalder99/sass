const { ObjectId } = require('mongodb');
const { DataTypes } = require('sequelize');
const { getMongoDb, getMySQLInstance } = require('../config/database');

class Subscription {
  constructor(subscriptionData) {
    this.id = subscriptionData.id;
    this.tenant_id = subscriptionData.tenant_id;
    this.plan_name = subscriptionData.plan_name;
    this.plan_type = subscriptionData.plan_type;
    this.status = subscriptionData.status || 'active';
    this.billing_cycle = subscriptionData.billing_cycle || 'monthly';
    this.price = subscriptionData.price || 0.00;
    this.currency = subscriptionData.currency || 'USD';
    this.max_users = subscriptionData.max_users;
    this.max_storage = subscriptionData.max_storage;
    this.features = subscriptionData.features || {};
    this.trial_ends_at = subscriptionData.trial_ends_at;
    this.current_period_start = subscriptionData.current_period_start || new Date();
    this.current_period_end = subscriptionData.current_period_end;
    this.cancelled_at = subscriptionData.cancelled_at;
    this.created_at = subscriptionData.created_at || new Date();
    this.updated_at = subscriptionData.updated_at || new Date();
  }

  static initializeMySQL(sequelize) {
    if (sequelize.models.Subscription) {
      return sequelize.models.Subscription;
    }
    const SubscriptionModel = sequelize.define('Subscription', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      plan_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      plan_type: {
        type: DataTypes.ENUM('free', 'basic', 'premium', 'enterprise'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('active', 'cancelled', 'expired', 'suspended'),
        defaultValue: 'active'
      },
      billing_cycle: {
        type: DataTypes.ENUM('monthly', 'yearly'),
        defaultValue: 'monthly'
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD'
      },
      max_users: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      max_storage: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      features: {
        type: DataTypes.JSON,
        allowNull: true
      },
      trial_ends_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      current_period_start: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      current_period_end: {
        type: DataTypes.DATE,
        allowNull: false
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'subscriptions',
      timestamps: true,
      underscored: true
    });

    return SubscriptionModel;
  }

  static getMySQLModel(sequelize = null) {
    if (!sequelize) {
      throw new Error('Sequelize instance required for MySQL operations');
    }
    return sequelize.models.Subscription || this.initializeMySQL(sequelize);
  }

  static getMongoCollection(tenantId = null) {
    const db = getMongoDb(tenantId);
    return db.collection('subscriptions');
  }

  async save(dbType = 'both', tenantId = null) {
    const results = {};

    if (dbType === 'both' || dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const SubscriptionModel = this.constructor.initializeMySQL(sequelize);
      
      const mysqlSubscription = await SubscriptionModel.create({
        tenant_id: this.tenant_id,
        plan_name: this.plan_name,
        plan_type: this.plan_type,
        status: this.status,
        billing_cycle: this.billing_cycle,
        price: this.price,
        currency: this.currency,
        max_users: this.max_users,
        max_storage: this.max_storage,
        features: this.features,
        trial_ends_at: this.trial_ends_at,
        current_period_start: this.current_period_start,
        current_period_end: this.current_period_end,
        cancelled_at: this.cancelled_at
      });
      
      results.mysql = mysqlSubscription;
      this.id = mysqlSubscription.id;
    }

    if (dbType === 'both' || dbType === 'mongodb') {
      const collection = this.constructor.getMongoCollection(tenantId);
      const mongoResult = await collection.insertOne({
        tenant_id: this.tenant_id,
        plan_name: this.plan_name,
        plan_type: this.plan_type,
        status: this.status,
        billing_cycle: this.billing_cycle,
        price: this.price,
        currency: this.currency,
        max_users: this.max_users,
        max_storage: this.max_storage,
        features: this.features,
        trial_ends_at: this.trial_ends_at,
        current_period_start: this.current_period_start,
        current_period_end: this.current_period_end,
        cancelled_at: this.cancelled_at,
        created_at: this.created_at,
        updated_at: this.updated_at
      });
      
      results.mongodb = mongoResult;
      if (!this.id) this._id = mongoResult.insertedId;
    }

    return results;
  }

  static async findByTenantId(tenantId, dbType = 'mysql') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const SubscriptionModel = this.initializeMySQL(sequelize);
      return await SubscriptionModel.findOne({ 
        where: { tenant_id: tenantId },
        order: [['created_at', 'DESC']]
      });
    }

    const collection = this.getMongoCollection();
    return await collection.findOne(
      { tenant_id: tenantId.toString() },
      { sort: { created_at: -1 } }
    );
  }

  static async findById(id, tenantId = null, dbType = 'mysql') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const SubscriptionModel = this.initializeMySQL(sequelize);
      return await SubscriptionModel.findByPk(id);
    }

    const collection = this.getMongoCollection(tenantId);
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findAll(tenantId = null, dbType = 'mysql', options = {}) {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const SubscriptionModel = this.initializeMySQL(sequelize);
      const whereClause = { ...options.where };
      if (tenantId) whereClause.tenant_id = tenantId;
      
      return await SubscriptionModel.findAll({
        ...options,
        where: whereClause
      });
    }

    const collection = this.getMongoCollection(tenantId);
    const query = { ...options.where };
    if (tenantId) query.tenant_id = tenantId.toString();
    
    const cursor = collection.find(query);
    
    if (options.limit) cursor.limit(options.limit);
    if (options.skip) cursor.skip(options.skip);
    if (options.sort) cursor.sort(options.sort);
    
    return await cursor.toArray();
  }

  async update(updateData, dbType = 'both', tenantId = null) {
    const results = {};
    
    Object.assign(this, updateData);
    this.updated_at = new Date();

    if (dbType === 'both' || dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const SubscriptionModel = this.constructor.initializeMySQL(sequelize);
      
      const [updatedRowCount] = await SubscriptionModel.update(updateData, {
        where: { id: this.id }
      });
      
      results.mysql = { updated: updatedRowCount > 0 };
    }

    if (dbType === 'both' || dbType === 'mongodb') {
      const collection = this.constructor.getMongoCollection(tenantId);
      const mongoResult = await collection.updateOne(
        { _id: new ObjectId(this._id) },
        { $set: { ...updateData, updated_at: this.updated_at } }
      );
      
      results.mongodb = { updated: mongoResult.modifiedCount > 0 };
    }

    return results;
  }

  async cancel(dbType = 'both', tenantId = null) {
    const cancelData = {
      status: 'cancelled',
      cancelled_at: new Date()
    };
    
    return await this.update(cancelData, dbType, tenantId);
  }

  isActive() {
    return this.status === 'active' && new Date() < new Date(this.current_period_end);
  }

  isInTrial() {
    return this.trial_ends_at && new Date() < new Date(this.trial_ends_at);
  }

  hasFeature(featureName) {
    return this.features && this.features[featureName] === true;
  }

  static async getActiveSubscriptionsCount(dbType = 'mysql') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const SubscriptionModel = this.initializeMySQL(sequelize);
      return await SubscriptionModel.count({ where: { status: 'active' } });
    }

    const collection = this.getMongoCollection();
    return await collection.countDocuments({ status: 'active' });
  }

  static getDefaultPlans() {
    return {
      free: {
        plan_name: 'Free Plan',
        plan_type: 'free',
        price: 0.00,
        max_users: 5,
        max_storage: 1024 * 1024 * 1024, // 1GB
        features: {
          basic_dashboard: true,
          email_support: false,
          api_access: false,
          advanced_analytics: false,
          priority_support: false
        }
      },
      basic: {
        plan_name: 'Basic Plan',
        plan_type: 'basic',
        price: 29.99,
        max_users: 25,
        max_storage: 10 * 1024 * 1024 * 1024, // 10GB
        features: {
          basic_dashboard: true,
          email_support: true,
          api_access: true,
          advanced_analytics: false,
          priority_support: false
        }
      },
      premium: {
        plan_name: 'Premium Plan',
        plan_type: 'premium',
        price: 79.99,
        max_users: 100,
        max_storage: 50 * 1024 * 1024 * 1024, // 50GB
        features: {
          basic_dashboard: true,
          email_support: true,
          api_access: true,
          advanced_analytics: true,
          priority_support: true
        }
      },
      enterprise: {
        plan_name: 'Enterprise Plan',
        plan_type: 'enterprise',
        price: 199.99,
        max_users: -1, // unlimited
        max_storage: -1, // unlimited
        features: {
          basic_dashboard: true,
          email_support: true,
          api_access: true,
          advanced_analytics: true,
          priority_support: true,
          white_label: true,
          custom_integrations: true
        }
      }
    };
  }
}

module.exports = Subscription;