import { INTEGER, STRING, DATE } from "sequelize";
import dbContext from "../../../../config/db-context";
import { ProductMetalOption } from "../../product-metal-option.model";

export const LengthData = dbContext.define("items_lengths", {
  id: {
    type: INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  length: {
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
  }
});

// Associations
LengthData.hasMany(ProductMetalOption, {
  foreignKey: "id_length",
  as: "PMO",
});
