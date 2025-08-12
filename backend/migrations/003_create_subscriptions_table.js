const { DataTypes } = require('sequelize');

module.exports = {
  mysql: {
    async up(sequelize, DataTypes) {
      await sequelize.getQueryInterface().createTable('subscriptions', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        tenant_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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

      await sequelize.getQueryInterface().addIndex('subscriptions', ['tenant_id']);
      await sequelize.getQueryInterface().addIndex('subscriptions', ['status']);
      await sequelize.getQueryInterface().addIndex('subscriptions', ['plan_type']);
    },

    async down(sequelize) {
      await sequelize.getQueryInterface().dropTable('subscriptions');
    }
  },

  mongodb: {
    async up(db) {
      await db.createCollection('subscriptions', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['tenant_id', 'plan_name', 'plan_type', 'price', 'current_period_start', 'current_period_end'],
            properties: {
              tenant_id: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              plan_name: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              plan_type: {
                enum: ['free', 'basic', 'premium', 'enterprise'],
                description: 'must be one of the enum values'
              },
              status: {
                enum: ['active', 'cancelled', 'expired', 'suspended'],
                description: 'must be one of the enum values'
              },
              billing_cycle: {
                enum: ['monthly', 'yearly'],
                description: 'must be one of the enum values'
              },
              price: {
                bsonType: 'number',
                description: 'must be a number and is required'
              },
              currency: {
                bsonType: 'string',
                description: 'must be a string'
              },
              max_users: {
                bsonType: 'number',
                description: 'must be a number'
              },
              max_storage: {
                bsonType: 'number',
                description: 'must be a number'
              },
              features: {
                bsonType: 'object',
                description: 'must be an object'
              },
              trial_ends_at: {
                bsonType: 'date',
                description: 'must be a date'
              },
              current_period_start: {
                bsonType: 'date',
                description: 'must be a date and is required'
              },
              current_period_end: {
                bsonType: 'date',
                description: 'must be a date and is required'
              },
              cancelled_at: {
                bsonType: 'date',
                description: 'must be a date'
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

      await db.collection('subscriptions').createIndex({ tenant_id: 1 });
      await db.collection('subscriptions').createIndex({ status: 1 });
      await db.collection('subscriptions').createIndex({ plan_type: 1 });
    },

    async down(db) {
      await db.collection('subscriptions').drop();
    }
  }
};