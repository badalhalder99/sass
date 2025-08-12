const { DataTypes } = require('sequelize');

module.exports = {
  mysql: {
    async up(sequelize, DataTypes) {
      await sequelize.getQueryInterface().createTable('users', {
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
        age: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        profession: {
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
          type: DataTypes.ENUM('admin', 'user', 'moderator'),
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

      await sequelize.getQueryInterface().addIndex('users', ['tenant_id']);
      await sequelize.getQueryInterface().addIndex('users', ['email']);
      await sequelize.getQueryInterface().addIndex('users', ['google_id']);
      await sequelize.getQueryInterface().addIndex('users', ['tenant_id', 'email'], { unique: true });
    },

    async down(sequelize) {
      await sequelize.getQueryInterface().dropTable('users');
    }
  },

  mongodb: {
    async up(db) {
      await db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['tenant_id', 'name', 'email'],
            properties: {
              tenant_id: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              name: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              email: {
                bsonType: 'string',
                description: 'must be a string and is required'
              },
              password: {
                bsonType: 'string',
                description: 'must be a string'
              },
              age: {
                bsonType: 'number',
                description: 'must be a number'
              },
              profession: {
                bsonType: 'string',
                description: 'must be a string'
              },
              summary: {
                bsonType: 'string',
                description: 'must be a string'
              },
              google_id: {
                bsonType: 'string',
                description: 'must be a string'
              },
              avatar: {
                bsonType: 'string',
                description: 'must be a string'
              },
              role: {
                enum: ['admin', 'user', 'moderator'],
                description: 'must be one of the enum values'
              },
              status: {
                enum: ['active', 'inactive', 'suspended'],
                description: 'must be one of the enum values'
              },
              email_verified: {
                bsonType: 'bool',
                description: 'must be a boolean'
              },
              last_login: {
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

      await db.collection('users').createIndex({ tenant_id: 1 });
      await db.collection('users').createIndex({ email: 1 });
      await db.collection('users').createIndex({ google_id: 1 });
      await db.collection('users').createIndex({ tenant_id: 1, email: 1 }, { unique: true });
    },

    async down(db) {
      await db.collection('users').drop();
    }
  }
};