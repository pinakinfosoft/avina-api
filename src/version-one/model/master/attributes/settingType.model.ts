import { DATE, INTEGER, STRING } from "sequelize";
import dbContext from "../../../../config/db-context";
import { Image } from "../../image.model";
import { ProductDiamondOption } from "../../product-diamond-option.model";

export const SettingTypeData = dbContext.define("setting_styles", {
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
  }
});

// Associations
SettingTypeData.hasOne(Image, {
  as: "setting_type_image",
  foreignKey: "id",
  sourceKey: "id_image",
});
SettingTypeData.hasMany(ProductDiamondOption, {
  foreignKey: "id_setting",
  as: "PDO",
});
