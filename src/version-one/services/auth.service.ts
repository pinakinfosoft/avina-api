import { Request } from "express";
import {
  createResetToken,
  createUserJWT,
  verifyJWT,
} from "../../helpers/jwt.helper";
import {
  CUSTOMER_USER_ROLE_ID,
  JWT_EXPIRED_ERROR_NAME,
  OTP_EXPIRATION_TIME,
  PASSWORD_SOLT
} from "../../utils/app-constants";
import {
  DEFAULT_STATUS_CODE_SUCCESS,
  FORBIDDEN_CODE,
  INVALID_USERNAME_PASSWORD,
  UNAUTHORIZED_ACCESS_CODE,
  ACCOUNT_NOT_ACTIVE,
  USER_NOT_FOUND,
  USER_NOT_FOUND_WITH_REFRESH_TOKEN,
  ACCOUNT_NOT_VERIFIED,
  ACCOUNT_IS_BLOCKED,
  ACCOUNT_NOT_APPROVED,
  PASSWORD_IS_WRONG,
  INVALID_TOKEN,
  INVALID_OTP,
  USER_EMAIL_ID_ALREADY_VERIFIED,
  NOT_VERIFIED,
  DATA_ALREADY_EXIST,
  RESOURCE_EXPIRED_STATUS_CODE,
  OTP_EXPIRATION_MESSAGE,
  SIGN_IN_TYPE_WRONG_ERROR_MESSAGE,
  RESET_PASSWORD_TYPE_WRONG_ERROR_MESSAGE,
  USER_ROLE_INACTIVE_ERROR_MESSAGE,
  ROLE_NOT_FOUND,
  FILE_NOT_FOUND,
  INVALID_HEADER,
  REQUIRED_ERROR_MESSAGE,
  ERROR_NOT_FOUND,
  RECORD_DELETE_SUCCESSFULLY,
  MENU_NOT_ASSOCIATED_TO_PERMISSIONS,
  RECORD_UPDATE_SUCCESSFULLY,
  EMAIL_ALREADY_EXIST_IN_ADMIN,
  USER_DISABLED_ERROR_MESSAGE,
} from "../../utils/app-messages";
import {
  addActivityLogs,
  columnValueLowerCase,
  getCompanyIdBasedOnTheCompanyKey,
  getEnumValue,
  getInitialPaginationFromQuery,
  getLocalDate,
  getPriceFormat,
  getWebSettingData,
  LoginWithCadcoPanelUsingAPI,
  prepareMessageFromParams,
  resBadRequest,
  resError,
  resErrorDataExit,
  resNotFound,
  resSuccess,
  resUnauthorizedAccess,
  resUnknownError,
  resUnprocessableEntity,
  sendMessageInWhatsApp,
  statusUpdateValue,
} from "../../utils/shared-functions";
import bcrypt from "bcrypt";
import {
  ActiveStatus,
  AllProductTypes,
  DeletedStatus,
  FILE_BULK_UPLOAD_TYPE,
  FILE_STATUS,
  HTTP_METHODS,
  IMAGE_TYPE,
  LogsActivityType,
  LogsType,
  SIGN_UP_TYPE,
  USER_STATUS,
  USER_TYPE,
} from "../../utils/app-enumeration";
import {
  PRODUCT_CSV_FOLDER_PATH,
  SEND_OTP_IN_WHATSAPP,
} from "../../config/env.var";
import {
  mailPasswordResetLink,
  mailRegistrationOtp,
  successRegistration,
} from "./mail.service";
import { moveFileToLocation, moveFileToS3ByType } from "../../helpers/file.helper";
import { TResponseReturn } from "../../data/interfaces/common/common.interface";
const readXlsxFile = require("read-excel-file/node");
import { col, fn, Op, QueryTypes, Sequelize, where } from "sequelize";
import { SystemConfiguration } from "../model/system-configuration.model";
import { MenuItem } from "../model/menu-items.model";
import { RoleApiPermission } from "../model/role-api-permission.model";
import { Action } from "../model/action.model";
import { ProductBulkUploadFile } from "../model/product-bulk-upload-file.model";
import { AppUser } from "../model/app-user.model";
import { CompanyInfo } from "../model/companyinfo.model";
import { Role } from "../model/role.model";
import { BusinessUser } from "../model/business-user.model";
import { CustomerUser } from "../model/customer-user.model";
import { Image } from "../model/image.model";
import dbContext from "../../config/db-context";
import axios from "axios";

