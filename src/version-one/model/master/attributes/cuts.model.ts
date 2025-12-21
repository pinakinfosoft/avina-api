import { INTEGER, STRING, DATE } from "sequelize";
import dbContext from "../../../../config/db-context";
import { ProductDiamondOption } from "../../product-diamond-option.model";

export const CutsData = dbContext.define("cuts", {
  id: {
    type: INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  value: {
    type: STRING,
    allowNull: false,
  },
  slug: {
    type: STRING,
    allowNull: false,
  },
  is_active: {
    type: STRING,
    allowNull: false,
  },
  created_date: {
    type: DATE,
    allowNull: false,
  },
  modified_date: {
    type: DATE,
  },
  created_by: {
    type: INTEGER,
    allowNull: false,
  },
  modified_by: {
    type: INTEGER,
  },
  is_deleted: {
    type: STRING,
  },
  is_config: {
    type: STRING,
  },
  is_band: {
    type: STRING,
  },
  is_three_stone: {
    type: STRING,
  },
  is_bracelet: {
    type: STRING,
  },
  is_pendant: {
    type: STRING,
  },
  is_earring: {
    type: STRING,
  }
});

// Associations
CutsData.hasMany(ProductDiamondOption, {
  foreignKey: "id_cut",
  as: "PDO",
});
