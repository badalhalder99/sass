const { DataTypes } = require('sequelize');
const { ObjectId } = require('mongodb');
const { getMySQLInstance, getMongoDb } = require('../config/database');

class Tenant {
  constructor(tenantData) {
    this.id = tenantData.id;
    this.name = tenantData.name;
    this.subdomain = tenantData.subdomain;
    this.database_name = tenantData.database_name;
    this.status = tenantData.status || 'active';
    this.settings = tenantData.settings || {};
    this.created_at = tenantData.created_at || new Date();
    this.updated_at = tenantData.updated_at || new Date();
  }

  static initializeMySQL(sequelize) {
    if (sequelize.models.Tenant) {
      return sequelize.models.Tenant;
    }

    const TenantModel = sequelize.define('Tenant', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      subdomain: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      database_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      tableName: 'tenants',
      timestamps: true,
      underscored: true
    });

    return TenantModel;
  }

  static getMySQLModel(sequelize = null) {
    if (!sequelize) {
      throw new Error('Sequelize instance required for MySQL operations');
    }
    return sequelize.models.Tenant || this.initializeMySQL(sequelize);
  }

  static getMongoCollection(tenantId = null) {
    const db = getMongoDb(tenantId);
    return db.collection('tenants');
  }

  async save(dbType = 'both') {
    const results = {};

    if (dbType === 'both' || dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const TenantModel = this.constructor.initializeMySQL(sequelize);
      
      const mysqlTenant = await TenantModel.create({
        name: this.name,
        subdomain: this.subdomain,
        database_name: this.database_name,
        status: this.status,
        settings: this.settings
      });
      
      results.mysql = mysqlTenant;
      this.id = mysqlTenant.id;
    }

    if (dbType === 'both' || dbType === 'mongodb') {
      const collection = this.constructor.getMongoCollection();
      const mongoResult = await collection.insertOne({
        name: this.name,
        subdomain: this.subdomain,
        database_name: this.database_name,
        status: this.status,
        settings: this.settings,
        created_at: this.created_at,
        updated_at: this.updated_at
      });
      
      results.mongodb = mongoResult;
      if (!this.id) this._id = mongoResult.insertedId;
    }

    return results;
  }

  static async findBySubdomain(subdomain, dbType = 'mysql') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const TenantModel = this.initializeMySQL(sequelize);
      return await TenantModel.findOne({ where: { subdomain } });
    }

    if (dbType === 'mongodb') {
      const collection = this.getMongoCollection();
      return await collection.findOne({ subdomain });
    }
  }

  static async findById(id, dbType = 'mysql') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const TenantModel = this.initializeMySQL(sequelize);
      return await TenantModel.findByPk(id);
    }

    if (dbType === 'mongodb') {
      const collection = this.getMongoCollection();
      return await collection.findOne({ _id: new ObjectId(id) });
    }
  }

  static async findAll(dbType = 'mysql', options = {}) {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const TenantModel = this.initializeMySQL(sequelize);
      return await TenantModel.findAll(options);
    }

    if (dbType === 'mongodb') {
      const collection = this.getMongoCollection();
      const cursor = collection.find(options.where || {});
      
      if (options.limit) cursor.limit(options.limit);
      if (options.skip) cursor.skip(options.skip);
      if (options.sort) cursor.sort(options.sort);
      
      return await cursor.toArray();
    }
  }

  async update(updateData, dbType = 'both') {
    const results = {};
    
    Object.assign(this, updateData);
    this.updated_at = new Date();

    if (dbType === 'both' || dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const TenantModel = this.constructor.initializeMySQL(sequelize);
      
      const [updatedRowCount] = await TenantModel.update(updateData, {
        where: { id: this.id }
      });
      
      results.mysql = { updated: updatedRowCount > 0 };
    }

    if (dbType === 'both' || dbType === 'mongodb') {
      const collection = this.constructor.getMongoCollection();
      const mongoResult = await collection.updateOne(
        { _id: new ObjectId(this._id) },
        { $set: { ...updateData, updated_at: this.updated_at } }
      );
      
      results.mongodb = { updated: mongoResult.modifiedCount > 0 };
    }

    return results;
  }

  async delete(dbType = 'both') {
    const results = {};

    if (dbType === 'both' || dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const TenantModel = this.constructor.initializeMySQL(sequelize);
      
      const deletedRowCount = await TenantModel.destroy({
        where: { id: this.id }
      });
      
      results.mysql = { deleted: deletedRowCount > 0 };
    }

    if (dbType === 'both' || dbType === 'mongodb') {
      const collection = this.constructor.getMongoCollection();
      const mongoResult = await collection.deleteOne({ _id: new ObjectId(this._id) });
      
      results.mongodb = { deleted: mongoResult.deletedCount > 0 };
    }

    return results;
  }

  static async getActiveTenantsCount(dbType = 'mysql') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance();
      const TenantModel = this.initializeMySQL(sequelize);
      return await TenantModel.count({ where: { status: 'active' } });
    }

    if (dbType === 'mongodb') {
      const collection = this.getMongoCollection();
      return await collection.countDocuments({ status: 'active' });
    }
  }
}

module.exports = Tenant;