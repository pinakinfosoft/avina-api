import { Request } from "express";
import {
  getCompanyIdBasedOnTheCompanyKey,
  addActivityLogs,
  getInitialPaginationFromQuery,
  getLocalDate,
  getLocationBasedOnIPAddress,
  prepareMessageFromParams,
  resBadRequest,
  resErrorDataExit,
  resNotFound,
  resSuccess,
  resUnknownError,
  getRingConfigProductPriceForCart,
  getThreeStoneConfigProductPriceForCart,
  getEternityConfigProductPrice,
  getBraceletConfigProductPrice,
  getProductTypeForPriceCorrection,
} from "../../utils/shared-functions";
import {
  DATA_ALREADY_EXIST,
  DATA_NOT_FOUND,
  DEFAULT_STATUS_CODE_SUCCESS,
  ERROR_NOT_FOUND,
  ERROR_PRODUCT_ALREADY_EXIST_IN_WISH_LIST,
  INVALID_ID,
  PRODUCT_NOT_FOUND,
  PRODUCT_VARIANT_NOT_FOUND,
  RECORD_DELETE_SUCCESSFULLY,
  REQUIRED_ERROR_MESSAGE,
  USER_NOT_FOUND,
} from "../../utils/app-messages";
import { Op, QueryTypes, Sequelize, where } from "sequelize";
import {
  ActiveStatus,
  AllProductTypes,
  DeletedStatus,
  DIAMOND_INVENTROY_TYPE,
  DIAMOND_ORIGIN,
  IMAGE_TYPE,
  LogsActivityType,
  LogsType,
  PRODUCT_IMAGE_TYPE,
  SingleProductType,
} from "../../utils/app-enumeration";
import { moveFileToS3ByType } from "../../helpers/file.helper";
import dbContext from "../../config/db-context";
import { AppUser } from "../model/app-user.model";
import { Product } from "../model/product.model";
import { ProductWish } from "../model/produc-wish-list.model";
import { ProductMetalOption } from "../model/product-metal-option.model";
import { ProductImage } from "../model/product-image.model";
import { MetalMaster } from "../model/master/attributes/metal/metal-master.model";
import { MetalTone } from "../model/master/attributes/metal/metalTone.model";
import { GoldKarat } from "../model/master/attributes/metal/gold-karat.model";
import { SizeData } from "../model/master/attributes/item-size.model";
import { LengthData } from "../model/master/attributes/item-length.model";
import { CustomerUser } from "../model/customer-user.model";
import { LooseDiamondGroupMasters } from "../model/loose-diamond-group-master.model";
import { Image } from "../model/image.model";
import { StudConfigProduct } from "../model/stud-config-product.model";
import { CartProducts } from "../model/cart-product.model";

export const addProductWishList = async (req: Request) => {
  try {
    const { user_id, product_id, product_type } = req.body;
    
    const wishListproduct = {
      user_id: user_id,
      product_id: product_id,
      product_type: product_type,
      created_date: getLocalDate(),
    };

    const userExit = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });
    const productExit = await Product.findOne({
      where: { id: product_id, is_deleted: DeletedStatus.No },
    });

    if (!(userExit && userExit.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }
    if (!(productExit && productExit.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }
    const addProductData = await ProductWish.create(wishListproduct);

    const wish_list_count = await ProductWish.count({
      where: { user_id: user_id },
    });
    await addActivityLogs([{
      old_data: null,
      new_data: {
        product_wish_list_id: addProductData?.dataValues?.id,
        wishlist_data: {
          ...addProductData?.dataValues
        },
        user_id: userExit?.dataValues?.id,
        user_data: { ...userExit }
      }
    }], addProductData?.dataValues?.id, LogsActivityType.Add, LogsType.ProductWishList, req?.body?.session_res?.id_app_user)

    return resSuccess({ data: { wish_list_count, addProductData } });
  } catch (error) {
    throw error;
  }
};

export const getProductWishListByUserId = async (req: Request) => {
  try {

    if (!req.body.user_id) return resBadRequest({ message: INVALID_ID });
    
    const userData = await AppUser.findOne({ where: { id: req.body.user_id } });
    if (!(userData && userData.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    const wishlistData = await ProductWish.findAll({
      where: { user_id: userData.dataValues.id },
    });

    const productId = wishlistData.map((t: any) => t.product_id);

    const ProductList = await Product.findAll({
      where: { id: productId },
      order: [
        [{ model: ProductMetalOption, as: "PMO" }, "id_metal", "ASC"],
        [Sequelize.literal('"PMO->metal_karat"."name"'), "ASC"],
        [Sequelize.literal('"product_images"."id_metal_tone"'), "ASC"],
        [Sequelize.literal('"product_images"."id"'), "ASC"],
      ],
      attributes: [
        "id",
        "name",
        "sku",
        "slug",
        "sort_description",
        "long_description",
      ],
      include: [
        {
          required: false,
          model: ProductImage,
          as: "product_images",
          attributes: ["id", "image_path", "id_metal_tone", "image_type"],
          where: [{ is_deleted: DeletedStatus.No, image_type: PRODUCT_IMAGE_TYPE.Feature }],
        },
        {
          required: false,
          model: ProductMetalOption,
          as: "PMO",
          attributes: [
            "id",
            "id_metal",
            "metal_weight",
            [Sequelize.literal('"PMO->metal_karat"."name"'), "karat"],
            [
              Sequelize.literal(`
                CASE 
                  WHEN "PMO"."id_metal_tone" IS NULL OR TRIM("PMO"."id_metal_tone") = '' THEN '{}'::int[] 
                  ELSE string_to_array(TRIM(BOTH '|' FROM "PMO"."id_metal_tone"), '|')::int[]
                END
              `),
              'metal_tone'
            ],
            [
              Sequelize.literal(
                `CASE WHEN "PMO".id_karat IS NULL THEN (SELECT metal_tones.sort_code  FROM metal_tones WHERE id = 46) ELSE null END`
              ),
              "sort_code",
            ],
            [
              Sequelize.literal(
                `CASE WHEN "products"."product_type" = 2 THEN "PMO"."retail_price" ELSE (SELECT CASE WHEN "PMO"."id_karat" IS NULL THEN(metal_master.metal_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0))) ELSE (metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0))) END FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product = products.id LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id AND PDO.is_deleted = '0' LEFT OUTER JOIN metal_masters AS metal_master ON metal_master.id = PMO.id_metal LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN gold_kts ON gold_kts.id = PMO.id_karat WHERE CASE WHEN PMO.id_karat IS NULL THEN products.id = "PMO"."id_product" AND PMO.id_metal = "PMO"."id_metal" ELSE products.id = "PMO"."id_product" AND PMO.id_metal = "PMO"."id_metal" AND PMO.id_karat = "PMO"."id_karat" END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, PMO.metal_weight, products.making_charge, products.finding_charge, products.other_charge,PMO.id_karat, gold_kts.calculate_rate) END`
              ),
              "Price",
            ],
            "retail_price",
            "compare_price",
            "id_karat",
          ],
          where: { is_deleted: DeletedStatus.No },
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
              where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
            },
          ],
        },
      ],
    });

    return resSuccess({ data: ProductList });
  } catch (error) {
    throw error;
  }
};

