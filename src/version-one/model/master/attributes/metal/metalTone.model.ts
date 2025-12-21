import { DATE, INTEGER, STRING } from "sequelize";
import dbContext from "../../../../../config/db-context";
import { Image } from "../../../image.model";
import { ProductMetalOption } from "../../../product-metal-option.model";
import { ProductImage } from "../../../product-image.model";

export const MetalTone = dbContext.define("metal_tones", {
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
  id_metal: {
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
MetalTone.hasOne(Image, {
  as: "metal_tone_image",
  foreignKey: "id",
  sourceKey: "id_image",
});
MetalTone.hasMany(ProductMetalOption, {
  foreignKey: "id_m_tone",
  as: "PMO",
});
MetalTone.hasMany(ProductImage, {
  foreignKey: "id_metal_tone",
  as: "product_images",
});