export const test = async (req: any) => {
  try {

    // let category = "0";
    // let filterCategory = "0";
    // if (!req.query.setting_type && req.query.setting_type == undefined) {
    //   req.query.setting_type = "0";
    // }

    // if (!req.query.gender && req.query.gender == undefined) {
    //   req.query.gender = "0";
    // }

    // if (!req.query.collection && req.query.collection == undefined) {
    //   req.query.collection = "0";
    // }

    // if (!req.query.metal_id && req.query.metal_id == undefined) {
    //   req.query.metal_id = "0";
    // }

    // if (!req.query.metal_tone && req.query.metal_tone == undefined) {
    //   req.query.metal_tone = "0";
    // }

    // if (!req.query.diamond_shape && req.query.diamond_shape == undefined) {
    //   req.query.diamond_shape = "0";
    // }
    // if (!req.query.brand && req.query.brand == undefined) {
    //   req.query.brand = "0";
    // }
    // if (
    //   !req.query.product_category &&
    //   req.query.product_category == undefined
    // ) {
    //   req.query.product_category = "0";
    // }

    // if (!req.query.search_text && req.query.search_text == undefined) {
    //   req.query.search_text = "0";
    // }
    // if (
    //   req.query.product_category &&
    //   req.query.product_category != undefined &&
    //   req.query.product_category != "0"
    // ) {
    //   let categoryName: any = req.query.product_category;
    //   filterCategory = categoryName
    //     .toString()
    //     .toLowerCase()
    //     .split(",")
    //     .map((item: any) => `'${item}'`)
    //     .join(",");
    // }

    // if (
    //   !req.query.min_price &&
    //   !req.query.max_price &&
    //   req.query.min_price == undefined &&
    //   req.query.max_price == undefined
    // ) {
    //   req.query.min_price = "0";
    //   req.query.max_price = "0";
    // }

    // if (
    //   !req.query.min_price &&
    //   req.query.min_price == undefined &&
    //   req.query.max_price &&
    //   req.query.max_price != undefined
    // ) {
    //   req.query.min_price = "0";
    // }
    // if (
    //   req.query.min_price &&
    //   req.query.min_price !== undefined &&
    //   !req.query.max_price &&
    //   req.query.max_price === undefined
    // ) {
    //   req.query.max_price = "0";
    // }
    // req.query.is_choose_setting =
    //   req.query.is_choose_setting === "1" ? "1" : "0";

    // if (req.query.collection != "0") {
    //   const findCollection = await Collection.findOne({
    //     where: {
    //       slug: { [Op.iLike]: `%${req.query.collection}%` },
    //       is_deleted: DeletedStatus.No,
    //     },
    //   });
    //   if (findCollection && findCollection.dataValues) {
    //     req.query.collection = findCollection.dataValues.id;
    //   }
    // }
    // if (req.query.brand != "0") {
    //   const findBrand = await BrandData.findOne({
    //     where: {
    //       slug: { [Op.iLike]: `%${req.query.brand}%` },
    //       is_deleted: DeletedStatus.No,
    //     },
    //   });
    //   if (findBrand && findBrand.dataValues) {
    //     req.query.brand = findBrand.dataValues.id;
    //   }
    // }
    // if (req.query.product_category == "0" && req.query.search_text == "0") {
    //   category = "watch";
    // }

    // let products = await .query(
    //   `SELECT * FROM product_list_view
    //   WHERE  CASE
    //     		WHEN '${req.query.setting_type}' = '0' THEN TRUE
    //     		ELSE string_to_array(setting_style_type, '|')::int[] && ARRAY[${
    //           req.query.setting_type
    //         }]
    //     	END
    //       AND CASE WHEN '${
    //         req.query.gender
    //       }' = '0' THEN true ELSE string_to_array(gender, '|')::int[] && ARRAY[${
    //     req.query.gender
    //   }] END
    //       AND CASE
    //     		WHEN '${req.query.collection}' = '0' THEN TRUE
    //     		ELSE string_to_array(id_collection, '|')::int[] && ARRAY[${
    //           req.query.collection
    //         }] END
    //       AND CASE WHEN '${
    //         req.query.brand
    //       }' = '0' THEN true ELSE id_brand IN (${req.query.brand}) END
    //       AND CASE
    //     		WHEN '${req.query.search_text}' = '0' THEN TRUE
    //     		ELSE name ILIKE '%${req.query.search_text}%' OR SLUG ILIKE '%${
    //     req.query.search_text
    //   }%' OR SKU ILIKE '%${req.query.search_text}%'
    //     	END
    //     AND CASE
    //     WHEN '${req.query.metal_id}' = '0' THEN TRUE
    //     ELSE EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(pmo) AS item
    //         WHERE item->>'id_metal' = ANY (string_to_array('${
    //           req.query.metal_id
    //         }', ','))
    //     )
    //     END
    //     AND  CASE WHEN '${
    //       req.query.metal_tone
    //     }' = '0' THEN true ELSE CASE WHEN product_type=${
    //     SingleProductType.DynemicPrice
    //   } OR product_type=${SingleProductType.cataLogueProduct} THEN EXISTS (
    //        SELECT 1
    //   FROM jsonb_array_elements(pmo) AS item
    //   WHERE EXISTS (
    //   SELECT 1
    //   FROM jsonb_array_elements_text(item->'metal_tone') AS metal_tone
    //   WHERE CAST(metal_tone.value as INTEGER) IN (${req.query.metal_tone})
    //   )
    //   ) ELSE EXISTS (
    //     SELECT 1
    //     FROM jsonb_array_elements(pmo) AS item
    //     WHERE (item->>'id_metal_tone')::int[] && ARRAY[${req.query.metal_tone}]
    //   ) END END
    //       AND CASE WHEN '${
    //         req.query.diamond_shape
    //       }' = '0' THEN true ELSE CASE WHEN '${
    //     req.query.is_choose_setting
    //   }' = '1' THEN EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(pdo) AS item
    //         WHERE CAST(item->>'id_shape' AS INTEGER) IN (${
    //           req.query.diamond_shape
    //         }) OR string_to_array(setting_diamond_shapes, '|')::int[] && ARRAY[${
    //     req.query.diamond_shape
    //   }]
    //       ) else EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(pdo) AS item
    //         WHERE CAST(item->>'id_shape' AS INTEGER) IN (${
    //           req.query.diamond_shape
    //         })
    //       ) END END
    //     AND CASE WHEN '${
    //       req.query.product_category
    //     }' = '0' THEN true ELSE EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(product_categories) AS category
    //         WHERE category->>'category_name' IN (${
    //           filterCategory == "0" ? `'${filterCategory}'` : filterCategory
    //         }) OR category->>'sub_category_name' IN (${
    //     filterCategory == "0" ? `'${filterCategory}'` : filterCategory
    //   }) OR category->>'sub_sub_category_name' IN (${
    //     filterCategory == "0" ? `'${filterCategory}'` : filterCategory
    //   })
    //       ) END
    //     AND CASE
    //       WHEN '${req.query.category}' = '0' THEN TRUE
    //       ELSE NOT EXISTS (
    //           SELECT 1
    //           FROM jsonb_array_elements(product_categories) AS category
    //           WHERE category->>'category_name' ILIKE '%watch%'
    //       )
    //   END
    //   AND CASE
    //     		WHEN '${req.query.min_price}' = '0' AND '${
    //     req.query.max_price
    //   }' = '0' THEN TRUE
    //         ELSE ExISTS (
    //             SELECT 1
    //             FROM jsonb_array_elements(pmo) AS item
    //             WHERE CAST(item->>'Price' AS INTEGER) ${
    //               req.query.min_price == "0" && req.query.max_price != "0"
    //                 ? `<= ${req.query.max_price}`
    //                 : req.query.min_price != "0" && req.query.max_price == "0"
    //                 ? `>= ${req.query.min_price}`
    //                 : `BETWEEN ${
    //                     req.query.min_price ? req.query.min_price : 0
    //                   } AND ${req.query.max_price}`
    //             }
    //         ) END
    //         ${
    //           req.query.sort_by === SORTING_OPTION.BestSeller
    //             ? `
    //               ORDER BY is_trending DESC, id DESC`
    //             : req.query.sort_by === SORTING_OPTION.Newest
    //             ? "ORDER BY created_date DESC"
    //             : req.query.sort_by === SORTING_OPTION.Oldest
    //             ? "ORDER BY created_date ASC"
    //             : req.query.sort_by === SORTING_OPTION.PriceLowToHigh
    //             ? "ORDER BY (SELECT MIN((item->>'Price')::numeric) FROM  jsonb_array_elements(pmo) AS item) ASC"
    //             : req.query.sort_by === SORTING_OPTION.PriceHighToLow
    //             ? "ORDER BY (SELECT MIN((item->>'Price')::numeric) FROM jsonb_array_elements(pmo) AS item) DESC"
    //             : "ORDER BY id DESC"
    //         }
    //   OFFSET
    //     0 ROWS
    //     FETCH NEXT 20 ROWS ONLY`,
    //   { type: QueryTypes.SELECT }
    // );
    // let productCount = await .query(
    //   `SELECT * FROM product_list_view
    //   WHERE  CASE
    //     		WHEN '${req.query.setting_type}' = '0' THEN TRUE
    //     		ELSE string_to_array(setting_style_type, '|')::int[] && ARRAY[${
    //           req.query.setting_type
    //         }]
    //     	END
    //       AND CASE WHEN '${
    //         req.query.gender
    //       }' = '0' THEN true ELSE string_to_array(gender, '|')::int[] && ARRAY[${
    //     req.query.gender
    //   }] END
    //       AND CASE
    //     		WHEN '${req.query.collection}' = '0' THEN TRUE
    //     		ELSE string_to_array(id_collection, '|')::int[] && ARRAY[${
    //           req.query.collection
    //         }] END
    //       AND CASE WHEN '${
    //         req.query.brand
    //       }' = '0' THEN true ELSE id_brand IN (${req.query.brand}) END
    //       AND CASE
    //     		WHEN '${req.query.search_text}' = '0' THEN TRUE
    //     		ELSE NAME ILIKE '%${req.query.search_text}%' OR SLUG ILIKE '%${
    //     req.query.search_text
    //   }%' OR SKU ILIKE '%${req.query.search_text}%'
    //     	END
    //     AND CASE
    //     WHEN '${req.query.metal_id}' = '0' THEN TRUE
    //     ELSE EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(pmo) AS item
    //         WHERE item->>'id_metal' = ANY (string_to_array('${
    //           req.query.metal_id
    //         }', ','))
    //     )
    //     END
    //     AND  CASE WHEN '${
    //       req.query.metal_tone
    //     }' = '0' THEN true ELSE CASE WHEN product_type=${
    //     SingleProductType.DynemicPrice
    //   } OR product_type=${SingleProductType.cataLogueProduct} THEN EXISTS (
    //        SELECT 1
    //     FROM jsonb_array_elements(pmo) AS item
    //     WHERE EXISTS (
    //     SELECT 1
    //     FROM jsonb_array_elements_text(item->'metal_tone') AS metal_tone
    //     WHERE CAST(metal_tone.value as INTEGER) IN (${req.query.metal_tone})
    //     )
    //       ) ELSE EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(pmo) AS item
    //         WHERE (item->>'id_metal_tone')::int[] && ARRAY[${
    //           req.query.metal_tone
    //         }]
    //     ) END END
    //                AND CASE WHEN '${
    //                  req.query.diamond_shape
    //                }' = '0' THEN true ELSE CASE WHEN '${
    //     req.query.is_choose_setting
    //   }' = '1' THEN EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(pdo) AS item
    //         WHERE CAST(item->>'id_shape' AS INTEGER) IN (${
    //           req.query.diamond_shape
    //         }) OR string_to_array(setting_diamond_shapes, '|')::int[] && ARRAY[${
    //     req.query.diamond_shape
    //   }]
    //       ) else EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(pdo) AS item
    //         WHERE CAST(item->>'id_shape' AS INTEGER) IN (${
    //           req.query.diamond_shape
    //         })
    //       ) END END
    //        AND CASE WHEN '${
    //          req.query.product_category
    //        }' = '0' THEN true ELSE EXISTS (
    //         SELECT 1
    //         FROM jsonb_array_elements(product_categories) AS category
    //         WHERE category->>'category_name' IN (${
    //           filterCategory == "0" ? `'${filterCategory}'` : filterCategory
    //         }) OR category->>'sub_category_name' IN (${
    //     filterCategory == "0" ? `'${filterCategory}'` : filterCategory
    //   }) OR category->>'sub_sub_category_name' IN (${
    //     filterCategory == "0" ? `'${filterCategory}'` : filterCategory
    //   })
    //       ) END
    //     AND CASE
    //       WHEN '${req.query.category}' = '0' THEN TRUE
    //       ELSE NOT EXISTS (
    //           SELECT 1
    //           FROM jsonb_array_elements(product_categories) AS category
    //           WHERE category->>'category_name' ILIKE '%watch%'
    //       )
    //   END
    //   AND CASE
    //     		WHEN '${req.query.min_price}' = '0' AND '${
    //     req.query.max_price
    //   }' = '0' THEN TRUE
    //         ELSE ExISTS (
    //             SELECT 1
    //             FROM jsonb_array_elements(pmo) AS item
    //             WHERE CAST(item->>'Price' AS INTEGER) ${
    //               req.query.min_price == "0" && req.query.max_price != "0"
    //                 ? `<= ${req.query.max_price}`
    //                 : req.query.min_price != "0" && req.query.max_price == "0"
    //                 ? `>= ${req.query.min_price}`
    //                 : `BETWEEN ${
    //                     req.query.min_price ? req.query.min_price : 0
    //                   } AND ${req.query.max_price}`
    //             }
    //         ) END
    //   `,
    //   { type: QueryTypes.SELECT }
    // );
    // return resSuccess({ data: { count: productCount.length, products } });
    // const { carat_size } = req.body;
    // for (let index = 0; index < carat_size.length; index++) {
    //   const element = carat_size[index];
    //   const sort_code_value = Math.round(parseFloat(element) * 100);
    //   const payload = {
    //     value: element,
    //     slug: element,
    //     sort_code: sort_code_value,
    //     created_date: getLocalDate(),
    //     is_active: ActiveStatus.Active,
    //     is_deleted: DeletedStatus.No,
    //     created_by: 1,
    //   };

    //   await DiamondCaratSize.create(payload);
    // }
    // const array = [
    //   {
    //     title: "Fluorescence",
    //     sort: 1.0,
    //     children: [
    //       {
    //         title: "Fluorescence Intensity",
    //         path: "/attribute/fluorescence/fluorescenceIntensity",
    //         sort: 1.0,
    //       },
    //       {
    //         title: "Fluorescence Color",
    //         path: "/attribute/fluorescence/fluorescenceColor",
    //         sort: 2.0,
    //       },
    //     ],
    //   },
    //   {
    //     title: "Fancy Color",
    //     sort: 2.0,
    //     children: [
    //       {
    //         title: "Fancy Color",
    //         path: "/attribute/fancyColor/fancyColor",
    //         sort: 1.0,
    //       },
    //       {
    //         title: "Fancy Color Intensity",
    //         path: "/attribute/fancyColor/fancyColorIntensity",
    //         sort: 2.0,
    //       },
    //       {
    //         title: "Fancy Color Overtone",
    //         path: "/attribute/fancyColor/fancyColorOvertone",
    //         sort: 3.0,
    //       },
    //     ],
    //   },
    //   {
    //     title: "Girdle",
    //     sort: 3.0,
    //     children: [
    //       {
    //         title: "Girdle Thin",
    //         path: "/attribute/girdle/girdleThin",
    //         sort: 1.0,
    //       },
    //       {
    //         title: "Girdle Thick",
    //         path: "/attribute/girdle/girdleThick",
    //         sort: 2.0,
    //       },
    //       {
    //         title: "Girdle Condition",
    //         path: "/attribute/girdle/girdleCondition",
    //         sort: 3.0,
    //       },
    //     ],
    //   },
    //   {
    //     title: "Pair",
    //     sort: 4.0,
    //     children: [
    //       {
    //         title: "Pair",
    //         path: "/attribute/pair/pair",
    //         sort: 1.0,
    //       },
    //       {
    //         title: "Pair Separable",
    //         path: "/attribute/pair/pairSeparable",
    //         sort: 2.0,
    //       },
    //       {
    //         title: "Pair Stock",
    //         path: "/attribute/pair/pairStock",
    //         sort: 3.0,
    //       },
    //     ],
    //   },
    //   {
    //     title: "Inclusion",
    //     sort: 5.0,
    //     children: [
    //       {
    //         title: "Canter Inclusion",
    //         path: "/attribute/inclusion/centerInclusion",
    //         sort: 1.0,
    //       },
    //       {
    //         title: "Black Inclusion",
    //         path: "/attribute/inclusion/blackInclusion",
    //         sort: 2.0,
    //       },
    //     ],
    //   },
    //   {
    //     title: "lab",
    //     sort: 6.0,
    //     children: [
    //       {
    //         title: "lab",
    //         path: "/attribute/lab/lab",
    //         sort: 1.0,
    //       },
    //       {
    //         title: "lab Location",
    //         path: "/attribute/lab/labLocation",
    //         sort: 2.0,
    //       },
    //     ],
    //   },
    //   {
    //     title: "Parcel Stones",
    //     path: "/attribute/parcelStones",
    //     sort: 7.0,
    //   },
    //   {
    //     title: "Availability",
    //     path: "/attribute/availability",
    //     sort: 8.0,
    //   },
    //   {
    //     title: "Polish",
    //     path: "/attribute/polish",
    //     sort: 9.0,
    //   },
    //   {
    //     title: "Symmetry",
    //     path: "/attribute/symmetry",
    //     sort: 10.0,
    //   },
    //   {
    //     title: "Culet Condition",
    //     path: "/attribute/culetCondition",
    //     sort: 11.0,
    //   },
    //   {
    //     title: "Laser Inscription",
    //     path: "/attribute/laserInscription",
    //     sort: 12.0,
    //   },
    //   {
    //     title: "Certificate Comment",
    //     path: "/attribute/certComment",
    //     sort: 13.0,
    //   },
    //   {
    //     title: "Time To Location",
    //     path: "/attribute/timetolocation",
    //     sort: 14.0,
    //   },
    //   {
    //     title: "Trade Show",
    //     path: "/attribute/tradeShow",
    //     sort: 15.0,
    //   },
    //   {
    //     title: "Shade",
    //     path: "/attribute/shade",
    //     sort: 16.0,
    //   },
    //   {
    //     title: "Report Type",
    //     path: "/attribute/reportType",
    //     sort: 17.0,
    //   },
    //   {
    //     title: "Milky",
    //     path: "/attribute/milky",
    //     sort: 18.0,
    //   },
    //   {
    //     title: "BGM",
    //     path: "/attribute/bgm",
    //     sort: 19.0,
    //   },
    //   {
    //     title: "H & A",
    //     path: "/attribute/handA",
    //     sort: 20.0,
    //   },
    //   {
    //     title: "Growth Type",
    //     path: "/attribute/growthType",
    //     sort: 21.0,
    //   },
    //   {
    //     title: "Country",
    //     path: "/attribute/country",
    //     sort: 22.0,
    //   },
    //   {
    //     title: "State",
    //     path: "/attribute/state",
    //     sort: 23.0,
    //   },
    //   {
    //     title: "City",
    //     path: "/attribute/city",
    //     sort: 24.0,
    //   },
    // ];

    // for (let index = 0; index < array.length; index++) {
    //   const element = array[index];
    //   const mainMenu = await MenuItem.create({
    //     name: element.title,
    //     id_parent_menu: 67,
    //     nav_path: element.path ? element.path : null,
    //     menu_location: 1,
    //     sort_order: element.sort,
    //     is_active: ActiveStatus.Active,
    //     is_deleted: DeletedStatus.No,
    //     created_by: 1,
    //     created_date: getLocalDate(),
    //   });

    //   if (element.children && element.children.length !== 0) {
    //     for (let index = 0; index < element.children.length; index++) {
    //       const elementChild = element.children[index];
    //       await MenuItem.create({
    //         name: elementChild.title,
    //         id_parent_menu: mainMenu.dataValues.id,
    //         nav_path: elementChild.path ? elementChild.path : null,
    //         menu_location: 1,
    //         sort_order: elementChild.sort,
    //         is_active: ActiveStatus.Active,
    //         is_deleted: DeletedStatus.No,
    //         created_by: 1,
    //         created_date: getLocalDate(),
    //       });
    //     }
    //   }
    // }
    // const headList = await HeadsData.findAll({ where: { is_deleted: DeletedStatus.No } });
    // const shnakList = await ShanksData.findAll({ where: { is_deleted: DeletedStatus.No } });
    // const sideSettingList = await SideSettingStyles.findAll({
    //   where: { is_deleted: DeletedStatus.No },
    // });
    // const diamondSize = await DiamondCaratSize.findAll({
    //   where: { is_deleted: DeletedStatus.No },
    // });
    // const diamondShape = await DiamondShape.findAll({
    //   where: { is_deleted: DeletedStatus.No },
    // });
    // const colorList = await Colors.findAll({ where: { is_deleted: DeletedStatus.No } });
    // const ClarityList = await ClarityData.findAll({
    //   where: { is_deleted: DeletedStatus.No },
    // });
    // const karatList = await GoldKarat.findAll({
    //   where: { is_deleted: DeletedStatus.No },
    // });
    // const goldList = await MetalMaster.findAll({ where: { is_deleted: DeletedStatus.No } });
    // const gemstone = await StoneData.findAll({ where: { is_deleted: DeletedStatus.No } });
    // const cuts = await CutsData.findAll({ where: { is_deleted: DeletedStatus.No } });

    // const headListFind = (value: any) => {
    //   const list = headList.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.sort_code };
    // };
    // const shankListFind = (value: any) => {
    //   const list = shnakList.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.sort_code };
    // };
    // const sideSettingListFind = (value: any) => {
    //   const list = sideSettingList.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.sort_code };
    // };
    // const diamondSizeListFind = (value: any) => {
    //   const list = diamondSize.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.value, sort: list.dataValues.sort_code };
    // };
    // const diamondShapeListFind = (value: any) => {
    //   const list = diamondShape.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.sort_code };
    // };
    // const diamondColorListFind = (value: any) => {
    //   const list = colorList.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.sort_code };
    // };
    // const diamondClarityListFind = (value: any) => {
    //   const list = ClarityList.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.value };
    // };
    // const karatListFind = (value: any) => {
    //   const list = karatList.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.slug };
    // };
    // const metalListFind = (value: any) => {
    //   const list = goldList.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.slug };
    // };
    // const cutsListFind = (value: any) => {
    //   const list = cuts.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.value, sort: list.dataValues.slug };
    // };
    // const GemstoneListFind = (value: any) => {
    //   const list = gemstone.find((t: any) => t.dataValues.id == value);
    //   return { name: list.dataValues.name, sort: list.dataValues.slug };
    // };
    // const configProduct = await ConfigProduct.findAll({
    //   order: [["id", "ASC"]],
    //   where: { is_deleted: DeletedStatus.No, product_type: { [Op.iLike]: "three stone" } },
    //   include: [
    //     { model: ConfigProductMetals, as: "CPMO" },
    //     {
    //       model: ConfigProductDiamonds,
    //       as: "CPDO",
    //       where: { product_type: { [Op.iLike]: "side" } },
    //     },
    //   ],
    // });
    // let list = [];
    // for (let index = 0; index < configProduct.length; index++) {
    //   const element = configProduct[index].dataValues;
    //   // console.log("-------------", element.slug.split("-")[3]);

    //   // list.push({

    //   //   product_title: `${
    //   //     element.CPMO[0].metal_id == 1
    //   //       ? `${karatListFind(element.CPMO[0].karat_id).name}KT`
    //   //       : metalListFind(element.CPMO[0].metal_id).name
    //   //   } ${diamondShapeListFind(element.center_dia_shape_id).name} ${
    //   //     diamondSizeListFind(element.center_dia_cts).name
    //   //   } Carat ${
    //   //     element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //   //       ? cutsListFind(element.center_dia_cut_id).name
    //   //       : diamondColorListFind(element.center_dia_color).name +
    //   //         " " +
    //   //         diamondClarityListFind(element.center_dia_clarity_id).name
    //   //   } Side ${GemstoneListFind(element.CPDO[0].dia_stone).name} ${
    //   //     headListFind(element.head_type_id).name
    //   //   } ${shankListFind(element.shank_type_id).name} ${
    //   //     sideSettingListFind(element.side_setting_id).name
    //   //   }  Diamond Ring`,
    //   //   product_sort_des: `${
    //   //     element.CPMO[0].metal_id == 1
    //   //       ? `${karatListFind(element.CPMO[0].karat_id).name}KT`
    //   //       : metalListFind(element.CPMO[0].metal_id).name
    //   //   } ${diamondShapeListFind(element.center_dia_shape_id).name} ${
    //   //     diamondSizeListFind(element.center_dia_cts).name
    //   //   } Carat ${
    //   //     element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //   //       ? cutsListFind(element.center_dia_cut_id).name
    //   //       : diamondColorListFind(element.center_dia_color).name +
    //   //         " " +
    //   //         diamondClarityListFind(element.center_dia_clarity_id).name
    //   //   } Side ${GemstoneListFind(element.CPDO[0].dia_stone).name} ${
    //   //     headListFind(element.head_type_id).name
    //   //   } ${shankListFind(element.shank_type_id).name} ${
    //   //     sideSettingListFind(element.side_setting_id).name
    //   //   }  Diamond Ring`,
    //   //   product_long_des: `${
    //   //     element.CPMO[0].metal_id == 1
    //   //       ? `${karatListFind(element.CPMO[0].karat_id).name}KT`
    //   //       : metalListFind(element.CPMO[0].metal_id).name
    //   //   } ${diamondShapeListFind(element.center_dia_shape_id).name} ${
    //   //     diamondSizeListFind(element.center_dia_cts).name
    //   //   } Carat ${
    //   //     element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //   //       ? cutsListFind(element.center_dia_cut_id).name
    //   //       : diamondColorListFind(element.center_dia_color).name +
    //   //         " " +
    //   //         diamondClarityListFind(element.center_dia_clarity_id).name
    //   //   } Side ${GemstoneListFind(element.CPDO[0].dia_stone).name}  ${
    //   //     headListFind(element.head_type_id).name
    //   //   } ${shankListFind(element.shank_type_id).name} ${
    //   //     sideSettingListFind(element.side_setting_id).name
    //   //   }  Diamond Ring`,
    //   //   slug: `${
    //   //     element.CPMO[0].metal_id == 1
    //   //       ? `${karatListFind(element.CPMO[0].karat_id).sort}`
    //   //       : metalListFind(element.CPMO[0].metal_id).sort
    //   //   }-${element.slug.split("-")[3]}-${
    //   //     diamondShapeListFind(element.center_dia_shape_id).sort
    //   //   }-${diamondSizeListFind(element.center_dia_cts).name}-${
    //   //     element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //   //       ? cutsListFind(element.center_dia_cut_id).sort
    //   //       : diamondColorListFind(element.center_dia_color).name +
    //   //         "-" +
    //   //         diamondClarityListFind(element.center_dia_clarity_id).sort
    //   //   }-Side-${GemstoneListFind(element.CPDO[0].dia_stone).name}-${
    //   //     element.CPDO[0].dia_cuts && element.CPDO[0].dia_cuts != undefined
    //   //       ? cutsListFind(element.CPDO[0].dia_cuts).sort
    //   //       : diamondColorListFind(element.CPDO[0].dia_color).name +
    //   //         "-" +
    //   //         diamondClarityListFind(element.CPDO[0].dia_clarity).sort
    //   //   }-${headListFind(element.head_type_id).sort}-${
    //   //     shankListFind(element.shank_type_id).sort
    //   //   }-${sideSettingListFind(element.side_setting_id).sort}`,
    //   //   sku: `${
    //   //     element.CPMO[0].metal_id == 1
    //   //       ? `${karatListFind(element.CPMO[0].karat_id).sort}`
    //   //       : metalListFind(element.CPMO[0].metal_id).sort
    //   //   }-${diamondShapeListFind(element.center_dia_shape_id).sort}-${
    //   //     diamondSizeListFind(element.center_dia_cts).name
    //   //   }-${
    //   //     element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //   //       ? cutsListFind(element.center_dia_cut_id).sort
    //   //       : diamondColorListFind(element.center_dia_color).name +
    //   //         "-" +
    //   //         diamondClarityListFind(element.center_dia_clarity_id).sort
    //   //   }-Side-${GemstoneListFind(element.CPDO[0].dia_stone).name}-${
    //   //     headListFind(element.head_type_id).sort
    //   //   }-${shankListFind(element.shank_type_id).sort}-${
    //   //     sideSettingListFind(element.side_setting_id).sort
    //   //   }`,
    //   // });
    //   await ConfigProduct.update(
    //     {
    //       product_title: `${
    //         element.CPMO[0].metal_id == 1
    //           ? `${karatListFind(element.CPMO[0].karat_id).name}KT`
    //           : metalListFind(element.CPMO[0].metal_id).name
    //       } ${diamondShapeListFind(element.center_dia_shape_id).name} ${
    //         diamondSizeListFind(element.center_dia_cts).name
    //       } Carat ${
    //         element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //           ? cutsListFind(element.center_dia_cut_id).name
    //           : diamondColorListFind(element.center_dia_color).name +
    //             " " +
    //             diamondClarityListFind(element.center_dia_clarity_id).name
    //       } Side ${GemstoneListFind(element.CPDO[0].dia_stone).name} ${
    //         headListFind(element.head_type_id).name
    //       } ${shankListFind(element.shank_type_id).name} ${
    //         sideSettingListFind(element.side_setting_id).name
    //       }  Diamond Ring`,
    //       product_sort_des: `${
    //         element.CPMO[0].metal_id == 1
    //           ? `${karatListFind(element.CPMO[0].karat_id).name}KT`
    //           : metalListFind(element.CPMO[0].metal_id).name
    //       } ${diamondShapeListFind(element.center_dia_shape_id).name} ${
    //         diamondSizeListFind(element.center_dia_cts).name
    //       } Carat ${
    //         element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //           ? cutsListFind(element.center_dia_cut_id).name
    //           : diamondColorListFind(element.center_dia_color).name +
    //             " " +
    //             diamondClarityListFind(element.center_dia_clarity_id).name
    //       } Side ${GemstoneListFind(element.CPDO[0].dia_stone).name} ${
    //         headListFind(element.head_type_id).name
    //       } ${shankListFind(element.shank_type_id).name} ${
    //         sideSettingListFind(element.side_setting_id).name
    //       }  Diamond Ring`,
    //       product_long_des: `${
    //         element.CPMO[0].metal_id == 1
    //           ? `${karatListFind(element.CPMO[0].karat_id).name}KT`
    //           : metalListFind(element.CPMO[0].metal_id).name
    //       } ${diamondShapeListFind(element.center_dia_shape_id).name} ${
    //         diamondSizeListFind(element.center_dia_cts).name
    //       } Carat ${
    //         element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //           ? cutsListFind(element.center_dia_cut_id).name
    //           : diamondColorListFind(element.center_dia_color).name +
    //             " " +
    //             diamondClarityListFind(element.center_dia_clarity_id).name
    //       } Side ${GemstoneListFind(element.CPDO[0].dia_stone).name}  ${
    //         headListFind(element.head_type_id).name
    //       } ${shankListFind(element.shank_type_id).name} ${
    //         sideSettingListFind(element.side_setting_id).name
    //       }  Diamond Ring`,
    //       slug: `${
    //         element.CPMO[0].metal_id == 1
    //           ? `${karatListFind(element.CPMO[0].karat_id).sort}`
    //           : metalListFind(element.CPMO[0].metal_id).sort
    //       }-${element.slug.split("-")[3]}-${
    //         diamondShapeListFind(element.center_dia_shape_id).sort
    //       }-${diamondSizeListFind(element.center_dia_cts).name}-${
    //         element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //           ? cutsListFind(element.center_dia_cut_id).sort
    //           : diamondColorListFind(element.center_dia_color).name +
    //             "-" +
    //             diamondClarityListFind(element.center_dia_clarity_id).sort
    //       }-Side-${GemstoneListFind(element.CPDO[0].dia_stone).name}-${
    //         element.CPDO[0].dia_cuts && element.CPDO[0].dia_cuts != undefined
    //           ? cutsListFind(element.CPDO[0].dia_cuts).sort
    //           : diamondColorListFind(element.CPDO[0].dia_color).name +
    //             "-" +
    //             diamondClarityListFind(element.CPDO[0].dia_clarity).sort
    //       }-${headListFind(element.head_type_id).sort}-${
    //         shankListFind(element.shank_type_id).sort
    //       }-${sideSettingListFind(element.side_setting_id).sort}`,
    //       sku: `${
    //         element.CPMO[0].metal_id == 1
    //           ? `${karatListFind(element.CPMO[0].karat_id).sort}`
    //           : metalListFind(element.CPMO[0].metal_id).sort
    //       }-${diamondShapeListFind(element.center_dia_shape_id).sort}-${
    //         diamondSizeListFind(element.center_dia_cts).name
    //       }-${
    //         element.center_dia_cut_id && element.center_dia_cut_id != undefined
    //           ? cutsListFind(element.center_dia_cut_id).sort
    //           : diamondColorListFind(element.center_dia_color).name +
    //             "-" +
    //             diamondClarityListFind(element.center_dia_clarity_id).sort
    //       }-Side-${GemstoneListFind(element.CPDO[0].dia_stone).name}-${
    //         headListFind(element.head_type_id).sort
    //       }-${shankListFind(element.shank_type_id).sort}-${
    //         sideSettingListFind(element.side_setting_id).sort
    //       }`,
    //     },
    //     { where: { id: element.id } }
    //   );
    // }
    // return resSuccess({ data: list });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const registerSystemUser = async (req: Request) => {
  try {
    const { username, password, user_type } = req.body;

    const pass_hash = await bcrypt.hash(password, Number(PASSWORD_SOLT));
    const payload = {
      username,
      pass_hash,
      user_type,
      created_at: getLocalDate(),
    };
    const result = await AppUser.create(payload);
 
    const jwtPayload:any = {
      id: result.dataValues.id,
      idAppUser: result.dataValues.id,
      userType: result.dataValues.user_type,
    };
    const data = await createUserJWT(
      result.dataValues.id,
      jwtPayload,
      result.dataValues.user_type
    );
    await addActivityLogs([{
      old_data: null,
      new_data: {
        user_id: result?.dataValues?.id, data: {
          ...result?.dataValues,
          token: data,
          detail_json: req?.body?.detail_json || null
        }
      }
    }], result?.dataValues?.id, LogsActivityType.Register, LogsType.Auth, req?.body?.session_res?.id_app_user)
    return resSuccess({
      data: {
        userInfo: result,
        token: data,
      },
    });
  } catch (e) {
    throw e;
  }
};

export const authenticateSystemUser = async (req: Request) => {
  try {

    const { username, password, company_key,detail_json } = req.body;
    let userDetails;

    const companyInfo = await CompanyInfo.findOne({ where: { key: company_key } })
    if (!(companyInfo && companyInfo.dataValues)) {
      return resNotFound({ message: prepareMessageFromParams(ERROR_NOT_FOUND, [["field_name", "Company key"]]) });
    }
    const appUser = await AppUser.findOne({
      where: { username, is_deleted: DeletedStatus.No, user_type: [USER_TYPE.Administrator, USER_TYPE.BusinessUser] }
    });

    if (!appUser) {
      return resNotFound({ message: USER_NOT_FOUND });
    }
    const isPasswordValid = <any>(
      await bcrypt.compare(password, appUser.dataValues.pass_hash)
    );
    if (!isPasswordValid) {
      return resBadRequest({ message: INVALID_USERNAME_PASSWORD });
    }

    if (appUser.dataValues.user_status === USER_STATUS.Blocked) {
      return resError({ message: ACCOUNT_IS_BLOCKED, code: FORBIDDEN_CODE });
    }

    if (appUser.dataValues.is_active === "0") {
      return resError({ message: ACCOUNT_NOT_ACTIVE, code: FORBIDDEN_CODE });
    }

    if (
      appUser.dataValues.user_status === USER_STATUS.PendingVerification ||
      appUser.dataValues.user_status === USER_STATUS.PendingReverification
    ) {
      return resError({
        status: NOT_VERIFIED,
        message: ACCOUNT_NOT_VERIFIED,
        code: FORBIDDEN_CODE,
        data: appUser.dataValues.id,
      });
    }

    if (appUser.dataValues.user_status === USER_STATUS.PendingApproval) {
      return resError({ message: ACCOUNT_NOT_APPROVED, code: FORBIDDEN_CODE });
    }
    
    const role = await Role.findOne({
      where: { id: appUser?.dataValues?.id_role, is_deleted: DeletedStatus.No },
    });

    if (!role) {
      return resNotFound({ message: ROLE_NOT_FOUND });
    }

    if (role.dataValues.is_active == ActiveStatus.InActive) {
      return resNotFound({ message: USER_ROLE_INACTIVE_ERROR_MESSAGE });
    }

    // super admin send the otp and verified the account
    if (appUser.dataValues.user_type === USER_TYPE.Administrator) {
      const currentDate = getLocalDate(); // Get current time
      
      // const configData = await getWebSettingData(dbContext,companyInfo?.dataValues?.id)
      const expireDate = new Date(currentDate.getTime() + OTP_EXPIRATION_TIME);
      const digits = "0123456789";
      let OTP = "";
      // create OTP
      for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }
      await AppUser.update(
        {
          one_time_pass: OTP,
          otp_create_date: currentDate,
          otp_expire_date: expireDate,
          is_email_verified: "0",
        },
        { where: { id: appUser.dataValues.id } }
      );
      const mailPayload = {
        toEmailAddress: appUser.dataValues.username,
        contentTobeReplaced: { name: appUser.dataValues.username, OTP },
      }; 

      userDetails = await AppUser.findOne({
        where: { id: appUser?.dataValues?.id },
        attributes: ["id", "username", "user_type", "id_role", "is_email_verified", "is_super_admin", "otp_create_date", "otp_expire_date", "one_time_pass"],
      });
      // send mail for otp
      await mailRegistrationOtp(mailPayload);

      await addActivityLogs([{
        old_data: { user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues}},
        new_data: {
          user_id: userDetails?.dataValues?.id, data: {...userDetails?.dataValues, detail_json: detail_json || {}}
        }
      }], appUser?.dataValues?.id,LogsActivityType.Login, LogsType.Auth, appUser?.dataValues?.id);
       
      return resSuccess({
        data: {
          user_detail: userDetails,
          id_role: appUser.dataValues.id_role,
        },
      });
    }

    if (appUser.dataValues.user_type === USER_TYPE.Administrator) {
      userDetails = await AppUser.findOne({
        where: { id: appUser.dataValues.id },
      });
    } else if (appUser.dataValues.user_type === USER_TYPE.BusinessUser) {
      userDetails = await BusinessUser.findOne({
        where: { id_app_user: appUser.dataValues.id },
        attributes: [
          "id",
          "id_app_user",
          "name",
          "email",
          "phone_number",
          "is_active",
          "is_deleted",
          "created_date",
          [Sequelize.literal("image.image_path"), "image_path"],
        ],
        include: [{ model: Image, as: "image", attributes: [] }],
      });
    } else if (appUser.dataValues.user_type === USER_TYPE.Customer) {

      userDetails = await CustomerUser.findOne({
        where: { id_app_user: appUser.dataValues.id },
      });
      if (userDetails && userDetails.dataValues && userDetails.dataValues.sign_up_type !== SIGN_UP_TYPE.System) {
        {
          return resNotFound({ message: USER_NOT_FOUND });
        }
      }
    }

    const jwtPayload = {
      id:
        userDetails && userDetails.dataValues
          ? userDetails.dataValues.id
          : appUser.dataValues.id,
      id_app_user: appUser.dataValues.id,
      user_type: appUser.dataValues.user_type,
      id_role: appUser.dataValues.id_role
    };

    const data = createUserJWT(
      appUser.dataValues.id,
      jwtPayload,
      appUser.dataValues.user_type
    );

    const AfterUpdateappUser = await AppUser.findOne({
      where: { id: req.body.session_res.id_app_user },
    });
    await addActivityLogs([{
      old_data: { user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues}},
      new_data: {
        user_id: AfterUpdateappUser?.dataValues?.id, data: {...AfterUpdateappUser?.dataValues,token: data, detail_json: detail_json || {}}
      }
    }], appUser?.dataValues?.id,LogsActivityType.Login, LogsType.Auth, appUser?.dataValues?.id)
       
    return resSuccess({
      data: {
        tokens: data,
        user_detail: userDetails,
        id_role: appUser.dataValues.id_role,
      },
    });
  } catch (e) {
    throw e;
  }
};


