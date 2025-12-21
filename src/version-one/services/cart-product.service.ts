import { Request } from "express";
import {
  addActivityLogs,
  applyShippingCharge,
  getInitialPaginationFromQuery,
  getLocalDate,
  resErrorDataExit,
  resNotFound,
  resSuccess,
  getBraceletConfigProductPrice, getEternityConfigProductPrice, getRingConfigProductPriceForCart, getThreeStoneConfigProductPriceForCart,
  formatPriceWithoutSeparator,
  getProductTypeForPriceCorrection
} from "../../utils/shared-functions";
import {
  DEFAULT_STATUS_CODE_SUCCESS,
  PRODUCT_NOT_FOUND,
  RECORD_DELETE_SUCCESSFULLY,
  USER_NOT_FOUND,
} from "../../utils/app-messages";
import {
  AllProductTypes,
  ActiveStatus,
  IMAGE_TYPE,
  PRODUCT_IMAGE_TYPE,
  SingleProductType,
  DeletedStatus,
  COUPON_DISCOUNT_TYPE,
  LogsActivityType,
  LogsType,
  DIAMOND_TYPE,
} from "../../utils/app-enumeration";
import { Op, Sequelize } from "sequelize";
import {
  IN_STOCK_PRODUCT_DELIVERY_TIME,
  OUT_OF_STOCK_PRODUCT_DELIVERY_TIME,
  WHITE_METAL_TONE_SORT_CODE,
} from "../../utils/app-constants";
import { AppUser } from "../model/app-user.model";
import { Product } from "../model/product.model";
import { CartProducts } from "../model/cart-product.model";
import { MetalTone } from "../model/master/attributes/metal/metalTone.model";
import { ProductImage } from "../model/product-image.model";
import { ProductMetalOption } from "../model/product-metal-option.model";
import { MetalMaster } from "../model/master/attributes/metal/metal-master.model";
import { GoldKarat } from "../model/master/attributes/metal/gold-karat.model";
import { ProductDiamondOption } from "../model/product-diamond-option.model";
import { DiamondGroupMaster } from "../model/master/attributes/diamond-group-master.model";
import { DiamondShape } from "../model/master/attributes/diamondShape.model";
import { CustomerUser } from "../model/customer-user.model";
import { CouponData } from "../model/coupon.model";
import { TaxMaster } from "../model/master/tax.model";
import { Image } from "../model/image.model";
import { moveFileToS3ByType } from "../../helpers/file.helper";
import { applyOfferWithBuyNewOneGetOne } from "./apply-offer-buy-with-new.service";
import dbContext from "../../config/db-context";
const crypto = require("crypto");

export const addToCartProductAPI = async (req: Request) => {
  try {
    const {
      user_id,
      product_id,
      metal_id,
      karat_id,
      metal_tone_id,
      size,
      length,
      SKU,
    } = req.body;
    const userExit = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });
    const productExit = await Product.findOne({
      where: { id: product_id, is_deleted: DeletedStatus.No },
    });
    if (user_id && user_id != null) {
      if (!(userExit && userExit.dataValues)) {
        return resNotFound({ message: USER_NOT_FOUND });
      }
    }
    if (!(productExit && productExit.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    const countryCodeExists = await CartProducts.findOne({
      where: { user_id: user_id, product_id: { [Op.eq]: product_id } },
    });

    if (countryCodeExists && countryCodeExists.dataValues) {
      return resErrorDataExit();
    }

    const id = crypto.randomBytes(20).toString("hex");

    const addToCartProduct = await CartProducts.create({
      id: id,
      user_id: user_id,
      product_id: product_id,
      product_SKU: SKU,
      quantity: 1,
      product_details: { metal_id, karat_id, metal_tone_id, size, length },
      created_date: getLocalDate(),
    });

    await addActivityLogs([{
      old_data: null,
      new_data: {
        address_id: addToCartProduct?.dataValues?.id, data: {
          ...addToCartProduct?.dataValues
        }
      }
    }], addToCartProduct?.dataValues?.id, LogsActivityType.Add, LogsType.CartProduct, req?.body?.session_res?.id_app_user)

    const cart_list_count = await CartProducts.sum("quantity", {
      where: { user_id: user_id },
    });



    const totalCartCount = cart_list_count ;

    return resSuccess({ data: totalCartCount });
  } catch (error) {
    throw error;
  }
};

export const cartProductListByUSerId = async (req: Request) => {
  const { user_id } = req.body;
  let cartProductList = [];
  try {
    const userExit = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });
    if (!(userExit && userExit.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }
    const cartProduct = await CartProducts.findAll({
      where: { user_id: userExit.dataValues.id },
    });

    const metal_tone = await MetalTone.findOne({
      where: { sort_code: WHITE_METAL_TONE_SORT_CODE },
    });

    for (let item of cartProduct) {
      const list = await Product.findOne({
        where: [
          { id: item.dataValues.product_id },
          { is_active: ActiveStatus.Active },
          { is_deleted: DeletedStatus.No },
        ],
        attributes: [
          "id",
          "name",
          "sku",
          "slug",
          "sort_description",
          "long_description",
          "making_charge",
          "finding_charge",
          "other_charge",
          [
            Sequelize.literal(
              `(select id from items_sizes where id = ${item.dataValues.product_details.size == "undefined"
                ? null
                : item.dataValues.product_details.size
              })`
            ),
            "id_size",
          ],
          [
            Sequelize.literal(
              `(select id from items_sizes where id = ${item.dataValues.product_details.length == "undefined"
                ? null
                : item.dataValues.product_details.length
              })`
            ),
            "id_length",
          ],
          [
            Sequelize.literal(
              `(select size from items_sizes where id = ${item.dataValues.product_details.size == "undefined"
                ? null
                : item.dataValues.product_details.size
              })`
            ),
            "size",
          ],
          [
            Sequelize.literal(
              `(select length from items_sizes where id = ${item.dataValues.product_details.length == "undefined"
                ? null
                : item.dataValues.product_details.length
              })`
            ),
            "length",
          ],
        ],
        include: [
          {
            required: false,
            model: ProductImage,
            as: "product_images",
            attributes: ["image_path", "id_metal_tone"],
            where: {
              image_type: PRODUCT_IMAGE_TYPE.Feature,
              id_metal_tone:
                item.dataValues.product_details.metal_tone_id == ""
                  ? metal_tone?.dataValues.id
                  : item.dataValues.product_details.metal_tone_id,
            },
          },
          {
            required: true,
            model: ProductMetalOption,
            as: "PMO",
            attributes: [
              "id_metal",
              [
                Sequelize.literal(
                  `(select name from metal_masters where id = ${item.dataValues.product_details.metal_id})`
                ),
                "metal",
              ],
              [
                Sequelize.literal(
                  `(select name from metal_tones where id = ${item.dataValues.product_details.metal_tone_id == ""
                    ? metal_tone?.dataValues.id
                    : item.dataValues.product_details.metal_tone_id
                  })`
                ),
                "metal_tone_name",
              ],
              [
                Sequelize.literal(
                  `(select id from metal_tones where id = ${item.dataValues.product_details.metal_tone_id == ""
                    ? metal_tone?.dataValues.id
                    : item.dataValues.product_details.metal_tone_id
                  })`
                ),
                "id_metal_tone",
              ],
              [
                Sequelize.literal(
                  `(select name from gold_kts where id = ${item.dataValues.product_details.karat_id == ""
                    ? null
                    : item.dataValues.product_details.karat_id
                  })`
                ),
                "karat",
              ],
              [
                Sequelize.literal(
                  `(SELECT CASE WHEN "PMO"."id_karat" IS NULL THEN(metal_master.metal_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0))) ELSE (metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0))) END FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product = products.id LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id AND PDO.is_deleted = '0' LEFT OUTER JOIN metal_masters AS metal_master ON metal_master.id = PMO.id_metal LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN gold_kts ON gold_kts.id = PMO.id_karat WHERE CASE WHEN PMO.id_karat IS NULL THEN products.id = "PMO"."id_product" AND PMO.id_metal = "PMO"."id_metal" ELSE products.id = "PMO"."id_product" AND PMO.id_metal = "PMO"."id_metal" AND PMO.id_karat = "PMO"."id_karat" END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, PMO.metal_weight, products.making_charge, products.finding_charge, products.other_charge,PMO.id_karat, gold_kts.calculate_rate)`
                ),
                "Price",
              ],

              "id_karat",
              [
              Sequelize.literal(`
                CASE 
                  WHEN "PMO"."id_metal_tone" IS NULL OR TRIM("PMO"."id_metal_tone") = '' THEN '{}'::int[] 
                  ELSE string_to_array(TRIM(BOTH '|' FROM "PMO"."id_metal_tone"), '|')::int[]
                END
              `),
              'metal_tone'
            ],
            ],
            where: [
              { id_metal: item.dataValues.product_details.metal_id },
              { id_karat: item.dataValues.product_details.karat_id },
            ],
            include: [
              {
                required: false,
                model: MetalMaster,
                as: "metal_master",
                attributes: [],
              },
              {
                required: false,
                model: GoldKarat,
                as: "metal_karat",
                attributes: [],
              },
            ],
          },
          {
            required: false,
            model: ProductDiamondOption,
            as: "PDO",
            attributes: [],
            where: { is_deleted: DeletedStatus.No },
            include: [
              {
                required: false,
                model: DiamondGroupMaster,
                as: "rate",
                attributes: [],
                include: [
                  {
                    required: false,
                    model: DiamondShape,
                    as: "shapes",
                    attributes: [],
                    where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
                  },
                ],
                where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
              },
            ],
          },
        ],
      });

      cartProductList.push(list);
    }

    return resSuccess({ data: cartProductList });
  } catch (error) {
    throw error;
  }
};

