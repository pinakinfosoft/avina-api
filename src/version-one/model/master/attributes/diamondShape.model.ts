import { DATE, INTEGER, JSON, STRING } from "sequelize";
import dbContext from "../../../../config/db-context";
import { Image } from "../../image.model";
import { ProductDiamondOption } from "../../product-diamond-option.model";
import { DiamondGroupMaster } from "./diamond-group-master.model";

export const DiamondShape = dbContext.define("diamond_shapes", {
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
  id_image: {
    type: INTEGER,
  },
  sort_code: {
    type: STRING,
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
  is_diamond: {
    type: JSON,
  },
  diamond_size_id: {
    type: JSON,
  },
  sort_order: {
    type: JSON,
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
DiamondShape.hasOne(Image, {
  as: "diamond_shape_image",
  foreignKey: "id",
  sourceKey: "id_image",
});
DiamondShape.hasMany(ProductDiamondOption, {
  foreignKey: "id_shape",
  as: "PDO",
});
DiamondShape.hasMany(DiamondGroupMaster, {
  foreignKey: "id_shape",
  as: "diamond_shapes",
});
