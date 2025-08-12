const { DataTypes } = require('sequelize');

module.exports = {
  mysql: {
    async up(sequelize, DataTypes) {
      await sequelize.getQueryInterface().createTable('tenants', {
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
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });

      await sequelize.getQueryInterface().addIndex('tenants', ['subdomain']);
      await sequelize.getQueryInterface().addIndex('tenants', ['status']);
    },

    async down(sequelize) {
      await sequelize.getQueryInterface().dropTable('tenants');
    }
  },

  mongodb: {
    async up(db) {
      await db.createCollection('tenants', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'subdomain', 'database_name'],
            properties: {
              name: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              subdomain: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              database_name: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              status: {
                enum: ['active', 'inactive', 'suspended'],
                description: 'must be one of the enum values'
              },
              settings: {
                bsonType: 'object',
                description: 'must be an object'
              },
              created_at: {
                bsonType: 'date',
                description: 'must be a date'
              },
              updated_at: {
                bsonType: 'date',
                description: 'must be a date'
              }
            }
          }
        }
      });

      await db.collection('tenants').createIndex({ subdomain: 1 }, { unique: true });
      await db.collection('tenants').createIndex({ status: 1 });
    },

    async down(db) {
      await db.collection('tenants').drop();
    }
  }
};