export const deleteCartProduct = async (req: Request) => {
  try {
    const { user_id, cart_id } = req.body;
    const beforDelete = await CartProducts.findAll({ where: { user_id: user_id } });
    await CartProducts.destroy({ where: { id: cart_id } });

    let cart_list_count;
    if (user_id && user_id != null && user_id != undefined) {
      cart_list_count = await CartProducts.sum("quantity", {
        where: { user_id: user_id },
      });
      cart_list_count = cart_list_count ? cart_list_count : 0;
    } else {
      cart_list_count = 0;
    }
    const afterDelete = await CartProducts.findAll({ where: { user_id: user_id } });

    await addActivityLogs([{
      old_data: { data: beforDelete?.map((t) => t?.dataValues) },
      new_data: {
        data: afterDelete?.map((t) => t?.dataValues)
      }
    }], null, LogsActivityType.Delete, LogsType.CartProduct, req?.body?.session_res?.id_app_user)

    return resSuccess({
      message: RECORD_DELETE_SUCCESSFULLY,
      data: cart_list_count.toLocaleString(),
    });
  } catch (error) {
    throw error;
  }
};

export const getCartProductListData = async (req: Request) => {
  try {
    let paginationProps = {};

    let pagination = {
      ...getInitialPaginationFromQuery(req.query),
      search_text: req.query.search_text,
    };
    let noPagination = req.query.no_pagination === "1";
    const include = [
      {
        required: false,
        model: AppUser,
        as: "users",
        attributes: [],
        include: [
          {
            required: false,
            model: CustomerUser,
            as: "customer_user",
            attributes: [],
          },
        ],
      },
    ];
    const where = [
      pagination.search_text
        ? {
          [Op.or]: [
            Sequelize.where(
              Sequelize.literal(
                `(SELECT COUNT(*) from customer_users WHERE id_app_user = user_id AND (full_name ILIKE  '%${pagination.search_text}%' OR email ILIKE  '%${pagination.search_text}%'))`
              ),
              ">",
              "0"
            ),
            Sequelize.where(
              Sequelize.literal(
                `CASE WHEN "product_type" = ${AllProductTypes.Product} THEN (SELECT COUNT(*) FROM products WHERE id = "product_id" AND name ILIKE '%${pagination.search_text}%') WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT COUNT(*) from gift_set_products WHERE id = "product_id" AND product_title ILIKE '%${pagination.search_text}%') WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT COUNT(*) from config_products WHERE id = "product_id" AND product_title ILIKE '%${pagination.search_text}%') WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT COUNT(*) from birthstone_products WHERE id = "product_id" AND name ILIKE '%${pagination.search_text}%') ELSE null END`
              ),
              ">",
              "0"
            ),
          ],
        }
        : {}
    ];

    if (!noPagination) {
      const totalItems = await CartProducts.count({ where, include });

      if (totalItems === 0) {
        return resSuccess({ data: { pagination, result: [] } });
      }
      pagination.total_items = totalItems;
      pagination.total_pages = Math.ceil(totalItems / pagination.per_page_rows);

      paginationProps = {
        limit: pagination.per_page_rows,
        offset: (pagination.current_page - 1) * pagination.per_page_rows,
      };
    }

    const result = await CartProducts.findAll({
      ...paginationProps,
      where,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "user_id",
        "product_type",
        "product_id",
        "product_details",
        "variant_id",
        [Sequelize.literal('"users->customer_user"."full_name"'), "user_name"],
        [Sequelize.literal('"users->customer_user"."email"'), "user_email"],
        [
          Sequelize.literal('"users->customer_user"."mobile"'),
          "user_phone_numer",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT name FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT product_title from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT name from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT product_title from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_title from config_bracelet_products WHERE id = "product_id") ELSE null END`
          ),
          "product_title",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT sku FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT sku from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT sku from birthstone_products WHERE id = "product_id") WHEN  "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT sku from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT sku from config_bracelet_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters WHERE id = "product_id") ELSE null END`
          ),
          "product_sku",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT slug FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT slug from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT slug from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT slug from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT slug from config_bracelet_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters WHERE id = "product_id") ELSE null END`
          ),
          "product_slug",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} THEN (SELECT image_path FROM product_images WHERE id = CAST (product_details ->> 'image' AS integer)) WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT image_path FROM gift_set_product_images WHERE id_product = "product_id" AND image_type = 1 AND is_deleted = '0') WHEN "product_type" = ${AllProductTypes.LooseDiamond} THEN (SELECT image_path from loose_diamond_group_masters where id = "product_id") ELSE (SELECT image_path FROM images where id = CAST (product_details ->> 'image' AS integer)) END`
          ),
          "product_image",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'image') = null THEN NULL WHEN (product_details ->> 'image') = 'null' THEN null WHEN (product_details ->> 'image') = 'undefined' THEN null WHEN (product_details ->> 'image') = '' THEN NULL  ELSE  CAST (product_details ->> 'image' AS integer) END`
          ),
          "product_image_id",
        ],
        [
          Sequelize.literal(
            ` CASE WHEN (product_details ->> 'size') = null THEN null WHEN (product_details ->> 'size') = 'null' THEN null  WHEN (product_details ->> 'size') = 'undefined' THEN NULL WHEN (product_details ->> 'size') = '' THEN NULL ELSE(SELECT size FROM items_sizes WHERE id = CAST (product_details ->> 'size' AS integer))END`
          ),
          "product_size",
        ],
        [
          Sequelize.literal(
            ` CASE WHEN (product_details ->> 'size') = null THEN null WHEN (product_details ->> 'size') = 'null' THEN null  WHEN (product_details ->> 'size') = 'undefined' THEN NULL WHEN (product_details ->> 'size') = '' THEN NULL ELSE CAST (product_details ->> 'size' AS integer)END`
          ),
          "size_id",
        ],
        [
          Sequelize.literal(
            ` CASE WHEN (product_details ->> 'length') = null THEN null WHEN (product_details ->> 'length') = 'null' THEN null  WHEN (product_details ->> 'length') = 'undefined' THEN NULL WHEN (product_details ->> 'length') = '' THEN NULL ELSE(SELECT length FROM items_lengths WHERE id = CAST (product_details ->> 'length' AS integer))END`
          ),
          "product_length",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'length') = null THEN null WHEN (product_details ->> 'length') = 'null' THEN null  WHEN (product_details ->> 'length') = 'undefined' THEN NULL WHEN (product_details ->> 'length') = '' THEN NULL ELSE CAST (product_details ->> 'length' AS integer)END`
          ),
          "length_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal') = null THEN null WHEN (product_details ->> 'metal') = 'null' THEN null  WHEN (product_details ->> 'metal') = 'undefined' THEN NULL WHEN (product_details ->> 'metal') = '' THEN NULL ELSE (SELECT metal_masters.name FROM metal_masters WHERE metal_masters.id = CAST (product_details ->> 'metal' AS integer)) END`
          ),
          "product_metal",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal') = null THEN null WHEN (product_details ->> 'metal') = 'null' THEN null  WHEN (product_details ->> 'metal') = 'undefined' THEN NULL WHEN (product_details ->> 'metal') = '' THEN NULL ELSE CAST (product_details ->> 'metal' AS integer) END`
          ),
          "metal_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal_tone') = null THEN null WHEN (product_details ->> 'metal_tone') = 'null' THEN null  WHEN (product_details ->> 'metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'metal_tone' AS integer) END`
          ),
          "metal_tone_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'karat') = null THEN null WHEN (product_details ->> 'karat') = 'null' THEN null  WHEN (product_details ->> 'karat') = 'undefined' THEN NULL WHEN (product_details ->> 'karat') = '' THEN NULL ELSE  CAST (product_details ->> 'karat' AS integer) END`
          ),
          "karat_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'karat') = null THEN null WHEN (product_details ->> 'karat') = 'null' THEN null  WHEN (product_details ->> 'karat') = 'undefined' THEN NULL WHEN (product_details ->> 'karat') = '' THEN NULL ELSE (SELECT slug FROM gold_kts WHERE id = CAST (product_details ->> 'karat' AS integer)) END`
          ),
          "product_karat",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal_tone') = null THEN null WHEN (product_details ->> 'metal_tone') = 'null' THEN null  WHEN (product_details ->> 'metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'metal_tone' AS integer)) END`
          ),
          "Metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'head_metal_tone') = null THEN null WHEN (product_details ->> 'head_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'head_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'head_metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'head_metal_tone' AS integer)) END`
          ),
          "head_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'shank_metal_tone') = null THEN null WHEN (product_details ->> 'shank_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'shank_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'shank_metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'shank_metal_tone' AS integer)) END`
          ),
          "shank_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'band_metal_tone') = null THEN null WHEN (product_details ->> 'band_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'band_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'band_metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'band_metal_tone' AS integer)) END`
          ),
          "band_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'head_metal_tone') = null THEN null WHEN (product_details ->> 'head_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'head_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'head_metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'head_metal_tone' AS integer) END`
          ),
          "head_metal_tone_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'shank_metal_tone') = null THEN null WHEN (product_details ->> 'shank_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'shank_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'shank_metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'shank_metal_tone' AS integer) END`
          ),
          "shank_metal_tone_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'band_metal_tone') = null THEN null WHEN (product_details ->> 'band_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'band_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'band_metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'band_metal_tone' AS integer) END`
          ),
          "band_metal_tone_id",
        ],
        [Sequelize.literal(`product_details ->> 'is_band'`), "is_band"],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'selected_stone_price') = null THEN null WHEN (product_details ->> 'selected_stone_price') = 'null' THEN null  WHEN (product_details ->> 'selected_stone_price') = 'undefined' THEN NULL WHEN (product_details ->> 'selected_stone_price') = '' THEN NULL ELSE 1+CAST (product_details ->> 'selected_stone_price' AS DECIMAL(12, 1)) END`
          ),
          "selected_stone_price",
        ],
        [
          Sequelize.literal(`(CASE WHEN "product_type" = ${AllProductTypes.Config_Ring_product
            } THEN 
                (SELECT CASE WHEN ${`CAST (product_details ->> 'is_band' AS integer)`} = 1 THEN with_band_price * "cart_products"."quantity" ELSE without_band_price * "cart_products"."quantity" END FROM ring_three_stone_configurator_price_view WHERE id = "product_id")
          WHEN "product_type" = ${AllProductTypes.Three_stone_config_product
            } THEN 
                (SELECT CASE WHEN ${`CAST (product_details ->> 'is_band' AS integer)`} = 1 THEN with_band_price * "cart_products"."quantity" ELSE without_band_price * "cart_products"."quantity" END FROM ring_three_stone_configurator_price_view WHERE id = "product_id")
                WHEN "product_type" = ${AllProductTypes.Product}
                      THEN (SELECT CASE WHEN products.product_type = ${SingleProductType.VariantType
            } OR (products.product_type = ${SingleProductType.cataLogueProduct
            } AND (product_details ->> 'is_catalogue_design') = 'true') THEN CEIL(PMO.retail_price)*"cart_products"."quantity" ELSE  CASE WHEN PMO.id_karat IS NULL
                        THEN CEIL(metal_master.metal_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+
                          (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0)))*"cart_products"."quantity" ELSE
                          CEIL(metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+
                          (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0)))*"cart_products"."quantity" END END
                          FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product =
                          products.id LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product =
                          products.id AND PDO.is_deleted = '0' LEFT OUTER JOIN metal_masters
                          AS metal_master ON metal_master.id = PMO.id_metal LEFT OUTER JOIN
                          diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN
                          gold_kts ON gold_kts.id = PMO.id_karat WHERE CASE WHEN products.product_type = ${SingleProductType.VariantType
            } THEN products.id = "product_id" AND PMO.id = "variant_id" ELSE  CASE WHEN PMO.id_karat IS NULL THEN
                          products.id = "product_id" AND PMO.id_metal = CAST (product_details ->> 'metal' AS integer)
                          ELSE products.id = "product_id" AND PMO.id_metal = CAST (product_details ->> 'metal' AS integer)
                          AND PMO.id_karat = CASE WHEN (product_details ->> 'karat') = 'null' THEN null ELSE CAST
                          (product_details ->> 'karat' AS integer) END END END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, pmo.metal_weight,
                          products.making_charge, products.finding_charge, products.other_charge,PMO.id_karat, gold_kts.calculate_rate, products.product_type, PMO.retail_price LIMIT 1)
 WHEN "product_type" = ${AllProductTypes.GiftSet_product
            } THEN (SELECT  CEIL(price)*"cart_products"."quantity" FROM gift_set_products WHERE id = "product_id") 
                WHEN "product_type" = ${AllProductTypes.BirthStone_product
            } THEN (SELECT CEIL(price)*"cart_products"."quantity" FROM  birthstone_products
LEFT JOIN birthstone_product_metal_options AS birthstone_PMO ON id_product = birthstone_products.id 
WHERE birthstone_PMO.id = "variant_id") WHEN "product_type" = ${AllProductTypes.Eternity_product
            } THEN (SELECT calculated_value * "cart_products"."quantity" FROM eternity_band_configurator_price_view WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.LooseDiamond
            }