export const authenticateCustomerUserWithOTP = async (req: Request) => {
  try {
    const {
      username,
      password,
      login_with_otp = false,
      remember_me = false,
    } = req.body;
    let userDetails: any;
    const findUserEMail = await CustomerUser.findOne({
      where: [
        columnValueLowerCase("email", username),
        { sign_up_type: SIGN_UP_TYPE.System },
        { is_deleted: DeletedStatus.No },
      ],
    });

    userDetails = findUserEMail ? findUserEMail : null;
    const findUserPhone = await CustomerUser.findOne({
      where: {
        mobile: username,
        sign_up_type: SIGN_UP_TYPE.System,
        is_deleted: DeletedStatus.No,

      },
    });

    if (findUserPhone) {
      userDetails = findUserPhone;
    }

    if (!findUserEMail && !findUserPhone) {
      let findUser = await CustomerUser.findOne({
        where: [
          columnValueLowerCase("email", username),
          { is_deleted: DeletedStatus.No },
        ],
      });

      if (!findUser) {
        findUser = await CustomerUser.findOne({
          where: {
            mobile: username,
            is_deleted: DeletedStatus.No,

          },
        });
      }
      if (findUser) {
        return resNotFound({
          message: prepareMessageFromParams(SIGN_IN_TYPE_WRONG_ERROR_MESSAGE, [
            ["field_name", findUser.dataValues.sign_up_type],
          ]),
        });
      }

      return resNotFound({ message: USER_NOT_FOUND });
    }

    const appUser = await AppUser.findOne({
      where: {
        id: userDetails.dataValues.id_app_user,
        is_deleted: DeletedStatus.No,
      },
    });
    if (login_with_otp == false) {
      const isPasswordValid = <any>(
        await bcrypt.compare(password, appUser.dataValues.pass_hash)
      );
      if (!isPasswordValid) {
        return resBadRequest({ message: INVALID_USERNAME_PASSWORD });
      }

      if (appUser.dataValues.user_status === USER_STATUS.Blocked) {
        return resError({ message: ACCOUNT_IS_BLOCKED, code: FORBIDDEN_CODE });
      }

      if (appUser.dataValues.is_active === "0") {
        return resError({ message: ACCOUNT_NOT_ACTIVE, code: FORBIDDEN_CODE });
      }

      if (
        appUser.dataValues.user_status === USER_STATUS.PendingVerification ||
        appUser.dataValues.user_status === USER_STATUS.PendingReverification
      ) {
        return resError({
          status: NOT_VERIFIED,
          message: ACCOUNT_NOT_VERIFIED,
          code: FORBIDDEN_CODE,
          data: appUser.dataValues.id,
        });
      }

      if (appUser.dataValues.user_status === USER_STATUS.PendingApproval) {
        return resError({
          message: ACCOUNT_NOT_APPROVED,
          code: FORBIDDEN_CODE,
        });
      }

      if (appUser.dataValues.user_type === USER_TYPE.Administrator) {
        userDetails = await AppUser.findOne({
          where: { id: appUser.dataValues.id },
        });
      } else if (appUser.dataValues.user_type === USER_TYPE.BusinessUser) {
        userDetails = await BusinessUser.findOne({
          where: { id_app_user: appUser.dataValues.id },
          attributes: [
            "id",
            "id_app_user",
            "name",
            "email",
            "phone_number",
            "is_active",
            "is_deleted",
            "created_date",
            [Sequelize.literal("image.image_path"), "image_path"],
          ],
          include: [{ model: Image, as: "image", attributes: [] ,required:false }],
        });
      } else if (appUser.dataValues.user_type === USER_TYPE.Customer) {
        userDetails = await CustomerUser.findOne({
          where: { id_app_user: appUser.dataValues.id },
        });
      }

      const jwtPayload = {
        id:
          userDetails && userDetails.dataValues
            ? userDetails.dataValues.id
            : appUser.dataValues.id,
        id_app_user: appUser.dataValues.id,
        user_type: appUser.dataValues.user_type,
        id_role: appUser.dataValues.id_role
      };

      const data = createUserJWT(
        appUser.dataValues.id,
        jwtPayload,
        remember_me && remember_me == true ? 5 : appUser.dataValues.user_type
      );
      await addActivityLogs([{
        old_data: { user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues}},
        new_data: {
          user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues, token: data, detail_json: req?.body?.detail_json || {}}
        }
      }], appUser?.dataValues?.id,LogsActivityType.CustomerLogin, LogsType.Auth, appUser?.dataValues?.id)
         
      return resSuccess({
        data: {
          tokens: data,
          user_detail: userDetails,
          id_role: appUser.dataValues.id_role,
        },
      });
    } else {
      const configData = await getWebSettingData()
      const currentDate = getLocalDate(); // Get current time
      const expireDate = new Date(currentDate.getTime() + OTP_EXPIRATION_TIME);
      const digits = "0123456789";
      let OTP = "";
      for (let i = 0; i < configData.otp_generate_digit_count; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }
      await AppUser.update(
        {
          one_time_pass: OTP,
          otp_create_date: currentDate,
          otp_expire_date: expireDate,
        },
        { where: { id: appUser.dataValues.id } }
      );
      const mailPayload = {
        toEmailAddress: appUser.dataValues.username,
        contentTobeReplaced: { name: userDetails.dataValues.full_name, OTP },
      };
      await mailRegistrationOtp(mailPayload);
      if (
        appUser.dataValues.user_type === USER_TYPE.Customer &&
        userDetails &&
        userDetails.dataValues &&
        userDetails.dataValues.country_id == "+91" &&
        configData.whats_app_send_message_status.toString() == "true"
      ) {
        await sendMessageInWhatsApp(OTP, userDetails.dataValues.mobile,configData);
      }

      const AfterUpdateappUser = await AppUser.findOne({
        where: { id: appUser?.dataValues?.id },
      });

      await addActivityLogs(
        [{  
          old_data: { user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues}},
          new_data: {
            user_id: AfterUpdateappUser?.dataValues?.id, data: {...AfterUpdateappUser?.dataValues, detail_json: req?.body?.detail_json || {}}
          }
        }], appUser?.dataValues?.id,LogsActivityType.CustomerOTP, LogsType.Auth, appUser?.dataValues?.id)
         
      return resSuccess({
        data: {
          otp: {
            otp: OTP,
            otp_create_date: currentDate,
            otp_expire_date: expireDate,
          },
          user_detail: userDetails,
          id_role: appUser.dataValues.id_role,
        },
      });
    }
  } catch (e) {
    throw e;
  }
};

