import { DATE, INTEGER, JSON, STRING } from "sequelize";
import dbContext from "../../../../config/db-context";
import { Image } from "../../image.model";

export const HookTypeData = dbContext.define("hook_types", {
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
  sort_code: {
    type: STRING,
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
HookTypeData.hasOne(Image, {
  as: "hook_type_image",
  foreignKey: "id",
  sourceKey: "id_image",
});