export const deleteProductWishList = async (req: Request) => {
  try {
    const { user_id, product_id } = req.body;
    
    const userExit = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });
    const productExit = await Product.findOne({
      where: { id: product_id, is_deleted: DeletedStatus.No },
    });

    if (!(userExit && userExit.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }
    if (!(productExit && productExit.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    await ProductWish.destroy({
      where: {
        user_id: userExit.dataValues.id,
        product_id: productExit.dataValues.id,
      },
    });

    const wish_list_count = await ProductWish.count({
      where: { user_id: user_id },
    });

    await addActivityLogs( [{
      old_data: { product_wish_list_id: productExit?.dataValues?.id, data: { ...productExit?.dataValues }, user_id: userExit?.dataValues?.id, user_data: { ...userExit } },
      new_data: null
    }], productExit?.dataValues?.id, LogsActivityType.Delete, LogsType.ProductWishList, req?.body?.session_res?.id_app_user)

    return resSuccess({
      message: RECORD_DELETE_SUCCESSFULLY,
      data: wish_list_count,
    });
  } catch (error) {
    throw error;
  }
};

export const getProductWishListData = async (req: Request) => {
  try {
    let paginationProps = {};

    let pagination = {
      ...getInitialPaginationFromQuery(req.query),
      search_text: req.query.search_text,
    };
    let noPagination = req.query.no_pagination === "1";
    const searchText = pagination.search_text;
    const whereArray: any[] = [
      searchText
        ? {
          [Op.or]: [
            // Search in user full_name
            Sequelize.where(
              Sequelize.literal(`"user"."full_name"`),
              {
                [Op.iLike]: `%${searchText}%`
              }
            ),

            // Search in dynamic product tables based on product_type
            Sequelize.where(
              Sequelize.literal(`
              CASE 
                WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} THEN 
                  (SELECT COUNT(*) FROM products WHERE id = "product_id" AND 
                    (REPLACE(name, 'ct', 'k') ILIKE '%${searchText}%' OR sku ILIKE '%${searchText}%' OR name ILIKE '%${searchText}%'))
                WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN 
                  (SELECT COUNT(*) FROM gift_set_products WHERE id = "product_id" AND 
                    (product_title ILIKE '%${searchText}%' OR sku ILIKE '%${searchText}%' OR product_title ILIKE '%${searchText}%'))
                WHEN "product_type" IN (${AllProductTypes.Config_Ring_product}, ${AllProductTypes.Three_stone_config_product}) THEN 
                  (SELECT COUNT(*) FROM config_products WHERE id = "product_id" AND 
                    (REPLACE(product_title, 'ct', 'k') ILIKE '%${searchText}%' OR sku ILIKE '%${searchText}%' OR product_title ILIKE '%${searchText}%'))
                WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN 
                  (SELECT COUNT(*) FROM birthstone_products WHERE id = "product_id" AND 
                    (REPLACE(name, 'ct', 'k') ILIKE '%${searchText}%' OR sku ILIKE '%${searchText}%' OR name ILIKE '%${searchText}%'))
                WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN 
                  (SELECT COUNT(*) FROM config_eternity_products WHERE id = "product_id" AND 
                    (REPLACE(product_title, 'ct', 'k') ILIKE '%${searchText}%' OR sku ILIKE '%${searchText}%' OR product_title ILIKE '%${searchText}%'))
                WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN 
                  (SELECT COUNT(*) FROM config_bracelet_products WHERE id = "product_id" AND 
                    (REPLACE(product_title, 'ct', 'k') ILIKE '%${searchText}%' OR sku ILIKE '%${searchText}%' OR product_title ILIKE '%${searchText}%'))
                ELSE null
              END
            `),
              { [Op.gt]: 0 }
            ),

            // Search in customer_users table by name or email
            Sequelize.where(
              Sequelize.literal(`
              (SELECT COUNT(*) FROM customer_users 
                WHERE id_app_user = user_id 
                AND (full_name ILIKE '%${searchText}%' OR email ILIKE '%${searchText}%'))
            `),
              { [Op.gt]: 0 }
            )
          ]
        }
        : {}
    ];

    // ✅ Merge all conditions into one object
    const where = Object.assign({}, ...whereArray);

    let include = [
      {
        model: SizeData,
        as: "size",
        attributes: [],
        required: false
      },
      {
        model: LengthData,
        as: "length",
        attributes: [],
        required: false
      },
      {
        model: MetalMaster,
        as: "metal",
        attributes: [],
        required: false
      },
      {
        model: GoldKarat,
        as: "karat",
        attributes: [],
        required: false
      },
      {
        model: MetalTone,
        as: "metal_tone",
        attributes: [],
        required: false
      },
      {
        model: MetalTone,
        as: "head_metal_tone",
        attributes: [],
        required: false
      },
      {
        model: MetalTone,
        as: "shank_metal_tone",
        attributes: [],
        required: false
      },
      {
        model: MetalTone,
        as: "band_metal_tone",
        attributes: [],
        required: false
      },
      {
        model: CustomerUser,
        as: "user",
        attributes: [],
        required: false
      },
    ];
    if (!noPagination) {
      const totalItems = await ProductWish.count({ where, include });

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

    const result = await ProductWish.findAll({
      ...paginationProps,
      where,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "user_id",
        "product_type",
        "product_id",
        // "is_band",
        "product_details",
        "product_type",
        [Sequelize.literal(`"user"."full_name"`), "user_name"],
        [Sequelize.literal(`"user"."email"`), "user_email"],
        [Sequelize.literal(`"user"."mobile"`), "user_phone_number"],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT name FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT product_title from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT name from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT product_title from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_title from config_bracelet_products WHERE id = "product_id") ELSE null END`
          ),
          "product_title",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT sku FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT sku from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT sku from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT sku from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT sku from config_bracelet_products WHERE id = "product_id") ELSE null END`
          ),
          "product_sku",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} OR "product_type" = ${AllProductTypes.SingleTreasure} THEN (SELECT slug FROM products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT slug from gift_set_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Config_Ring_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Three_stone_config_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BirthStone_product} THEN (SELECT slug from birthstone_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.Eternity_product} THEN (SELECT slug from config_eternity_products WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.BraceletConfigurator} THEN (SELECT slug from config_bracelet_products WHERE id = "product_id") ELSE null END`
          ),
          "product_slug",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "product_type" = ${AllProductTypes.Product} OR "product_type" = ${AllProductTypes.SettingProduct} THEN (SELECT image_path FROM product_images WHERE id = CAST (product_details ->> 'id_image' AS integer)) WHEN "product_type" = ${AllProductTypes.GiftSet_product} THEN (SELECT image_path FROM gift_set_product_images WHERE id_product = "product_id" AND image_type = 1 AND is_deleted = '0') WHEN "product_type" = ${AllProductTypes.LooseDiamond} THEN (SELECT image_path FROM loose_diamond_group_masters where id = "product_id") ELSE (SELECT image_path FROM images where id = CAST (product_details ->> 'id_image' AS integer)) END`
          ),
          "product_image",
        ],
        [
          Sequelize.literal(`CAST (product_details ->> 'id_image' AS integer)`),
          "product_image_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_size" IS NOT NULL THEN json_build_object('id', "size"."id", 'size', "size"."size") ELSE null END`
          ),
          "product_size",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_length" IS NOT NULL THEN json_build_object('id', "length"."id", 'length', "length"."length") ELSE null END`
          ),
          "product_length",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "wishlist_products"."id_metal" IS NOT NULL THEN json_build_object('id', "metal"."id", 'name', "metal"."name") ELSE null END`
          ),
          "product_metal",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_karat" IS NOT NULL THEN json_build_object('id', "karat"."id", 'name', "karat"."name", 'slug', "karat"."slug") ELSE null END`
          ),
          "product_karat",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_metal_tone" IS NOT NULL THEN json_build_object('id', "metal_tone"."id", 'name', "metal_tone"."name", 'slug', "metal_tone"."slug", 'sort_code', "metal_tone"."sort_code") ELSE null END`
          ),
          "product_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_head_metal_tone" IS NOT NULL THEN json_build_object('id', "head_metal_tone"."id", 'name', "head_metal_tone"."name", 'slug', "head_metal_tone"."slug", 'sort_code', "head_metal_tone"."sort_code") ELSE null END`
          ),
          "product_head_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_shank_metal_tone" IS NOT NULL THEN json_build_object('id', "shank_metal_tone"."id", 'name', "shank_metal_tone"."name", 'slug', "shank_metal_tone"."slug", 'sort_code', "shank_metal_tone"."sort_code") ELSE null END`
          ),
          "product_shank_metal_tone",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_band_metal_tone" IS NOT NULL THEN json_build_object('id', "band_metal_tone"."id", 'name', "band_metal_tone"."name", 'slug', "band_metal_tone"."slug", 'sort_code', "band_metal_tone"."sort_code") ELSE null END`
          ),
          "product_band_metal_tone",
        ],
        [
          Sequelize.literal(`CASE WHEN "product_type" = ${AllProductTypes.Config_Ring_product
            } THEN 
            (SELECT  CASE WHEN "wishlist_products"."is_band" = '1' THEN with_band_price ELSE without_band_price END FROM ring_three_stone_configurator_price_view WHERE id = "product_id")
              WHEN "product_type" = ${AllProductTypes.Product
            } THEN (SELECT CASE WHEN products.product_type = ${SingleProductType.VariantType
            } THEN PMO.retail_price  ELSE  CASE WHEN PMO.id_karat IS NULL THEN
                (metal_master.metal_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0))) 
                ELSE (metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0))) 
                END END FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product = products.id 
                LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id AND PDO.is_deleted = '0' 
                LEFT OUTER JOIN metal_masters AS metal_master ON metal_master.id = PMO.id_metal 
                LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group 
                LEFT OUTER JOIN gold_kts ON gold_kts.id = PMO.id_karat 
                WHERE CASE WHEN products.product_type != ${SingleProductType.VariantType
            } THEN CASE WHEN PMO.id_karat IS NULL 
                THEN products.id = "product_id" AND PMO.id_metal = "wishlist_products"."id_metal" 
                ELSE products.id = "product_id" AND PMO.id_metal = CAST ("wishlist_products"."id_metal" AS integer) 
                AND PMO.id_karat = CASE WHEN ("wishlist_products"."id_karat") IS NULL THEN null ELSE CAST ("wishlist_products"."id_karat" AS integer) 
                END END ELSE PMO.id = variant_id END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, pmo.metal_weight, products.making_charge, products.finding_charge,
                 products.other_charge,PMO.id_karat, gold_kts.calculate_rate, products.product_type, PMO.retail_price) WHEN "product_type" = ${AllProductTypes.GiftSet_product
            } 
                 THEN (SELECT  price FROM gift_set_products WHERE id = "product_id") 
                 WHEN "product_type" = ${AllProductTypes.Three_stone_config_product
            } THEN 
                        (SELECT  CASE WHEN "wishlist_products"."is_band" = '1' THEN with_band_price ELSE without_band_price END FROM ring_three_stone_configurator_price_view WHERE id = "product_id")
            WHEN "product_type" = ${AllProductTypes.BirthStone_product
            } THEN (SELECT price FROM  
              birthstone_product_metal_options 
              WHERE CASE WHEN "wishlist_products"."id_karat" IS NOT NULL THEN 
              birthstone_product_metal_options.id_product = "product_id"
              AND birthstone_product_metal_options.id_metal = "wishlist_products"."id_metal" AND birthstone_product_metal_options.id_karat = "wishlist_products"."id_karat"  
              AND birthstone_product_metal_options.id_metal_tone = CAST ("wishlist_products"."id_metal_tone" AS text)  ELSE id_product = "product_id" 
              AND birthstone_product_metal_options.id_metal = ("wishlist_products"."id_metal") END) WHEN "product_type" = ${AllProductTypes.Eternity_product
            } THEN (SELECT calculated_value FROM eternity_band_configurator_price_view WHERE id = "product_id") WHEN "product_type" = ${AllProductTypes.LooseDiamond
            } THEN (SELECT total_price FROM loose_diamond_group_masters where id = "product_id") 
    WHEN "product_type" = ${AllProductTypes.SettingProduct}
    THEN (SELECT CASE WHEN products.product_type = ${SingleProductType.VariantType
            } THEN CASE WHEN "wishlist_products"."is_band" = '1' THEN CEIL((COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+PMO.retail_price + COALESCE(PMO.band_metal_price,0)) - COALESCE(PMO.center_diamond_price,0)) ELSE CEIL((COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+PMO.retail_price)- COALESCE(PMO.center_diamond_price,0)) END 
    ELSE  CASE WHEN PMO.id_karat IS NULL
      THEN CASE WHEN "wishlist_products"."is_band" = '1' THEN 
      CEIL(metal_master.metal_rate*(PMO.metal_weight+PMO.band_metal_weight)+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0))) ELSE 
        CEIL(metal_master.metal_rate*(PMO.metal_weight)+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum(CASE WHEN PDO.is_band IS false THEN ((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count) END), 0))) END ELSE

        CASE WHEN "wishlist_products"."is_band" = '1' THEN

        CEIL(metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*(PMO.metal_weight+COALESCE(PMO.band_metal_weight,0))+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count), 0))) 
        
        ELSE 

        CEIL(metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+COALESCE(making_charge, 0)+COALESCE(finding_charge, 0)+COALESCE(other_charge, 0)+
        (COALESCE(sum(CASE WHEN PDO.is_band IS false THEN ((CASE WHEN DGM.rate IS NULL THEN DGM.synthetic_rate ELSE DGM.rate END)*PDO.weight*PDO.count) END), 0))) 

        END

        END END
        FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product =
        products.id LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product =
        products.id AND PDO.is_deleted = '0' AND PDO.id_type = 2 LEFT OUTER JOIN metal_masters
        AS metal_master ON metal_master.id = PMO.id_metal LEFT OUTER JOIN
        diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN
        gold_kts ON gold_kts.id = PMO.id_karat WHERE CASE WHEN products.product_type != ${SingleProductType.VariantType
            } THEN CASE WHEN PMO.id_karat IS NULL 
                THEN products.id = "product_id" AND PMO.id_metal = "wishlist_products"."id_metal" 
                ELSE products.id = "product_id" AND PMO.id_metal = CAST ("wishlist_products"."id_metal" AS integer) 
                AND PMO.id_karat = CASE WHEN ("wishlist_products"."id_karat") IS NULL THEN null ELSE CAST ("wishlist_products"."id_karat" AS integer) 
                END END ELSE PMO.id = variant_id END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, pmo.metal_weight,
        products.making_charge, products.finding_charge, products.other_charge,PMO.id_karat, gold_kts.calculate_rate, products.product_type, PMO.retail_price, PMO.band_metal_price,PMO.band_metal_weight,PMO.center_diamond_price) WHEN "product_type" = ${AllProductTypes.BraceletConfigurator
            } THEN (SELECT product_price FROM bracelet_configurator_price_view WHERE id = "product_id")
    ELSE
    null END`),
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

export const addVariantProductIntoWishList = async (req: Request) => {
  try {
    const {
      user_id,
      product_id,
      product_type,
      id_metal,
      id_karat,
      id_metal_tone,
      variant_id,
      id_image,
      id_size,
      id_length,
      product_details,
      id_head_metal_tone,
      id_shank_metal_tone,
      is_band,
      id_band_metal_tone,
      diamond_stock_number,
      diamond_inventory_type,
      diamond_origin,
      diamond,
    } = req.body;
   
    const userExit = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });

    if (!(userExit && userExit.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }
    const trn = await dbContext.transaction();
    try {
      let ProductWishList: any;
      // get IP
      const IP = req.headers['x-forwarded-for']
      // get location based in IP
      const location = await getLocationBasedOnIPAddress(IP)
      let country = null
      let locationData = null
      if (location && location.code == DEFAULT_STATUS_CODE_SUCCESS) {
        country = location.data.country
        locationData = location.data
      }
      // single product add to wishlist
      if (product_type == AllProductTypes.Product) {
        const product = await Product.findOne({
          where: { id: product_id, is_deleted: DeletedStatus.No },
          transaction: trn,
        });

        if (!(product && product.dataValues)) {
          return resNotFound({ message: PRODUCT_NOT_FOUND });
        }

        const variant = await ProductMetalOption.findOne({
          where: {
            id: variant_id,
            id_product: product_id,
            is_deleted: DeletedStatus.No
          },
          transaction: trn,
        });

        if (!(variant && variant.dataValues)) {
          return resNotFound({ message: PRODUCT_VARIANT_NOT_FOUND });
        }

        const wishListProductCheck = await ProductWish.findOne({
          where: {
            product_type: product_type,
            product_id: product_id,
            user_id: user_id,
            variant_id: variant_id,
            id_metal_tone: id_metal_tone,
          },
          transaction: trn,
        });

        if (wishListProductCheck && wishListProductCheck.dataValues) {
          return resErrorDataExit({
            data: ERROR_PRODUCT_ALREADY_EXIST_IN_WISH_LIST,
          });
        }

        ProductWishList = await ProductWish.create(
          {
            user_id: userExit.dataValues.id,
            product_id: product.dataValues.id,
            variant_id: variant_id,
            created_date: getLocalDate(),
            product_type: AllProductTypes.Product,
            id_size:
              id_size &&
                id_size != "null" &&
                id_size != undefined &&
                id_size != "undefined" &&
                id_size != "" &&
                id_size != null
                ? id_size
                : null,
            id_metal: id_metal,
            id_karat:
              id_karat &&
                id_karat != "null" &&
                id_karat != undefined &&
                id_karat != "undefined" &&
                id_karat != "" &&
                id_karat != null
                ? id_karat
                : null,
            id_length:
              id_length &&
                id_length != "null" &&
                id_length != undefined &&
                id_length != "undefined" &&
                id_length != "" &&
                id_length != null
                ? id_length
                : null,
            id_metal_tone:
              id_metal_tone &&
                id_metal_tone != "null" &&
                id_metal_tone != undefined &&
                id_metal_tone != "undefined" &&
                id_metal_tone != "" &&
                id_metal_tone != null
                ? id_metal_tone
                : null,
            product_details: {
              id_image: id_image,
              id_size:
                id_size &&
                  id_size != "null" &&
                  id_size != undefined &&
                  id_size != "undefined" &&
                  id_size != "" &&
                  id_size != null
                  ? id_size
                  : null,
              id_length:
                id_length &&
                  id_length != "null" &&
                  id_length != undefined &&
                  id_length != "undefined" &&
                  id_length != "" &&
                  id_length != null
                  ? id_length
                  : null,
              id_karat:
                id_karat &&
                  id_karat != "null" &&
                  id_karat != undefined &&
                  id_karat != "undefined" &&
                  id_karat != "" &&
                  id_karat != null
                  ? id_karat
                  : null,
              id_metal,
              id_metal_tone:
                id_metal_tone &&
                  id_metal_tone != "null" &&
                  id_metal_tone != undefined &&
                  id_metal_tone != "undefined" &&
                  id_metal_tone != "" &&
                  id_metal_tone != null
                  ? id_metal_tone
                  : null,
            },
            user_ip: IP,
            user_country: country,
            user_location: locationData
          },
          { transaction: trn }
        );

        // gift set  product add to cart
      } else if (product_type == AllProductTypes.LooseDiamond) {
        const product = await LooseDiamondGroupMasters.findOne({
          where: {
            id: product_id,
            is_deleted: DeletedStatus.No,
            is_active: ActiveStatus.Active,
          },
        });

        if (!(product && product.dataValues)) {
          return resNotFound({
            message: prepareMessageFromParams(ERROR_NOT_FOUND, [
              ["field_name", "Product"],
            ]),
          });
        }

        const wishListProductCheck = await ProductWish.findOne({
          where: {
            user_id: userExit.dataValues.id,
            product_id: product.dataValues.id,
            product_type: AllProductTypes.LooseDiamond,
          },
          transaction: trn,
        });

        if (wishListProductCheck && wishListProductCheck.dataValues) {
          return resErrorDataExit({
            data: ERROR_PRODUCT_ALREADY_EXIST_IN_WISH_LIST,
          });
        }

        ProductWishList = await ProductWish.create(
          {
            user_id: userExit.dataValues.id,
            product_id: product.dataValues.id,
            created_date: getLocalDate(),
            product_type: AllProductTypes.LooseDiamond,
            product_details: { ...product_details },
            user_ip: IP,
            user_country: country,
            user_location: locationData
          },
          { transaction: trn }
        );
      } else if (product_type == AllProductTypes.SettingProduct) {
        const product = await Product.findOne({
          where: {
            id: product_id,
            is_deleted: DeletedStatus.No,
            [Op.or]: {
              is_choose_setting: "1",

            },
          },
          transaction: trn,
        });

        if (!(product && product.dataValues)) {
          return resNotFound({ message: PRODUCT_NOT_FOUND });
        }

        const variant = await ProductMetalOption.findOne({
          where: {
            id: variant_id,
            id_product: product_id,
            is_deleted: DeletedStatus.No,
          },
          transaction: trn,
        });

        if (!(variant && variant.dataValues)) {
          return resNotFound({ message: PRODUCT_VARIANT_NOT_FOUND });
        }

        if (!diamond) {
          return resBadRequest({
            message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [
              ["field_name", "Diamond details"],
            ]),
          });
        }

        if (
          ![
            DIAMOND_INVENTROY_TYPE.Local,
            DIAMOND_INVENTROY_TYPE.VDB,
            DIAMOND_INVENTROY_TYPE.Rapnet,
          ].includes(diamond_inventory_type)
        ) {
          return resNotFound({
            message: prepareMessageFromParams(DATA_NOT_FOUND, [
              ["field_name", "Diamond inventory"],
            ]),
          });
        }

        if (
          ![DIAMOND_ORIGIN.Natural, DIAMOND_ORIGIN.LabGrown].includes(
            diamond_origin
          )
        ) {
          return resNotFound({
            message: prepareMessageFromParams(DATA_NOT_FOUND, [
              ["field_name", "Diamond origin"],
            ]),
          });
        }

        const wishListProductCheck = await ProductWish.findOne({
          where: {
            product_type: product_type,
            product_id: product_id,
            user_id: user_id,
            variant_id: variant_id,
            id_metal_tone: id_metal_tone,
            "product_details.diamond.stock_number": diamond_stock_number,
            "product_details.diamond.inventory_type": diamond_inventory_type,
          },
          transaction: trn,
        });

        if (wishListProductCheck && wishListProductCheck.dataValues) {
          return resErrorDataExit({
            data: ERROR_PRODUCT_ALREADY_EXIST_IN_WISH_LIST,
          });
        }

        ProductWishList = await ProductWish.create(
          {
            user_id: userExit.dataValues.id,
            product_id: product.dataValues.id,
            variant_id: variant_id,
            created_date: getLocalDate(),
            product_type: AllProductTypes.SettingProduct,
            id_size:
              id_size &&
                id_size != null &&
                id_size != undefined &&
                id_size != "undefined" &&
                id_size != "null"
                ? id_size
                : null,
            id_metal: id_metal,
            id_karat:
              id_karat &&
                id_karat != null &&
                id_karat != undefined &&
                id_karat != "undefined" &&
                id_karat != "null"
                ? id_karat
                : null,
            id_length:
              id_length &&
                id_length != null &&
                id_length != undefined &&
                id_length != "undefined" &&
                id_length != "null"
                ? id_length
                : null,
            id_metal_tone:
              id_metal_tone &&
                id_metal_tone != null &&
                id_metal_tone != undefined &&
                id_metal_tone != "undefined" &&
                id_metal_tone != "null"
                ? id_metal_tone
                : null,
            product_details: {
              id_image: id_image,
              id_size:
                id_size &&
                  id_size != null &&
                  id_size != undefined &&
                  id_size != "undefined" &&
                  id_size != "null"
                  ? id_size
                  : null,
              id_length:
                id_length &&
                  id_length != null &&
                  id_length != undefined &&
                  id_length != "undefined" &&
                  id_length != "null"
                  ? id_length
                  : null,
              id_karat:
                id_karat &&
                  id_karat != null &&
                  id_karat != undefined &&
                  id_karat != "undefined" &&
                  id_karat != "null"
                  ? id_karat
                  : null,
              id_metal,
              id_metal_tone:
                id_metal_tone &&
                  id_metal_tone != null &&
                  id_metal_tone != undefined &&
                  id_metal_tone != "undefined" &&
                  id_metal_tone != "null"
                  ? id_metal_tone
                  : null,
              diamond: {
                ...diamond,
                inventory_type: diamond_inventory_type,
              },
            },
            user_ip: IP,
            user_country: country,
            user_location: locationData
          },
          { transaction: trn }
        );
      } else if (product_type == AllProductTypes.SingleTreasure) {
        const product = await Product.findOne({
          where: {
            id: product_id,
            is_deleted: DeletedStatus.No,
            [Op.or]: {
              is_choose_setting: "1",

            },
          },
          transaction: trn,
        });

        if (!(product && product.dataValues)) {
          return resNotFound({ message: PRODUCT_NOT_FOUND });
        }

        const variant = await ProductMetalOption.findOne({
          where: {
            id: variant_id,
            id_product: product_id,
            is_deleted: DeletedStatus.No,
          },
          transaction: trn,
        });

        if (!(variant && variant.dataValues)) {
          return resNotFound({ message: PRODUCT_VARIANT_NOT_FOUND });
        }

        if (!diamond) {
          return resBadRequest({
            message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [
              ["field_name", "Diamond details"],
            ]),
          });
        }

        if (
          ![
            DIAMOND_INVENTROY_TYPE.Local,
            DIAMOND_INVENTROY_TYPE.VDB,
            DIAMOND_INVENTROY_TYPE.Rapnet,
          ].includes(diamond_inventory_type)
        ) {
          return resNotFound({
            message: prepareMessageFromParams(DATA_NOT_FOUND, [
              ["field_name", "Diamond inventory"],
            ]),
          });
        }

        if (
          ![DIAMOND_ORIGIN.Natural, DIAMOND_ORIGIN.LabGrown].includes(
            diamond_origin
          )
        ) {
          return resNotFound({
            message: prepareMessageFromParams(DATA_NOT_FOUND, [
              ["field_name", "Diamond origin"],
            ]),
          });
        }

        const wishListProductCheck = await ProductWish.findOne({
          where: {
            product_type: product_type,
            product_id: product_id,
            user_id: user_id,
            variant_id: variant_id,
            id_metal_tone: id_metal_tone,
            "product_details.diamond.stock_number": diamond_stock_number,
            "product_details.diamond.inventory_type": diamond_inventory_type,
          },
          transaction: trn,
        });

        if (wishListProductCheck && wishListProductCheck.dataValues) {
          return resErrorDataExit({
            data: ERROR_PRODUCT_ALREADY_EXIST_IN_WISH_LIST,
          });
        }
        let imagePath = null;
        if (req.file) {
          const moveFileResult = await moveFileToS3ByType(
            req.file,
            IMAGE_TYPE.ConfigProduct,
          );

          if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
            return moveFileResult;
          }

          imagePath = moveFileResult.data;
        }

        let idImage = null;
        if (imagePath) {
          const imageResult = await Image.create(
            {
              image_path: imagePath,
              image_type: IMAGE_TYPE.ConfigProduct,
              created_by: req.body.session_res.id_app_user,
              created_date: getLocalDate(),
            },
            { transaction: trn }
          );
          idImage = imageResult.dataValues.id;
        }
        ProductWishList = await ProductWish.create(
          {
            user_id: userExit.dataValues.id,
            product_id: product.dataValues.id,
            variant_id: variant_id, 
            created_date: getLocalDate(),
            product_type: AllProductTypes.SingleTreasure,
            is_band: is_band,
            id_size:
              id_size &&
                id_size != null &&
                id_size != undefined &&
                id_size != "undefined" &&
                id_size != "null"
                ? id_size
                : null,
            id_metal: id_metal,
            id_karat:
              id_karat &&
                id_karat != null &&
                id_karat != undefined &&
                id_karat != "undefined" &&
                id_karat != "null"
                ? id_karat
                : null,
            id_length:
              id_length &&
                id_length != null &&
                id_length != undefined &&
                id_length != "undefined" &&
                id_length != "null"
                ? id_length
                : null,
            id_metal_tone:
              id_metal_tone &&
                id_metal_tone != null &&
                id_metal_tone != undefined &&
                id_metal_tone != "undefined" &&
                id_metal_tone != "null"
                ? id_metal_tone
                : null,
            product_details: {
              id_image: idImage,
              id_size:
                id_size &&
                  id_size != null &&
                  id_size != undefined &&
                  id_size != "undefined" &&
                  id_size != "null"
                  ? id_size
                  : null,
              id_length:
                id_length &&
                  id_length != null &&
                  id_length != undefined &&
                  id_length != "undefined" &&
                  id_length != "null"
                  ? id_length
                  : null,
              id_karat:
                id_karat &&
                  id_karat != null &&
                  id_karat != undefined &&
                  id_karat != "undefined" &&
                  id_karat != "null"
                  ? id_karat
                  : null,
              id_metal,
              id_metal_tone:
                id_metal_tone &&
                  id_metal_tone != null &&
                  id_metal_tone != undefined &&
                  id_metal_tone != "undefined" &&
                  id_metal_tone != "null"
                  ? id_metal_tone
                  : null,
              diamond: {
                ...diamond,
                inventory_type: diamond_inventory_type,
              },
            },
            user_ip: IP,
            user_country: country,
            user_location: locationData
          },
          { transaction: trn }
        );
      }

      const wish_list_count = await ProductWish.count({
        where: { user_id: user_id },
        transaction: trn,
      });
      await addActivityLogs( [{
        old_data: null,
        new_data: {
          product_wish_list_id: ProductWishList?.dataValues?.id, data: {
            ...ProductWishList?.dataValues
          }
        }
      }], ProductWishList?.dataValues?.id, LogsActivityType.Add, LogsType.VariantProductWishList, req?.body?.session_res?.id_app_user, trn)

      await trn.commit();

      return resSuccess({ data: { wish_list_count } });
    } catch (error) {
      console.log("company_key=2dbda1627ff338a749b211f249ffe154", error);
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } catch (error) {
    throw error;
  }
};

