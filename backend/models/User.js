const { ObjectId } = require('mongodb');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { getMongoDb, getMySQLInstance } = require('../config/database');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.tenant_id = userData.tenant_id;
    this.name = userData.name;
    this.email = userData.email;
    this.password = userData.password;
    this.storeName = userData.storeName;
    this.domainName = userData.domainName;
    this.summary = userData.summary;
    this.google_id = userData.google_id || userData.googleId;
    this.avatar = userData.avatar;
    this.role = userData.role || 'user';
    this.status = userData.status || 'active';
    this.email_verified = userData.email_verified || false;
    this.last_login = userData.last_login;
    this.created_at = userData.created_at || userData.createdAt || new Date();
    this.updated_at = userData.updated_at || new Date();
  }

  static initializeMySQL(sequelize) {
    if (sequelize.models.User) {
      return sequelize.models.User;
    }
    const UserModel = sequelize.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true
      },
      storeName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      domainName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      google_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true
      },
      role: {
        type: DataTypes.ENUM('admin', 'user', 'moderator', 'tenant'),
        defaultValue: 'user'
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'users',
      timestamps: true,
      underscored: true
    });

    return UserModel;
  }

  static getMySQLModel(sequelize = null) {
    if (!sequelize) {
      throw new Error('Sequelize instance required for MySQL operations');
    }
    return sequelize.models.User || this.initializeMySQL(sequelize);
  }

  static getMongoCollection(tenantId = null) {
    // For tenant ID 1 or no tenant, use the main database for frontend compatibility
    if (!tenantId || tenantId === 1) {
      const db = getMongoDb(); // Main database
      return db.collection('users');
    }
    const db = getMongoDb(tenantId);
    return db.collection('users');
  }

  static getCollection(tenantId = null) {
    return this.getMongoCollection(tenantId);
  }

  async save(dbType = 'both', tenantId = null) {
    const results = {};

    if (dbType === 'both' || dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.constructor.initializeMySQL(sequelize);
      
      const mysqlUser = await UserModel.create({
        tenant_id: this.tenant_id,
        name: this.name,
        email: this.email,
        password: this.password,
        storeName: this.storeName,
        domainName: this.domainName,
        summary: this.summary,
        google_id: this.google_id,
        avatar: this.avatar,
        role: this.role,
        status: this.status,
        email_verified: this.email_verified,
        last_login: this.last_login
      });
      
      results.mysql = mysqlUser;
      this.id = mysqlUser.id;
    }

    if (dbType === 'both' || dbType === 'mongodb') {
      const collection = this.constructor.getMongoCollection(tenantId);
      const docToInsert = {
        tenant_id: this.tenant_id,
        name: this.name,
        email: this.email,
        password: this.password,
        storeName: this.storeName,
        domainName: this.domainName,
        summary: this.summary,
        google_id: this.google_id,
        avatar: this.avatar,
        role: this.role,
        status: this.status,
        email_verified: this.email_verified,
        last_login: this.last_login,
        created_at: this.created_at,
        updated_at: this.updated_at
      };
      console.log('Inserting document to MongoDB:', JSON.stringify(docToInsert));
      console.log('Collection namespace:', collection.namespace);
      
      const mongoResult = await collection.insertOne(docToInsert);
      
      results.mongodb = mongoResult;
      if (!this.id) this._id = mongoResult.insertedId;
    }

    return results;
  }

  static async findById(id, tenantId = null, dbType = 'mongodb') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.initializeMySQL(sequelize);
      return await UserModel.findByPk(id);
    }

    const collection = this.getMongoCollection(tenantId);
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findByEmail(email, tenantId = null, dbType = 'mongodb') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.initializeMySQL(sequelize);
      const whereClause = { email };
      if (tenantId) whereClause.tenant_id = tenantId;
      return await UserModel.findOne({ where: whereClause });
    }

    // For authentication, always use main database
    const collection = this.getMongoCollection(); // Main database without tenant
    const query = { email };
    if (tenantId) query.tenant_id = tenantId.toString();
    return await collection.findOne(query);
  }

  static async findByGoogleId(googleId, tenantId = null, dbType = 'mongodb') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.initializeMySQL(sequelize);
      const whereClause = { google_id: googleId };
      if (tenantId) whereClause.tenant_id = tenantId;
      return await UserModel.findOne({ where: whereClause });
    }

    // For authentication, always use main database
    const collection = this.getMongoCollection(); // Main database without tenant
    const query = { google_id: googleId };
    if (tenantId) query.tenant_id = tenantId.toString();
    return await collection.findOne(query);
  }

  static async findAll(tenantId = null, dbType = 'mongodb', options = {}) {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.initializeMySQL(sequelize);
      const whereClause = { ...options.where };
      if (tenantId) whereClause.tenant_id = tenantId;
      
      return await UserModel.findAll({
        ...options,
        where: whereClause
      });
    }

    console.log('Getting MongoDB collection for tenant ID:', tenantId);
    const collection = this.getMongoCollection(tenantId);
    console.log('Collection namespace:', collection.namespace);
    const query = { ...options.where };
    if (tenantId) query.tenant_id = tenantId; // Keep as number for consistency
    console.log('Query:', query);
    
    const cursor = collection.find(query);
    
    if (options.limit) cursor.limit(options.limit);
    if (options.skip) cursor.skip(options.skip);
    if (options.sort) cursor.sort(options.sort);
    
    const results = await cursor.toArray();
    console.log('Found documents:', results.length);
    return results;
  }

  static async updateById(id, updateData, tenantId = null, dbType = 'mongodb') {
    updateData.updated_at = new Date();
    
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.initializeMySQL(sequelize);
      const whereClause = { id };
      if (tenantId) whereClause.tenant_id = tenantId;
      
      const [updatedRowCount] = await UserModel.update(updateData, {
        where: whereClause
      });
      
      return { modifiedCount: updatedRowCount };
    }

    const collection = this.getMongoCollection(tenantId);
    const query = { _id: new ObjectId(id) };
    if (tenantId) query.tenant_id = tenantId.toString();
    
    const result = await collection.updateOne(
      query,
      { $set: updateData }
    );
    return result;
  }

  static async deleteById(id, tenantId = null, dbType = 'mongodb') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.initializeMySQL(sequelize);
      const whereClause = { id };
      if (tenantId) whereClause.tenant_id = tenantId;
      
      const deletedRowCount = await UserModel.destroy({
        where: whereClause
      });
      
      return { deletedCount: deletedRowCount };
    }

    const collection = this.getMongoCollection(tenantId);
    const query = { _id: new ObjectId(id) };
    if (tenantId) query.tenant_id = tenantId.toString();
    
    const result = await collection.deleteOne(query);
    return result;
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async getUsersCount(tenantId = null, dbType = 'mongodb') {
    if (dbType === 'mysql') {
      const sequelize = await getMySQLInstance(tenantId);
      const UserModel = this.initializeMySQL(sequelize);
      const whereClause = {};
      if (tenantId) whereClause.tenant_id = tenantId;
      
      return await UserModel.count({ where: whereClause });
    }

    const collection = this.getMongoCollection(tenantId);
    const query = {};
    if (tenantId) query.tenant_id = tenantId.toString();
    
    return await collection.countDocuments(query);
  }

  async updateLastLogin(tenantId = null, dbType = 'mongodb') {
    const updateData = { last_login: new Date() };
    
    if (this.id) {
      return await this.constructor.updateById(this.id, updateData, tenantId, dbType);
    } else if (this._id) {
      return await this.constructor.updateById(this._id, updateData, tenantId, dbType);
    }
  }
}

module.exports = User;