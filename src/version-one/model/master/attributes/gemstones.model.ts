import { DATE, INTEGER, STRING } from "sequelize";
import dbContext from "../../../../config/db-context";
import { Image } from "../../image.model";
import { ProductDiamondOption } from "../../product-diamond-option.model";

export const StoneData = dbContext.define("gemstones", {
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
  sort_code: {
    type: STRING,
  },
  id_image: {
    type: INTEGER,
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
    type: INTEGER,
  },
  gemstone_type: {
    type: INTEGER,
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
StoneData.hasOne(Image, {
  as: "stone_image",
  foreignKey: "id",
  sourceKey: "id_image",
});
StoneData.hasMany(ProductDiamondOption, {
  foreignKey: "id_stone",
  as: "PDO",
});
