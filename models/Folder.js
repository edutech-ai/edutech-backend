const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Folder = sequelize.define('Folder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  teacher_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  color: {
    type: DataTypes.ENUM('blue', 'green', 'yellow', 'orange', 'purple', 'red'),
    defaultValue: 'blue',
    allowNull: false
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Folders',
      key: 'id'
    }
  },
  depth: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 3
    }
  },
  item_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'folders',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['teacher_id'] },
    { fields: ['parent_id'] },
    { fields: ['teacher_id', 'parent_id'] }
  ]
});

// Self-referencing associations
Folder.hasMany(Folder, { as: 'children', foreignKey: 'parent_id' });
Folder.belongsTo(Folder, { as: 'parent', foreignKey: 'parent_id' });

module.exports = Folder;