export const refreshAuthorizationToken = async (req: Request) => {
  try {
    const refreshToken = req.body.refresh_token;
    const result:any = await verifyJWT(refreshToken);
    if (result.code === DEFAULT_STATUS_CODE_SUCCESS) {
      
      const jwtPayload = {
        id:
        result.data.id,
        id_app_user: result.data.id_app_user,
        user_type: result.data.user_type,
        id_role: result.data.id_role
      };
      const data = createUserJWT(
        result.data.id,
        jwtPayload,
        result.data.user_type
      );
      
      const AfterUpdateappUser = await AppUser.findOne({
        where: { id: req.body.session_res.id_app_user  },
      });
      await addActivityLogs([{
        old_data: { user_id: AfterUpdateappUser?.dataValues?.id, data: {...AfterUpdateappUser?.dataValues}},
        new_data: {
          user_id: AfterUpdateappUser?.dataValues?.id, data: { ...AfterUpdateappUser?.dataValues }
        }
      }], AfterUpdateappUser?.dataValues?.id,LogsActivityType.RefreshToken, LogsType.Auth, req?.body?.session_res?.id_app_user)
         
      return resSuccess({ data });
    } else if (
      result.code === UNAUTHORIZED_ACCESS_CODE &&
      result.message === JWT_EXPIRED_ERROR_NAME
    ) {
      return result;
    }

    return resUnknownError(result);
  } catch (e) {
    throw e;
  }
};

export const changePassword = async (req: Request) => {
  try {
    
    const appUser = await AppUser.findOne({
      where: { id: req.body.session_res.id_app_user},
    });
    if (!appUser) {
      return resBadRequest({ message: USER_NOT_FOUND });
    }

    const isPasswordValid = <any>(
      await bcrypt.compare(req.body.old_password, appUser.dataValues.pass_hash)
    );
    if (!isPasswordValid) {
      return resBadRequest({ message: PASSWORD_IS_WRONG });
    }

    const pass_hash = await bcrypt.hash(
      req.body.new_password,
      Number(PASSWORD_SOLT)
    );

    await AppUser.update(
      {
        pass_hash,
        modified_at: getLocalDate(),
        modified_by: appUser.dataValues.id,
      },
      { where: { id: appUser.dataValues.id } }
    );
    const AfterUpdateappUser = await AppUser.findOne({
      where: { id: req.body.session_res.id_app_user },
    });
    await addActivityLogs([{
      old_data: { user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues}},
      new_data: {nuser_id: AfterUpdateappUser?.dataValues?.id, data: {...AfterUpdateappUser?.dataValues} }
    }], appUser?.dataValues?.id,LogsActivityType.ChangePassword, LogsType.Auth, req?.body?.session_res?.id_app_user)
            
    return resSuccess();
  } catch (e) {
    throw e;
  }
};

export const forgotPassword = async (req: Request) => {
  try {
    
    const appUser = await AppUser.findOne({
      where: { username: req.body.username, is_deleted: DeletedStatus.No },
    });
    if (!appUser) {
      return resBadRequest({ message: USER_NOT_FOUND });
    }

    let name;
    if (appUser.dataValues.user_type === USER_TYPE.BusinessUser) {
      const businessUser = await BusinessUser.findOne({
        where: { id_app_user: appUser.dataValues.id },
      });
      if (!(businessUser && businessUser.dataValues)) {
        return resBadRequest({ message: USER_NOT_FOUND });
      }
      name = businessUser.dataValues.name;
    } else if (appUser.dataValues.user_type === USER_TYPE.Customer) {
      const customer = await CustomerUser.findOne({
        where: { id_app_user: appUser.dataValues.id },
      });
      if (!(customer && customer.dataValues)) {
        return resBadRequest({ message: USER_NOT_FOUND });
      }

      const customerUserFind = await CustomerUser.findOne({
        where: { id_app_user: appUser.dataValues.id, sign_up_type: { [Op.ne]: SIGN_UP_TYPE.System } },
      })
      if (customerUserFind && customerUserFind.dataValues) {
        return resNotFound({ message: prepareMessageFromParams(RESET_PASSWORD_TYPE_WRONG_ERROR_MESSAGE, [["field_name", customerUserFind.dataValues.sign_up_type]]) });
      }
      name = customer.dataValues.full_name;
    }

    const token = createResetToken(appUser.dataValues.id);

    const configData =  await getWebSettingData();
    let link = `${configData.fronted_base_url}/${configData.reset_pass_url}${token}`;
    let logo_image = configData.image_base_url;
    let frontend_url = configData.fronted_base_url;
    const mailPayload = {
      toEmailAddress: appUser.dataValues.username,
      contentTobeReplaced: { name, link, logo_image, frontend_url },
    };
    await mailPasswordResetLink(mailPayload);

    await AppUser.update(
      {
        pass_reset_token: token,
        modified_date: getLocalDate(),
        modified_by: appUser.dataValues.id,
      },
      { where: { id: appUser.dataValues.id } }
    );
    const AfterUpdateappUser = await AppUser.findOne({
      where: { id: req.body.session_res.id_app_user },
    });
    await addActivityLogs([{
      old_data: { user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues}},
      new_data: {
        user_id: AfterUpdateappUser?.dataValues?.id, data: {...AfterUpdateappUser?.dataValues} 
      }
    }], appUser?.dataValues?.id,LogsActivityType.ForgotPassword, LogsType.Auth, appUser?.dataValues?.id)
         
    return resSuccess();
  } catch (e) {
    throw e;
  }
};

export const resetPassword = async (req: Request) => {
  try {
    const tokenRes = await verifyJWT(req.body.token);
    if (tokenRes.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return tokenRes;
    }
    const appUser = await AppUser.findOne({
      where: { id: tokenRes.data.id },
    });
    if (!appUser) {
      return resUnprocessableEntity({ message: USER_NOT_FOUND });
    }

    if (appUser.dataValues.pass_reset_token !== req.body.token) {
      return resUnprocessableEntity({ message: INVALID_TOKEN });
    }

    const pass_hash = await bcrypt.hash(
      req.body.new_password,
      Number(PASSWORD_SOLT)
    );

    await AppUser.update(
      {
        pass_hash,
        pass_reset_token: null,
        modified_date: getLocalDate(),
        modified_by: appUser.dataValues.id,
      },
      { where: { id: appUser.dataValues.id } }
    );
    const AfterUpdateappUser = await AppUser.findOne({
          where: { id: appUser.dataValues.id },
    });
    await addActivityLogs([{
      old_data: { user_id: appUser?.dataValues?.id, data: {...appUser?.dataValues}},
      new_data: {user_id: appUser?.dataValues?.id, data: {...AfterUpdateappUser?.dataValues}}
    }], appUser?.dataValues?.id,LogsActivityType.ResetPassword, LogsType.Auth, tokenRes.data.id)
         
    return resSuccess();
  } catch (e) {
    throw e;
  }
};

