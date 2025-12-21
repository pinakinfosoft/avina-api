import { DATE, INTEGER, STRING, FLOAT } from "sequelize";
import dbContext from "../../../../../config/db-context";
import { ProductMetalOption } from "../../../product-metal-option.model";
import { MetalGroupMaster } from "./metal-group-master.model";

export const MetalMaster = dbContext.define("metal_masters", {
  id: {
    type: INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: STRING,
    allowNull: false,
  },
  slug: {
    type: STRING,
    allowNull: false,
  },
  is_active: {
    type: STRING,
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
  },
  modified_by: {
    type: INTEGER,
  },
  is_deleted: {
    type: STRING,
  },
  metal_rate: {
    type: FLOAT,
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
MetalMaster.hasMany(ProductMetalOption, {
  foreignKey: "id_metal",
  as: "PMO",
});
MetalMaster.hasMany(MetalGroupMaster, {
  foreignKey: "id_metal",
  as: "Metal_masters",
});