export const getVariantProductWishlistByUserId = async (req: any) => {
  try {

    const { user_id } = req.params;
    const userData = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });
    if (!(userData && userData.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    const products = await dbContext.query(
      `( SELECT
          wishlist.id,
          wishlist.user_id,
          wishlist.product_type,
          wishlist.product_id,
          wishlist.variant_id,
          wishlist.is_band,
          wishlist. product_details,
          wishlist.created_date,

          -- Product info
          pd.name AS product_title,
          pd.sku AS product_sku,
          pd.slug AS product_slug,
          pd.diamond_shape,
          pd.single_product_type as single_product_type,
          pd.product_price::text,
          pd.compare_price::text,
          -- Category mapping
          CASE
            WHEN wishlist.product_type = ANY(ARRAY[${AllProductTypes.Product}, ${AllProductTypes.SettingProduct}, ${AllProductTypes.SingleTreasure}]) THEN categories.category_name
            WHEN wishlist.product_type = ANY(ARRAY[${AllProductTypes.Config_Ring_product}, ${AllProductTypes.Three_stone_config_product}]) THEN 'ring'
            WHEN wishlist.product_type = ${AllProductTypes.StudConfigurator} THEN 'Earring'
            WHEN wishlist.product_type = ${AllProductTypes.PendantConfigurator} THEN 'Stud'
            WHEN wishlist.product_type = ${AllProductTypes.BirthStone_product} THEN b_category.category_name
            WHEN wishlist.product_type = ${AllProductTypes.Eternity_product} THEN 'eternity band'
            WHEN wishlist.product_type = ${AllProductTypes.BraceletConfigurator} THEN 'Bracelet'
            ELSE NULL
          END AS category,

          -- Image
          image_selection.image_path AS product_image,

          -- Sizes and attributes
          CASE WHEN wishlist.id_size IS NOT NULL THEN json_build_object('id', size.id, 'size', size.size) ELSE NULL END AS product_size,
          CASE WHEN wishlist.id_length IS NOT NULL THEN json_build_object('id', length.id, 'length', length.length) ELSE NULL END AS product_length,
          CASE WHEN wishlist.id_metal IS NOT NULL THEN json_build_object('id', metal_masters.id, 'name', metal_masters.name) ELSE NULL END AS product_metal,
          CASE WHEN wishlist.id_karat IS NOT NULL THEN json_build_object('id', gold_kts.id, 'name', gold_kts.name, 'slug', gold_kts.slug) ELSE NULL END AS product_karat,
          CASE WHEN wishlist.id_metal_tone IS NOT NULL THEN json_build_object('id', metal_tones.id, 'name', metal_tones.name, 'slug', metal_tones.slug, 'sort_code', metal_tones.sort_code) ELSE NULL END AS product_metal_tone,
          CASE WHEN wishlist.id_head_metal_tone IS NOT NULL THEN json_build_object('id', head_tone.id, 'name', head_tone.name, 'slug', head_tone.slug, 'sort_code', head_tone.sort_code) ELSE NULL END AS product_head_metal_tone,
          CASE WHEN wishlist.id_shank_metal_tone IS NOT NULL THEN json_build_object('id', shank_tone.id, 'name', shank_tone.name, 'slug', shank_tone.slug, 'sort_code', shank_tone.sort_code) ELSE NULL END AS product_shank_metal_tone,
          CASE WHEN wishlist.id_band_metal_tone IS NOT NULL THEN json_build_object('id', band_tone.id, 'name', band_tone.name, 'slug', band_tone.slug, 'sort_code', band_tone.sort_code) ELSE NULL END AS product_band_metal_tone,

          -- Ratings
          AVG(product_reviews.rating) FILTER (
            WHERE wishlist.product_type = ANY(ARRAY[${AllProductTypes.Product}, ${AllProductTypes.SettingProduct}, ${AllProductTypes.SingleTreasure}])
          ) AS rating,

          COUNT(DISTINCT product_reviews.reviewer_id) FILTER (
            WHERE wishlist.product_type = ANY(ARRAY[${AllProductTypes.Product}, ${AllProductTypes.SettingProduct}, ${AllProductTypes.SingleTreasure}])
          ) AS review_user_count

        FROM wishlist_products wishlist

        -- Categories joins
        LEFT JOIN product_categories 
          ON product_categories.id_product = wishlist.product_id 
          AND product_categories.is_deleted = '0'::bit
        LEFT JOIN categories 
          ON categories.id = product_categories.id_category
        LEFT JOIN birthstone_product_categories 
          ON birthstone_product_categories.id_product = wishlist.product_id
        LEFT JOIN categories b_category 
          ON b_category.id = birthstone_product_categories.id_category

        -- Reviews
        LEFT JOIN product_reviews 
          ON product_reviews.product_id = wishlist.product_id
          AND wishlist.product_type = ANY(ARRAY[${AllProductTypes.Product}, ${AllProductTypes.SettingProduct}, ${AllProductTypes.SingleTreasure}])
          AND product_reviews.is_approved = '1'::bit

        -- Product data selection via LATERAL
        LEFT JOIN LATERAL (
          (
            SELECT 
              p.name,
              p.sku,
              CASE WHEN wishlist.product_type = ${AllProductTypes.SingleTreasure} THEN ss.name ELSE p.slug END as slug,
              pd.name AS diamond_shape,
              p.product_type as single_product_type,
              (CASE WHEN p.product_type = ${SingleProductType.VariantType} THEN (pmo.retail_price - COALESCE(pmo.center_diamond_price,0))ELSE CASE WHEN pmo.id_karat IS NOT NULL THEN 
                  metal.metal_rate / metal.calculate_rate * kt.calculate_rate * 
                  pmo.metal_weight::double precision
                  ELSE 
                  metal.metal_rate * pmo.metal_weight::double precision
                  END + CASE WHEN wishlist.is_band = '${ActiveStatus.Active}' THEN  pd.with_diamond_price ELSE pd.with_out_diamond_price END + p.making_charge::double precision
                  + p.finding_charge::double precision + p.other_charge::double precision END) as
              product_price,
              (CASE WHEN p.product_type = ${SingleProductType.VariantType} THEN (pmo.compare_price - COALESCE(pmo.center_diamond_price,0)) ELSE CASE WHEN pmo.id_karat IS NOT NULL THEN 
                  metal.metal_rate / metal.calculate_rate * kt.calculate_rate * 
                  pmo.metal_weight::double precision
                  ELSE 
                  metal.metal_rate * pmo.metal_weight::double precision
                  END + CASE WHEN wishlist.is_band = '${ActiveStatus.Active}' THEN  pd.with_diamond_price ELSE pd.with_out_diamond_price END + p.making_charge::double precision
                  + p.finding_charge::double precision + p.other_charge::double precision END) as
              compare_price
              FROM products p
               LEFT JOIN setting_styles ss on ss.id::text =  setting_style_type
              LEFT JOIN product_metal_options pmo on pmo.id_product =  p.id AND pmo.id = wishlist.variant_id
              LEFT JOIN metal_masters metal ON metal.id = pmo.id_metal
              LEFT JOIN gold_kts kt ON kt.id = pmo.id_karat
              LEFT JOIN (
                        SELECT DISTINCT ON (pdo.id_product)
                          pdo.id_product,
                          ds.name,
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
                        JOIN diamond_shapes ds ON ds.id = dgm.id_shape
                        WHERE pdo.id_product = wishlist.product_id AND pdo.id_type = 2
                  GROUP BY pdo.id_product,ds.name
                      ) pd ON pd.id_product = p.id

            WHERE 
               p.id = wishlist.product_id
              AND wishlist.product_type = ANY(ARRAY[${AllProductTypes.SettingProduct}, ${AllProductTypes.SingleTreasure}])

            UNION ALL

            SELECT 
              p.name,
              p.sku,
              p.slug,
              pd.name AS diamond_shape,
              p.product_type as single_product_type,
              (CASE WHEN p.product_type = ${SingleProductType.VariantType} THEN pmo.retail_price ELSE CASE WHEN pmo.id_karat IS NOT NULL THEN 
                  metal.metal_rate / metal.calculate_rate * kt.calculate_rate * 
                  pmo.metal_weight::double precision
                  ELSE 
                  metal.metal_rate * pmo.metal_weight::double precision
                  END + pd.diamond_price + p.making_charge::double precision
                  + p.finding_charge::double precision + p.other_charge::double precision END) as
              product_price,
              (CASE WHEN p.product_type = ${SingleProductType.VariantType} THEN pmo.compare_price ELSE CASE WHEN pmo.id_karat IS NOT NULL THEN 
                  metal.metal_rate / metal.calculate_rate * kt.calculate_rate * 
                  pmo.metal_weight::double precision
                  ELSE 
                  metal.metal_rate * pmo.metal_weight::double precision
                  END + pd.diamond_price + p.making_charge::double precision
                  + p.finding_charge::double precision + p.other_charge::double precision END) as
              compare_price
              FROM products p
              LEFT JOIN product_metal_options pmo on pmo.id_product =  p.id AND pmo.id = wishlist.variant_id
              LEFT JOIN metal_masters metal ON metal.id = pmo.id_metal
              LEFT JOIN gold_kts kt ON kt.id = pmo.id_karat
              LEFT JOIN (
                        SELECT DISTINCT ON (pdo.id_product)
                          pdo.id_product,
                          ds.name,
                  sum(
                           CASE
                              WHEN dgm.rate IS NOT NULL AND dgm.rate <> 0::double precision THEN dgm.rate
                              ELSE dgm.synthetic_rate
                          END  * pdo.weight::double precision * pdo.count::double precision) as diamond_price
                        FROM product_diamond_options pdo
                        LEFT JOIN diamond_group_masters dgm ON dgm.id = pdo.id_diamond_group
                        JOIN diamond_shapes ds ON ds.id = dgm.id_shape
                        WHERE pdo.id_product = wishlist.product_id
                  GROUP BY pdo.id_product,ds.name
                      ) pd ON pd.id_product = p.id

            WHERE p.id = wishlist.product_id
              AND wishlist.product_type = ANY(ARRAY[${AllProductTypes.Product}])

            UNION ALL

            SELECT gsp.product_title, gsp.sku, gsp.slug, NULL,NULL as single_product_type,  NULL::numeric,gsp.price::numeric
            FROM gift_set_products gsp
            WHERE gsp.id = wishlist.product_id
              AND wishlist.product_type = ${AllProductTypes.GiftSet_product}

            UNION ALL

            SELECT bp.name, bp.sku, bp.slug, NULL,NULL as single_product_type,bpmo.price::numeric AS compare_price,bpmo.price::numeric as product_price
            FROM birthstone_products bp
            JOIN birthstone_product_metal_options bpmo on bpmo.id_product = bp.id 
            WHERE bp.id = wishlist.product_id
              AND wishlist.product_type = ${AllProductTypes.BirthStone_product}
              AND CASE
                WHEN wishlist.id_karat IS NOT NULL THEN bpmo.id_product = wishlist.product_id AND bpmo.id_metal = wishlist.id_metal AND bpmo.id_karat = wishlist.id_karat AND bpmo.id_metal_tone::text = wishlist.id_metal_tone::text
                ELSE bpmo.id_product = wishlist.product_id AND bpmo.id_metal = wishlist.id_metal
              END

            UNION ALL

            SELECT cp.product_title, cp.sku, cp.slug, ds.name,NULL as single_product_type,
            CASE
              WHEN wishlist.is_band = '1'::"bit" THEN 0::numeric
              ELSE 0::numeric
            END AS compare_price,
            CASE
              WHEN wishlist.is_band = '1'::"bit" THEN 0::numeric
              ELSE 0::numeric
            END AS product_price
            FROM config_products cp
            LEFT JOIN diamond_shapes ds ON ds.id = cp.center_dia_shape_id
            WHERE  cp.id = wishlist.product_id
              AND LOWER(cp.product_type) = 'ring'
              AND wishlist.product_type = ${AllProductTypes.Config_Ring_product}

            UNION ALL

            SELECT cp.product_title, cp.sku, cp.slug, ds.name,NULL as single_product_type,
            0::numeric AS compare_price, 
            0::numeric AS product_price
            FROM config_products cp
            LEFT JOIN diamond_shapes ds ON ds.id = cp.center_dia_shape_id
            WHERE  cp.id = wishlist.product_id
              AND LOWER(cp.product_type) = 'three stone'
              AND wishlist.product_type = ${AllProductTypes.Three_stone_config_product}

            UNION ALL

            SELECT cep.product_title, cep.sku, cep.slug, ds.name,NULL as single_product_type,0::numeric AS compare_price, 0::numeric as product_price
            FROM config_eternity_products cep
            LEFT JOIN diamond_shapes ds ON ds.id = cep.dia_shape_id
            WHERE cep.id = wishlist.product_id
              AND wishlist.product_type = ${AllProductTypes.Eternity_product}

            UNION ALL

            SELECT cbp.product_title, cbp.sku, cbp.slug,
              (
                SELECT ds.name
                FROM config_bracelet_product_diamonds cbd
                JOIN diamond_shapes ds ON ds.id = cbd.id_shape
                WHERE cbd.config_product_id = cbp.id
                LIMIT 1
              ),NULL as single_product_type,0::numeric AS compare_price,0::numeric AS product_price
            FROM config_bracelet_products cbp
            WHERE cbp.id = wishlist.product_id
              AND wishlist.product_type = ${AllProductTypes.BraceletConfigurator}

            UNION ALL

              SELECT 
                SCP.name, SCP.sku, scp.slug, ds.name AS diamond_shape,NULL as single_product_type,
                ceil(COALESCE(SUM(U.RATE * COALESCE(U.average_carat, U.DIA_WEIGHT) * U.DIA_COUNT), 0) +
                COALESCE(
                  (
                    CASE 
                      WHEN pdo.diamond_type = '1' THEN CDGM.RATE
                      ELSE CDGM.SYNTHETIC_RATE
                    END
                    * cs.value::double precision
                    * SCP.CENTER_DIA_COUNT
                  ),
                  0
                ) +
                COALESCE(CASE
                    WHEN SM.KARAT_ID IS NULL THEN
                        MM.METAL_RATE * SM.METAL_WT + COALESCE(SCP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(SCP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                    ELSE
                        MM.METAL_RATE / MM.CALCULATE_RATE * GK.CALCULATE_RATE::DOUBLE PRECISION * SM.METAL_WT +
                        COALESCE(SCP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(SCP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                  END, 0)) AS compare_price,
                ceil(COALESCE(SUM(U.RATE * COALESCE(U.average_carat, U.DIA_WEIGHT) * U.DIA_COUNT), 0) +
                COALESCE(
                  (
                    CASE 
                      WHEN pdo.diamond_type = '1' THEN CDGM.RATE
                      ELSE CDGM.SYNTHETIC_RATE
                    END
                    * cs.value::double precision
                    * SCP.CENTER_DIA_COUNT
                  ),
                  0
                ) +
               COALESCE(CASE
                  WHEN SM.KARAT_ID IS NULL THEN
                      MM.METAL_RATE * SM.METAL_WT + COALESCE(SCP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(SCP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                  ELSE
                      MM.METAL_RATE / MM.CALCULATE_RATE * GK.CALCULATE_RATE::DOUBLE PRECISION * SM.METAL_WT +
                      COALESCE(SCP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(SCP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                END, 0)) AS product_price

              FROM STUD_CONFIG_PRODUCTS SCP
              LEFT JOIN diamond_shapes ds ON ds.id = SCP.CENTER_DIA_SHAPE
              LEFT JOIN carat_sizes CS ON CS.id = SCP.center_dia_wt
              LEFT JOIN stud_metals SM ON SM.stud_id = SCP.ID
              LEFT JOIN metal_masters MM ON MM.ID = SM.metal_id
              LEFT JOIN gold_kts GK ON GK.ID = SM.karat_id

              -- Parse JSON fields first
              CROSS JOIN LATERAL (
                SELECT
                  wishlist.PRODUCT_DETAILS->>'stone' AS stone,
                  wishlist.PRODUCT_DETAILS->>'color' AS color,
                  wishlist.PRODUCT_DETAILS->>'clarity' AS clarity,
                  wishlist.PRODUCT_DETAILS->>'cut' AS cut,
                  wishlist.PRODUCT_DETAILS->>'diamond_type' AS diamond_type,
                  wishlist.PRODUCT_DETAILS->>'group_id' AS group_id
              ) pdo

              -- Now LEFT JOIN LATERAL so the subquery can see pdo
              LEFT JOIN LATERAL (
                SELECT DISTINCT ON (SD.ID) 
                  SD.ID AS stud_dia_id,
                  DGM.RATE,
                  SD.DIA_WEIGHT,
                  DGM.average_carat,
                  SD.DIA_COUNT
                FROM STUD_DIAMONDS SD
                LEFT JOIN DIAMOND_GROUP_MASTERS DGM 
                  ON 
                    DGM.ID_SHAPE = SD.DIA_SHAPE::integer
                    AND DGM.MIN_CARAT_RANGE <= SD.DIA_WEIGHT
                    AND DGM.MAX_CARAT_RANGE >= SD.DIA_WEIGHT
                    AND DGM.ID_STONE = CAST(pdo.stone AS integer)
                    AND COALESCE(DGM.ID_COLOR, -1) = COALESCE(NULLIF(CAST(pdo.color AS integer), 0), -1)
                    AND COALESCE(DGM.ID_CLARITY, -1) = COALESCE(NULLIF(CAST(pdo.clarity AS integer), 0), -1)
                    AND COALESCE(DGM.ID_CUTS, -1) = COALESCE(NULLIF(CAST(pdo.cut AS integer), 0), -1)
                WHERE SD.STUD_ID = wishlist.product_id
              ) AS U ON TRUE

              LEFT JOIN DIAMOND_GROUP_MASTERS CDGM 
                ON CDGM.ID = CAST(pdo.group_id AS integer)

              WHERE SCP.ID = wishlist.product_id
                AND wishlist.product_type = ${AllProductTypes.StudConfigurator}

              GROUP BY 
                SCP.ID,
                CDGM.RATE,
                CDGM.SYNTHETIC_RATE,
                CS.VALUE,
                SCP.CENTER_DIA_COUNT,
                ds.name,
                sm.karat_id,
                SM.METAL_WT,
                MM.METAL_RATE,
                MM.CALCULATE_RATE,
                GK.NAME,
                SM.METAL_ID,
                SM.ID,
                SCP.LABOUR_CHARGE,
                SCP.OTHER_CHARGE,
                gk.calculate_rate,
                pdo.diamond_type
                  
            UNION ALL

              SELECT 
                CPP.name, CPP.sku, CPP.slug, ds.name AS diamond_shape,NULL as single_product_type,
                ceil(COALESCE(SUM(U.RATE * COALESCE(U.average_carat, U.DIA_WEIGHT) * U.DIA_COUNT), 0) +
                COALESCE(
                  (
                    CASE 
                      WHEN pdo.diamond_type = '1' THEN CDGM.RATE
                      ELSE CDGM.SYNTHETIC_RATE
                    END
                    * cs.value::double precision
                    * CPP.CENTER_DIA_COUNT
                  ),
                  0
                ) +
                COALESCE(CASE
                    WHEN CPM.KARAT_ID IS NULL THEN
                        MM.METAL_RATE * CPM.METAL_WT + COALESCE(CPP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(CPP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                    ELSE
                        MM.METAL_RATE / MM.CALCULATE_RATE * GK.CALCULATE_RATE::DOUBLE PRECISION * CPM.METAL_WT +
                        COALESCE(CPP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(CPP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                  END, 0)) AS compare_price,
                ceil(COALESCE(SUM(U.RATE * COALESCE(U.average_carat, U.DIA_WEIGHT) * U.DIA_COUNT), 0) +
                COALESCE(
                  (
                    CASE 
                      WHEN pdo.diamond_type = '1' THEN CDGM.RATE
                      ELSE CDGM.SYNTHETIC_RATE
                    END
                    * cs.value::double precision
                    * CPP.CENTER_DIA_COUNT
                  ),
                  0
                ) +
               COALESCE(CASE
                  WHEN CPM.KARAT_ID IS NULL THEN
                      MM.METAL_RATE * CPM.METAL_WT + COALESCE(CPP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(CPP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                  ELSE
                      MM.METAL_RATE / MM.CALCULATE_RATE * GK.CALCULATE_RATE::DOUBLE PRECISION * CPM.METAL_WT +
                      COALESCE(CPP.LABOUR_CHARGE, 0::DOUBLE PRECISION) + COALESCE(CPP.OTHER_CHARGE, 0::DOUBLE PRECISION)
                END, 0)) AS product_price

              FROM CONFIG_PENDANT_PRODUCTS CPP
              LEFT JOIN diamond_shapes ds ON ds.id = CPP.CENTER_DIA_SHAPE
              LEFT JOIN carat_sizes CS ON CS.id = CPP.center_dia_wt
              LEFT JOIN CONFIG_PENDANT_METALS CPM ON CPM.PENDANT_ID = CPP.ID
              LEFT JOIN metal_masters MM ON MM.ID = CPM.metal_id
              LEFT JOIN gold_kts GK ON GK.ID = CPM.karat_id

              -- Parse JSON fields first
              CROSS JOIN LATERAL (
                SELECT
                  wishlist.PRODUCT_DETAILS->>'stone' AS stone,
                  wishlist.PRODUCT_DETAILS->>'color' AS color,
                  wishlist.PRODUCT_DETAILS->>'clarity' AS clarity,
                  wishlist.PRODUCT_DETAILS->>'cut' AS cut,
                  wishlist.PRODUCT_DETAILS->>'diamond_type' AS diamond_type,
                  wishlist.PRODUCT_DETAILS->>'group_id' AS group_id
              ) pdo

              -- Now LEFT JOIN LATERAL so the subquery can see pdo
              LEFT JOIN LATERAL (
                SELECT DISTINCT ON (CPD.ID) 
                  CPD.ID AS pendant_dia_id,
                  DGM.RATE,
                  CPD.DIA_WEIGHT,
                  DGM.average_carat,
                  CPD.DIA_COUNT
                FROM CONFIG_PENDANT_DIAMONDS CPD
                LEFT JOIN DIAMOND_GROUP_MASTERS DGM 
                  ON 
                    DGM.ID_SHAPE = CPD.DIA_SHAPE::integer
                    AND DGM.MIN_CARAT_RANGE <= CPD.DIA_WEIGHT
                    AND DGM.MAX_CARAT_RANGE >= CPD.DIA_WEIGHT
                    AND DGM.ID_STONE = CAST(pdo.stone AS integer)
                    AND COALESCE(DGM.ID_COLOR, -1) = COALESCE(NULLIF(CAST(pdo.color AS integer), 0), -1)
                    AND COALESCE(DGM.ID_CLARITY, -1) = COALESCE(NULLIF(CAST(pdo.clarity AS integer), 0), -1)
                    AND COALESCE(DGM.ID_CUTS, -1) = COALESCE(NULLIF(CAST(pdo.cut AS integer), 0), -1)
                WHERE CPD.PENDANT_ID = wishlist.product_id
              ) AS U ON TRUE

              LEFT JOIN DIAMOND_GROUP_MASTERS CDGM 
                ON CDGM.ID = CAST(pdo.group_id AS integer)

              WHERE CPP.ID = wishlist.product_id
                AND wishlist.product_type = ${AllProductTypes.PendantConfigurator}

              GROUP BY 
                CPP.ID,
                CDGM.RATE,
                CDGM.SYNTHETIC_RATE,
                CS.VALUE,
                CPP.CENTER_DIA_COUNT,
                ds.name,
                CPM.karat_id,
                CPM.METAL_WT,
                MM.METAL_RATE,
                MM.CALCULATE_RATE,
                GK.NAME,
                gk.calculate_rate,
                CPM.METAL_ID,
                CPM.ID,
                CPP.LABOUR_CHARGE,
                CPP.OTHER_CHARGE,
                pdo.diamond_type

                UNION ALL
            SELECT NULL,NULL,NULL,NULL,NULL as single_product_type,loose_diamond_group_masters.total_price AS compare_price,loose_diamond_group_masters.total_price AS product_price
            FROM loose_diamond_group_masters
            WHERE loose_diamond_group_masters.id = wishlist.product_id
            AND wishlist.product_type = ${AllProductTypes.LooseDiamond}

            LIMIT 1
          )
        ) pd ON true

        -- Other attribute joins
        LEFT JOIN items_sizes size ON size.id = wishlist.id_size
        LEFT JOIN items_lengths length ON length.id = wishlist.id_length
        LEFT JOIN metal_masters ON metal_masters.id = wishlist.id_metal
        LEFT JOIN gold_kts ON gold_kts.id = wishlist.id_karat
        LEFT JOIN metal_tones head_tone ON head_tone.id = wishlist.id_head_metal_tone
        LEFT JOIN metal_tones shank_tone ON shank_tone.id = wishlist.id_shank_metal_tone
        LEFT JOIN metal_tones band_tone ON band_tone.id = wishlist.id_band_metal_tone
        LEFT JOIN metal_tones ON metal_tones.id = wishlist.id_metal_tone

        -- Images
        LEFT JOIN LATERAL (
          SELECT image_path FROM (
            SELECT image_path FROM product_images
            WHERE id = (wishlist.product_details->>'id_image')::integer
              AND wishlist.product_type = ANY(ARRAY[${AllProductTypes.Product}, ${AllProductTypes.SettingProduct} ])
            UNION ALL
            SELECT image_path FROM gift_set_product_images
            WHERE wishlist.product_type = ${AllProductTypes.GiftSet_product}
            UNION ALL
            SELECT image_path FROM images
            WHERE wishlist.product_type = ANY(ARRAY[
              ${AllProductTypes.Config_Ring_product},
              ${AllProductTypes.Three_stone_config_product},
              ${AllProductTypes.BirthStone_product},
              ${AllProductTypes.Eternity_product},
              ${AllProductTypes.BraceletConfigurator},
              ${AllProductTypes.StudConfigurator},
              ${AllProductTypes.PendantConfigurator},
              ${AllProductTypes.SingleTreasure}
            ]) and images.id = (wishlist.product_details->>'id_image')::integer
          ) AS img
          LIMIT 1
        ) image_selection ON true

        WHERE
          wishlist.user_id = ${user_id}

        GROUP BY
          wishlist.id,
          wishlist.user_id,
          wishlist.product_type,
          wishlist.product_id,
          wishlist.is_band,
          wishlist.created_date,
          pd.name,
          pd.sku,
          pd.slug,
          pd.diamond_shape,
          pd.single_product_type,
          pd.product_price,
          image_selection.image_path,
          categories.category_name,
          b_category.category_name,
          size.id, 
          length.id, 
          metal_masters.id, 
          gold_kts.id, 
          metal_tones.id, 
          head_tone.id, 
          shank_tone.id, 
          band_tone.id,
          pd.compare_price
        ORDER BY
          wishlist.created_date DESC)`,
      { type: QueryTypes.SELECT }
    );

    const productList = []
        for (let index = 0; index < products.length; index++) {
          const element: any = products[index];
          const productType = await getProductTypeForPriceCorrection(element.product_type, element.single_product_type)
          let data: any = element
          let price = 0
          let compare_price = 0
          if (data.product_type === AllProductTypes.Config_Ring_product) {
            price = await getRingConfigProductPriceForCart(data.product_id, data.is_band)
            compare_price = price
          } else if (data.product_type === AllProductTypes.Three_stone_config_product) {
            price = await getThreeStoneConfigProductPriceForCart(data.product_id, data.is_band)
            compare_price = price
          } else if (data.product_type === AllProductTypes.Eternity_product) {
            price = await getEternityConfigProductPrice(data.product_id)
            compare_price = price
          } else if (data.product_type === AllProductTypes.BraceletConfigurator) {
            price = await getBraceletConfigProductPrice(data.product_id)
            compare_price = price
          } else {
            price = data.product_price
            compare_price = data.compare_price
          } 
          productList.push({...data, product_price: await req.formatPrice(price,productType), compare_price: await req.formatPrice(compare_price,productType)})
        }


    return resSuccess({ data: productList });
  } catch (error) {
    console.log(error, "Error in getVariantProductWishlistByUserId\n\n\n\n\n\n");
    throw error;
  }
};

