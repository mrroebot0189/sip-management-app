import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DepartmentAttributes {
  id: string;
  name: string;
  chief?: string;
  director?: string;
  projectManager?: string;
  contactEmail?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DepartmentCreationAttributes extends Optional<DepartmentAttributes, 'id' | 'chief' | 'director' | 'projectManager' | 'contactEmail'> {}

class Department extends Model<DepartmentAttributes, DepartmentCreationAttributes> implements DepartmentAttributes {
  public id!: string;
  public name!: string;
  public chief?: string;
  public director?: string;
  public projectManager?: string;
  public contactEmail?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Department.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true, len: [1, 150] },
    },
    chief: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    director: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    projectManager: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isEmail: true },
    },
  },
  {
    sequelize,
    tableName: 'Departments',
  }
);

export default Department;