export const changeAnyUserPassword = async (req: Request) => {
  try {
    const { id_app_user, new_password, session_res } = req.body;

    const loginedUser = await AppUser.findOne({
      where: { id: req.body.session_res.id_app_user, is_deleted: DeletedStatus.No },
    });

    if (!(loginedUser && loginedUser.dataValues)) {
      return resNotFound({
        message: prepareMessageFromParams(ERROR_NOT_FOUND, [
          ["field_name", "Login User"],
        ]),
      });    
    }


    const userToUpdate = await AppUser.findOne({
      where: { id: id_app_user, is_deleted: DeletedStatus.No  },
    });

    if (!(userToUpdate && userToUpdate.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    const pass_hash = await bcrypt.hash(new_password, Number(PASSWORD_SOLT));

    await AppUser.update(
      {
        pass_hash,
        modified_at: getLocalDate(),
        modified_by: session_res.id_app_user,
      },
      { where: { id: userToUpdate.dataValues.id } }
    );

    const AfterUpdateappUser = await AppUser.findOne({
      where: { id: id_app_user },
    });
    await addActivityLogs([{
      old_data: { user_id: userToUpdate?.dataValues?.id, data: {...userToUpdate?.dataValues}},
      new_data: {
        user_id: userToUpdate?.dataValues?.id, data: {...AfterUpdateappUser?.dataValues}
      }
    }], userToUpdate?.dataValues?.id,LogsActivityType.ChangeAnyUserPassword, LogsType.Auth, session_res?.id_app_user)
         
    return resSuccess();
  } catch (e) {
    throw e;
  }
};

export const fetchConfigurationByKey = async (key: string) => {
  try {
    const config = await SystemConfiguration.findOne({
      where: { config_key: key },
    });
    if (config && config.dataValues) {
      return resSuccess({ data: config });
    }
    return resNotFound();
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

export const registerCustomerUser = async (req: Request) => {
  try {
    const {
      full_name,
      username,
      mobile,
      password,
      country_id,
      confirm_password,
    } = req.body;
   
    const configData = await getWebSettingData()
    const digits = "0123456789";    
    let OTP = "";
    for (let i = 0; i < configData.otp_generate_digit_count; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }

    const trn = await dbContext.transaction();
    try {
      const pass_hash = await bcrypt.hash(password, Number(PASSWORD_SOLT));

      const emailExists = await CustomerUser.findOne({
        where: [columnValueLowerCase("email", username), { is_deleted: DeletedStatus.No }],
      });
      const emailIdExists = await AppUser.findOne({
        where: [
          columnValueLowerCase("username", username),
          { is_deleted: DeletedStatus.No },
        ],
      });

      if (emailExists == null && emailIdExists == null) {
        const appUserPayload = await AppUser.create(
          {
            username: username,
            pass_hash: pass_hash,
            user_type: USER_TYPE.Customer,
            user_status: USER_STATUS.PendingVerification,
            is_email_verified: 0,
            created_date: getLocalDate(),
            id_role: 3,
            one_time_pass: OTP,
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
          },
          { transaction: trn }
        );

        const CustomerUserPayload = await CustomerUser.create(
          {
            full_name: full_name,
            email: username,
            id_app_user: appUserPayload.dataValues.id,
            mobile: mobile,
            country_id: country_id,
            created_date: getLocalDate(),
            created_by: appUserPayload.dataValues.id,
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
          },
          { transaction: trn }
        );
        await addActivityLogs([{
          old_data: null,
          new_data: {
            app_user_id: appUserPayload?.dataValues?.id,
            app_user_data: appUserPayload?.dataValues,
            customer_user_id: CustomerUserPayload?.dataValues?.id,
            customer_user_data: CustomerUserPayload?.dataValues,
            detail_json: req?.body?.detail_json || {}
          }
        }], appUserPayload?.dataValues?.id, LogsActivityType.CustomerRegister, LogsType.Auth, appUserPayload?.dataValues?.id,trn)         
        
        await trn.commit();
        const mailPayload = {
          toEmailAddress: username,
          contentTobeReplaced: { name: full_name, OTP },
        };
        await mailRegistrationOtp(mailPayload);
        if (
          CustomerUserPayload &&
          CustomerUserPayload.dataValues &&
          CustomerUserPayload.dataValues.country_id == "+91" &&
          configData.whats_app_send_message_status.toString() == "true"
        ) {
          await sendMessageInWhatsApp(
            OTP,
            CustomerUserPayload.dataValues.mobile,
            configData
          );
        }
       return resSuccess({ data: CustomerUserPayload });
      } else {
        await trn.rollback();
        return resErrorDataExit();
      }
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (e) {
    throw e;
  }
};

export const registrationCustomerUserWithThirdParty = async (req: Request) => {
  try {
    const { sign_up_type } = req.body;

    if (sign_up_type === SIGN_UP_TYPE.System) {
      return customerRegistrationWithSystem(req);
    } else if (sign_up_type === SIGN_UP_TYPE.Google) {
      return customerRegistrationWithGoogle(req);
    }  else if (sign_up_type === SIGN_UP_TYPE.Facebook) {
      return customerRegistrationWithFacebook(req);
    }  else if (sign_up_type === SIGN_UP_TYPE.CadcoPanel) {
      return customerRegistrationWithCadcoPanel(req);
    } 
  } catch (e) {
    throw e;
  }
};

const customerRegistrationWithSystem = async (req: Request) => {
  try {
    const { full_name, username, mobile, password, country_id, sign_up_type } =
      req.body;
      
    const configData = await getWebSettingData()
    const digits = "0123456789";
    let OTP = "";
    for (let i = 0; i < configData.otp_generate_digit_count; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }

    const trn = await dbContext.transaction();
    try {
      const pass_hash = await bcrypt.hash(password, Number(PASSWORD_SOLT));

      const emailExists = await CustomerUser.findOne({
        where: [
          columnValueLowerCase("email", username),
          { is_deleted: DeletedStatus.No },
        ],
        transaction: trn,
      });

      if (emailExists && emailExists.dataValues) {
        await trn.rollback();
        return resErrorDataExit({
          message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
            ["field_name", "email"],
          ]),
        });
      }
      // if (emailExists && emailExists.dataValues) {
      //   const emailExistsWithSameSigUpType: any = await .query(
      //     `(SELECT * FROM public.customer_users
      //       WHERE '${SING_UP_TYPE.System}' = ANY (sign_up_type)
      //       AND is_deleted = '${DeletedStatus.No}' AND id = '${emailExists.dataValues.id}')`,
      //     { type: QueryTypes.SELECT, transaction: trn }
      //   );

      //   if (
      //     emailExistsWithSameSigUpType &&
      //     emailExistsWithSameSigUpType.length > 0
      //   ) {
      //     await trn.rollback();
      //     return resErrorDataExit({
      //       message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
      //         ["field_name", "email"],
      //       ]),
      //     });
      //   }
      // }

      const emailIdExists = await AppUser.findOne({
        where: [
          columnValueLowerCase("username", username),
          // emailExists && emailExists.dataValues
          //   ? { id: { [Op.ne]: emailExists.dataValues.id_app_user } }
          //   : 
          { is_deleted: DeletedStatus.No },
        ],
        transaction: trn,
      });
      if (emailIdExists && emailIdExists.dataValues) {
        if (emailIdExists.dataValues.user_type != USER_TYPE.Customer && emailIdExists.dataValues.user_type != USER_TYPE.Guest) {
          await trn.rollback();
          return resErrorDataExit({
            message: EMAIL_ALREADY_EXIST_IN_ADMIN,
          });
        } else {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }
        
      }
      const phoneNumberExists = await CustomerUser.findOne({
        where: [
          { mobile: mobile },
          { is_deleted: DeletedStatus.No },
          // emailExists && emailExists.dataValues
          //   ? { id: { [Op.ne]: emailExists.dataValues.id } }
          //   : 
        ],
        transaction: trn,
      });

      if (phoneNumberExists && phoneNumberExists.dataValues) {
        await trn.rollback();
        return resErrorDataExit({
          message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
            ["field_name", "Phone number"],
          ]),
        });
      }
      const currentDate = getLocalDate(); // Get current time
      const expireDate = new Date(currentDate.getTime() + OTP_EXPIRATION_TIME);
      const appUserPayload = await AppUser.create(
        {
          username: username,
          pass_hash: pass_hash,
          user_type: USER_TYPE.Customer,
          user_status: USER_STATUS.PendingVerification,
          is_email_verified: 0,
          created_date: getLocalDate(),
          id_role: CUSTOMER_USER_ROLE_ID,
          one_time_pass: OTP,
          otp_create_date: currentDate,
          otp_expire_date: expireDate,
          is_active: ActiveStatus.Active,
          is_deleted: DeletedStatus.No,
        },
        { transaction: trn }
      );

      const CustomerUserPayload = await CustomerUser.create(
        {
          full_name: full_name,
          email: username,
          id_app_user: appUserPayload.dataValues.id,
          mobile: mobile,
          country_id: country_id,
          created_date: getLocalDate(),
          created_by: appUserPayload.dataValues.id,
          is_active: ActiveStatus.Active,
          sign_up_type: SIGN_UP_TYPE.System,
          is_deleted: DeletedStatus.No,
        },
        { transaction: trn }
      );

      const mailPayload = {
        toEmailAddress: username,
        contentTobeReplaced: { name: full_name, OTP },
      };
      await mailRegistrationOtp(mailPayload);
      if (
        CustomerUserPayload &&
        CustomerUserPayload.dataValues &&
        CustomerUserPayload.dataValues.country_id == "+91" &&
        configData.whats_app_send_message_status.toString() == "true"
      ) {
        await sendMessageInWhatsApp(OTP, CustomerUserPayload.dataValues.mobile, configData);
      }

        await addActivityLogs(
        [{
          old_data: null,
          new_data: {
            app_user_id: appUserPayload?.dataValues?.id,
            app_user_data: {
              ...appUserPayload?.dataValues
            },
            customer_user_id: appUserPayload?.dataValues?.id,
            customer_user_data:{
              ...CustomerUserPayload?.dataValues
            }
          }
        }], appUserPayload?.dataValues?.id, LogsActivityType.customerRegistrationWithSystem, LogsType.Customer, appUserPayload?.dataValues?.id,trn)         
      await trn.commit();
      return resSuccess({ data: CustomerUserPayload });
    } catch (e) {

      await trn.rollback();
      throw e;
    }
  } catch (error) {
    return resUnprocessableEntity({ data: error });
  }
};

const customerRegistrationWithGoogle = async (req: Request) => {
  try {
    const {
      full_name,
      username,
      mobile,
      country_id,
      third_party_response,
      token,
    } = req.body;
    const trn = await dbContext.transaction();
    try {
      const emailExists = await CustomerUser.findOne({
        where: [
          columnValueLowerCase("email", username),
          { is_deleted: DeletedStatus.No },
        ],
        transaction: trn,
      });

      if(emailExists && emailExists.dataValues && emailExists.dataValues.is_active == ActiveStatus.InActive){
        return resNotFound({ message: USER_DISABLED_ERROR_MESSAGE });
      }

      if (!emailExists) {
        const findAppUser = await AppUser.findOne({
          where: [
            columnValueLowerCase("username", username),
            { is_deleted: DeletedStatus.No },
          ],
        });

        if (findAppUser && findAppUser.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }
        const appUserPayload = await AppUser.create(
          {
            username: username,
            user_type: USER_TYPE.Customer,
            user_status: USER_STATUS.Approved,
            is_email_verified: 1,
            created_date: getLocalDate(),
            id_role: CUSTOMER_USER_ROLE_ID,
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,

          },
          { transaction: trn }
        );

        const CustomerUserPayload = await CustomerUser.create(
          {
            full_name: full_name,
            email: username,
            id_app_user: appUserPayload.dataValues.id,
            country_id: country_id,
            created_date: getLocalDate(),
            created_by: appUserPayload.dataValues.id,
            is_active: ActiveStatus.Active,
            sign_up_type: SIGN_UP_TYPE.Google,
            third_party_response: third_party_response,
            is_deleted: DeletedStatus.No,
          },
          { transaction: trn }
        );

        const configData =  await getWebSettingData();
        let logo_image = configData.image_base_url;
        let frontend_url = configData.fronted_base_url;

        const mailPayload = {
          toEmailAddress: CustomerUserPayload.dataValues.email,
          contentTobeReplaced: {
            full_name: CustomerUserPayload?.dataValues.full_name,
            logo_image,
            frontend_url,
          },
        };
        await successRegistration(mailPayload);
        const jwtPayload = {
          id: appUserPayload && appUserPayload.dataValues.id,
          id_app_user: appUserPayload.dataValues.id,
          user_type: appUserPayload.dataValues.user_type,
          id_role: appUserPayload.dataValues.id_role,
        };

        const data = createUserJWT(
          appUserPayload.dataValues.id,
          jwtPayload,
          appUserPayload.dataValues.user_type
        );
        const userDetails = await CustomerUser.findOne({
          where: { id_app_user: appUserPayload.dataValues.id, is_deleted: DeletedStatus.No },
          attributes: [
            "id",
            "full_name",
            "email",
            "mobile",
            "country_id",
            "id_app_user",
            "created_date",
            [Sequelize.literal("image.image_path"), "image_path"],
          ],
          include: [{ model: Image, as: "image", attributes: [] }],
        });

        await addActivityLogs(
          [{
          old_data: null,
          new_data: {
            app_user_id: appUserPayload?.dataValues?.id,
            app_user_data: {
              ...appUserPayload?.dataValues
            },
            customer_user_id: CustomerUserPayload?.dataValues?.id,
            customer_user_data:{
              ...CustomerUserPayload?.dataValues
            },
            detail_json: req?.body?.detail_json || {},
            token: data,
          }
        }], appUserPayload?.dataValues?.id, LogsActivityType.customerRegistrationWithGoogle, LogsType.Auth, appUserPayload?.dataValues?.id,trn)     
        await trn.commit();
        
        return resSuccess({ data: { tokens: data, user_detail: userDetails } });
      } else {
        const sameEmailFind = await CustomerUser.findOne({
          where: {
            sign_up_type: { [Op.eq]: SIGN_UP_TYPE.System },
            id: { [Op.eq]: emailExists.dataValues.id },
          },
        });

        if (sameEmailFind && sameEmailFind.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }

        const findAppUser = await AppUser.findOne({
          where: [
            { id: { [Op.ne]: emailExists.dataValues.id_app_user } },
            columnValueLowerCase("username", username),
            { is_deleted: DeletedStatus.No },
          ],
        });

        if (findAppUser && findAppUser.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }

        const beforUpdateAppUser = await AppUser.findOne({
          where: { id: emailExists.dataValues.id_app_user },
        });

        const CustomerUserPayload = await CustomerUser.update(
          {
            full_name: full_name,
            third_party_response: third_party_response,
            is_deleted: DeletedStatus.No,
          },
          { where: { id: emailExists.dataValues.id }, transaction: trn }
        );

        const updateUserDetail = await CustomerUser.findOne({
          where: { id: emailExists.dataValues.id },
        });

        const appUser = await AppUser.findOne({
          where: { id: emailExists.dataValues.id_app_user },
        });
        const jwtPayload = {
          id: appUser && appUser.dataValues.id,
          id_app_user: appUser.dataValues.id,
          user_type: appUser.dataValues.user_type,
          id_role: appUser.dataValues.id_role,
        };

        const data = createUserJWT(
          appUser.dataValues.id,
          jwtPayload,
          appUser.dataValues.user_type
        );
        await addActivityLogs(
          [{
          old_data: { app_user_id: beforUpdateAppUser?.dataValues?.id,
            app_user_data: {
              ...beforUpdateAppUser?.dataValues
            },
            customer_user_id: emailExists?.dataValues?.id,
            customer_user_data:{
              ...emailExists?.dataValues
            }},
          new_data: {
            app_user_id: appUser?.dataValues?.id,
            app_user_data: {
              ...appUser?.dataValues
            },
            customer_user_id: updateUserDetail?.dataValues?.id,
            customer_user_data:{
              ...updateUserDetail?.dataValues
            },
            detail_json: req?.body?.detail_json || {},
            token: data
          }
        }], appUser?.dataValues?.id, LogsActivityType.AllReadyExistcustomerRegistrationWithGoogle,LogsType.Auth, beforUpdateAppUser?.dataValues?.id,trn)         
        await trn.commit();
     
        return resSuccess({ data: { tokens: data, user_detail: emailExists } });
      }
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (error) {
    return resUnprocessableEntity({ data: error });
  }
};

const customerRegistrationWithFacebook = async (req: Request) => {
  try {
    const {
      full_name,
      username,
      mobile,
      country_id,
      third_party_response,
      token,
    } = req.body;
    const trn = await dbContext.transaction();
    try {
      const emailExists = await CustomerUser.findOne({
        where: [
          columnValueLowerCase("email", username),
          { is_deleted: DeletedStatus.No },
        ],
        transaction: trn,
      });

      if(emailExists && emailExists.dataValues && emailExists.dataValues.is_active == ActiveStatus.InActive){
        return resNotFound({ message: USER_DISABLED_ERROR_MESSAGE });
      }

      if (!emailExists) {
        const findAppUser = await AppUser.findOne({
          where: [
            columnValueLowerCase("username", username),
            { is_deleted: DeletedStatus.No },
          ],
        });

        if (findAppUser && findAppUser.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }
        const appUserPayload = await AppUser.create(
          {
            username: username,
            user_type: USER_TYPE.Customer,
            user_status: USER_STATUS.Approved,
            is_email_verified: 1,
            created_date: getLocalDate(),
            id_role: CUSTOMER_USER_ROLE_ID,
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,

          },
          { transaction: trn }
        );

        const CustomerUserPayload = await CustomerUser.create(
          {
            full_name: full_name,
            email: username,
            id_app_user: appUserPayload.dataValues.id,
            country_id: country_id,
            created_date: getLocalDate(),
            created_by: appUserPayload.dataValues.id,
            is_active: ActiveStatus.Active,
            sign_up_type: SIGN_UP_TYPE.Facebook,
            third_party_response: third_party_response,
            is_deleted: DeletedStatus.No,
          },
          { transaction: trn }
        );

        await trn.commit();
        const configData =  await getWebSettingData();
        let logo_image = configData.image_base_url;
        let frontend_url = configData.fronted_base_url;

        const mailPayload = {
          toEmailAddress: CustomerUserPayload.dataValues.email,
          contentTobeReplaced: {
            full_name: CustomerUserPayload?.dataValues.full_name,
            logo_image,
            frontend_url,
          },
        };
        await successRegistration(mailPayload);
        const jwtPayload = {
          id: appUserPayload && appUserPayload.dataValues.id,
          id_app_user: appUserPayload.dataValues.id,
          user_type: appUserPayload.dataValues.user_type,
          id_role: appUserPayload.dataValues.id_role,
        };

        const data = createUserJWT(
          appUserPayload.dataValues.id,
          jwtPayload,
          appUserPayload.dataValues.user_type
        );
        const userDetails = await CustomerUser.findOne({
          where: { id_app_user: appUserPayload.dataValues.id, is_deleted: DeletedStatus.No },
          attributes: [
            "id",
            "full_name",
            "email",
            "mobile",
            "country_id",
            "id_app_user",
            "created_date",
            [Sequelize.literal("image.image_path"), "image_path"],
          ],
          include: [{ model: Image, as: "image", attributes: [] }],
        });
        await addActivityLogs(
          [{
          old_data: null,
          new_data: {
            app_user_id: appUserPayload?.dataValues?.id,
            app_user_data: {
              ...appUserPayload?.dataValues
            },
            customer_user_id: CustomerUserPayload?.dataValues?.id,
            customer_user_data:{
              ...CustomerUserPayload?.dataValues
            },
            detail_json: req?.body?.detail_json || {},
            token: data
          }
        }], appUserPayload?.dataValues?.id, LogsActivityType.customerRegistrationWithGoogle, LogsType.Auth, appUserPayload?.dataValues?.id,trn)   
        return resSuccess({ data: { tokens: data, user_detail: userDetails } });
      } else {
        const sameEmailFind = await CustomerUser.findOne({
          where: {
            sign_up_type: { [Op.ne]: SIGN_UP_TYPE.Facebook },
            id: { [Op.eq]: emailExists.dataValues.id },
          },
        });

        if (sameEmailFind && sameEmailFind.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }

        const findAppUser = await AppUser.findOne({
          where: [
            { id: { [Op.ne]: emailExists.dataValues.id_app_user } },
            columnValueLowerCase("username", username),
            { is_deleted: DeletedStatus.No },
          ],
        });

        if (findAppUser && findAppUser.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }

        const beforUpdateAppUser = await AppUser.findOne({
          where: { id: emailExists.dataValues.id_app_user },
        });

        const CustomerUserPayload = await CustomerUser.update(
          {
            full_name: full_name,
            third_party_response: third_party_response,
            is_deleted: DeletedStatus.No,
          },
          { where: { id: emailExists.dataValues.id }, transaction: trn }
        );

        const updateUserDetail = await CustomerUser.findOne({
          where: { id: emailExists.dataValues.id },
        });

        const appUser = await AppUser.findOne({
          where: { id: emailExists.dataValues.id_app_user },
        });
        const jwtPayload = {
          id: appUser && appUser.dataValues.id,
          id_app_user: appUser.dataValues.id,
          user_type: appUser.dataValues.user_type,
          id_role: appUser.dataValues.id_role,
        };

        const data = createUserJWT(
          appUser.dataValues.id,
          jwtPayload,
          appUser.dataValues.user_type
        );
        await addActivityLogs(
          [{  
          old_data: { app_user_id: beforUpdateAppUser?.dataValues?.id,
            app_user_data: {
              ...beforUpdateAppUser?.dataValues
            },
            customer_user_id: emailExists?.dataValues?.id,
            customer_user_data:{
              ...emailExists?.dataValues
            }},
          new_data: {
            app_user_id: appUser?.dataValues?.id,
            app_user_data: {
              ...appUser?.dataValues
            },
            customer_user_id: updateUserDetail?.dataValues?.id,
            customer_user_data:{
              ...updateUserDetail?.dataValues
            },
            detail_json: req?.body?.detail_json || {},
            token: data
          }
        }], appUser?.dataValues?.id, LogsActivityType.AllReadyExistcustomerRegistrationWithGoogle,LogsType.Auth, beforUpdateAppUser?.dataValues?.id,trn)         
        await trn.commit();
     
        return resSuccess({ data: { tokens: data, user_detail: emailExists } });
      }
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (error) {
    return resUnprocessableEntity({ data: error });
  }
};

const customerRegistrationWithCadcoPanel = async (req: Request) => {
  try {
    const {
      username,
      password,
    } = req.body;
    const trn = await dbContext.transaction();
    try {
      const emailExists = await CustomerUser.findOne({
        where: [
          columnValueLowerCase("email", username),
          { is_deleted: DeletedStatus.No },
        ],
        transaction: trn,
      });
      if(emailExists && emailExists.dataValues && emailExists.dataValues.is_active == ActiveStatus.InActive){
        return resNotFound({ message: USER_DISABLED_ERROR_MESSAGE });
      }
      const cadcoLoginApI = await LoginWithCadcoPanelUsingAPI(username, password)

        if (cadcoLoginApI.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return cadcoLoginApI;
        } 

        if (cadcoLoginApI.data?.error) {
            await trn.rollback();
            return resErrorDataExit({
              message: cadcoLoginApI.data?.messages,
            });
          }
      if (!emailExists && cadcoLoginApI.code == DEFAULT_STATUS_CODE_SUCCESS && cadcoLoginApI.data?.status == 200 && cadcoLoginApI.data?.error == false) {
        const findAppUser = await AppUser.findOne({
          where: [
            columnValueLowerCase("username", username),
            { is_deleted: DeletedStatus.No },
          ],
        });

        if (findAppUser && findAppUser.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }

        const appUserPayload = await AppUser.create(
          {
            username: username,
            user_type: USER_TYPE.Customer,
            user_status: USER_STATUS.Approved,
            is_email_verified: 1,
            created_date: getLocalDate(),
            id_role: CUSTOMER_USER_ROLE_ID,
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
          },
          { transaction: trn }
        );

        const CustomerUserPayload = await CustomerUser.create(
          {
            full_name: cadcoLoginApI.data?.data?.name + " " + cadcoLoginApI.data?.data?.last_name,
            email: username,
            id_app_user: appUserPayload.dataValues.id,
            country_id: null,
            created_date: getLocalDate(),
            created_by: appUserPayload.dataValues.id,
            is_active: ActiveStatus.Active,
            sign_up_type: SIGN_UP_TYPE.CadcoPanel,
            third_party_response: cadcoLoginApI.data,
            is_deleted: DeletedStatus.No,
          },
          { transaction: trn }
        );

        await trn.commit();
        const configData =  await getWebSettingData();
        let logo_image = configData.image_base_url;
        let frontend_url = configData.fronted_base_url;

        const mailPayload = {
          toEmailAddress: CustomerUserPayload.dataValues.email,
          contentTobeReplaced: {
            full_name: CustomerUserPayload?.dataValues.full_name,
            logo_image,
            frontend_url,
          },
        };
        await successRegistration(mailPayload);
        const jwtPayload = {
          id: appUserPayload && appUserPayload.dataValues.id,
          id_app_user: appUserPayload.dataValues.id,
          user_type: appUserPayload.dataValues.user_type,
          id_role: appUserPayload.dataValues.id_role,
        };

        const data = createUserJWT(
          appUserPayload.dataValues.id,
          jwtPayload,
          appUserPayload.dataValues.user_type
        );
        const userDetails = await CustomerUser.findOne({
          where: { id_app_user: appUserPayload.dataValues.id, is_deleted: DeletedStatus.No },
          attributes: [
            "id",
            "full_name",
            "email",
            "mobile",
            "country_id",
            "id_app_user",
            "created_date",
            [Sequelize.literal("image.image_path"), "image_path"],
          ],
          include: [{ model: Image, as: "image", attributes: [] }],
        });
        await addActivityLogs(
          [{
          old_data: null,
          new_data: {
            app_user_id: appUserPayload?.dataValues?.id,
            app_user_data: {
              ...appUserPayload?.dataValues
            },
            customer_user_id: CustomerUserPayload?.dataValues?.id,
            customer_user_data:{
              ...CustomerUserPayload?.dataValues
            },
            detail_json: req?.body?.detail_json || {},
            token: data,
          }
        }], appUserPayload?.dataValues?.id, LogsActivityType.customerRegistrationWithGoogle, LogsType.Auth, appUserPayload?.dataValues?.id,trn)   
        return resSuccess({ data: { tokens: data, user_detail: userDetails } });
      } else {
        const sameEmailFind = await CustomerUser.findOne({
          where: {
            sign_up_type: { [Op.ne]: SIGN_UP_TYPE.CadcoPanel },
            id: { [Op.eq]: emailExists.dataValues.id },
          },
        });

        if (sameEmailFind && sameEmailFind.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }

        const findAppUser = await AppUser.findOne({
          where: [
            { id: { [Op.ne]: emailExists.dataValues.id_app_user } },
            columnValueLowerCase("username", username),
            { is_deleted: DeletedStatus.No },
          ],
        });

        if (findAppUser && findAppUser.dataValues) {
          await trn.rollback();
          return resErrorDataExit({
            message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
              ["field_name", "email"],
            ]),
          });
        }

        const beforUpdateAppUser = await AppUser.findOne({
          where: { id: emailExists.dataValues.id_app_user },
        });

        const CustomerUserPayload = await CustomerUser.update(
          {
            full_name: cadcoLoginApI.data?.data?.name + " " + cadcoLoginApI.data?.data?.last_name,
            password: password,
            third_party_response: cadcoLoginApI.data,
            is_deleted: DeletedStatus.No,
          },
          { where: { id: emailExists.dataValues.id }, transaction: trn }
        );

        const updateUserDetail = await CustomerUser.findOne({
          where: { id: emailExists.dataValues.id },
        });

        const appUser = await AppUser.findOne({
          where: { id: emailExists.dataValues.id_app_user },
        });
        const jwtPayload = {
          id: appUser && appUser.dataValues.id,
          id_app_user: appUser.dataValues.id,
          user_type: appUser.dataValues.user_type,
          id_role: appUser.dataValues.id_role,
        };

        const data = createUserJWT(
          appUser.dataValues.id,
          jwtPayload,
          appUser.dataValues.user_type
        );
        await addActivityLogs(
          [{
          old_data: { app_user_id: beforUpdateAppUser?.dataValues?.id,
            app_user_data: {
              ...beforUpdateAppUser?.dataValues
            },
            customer_user_id: emailExists?.dataValues?.id,
            customer_user_data:{
              ...emailExists?.dataValues
            }},
          new_data: {
            app_user_id: appUser?.dataValues?.id,
            app_user_data: {
              ...appUser?.dataValues
            },
            customer_user_id: updateUserDetail?.dataValues?.id,
            customer_user_data:{
              ...updateUserDetail?.dataValues
            },
            detail_json: req?.body?.detail_json || {},
            token: data
          }
        }], appUser?.dataValues?.id, LogsActivityType.AllReadyExistcustomerRegistrationWithGoogle,LogsType.Auth, beforUpdateAppUser?.dataValues?.id,trn)         
        await trn.commit();
     
        return resSuccess({ data: { tokens: data, user_detail: emailExists } });
      }
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (error) {
    return resUnprocessableEntity({ data: error });
  }
};

export const customerRegisterOtpVerified = async (req: Request) => {
  try {
    const { remember_me = false } = req.body;
    const userData = await AppUser.findOne({
      where: { id: req.body.id, is_deleted: DeletedStatus.No },
    });

    if (!(userData && userData.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }
    if (userData.dataValues.one_time_pass === req.body.OTP) {
      if (
        userData.dataValues.otp_create_date &&
        userData.dataValues.otp_expire_date
      ) {
        if (
          !(
            getLocalDate() >= userData.dataValues.otp_create_date &&
            getLocalDate() <= userData.dataValues.otp_expire_date
          )
        ) {
          return resBadRequest({
            code: RESOURCE_EXPIRED_STATUS_CODE,
            message: OTP_EXPIRATION_MESSAGE,
          });
        }
      }

      await AppUser.update(
        {
          user_status: USER_STATUS.Approved,
          is_email_verified: 1,
          approved_date: getLocalDate(),
          modified_date: getLocalDate(),
        },

        { where: { id: userData.dataValues.id, is_deleted: DeletedStatus.No } }
      );

      const jwtPayload = {
        id: userData && userData.dataValues.id,
        id_app_user: userData.dataValues.id,
        user_type: userData.dataValues.user_type,
        id_role: userData.dataValues.id_role
      };

      const data = createUserJWT(
        userData.dataValues.id,
        jwtPayload,
        remember_me && remember_me == true ? 5 : userData.dataValues.user_type
      );
      const userDetails = await CustomerUser.findOne({
        where: { id_app_user: userData.dataValues.id, is_deleted: DeletedStatus.No },
        attributes: [
          "id",
          "full_name",
          "email",
          "mobile",
          "country_id",
          "id_app_user",
          "created_date",
          "sign_up_type",
          "third_party_response",
          "gender",
          [Sequelize.literal("image.image_path"), "image_path"],
        ],
        include: [{ model: Image, as: "image", attributes: [] }],
      });
      const configData =  await getWebSettingData();
      let logo_image = configData.image_base_url;
      let frontend_url = configData.fronted_base_url;

      if (userDetails.dataValues.user_status != USER_STATUS.Approved) {
        const mailPayload = {
          toEmailAddress: userData.dataValues.username,
          contentToBeReplaced: {
            full_name: userDetails?.dataValues.full_name,
            logo_image,
            frontend_url,
          },
        };
      await successRegistration(mailPayload);
      }
      await addActivityLogs(
        [{
        old_data: null,
        new_data: {
          app_user_id: userData?.dataValues?.id,
          app_user_data: {
            ...userData?.dataValues
          },
          customer_user_id: userDetails?.dataValues?.id,
          customer_user_data:{
            ...userDetails?.dataValues
          },
          detail_json: req?.body?.detail_json || {},
          token: data,
        }
      }], userData?.dataValues?.id, LogsActivityType.AllReadyExistcustomerRegistrationWithGoogle,LogsType.Auth, userData.dataValues.id)         
   
      return resSuccess({
        data: {
          tokens: data,
          user_detail: userDetails,
        },
      });
    } else {
      return resBadRequest({ message: INVALID_OTP });
    }
  } catch (error) {
    throw error;
  }
};

export const resendOtpVerification = async (req: Request) => {
  try {
    const userData:any = await AppUser.findOne({
      where: { id: req.body.id, is_deleted: DeletedStatus.No},
    });
    const customer = await CustomerUser.findOne({
      where: { id_app_user: userData?.dataValues.id, is_deleted: DeletedStatus.No },
    });
   
    if (userData) {
      const configWebData:any = await getWebSettingData()
      const digits = "0123456789";
      let OTP = "";
      for (let i = 0; i < (userData.dataValues.user_type == USER_TYPE.Administrator && userData.dataValues.is_super_admin == true ? 6  : configWebData.otp_generate_digit_count); i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }
      const currentDate = getLocalDate(); // Get current time
      const expireDate = new Date(currentDate.getTime() + OTP_EXPIRATION_TIME);
      await AppUser.update(
        {
          one_time_pass: OTP,
          otp_create_date: currentDate,
          otp_expire_date: expireDate,
        },

        { where: { id: userData.dataValues.id, is_deleted: DeletedStatus.No } }
      );

      const configData =  await getWebSettingData();
      const name = customer?.dataValues.full_name;
      let logo_image = configData.image_base_url;
      let frontend_url = configData.fronted_base_url;
      const mailPayload = {
        toEmailAddress: userData.dataValues.username,
        contentTobeReplaced: { name, OTP, logo_image, frontend_url },
      };

      await mailRegistrationOtp(mailPayload);
      if (
        userData.dataValues.user_type === USER_TYPE.Customer &&
        customer &&
        customer.dataValues &&
        customer.dataValues.country_id == "+91" &&
        configData.whats_app_send_message_status.toString() == "true"
      ) {
        await sendMessageInWhatsApp(OTP, customer.dataValues.mobile, configData);
      }

      const afterUpdateUserData = await AppUser.findOne({
        where: { id: req.body.id, is_deleted: DeletedStatus.No},
      });

      await addActivityLogs([{
        old_data: {
          app_user_id: userData?.dataValues?.id,
          app_user_data: {
            ...userData?.dataValues
          },
          customer_user_id: customer?.dataValues?.id,
          customer_user_data:{
            ...customer?.dataValues
          }
        },
        new_data: {
          app_user_id: afterUpdateUserData?.dataValues?.id,
          app_user_data: {
            ...afterUpdateUserData?.dataValues
          },
          customer_user_id: customer?.dataValues?.id,
          customer_user_data:{
            ...customer?.dataValues
          }, 
          detail_json: req?.body?.detail_json || {}
        }
      }], userData?.dataValues?.id, LogsActivityType.ResendOTPVerification,LogsType.Auth, userData?.dataValues?.id)         
    
      return resSuccess({data:{user_detail: {
            id: afterUpdateUserData?.dataValues?.id,
            username: afterUpdateUserData?.dataValues?.username,
            user_type: afterUpdateUserData?.dataValues?.user_type,
            id_role: afterUpdateUserData?.dataValues?.id_role,
            is_email_verified: afterUpdateUserData?.dataValues?.is_email_verified,
            is_super_admin: afterUpdateUserData?.dataValues?.is_super_admin,
            otp_create_date: afterUpdateUserData?.dataValues?.otp_create_date,
            otp_expire_date: afterUpdateUserData?.dataValues?.otp_expire_date,
            one_time_pass: afterUpdateUserData?.dataValues?.one_time_pass},
          id_role: userData.dataValues.id_role}});
    } else {
      return resNotFound({ message: USER_NOT_FOUND });
    }
  } catch (error) {
    throw error;
  }
};

export const getProfileForCustomer = async (req: Request) => {
  try {
    
    const data = await CustomerUser.findOne({
      where: {
        id_app_user: Number(req.params.id),
        is_deleted: DeletedStatus.No,
      },
      attributes: [
        "id",
        "full_name",
        "email",
        "mobile",
        "country_id",
        "id_app_user",
        "created_date",
        "gender",
        [Sequelize.literal("image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "image", attributes: [] }],
    });
    if (data) {
      return resSuccess({ data: data });
    } else {
      return resNotFound();
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
export const updateProfileForCustomer = async (req: Request) => {
  const { full_name, mobile, gender = null, country_id, id } = req.body;

  try {
    const CustomerId = await CustomerUser.findOne({
      where: { id: id, is_deleted: DeletedStatus.No },
    });

    if (CustomerId == null) {
      return resNotFound();
    }

    let id_image = null;
    let imagePath = null;

    if (req.file) {
      const moveFileResult = await moveFileToS3ByType(
        req.file,
        IMAGE_TYPE.profile  
      );

      if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return moveFileResult;
      }

      imagePath = moveFileResult.data;
    }

    const trn = await dbContext.transaction();
    try {
      if (imagePath) {
        const imageResult = await Image.create(
          {
            image_path: imagePath,
            image_type: IMAGE_TYPE.profile,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
          },
          { transaction: trn }
        );

        id_image = imageResult.dataValues.id;
      }

    
      const customerNumber = await CustomerUser.findOne({
        where: {
          mobile: mobile,
          id: { [Op.ne]: id },
          is_deleted: DeletedStatus.No,
        },
        transaction: trn,
      });

      if (customerNumber && customerNumber.dataValues) {
        await trn.rollback();
        return resErrorDataExit({
          message: prepareMessageFromParams(DATA_ALREADY_EXIST, [
            ["field_name", "mobile"],
          ]),
        });
      }
      const CustomerInfo = await CustomerUser.update(
        {
          full_name: full_name,
          mobile: mobile,
          country_id: country_id,
          gender: gender,
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
          id_image: id_image,
        },

        {
          where: { id: CustomerId.dataValues.id, is_deleted: DeletedStatus.No },
          transaction: trn,
        }
      );
      if (CustomerInfo) {
        const CustomerInformation = await CustomerUser.findOne({
          where: { id: id, is_deleted: DeletedStatus.No },
          transaction: trn,
        });
        await addActivityLogs([{
          old_data: { 
            customer_user_id: CustomerId?.dataValues?.id,
            customer_user_data:{
              ...CustomerId?.dataValues
            }},
            new_data: {
              customer_user_id: CustomerInformation?.dataValues?.id,
              customer_user_data:{
                ...CustomerInformation?.dataValues
              },
              detail_json: req?.body?.detail_json || {},
            }
          }], CustomerInformation?.dataValues?.id, LogsActivityType.CustomerInfoUpdate,LogsType.Auth, req?.body?.session_res?.id_app_user,trn)         
          
        await trn.commit();
        return resSuccess({ data: CustomerInformation });
      }
      await trn.commit();
      return resSuccess();
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (error) {
    throw error;
  }
};

// Start Admin Panel Menu Access & Permission API Management

export const addOrUpdateMenuItemWithPermission = async (req: Request) => {
    const { 
      id,  // The ID of the menu item to update (if provided)
      name, 
      id_parent_menu, 
      nav_path, 
      sort_order, 
      is_active, 
      icon,
      menu_location,
      roleApiPermissions  // Expected to be an array of role API permissions
    } = req.body;

    // Trim the name input to remove any extra spaces
    const trimmedName = name?.trim();

    let transaction:any;
    try {
       transaction = await dbContext.transaction();

        // Dynamically build the where condition using OR for `name` and `id`
      let whereCondition: any = {
        
        is_deleted: DeletedStatus.No,
      };

      // Add the name condition
      // Assuming `trimmedName` is already trimmed in JS
      whereCondition = {
        [Op.or]: [
          Sequelize.where(
            fn('TRIM', col('name')),
            {
              [Op.iLike]: trimmedName
            }
          )
        ]
      };

      // Add the id condition if `id` is provided
      if (id) {
        whereCondition[Op.or].push({
          id: id  // Check if `id` matches
        });
      }else{
        const menuItemExist:any = await MenuItem.findOne({
          where: whereCondition, transaction
        });
        if (menuItemExist) {
          await transaction.rollback()
          return resBadRequest({message:prepareMessageFromParams(DATA_ALREADY_EXIST, [["field_name",'Menu Name']])});
        }
      }

      // Now query the database with the dynamic where condition
      let menuItem:any = await MenuItem.findOne({
        where: whereCondition, transaction
      });
      if (!menuItem) {
        // If MenuItem does not exist, create it
        menuItem = await MenuItem.create(
          {
            name: trimmedName,  // Use trimmed name for creating
            id_parent_menu,
            nav_path,
            sort_order,
            is_active,
            menu_location,
            icon,
            created_by: req?.body?.session_res?.id_app_user, // Example: Replace with logged-in user's ID
            created_date: getLocalDate(),
          },
          { transaction }
        );

        await addActivityLogs(
          [{
          old_data: null,
          new_data: {
            menu_item_id: menuItem?.dataValues?.id,
            menu_item_data:{
              ...menuItem?.dataValues
            }
          }
        }], menuItem?.dataValues?.id, LogsActivityType.Add,LogsType.MenuItemWithPermission, req?.body?.session_res?.id_app_user,transaction)         
     
      } else {
        // If MenuItem exists, update it with the provided values
        menuItem = await menuItem.update(
          {
            name: trimmedName,
            id_parent_menu,
            nav_path,
            sort_order,
            is_active,
            menu_location,
            icon,
            modified_by: req?.body?.session_res?.id_app_user, // Example: Replace with logged-in user's ID
            modified_date:getLocalDate()
          },
          { transaction }
        );
        // Now query the database with the dynamic where condition
        let afterupdatemenuItem:any = await MenuItem.findOne({
          where: whereCondition
        });

        await addActivityLogs(
          [{
          old_data: { menu_item_id: menuItem?.dataValues?.id,menu_item_data:{...menuItem?.dataValues}},
          new_data: {
            menu_item_id: menuItem?.dataValues?.id,
            menu_item_data:{...afterupdatemenuItem?.dataValues}
          }
        }], menuItem?.dataValues?.id, LogsActivityType.Edit,LogsType.MenuItemWithPermission, req?.body?.session_res?.id_app_user,transaction)         
     
      }

      // Process Role API Permissions
      for (const permission of roleApiPermissions) {
        const { id_action, api_endpoint, http_method, is_active, is_deleted, id, master_type } = permission;
          // Validate actionName (Action name from the action table)
          let action:any = await Action.findOne({
            where: { id: id_action },
            transaction
          });

        if (!action) {
            await transaction.rollback()
            return resBadRequest({ message: `Invalid Action Name: ${id_action}` });
          }

        if (id) {
          // If `id` is provided, check for update or delete based on `is_deleted` flag
          const existingPermission = await RoleApiPermission.findOne({
            where: {
              id: id,
              id_menu_item: menuItem.id,  // Ensure it belongs to the current MenuItem
              
            },
            transaction
          });

          if (existingPermission) {
            if (is_deleted === DeletedStatus .yes) {
              // If `is_deleted` is 0, delete the permission
              await existingPermission.destroy({ transaction });
            } else if (is_deleted === DeletedStatus .No) {
              // If `is_deleted` is 1, update the permission
              await existingPermission.update(
                {
                  master_type:String(master_type),
                  id_action,
                  api_endpoint,
                  http_method,
                  is_active,
                },
                { transaction }
              );
            }
          }
           // If `id` is provided, check for update or delete based on `is_deleted` flag
           const AfterUpdateexistingPermission = await RoleApiPermission.findOne({
            where: {
              id: id,
              id_menu_item: menuItem.id,  // Ensure it belongs to the current MenuItem
            },
            transaction
          });
          await addActivityLogs([{
            old_data: { role_permission_id: existingPermission?.dataValues?.id, data: {...existingPermission?.dataValues} },
            new_data: {
              role_permission_id: AfterUpdateexistingPermission?.dataValues?.id, data: {...AfterUpdateexistingPermission?.dataValues}
            }
          }], existingPermission?.dataValues?.id, LogsActivityType.Edit, LogsType.MenuItemWithPermission, req?.body?.session_res?.id_app_user,transaction)
   
        } else {
      
          // Create only if it's a valid permission (is_deleted should not be 0 for a new permission)
          const RoleApiPermissionData = await RoleApiPermission.create(
            {
              id_menu_item: menuItem.id,
              master_type:String(master_type),
              id_action,
              api_endpoint,
              http_method,
              is_active,
              
            },
            { transaction }
          );
          
          await addActivityLogs([{
            old_data: null,
            new_data: {
              role_permission_id: RoleApiPermissionData?.dataValues?.id,
              role_permission_data:{
                ...RoleApiPermissionData?.dataValues
              }
            }
          }], RoleApiPermissionData?.dataValues?.id, LogsActivityType.Add,LogsType.MenuItemWithPermission, req?.body?.session_res?.id_app_user,transaction)
        }
      }

      // Commit the transaction if both MenuItem and RoleApiPermissions are updated successfully
      await transaction.commit();

      // Return the success response
      return resSuccess({ data: { menuItem, roleApiPermissions }, message: MENU_NOT_ASSOCIATED_TO_PERMISSIONS });
    } catch (error) {
      // Rollback the transaction in case of error
      if(transaction){
        await transaction.rollback();
      }
      throw error
    }
  };

  export const getMenuItemWithPermissions = async (req: Request) => {
    try {
      const pagination = getInitialPaginationFromQuery(req.query);
      let paginationProps:any = {};
      // Initialize where condition for filtering menu_items
      let whereCondition: any = {
        
        is_deleted: DeletedStatus.No, // Ensure deleted flag is not true
      };
  
      // Apply search text filter if present across all fields (MenuItem and associated models)
      if (pagination.search_text) {
        whereCondition[Op.or] = [
          { name: { [Op.like]: `%${pagination.search_text}%` } },
          { nav_path: { [Op.like]: `%${pagination.search_text}%` } },
          { id_parent_menu: { [Op.like]: `%${pagination.search_text}%` } },
          { sort_order: { [Op.like]: `%${pagination.search_text}%` } },
          { menu_location: { [Op.like]: `%${pagination.search_text}%` } },
          { icon: { [Op.like]: `%${pagination.search_text}%` } },
          // Search in RoleApiPermission
          { '$rap.api_endpoint$': { [Op.like]: `%${pagination.search_text}%` } },
          { '$rap.http_method$': { [Op.like]: `%${pagination.search_text}%` } },
          { '$rap.master_type$': { [Op.like]: `%${pagination.search_text}%` } },
          // Search in Action model
          { '$rap.action.action_name$': { [Op.like]: `%${pagination.search_text}%` } },
          // Search in Parent Menu (related MenuItem)
          { '$parent_menu.name$': { [Op.like]: `%${pagination.search_text}%` } },
        ];
      }
  
      // If the `is_active` filter is passed, apply it
      if (pagination.is_active) {
        whereCondition.is_active = pagination.is_active;
      }
  
      // If an ID is provided in the query parameters, filter by ID
      if (req.params.id) {
        whereCondition.id = req.params.id;
      }

      let noPagination = req.query.no_pagination === "1";
      if (!noPagination) {
        paginationProps = {
          limit: pagination.per_page_rows,
          offset: (pagination.current_page - 1) * pagination.per_page_rows,
        };
      }
  
      // Paginate the query using Sequelize (only MenuItem)
      const { count, rows } = await MenuItem.findAndCountAll({
        distinct: true, // This ensures that we don't get duplicated rows for each associated permission
        where: whereCondition,
        attributes: [
          'id',
          'name',
          'id_parent_menu',
          'nav_path',
          'sort_order', // Include sort_order in the attributes to allow sorting
          'is_active',
          'menu_location',
          'icon',
        ],
        ...paginationProps,
        order: [
          [pagination.sort_by && pagination.sort_by === 'sort_order' ? 'sort_order' : 'id', pagination.order_by || 'ASC'],
        ],
        include: [
          {
            model: RoleApiPermission,
            as: 'rap',
            attributes: ['id', 'id_menu_item', 'id_action', 'api_endpoint', 'http_method', 'is_active','master_type'],
            where: { is_active: ActiveStatus.Active }, // Exclude deleted permissions
            required: false, // Include even if no permissions are associated
            include: [
              {
                required: false, // Include even if no parent menu is associated
                model: Action,
                as: 'action',
                attributes: ['id', 'action_name'],
              },
            ],
          },
          {
            model: MenuItem,
            as: 'parent_menu',
            attributes: ['id', 'name'],
            where: { is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No }, // Exclude deleted parent menus
            required: false, // Include even if no parent menu is associated
          },
        ],
      });
  
      // If a specific menu item ID is provided, return that menu item along with its permissions
      if (req.params.id) {
        if (rows.length === 0) {
          return resNotFound({ message: 'Menu item not found' });
        }
        return resSuccess({ data: rows[0] });
      }
  
      // Paginated result with total count and pages
      pagination.total_items = count;
      pagination.total_pages = Math.ceil(count / pagination.per_page_rows);
  
      return resSuccess({
        data: req.query.no_pagination === '1' ? rows : { pagination, rows },
      });
    } catch (e) {
      console.error(e);
      return resUnknownError(e); // Error handling
    }
  };  
  export const importMenuItemsWithPermission = async (req: Request) => {
    try {
      if (!req.file) {
        return resUnprocessableEntity({ message: FILE_NOT_FOUND });
      }
  
      const resMFTL = await moveFileToLocation(
        req.file.filename,
        req.file.destination,
        PRODUCT_CSV_FOLDER_PATH,
        req.file.originalname,
      );
  
      if (resMFTL.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return resMFTL;
      }
  
      const resPBUF = await ProductBulkUploadFile.create({
        file_path: resMFTL.data,
        status: FILE_STATUS.Uploaded,
        file_type: FILE_BULK_UPLOAD_TYPE.MenuItemWithPermission,
        created_by: req.body.session_res.id_app_user,
        created_date: getLocalDate(),
      });
      const resPDBUF = await processMenuItemsWithPermissionBulkUploadFile(
        resPBUF.dataValues.id,
        resMFTL.data,
        req.body.session_res.id_app_user
      );
  
      return resPDBUF;
    } catch (error) {
      console.error(error);
      return resUnknownError(error);
    }
  };
  
  const processMenuItemsWithPermissionBulkUploadFile = async (
    id: number,
    path: string,
    idAppUser: number,
  ) => {
    try {
      const data = await processCSVFile(path, idAppUser);

      if (data.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        await ProductBulkUploadFile.update(
          {
            status: FILE_STATUS.ProcessedError,
            error: JSON.stringify({
              ...data,
              data: parseError(data.data),
            }),
            modified_date: getLocalDate(),
          },
          { where: { id } }
        );
      } else {
        await ProductBulkUploadFile.update(
          {
            status: FILE_STATUS.ProcessedSuccess,
            modified_date: getLocalDate(),
          },
          { where: { id } }
        );
      }
  
      return data;
    } catch (error) {
      console.error(error);
      await handleProcessingError(id, error);
    }
  };
  
const handleProcessingError = async (id: number, error: any) => {
    try {

      await ProductBulkUploadFile.update(
        {
          status: FILE_STATUS.ProcessedError,
          error: JSON.stringify(parseError(error)),
          modified_date: getLocalDate(),
        },
        { where: { id } }
      );
    } catch (e) {
      throw e;
      console.error('Error handling processing error:', e);
    }
  };
  
  const parseError = (error: any) => {
    try {
      return error instanceof Error ? error.toString() : JSON.stringify(error);
    } catch (e) {
      return 'Error parsing error message';
    }
  };
  
  const processCSVFile = async (path: string, idAppUser: number) => {
    try {
      const actionList = await Action.findAll({
        attributes: ['id', 'action_name']
      });

      let menuItems = await MenuItem.findAll({
        where: {
          is_deleted: DeletedStatus.No,
        },
        include: [
          {
            model: MenuItem,
            as: 'parent_menu',
            attributes: ['name'], // only fetch the parent's name
            required:false
          },
        ],
        raw: false, // keep it as Sequelize instances so you can access associations
      });
      

      const resRows = await getArrayOfRowsFromCSVFile(path);
      if (resRows.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return resRows;
      }
      const resVH = await validateHeaders(resRows.data.headers);
      if (resVH.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return resVH;
      }
  
      const resProducts = await getMenuItemsWithPermissionFromRows(resRows.data.results,actionList,menuItems, idAppUser)
      if (resProducts.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return resProducts;
      }
      // const resAPPTD = await  addMenuItemsWithPermissionToDBFor(resProducts.data,idAppUser,client_id);
      // const resAPTD = await addMenuItemsWithPermissionToDB(resProducts.data,idAppUser,client_id);
      return resProducts.code === DEFAULT_STATUS_CODE_SUCCESS
        ? resSuccess({ data: resProducts.data })
        : resProducts;
    } catch (e) {
      console.error('CSV processing error:', e);
      throw e;
    }
  };
  
  const getArrayOfRowsFromCSVFile = async (path: any) => {
    return new Promise<TResponseReturn>((resolve, reject) => {
      try {
        const results: any[] = [];
        let headerList: string[] = [];
        let batchSize = 0;
        console
        readXlsxFile(path).then((rows: any) => {
          headerList = rows[0];
          rows.shift();
  
          rows.forEach((row: any) => {
            results.push({
              menu_name: row[0],
              parent_menu_name: row[1],
              nav_path: row[2],
              sort_order: row[3],
              icon: row[4],
              api_endpoint: row[5],
              http_method: row[6],
              action_name: row[7],
              menu_location: row[8],
              master_type: row[9],
              is_for_super_admin: row[10],
            });
            batchSize++;
          });
  
          resolve(resSuccess({ data: { results, batchSize, headers: headerList } }));
        });
      } catch (e) {
        reject(e);
      }
    });
  };
  
  const validateHeaders = async (headers: string[]) => {
    const expectedHeaders = [
      'menu_name', 'parent_menu_name', 'nav_path', 'sort_order',
      'icon', 'api_endpoint', 'http_method', 'action_name','menu_location','master_type','is_for_super_admin'
    ];
  
    const errors = headers.reduce((acc: any[], header: string, idx: number) => {
      if (header.trim() !== expectedHeaders[idx]) {
        acc.push({
          row_id: 1,
          column_id: idx,
          column_name: header,
          error_message: INVALID_HEADER,
        });
      }
      return acc;
    }, []);
  
    return errors.length ? resUnprocessableEntity({ data: errors }) : resSuccess();
  };
  
  const getIdFromName = (name: string, list: any, fieldName: string) => {
    if (name == "" || !name || name == null || name == undefined) {
      return "0";
    }
    let findItem = list.find(
      (item: any) =>
        item.dataValues[fieldName].trim() ==
        name.toString().trim()
    );
  
    return findItem ? parseInt(findItem.dataValues.id) : "0";
  };

  const getDataFromName = (name: string,parent_menu_name:any, list: any, fieldName: string,perantFieldName:any) => {
    if (name == "" || !name || name == null || name == undefined) {
      return "0";
    }

    let findItem = list.find(
      (item: any) =>
        item.dataValues[fieldName].trim() ==
        name.toString().trim() && ( item?.dataValues?.['parent_menu'] ? item?.dataValues['parent_menu'][perantFieldName]?.trim() ==
        parent_menu_name.toString().trim() : true )

    );
  
    return findItem ? findItem.dataValues : "0";
  };

  const collectParentMenus = (
    row: any,
    rows: any[],
    parentMenuList: any[],
  ) => {
    if (!row?.parent_menu_name) return;
  
    const parent = rows.find(item => item.menu_name === row.parent_menu_name );
  
    if (!parent) return;
  
    const alreadyExists = parentMenuList.some(
      (item) => item.menu_name === parent.menu_name
    );
  
    if (!alreadyExists) {
      if (parent.parent_menu_name) {
        collectParentMenus(parent, rows, parentMenuList); // Recursive call
      }
      parentMenuList.push(parent); // Only push after processing its parents
    }
  };
  
  const getMenuItemsWithPermissionFromRows = async (rows: any[],actionList: any,menuItems: any, idAppUser: number) => {
    const errors: any[] = [];
    let parentMenuList = [];
    const addParent = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const action_id = getIdFromName(row.action_name, actionList, 'action_name');
      const http_method_data = getEnumValue(row.http_method);
      
      if (!row.menu_name) {
        errors.push({
          row_id: index + 1,
          error_message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [['field_name', 'menu_name']]),
        });
      }

      if (row.api_endpoint) {
        if (action_id === "0") {
          errors.push({
            row_id: index + 1,
            error_message: prepareMessageFromParams(ERROR_NOT_FOUND, [['field_name', 'action name']]),
          });
        }
        if(http_method_data?.code !== DEFAULT_STATUS_CODE_SUCCESS){
          errors.push({
            row_id: index + 1,
            error_message: prepareMessageFromParams(ERROR_NOT_FOUND, [['field_name', 'http_method']]),
          });
        }
      }

      collectParentMenus(row, rows, parentMenuList);

    }
    for (let index = 0; index < parentMenuList.length; index++) {
      const menu = parentMenuList[index];
      const findInDb = getDataFromName(menu.menu_name, menu.parent_menu_name,menuItems, 'name','name')
      const action_id = getIdFromName(menu.action_name, actionList, 'action_name');
      const http_method_data = getEnumValue(menu.http_method);

      if (findInDb === "0") {
        addParent?.push({
          menu_name: menu?.menu_name,
          parent_menu_name: menu?.parent_menu_name,
          nav_path: menu?.nav_path,
          sort_order: menu?.sort_order,
          icon: menu?.icon,
          api_endpoint: menu?.api_endpoint,
          http_method: http_method_data?.data ?? "",
          action_name: action_id === "0" ? null : action_id,
          menu_location: menu?.menu_location,
          master_type: String(menu?.master_type),
          is_for_super_admin: menu?.is_for_super_admin,
        })
      }      
    }
  
    if (errors.length > 0) {
      return resUnprocessableEntity({ data: errors });
    }

    const bulkRoleApiPermissions = [];

    const trn = await dbContext.transaction();
    try {
      
      // create parent
      const createdParentsMap: Record<string, number> = {}; 
      for (let index = 0; index < addParent.length; index++) {
        const menu = addParent[index];
        const normalizedMenuName = menu.menu_name.trim();
      
        let idParent: number | null = null;
      
        if (menu.parent_menu_name) {
          const normalizedParentName = menu.parent_menu_name.trim();
      
          const existingParent = getIdFromName(menu?.parent_menu_name, menuItems, 'name');
          if (existingParent !== "0") {
            idParent = existingParent;
          }
      
          if (!idParent && createdParentsMap[normalizedParentName]) {
            idParent = createdParentsMap[normalizedParentName];
          }
        }
      
        const currentMenuItem = await MenuItem.create({
          name: normalizedMenuName,
          id_parent_menu: idParent,
          nav_path: menu.nav_path,
          sort_order: menu.sort_order,
          menu_location: menu.menu_location,
          icon: menu.icon,
          created_date: getLocalDate(),
          is_for_super_admin: menu.is_for_super_admin,
          is_active: ActiveStatus.Active
        }, { transaction: trn });
      
        createdParentsMap[normalizedMenuName] = currentMenuItem.dataValues.id;
      
        bulkRoleApiPermissions.push({
          api_endpoint: menu.api_endpoint,
          http_method: menu.http_method,
          id_action: menu.action_name,
          is_active: ActiveStatus.Active,
          menu_name: menu.menu_name,
          id_menu_item: currentMenuItem.dataValues.id,
          master_type: String(menu.master_type),
          created_date: getLocalDate(),
        });
      }
      
      const addNewMenu = [];
      const updateMenu = [];
      let ActivityLogs = [];
      
      // create array for add and update
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const action_id = getIdFromName(row.action_name, actionList, 'action_name');
        const http_method_data = getEnumValue(row.http_method);

        if (!row.menu_name) {
          errors.push({
            row_id: index + 1,
            error_message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [['field_name', 'menu_name']]),
          });
        }

        if (row.api_endpoint) {
          if (action_id === "0") {
            errors.push({
              row_id: index + 1,
              error_message: prepareMessageFromParams(ERROR_NOT_FOUND, [['field_name', 'action name']]),
            });
          }
          if (http_method_data?.code !== DEFAULT_STATUS_CODE_SUCCESS) {
            errors.push({
              row_id: index + 1,
              error_message: prepareMessageFromParams(ERROR_NOT_FOUND, [['field_name', 'http_method']]),
            });
          }
        }

        const findInDb = getDataFromName(row.menu_name,row.parent_menu_name, menuItems, 'name','name')
        const findInBulk = bulkRoleApiPermissions?.find((item) => item.menu_name === row?.menu_name)

        let idParent = null;
        if (row.parent_menu_name) {
          const findInDb = getIdFromName(row.parent_menu_name, menuItems, 'name')
          if (findInDb === "0") {
            const findInBulk = bulkRoleApiPermissions?.find((item) => item.menu_name === row.parent_menu_name)
            if (findInBulk) {
            idParent = findInBulk.id_menu_item
            }
          } else {
            idParent = findInDb
          }
        }

        if (findInDb === "0" && !findInBulk) {
            addNewMenu.push({
              menu_name: row?.menu_name,
              parent_menu_name: idParent,
              nav_path: row?.nav_path,
              sort_order: row?.sort_order,
              icon: row?.icon,
              api_endpoint: row?.api_endpoint,
              http_method: http_method_data?.data ?? "",
              action_name: action_id === "0" ? null : action_id,
              menu_location: row?.menu_location,
              master_type: String(row?.master_type),
              is_for_super_admin: row?.is_for_super_admin,

            })
          
        } else {
            updateMenu.push({
              id: findInDb?.id ?? findInBulk?.id_menu_item,
              menu_name: row?.menu_name,
              parent_menu_name: idParent,
              nav_path: row?.nav_path,
              sort_order: row?.sort_order,
              icon: row?.icon,
              api_endpoint: row?.api_endpoint,
              http_method: http_method_data?.data ?? "",
              action_name: action_id === "0" ? null : action_id,
              menu_location: row?.menu_location,
              master_type: String(row?.master_type),
              is_for_super_admin: row?.is_for_super_admin,
            })
          
        }
      }
      // add to db
      for (let index = 0; index < addNewMenu.length; index++) {
        const menu = addNewMenu[index];
        const trimmedName = menu?.menu_name?.trim();


  const existingMenu = await MenuItem.findOne({
    where: {
      name: trimmedName,
      id_parent_menu: menu?.parent_menu_name ? menu?.parent_menu_name : null,
      menu_location : menu.menu_location,
      is_deleted: DeletedStatus.No
    },
    transaction: trn
  });

  let currentMenuItem = existingMenu ?? null;
  if (!existingMenu) {
    currentMenuItem = await MenuItem.create({
      name: trimmedName,
      id_parent_menu: menu.parent_menu_name,
      nav_path: menu.nav_path,
      sort_order: menu.sort_order,
      menu_location: menu.menu_location,
      icon: menu.icon,
      created_date: getLocalDate(),
      created_by:idAppUser,
      is_for_super_admin: menu.is_for_super_admin,
      is_active: ActiveStatus.Active
    }, { transaction: trn });
  }

        bulkRoleApiPermissions.push({
          api_endpoint: menu.api_endpoint,
          http_method: menu.http_method,
          id_action: menu.action_name,
          is_active: ActiveStatus.Active,
          menu_name: menu.menu_name,
          id_menu_item: currentMenuItem?.dataValues?.id,
          master_type: String(menu.master_type),    
        });
      }

      // update to db
      for (let index = 0; index < updateMenu.length; index++) {
        const menu = updateMenu[index];
        const currentMenuItem = await MenuItem.update({
          name: menu.menu_name,
          id_parent_menu: menu.parent_menu_name,
          nav_path: menu.nav_path,
          sort_order: menu.sort_order,
          menu_location: menu.menu_location,
          icon: menu.icon,
          modified_date: getLocalDate(),
          modified_by:idAppUser,
          is_for_super_admin: menu.is_for_super_admin,
          is_active: ActiveStatus.Active
        }, { where: { id: menu.id }, transaction: trn });

        bulkRoleApiPermissions.push({
          api_endpoint: menu.api_endpoint,
          http_method: menu.http_method,
          id_action: menu.action_name,
          is_active: ActiveStatus.Active,
          menu_name: menu.menu_name,
          id_menu_item: menu?.id,
          master_type: String(menu.master_type),
        });
      }

      const finalData = bulkRoleApiPermissions
        ?.filter((item) => item.api_endpoint)
        .map((item) => {
          return {
            ...item,
            http_method: Number(item.http_method),
          };
        });

        const data: any[] = [];

      for (const item of finalData) {
        const existing = await RoleApiPermission.findOne({
          where: {
            api_endpoint: item.api_endpoint,
            http_method: item.http_method,
            id_menu_item: item.id_menu_item,
            master_type: String(item.master_type),
          },
          transaction: trn
        });

        if (existing) {
          await existing.update( {
            ...item,
            updated_date: getLocalDate(),
            updated_by: idAppUser,
          }, { transaction: trn });
          data.push({ ...existing.dataValues, ...item });
        } else {
          const created = await RoleApiPermission.create({
            ...item,
            created_date: getLocalDate(),
            created_by: idAppUser,
          }, { transaction: trn });
          data.push(created.dataValues);
        }
      }
      for (let index = 0; index < data.length; index++) {
        const element = data[index].dataValues;
        ActivityLogs.push({ old_data: null, new_data: { ...element } })
      }
      await trn.commit();
      return resSuccess({
        data: data
      });
   } catch (error) {
     console.error('Error adding groups to DB:', error);
    await trn.rollback();
    throw error;
   }
  };
  
  export const deleteMenuItem = async (req: Request) => {
/**
 * Delete a menu item
 * @param {Request} req Request object
 * @returns {Promise<ApiResponse>} Api response
 */

    try {
      const findCoupon = await MenuItem.findOne({
        where: { id: req.params.id, is_deleted: DeletedStatus.No },
      });
  
      if (!(findCoupon && findCoupon.dataValues)) {
        return resNotFound();
      }
      await MenuItem.update(
        {
          is_deleted: DeletedStatus.yes,
          deleted_by: req.body.session_res.id_app_user,
          deleted_date: getLocalDate(),
        },
        { where: { id: findCoupon.dataValues.id } }
      );
      await addActivityLogs([{
        old_data: { menu_item_id: findCoupon?.dataValues?.id, data: {...findCoupon?.dataValues}},
        new_data: {
          menu_item_id: findCoupon?.dataValues?.id, data: {
            ...findCoupon?.dataValues, is_deleted: DeletedStatus.yes,
            modified_by: req?.body?.session_res?.id_app_user,
            modified_date: getLocalDate(),
          }
        }
      }], findCoupon?.dataValues?.id, LogsActivityType.Delete, LogsType.MenuItemWithPermission, req?.body?.session_res?.id_app_user)
  
      return resSuccess({ message: RECORD_DELETE_SUCCESSFULLY });
    } catch (error) {
      throw error;
    }
  };
  
  export const statusUpdateForMenuItem= async (req: Request) => {
    try {
      const findCoupon = await MenuItem.findOne({
        where: { id: req.params.id, is_deleted: DeletedStatus.No },
      });
  
      if (!(findCoupon && findCoupon.dataValues)) {
        return resNotFound();
      }
      await MenuItem.update(
        {
          is_active: statusUpdateValue(findCoupon),
          updated_date: getLocalDate(),
          updated_by: req.body.session_res.id_app_user,
        },
        { where: { id: findCoupon.dataValues.id } }
      );
      await addActivityLogs([{
        old_data: { menu_item_id: findCoupon?.dataValues?.id, data: {...findCoupon?.dataValues}},
        new_data: {
          menu_item_id: findCoupon?.dataValues?.id, data: {
            ...findCoupon?.dataValues, is_active: statusUpdateValue(findCoupon),
            modified_date: getLocalDate(),
            modified_by: req?.body?.session_res?.id_app_user,
          }
        }
      }], findCoupon?.dataValues?.id, LogsActivityType.StatusUpdate, LogsType.MenuItemWithPermission, req?.body?.session_res?.id_app_user)
  
      return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
    } catch (error) {
      throw error;
    }
};

export const superAdminOtpVerified = async (req: Request) => {
  try {

    const userData = await AppUser.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No },
    });

    if (!(userData && userData.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    if (userData.dataValues.one_time_pass === req.body.OTP) {
      if (
        userData.dataValues.otp_create_date &&
        userData.dataValues.otp_expire_date
      ) {
        if (
          !(
            getLocalDate() >= userData.dataValues.otp_create_date &&
            getLocalDate() <= userData.dataValues.otp_expire_date
          )
        ) {
          return resBadRequest({
            code: RESOURCE_EXPIRED_STATUS_CODE,
            message: OTP_EXPIRATION_MESSAGE,
          });
        }
      }

      await AppUser.update(
        {
          user_status: USER_STATUS.Approved,
          is_email_verified: 1,
          approved_date: getLocalDate(),
          modified_date: getLocalDate(),
        },
        { where: { id: userData.dataValues.id, is_deleted: DeletedStatus.No} }
      );

      const jwtPayload = {
        id: userData && userData.dataValues.id,
        id_app_user: userData.dataValues.id,
        user_type: userData.dataValues.user_type,
        id_role: userData.dataValues.id_role,
        otp: req.body.OTP,
      };

      const data = createUserJWT(
        userData.dataValues.id,
        jwtPayload,
        USER_TYPE.SuperAdmin
      );
      const userDetails = await AppUser.findOne({
        where: { id: userData.dataValues.id, is_deleted: DeletedStatus.No },
        attributes: [
          "id",
          "username",
          "user_status",
          "is_email_verified",
          "is_super_admin"
        ],
      });
      return resSuccess({
        data: {
          tokens: data,
          user_detail: userDetails,
        },
      });
    } else {
      return resBadRequest({ message: INVALID_OTP });
    }
  } catch (error) {
    throw error;
  }
};