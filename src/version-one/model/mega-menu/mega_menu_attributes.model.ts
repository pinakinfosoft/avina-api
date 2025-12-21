import { DATE, DOUBLE, INTEGER, STRING } from "sequelize";
import dbContext from "../../../config/db-context";
import { Image } from "../image.model";
import { CategoryData } from "../category.model";
import { Collection } from "../master/attributes/collection.model";
import { SettingTypeData } from "../master/attributes/settingType.model";
import { DiamondShape } from "../master/attributes/diamondShape.model";
import { BrandData } from "../master/attributes/brands.model";
import { MetalMaster } from "../master/attributes/metal/metal-master.model";
import { MetalTone } from "../master/attributes/metal/metalTone.model";
import { StaticPageData } from "../static_page.model";
import { MegaMenus } from "./mega_menu.model";
import { PageData } from "../pages.model";

export const MegaMenuAttributes = dbContext.define("mega_menu_attributes", {
  id: {
    type: INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: STRING,
  },
  sort_order: {
    type: INTEGER,
  },
  url: {
    type: 'character varying',
  },
  menu_type: {
    type: STRING,
  },
  target_type: {
    type: STRING,
  },
  id_image: {
    type: INTEGER,
  },
  id_parent: {
    type: INTEGER,
  },
  id_category: {
    type: INTEGER,
  },
  id_collection: {
    type: INTEGER,
  },
  id_brand: {
    type: INTEGER,
  },
  id_setting_type: {
    type: INTEGER,
  },
  id_diamond_shape: {
    type: INTEGER,
  },
  id_gender: {
    type: INTEGER,
  },
  id_metal_tone: {
    type: INTEGER,
  },
  id_metal: {
    type: INTEGER,
  },
  id_page: {
    type: INTEGER,
  },
  is_active: {
    type: STRING,
  },
  is_deleted: {
    type: STRING,
  },
  created_by: {
    type: INTEGER,
  },
  created_date: {
    type: DATE,
  },
  modified_by: {
    type: INTEGER,
  },
  modified_date: {
    type: DATE,
  },
  id_menu: {
    type: INTEGER
  },
  id_static_page: {
    type: INTEGER
  }
});

// Associations
MegaMenuAttributes.belongsTo(MegaMenus, {
  foreignKey: "id_menu",
  as: "mega_menu",
});
MegaMenuAttributes.hasOne(Image, { as: "image", foreignKey: "id", sourceKey: "id_image" });
MegaMenuAttributes.hasOne(CategoryData, { as: "category", foreignKey: "id", sourceKey: "id_category" });
MegaMenuAttributes.hasOne(Collection, { as: "collection", foreignKey: "id", sourceKey: "id_collection" });
MegaMenuAttributes.hasOne(SettingTypeData, { as: "setting_type", foreignKey: "id", sourceKey: "id_setting_type" });
MegaMenuAttributes.hasOne(DiamondShape, { as: "diamond_shape", foreignKey: "id", sourceKey: "id_diamond_shape" });
MegaMenuAttributes.hasOne(BrandData, { as: "brand", foreignKey: "id", sourceKey: "id_brand" });
MegaMenuAttributes.hasOne(MetalMaster, { as: "metal", foreignKey: "id", sourceKey: "id_metal" });
MegaMenuAttributes.hasOne(MetalTone, { as: "metal_tone", foreignKey: "id", sourceKey: "id_metal_tone" });
MegaMenuAttributes.hasOne(StaticPageData, { as: "static_page", foreignKey: "id", sourceKey: "id_static_page" });
MegaMenuAttributes.hasOne(PageData, { as: "page", foreignKey: "id", sourceKey: "id_page" });
