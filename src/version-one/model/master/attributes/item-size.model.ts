import { INTEGER, STRING, DATE } from "sequelize";
import dbContext from "../../../../config/db-context";
import { ProductMetalOption } from "../../product-metal-option.model";
import { ProductWish } from "../../produc-wish-list.model";

export const SizeData = dbContext.define("items_sizes", {
  id: {
    type: INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  size: {
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
SizeData.hasMany(ProductMetalOption, {
  foreignKey: "id_size",
  as: "PMO",
});
SizeData.hasOne(ProductWish, {
  as: "size",
  foreignKey: "id",
  sourceKey: "id_size",
});