THEN (
    SELECT
    total_price * "cart_products"."quantity"
FROM loose_diamond_group_masters
WHERE loose_diamond_group_masters.is_deleted = '0'
AND loose_diamond_group_masters.id = "product_id"
) WHEN "product_type" = ${AllProductTypes.BraceletConfigurator
            } THEN (SELECT product_price * "cart_products"."quantity" FROM bracelet_configurator_price_view WHERE id = "product_id") 
WHEN "product_type" = ${AllProductTypes.SettingProduct}
    THEN (SELECT CASE WHEN products.product_type = ${SingleProductType.VariantType
            } THEN CASE WHEN ${`CAST (product_details ->> 'is_band' AS integer)`} = 1 THEN CEIL((COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+PMO.retail_price + PMO.band_metal_price) - PMO.center_diamond_price) *"cart_products"."quantity" ELSE CEIL((COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+PMO.retail_price)- PMO.center_diamond_price)*"cart_products"."quantity" END 
    ELSE  CASE WHEN PMO.id_karat IS NULL
      THEN CASE WHEN ${`CAST (product_details ->> 'is_band' AS integer)`} = 1 THEN 
      CEIL(metal_master.metal_rate*(PMO.metal_weight+PMO.band_metal_weight)+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0)))*"cart_products"."quantity" ELSE 
        CEIL(metal_master.metal_rate*(PMO.metal_weight)+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum(CASE WHEN PDO.is_band IS false THEN ((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count) END), 0)))*"cart_products"."quantity" END ELSE

        CASE WHEN ${`CAST (product_details ->> 'is_band' AS integer)`} = 1 THEN

        CEIL(metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*(PMO.metal_weight+PMO.band_metal_weight)+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0)))*"cart_products"."quantity" 
        
        ELSE 

        CEIL(metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum(CASE WHEN PDO.is_band IS false THEN ((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count) END), 0)))*"cart_products"."quantity" 

        END

        END END
        FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product =
        products.id LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product =
        products.id AND PDO.is_deleted = '0' AND PDO.id_type = 2 LEFT OUTER JOIN metal_masters
        AS metal_master ON metal_master.id = PMO.id_metal LEFT OUTER JOIN
        diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN
        gold_kts ON gold_kts.id = PMO.id_karat WHERE CASE WHEN products.product_type = ${SingleProductType.VariantType
            } THEN products.id = "product_id" AND PMO.id = "variant_id" ELSE  CASE WHEN PMO.id_karat IS NULL THEN
        products.id = "product_id" AND PMO.id_metal = CAST (product_details ->> 'metal' AS integer)
        ELSE products.id = "product_id" AND PMO.id_metal = CAST (product_details ->> 'metal' AS integer)
        AND PMO.id_karat = CASE WHEN (product_details ->> 'karat') = 'null' THEN null ELSE CAST
        (product_details ->> 'karat' AS integer) END END END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, pmo.metal_weight,
        products.making_charge, products.finding_charge, products.other_charge,PMO.id_karat, gold_kts.calculate_rate, products.product_type, PMO.retail_price, PMO.band_metal_price,PMO.band_metal_weight,PMO.center_diamond_price)
            ELSE
          null
          END)`),
          "product_price",
        ],
      ],
      include,
    });

    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (error) {
    throw error;
  }
};

export const cartProductListgustCheckOut = async (req: any) => {
  try {
    const { cart_id } = req.body;

    if (cart_id && cart_id.length === 0) {
      return resSuccess({
        data: {
          cart_count: 0,
          discount_amount: 0,
          sub_total: 0,
          coupon: null,
          tax: null,
          total_tax_amount: 0,
          cart_total: 0,
          cart_list: [],
        },
      });
    }

    let cartProductList = await CartProducts.findAll({
      where: { id: cart_id },
      order: [["created_date", "DESC"]],
      attributes: [
        "id",
        "user_id",
        "product_type",
        "product_id",
        "quantity",
        "variant_id",
        "product_details",
        "id_coupon",
        [
          Sequelize.literal(
          `CASE WHEN ("product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure}) ANd (product_details ->> 'is_catalogue_design') = 'false' THEN (SELECT product_type FROM products WHERE id = "product_id")  ELSE null END`
        ), "single_product_type"],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT name FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT product_title from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT name from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT product_title from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_title from config_bracelet_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.StudConfigurator} THEN (SELECT name from stud_config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.PendantConfigurator} THEN (SELECT name from config_pendant_products WHERE id = "product_id") ELSE null END`
          ),
          "product_title",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT sku FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT sku from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT sku from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT sku from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT sku from config_bracelet_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.StudConfigurator} THEN (SELECT sku from stud_config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.PendantConfigurator} THEN (SELECT sku from config_pendant_products WHERE id = "product_id") ELSE null END`
          ),
          "product_sku",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT slug FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT slug from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT slug from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT slug from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT slug from config_bracelet_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.StudConfigurator} THEN (SELECT slug from stud_config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.PendantConfigurator} THEN (SELECT slug from config_pendant_products WHERE id = "product_id") ELSE null END`
          ),
          "product_slug",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} THEN (SELECT image_path FROM product_images WHERE id = CAST (product_details ->> 'image' AS integer)) WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT image_path FROM gift_set_product_images WHERE id_product = "product_id" AND image_type = 1 AND is_deleted = '0') ELSE (SELECT image_path FROM images where id = CAST (product_details ->> 'image' AS integer)) END`
          ),
          "product_image",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'image') = null THEN NULL WHEN (product_details ->> 'image') = 'null' THEN null WHEN (product_details ->> 'image') = 'undefined' THEN null WHEN (product_details ->> 'image') = '' THEN NULL  ELSE  CAST (product_details ->> 'image' AS integer) END`
          ),
          "product_image_id",
        ],
        [
          Sequelize.literal(
            ` CASE WHEN (product_details ->> 'size') = null THEN null WHEN (product_details ->> 'size') = 'null' THEN null  WHEN (product_details ->> 'size') = 'undefined' THEN NULL WHEN (product_details ->> 'size') = '' THEN NULL ELSE(SELECT size FROM items_sizes WHERE id = CAST (product_details ->> 'size' AS integer))END`
          ),
          "product_size",
        ],
        [
          Sequelize.literal(
            ` CASE WHEN (product_details ->> 'size') = null THEN null WHEN (product_details ->> 'size') = 'null' THEN null  WHEN (product_details ->> 'size') = 'undefined' THEN NULL WHEN (product_details ->> 'size') = '' THEN NULL ELSE CAST (product_details ->> 'size' AS integer)END`
          ),
          "size_id",
        ],
        [
          Sequelize.literal(
            ` CASE WHEN (product_details ->> 'length') = null THEN null WHEN (product_details ->> 'length') = 'null' THEN null  WHEN (product_details ->> 'length') = 'undefined' THEN NULL WHEN (product_details ->> 'length') = '' THEN NULL ELSE(SELECT length FROM items_lengths WHERE id = CAST (product_details ->> 'length' AS integer))END`
          ),
          "product_length",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'length') = null THEN null WHEN (product_details ->> 'length') = 'null' THEN null  WHEN (product_details ->> 'length') = 'undefined' THEN NULL WHEN (product_details ->> 'length') = '' THEN NULL ELSE CAST (product_details ->> 'length' AS integer)END`
          ),
          "length_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal') = null THEN null WHEN (product_details ->> 'metal') = 'null' THEN null  WHEN (product_details ->> 'metal') = 'undefined' THEN NULL WHEN (product_details ->> 'metal') = '' THEN NULL ELSE (SELECT metal_masters.name FROM metal_masters WHERE metal_masters.id = CAST (product_details ->> 'metal' AS integer)) END`
          ),
          "product_metal",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal') = null THEN null WHEN (product_details ->> 'metal') = 'null' THEN null  WHEN (product_details ->> 'metal') = 'undefined' THEN NULL WHEN (product_details ->> 'metal') = '' THEN NULL ELSE CAST (product_details ->> 'metal' AS integer) END`
          ),
          "metal_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal_tone') = null THEN null WHEN (product_details ->> 'metal_tone') = 'null' THEN null  WHEN (product_details ->> 'metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'metal_tone' AS integer) END`
          ),
          "metal_tone_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'karat') = null THEN null WHEN (product_details ->> 'karat') = 'null' THEN null  WHEN (product_details ->> 'karat') = 'undefined' THEN NULL WHEN (product_details ->> 'karat') = '' THEN NULL ELSE  CAST (product_details ->> 'karat' AS integer) END`
          ),
          "karat_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'karat') = null THEN null WHEN (product_details ->> 'karat') = 'null' THEN null  WHEN (product_details ->> 'karat') = 'undefined' THEN NULL WHEN (product_details ->> 'karat') = '' THEN NULL ELSE (SELECT name FROM gold_kts WHERE id = CAST (product_details ->> 'karat' AS integer)) END`
          ),
          "product_karat",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'metal_tone') = null THEN null WHEN (product_details ->> 'metal_tone') = 'null' THEN null  WHEN (product_details ->> 'metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'metal_tone' AS integer)) END`
          ),
          "Metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'head_metal_tone') = null THEN null WHEN (product_details ->> 'head_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'head_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'head_metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'head_metal_tone' AS integer)) END`
          ),
          "head_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'shank_metal_tone') = null THEN null WHEN (product_details ->> 'shank_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'shank_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'shank_metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'shank_metal_tone' AS integer)) END`
          ),
          "shank_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'band_metal_tone') = null THEN null WHEN (product_details ->> 'band_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'band_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'band_metal_tone') = '' THEN NULL ELSE (SELECT name FROM metal_tones WHERE id = CAST (product_details ->> 'band_metal_tone' AS integer)) END`
          ),
          "band_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'head_metal_tone') = null THEN null WHEN (product_details ->> 'head_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'head_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'head_metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'head_metal_tone' AS integer) END`
          ),
          "head_metal_tone_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'shank_metal_tone') = null THEN null WHEN (product_details ->> 'shank_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'shank_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'shank_metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'shank_metal_tone' AS integer) END`
          ),
          "shank_metal_tone_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'band_metal_tone') = null THEN null WHEN (product_details ->> 'band_metal_tone') = 'null' THEN null  WHEN (product_details ->> 'band_metal_tone') = 'undefined' THEN NULL WHEN (product_details ->> 'band_metal_tone') = '' THEN NULL ELSE CAST (product_details ->> 'band_metal_tone' AS integer) END`
          ),
          "band_metal_tone_id",
        ],
        [Sequelize.literal(`product_details ->> 'is_band'`), "is_band"],
        [
          Sequelize.literal(
            `CASE WHEN (product_details ->> 'selected_stone_price') = null THEN null WHEN (product_details ->> 'selected_stone_price') = 'null' THEN null  WHEN (product_details ->> 'selected_stone_price') = 'undefined' THEN NULL WHEN (product_details ->> 'selected_stone_price') = '' THEN NULL ELSE 1+CAST (product_details ->> 'selected_stone_price' AS DECIMAL(12, 1)) END`
          ),
          "selected_stone_price",
        ],
        [
          Sequelize.literal(`(CASE WHEN "product_type" = ${AllProductTypes.Config_Ring_product
            } THEN (0)
            
          WHEN "product_type" = ${AllProductTypes.PendantConfigurator} THEN
              (
                              WITH UniqueDGM AS (
                                SELECT DISTINCT ON (CPD.ID) 
                                  CPD.ID AS pendant_dia_id,
                                  DGM.RATE,
                                  CPD.DIA_WEIGHT,
                                  DGM.AVERAGE_CARAT,
                                  CPD.DIA_COUNT
                                FROM config_pendant_diamonds CPD
                                LEFT JOIN DIAMOND_GROUP_MASTERS DGM 
                                  ON DGM.ID_SHAPE = CPD.DIA_SHAPE::INTEGER
                                  AND DGM.MIN_CARAT_RANGE <= CPD.DIA_WEIGHT
                                  AND DGM.MAX_CARAT_RANGE >= CPD.DIA_WEIGHT
                                  AND DGM.ID_STONE = CAST(PRODUCT_DETAILS ->> 'stone' AS INTEGER)
                                  AND (
                                    ((PRODUCT_DETAILS ->> 'color' IS NULL OR PRODUCT_DETAILS ->> 'color' = '') AND DGM.ID_COLOR IS NULL)
                                    OR DGM.ID_COLOR = CAST(PRODUCT_DETAILS ->> 'color' AS INTEGER)
                                  )
                                  AND (
                                    ((PRODUCT_DETAILS ->> 'clarity' IS NULL OR PRODUCT_DETAILS ->> 'clarity' = '') AND DGM.ID_CLARITY IS NULL)
                                    OR DGM.ID_CLARITY = CAST(PRODUCT_DETAILS ->> 'clarity' AS INTEGER)
                                  )
                                  AND (
                                    ((PRODUCT_DETAILS ->> 'cut' IS NULL OR PRODUCT_DETAILS ->> 'cut' = '') AND DGM.ID_CUTS IS NULL)
                                    OR DGM.ID_CUTS = CAST(PRODUCT_DETAILS ->> 'cut' AS INTEGER)
                                  )
                                WHERE CPD.pendant_id = "product_id"
                              )
                              SELECT 
                                COALESCE(SUM((U.RATE * COALESCE(U.average_carat, U.DIA_WEIGHT)) * U.DIA_COUNT), 0) +
                                COALESCE(((CASE WHEN PRODUCT_DETAILS ->> 'diamond_type' = '1' THEN CDGM.RATE ELSE CDGM.SYNTHETIC_RATE END) * (CS.VALUE::DOUBLE PRECISION) * CPP.CENTER_DIA_COUNT), 0) +
                                COALESCE(CASE
                                      WHEN CPM.KARAT_ID IS NULL THEN
                                          MM.METAL_RATE * CPM.METAL_WT + COALESCE(CPP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(CPP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                                      ELSE
                                          MM.METAL_RATE / MM.CALCULATE_RATE * GK.CALCULATE_RATE::DOUBLE PRECISION * CPM.METAL_WT +
                                          COALESCE(CPP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(CPP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                                  END, 0)
                              FROM config_pendant_products CPP
                              LEFT JOIN config_pendant_metals CPM ON CPM.pendant_id = CPP.ID
                              LEFT JOIN metal_masters MM ON MM.ID = CPM.metal_id
                              LEFT JOIN gold_kts GK ON GK.ID = CPM.karat_id
                              LEFT JOIN carat_sizes CS ON CS.ID = CPP.CENTER_DIA_WT
                              LEFT JOIN UniqueDGM U ON TRUE
                              LEFT JOIN DIAMOND_GROUP_MASTERS CDGM 
                                ON CDGM.ID = CAST(PRODUCT_DETAILS ->> 'group_id' AS INTEGER)
                              WHERE CPP.ID = "product_id"
                              AND CPP.is_deleted = '${DeletedStatus.No}'
                              AND CPP.is_active = '${ActiveStatus.Active}'
                              GROUP BY CPP.ID, 
                              CDGM.RATE,
                                CDGM.SYNTHETIC_RATE,
                                cs.value,
                                CPP.LABOUR_CHARGE,
                                CPP.OTHER_CHARGE,
                                MM.METAL_RATE,
                                MM.CALCULATE_RATE,
                                GK.NAME,
                                GK.CALCULATE_RATE,
                                CPM.METAL_WT,
                                CPM.KARAT_ID,
                                CPP.CENTER_DIA_COUNT
                            )

          WHEN "product_type" = ${AllProductTypes.StudConfigurator} THEN
              (
                              WITH UniqueDGM AS (
                                SELECT DISTINCT ON (SD.ID) 
                                  SD.ID AS stud_dia_id,
                                  DGM.RATE,
                                  SD.DIA_WEIGHT,
                                  DGM.AVERAGE_CARAT,
                                  SD.DIA_COUNT
                                FROM STUD_DIAMONDS SD
                                LEFT JOIN DIAMOND_GROUP_MASTERS DGM 
                                  ON DGM.ID_SHAPE = SD.DIA_SHAPE::INTEGER
                                  AND DGM.MIN_CARAT_RANGE <= SD.DIA_WEIGHT
                                  AND DGM.MAX_CARAT_RANGE >= SD.DIA_WEIGHT
                                  AND DGM.ID_STONE = CAST(PRODUCT_DETAILS ->> 'stone' AS INTEGER)
                                  AND (
                                    ((PRODUCT_DETAILS ->> 'color' IS NULL OR PRODUCT_DETAILS ->> 'color' = '') AND DGM.ID_COLOR IS NULL)
                                    OR DGM.ID_COLOR = CAST(PRODUCT_DETAILS ->> 'color' AS INTEGER)
                                  )
                                  AND (
                                    ((PRODUCT_DETAILS ->> 'clarity' IS NULL OR PRODUCT_DETAILS ->> 'clarity' = '') AND DGM.ID_CLARITY IS NULL)
                                    OR DGM.ID_CLARITY = CAST(PRODUCT_DETAILS ->> 'clarity' AS INTEGER)
                                  )
                                  AND (
                                    ((PRODUCT_DETAILS ->> 'cut' IS NULL OR PRODUCT_DETAILS ->> 'cut' = '') AND DGM.ID_CUTS IS NULL)
                                    OR DGM.ID_CUTS = CAST(PRODUCT_DETAILS ->> 'cut' AS INTEGER)
                                  )
                                WHERE SD.STUD_ID = "product_id"
                              )
                              SELECT 
                                COALESCE(SUM((U.RATE * COALESCE(U.average_carat, U.DIA_WEIGHT)) * U.DIA_COUNT), 0) +
                                COALESCE(((CASE WHEN PRODUCT_DETAILS ->> 'diamond_type' = '1' THEN CDGM.RATE ELSE CDGM.SYNTHETIC_RATE END) * (CS.VALUE::DOUBLE PRECISION) * SCP.CENTER_DIA_COUNT), 0) +
                                COALESCE(CASE
                                      WHEN SM.KARAT_ID IS NULL THEN
                                          MM.METAL_RATE * SM.METAL_WT + COALESCE(SCP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(SCP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                                      ELSE
                                          MM.METAL_RATE / MM.CALCULATE_RATE * GK.CALCULATE_RATE::DOUBLE PRECISION * SM.METAL_WT +
                                          COALESCE(SCP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(SCP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                                  END, 0)
                              FROM stud_config_products SCP
                              LEFT JOIN stud_metals SM ON SM.stud_id = SCP.ID
                              LEFT JOIN metal_masters MM ON MM.ID = SM.metal_id
                              LEFT JOIN gold_kts GK ON GK.ID = SM.karat_id
                              LEFT JOIN carat_sizes CS ON CS.ID = SCP.CENTER_DIA_WT
                              LEFT JOIN UniqueDGM U ON TRUE
                              LEFT JOIN DIAMOND_GROUP_MASTERS CDGM 
                                ON CDGM.ID = CAST(PRODUCT_DETAILS ->> 'group_id' AS INTEGER)
                              WHERE SCP.ID = "product_id"
                              GROUP BY SCP.ID, 
                              CDGM.RATE,
                                CDGM.SYNTHETIC_RATE,
                                cs.value,
                                SCP.LABOUR_CHARGE,
                                SCP.OTHER_CHARGE,
                                MM.METAL_RATE,
                                MM.CALCULATE_RATE,
                                GK.NAME,
                                SM.METAL_WT,
                                SM.KARAT_ID,
                                GK.CALCULATE_RATE,
                                SCP.CENTER_DIA_COUNT
                            )

          WHEN "product_type" = ${AllProductTypes.Three_stone_config_product
            } THEN 
                (0)
                WHEN "product_type" = ${AllProductTypes.Product}
                      THEN (SELECT CASE WHEN products.product_type = ${SingleProductType.VariantType
            } OR (products.product_type = ${SingleProductType.cataLogueProduct
            } AND (product_details ->> 'is_catalogue_design') = 'true') THEN CEIL(PMO.retail_price)*"cart_products"."quantity" ELSE  CASE WHEN PMO.id_karat IS NULL
                        THEN CEIL(metal_master.metal_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+
                          (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0)))*"cart_products"."quantity" ELSE
                          CEIL(metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+
                          (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0)))*"cart_products"."quantity" END END
                          FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product =
                          products.id LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product =
                          products.id AND PDO.is_deleted = '0' LEFT OUTER JOIN metal_masters
                          AS metal_master ON metal_master.id = PMO.id_metal LEFT OUTER JOIN
                          diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN
                          gold_kts ON gold_kts.id = PMO.id_karat WHERE CASE WHEN products.product_type = ${SingleProductType.VariantType
            } THEN products.id = "product_id" AND PMO.id = "variant_id" ELSE  CASE WHEN PMO.id_karat IS NULL THEN
                          products.id = "product_id" AND PMO.id_metal = CAST (product_details ->> 'metal' AS integer)
                          ELSE products.id = "product_id" AND PMO.id_metal = CAST (product_details ->> 'metal' AS integer)
                          AND PMO.id_karat = CASE WHEN (product_details ->> 'karat') = 'null' THEN null ELSE CAST
                          (product_details ->> 'karat' AS integer) END END END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, pmo.metal_weight,
                          products.making_charge, products.finding_charge, products.other_charge,PMO.id_karat, gold_kts.calculate_rate, products.product_type, PMO.retail_price)
 WHEN "product_type" = ${AllProductTypes.GiftSet_product
            } THEN (SELECT  CEIL(price)*"cart_products"."quantity" FROM gift_set_products WHERE id = "product_id") 
                WHEN "product_type" = ${AllProductTypes.BirthStone_product
            } THEN (SELECT CEIL(price)*"cart_products"."quantity" FROM  birthstone_products
LEFT JOIN birthstone_product_metal_options AS birthstone_PMO ON id_product = birthstone_products.id 
WHERE birthstone_PMO.id = "variant_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (0)
 WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} 
 THEN (0)
  WHEN "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure}
    THEN (SELECT (CASE WHEN p.product_type = 2 THEN (pmo.retail_price - COALESCE(pmo.center_diamond_price,0))ELSE CASE WHEN pmo.id_karat IS NOT NULL THEN 
                  metal.metal_rate / metal.calculate_rate * kt.calculate_rate * 
                  pmo.metal_weight::double precision
                  ELSE 
                  metal.metal_rate * pmo.metal_weight::double precision
                  END + CASE WHEN '0' = '1' THEN  pd.with_out_diamond_price ELSE pd.with_out_diamond_price END + p.making_charge::double precision
                  + p.finding_charge::double precision + p.other_charge::double precision END) 
              FROM products p
               LEFT JOIN setting_styles ss on ss.id::text =  setting_style_type
              LEFT JOIN product_metal_options pmo on pmo.id_product =  p.id AND pmo.id = "variant_id"
              LEFT JOIN metal_masters metal ON metal.id = pmo.id_metal
              LEFT JOIN gold_kts kt ON kt.id = pmo.id_karat
              LEFT JOIN (
                        SELECT DISTINCT ON (pdo.id_product)
                          pdo.id_product,
                         
                  sum(
                          CASE WHEN PDO.IS_BAND IS FALSE THEN CASE
                              WHEN dgm.rate IS NOT NULL AND dgm.rate <> 0::double precision THEN dgm.rate
                              ELSE dgm.synthetic_rate
                          END  * pdo.weight::double precision * pdo.count::double precision ELSE 0 END) as with_out_diamond_price,
                  sum(
                           CASE
                              WHEN dgm.rate IS NOT NULL AND dgm.rate <> 0::double precision THEN dgm.rate
                              ELSE dgm.synthetic_rate
                          END  * pdo.weight::double precision * pdo.count::double precision) as with_diamond_price
                        FROM product_diamond_options pdo
                        LEFT JOIN diamond_group_masters dgm ON dgm.id = pdo.id_diamond_group
                        WHERE pdo.id_product = "product_id" AND pdo.id_type = 2
                  GROUP BY pdo.id_product
                      ) pd ON pd.id_product = p.id

              AND p.id = "product_id")
        ELSE null END)`),
          "product_price",
        ],
        [
          Sequelize.literal(`(CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure}  THEN 
            (SELECT diamond_shapes.name FROM product_diamond_options 
            LEFT JOIN diamond_group_masters ON diamond_group_masters.id = id_diamond_group
            INNER JOIN diamond_shapes  ON diamond_shapes.id = diamond_group_masters.id_shape
            WHERE id_product = "product_id" ORDER by id_type ASC LIMIT 1) 

            WHEN "product_type" = ${AllProductTypes.Config_Ring_product} OR "product_type" = ${AllProductTypes.Three_stone_config_product} THEN
            (SELECT diamond_shapes.name FROM config_products 
            LEFT JOIN diamond_shapes ON diamond_shapes.id = center_dia_shape_id
            WHERE config_products.id = "product_id")

            WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN
            (SELECT diamond_shapes.name FROM birthstone_product_diamond_options 
            LEFT JOIN diamond_shapes ON id_shape = diamond_shapes.id
            WHERE id_product = "product_id" AND birthstone_product_diamond_options.is_deleted = '0' ORDER BY id_type ASC LIMIT 1)

            WHEN "product_type" = ${AllProductTypes.Config_band_product} THEN
            (SELECT diamond_shapes.name FROM config_eternity_product_diamonds  
            INNER JOIN diamond_shapes ON diamond_shapes.id = dia_shape
            WHERE config_eternity_product_diamonds.id = "product_id")

            WHEN "product_type" = ${AllProductTypes.StudConfigurator} THEN
            (SELECT diamond_shapes.name FROM stud_config_products
            LEFT JOIN diamond_shapes ON diamond_shapes.id = center_dia_shape
            WHERE stud_config_products.id = "product_id")

            WHEN "product_type" = ${AllProductTypes.PendantConfigurator} THEN
            (SELECT diamond_shapes.name FROM config_pendant_products
            LEFT JOIN diamond_shapes ON diamond_shapes.id = center_dia_shape
            WHERE config_pendant_products.id = "product_id")

            WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN
            (SELECT diamond_shapes.name FROM config_bracelet_product_diamonds 
            LEFT JOIN diamond_shapes ON diamond_shapes.id = id_shape
            WHERE config_product_id = "product_id" LIMIT 1)
            END)`),
          "diamond_shape",
        ],
        [
          Sequelize.literal(`(CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure}  THEN 
            (SELECT categories.category_name FROM product_categories 
            INNER JOIN categories ON categories.id = id_category
            WHERE id_product = "product_id" ORDER BY product_categories.id ASC LIMIT 1) 

            WHEN "product_type" = ${AllProductTypes.Config_Ring_product} OR "product_type" = ${AllProductTypes.Three_stone_config_product} THEN
            'Ring'
            
            WHEN "product_type" = ${AllProductTypes.StudConfigurator} THEN
            'Earring'
            
            WHEN "product_type" = ${AllProductTypes.PendantConfigurator} THEN
            'Pendant'

            WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN
            (SELECT categories.category_name FROM birthstone_product_categories 
            INNER JOIN categories ON categories.id = id_category
            WHERE id_product = "product_id" ORDER BY birthstone_product_categories.id ASC LIMIT 1)

            WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN
            'Eternity Band'
            WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN
            'Bracelet'
            END)`),
          "category",
        ],
        [
        Sequelize.literal(`
            CASE 
              WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN
                (
                  SELECT 
                    CASE  
                      WHEN remaing_quantity_count IS NOT NULL AND remaing_quantity_count > 0 
                      THEN CURRENT_DATE + INTERVAL '${IN_STOCK_PRODUCT_DELIVERY_TIME} days' 
                      ELSE CURRENT_DATE + INTERVAL '${OUT_OF_STOCK_PRODUCT_DELIVERY_TIME} days' 
                    END AS estimated_date 
                  FROM product_metal_options 
                  WHERE id = "variant_id"
                )
              WHEN "product_type" = ${AllProductTypes.Config_Ring_product} 
                OR "product_type" = ${AllProductTypes.Three_stone_config_product} 
                OR "product_type" = ${AllProductTypes.BirthStone_product} 
                OR "product_type" = ${AllProductTypes.Eternity_product} 
                OR "product_type" = ${AllProductTypes.StudConfigurator} 
                OR "product_type" = ${AllProductTypes.PendantConfigurator} 
                OR "product_type" = ${AllProductTypes.BraceletConfigurator} THEN
                CURRENT_DATE + INTERVAL '${OUT_OF_STOCK_PRODUCT_DELIVERY_TIME} days'
            END
          `),
        "delivery_date",
        ],
        [Sequelize.literal(`'0'`), "diamond_price"],
        [Sequelize.literal(`null`), "diamond_details"],
      ],
    });

    const cartProductListNew = []
    for (let index = 0; index < cartProductList.length; index++) {
      const element = cartProductList[index];
      
      let data = element
      let price = 0
      if (data.dataValues.product_type === AllProductTypes.Config_Ring_product) {
       price = await getRingConfigProductPriceForCart( data.dataValues.product_id, data.dataValues.is_band)
      } else if (data.dataValues.product_type === AllProductTypes.Three_stone_config_product) {
        price = await getThreeStoneConfigProductPriceForCart(data.dataValues.product_id, data.dataValues.is_band)
      } else if (data.dataValues.product_type === AllProductTypes.Eternity_product) {
        price = await getEternityConfigProductPrice(data.dataValues.product_id)
      } else if (data.dataValues.product_type === AllProductTypes.BraceletConfigurator) {
        price = await getBraceletConfigProductPrice(data.dataValues.product_id)
      } else {
        price = data.dataValues.product_price
      } 
      cartProductListNew.push({...data, dataValues: {...data.dataValues, product_price: price, single_product_type: data.dataValues.single_product_type } })
    }

    if (cartProductListNew.length === 0) {
          return resSuccess({
            data: {
              cart_count: 0,
              discount_amount: "0",
              sub_total: "0",
              coupon: null,
              tax: null,
              total_tax_amount: "0",
              cart_total: "0",
              cart_list: [],
            },
          });
    }
    
    let amountList = []
    for (let index = 0; index < cartProductListNew.length; index++) {
      const element = cartProductListNew[index];
      const productType = await getProductTypeForPriceCorrection(element.dataValues.product_type, element.dataValues.single_product_type)
      const price = await formatPriceWithoutSeparator(element.dataValues.product_price, productType)
      amountList.push(price)
    }

  let amount = await amountList.reduce((accumulator:any, currentValue) => {
            return accumulator + currentValue;
          }, 0);
            const cart_list_count = await CartProducts.sum("quantity", {
           where: { id: cart_id },
        });
        const applyDiscount = await applyOfferWithBuyNewOneGetOne(req,
          {
            discount_amount: 0,
            sub_total:amount,        
            cart_list: cartProductListNew,
            cart_total_quantity: cart_list_count
          },
    )
    let cartProducts = []
    for (let index = 0; index < applyDiscount.data.cart_list.length; index++) {
      const element = applyDiscount.data.cart_list[index];
      const productType = await getProductTypeForPriceCorrection(element.product_type, element.single_product_type)
           cartProducts.push({
          ...element,
              product_price: await req.formatPrice(element.product_price + Number(element?.product_details?.diamond?.price || 0),productType),
          after_discount_product_price: await req.formatPrice(element.after_discount_product_price + Number(element?.product_details?.diamond?.price || 0),productType),
        })
    }
         amount = applyDiscount.data.cart_list
      .map((item: any) => parseFloat(item.after_discount_product_price + Number(item?.product_details?.diamond?.price || 0)))
      .reduce((accumulator, currentValue) => {
        return accumulator + currentValue;
      }, 0);
        
        const findCoupon = await CouponData.findOne({
          where: {
            id: cartProductList[0].dataValues.id_coupon,
            is_deleted: DeletedStatus.No,
          },
        });
        let discount: any = 0;
    
        if (findCoupon && findCoupon.dataValues) {
          if (
            findCoupon.dataValues.discount_type ==
            COUPON_DISCOUNT_TYPE.PercentageDiscount
          ) {
            // Calculate percentage discount
            discount = (
              (findCoupon.dataValues.percentage_off / 100) * amount
            ).toFixed(2);
          } else if (
            findCoupon.dataValues.discount_type ==
            COUPON_DISCOUNT_TYPE.FixedAmountDiscount
          ) {
            discount = (findCoupon.dataValues.discount_amount).toFixed(2);
          }
    
          if (
            findCoupon.dataValues.maximum_discount_amount &&
            findCoupon.dataValues.maximum_discount_amount < discount
          ) {
            discount = Number(findCoupon.dataValues.maximum_discount_amount).toFixed(2);
          }
        }
    
        const discountedAmount: any = Math.max(amount - discount, 0);
    
    
        let orderDiscount = applyDiscount.data.orderDiscount || 0;
        const orderDiscountedAmount: any = Math.max(discountedAmount - orderDiscount, 0);
    
        const taxValues = await TaxMaster.findAll({
          where: { is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No },
        });
        let productTaxAmount: any;
        let productTax: any;
        let allTax = [];
        let taxRateData = [];
        for (const taxData of taxValues) {
          productTax = taxData.dataValues.rate / 100;
          productTaxAmount = orderDiscountedAmount * productTax;
    
          taxRateData.push({
            rate: taxData.dataValues.rate,
            tax_amount: await req.formatPriceForFloatValue(productTaxAmount),
            name: taxData.dataValues.name,
          });
          allTax.push(Number(productTaxAmount).toFixed(2));
        }
    
        
        const sumTotal = allTax.reduce((accumulator, currentValue) => {
          return Number(accumulator) + Number(currentValue);
        }, 0);
        
    
        const totalOrderAmount = orderDiscountedAmount + (sumTotal);
    
        let shippingChargeValue: any = 0;
        let shippingChargeWithoutFormate: any = 0;
        const shippingCharge = await applyShippingCharge( amount, req?.query);
        if (shippingCharge.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          shippingChargeValue = 0;
          shippingChargeWithoutFormate = 0
        } else {
          shippingChargeValue = await req.formatPriceForFloatValue(
            shippingCharge.data.shipping_charge
          );
          shippingChargeWithoutFormate = shippingCharge.data.shipping_charge
        }
        return resSuccess({
          data: {
            cart_count: cart_list_count,
            order_offer: applyDiscount.data.applyDiscount,
            discount_amount: await req.formatPriceForFloatValue(discount),
            order_discount_amount: await req.formatPriceForFloatValue(orderDiscount),
            order_offer_detail: applyDiscount.data.appliedOrderOffers,
            sub_total: await req.formatPrice(amount, null),
            shipping_charge: shippingChargeValue || "0",
            coupon: {
              id: findCoupon?.dataValues?.id,
              name: findCoupon?.dataValues?.name,
              code: findCoupon?.dataValues?.coupon_code,
              description: findCoupon?.dataValues?.description,
            },
            tax: taxRateData,
            total_tax_amount: await req.formatPrice(sumTotal, null),
            cart_total: await req.formatPrice(
              totalOrderAmount + shippingChargeWithoutFormate,null),
            cart_list: cartProducts,
          },
        });
  } catch (error) {
    throw error;
  }
};
