import { BOOLEAN, DATE, INTEGER, SMALLINT, STRING } from "sequelize";
import dbContext from "../../config/db-context";
import { Role } from "./role.model";
import { CartProducts } from "./cart-product.model";
import { CustomerUser } from "./customer-user.model";
import { BusinessUser } from "./business-user.model";

export const AppUser = dbContext.define("app_users", {
  id: {
    type: INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: STRING,
  },
  pass_hash: {
    type: STRING,
  },
  user_type: {
    type: SMALLINT,
  },
  user_status: {
    type: SMALLINT,
  },
  refresh_token: {
    type: STRING,
  },
  pass_reset_token: {
    type: STRING,
  },
  one_time_pass: {
    type: STRING,
  },
  resend_otp_count: {
    type: SMALLINT,
  },
  last_login_date: {
    type: DATE,
  },
  firebase_device_token: {
    type: STRING,
  },
  is_active: {
    type: STRING,
  },
  is_email_verified: {
    type: STRING,
  },
  is_deleted: {
    type: STRING,
  },
  approved_by: {
    type: INTEGER,
  },
  approved_date: {
    type: DATE,
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
  id_role: {
    type: INTEGER,
  },
  otp_create_date: {
    type: DATE,
  },
  otp_expire_date: {
    type: DATE,
  },
  is_super_admin: {
    type: BOOLEAN,
  }
});

// Associations
AppUser.belongsTo(Role, { foreignKey: "id_role", as: "role" });
AppUser.hasMany(CartProducts, { foreignKey: "user_id", as: "users_details" });
AppUser.hasOne(CustomerUser, { foreignKey: "id_app_user", as: "customer_user" });
AppUser.hasOne(BusinessUser, { foreignKey: "id_app_user", as: "business_users" });
