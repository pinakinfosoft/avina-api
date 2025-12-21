import { DATE, INTEGER, JSON, STRING } from "sequelize";
import dbContext from "../../../../config/db-context";
import { Image } from "../../image.model";

export const SideSettingStyles = dbContext.define("side_setting_styles", {
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
  id_shank: {
    type: STRING,
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
  },
  diamond_shape_id: {
    type: JSON,
  },
  diamond_size_id: {
    type: JSON,
  },
  config_image: {
    type: JSON
  }
});

// Associations
SideSettingStyles.hasOne(Image, {
  as: "side_setting_image",
  foreignKey: "id",
  sourceKey: "id_image",
});