export const deleteVariantProductWishList = async (req: Request) => {
  try {

    const { whishlist_id, user_id } = req.params;
   
    const userExit = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });

    if (!(userExit && userExit.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    const findProduct = await ProductWish.findOne({
      where: { id: whishlist_id, user_id: user_id },
    });

    if (!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    await ProductWish.destroy({
      where: { id: whishlist_id },
    });

    const wish_list_count = await ProductWish.count({
      where: { user_id: user_id },
    });

    await addActivityLogs( [{
      old_data: { product_wish_list_id: findProduct?.dataValues?.id, data: { ...findProduct?.dataValues }, user_id: userExit?.dataValues?.id, user_data: { ...userExit } },
      new_data: null
    }], findProduct?.dataValues?.id, LogsActivityType.Delete, LogsType.VariantProductWishList, req?.body?.session_res?.id_app_user)

    return resSuccess({
      message: RECORD_DELETE_SUCCESSFULLY,
      data: { wish_list_count },
    });
  } catch (error) {
    throw error;
  }
};

export const deleteVariantProductWishListWithProduct = async (req: Request) => {
  try {
    const { whishlist_id, user_id, product_id } = req.body;
   
    const userExit = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });

    if (!(userExit && userExit.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    if (product_id && !whishlist_id && whishlist_id == null) {
      const product = await Product.findOne({
        where: {
          id: product_id,
          is_deleted: DeletedStatus.No,
          is_active: DeletedStatus.yes,
          
        },
      });
      if (!(product && product.dataValues)) {
        return resNotFound({ message: PRODUCT_NOT_FOUND });
      }
      const ProductWishWithUser = await ProductWish.findOne({
        where: {
          product_id: product.dataValues.id,
          user_id: user_id,
          product_type: AllProductTypes.Product,
        },
      });

      await ProductWish.destroy({
        where: {
          product_id: product.dataValues.id,
          user_id: user_id,
          product_type: AllProductTypes.Product,
          
        },
      });

      const wish_list_count = await ProductWish.count({
        where: { user_id: user_id },
      });

      await addActivityLogs( [{
        old_data: { product_wish_list_id: ProductWishWithUser?.dataValues?.id, data: { ...ProductWishWithUser?.dataValues }, user_id: userExit?.dataValues?.id, user_data: { ...userExit } },
        new_data: null
      }], ProductWishWithUser?.dataValues?.id, LogsActivityType.Delete, LogsType.ProductWishListWithProduct, req?.body?.session_res?.id_app_user)

      return resSuccess({
        message: RECORD_DELETE_SUCCESSFULLY,
        data: { wish_list_count },
      });
    }
    const findProduct = await ProductWish.findOne({
      where: { id: whishlist_id, user_id: user_id },
    });

    if (!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    await ProductWish.destroy({
      where: { id: whishlist_id },
    });

    const wish_list_count = await ProductWish.count({
      where: { user_id: user_id },
    });
    await addActivityLogs([{
      old_data: { product_wish_list_id: findProduct?.dataValues?.id, data: { ...findProduct?.dataValues }, user_id: userExit?.dataValues?.id, user_data: { ...userExit } },
      new_data: null
    }], findProduct?.dataValues?.id, LogsActivityType.Delete, LogsType.ProductWishListWithProduct, req?.body?.session_res?.id_app_user)

    return resSuccess({
      message: RECORD_DELETE_SUCCESSFULLY,
      data: { wish_list_count },
    });
  } catch (error) {
    throw error;
  }
};

export const getWishListProductsForProductListAndDetail = async (
  req: Request
) => {
  try {
    const { user_id } = req.params;
    
    const products = await ProductWish.findAll({
      where: { user_id: user_id },
      attributes: [
        "id",
        "product_id",
        "variant_id",
        "id_size",
        "id_length",
        "id_metal_tone",
        "id_metal",
        "product_type",
        "id_karat",
        "product_details",
      ],
    });

    return resSuccess({ data: products });
  } catch (error) {
    throw error;
  }
};

export const moveProductCartToWishlist = async (req: Request) => {
  try {
    const { cart_id } = req.params
    
    const findProduct = await CartProducts.findOne({ where: { id: cart_id } })
    if (!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: prepareMessageFromParams(ERROR_NOT_FOUND, [["field_name", "Cart Product"]]) })
    }
    // get IP
    const IP = req.headers['x-forwarded-for']
    // get location based in IP
    const location = await getLocationBasedOnIPAddress(IP)
    let country = null
    let locationData = null
    if (location && location.code == DEFAULT_STATUS_CODE_SUCCESS) {
      country = location.data.country
      locationData = location.data
    }
    const findWishList = await ProductWish.findOne({
      where: {
        user_id: req.body.session_res.id_app_user,
        product_id: findProduct.dataValues.product_id,
        variant_id: findProduct.dataValues.variant_id,
        product_type: findProduct.dataValues.product_type,
        id_size: findProduct.dataValues.id_size,
        id_metal: findProduct.dataValues.id_metal,
        id_karat: findProduct.dataValues.id_karat,
        id_length: findProduct.dataValues.id_length,
        id_metal_tone: findProduct.dataValues.id_metal_tone,
        is_band: findProduct.dataValues.is_band,
        id_head_metal_tone: findProduct.dataValues.id_head_metal_tone,
        id_shank_metal_tone: findProduct.dataValues.id_shank_metal_tone,
        id_band_metal_tone: findProduct.dataValues.id_band_metal_tone,
        
        user_ip: IP,
        user_country: country,
        user_location: locationData
      }
    })

    if ((findWishList && findWishList.dataValues)) {
      return resNotFound({ message: prepareMessageFromParams(DATA_ALREADY_EXIST, [["field_name", "Wishlist Product"]]) })
    }
    const wishlistProduct = await ProductWish.create({
      user_id: req.body.session_res.id_app_user,
      product_id: findProduct.dataValues.product_id,
      variant_id: findProduct.dataValues.variant_id,
      created_date: getLocalDate(),
      
      product_type: findProduct.dataValues.product_type,
      id_size: findProduct.dataValues.id_size,
      id_metal: findProduct.dataValues.id_metal,
      id_karat: findProduct.dataValues.id_karat,
      id_length: findProduct.dataValues.id_length,
      id_metal_tone: findProduct.dataValues.id_metal_tone,
      is_band: findProduct.dataValues.is_band,
      id_head_metal_tone: findProduct.dataValues.id_head_metal_tone,
      id_shank_metal_tone: findProduct.dataValues.id_shank_metal_tone,
      id_band_metal_tone: findProduct.dataValues.id_band_metal_tone,
      product_details: {
        ...findProduct.dataValues.product_details,
        id_image: findProduct.dataValues.product_details.image || null,
        id_size: findProduct.dataValues.id_size || null,
        id_length: findProduct.dataValues.id_length || null,
        id_karat: findProduct.dataValues.id_karat || null,
        id_metal: findProduct.dataValues.id_metal || null,
        id_metal_tone: findProduct.dataValues.id_metal_tone || null,
      },
      user_ip: IP,
      user_country: country,
      user_location: locationData
    })
    await CartProducts.destroy({ where: { id: findProduct.dataValues.id } })

    await addActivityLogs( [{
      old_data: null,
      new_data: {
        product_wish_list_id: wishlistProduct?.dataValues?.id, data: {
          ...wishlistProduct?.dataValues
        }
      }
    }], wishlistProduct?.dataValues?.id, LogsActivityType.Add, LogsType.MoveProductCartToWishList, req?.body?.session_res?.id_app_user)

    await addActivityLogs( [{
      old_data: { cart_id: findProduct?.dataValues?.id, data: { ...findProduct?.dataValues } },
      new_data: null
    }], wishlistProduct?.dataValues?.id, LogsActivityType.Delete, LogsType.MoveProductCartToWishList, req?.body?.session_res?.id_app_user)

    return resSuccess({ data: wishlistProduct })
  } catch (error) {
    throw error
  }
}