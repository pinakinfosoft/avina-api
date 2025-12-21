import { Request } from "express";
import { Model, Op, QueryTypes, Sequelize, where } from "sequelize";
import {
  ATTRIBUTE_NOT_FOUND,
  CATEGORY_NOT_FOUND,
  PRODUCT_METAL_OPTIONS_CENTER_DIAMOND_PRICE_IS_REQUIRED,
  DATA_NOT_FOUND,
  DEFAULT_STATUS_CODE_SUCCESS,
  DIAMOND_GROUP_NOT_FOUND,
  GOLD_WEIGHT_REQUIRES,
  IMAGES_NOT_FOUND,
  IMAGE_NOT_FOUND,
  INVALID_CATEGORY,
  INVALID_ID,
  ITEM_IS_ALREADY_IN_MODE,
  LENGTH_NOT_FOUND,
  METAL_FORMULA_NOT_AVAILABLE,
  METAL_GROUP_NOT_FOUND,
  METAL_IS_REQUIRES,
  METAL_KT_IS_REQUIRES,
  METAL_KT_NOT_FOUND,
  METAL_RATE_CONFIG_NOT_FOUND,
  METAL_TONE_NOT_FOUND,
  PRODUCT_DIAMOND_OPTION_NOT_FOUND,
  PRODUCT_EXIST_WITH_SAME_NAME,
  PRODUCT_EXIST_WITH_SAME_SKU,
  PRODUCT_METAL_OPTION_NOT_FOUND,
  PRODUCT_NOT_FOUND,
  RECORD_UPDATE_SUCCESSFULLY,
  SETTING_DIAMOND_SHAPES_IS_REQUIRED,
  SETTING_STYLE_TYPE_NOT_FOUND,
  SIZE_NOT_FOUND,
  TAG_NOT_FOUND,
  UNPROCESSABLE_ENTITY_CODE,
  VIDEOS_NOT_FOUND,
  VIDEO_NOT_FOUND,
  RECORD_DELETE_SUCCESSFULLY,
  ALREDY_EXIST,
  PRODUCT_IMAGE_REQUIRES,
} from "../../utils/app-messages";
import {
  addActivityLogs,
  columnValueLowerCase,
  createToneArrayBasedOnKarat,
  getInitialPaginationFromQuery,
  getLocalDate,
  getWebSettingData,
  prepareMessageFromParams,
  refreshMaterializedProductListView,
  resBadRequest,
  resErrorDataExit,
  resNotFound,
  resSuccess,
  resUnknownError,
  resUnprocessableEntity,
  roundDecimalNumber,
} from "../../utils/shared-functions";
import {
  IProductMetalOptions,
  IProductDiamondOptions,
  TResponseReturn,
  ISaveProductMetalOptionsPayload,
  ISaveSettingStyleTypePayload,
  ISaveProductDiamondOptionsPayload,
  ISaveProductSizePayload,
  ISaveProductLengthPayload,
  IValidateProductTagPayload,
  IValidateProductCategoryPayload,
  IProductCategory,
  IMetalRate,
  IMetalGroupRate,
  IProductMetalSilverData,
  IProductMetalGoldData,
  IQueryPagination,
  IValidateProductCollectionPayload,
  IValidateProductSizePayload,
  IValidateProductLengthPayload,
  IProductVariantMetalData,
  IValidateDiamondShapesPayload,
} from "../../data/interfaces/common/common.interface";
import {
  ActiveStatus,
  AllProductTypes,
  ConfiguratorManageKeys,
  DISCOUNT_TYPE,
  DeletedStatus,
  FeaturedProductStatus,
  IMAGE_TYPE,
  IMAGE_UPLOAD_TYPE,
  LogsActivityType,
  LogsType,
  METAL_RATE_FORMULA,
  PRICE_CORRECTION_PRODUCT_TYPE,
  PRODUCT_IMAGE_TYPE,
  PaymentStatus,
  SORTING_OPTION,
  STOCK_PRODUCT_TYPE,
  STOCK_TRANSACTION_TYPE,
  SYSTEM_CONFIGURATIONS_KEYS,
  SingleProductType,
  TrendingProductStatus,
  condition,
  couponType,
  offerType,
  sampleFileType,
} from "../../utils/app-enumeration";
import {
  IMAGE_TYPE_LABELS,
  IN_STOCK_PRODUCT_DELIVERY_TIME,
  OUT_OF_STOCK_PRODUCT_DELIVERY_TIME,
  PRODUCT_FILE_LOCATION,
  PRODUCT_PER_PAGE_ROW,
  RATE_CONFIG_KEY_LIST,
  RATE_PRICE_DECIMAL_POINT,
} from "../../utils/app-constants";
import {
  moveFileToLocation,
  moveFileToS3ByTypeAndLocation,
  moveOriginalFileToS3ByTypeAndLocation,
} from "../../helpers/file.helper";
import { fetchConfigurationByKey } from "./auth.service";
import { Product } from "../model/product.model";
import { Image } from "../model/image.model";
import { ProductMetalOption } from "../model/product-metal-option.model";
import { ProductDiamondOption } from "../model/product-diamond-option.model";
import { DiamondGroupMaster } from "../model/master/attributes/diamond-group-master.model";
import { ProductImage } from "../model/product-image.model";
import { ProductCategory } from "../model/product-category.model";
import { ProductVideo } from "../model/product-video.model";
import { MetalTone } from "../model/master/attributes/metal/metalTone.model";
import { ProductWish } from "../model/produc-wish-list.model";
import { CartProducts } from "../model/cart-product.model";
import { Tag } from "../model/master/attributes/tag.model";
import { Collection } from "../model/master/attributes/collection.model";
import { SizeData } from "../model/master/attributes/item-size.model";
import { LengthData } from "../model/master/attributes/item-length.model";
import { DiamondShape } from "../model/master/attributes/diamondShape.model";
import { CategoryData } from "../model/category.model";
import { SettingTypeData } from "../model/master/attributes/settingType.model";
import { MetalGroupMaster } from "../model/master/attributes/metal/metal-group-master.model";
import { SettingCaratWeight } from "../model/master/attributes/settingCaratWeight.model";
import { SystemConfiguration } from "../model/system-configuration.model";
import { GoldKarat } from "../model/master/attributes/metal/gold-karat.model";
import { StockChangeLog } from "../model/stock-change-log.model";
import { BrandData } from "../model/master/attributes/brands.model";
import { ProductSearchHistories } from "../model/product-search-histories.model";
import { DiamondCaratSize } from "../model/master/attributes/caratSize.model";
import { MetalMaster } from "../model/master/attributes/metal/metal-master.model";
import { s3ListObjects } from "../../helpers/s3-client.helper";
import dbContext from "../../config/db-context";
import { calculateDiscountAmount, fetchActiveOffers, getProductOffersForId } from "./apply-offer-buy-with-new.service";

export const getAllProduct = async (req: Request) => {
  try {
    let pagination = {
      ...getInitialPaginationFromQuery(req.query),
      search_text: req.query.search_text,
    };

    let where = [
      { is_deleted: DeletedStatus.No },
      pagination.is_active ? { is_active: pagination.is_active } : 
      pagination.search_text
        ? {
          [Op.or]: {
            name: { [Op.iLike]: `%${pagination.search_text}%` },
            sku: { [Op.iLike]: `%${pagination.search_text}%` },
            slug: { [Op.iLike]: `%${pagination.search_text}%` },
          },
        }
        : {}
    ];

    const totalItems = await Product.count({
      where,
    });

    if (totalItems === 0) {
      return resSuccess({ data: { pagination, result: [] } });
    }
    pagination.total_items = totalItems;
    pagination.total_pages = Math.ceil(totalItems / pagination.per_page_rows);

    const result = await dbContext.query(`(SELECT products.id,
products.name,
products.sku,
products.slug,
products.sort_description,
products.long_description,
products.is_featured,
products.is_active,
products.product_type,
products.discount_type,
products.discount_value,
products.is_trending,
products.additional_detail,
products.certificate,
products.is_customization,
products.meta_title,
products.meta_description,
products.meta_tag,
products.is_band,
products.is_choose_setting,
products.is_single,
products.is_3d_product,
products.making_charge,
products.finding_charge,
products.other_charge,
pdo.total_diamond_price,
CASE WHEN products.setting_diamond_shapes IS NULL THEN '{}'::int[] ELSE string_to_array(products.setting_diamond_shapes, '|')::int[] END as setting_diamond_shapes,
CASE WHEN products.setting_diamond_sizes IS NULL THEN '{}'::int[] ELSE string_to_array(products.setting_diamond_sizes, '|')::int[] END as setting_diamond_sizes,
products.is_quantity_track,
SUM(pmo.remaing_quantity_count) as total_quantity,
jsonb_agg(DISTINCT jsonb_build_object('id', pmo.id, 'metal', metal.name, 'karat', karat.name, 'quantity',
 pmo.remaing_quantity_count, 'metal_weight', pmo.metal_weight, 'metal_rate', metal.metal_rate, 
 'metal_price', CASE WHEN pmo.id_karat IS NULL THEN (metal.metal_rate*pmo.metal_weight) ELSE (metal.metal_rate/metal.calculate_rate*karat.calculate_rate*pmo.metal_weight) END
 )) as quantity_details,

CASE WHEN products.gender IS NULL THEN '{}'::int[] ELSE string_to_array(products.gender, '|')::int[] END as gender,
categories.category_name as category_name,
pp.sku as parent_sku,
(SELECT image_path FROM product_images WHERE id_product = products.id AND is_deleted = '0' AND product_images.image_type = 1 ORDER BY id ASC LIMIT 1) as image_path
FROM products 
LEFT JOIN (
  SELECT
    DISTINCT ON (product_categories.id_product) 
    product_categories.id_product, 
    categories.category_name 
  FROM 
    product_categories 
  LEFT JOIN 
    categories 
  ON 
    categories.id = product_categories.id_category 
  WHERE 
    product_categories.is_deleted = '0' 
  ORDER BY 
    product_categories.id_product,product_categories.id ASC 
) AS categories 
ON categories.id_product = products.id
LEFT JOIN product_metal_options pmo ON pmo.id_product = products.id AND pmo.is_deleted = '${DeletedStatus.No}' 
LEFT JOIN metal_masters metal ON metal.id = pmo.id_metal
LEFT JOIN gold_kts karat ON karat.id = pmo.id_karat
LEFT JOIN (
	SELECT pdo.id_product , SUM(CASE  WHEN dgm.rate IS NOT NULL AND dgm.rate != 0 THEN dgm.rate*pdo.weight*pdo.count ELSE dgm.synthetic_rate*pdo.weight*pdo.count END) as total_diamond_price
 FROM 
	product_diamond_options pdo 
LEFT JOIN diamond_group_masters DGM ON DGM.id = pdo.id_diamond_group
	WHERE  pdo.is_deleted = '0' 
	GROUP BY pdo.id_product
) as pdo on pdo.id_product = products.id
LEFT JOIN products as pp ON pp.id = products.parent_id
WHERE products.is_deleted = '0'
${pagination.search_text ? `AND (products.name ILIKE '%${pagination.search_text}%' OR products.sku ILIKE '%${pagination.search_text}%' OR products.slug ILIKE '%${pagination.search_text}%')` : ''}
GROUP BY products.id,categories.category_name,pp.sku,pdo.total_diamond_price
ORDER BY ${pagination.sort_by == "category_name" ? `category_name` : pagination.sort_by == "parent_sku" ? `pp.sku` : `products.${pagination.sort_by}`} ${pagination.order_by}
OFFSET
    ${(pagination.current_page - 1) * pagination.per_page_rows} ROWS
    FETCH NEXT
    	${pagination.per_page_rows} ROWS ONLY
)`, { type: QueryTypes.SELECT });

    // await addRateToProductList(result);
    return resSuccess({ data: { pagination, result } });
  } catch (e) {
    console.log(e, "error \n\n\n\n\n\n\n\n")
    throw e;
  }
};

const addRateToProductList = async (productList: any) => {
  const resFMCGR = await fetchMetalConfigGroupRate();
  if (resFMCGR.code !== DEFAULT_STATUS_CODE_SUCCESS) {
    return resFMCGR;
  }
  const rateMetalConfig: IMetalGroupRate[] = resFMCGR.data;
  let pmoPriceList: number[] = [];
  for (let product of productList) {
    if (product.dataValues.PMO) {
      for (let pmo of product.dataValues.PMO) {
      }
    }
  }
};

export const getProductById = async (req: Request) => {
  try {

    let idProduct = req.params.id;
    if (!idProduct) return resBadRequest({ message: INVALID_ID });

    const findProduct = await Product.findOne({
      attributes: [
        "id",
        "name",
        "sku",
        "slug",
        "id_brand",
        "additional_detail",
        "certificate",
        "is_customization",
        "parent_id",
        [
          Sequelize.literal(
            `CASE WHEN "gender" IS NULL THEN '{}'::int[] ELSE string_to_array("gender", '|')::int[] END`
          ),
          "gender",
        ],
        "sort_description",
        "long_description",
        "making_charge",
        "finding_charge",
        "other_charge",
        "product_type",
        "discount_type",
        "discount_value",
        "is_featured",
        "is_trending",
        "is_quantity_track",
        "retail_price",
        "compare_price",
        "quantity",
        "meta_title",
        "meta_description",
        "meta_tag",
        "shipping_day",
        [
          Sequelize.literal(
            `CASE WHEN "products"."id_collection" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."id_collection", '|')::int[] END`
          ),
          "id_collection",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."tag" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."tag", '|')::int[] END`
          ),
          "tag",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."size" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."size", '|')::int[] END`
          ),
          "size",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."length" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."length", '|')::int[] END`
          ),
          "length",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."setting_style_type" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."setting_style_type", '|')::int[] END`
          ),
          "setting_style_type",
        ],
        "is_single",
        "is_3d_product",
        "head_no",
        "shank_no",
        "band_no",
        "style_no",
        "is_choose_setting",
        [
          Sequelize.literal(
            `CASE WHEN "products"."setting_diamond_shapes" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."setting_diamond_shapes", '|')::int[] END`
          ),
          "setting_diamond_shapes",
        ],
        "is_band",
        [
          Sequelize.literal(
            `CASE WHEN "products"."setting_diamond_sizes" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."setting_diamond_sizes", '|')::int[] END`
          ),
          "setting_diamond_sizes",
        ],
      ],
      where: {
        id: idProduct,
        is_deleted: DeletedStatus.No,
      },
      include: [
        {
          required: false,
          model: ProductMetalOption,
          as: "PMO",
          attributes: [
            "id",
            "id_metal_group",
            "metal_weight",
            "id_metal",
            "retail_price",
            "compare_price",
            "id_size",
            "id_m_tone",
            "id_length",
            "band_metal_weight",
            "band_metal_price",
            [Sequelize.literal('"PMO"."remaing_quantity_count"'), "quantity"],
            "side_dia_weight",
            "side_dia_count",
            "id_m_tone",
            [
              Sequelize.literal(`
                CASE 
                  WHEN "PMO"."id_metal_tone" IS NULL OR TRIM("PMO"."id_metal_tone") = '' THEN '{}'::int[] 
                  ELSE string_to_array(TRIM(BOTH '|' FROM "PMO"."id_metal_tone"), '|')::int[]
                END
              `),
              'metal_tone'
            ],
            "id_metal_tone",
            "center_diamond_price",
            "id_karat",
            "is_default",
            "is_deleted",
          ],
          where: { is_deleted: DeletedStatus.No },
        },
        {
          required: false,
          model: ProductDiamondOption,
          as: "PDO",
          attributes: [
            "id",
            "id_diamond_group",
            "id_type",
            "id_setting",
            "weight",
            "count",
            "is_default",
            "id_stone",
            "id_shape",
            "id_mm_size",
            "id_color",
            "id_clarity",
            "is_band",
            "id_cut",
          ],
          include: [
            {
              required: false,
              model: DiamondGroupMaster,
              as: "rate",
              attributes: [
                "id",
                "id_stone",
                "id_shape",
                "id_mm_size",
                "id_color",
                "id_clarity",
                "id_cuts",
                "rate",
              ],
              where: { is_deleted: DeletedStatus.No },
            },
          ],
          where: { is_deleted: DeletedStatus.No },
        },
        {
          required: false,
          model: ProductCategory,
          as: "product_categories",
          attributes: [
            "id",
            "id_category",
            "id_sub_category",
            "id_sub_sub_category",
          ],
          where: { is_deleted: DeletedStatus.No },
        },
        {
          required: false,
          model: ProductImage,
          as: "product_images",
          attributes: ["id", "image_path", "image_type", "id_metal_tone"],
          where: { is_deleted: DeletedStatus.No },
        },
        {
          required: false,
          model: ProductVideo,
          as: "product_videos",
          attributes: ["id", "video_path", "video_type", "id_metal_tone"],
          where: { is_deleted: DeletedStatus.No },
        },
      ],
    });

    if(!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }
    let metalToneList;
    if (findProduct.dataValues.product_type == SingleProductType.VariantType) {
      metalToneList = findProduct?.dataValues.PMO.map(
        (t: any) => t.dataValues.id_m_tone
      );
    } else {
      const metalTone = findProduct?.dataValues.PMO.map(
        (t: any) => t.dataValues.metal_tone
      );
      metalToneList = metalTone.flat().map((t: any) => t);
    }

    const metal_tone = await MetalTone.findAll({
      where: { id: metalToneList.map((t: any) => t) },
      attributes: [
        "id",
        "name",
        "sort_code",
        [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
      ],
      include: [{required: false, model: Image, as: "metal_tone_image", attributes: [] }],
    });

    if (!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    return resSuccess({ data: { findProduct, metal_tone } });
  } catch (e) {
    console.log("-----------------", e)
    return resUnknownError({ data: e });
  }
};

export const validateSameProductName = async (
  name: string,
  sku: string,
  id: number | null = null,
) => {
  const productWithSameNameSKU = await Product.findOne({
    where: [
      { [Op.or]: { name, sku }, is_deleted: DeletedStatus.No },
      id ? { id: { [Op.ne]: id } } : {}
    ],
  });
  if (productWithSameNameSKU && productWithSameNameSKU.dataValues) {
    return resUnprocessableEntity({
      message:
        productWithSameNameSKU.dataValues.name === name
          ? PRODUCT_EXIST_WITH_SAME_NAME
          : PRODUCT_EXIST_WITH_SAME_SKU,
    });
  }
  return resSuccess();
};

export const activeInactiveProduct = async (req: Request) => {
  try {

    const { id_product, is_active } = req.body;
    const findProduct = await Product.findOne({
      where: {
        id: id_product,
        is_deleted: DeletedStatus.No,
      },
    });

    if (!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    if (is_active === findProduct.dataValues.is_active) {
      return resBadRequest({
        message: prepareMessageFromParams(ITEM_IS_ALREADY_IN_MODE, [
          ["item", "Product"],
          ["mode", is_active === "1" ? "activate" : "inactivate"],
        ]),
      });
    }

    await Product.update(
      {
        is_active: is_active,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: findProduct.dataValues.id } }
    );
    await ProductWish.destroy({
      where: {
        product_id: findProduct.dataValues.id,
        product_type: [AllProductTypes.Product, AllProductTypes.SettingProduct],
      },
    });
    await CartProducts.destroy({
      where: {
        product_id: findProduct.dataValues.id,
        product_type: [AllProductTypes.Product, AllProductTypes.SettingProduct],
      },
    });
    await addActivityLogs([{
      old_data: { product_id: findProduct.dataValues.id, data: {...findProduct.dataValues} },
      new_data: {
        product_id: findProduct.dataValues.id, data: {
          ...findProduct.dataValues, is_active: is_active,
          modified_by: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], findProduct.dataValues.id, LogsActivityType.StatusUpdate, LogsType.Product, req.body.session_res.id_app_user)
    // await refreshMaterializedProductListViewdbContext;
    return resSuccess();
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

export const deleteProduct = async (req: Request) => {
  const trn = await dbContext.transaction();

  try {
    const productToBeDelete = await Product.findOne({
      where: {
        id: req.body.id,
        is_deleted: DeletedStatus.No,

      },
    });

    if (!(productToBeDelete && productToBeDelete.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    await Product.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: productToBeDelete.dataValues.id }, transaction: trn }
    );

    await ProductCategory.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: { id_product: productToBeDelete.dataValues.id, is_deleted: DeletedStatus.No },
        transaction: trn,
      }
    );

    await ProductMetalOption.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: { id_product: productToBeDelete.dataValues.id, is_deleted: DeletedStatus.No },
        transaction: trn,
      }
    );

    await ProductDiamondOption.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: { id_product: productToBeDelete.dataValues.id, is_deleted: DeletedStatus.No },
        transaction: trn,
      }
    );

    await ProductImage.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: { id_product: productToBeDelete.dataValues.id, is_deleted: DeletedStatus.No },
        transaction: trn,
      }
    );

    await ProductVideo.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: { id_product: productToBeDelete.dataValues.id, is_deleted: DeletedStatus.No },
        transaction: trn,
      }
    );
    await ProductWish.destroy({
      where: {
        product_id: productToBeDelete.dataValues.id,
        product_type: [AllProductTypes.Product, AllProductTypes.SettingProduct],

      },
      transaction: trn,
    });
    await CartProducts.destroy({
      where: {
        product_id: productToBeDelete.dataValues.id,
        product_type: [AllProductTypes.Product, AllProductTypes.SettingProduct],

      },
      transaction: trn,
    });
    // const resRename: TResponseReturn = await new Promise((resolve, reject) => {
    //   fs.rename(
    //     `public/${PRODUCT_FILE_LOCATION}/${productToBeDelete.dataValues.sku}`,
    //     `public/${PRODUCT_FILE_LOCATION}/${productToBeDelete.dataValues.sku
    //     }-archive-${getLocalDate().getTime()}`,
    //     function (err: any) {
    //       if (err) {
    //         return resolve(resUnknownError({ data: err }));
    //       }
    //       return resolve(resSuccess());
    //     }
    //   );
    // });

    // if (resRename.code !== DEFAULT_STATUS_CODE_SUCCESS) {
    //   await trn.rollback();
    //   return resRename;
    // }
    await addActivityLogs([{
      old_data: { product_id: productToBeDelete.dataValues.id, data: {...productToBeDelete.dataValues} },
      new_data: {
        product_id: productToBeDelete.dataValues.id, data: {
          ...productToBeDelete.dataValues, is_deleted: DeletedStatus.yes,
          modified_by: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], productToBeDelete.dataValues.id, LogsActivityType.Delete, LogsType.Product, req.body.session_res.id_app_user)
    await trn.commit();
    // await refreshMaterializedProductListViewdbContext;
    return resSuccess();
  } catch (e) {
    await trn.rollback();
    return resUnknownError({ data: e });
  }
};

export const saveProductBasicDetails = async (req: Request) => {
  try {
    const {
      id_product,
      name,
      sku,
      sort_description,
      long_description,
      tag,
      product_categories,
      making_charge,
      finding_charge,
      other_charge,
      additional_detail = null,
      certificate = null,
      shipping_day = null,
      is_customization = "0",
      parent_id = null,
      meta_title = null,
      meta_description = null,
      meta_tag = null,

    } = req.body;

    let resIdProduct = 0;
    if (id_product !== 0) {
      resIdProduct = id_product;
    }
    let productToBeUpdate;
    if (id_product !== 0) {
      productToBeUpdate = await Product.findOne({
        where: {
          id: id_product,
          is_deleted: DeletedStatus.No,

        },
      });

      if (!(productToBeUpdate && productToBeUpdate.dataValues)) {
        return resNotFound({ message: PRODUCT_NOT_FOUND });
      }
    }

    const validateName = await validateSameProductName(
      name,
      sku,
      id_product !== 0 ? id_product : null,
    );
    if (validateName.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validateName;
    }

    const validTag = await validateProductTag({
      tag,
      oldTag:
        productToBeUpdate && productToBeUpdate.dataValues.tag
          ? productToBeUpdate.dataValues.tag
          : "",
      });

    if (validTag.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validTag;
    }

    const validPC = await validateProductCategories({
      categories: product_categories,
      id_product: id_product !== 0 ? id_product : null,
    });

    if (validPC.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validPC;
    }

    const trn = await dbContext.transaction();
    try {
      if (id_product === 0) {
        const resProduct = await Product.create(
          {
            name: name,
            sku: sku,
            additional_detail: additional_detail,
            certificate: certificate,
            sort_description: sort_description,
            long_description: long_description,
            tag: tag.join("|"),
            making_charge,
            finding_charge,
            is_customization: is_customization,
            parent_id: parent_id,
            other_charge,
            shipping_day: shipping_day,
            is_active: ActiveStatus.Active,
            is_featured: FeaturedProductStatus.InFeatured,
            is_trending: TrendingProductStatus.InTrending,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
            meta_title: meta_title,
            meta_description: meta_description,
            meta_tag: meta_tag,
          },
          { transaction: trn }
        );

        resIdProduct = resProduct.dataValues.id;
        for (const productCategory of product_categories) {
          await ProductCategory.create(
            {
              id_product: resProduct.dataValues.id,
              id_category: productCategory.id_category,
              id_sub_category: productCategory.id_sub_category,
              id_sub_sub_category: productCategory.id_sub_sub_category,
              created_by: req.body.session_res.id_app_user,
              created_date: getLocalDate(),
            },
            { transaction: trn }
          );
        }
      } else {
        await Product.update(
          {
            name: name,
            sku: sku,
            additional_detail: additional_detail,
            certificate: certificate,
            sort_description: sort_description ? sort_description : null,
            long_description: long_description ? long_description : null,
            tag: tag.join("|"),
            making_charge,
            finding_charge,
            is_customization,
            parent_id,
            other_charge,
            shipping_day: shipping_day,
            modified_by: req.body.session_res.id_app_user,
            modified_date: new Date(),
          },
          { where: { id: id_product }, transaction: trn }
        );

        for (const productCategory of product_categories) {
          if (productCategory.id === 0) {
            await ProductCategory.create(
              {
                id_product: id_product,
                id_category: productCategory.id_category,
                id_sub_category: productCategory.id_sub_category,
                id_sub_sub_category: productCategory.id_sub_sub_category,
                created_by: req.body.session_res.id_app_user,
                created_date: new Date(),
              },
              { transaction: trn }
            );
          } else {
            await ProductCategory.update(
              {
                id_category: productCategory.id_category,
                id_sub_category: productCategory.id_sub_category,
                id_sub_sub_category: productCategory.id_sub_sub_category,
                modified_by: req.body.session_res.id_app_user,
                modified_date: new Date(),
              },
              { where: { id: productCategory.id }, transaction: trn }
            );
          }
        }

        for (const productCategory of validPC.data) {
          await ProductCategory.update(
            {
              is_deleted: DeletedStatus.yes,
              modified_by: req.body.session_res.id_app_user,
              modified_date: new Date(),
            },
            { where: { id: productCategory.id }, transaction: trn }
          );
        }
      }
      await trn.commit();
      await refreshMaterializedProductListView(dbContext);
      return resSuccess({ data: resIdProduct });
    } catch (e) {
      await trn.rollback();
      return resUnknownError({ data: e });
    }
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

  const validateProductTag = async (payload: IValidateProductTagPayload) => {
  const { tag, oldTag } = payload;
  let tagIdsToValidate = [];
  let tagIds = oldTag.split("|").map((item) => Number(item));

  for (const id of tag) {
    if (!tagIds.includes(id)) {
      tagIdsToValidate.push(id);
    }
  }

  const validateTag = await Tag.findAll({
    where: {
      id: { [Op.in]: tagIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,
    },
  });

  if (validateTag.length !== tagIdsToValidate.length) {
    return resUnprocessableEntity({ message: TAG_NOT_FOUND });
  }

  return resSuccess();
};

const validateProductCollection = async (
  payload: IValidateProductCollectionPayload
) => {
  const { collection, oldCollection } = payload;

  let collectionIdsToValidate = [];
  let collectionIds = oldCollection.split("|").map((item) => Number(item));

  for (const id of collection) {
    if (!collectionIds.includes(id)) {
      collectionIdsToValidate.push(id);
    }
  }

  const validateTag = await Collection.findAll({
    where: {
      id: { [Op.in]: collectionIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,
    },
  });

  if (validateTag.length !== collectionIdsToValidate.length) {
    return resUnprocessableEntity({
      message: prepareMessageFromParams(DATA_NOT_FOUND, [
        ["field_name", "Collection"],
      ]),
    });
  }

  return resSuccess();
};

const validateProductSize = async (payload: IValidateProductSizePayload) => {
  const { size, oldSize } = payload;
  let sizeIdsToValidate = [];
  let sizeIds = oldSize.split("|").map((item) => Number(item));
  for (const id of size) {
    if (!sizeIds.includes(id)) {
      sizeIdsToValidate.push(id);
    }
  }

  const validateTag = await SizeData.findAll({
    where: {
      id: { [Op.in]: sizeIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,
    },
  });

  if (validateTag.length !== sizeIdsToValidate.length) {
    return resUnprocessableEntity({
      message: prepareMessageFromParams(DATA_NOT_FOUND, [
        ["field_name", "Product Size"],
      ]),
    });
  }

  return resSuccess();
};

const validateProductLength = async (
    payload: IValidateProductLengthPayload
) => {
  const { length, oldLength } = payload;

  let lengthIdsToValidate = [];
  let lengthIds = oldLength.split("|").map((item) => Number(item));

  for (const id of length) {
    if (!lengthIds.includes(id)) {
      lengthIdsToValidate.push(id);
    }
  }

  const validateTag = await LengthData.findAll({
    where: {
      id: { [Op.in]: lengthIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,
    },
  });

  if (validateTag.length !== lengthIdsToValidate.length) {
    return resUnprocessableEntity({
      message: prepareMessageFromParams(DATA_NOT_FOUND, [
        ["field_name", "Product length"],
      ]),
    });
  }

  return resSuccess();
};

const validateDiamondShapes = async (
  payload: IValidateDiamondShapesPayload
) => {
  const { shapes, oldShapes } = payload;
  let shapeIdsToValidate = [];
  let shapeIds = oldShapes.split("|").map((item) => Number(item));

  for (const id of shapes) {
    if (!shapeIds.includes(id)) {
      shapeIdsToValidate.push(id);
    }
  }

  const validateShapes = await DiamondShape.findAll({
    where: {
      id: { [Op.in]: shapeIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,

    },
  });

  if (validateShapes.length !== shapeIdsToValidate.length) {
    return resUnprocessableEntity({
      message: prepareMessageFromParams(DATA_NOT_FOUND, [
        ["field_name", "Setting diamond shape"],
      ]),
    });
  }

  return resSuccess();
};

const validateProductCategories = async (
  payload: IValidateProductCategoryPayload
) => {
  const { categories, id_product } = payload;
  let oldProductCategories: IProductCategory[] = [];

  if (id_product) {
    const findAllPC = await ProductCategory.findAll({
      where: { id_product, is_deleted: DeletedStatus.No, },
    });

    if (findAllPC.length > 0) {
      oldProductCategories = findAllPC.map((item) => {
        return {
          id: item.dataValues.id,
          id_category: item.dataValues.id_category,
          id_sub_category: item.dataValues.id_sub_category,
          id_sub_sub_category: item.dataValues.id_sub_sub_category,
        };
      });
    }
  }

  for (const category of categories) {
    if (category.id !== 0) {
      const oldPC = oldProductCategories.find(
        (item) => item.id === category.id
      );
      if (oldPC === undefined) {
        return resUnprocessableEntity({ message: CATEGORY_NOT_FOUND });
      }

      oldProductCategories = oldProductCategories.filter(
        (item) => item.id !== category.id
      );

      if (oldPC.id_category !== category.id_category) {
        const validateCategory = await CategoryData.findOne({
          attributes: ["id"],
          where: {
            id: category.id_category,
            is_deleted: DeletedStatus.No,
            is_active: ActiveStatus.Active,
            parent_id: { [Op.eq]: null },

          },
          include: category.id_sub_category
            ? {
              model: CategoryData,
              as: "sub_category",
              attributes: ["id"],
              where: {
                id: category.id_sub_category,
                is_deleted: DeletedStatus.No,
                is_active: ActiveStatus.Active,
              },
              include: category.id_sub_sub_category
                ? [
                  {
                    model: CategoryData,
                    as: "sub_category",
                    attributes: ["id"],
                    where: {
                      id: category.id_sub_sub_category,
                      is_deleted: DeletedStatus.No,
                      is_active: ActiveStatus.Active,
                    },
                  },
                ]
                : [],
            }
            : [],
        });

        if (!(validateCategory && validateCategory.dataValues)) {
          return resUnprocessableEntity({ message: INVALID_CATEGORY });
        }
      } else if (category.id_sub_category) {
        if (oldPC.id_sub_category !== category.id_sub_category) {
          const validateCategory = await CategoryData.findOne({
            attributes: ["id"],
            where: {
              id: category.id_category,
            },
            include: category.id_sub_category
              ? {
                model: CategoryData,
                as: "sub_category",
                attributes: ["id"],
                where: {
                  id: category.id_sub_category,
                  is_deleted: DeletedStatus.No,
                  is_active: ActiveStatus.Active,
                },
                include: category.id_sub_sub_category
                  ? [
                    {
                      model: CategoryData,
                      as: "sub_category",
                      attributes: ["id"],
                      where: {
                        id: category.id_sub_sub_category,
                        is_deleted: DeletedStatus.No,
                        is_active: ActiveStatus.Active,
                      },
                    },
                  ]
                  : [],
              }
              : [],
          });

          if (!(validateCategory && validateCategory.dataValues)) {
            return resUnprocessableEntity({ message: INVALID_CATEGORY });
          }
        } else if (
          category.id_sub_sub_category &&
          oldPC.id_sub_sub_category !== category.id_sub_sub_category
        ) {
          const validateCategory = await CategoryData.findOne({
            attributes: ["id"],
            where: {
              id: category.id_sub_category,
            },
            include: category.id_sub_category
              ? {
                model: CategoryData,
                as: "sub_category",
                attributes: ["id"],
                where: {
                  id: category.id_sub_sub_category,
                  is_deleted: DeletedStatus.No,
                  is_active: ActiveStatus.Active,
                },
              }
              : [],
          });

          if (!(validateCategory && validateCategory.dataValues)) {
            return resUnprocessableEntity({ message: INVALID_CATEGORY });
          }
        }
      }
    } else {
      const validateCategory = await CategoryData.findOne({
        attributes: ["id"],
        where: {
          id: category.id_category,
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
          parent_id: { [Op.eq]: null },
        },
        include: category.id_sub_category
          ? {
            model: CategoryData,
            as: "sub_category",
            attributes: ["id"],
            where: {
              id: category.id_sub_category,
              is_deleted: DeletedStatus.No,
              is_active: ActiveStatus.Active,
            },
            include: category.id_sub_sub_category
              ? [
                {
                  model: CategoryData,
                  as: "sub_category",
                  attributes: ["id"],
                  where: {
                    id: category.id_sub_sub_category,
                    is_deleted: DeletedStatus.No,
                    is_active: ActiveStatus.Active,
                  },
                },
              ]
              : [],
          }
          : [],
      });

      if (!(validateCategory && validateCategory.dataValues)) {
        return resUnprocessableEntity({ message: INVALID_CATEGORY });
      }
    }
  }

  return resSuccess({ data: oldProductCategories });
};

export const saveMetalDiamondDetails = async (req: Request) => {
  try {
    const {
      id_product,
      setting_style_type,
      size,
      length,
      product_metal_options,
      product_diamond_options,
    } = req.body;

    const productToBeUpdate = await Product.findOne({
      where: { id: id_product, is_deleted: DeletedStatus.No },
    });

    if (!(productToBeUpdate && productToBeUpdate.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    const trn = await dbContext.transaction();
    try {
      const resSSST = await saveSettingStyleType({
        settingStyleType: setting_style_type,
        oldSettingStyleType: productToBeUpdate.dataValues.setting_style_type
          ? productToBeUpdate.dataValues.setting_style_type
          : "",
        idProduct: productToBeUpdate.dataValues.id,
        idAppUser: req.body.session_res.id_app_user,
        trn,
      });

      if (resSSST.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        await trn.rollback();
        return resSSST;
      }

      const resPS = await saveProductSize({
        size: size,
        oldSize: productToBeUpdate.dataValues.size
          ? productToBeUpdate.dataValues.size
          : "",
        idProduct: productToBeUpdate.dataValues.id,
        idAppUser: req.body.session_res.id_app_user,
        trn,
      });

      if (resPS.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        await trn.rollback();
        return resPS;
      }

      const resPL = await saveProductLength({
        length: length,
        oldLength: productToBeUpdate.dataValues.length
          ? productToBeUpdate.dataValues.length
          : "",
        idProduct: productToBeUpdate.dataValues.id,
        idAppUser: req.body.session_res.id_app_user,
        trn,
      });

      if (resPL.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        await trn.rollback();
        return resPL;
      }

      const resSPMO = await saveProductMetalOptions({
        idProduct: productToBeUpdate.dataValues.id,
        productMetalOptions: product_metal_options,
        idAppUser: req.body.session_res.id_app_user,
        trn,
      });

      if (resSPMO.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        await trn.rollback();
        return resSPMO;
      }

      const resSPDO = await saveProductDiamondOptions({
        idProduct: productToBeUpdate.dataValues.id,
        productDiamondOptions: product_diamond_options,
        idAppUser: req.body.session_res.id_app_user,
        trn,
      });

      if (resSPDO.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        await trn.rollback();
        return resSPDO;
      }

      await trn.commit();
      return resSuccess();
    } catch (e) {
      await trn.rollback();
      return resUnknownError({ data: e });
    }
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

const saveSettingStyleType = async (payload: ISaveSettingStyleTypePayload) => {
  const { settingStyleType, oldSettingStyleType, idProduct, idAppUser, trn } =
    payload;

  let settingStyleTypeIdsToValidate = [];
  let oldSettingStyleTypeIds = oldSettingStyleType
    .split("|")
    .map((item) => Number(item));

  for (const id of settingStyleType) {
    if (!oldSettingStyleTypeIds.includes(id)) {
      settingStyleTypeIdsToValidate.push(id);
    }
  }

  const validateStyleType = await SettingTypeData.findAll({
    where: {
      id: { [Op.in]: settingStyleTypeIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,
    },
    transaction: trn,
  });

  if (validateStyleType.length !== settingStyleTypeIdsToValidate.length) {
    return resUnprocessableEntity({ message: SETTING_STYLE_TYPE_NOT_FOUND });
  }

  await Product.update(
    {
      setting_style_type: settingStyleType.join("|"),
      modified_by: idAppUser,
      modified_date: getLocalDate(),
    },
    { where: { id: idProduct, }, transaction: trn }
  );
  await refreshMaterializedProductListView(dbContext);
  return resSuccess();
};

const saveProductSize = async (payload: ISaveProductSizePayload) => {
  const { size, oldSize, idProduct, idAppUser, trn } = payload;
  let sizeIdsToValidate = [];
  let sizeIds = oldSize.split("|").map((item) => Number(item));

  for (const id of size) {
    if (!sizeIds.includes(id)) {
      sizeIdsToValidate.push(id);
    }
  }

  const validateSize = await SizeData.findAll({
    where: {
      id: { [Op.in]: sizeIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,
    },
    transaction: trn,
  });

  if (validateSize.length !== sizeIdsToValidate.length) {
    return resUnprocessableEntity({ message: SIZE_NOT_FOUND });
  }

  await Product.update(
    {
      size: size.join("|"),
      modified_by: idAppUser,
      modified_date: getLocalDate(),
    },
    { where: { id: idProduct, }, transaction: trn }
  );
  await refreshMaterializedProductListView(dbContext);
  return resSuccess();
};

const saveProductLength = async (payload: ISaveProductLengthPayload) => {
  const { length, oldLength, idProduct, idAppUser, trn } = payload;
  let lengthIdsToValidate = [];
  let lengthIds = oldLength.split("|").map((item) => Number(item));

  for (const id of length) {
    if (!lengthIds.includes(id)) {
      lengthIdsToValidate.push(id);
    }
  }

  const validateLength = await LengthData.findAll({
    where: {
      id: { [Op.in]: lengthIdsToValidate },
      is_active: ActiveStatus.Active,
      is_deleted: DeletedStatus.No,
    },
    transaction: trn,
  });

  if (validateLength.length !== lengthIdsToValidate.length) {
    return resUnprocessableEntity({ message: LENGTH_NOT_FOUND });
  }

  await Product.update(
    {
      length: length.join("|"),
      modified_by: idAppUser,
      modified_date: getLocalDate(),
    },
    { where: { id: idProduct, }, transaction: trn }
  );
  await refreshMaterializedProductListView(dbContext);
  return resSuccess();
};

const saveProductMetalOptions = async (
  payload: ISaveProductMetalOptionsPayload
) => {
  const { idProduct, productMetalOptions, idAppUser, trn } = payload;
  let findAlreadyAddedPMO = await ProductMetalOption.findAll({
    where: { id_product: idProduct, is_deleted: DeletedStatus.No, },
    transaction: trn,
  });
  let pmo: IProductMetalOptions;
  let oldPMO: Model<any, any> | undefined;
  let findMetalGroup: Model<any, any> | null = null;
  for (pmo of productMetalOptions) {
    if (pmo.id !== 0) {
      oldPMO = findAlreadyAddedPMO.find(
        (item) => item.dataValues.id === pmo.id
      );

      if (!(oldPMO !== undefined && oldPMO && oldPMO.dataValues)) {
        return resUnprocessableEntity({
          message: PRODUCT_METAL_OPTION_NOT_FOUND,
        });
      }

      findAlreadyAddedPMO = findAlreadyAddedPMO.filter(
        (item) => item.dataValues.id !== oldPMO?.dataValues.id
      );
      findMetalGroup = await MetalGroupMaster.findOne({
        where: { id: pmo.id_metal_group, },
        transaction: trn,
      });

      if (!(findMetalGroup && findMetalGroup.dataValues)) {
        return resUnprocessableEntity({ message: METAL_GROUP_NOT_FOUND });
      }

      if (
        oldPMO.dataValues.id_metal_group !== pmo.id_metal_group &&
        (findMetalGroup.dataValues.is_active === "0" ||
          findMetalGroup.dataValues.is_deleted == "1")
      ) {
        return resUnprocessableEntity({ message: METAL_GROUP_NOT_FOUND });
      }

      if (
        oldPMO.dataValues.id_metal_group !== pmo.id_metal_group ||
        Number(oldPMO.dataValues.metal_weight) !== pmo.metal_weight
      ) {
        await ProductMetalOption.update(
          {
            id_metal_group: pmo.id_metal_group,
            metal_weight: pmo.metal_weight,
            is_default: pmo.is_default,
            modified_by: idAppUser,
            modified_date: getLocalDate(),
          },
          { where: { id: oldPMO.dataValues.id, }, transaction: trn }
        );
      }
    } else {
      findMetalGroup = await MetalGroupMaster.findOne({
        where: { id: pmo.id_metal_group, is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No, },
        transaction: trn,
      });
      if (!(findMetalGroup && findMetalGroup.dataValues)) {
        return resUnprocessableEntity({ message: METAL_GROUP_NOT_FOUND + "a" });
      }

      await ProductMetalOption.create(
        {
          id_product: idProduct,
          id_metal_group: pmo.id_metal_group,
          metal_weight: pmo.metal_weight,
          is_default: pmo.is_default,
          created_by: idAppUser,
          created_date: getLocalDate(),
        },
        { transaction: trn }
      );
    }
  }

  for (const pmo of findAlreadyAddedPMO) {
    await ProductMetalOption.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: idAppUser,
        modified_date: getLocalDate(),
      },
      { where: { id: pmo.dataValues.id, }, transaction: trn }
    );
  }
  return resSuccess();
};

const saveProductDiamondOptions = async (
  payload: ISaveProductDiamondOptionsPayload
) => {

  const { productDiamondOptions, idProduct, idAppUser, trn } = payload;

  let findAlreadyAddedPDO = await ProductDiamondOption.findAll({
    where: { id_product: idProduct, is_deleted: DeletedStatus.No, },
    transaction: trn,
  });

  let pdo: IProductDiamondOptions;
  let oldPDO: undefined | Model<any, any>;
  for (pdo of productDiamondOptions) {
    if (pdo.id !== 0) {
      oldPDO = findAlreadyAddedPDO.find(
        (item) => item.dataValues.id === pdo.id
      );

      if (!(oldPDO !== undefined && oldPDO && oldPDO.dataValues)) {
        return resUnprocessableEntity({
          message: PRODUCT_DIAMOND_OPTION_NOT_FOUND,
        });
      }

      findAlreadyAddedPDO = findAlreadyAddedPDO.filter(
        (item) => item.dataValues.id !== oldPDO?.dataValues.id
      );

      if (hasAnyDifferenceInOldAndNewPDO(oldPDO, pdo)) {
        const validAttribute = await validateProductDiamondOption(pdo, oldPDO);
        if (validAttribute.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return validAttribute;
        }

        await ProductDiamondOption.update(
          {
            id_diamond_group: pdo.id_diamond_group,
            id_type: pdo.id_type,
            id_setting: pdo.id_setting,
            weight: pdo.weight,
            count: pdo.count,
            is_default: pdo.is_default,
            modified_by: idAppUser,
            modified_date: getLocalDate(),
          },
          { where: { id: oldPDO.dataValues.id, }, transaction: trn }
        );
      }
    } else {
      const validAttribute = await validateProductDiamondOption(pdo, null);
      if (validAttribute.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return validAttribute;
      }

      await ProductDiamondOption.create(
        {
          id_product: idProduct,
          id_diamond_group: pdo.id_diamond_group,
          id_type: pdo.id_type,
          id_setting: pdo.id_setting,
          weight: pdo.weight,
          count: pdo.count,
          is_default: pdo.is_default,
          created_by: idAppUser,
          created_date: getLocalDate(),
        },
        { transaction: trn }
      );
    }
  }

  for (const pdo of findAlreadyAddedPDO) {
    await ProductDiamondOption.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: idAppUser,
        modified_date: getLocalDate(),
      },
      { where: { id: pdo.dataValues.id }, transaction: trn }
    );
  }
  return resSuccess();
};

const hasAnyDifferenceInOldAndNewPDO = (
  oldPDO: Model<any, any>,
  pdo: IProductDiamondOptions
) => {

  if (
    oldPDO.dataValues.id_diamond_group !== pdo.id_diamond_group ||
    oldPDO.dataValues.id_type !== pdo.id_type ||
    oldPDO.dataValues.id_setting !== pdo.id_setting ||
    Number(oldPDO.dataValues.weight) !== pdo.weight ||
    oldPDO.dataValues.count !== pdo.count ||
    oldPDO.dataValues.is_default !== pdo.is_default
  ) {
    return true;
  }
  return false;
};

// In validateProductDiamondOption funciton we are handling error which is thown manualy
const validateProductDiamondOption = async (
  pdo: IProductDiamondOptions,
  oldPDO?: Model<any, any>,
) => {
  try {

    if (
      !oldPDO ||
      oldPDO.dataValues.id_diamond_group !== pdo.id_diamond_group
    ) {
      await validateDiamondAttribute(DiamondGroupMaster, pdo.id_diamond_group);
    }
    if (!oldPDO || oldPDO.dataValues.id_setting !== pdo.id_setting) {
      await validateDiamondAttribute(SettingCaratWeight, pdo.id_setting);
    }

    return resSuccess();
  } catch (e: any) {
    if (e?.code === UNPROCESSABLE_ENTITY_CODE) {
      return e as TResponseReturn;
    }
    throw e;
  }
};

// Function is throwing an error so be careful while using this function
const validateDiamondAttribute = async (
  attributeModel: any,
  attributeId: number,
) => {
  const findAttribut = await attributeModel.findOne({
    where: { id: attributeId, is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active, },
  });

  if (!(findAttribut && findAttribut.dataValues)) {
    throw resUnprocessableEntity({ message: ATTRIBUTE_NOT_FOUND });
  }

  return resSuccess;
};

const findMetalRateFromId = async (idMetal: number, idKt: number) => {
  // Formula for metal
  // Gold = (1850/31.104)*(kt/24)
  // Silver = 999
  // platinum = 950
  const config = await SystemConfiguration.findOne({
    where: { id_metal: idMetal },
  });

  if (!(config && config.dataValues)) {
    return resNotFound({ message: METAL_RATE_CONFIG_NOT_FOUND });
  }

  switch (Number(config.dataValues.config_value)) {
    case METAL_RATE_FORMULA.Gold:
      if (!idKt) {
        return resUnprocessableEntity({ message: METAL_KT_IS_REQUIRES });
      }

      const goldKt = await GoldKarat.findOne({
        where: { id: idKt, is_deleted: DeletedStatus.No },
      });
      if (!(goldKt && goldKt.dataValues)) {
        return resUnprocessableEntity({ message: METAL_KT_NOT_FOUND });
      }

      const ouncePriceConfig = await fetchConfigurationByKey(
        SYSTEM_CONFIGURATIONS_KEYS.OUNCE_PRICE,
      );
      if (ouncePriceConfig.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return ouncePriceConfig;
      }

      const goldGramPerOnceConfig = await fetchConfigurationByKey(
        SYSTEM_CONFIGURATIONS_KEYS.GOLD_GRAM_PER_OUNCE,
      );
      if (goldGramPerOnceConfig.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return goldGramPerOnceConfig;
      }

      return resSuccess({
        data: roundDecimalNumber(
          (ouncePriceConfig.data.dataValues.config_value /
            goldGramPerOnceConfig.data.dataValues.config_value) *
          (goldKt.dataValues.calculate_rate / 24),
          RATE_PRICE_DECIMAL_POINT
        ),
      });

    case METAL_RATE_FORMULA.Silver:
      const silverRateConfig = await fetchConfigurationByKey(
        SYSTEM_CONFIGURATIONS_KEYS.SILVER_PRICE_PER_GRAM,
      );
      if (silverRateConfig.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return silverRateConfig;
      }
      return resSuccess({
        data: Number(silverRateConfig.data.dataValues.config_value),
      });

    case METAL_RATE_FORMULA.Platinum:
      const platinumRateConfig = await fetchConfigurationByKey(
        SYSTEM_CONFIGURATIONS_KEYS.PLATINUM_PRICE_PER_GRAM,
      );
      if (platinumRateConfig.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return platinumRateConfig;
      }
      return resSuccess({
        data: Number(platinumRateConfig.data.dataValues.config_value),
      });

    default:
      return resNotFound({ message: METAL_FORMULA_NOT_AVAILABLE });
  }
};

export const fetchMetalConfigGroupRate = async () => {
  let metalRateList: IMetalRate[] = [];
  let metalConfigGroupRate: IMetalGroupRate[] = [];

  const resMetalRate = await findMetalRateList();
  if (resMetalRate.code !== DEFAULT_STATUS_CODE_SUCCESS) {
    return resMetalRate;
  }
  metalRateList = resMetalRate.data;

  const metalConfigGroupList = await MetalGroupMaster.findAll({
    where: { is_deleted: DeletedStatus.No },
    include: {
      required: false,
      model: GoldKarat,
      as: "KT",
    },
  });

  let metalRate: IMetalRate | undefined;
  for (const metalConfigGroup of metalConfigGroupList) {
    metalRate = metalRateList.find(
      (item) => item.id_metal === metalConfigGroup.dataValues.id_metal
    );

    if (!metalRate) {
      return resNotFound({ message: METAL_RATE_CONFIG_NOT_FOUND });
    }

    if (metalRate.formula === METAL_RATE_FORMULA.Gold) {
      metalConfigGroupRate.push({
        id_metal_config: metalConfigGroup.dataValues.id,
        rate: roundDecimalNumber(
          metalRate.rate *
          (metalConfigGroup.dataValues.KT.dataValues.calculate_rate / 24),
          RATE_PRICE_DECIMAL_POINT
        ),
      });
    } else if (metalRate.formula === METAL_RATE_FORMULA.Silver) {
      metalConfigGroupRate.push({
        id_metal_config: metalConfigGroup.dataValues.id,
        rate: metalRate.rate,
      });
    } else if (metalRate.formula === METAL_RATE_FORMULA.Platinum) {
      metalConfigGroupRate.push({
        id_metal_config: metalConfigGroup.dataValues.id,
        rate: metalRate.rate,
      });
    }
  }

  return resSuccess({ data: metalConfigGroupRate });
};

const findMetalRateList = async () => {
  let metalRateList: IMetalRate[] = [];
  const rateConfigs = await SystemConfiguration.findAll({
    where: { config_key: { [Op.in]: RATE_CONFIG_KEY_LIST } },
  });

  for (const config of rateConfigs) {
    if (
      config.dataValues.config_key === SYSTEM_CONFIGURATIONS_KEYS.OUNCE_PRICE
    ) {
      const configGoldPerGram = await SystemConfiguration.findOne({
        where: { config_key: SYSTEM_CONFIGURATIONS_KEYS.GOLD_GRAM_PER_OUNCE },
      });

      if (!(configGoldPerGram && configGoldPerGram.dataValues)) {
        return resNotFound({ message: METAL_RATE_CONFIG_NOT_FOUND });
      }

      metalRateList.push({
        id_metal: config.dataValues.id_metal,
        rate: roundDecimalNumber(
          Number(configGoldPerGram.dataValues.config_value) /
          Number(config.dataValues.config_value),
          RATE_PRICE_DECIMAL_POINT
        ),
        formula: config.dataValues.formula,
      });
    } else if (
      config.dataValues.config_key ===
      SYSTEM_CONFIGURATIONS_KEYS.SILVER_PRICE_PER_GRAM
    ) {
      metalRateList.push({
        id_metal: config.dataValues.id_metal,
        rate: Number(config.dataValues.config_value),
        formula: config.dataValues.formula,
      });
    } else if (
      config.dataValues.config_key ===
      SYSTEM_CONFIGURATIONS_KEYS.PLATINUM_PRICE_PER_GRAM
    ) {
      metalRateList.push({
        id_metal: config.dataValues.id_metal,
        rate: Number(config.dataValues.config_value),
        formula: config.dataValues.formula,
      });
    }
  }

  return resSuccess({ data: metalRateList });
};

const validateProductFileReqData = async (
  idProduct: number,
  idMetalTone: NumberConstructor,
  idType: number,
  isImage: boolean,
  req: Request
) => {
  const productToBeUpdate = await Product.findOne({
    where: { id: idProduct, is_deleted: DeletedStatus.No, },
  });

  if (!(productToBeUpdate && productToBeUpdate.dataValues)) {
    return resNotFound({ message: PRODUCT_NOT_FOUND });
  }

  const toneToBeAdd = await MetalTone.findOne({
    where: { id: idMetalTone, is_deleted: DeletedStatus.No, },
  });

  if (!(toneToBeAdd && toneToBeAdd.dataValues)) {
    return resNotFound({ message: METAL_TONE_NOT_FOUND });
  }

  let findFileDetails;
  if (isImage) {
    findFileDetails = await ProductImage.findOne({
      where: {
        id_product: idProduct,
        id_metal_tone: idMetalTone,
        image_type: idType,
        is_deleted: DeletedStatus.No,
      },
    });
  } else {
    findFileDetails = await ProductVideo.findOne({
      where: {
        id_product: idProduct,
        id_metal_tone: idMetalTone,
        video_type: idType,
        is_deleted: DeletedStatus.No,
      },
    });
  }

  if (
    !(findFileDetails && findFileDetails.dataValues) &&
    toneToBeAdd.dataValues.is_active !== "1"
  ) {
    return resNotFound({ message: METAL_TONE_NOT_FOUND });
  }

  return resSuccess({ data: productToBeUpdate.dataValues.sku });
};

export const addProductImages = async (req:Request) => {
  try {
    const { id_product, image_type }:any = req.body;
    let sku;
    let id_metal_tone: any = req.body.id_metal_tone ?? null;
    // Convert 'null' or '' to real null for DB
    if (
      id_metal_tone === 'null' ||
      id_metal_tone === '' ||
      id_metal_tone == null ||
      id_metal_tone == undefined ||
      id_metal_tone === 'undefined'
    ) {
      id_metal_tone = null;
    } else {
      id_metal_tone = Number(id_metal_tone);
    }

    // const resVPFRD = await validateProductFileReqData(
    //   id_product,
    //   id_metal_tone,
    //   image_type,
    //   true
    // );
    // if (resVPFRD.code !== DEFAULT_STATUS_CODE_SUCCESS) {
    //   return resVPFRD;
    // }

    const productToBeUpdate = await Product.findOne({
      where: { id: id_product, is_deleted: DeletedStatus.No },
    });

    if (!(productToBeUpdate && productToBeUpdate.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    sku = productToBeUpdate.dataValues.sku;

    const trn = await dbContext.transaction();
    try {
      const imageFiles: Express.Multer.File[] = req.files as Express.Multer.File[];

      const imageIndices = Object.keys(req.body)
        .filter((key) => key.startsWith('images[') && key.endsWith('].type'))
        .map((key) => parseInt(key.match(/\d+/)?.[0] || '0', 10))
        .filter((val) => !isNaN(val));
      
        console.log("imageIndices", req.body.images)

        // console.log(imageIndices,"imageIndices"); return;
      if(id_metal_tone){
          const existingVideo = await ProductImage.findOne({
          where: {
            id_product,
            image_type: IMAGE_UPLOAD_TYPE.Featured_images,
            id_metal_tone: id_metal_tone,
            is_deleted: DeletedStatus.No,
          },
          transaction:trn
        });

        // Check if featured image is being uploaded in current request
        const hasFeaturedImageInRequest = imageIndices.some(i => {
          const imageType = req.body[`images[${i}].type`];
          return Number(imageType) === Number(IMAGE_UPLOAD_TYPE.Featured_images);
        });
      
        // Validate that at least one featured image exists or is being uploaded
        if (!existingVideo && !hasFeaturedImageInRequest) {
          await trn.rollback();
          return resBadRequest({
            message: PRODUCT_IMAGE_REQUIRES,
          });
        }
      }

      for (const i of imageIndices) {
        const imageType = req.body[`images[${i}].type`];
        const files = imageFiles.filter(
          (file) => file.fieldname === `images[${i}].image`
        );

        if (!imageType || files.length === 0) {
          console.warn(`Skipping index ${i} due to missing type or files`);
          continue;
        }

        for (const file of files) {

            if (imageType == IMAGE_UPLOAD_TYPE.Glb_upload || imageType == IMAGE_UPLOAD_TYPE.Video_upload) {
              const existingVideo = await ProductImage.findOne({
                where: {
                  id_product,
                  image_type: imageType,
                  id_metal_tone: id_metal_tone ? id_metal_tone : null,
                  is_deleted: DeletedStatus.No,
                },
                transaction:trn
              });
              const label:any = IMAGE_TYPE_LABELS[imageType as IMAGE_UPLOAD_TYPE] || `Type ${imageType}`;
              if (existingVideo) {
                await trn.rollback();
                return resBadRequest({
                  message: prepareMessageFromParams(ALREDY_EXIST,[['field',`${label}`]] ),
                });
              }
            }

          let resMFTL = null
          if (imageType == IMAGE_UPLOAD_TYPE.Meta_image) {
              resMFTL = await moveOriginalFileToS3ByTypeAndLocation(
              file,
              `${PRODUCT_FILE_LOCATION}/${sku}`,
              null
            );
          } else {
             resMFTL = await moveFileToS3ByTypeAndLocation(
              file,
              `${PRODUCT_FILE_LOCATION}/${sku}`,
            );
            }
            
            
            if (resMFTL.code !== DEFAULT_STATUS_CODE_SUCCESS) {
              await trn.rollback();
              return resMFTL;
            }

            await ProductImage.create(
              {
                id_product: id_product,
                id_metal_tone: id_metal_tone ? id_metal_tone : null,
                image_path: resMFTL.data,
                image_type: imageType,
                created_by: req.body.session_res.id_app_user,
                created_date: getLocalDate(),
              },
              { transaction: trn }
            );
          
        }
      }

      await trn.commit();
      // await refreshMaterializedProductListViewdbContext;
      return resSuccess();
    } catch (e) {
      console.error(e);
      await trn.rollback();
      return resUnknownError({ data: e });
    }
  } catch (e) {
    return resUnknownError({ data: e });
  }
}
export const addProductVideos = async (req: Request) => {
  try {
    const { id_product, id_metal_tone, video_type } = req.body;
    let sku;

    const resVPFRD = await validateProductFileReqData(
      id_product,
      id_metal_tone,
      video_type,
      false,
      null
    );
    if (resVPFRD.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return resVPFRD;
    }
    sku = resVPFRD.data;

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    if (!files.videos) {
      return resNotFound({ message: VIDEOS_NOT_FOUND });
    }

    const trn = await dbContext.transaction();
    try {
      let videoFile;
      for (videoFile of files.videos) {
        const resMFTL = await moveFileToLocation(
          videoFile.filename,
          videoFile.destination,
          `public/${PRODUCT_FILE_LOCATION}/${sku}`,
          videoFile.fileAddAndEditInDBAndS3ForOriginalFileName
        );
        if (resMFTL.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return resMFTL;
        }

        await ProductVideo.create(
          {
            id_product: id_product,
            id_metal_tone: id_metal_tone,
            video_path: `${PRODUCT_FILE_LOCATION}/${sku}/${videoFile.originalname}`,
            video_type: video_type,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
          },
          { transaction: trn }
        );
      }
      await trn.commit();
      // await refreshMaterializedProductListViewdbContext;
      return resSuccess();
    } catch (e) {
      await trn.rollback();
      return resUnknownError({ data: e });
    }
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

export const deleteProductImages = async (req: Request) => {
  try {
    const { id, id_metal_tone, id_product, image_type } = req.body;
    const idAppUser = req.body.session_res.id_app_user;

    if (id) {
      const findImage = await ProductImage.findOne({
        where: { id, id_product, is_deleted: DeletedStatus.No },
      });
      if (!(findImage && findImage.dataValues)) {
        return resNotFound({ message: IMAGE_NOT_FOUND });
      }
      await ProductImage.update(
        {
          is_deleted: DeletedStatus.yes,
          modified_by: idAppUser,
          modified_date: getLocalDate(),
        },
        { where: { id, id_product, is_deleted: DeletedStatus.No } }
      );
    } else if (id_metal_tone) {
      if (image_type) {
        await ProductImage.update(
          {
            is_deleted: DeletedStatus.yes,
            modified_by: idAppUser,
            modified_date: getLocalDate(),
          },
          { where: { id_product, id_metal_tone, is_deleted: DeletedStatus.No, image_type } }
        );
      } else {
        await ProductImage.update(
          {
            is_deleted: DeletedStatus.yes,
            modified_by: idAppUser,
            modified_date: getLocalDate(),
          },
          { where: { id_product, id_metal_tone, is_deleted: DeletedStatus.No } }
        );
      }
    }
    // await refreshMaterializedProductListViewdbContext;
    return resSuccess();
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

export const deleteProductVideos = async (req: Request) => {
  try {
    const { id, id_metal_tone, id_product, video_type } = req.body;
    const idAppUser = req.body.session_res.id_app_user;

    if (id) {
      const findVideo = await ProductVideo.findOne({
        where: { id, id_product, is_deleted: DeletedStatus.No },
      });
      if (!(findVideo && findVideo.dataValues)) {
        return resNotFound({ message: VIDEO_NOT_FOUND });
      }
      await ProductVideo.update(
        {
          is_deleted: DeletedStatus.yes,
          modified_by: idAppUser,
          modified_date: getLocalDate(),
        },
        { where: { id, id_product, is_deleted: DeletedStatus.No } }
      );
    } else if (id_metal_tone) {
      if (video_type) {
        await ProductVideo.update(
          {
            is_deleted: DeletedStatus.yes,
            modified_by: idAppUser,
            modified_date: getLocalDate(),
          },
          { where: { id_product, id_metal_tone, is_deleted: DeletedStatus.No, video_type } }
        );
      } else {
        await ProductVideo.update(
          {
            is_deleted: DeletedStatus.yes,
            modified_by: idAppUser,
            modified_date: getLocalDate(),
          },
          { where: { id_product, id_metal_tone, is_deleted: DeletedStatus.No,  } }
        );
      }
    }
    // await refreshMaterializedProductListViewdbContext;
    return resSuccess();
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

export const productMetalToneList = async (req: Request) => {
  try {
    
    const products = await Product.findOne({
      where: { id: req.body.product_id, is_deleted: DeletedStatus.No, },
      attributes: ["id", "name", "sku", "product_type"],
      include: [
        {
          required: false,
          model: ProductMetalOption,
          as: "PMO",
          attributes: [
            "id",
            "id_metal_group",
            "metal_weight",
            "id_m_tone",
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
          where: { is_deleted: DeletedStatus.No, },
        },

        {
          required: false,
          model: ProductCategory,
          as: "product_categories",
          attributes: [
            "id",
            "id_category",
            "id_sub_category",
            "id_sub_sub_category",
          ],
          where: { is_deleted: DeletedStatus.No, },
        },
      ],
    });

    if (!(products && products.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    let metalTones = [];
    if (products.dataValues.product_type == SingleProductType.DynemicPrice) {
      let metalGroup = products.dataValues.PMO.flat().map(
        (value: any) => value.dataValues.metalTone
      );
      metalTones = metalGroup.flat().map((value: any) => value);
    } else {
      metalTones = products.dataValues.PMO.map(
        (value: any) => value.dataValues.id_m_tone
      );
    }

    const findMetalTone = await MetalTone.findAll({
      where: { id: metalTones, },
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "metal_tone_image", attributes: [],required:false }],
    });

    return resSuccess({ data: findMetalTone });
  } catch (error) {
    throw error;
  }
};
const productTypeMetalArrayCreate = async (productList: any) => {
  for (let index = 0; index < productList.length; index++) {
    const element: any = productList[index];
    if (element.product_type === 2) {
      if (element?.pmo && element?.pmo.length > 0) {
        element.pmo.sort((a: any, b: any) => {
          if (a.gold_karat === null && b.gold_karat === null) return 0;
          if (a.gold_karat === null) return 1;
          if (b.gold_karat === null) return -1;

          // First, compare gold_karat
          if (a.gold_karat !== b.gold_karat) {
            return a.gold_karat - b.gold_karat;
          }

          // If gold_karat is the same, compare id_m_tone
          if (a.id_m_tone === null && b.id_m_tone === null) return 0;
          if (a.id_m_tone === null) return 1;
          if (b.id_m_tone === null) return -1;
          return a.id_m_tone - b.id_m_tone;
        });
        for (let metalData of element.pmo) {
          if (metalData.id_metal === 1) {
            const filter = element?.pmo.filter(
              (t: any) => t.id_karat === metalData.id_karat
            );
            const uniqueArray = [
              ...new Set(filter.map((t: any) => t.id_m_tone)),
            ];
            metalData.metal_tone = uniqueArray;
          }
        }
      }
    }
  }
};
const processProductList = async (productList) => {
  let productListData = productList;
  productListData.forEach((product) => {
    if (product.product_type === 2 || product.product_type === 3) {
      const productPmo = [];

      product.pmo.forEach((item: any) => {
        const findSameItem = product.pmo.filter(
          (t) => t.id_karat == item.id_karat && t.id_metal == item.id_metal
        );

        productPmo.push({
          ...item,
          metal_tone: findSameItem?.map((t) => t.id_m_tone),
        });
      });
      return (product.pmo = productPmo);
    }
  });

  return productListData;
};

export const productListUserSide = async (req: any) => {
  try {
    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };

    pagination.per_page_rows =
      Number(req.query.per_page_rows) || PRODUCT_PER_PAGE_ROW;
    let category = "0";
    let filterCategory = "0";
    let searchValue: any;
    if (!req.query.setting_type && req.query.setting_type == undefined) {
      req.query.setting_type = "0";
    }

    if (!req.query.gender && req.query.gender == undefined) {
      req.query.gender = "0";
    }

    if (!req.query.collection && req.query.collection == undefined) {
      req.query.collection = "0";
    }

    if (!req.query.metal_id && req.query.metal_id == undefined) {
      req.query.metal_id = "0";
    }

    if (!req.query.metal_tone && req.query.metal_tone == undefined) {
      req.query.metal_tone = "0";
    }

    if (!req.query.diamond_shape && req.query.diamond_shape == undefined) {
      req.query.diamond_shape = "0";
    }

    if (!req.query.center_diamond_shape && req.query.center_diamond_shape == undefined) {
      req.query.center_diamond_shape = "0";
    }

    if (!req.query.diamond_color && req.query.diamond_color == undefined) {
      req.query.diamond_color = "0";
    }
    if (!req.query.cuts && req.query.cuts == undefined) {
      req.query.cuts = "0";
    }
    if (!req.query.diamond_clarity && req.query.diamond_clarity == undefined) {
      req.query.diamond_clarity = "0";
    }
    if (!req.query.brand && req.query.brand == undefined) {
      req.query.brand = "0";
    }
    if (
      !req.query.product_category &&
      req.query.product_category == undefined
    ) {
      req.query.product_category = "0";
    }

    if (!req.query.search_text && req.query.search_text == undefined) {
      req.query.search_text = "0";
    } else {
      searchValue = req.query.search_text
        .toString()
        .split(" ")
        .map((word) => `${word}:*`)
        .join(" | ");
    }
    if (
      req.query.product_category &&
      req.query.product_category != undefined &&
      req.query.product_category != "0"
    ) {
      let categoryName: any = req.query.product_category;
      filterCategory = categoryName
        .toString()
        .toLowerCase()
        .split(",")
        .map((item: any) => `'${item}'`)
        .join(",");
    }

    if (
      !req.query.min_price &&
      !req.query.max_price &&
      req.query.min_price == undefined &&
      req.query.max_price == undefined
    ) {
      req.query.min_price = "0";
      req.query.max_price = "0";
    }

    if (
      !req.query.min_price &&
      req.query.min_price == undefined &&
      req.query.max_price &&
      req.query.max_price != undefined
    ) {
      req.query.min_price = "0";
    }
    if (
      req.query.min_price &&
      req.query.min_price !== undefined &&
      !req.query.max_price &&
      req.query.max_price === undefined
    ) {
      req.query.max_price = "0";
    }
    req.query.is_choose_setting = req.query.is_choose_setting || "0";
    req.query.is_3d_product = req.query.is_3d_product && req.query.is_3d_product == "1" ? "1" : "0";


    if (req.query.collection != "0") {
      let collectionId = []

      for (let value of req.query.collection.split(",")) {
        const findCollection = await Collection.findOne({
          where: {
            slug: { [Op.iLike]: `%${value}%` },
            is_deleted: DeletedStatus.No,
          },
        });
        if (findCollection && findCollection.dataValues) {
          collectionId.push(findCollection.dataValues.id);
        }
      }

      req.query.collection =  collectionId
    }
    if (req.query.brand != "0") {
      const brandId = []
      for(const value of req.query.brand.split(",")){
        const findBrand = await BrandData.findOne({
          where: {
            slug: { [Op.iLike]: `%${req.query.brand}%` },
            is_deleted: DeletedStatus.No,
          },
        });
        if (findBrand && findBrand.dataValues) {
          brandId.push(findBrand.dataValues.id);
        } else {
          req.query.brand = "0";
        }
        req.query.brand = brandId
      }
      
    }
    if (req.query.product_category == "0" && req.query.search_text == "0") {
      category = "watch";
    }

    const productTotalCount = await dbContext.query(`WITH filtered_pmo AS (
         SELECT DISTINCT ON (pmo.id_product) pmo.id,
            pmo.id_product,
            pmo.metal_weight,
            pmo.is_default,
            pmo.id_metal,
            pmo.id_karat,
            pmo.id_metal_tone,
            pmo.retail_price,
            pmo.compare_price,
            pmo.id_size,
            pmo.id_length,
            pmo.quantity,
            pmo.side_dia_weight,
            pmo.side_dia_count,
            pmo.remaing_quantity_count,
            pmo.center_diamond_price,
            karats.name,
			id_m_tone, 
            karats.calculate_rate AS karat_calculate_rate,
           FROM product_metal_options pmo
             LEFT JOIN gold_kts karats ON karats.id = pmo.id_karat AND karats.is_deleted = '0'::"bit" AND karats.is_active = '1'::"bit"
          WHERE pmo.is_deleted = '0'::"bit"
          ORDER BY pmo.id_product, karats.name
        ), without_center_diamond_price AS (
         SELECT pdo_1.id_product,
            sum(
                CASE WHEN pdo_1.id_type = 2 THEN CASE
                    WHEN dgm_1.rate IS NOT NULL AND dgm_1.rate <> 0::double precision THEN dgm_1.rate
                    ELSE dgm_1.synthetic_rate
                END * pdo_1.weight::double precision * pdo_1.count::double precision ELSE 0 END) AS without_center_diamond_price,
			sum(
                CASE
                    WHEN dgm_1.rate IS NOT NULL AND dgm_1.rate <> 0::double precision THEN dgm_1.rate
                    ELSE dgm_1.synthetic_rate
                END * pdo_1.weight::double precision * pdo_1.count::double precision) AS with_center_diamond_price
           FROM product_diamond_options pdo_1
             LEFT JOIN diamond_group_masters dgm_1 ON dgm_1.id = pdo_1.id_diamond_group
          WHERE pdo_1.is_deleted = '0'::"bit"  AND pdo_1.is_band IS FALSE
          GROUP BY pdo_1.id_product
        )
 SELECT products.id
   FROM products
     LEFT JOIN product_categories ON product_categories.id_product = products.id AND product_categories.is_deleted = '0'::"bit"
     LEFT JOIN categories ON categories.id = product_categories.id_category
     LEFT JOIN categories sub_categories ON sub_categories.id = product_categories.id_sub_category
     LEFT JOIN categories sub_sub_categories ON sub_sub_categories.id = product_categories.id_sub_sub_category
     LEFT JOIN filtered_pmo ON filtered_pmo.id_product = products.id
     LEFT JOIN metal_masters metal_master ON metal_master.id = filtered_pmo.id_metal AND metal_master.is_deleted = '0'::"bit"
     LEFT JOIN product_diamond_options pdo ON pdo.id_product = products.id AND pdo.is_deleted = '0'::"bit"
     LEFT JOIN diamond_group_masters dgm ON dgm.id = pdo.id_diamond_group AND dgm.is_deleted = '0'::"bit"
     LEFT JOIN without_center_diamond_price ON without_center_diamond_price.id_product = products.id
  WHERE products.is_deleted = '0'::"bit" AND products.is_active = '1'::"bit"
 AND products.parent_id IS NULL
  AND CASE
        		WHEN '${req.query.setting_type}' = '0' THEN TRUE
        		ELSE string_to_array(setting_style_type, '|')::int[] && ARRAY[${req.query.setting_type
      }]
        	END
  AND CASE WHEN '${req.query.gender
      }' = '0' THEN true ELSE string_to_array(gender, '|')::int[] && ARRAY[${req.query.gender
      }] END
  ${
        req.query.is_choose_setting == "1" ? `AND products.is_choose_setting = '1'` : '' 
      }
  AND CASE
        		WHEN '${req.query.collection}' = '0' THEN TRUE
        		ELSE string_to_array(id_collection, '|')::int[] && ARRAY[${req.query.collection != "0" ? req.query.collection.join(",") : req.query.collection
      }] END
          AND CASE WHEN '${req.query.brand
      }' = '0' THEN true ELSE id_brand IN (${req.query.brand}) END
          AND CASE
        		WHEN '${req.query.search_text}' = '0' THEN TRUE
        		ELSE 
        	  ( products.name ILIKE '%' || :searchValue || '%'
              OR products.sku ILIKE '%' || :searchValue || '%'
            )
        	END
      AND CASE
        WHEN '${req.query.metal_id}' = '0' THEN TRUE
        ELSE filtered_pmo.id_metal::text = ANY (string_to_array('${req.query.metal_id
      }', ','))
        END
        AND  CASE WHEN '${req.query.metal_tone
      }' = '0' THEN true ELSE CASE WHEN product_type=${SingleProductType.DynemicPrice
      } OR product_type=${SingleProductType.cataLogueProduct} THEN 
      string_to_array(filtered_pmo.id_metal_tone, '|')::int[] && ARRAY[${req.query.metal_tone
      }]
       ELSE string_to_array(filtered_pmo.id_metal_tone, '|')::int[] && ARRAY[${req.query.metal_tone
      }] END END
      AND CASE WHEN '${req.query.diamond_shape
      }' = '0' THEN true ELSE CASE WHEN '${req.query.is_choose_setting
      }' = '1' THEN dgm.id_shape IN (${req.query.diamond_shape
      }) OR string_to_array(setting_diamond_shapes, '|')::int[] && ARRAY[${req.query.diamond_shape
      }] 
       else 
             dgm.id_shape IN (${req.query.diamond_shape}) END END

     ${req.query.center_diamond_shape == "0" ? `` :
      `${req.query.is_choose_setting == "1" ? `AND (dgm.id_shape IN (${req.query.center_diamond_shape}) OR string_to_array(setting_diamond_shapes, '|')::int[] && ARRAY[${req.query.center_diamond_shape
      }]) and pdo.id_type = 1` : `AND dgm.id_shape IN (${req.query.center_diamond_shape}) and pdo.id_type = 1`
      }`
      } 
      AND CASE WHEN '${req.query.diamond_color
      }' = '0' THEN true ELSE dgm.id_color IN (${req.query.diamond_color
      }) END
      AND CASE WHEN '${req.query.diamond_clarity
      }' = '0' THEN true ELSE dgm.id_clarity IN (${req.query.diamond_clarity
      }) END
            AND CASE WHEN '${req.query.cuts
      }' = '0' THEN true ELSE dgm.id_cuts IN (${req.query.cuts
      })
      END
      AND CASE WHEN '${req.query.product_category
      }' = '0' THEN true ELSE  lower(categories.slug) IN (${filterCategory == "0"
        ? `'${filterCategory.toLocaleLowerCase()}'`
        : filterCategory.toLocaleLowerCase()
      }) OR lower(sub_categories.slug) IN (${filterCategory == "0"
        ? `'${filterCategory.toLocaleLowerCase()}'`
        : filterCategory.toLocaleLowerCase()
      }) OR lower(sub_sub_categories.slug) IN (${filterCategory == "0"
        ? `'${filterCategory.toLocaleLowerCase()}'`
        : filterCategory.toLocaleLowerCase()
      }) 
      END
        AND CASE
          WHEN '${category}' = '0' THEN TRUE
          ELSE lower(categories.slug) != 'watch'
      END
      ${req.query.is_3d_product == "1" ? `AND products.is_3d_product IS TRUE` : `AND products.is_3d_product IS FALSE`}
      AND CASE
        		WHEN '${req.query.min_price}' = '0' AND '${req.query.max_price
      }' = '0' THEN TRUE
            ELSE CASE
            WHEN products.product_type = 2 THEN products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.retail_price
            ELSE
            CASE
                WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
                ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
            END
        END  ${req.query.min_price == "0" && req.query.max_price != "0"
        ? `<= ${req.query.max_price}`
        : req.query.min_price != "0" && req.query.max_price == "0"
          ? `>= ${req.query.min_price}`
          : `BETWEEN ${req.query.min_price ? req.query.min_price : 0
          } AND ${req.query.max_price}`
      }
             END
            ${req.query.min_dia_wt && req.query.max_dia_wt
        ? `AND pdo.weight * pdo.count
             BETWEEN ${Number(
          req.query.min_dia_wt
        )} AND ${Number(req.query.max_dia_wt)} AND pdo.id_type::numeric = 1`
        : ""
      }
  GROUP BY products.id` , {type: QueryTypes.SELECT, replacements: { searchValue: req.query.search_text }})
   
    pagination.total_items = productTotalCount.length;
    pagination.total_pages = Math.ceil(
      productTotalCount.length / pagination.per_page_rows
    );



   const productList = await dbContext.query(`WITH filtered_pmo AS (
         SELECT DISTINCT ON (pmo.id_product) pmo.id,
            pmo.id_product,
            pmo.metal_weight,
            pmo.is_default,
            pmo.id_metal,
            pmo.id_karat,
            pmo.id_metal_tone,
            pmo.retail_price,
            pmo.compare_price,
            pmo.id_size,
            pmo.id_length,
            pmo.quantity,
            pmo.side_dia_weight,
            pmo.side_dia_count,
            pmo.remaing_quantity_count,
            pmo.center_diamond_price,
            karats.name,
			id_m_tone, 
            karats.calculate_rate AS karat_calculate_rate,
           FROM product_metal_options pmo
             LEFT JOIN gold_kts karats ON karats.id = pmo.id_karat AND karats.is_deleted = '0'::"bit" AND karats.is_active = '1'::"bit"
          WHERE pmo.is_deleted = '0'::"bit"
          ORDER BY pmo.id_product, karats.name
        ), without_center_diamond_price AS (
         SELECT pdo_1.id_product,
            sum(
                CASE WHEN pdo_1.id_type = 2 THEN CASE
                    WHEN dgm_1.rate IS NOT NULL AND dgm_1.rate <> 0::double precision THEN dgm_1.rate
                    ELSE dgm_1.synthetic_rate
                END * pdo_1.weight::double precision * pdo_1.count::double precision ELSE 0 END) AS without_center_diamond_price,
			sum(
                CASE
                    WHEN dgm_1.rate IS NOT NULL AND dgm_1.rate <> 0::double precision THEN dgm_1.rate
                    ELSE dgm_1.synthetic_rate
                END * pdo_1.weight::double precision * pdo_1.count::double precision) AS with_center_diamond_price
           FROM product_diamond_options pdo_1
             LEFT JOIN diamond_group_masters dgm_1 ON dgm_1.id = pdo_1.id_diamond_group
          WHERE pdo_1.is_deleted = '0'::"bit"  AND pdo_1.is_band IS FALSE
          GROUP BY pdo_1.id_product
        )
 SELECT products.id,
    products.name,
    products.sku,
    products.slug,
    products.product_type,
    products.meta_title,
    products.meta_description,
    products.meta_tag,
    
    jsonb_agg(DISTINCT jsonb_build_object('id', product_categories.id, 'id_category', product_categories.id_category, 'id_sub_category', product_categories.id_sub_category, 'id_sub_sub_category', product_categories.id_sub_sub_category, 'category_name', categories.slug, 'sub_category_name', sub_categories.slug, 'sub_sub_category', sub_sub_categories.slug)) AS product_categories,
    jsonb_agg(DISTINCT jsonb_build_object('id', product_images.id, 'image_path', product_images.image_path, 'id_metal_tone', product_images.id_metal_tone, 'image_type', product_images.image_type)) AS product_images,
	jsonb_agg(DISTINCT jsonb_build_object('id', filtered_pmo.id, 'id_metal', filtered_pmo.id_metal, 'id_karat', filtered_pmo.id_karat, 'id_size', filtered_pmo.id_size, 'id_length', filtered_pmo.id_length, 'id_m_tone', filtered_pmo.id_m_tone, 'quantity', filtered_pmo.remaing_quantity_count, 'wishlist_id', NULL::unknown, 'metal_tone',
        CASE
            WHEN filtered_pmo.id_metal_tone IS NULL OR TRIM(BOTH FROM filtered_pmo.id_metal_tone) = ''::text THEN '{}'::integer[]
            ELSE string_to_array(filtered_pmo.id_metal_tone::text, '|'::text)::integer[]
        END, 'gold_karat', filtered_pmo.name, 'catalogue_design_price', filtered_pmo.retail_price, 'Price',
        CASE
            WHEN products.product_type = 2 THEN products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.retail_price
            ELSE
            CASE
                WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
                ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
            END
        END, 'compare_price',
        CASE
            WHEN products.product_type = 2 THEN products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.compare_price
            ELSE
            CASE
                WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
                ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
            END
        END, 'choose_style_price',
        CASE
            WHEN products.product_type = 2 THEN products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.compare_price - filtered_pmo.center_diamond_price::double precision
            ELSE
            CASE
                WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.without_center_diamond_price, 0::double precision)
                ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.without_center_diamond_price, 0::double precision)
            END
        END)) AS pmo
   FROM products
   LEFT JOIN product_images ON product_images.id_product = products.id AND product_images.image_type IN (1,4)
     LEFT JOIN product_categories ON product_categories.id_product = products.id AND product_categories.is_deleted = '0'::"bit"
     LEFT JOIN categories ON categories.id = product_categories.id_category
     LEFT JOIN categories sub_categories ON sub_categories.id = product_categories.id_sub_category
     LEFT JOIN categories sub_sub_categories ON sub_sub_categories.id = product_categories.id_sub_sub_category
     LEFT JOIN filtered_pmo ON filtered_pmo.id_product = products.id
     LEFT JOIN metal_masters metal_master ON metal_master.id = filtered_pmo.id_metal AND metal_master.is_deleted = '0'::"bit"
     LEFT JOIN product_diamond_options pdo ON pdo.id_product = products.id AND pdo.is_deleted = '0'::"bit"
     LEFT JOIN diamond_group_masters dgm ON dgm.id = pdo.id_diamond_group AND dgm.is_deleted = '0'::"bit"
     LEFT JOIN without_center_diamond_price ON without_center_diamond_price.id_product = products.id
     ${pagination.sort_by === SORTING_OPTION.BestSeller ||
        pagination.sort_by === SORTING_OPTION.Popular
        ? `LEFT JOIN order_details as OD
					ON OD.product_id=products.id and OD.payment_status=${PaymentStatus.paid} 
          and ((OD.order_details_json->>'product_type')::int=${AllProductTypes.Product} 
          OR (od.order_details_json->>'product_type')::int=${AllProductTypes.SettingProduct}) `
        : ``
      }
  WHERE products.is_deleted = '0'::"bit" AND products.is_active = '1'::"bit"
 AND products.parent_id IS NULL
  AND CASE
        		WHEN '${req.query.setting_type}' = '0' THEN TRUE
        		ELSE string_to_array(setting_style_type, '|')::int[] && ARRAY[${req.query.setting_type
      }]
        	END
  AND CASE WHEN '${req.query.gender
      }' = '0' THEN true ELSE string_to_array(gender, '|')::int[] && ARRAY[${req.query.gender
      }] END
  ${
        req.query.is_choose_setting == "1" ? `AND products.is_choose_setting = '1'` : '' 
      }
  AND CASE
        		WHEN '${req.query.collection}' = '0' THEN TRUE
        		ELSE string_to_array(id_collection, '|')::int[] && ARRAY[${req.query.collection != "0" ? req.query.collection.join(",") : req.query.collection
      }] END
          AND CASE WHEN '${req.query.brand
      }' = '0' THEN true ELSE id_brand IN (${req.query.brand}) END
          AND CASE
        		WHEN '${req.query.search_text}' = '0' THEN TRUE
        		ELSE 
        	  ( products.name ILIKE '%' || :searchValue || '%'
              OR products.sku ILIKE '%' || :searchValue || '%'
            )
        	END
      AND CASE
        WHEN '${req.query.metal_id}' = '0' THEN TRUE
        ELSE filtered_pmo.id_metal::text = ANY (string_to_array('${req.query.metal_id
      }', ','))
        END
        AND  CASE WHEN '${req.query.metal_tone
      }' = '0' THEN true ELSE CASE WHEN product_type=${SingleProductType.DynemicPrice
      } OR product_type=${SingleProductType.cataLogueProduct} THEN 
      string_to_array(filtered_pmo.id_metal_tone, '|')::int[] && ARRAY[${req.query.metal_tone
      }]
       ELSE string_to_array(filtered_pmo.id_metal_tone, '|')::int[] && ARRAY[${req.query.metal_tone
      }] END END
      AND CASE WHEN '${req.query.diamond_shape
      }' = '0' THEN true ELSE CASE WHEN '${req.query.is_choose_setting
      }' = '1' THEN dgm.id_shape IN (${req.query.diamond_shape
      }) OR string_to_array(setting_diamond_shapes, '|')::int[] && ARRAY[${req.query.diamond_shape
      }] 
       else 
             dgm.id_shape IN (${req.query.diamond_shape}) END END

     ${req.query.center_diamond_shape == "0" ? `` :
      `${req.query.is_choose_setting == "1" ? `AND (dgm.id_shape IN (${req.query.center_diamond_shape}) OR string_to_array(setting_diamond_shapes, '|')::int[] && ARRAY[${req.query.center_diamond_shape
      }]) and pdo.id_type = 1` : `AND dgm.id_shape IN (${req.query.center_diamond_shape}) and pdo.id_type = 1`
      }`
      } 
      AND CASE WHEN '${req.query.diamond_color
      }' = '0' THEN true ELSE dgm.id_color IN (${req.query.diamond_color
      }) END
      AND CASE WHEN '${req.query.diamond_clarity
      }' = '0' THEN true ELSE dgm.id_clarity IN (${req.query.diamond_clarity
      }) END
            AND CASE WHEN '${req.query.cuts
      }' = '0' THEN true ELSE dgm.id_cuts IN (${req.query.cuts
      })
      END
      AND CASE WHEN '${req.query.product_category
      }' = '0' THEN true ELSE  lower(categories.slug) IN (${filterCategory == "0"
        ? `'${filterCategory.toLocaleLowerCase()}'`
        : filterCategory.toLocaleLowerCase()
      }) OR lower(sub_categories.slug) IN (${filterCategory == "0"
        ? `'${filterCategory.toLocaleLowerCase()}'`
        : filterCategory.toLocaleLowerCase()
      }) OR lower(sub_sub_categories.slug) IN (${filterCategory == "0"
        ? `'${filterCategory.toLocaleLowerCase()}'`
        : filterCategory.toLocaleLowerCase()
      }) 
      END
        AND CASE
          WHEN '${category}' = '0' THEN TRUE
          ELSE lower(categories.slug) != 'watch'
      END
      ${req.query.is_3d_product == "1" ? `AND products.is_3d_product IS TRUE` : `AND products.is_3d_product IS FALSE`}
      AND CASE
        		WHEN '${req.query.min_price}' = '0' AND '${req.query.max_price
      }' = '0' THEN TRUE
            ELSE CASE
            WHEN products.product_type = 2 THEN products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.retail_price
            ELSE
            CASE
                WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
                ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(without_center_diamond_price.with_center_diamond_price, 0::double precision)
            END
        END  ${req.query.min_price == "0" && req.query.max_price != "0"
        ? `<= ${req.query.max_price}`
        : req.query.min_price != "0" && req.query.max_price == "0"
          ? `>= ${req.query.min_price}`
          : `BETWEEN ${req.query.min_price ? req.query.min_price : 0
          } AND ${req.query.max_price}`
      }
             END
            ${req.query.min_dia_wt && req.query.max_dia_wt
        ? `AND pdo.weight * pdo.count
             BETWEEN ${Number(
          req.query.min_dia_wt
        )} AND ${Number(req.query.max_dia_wt)} AND pdo.id_type::numeric = 1`
        : ""
      }
  GROUP BY products.id ${pagination.sort_by === SORTING_OPTION.BestSeller
        ? `ORDER BY count(OD.*) DESC`
        : pagination.sort_by === SORTING_OPTION.Popular
          ? `ORDER BY COALESCE(COUNT(PR.rating), 0) DESC, count(OD.*) DESC`
          : pagination.sort_by === SORTING_OPTION.Newest
            ? "ORDER BY products.created_date DESC"
            : pagination.sort_by === SORTING_OPTION.Oldest
              ? "ORDER BY products.created_date ASC"
              : pagination.sort_by === SORTING_OPTION.PriceLowToHigh
                ? "ORDER BY (SELECT MIN((item->>'Price')::numeric) FROM  jsonb_array_elements(pmo) AS item) ASC"
                : pagination.sort_by === SORTING_OPTION.Favorite
                  ? "ORDER BY is_trending DESC"
                  : pagination.sort_by === SORTING_OPTION.PriceHighToLow
                    ? "ORDER BY (SELECT MIN((item->>'Price')::numeric) FROM jsonb_array_elements(pmo) AS item) DESC"
                    : "ORDER BY id DESC"
      }
      OFFSET
        ${(pagination.current_page - 1) * pagination.per_page_rows} ROWS
        FETCH NEXT ${pagination.per_page_rows} ROWS ONLY` , {type: QueryTypes.SELECT, replacements: { searchValue: req.query.search_text }})
    // Find all active product offers that are currently valid (by date and days)
    const findAllActiveProductOffers = await fetchActiveOffers(req)

    const productOffers = findAllActiveProductOffers.filter(
      (offer: any) => offer.offer_type === `${offerType.ProductType}`
    );

    const findRoundingValue = await dbContext.query(`
      SELECT * FROM price_corrections WHERE product_type In (:product_type)  AND is_active = :is_active
    `, { type: QueryTypes.SELECT,
      replacements: {
        product_type: [PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct, PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct],
        is_active: ActiveStatus.Active
      }
    });
    const dynamicProductRoundingValue: any = findRoundingValue.find((item: any) => item.product_type === PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct);
    const chooseSettingProductRoundingValue: any = findRoundingValue.find((item: any) => item.product_type === PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct);

    const productListWithCurrency: any = []
    for (const product of productList) {
      let data: any = product;
      let appliedOffers: any = [];
      let appliedChooseSettingOffers: any = [];
      let totalDiscount = 0;
      const applicableProductOffers: any = await getProductOffersForId(
        productOffers,
        data.id,
        data.pmo[0].Price,
        req?.body?.session_res?.id_app_user,
      );
      let bestProductOffer: any = null;
      let bestChooseSettingOffer: any = null;
      let bestProductDiscount = 0;
      let bestChooseSettingDiscount = 0;
      for (const offer of applicableProductOffers) {
        const discount = calculateDiscountAmount(offer, data.pmo[0].Price);
        const chooseSettingDiscount = calculateDiscountAmount(offer, data.pmo[0].choose_style_price);
        if (discount > Number(bestProductDiscount)) {
          bestProductDiscount = discount;
          bestProductOffer = offer;
        }
        if (chooseSettingDiscount > Number(bestChooseSettingDiscount)) {
          bestChooseSettingDiscount = chooseSettingDiscount;
          bestChooseSettingOffer = offer;
        }
      }
      if (bestProductOffer) {
        appliedOffers.push({
          ...bestProductOffer,
          discount: bestProductDiscount
        });
        totalDiscount = bestProductDiscount;
      }

      if (bestChooseSettingOffer) {
        appliedChooseSettingOffers.push({
          ...bestChooseSettingOffer,
          discount: bestChooseSettingDiscount
        });
      }
      const productType = data.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct : null

      const chooseSettingProductType = data.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct : null

      const productRoundValue = data.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? dynamicProductRoundingValue && dynamicProductRoundingValue.round_off ? {value: dynamicProductRoundingValue.round_off, flag: true} : {value: 0, flag: false} : {value: 0, flag: false}

      const chooseSettingProductRoundValue = data.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? chooseSettingProductRoundingValue && chooseSettingProductRoundingValue.round_off ? {value: chooseSettingProductRoundingValue.round_off, flag: true} : {value: 0, flag: false} : {value: 0, flag: false}

     await productListWithCurrency.push({
        ...data,
        product_offer_detail: appliedOffers[0] && appliedOffers[0]?.offer_id ? {
          offer_id: appliedOffers[0]?.offer_id,
          offer_name: appliedOffers[0]?.offer_name,
          discount_type: appliedOffers[0]?.discount_type,
          discount: bestProductDiscount,
          discount_value: appliedOffers[0]?.discount,
          maximum_discount_amount: appliedOffers[0]?.maximum_discount_amount,
          description: appliedOffers[0]?.description
        } : null,
        choose_setting_offer_detail: appliedChooseSettingOffers && appliedChooseSettingOffers[0] && appliedChooseSettingOffers[0]?.offer_id ? {
          offer_id: appliedChooseSettingOffers[0]?.offer_id,
          offer_name: appliedChooseSettingOffers[0]?.offer_name,
          discount_type: appliedChooseSettingOffers[0]?.discount_type,
          discount: bestChooseSettingDiscount,
          discount_value: appliedChooseSettingOffers[0]?.discount,
          maximum_discount_amount: appliedChooseSettingOffers[0]?.maximum_discount_amount,
          description: appliedChooseSettingOffers[0]?.description
        } : null,
        pmo: await Promise.all(await data.pmo.map(async(item: any) => {
          const value = {
            ...item,
            Price: await req.formatPrice(item.Price,productType,productRoundValue),
            compare_price: await req.formatPrice(item.compare_price,productType,productRoundValue),
            after_discount_price: await req.formatPrice(
              item.Price - (totalDiscount || 0), productType,productRoundValue),
            choose_style_price: await req.formatPrice(item.choose_style_price,chooseSettingProductType,chooseSettingProductRoundValue),
            after_choose_style_discount_price: await req.formatPrice(
              item.choose_style_price - (bestChooseSettingDiscount || 0), chooseSettingProductType,chooseSettingProductRoundValue),
            catalogue_design_price: await req.formatPrice(item.catalogue_design_price, null,{ value: 0, flag: false })
          };
          return await value;
        })),
      })
    }
    
    return resSuccess({
      data: { pagination, productList: productListWithCurrency },
    });
  } catch (error) {
    console.log("-------------------", error);
    throw error;
  }
};

export const productGetByIdUserSide = async (req: any) => {
  const { slug, user_id } = req.body;
  try {
    
    const products: any = await dbContext.query(
      `SELECT
	P.ID,
	P.NAME,
	P.SKU,
	P.SLUG,
	P.ADDITIONAL_DETAIL,
  P.certificate,
	P.SORT_DESCRIPTION,
	P.LONG_DESCRIPTION,
	P.GENDER,
	P.PRODUCT_TYPE,
	P.DISCOUNT_TYPE,
	P.DISCOUNT_VALUE,
  P.SHIPPING_DAY,
  P.IS_CUSTOMIZATION,
  P.PARENT_ID,
  P.META_TITLE,
  P.META_DESCRIPTION,
  P.META_TAG,
  P.IS_SINGLE,
  P.IS_3D_PRODUCT,
  P.IS_BAND,
  P.IS_CHOOSE_SETTING,
  P.META_TITLE,
  P.META_DESCRIPTION,
  P.META_TAG,
  P.head_no,
  P.shank_no,
  P.band_no,
  P.style_no,
  CASE WHEN P.setting_diamond_shapes IS NULL THEN '{}'::int[] ELSE string_to_array(P.setting_diamond_shapes, '|')::int[] END as setting_diamond_shapes,
CASE WHEN P.setting_diamond_sizes IS NULL THEN '{}'::int[] ELSE string_to_array(P.setting_diamond_sizes, '|')::int[] END as setting_diamond_sizes,
	SUM_PRICE.TOTAL_DIAMOND_WEIGHT AS TOTAL_DIAMOND_WEIGHT,
	(
		SELECT
			CASE
				WHEN COUNT(ORDERS.*) >= 1 THEN TRUE
				ELSE FALSE
			END
		FROM
			ORDER_DETAILS
			LEFT OUTER JOIN ORDERS ON ORDER_ID = ORDERS.ID
		WHERE
			PRODUCT_ID = P.ID
			AND USER_ID = ${user_id && user_id != undefined && user_id != null && user_id != "null"
        ? user_id
        : 0
      }
	) AS IS_ORDER_PRODUCT,
	(
		SELECT
			CASE
				WHEN COUNT(*) >= 1 THEN TRUE
				ELSE FALSE
			END
		FROM
			PRODUCT_REVIEWS
		WHERE
			PRODUCT_ID = P.ID
			AND REVIEWER_ID = ${user_id && user_id != undefined && user_id != null && user_id != "null"
        ? user_id
        : 0
      }
	) AS IS_ADDED_REVIEW,
	COALESCE(AVG(PR.RATING), 0) AS RATING,
	COUNT(DISTINCT REVIEWER_ID) AS RATING_USER_COUNT,
	CASE
		WHEN P.TAG IS NULL THEN '{}'::INT[]
		ELSE STRING_TO_ARRAY(P.TAG, '|')::INT[]
	END AS TAG,
	CASE
		WHEN P.SIZE IS NULL THEN '{}'::INT[]
		ELSE STRING_TO_ARRAY(P.SIZE, '|')::INT[]
	END AS SIZE,
	CASE
		WHEN P.LENGTH IS NULL THEN '{}'::INT[]
		ELSE STRING_TO_ARRAY(P.LENGTH, '|')::INT[]
	END AS LENGTH,
	CASE
		WHEN P.SETTING_DIAMOND_SHAPES IS NULL THEN '{}'::INT[]
		ELSE STRING_TO_ARRAY(P.SETTING_DIAMOND_SHAPES, '|')::INT[]
	END AS SETTING_DIAMOND_SHAPES,
	JSONB_AGG(
		DISTINCT JSONB_BUILD_OBJECT(
			'id',
			PCO.ID,
			'id_category',
			PCO.ID_CATEGORY,
			'id_sub_category',
			PCO.ID_SUB_CATEGORY,
			'id_sub_sub_category',
			PCO.ID_SUB_SUB_CATEGORY,
			'category_name',
			CATEGORIES.CATEGORY_NAME,
			'sub_category_name',
			SUB_CAT.CATEGORY_NAME,
			'sub_sub_category_name',
			SUB_SUB_CAT.CATEGORY_NAME
		)
	) AS PRODUCT_CATEGORIES,
	JSONB_AGG(
		DISTINCT JSONB_BUILD_OBJECT(
			'id',
			P_IMG.ID,
			'image_path',
			P_IMG.IMAGE_PATH,
			'id_metal_tone',
			P_IMG.ID_METAL_TONE,
			'image_type',
			P_IMG.IMAGE_TYPE,
			'metal_tone_sort_code',
			METAL_TONES.SORT_CODE
		)
	) AS PRODUCT_IMAGES,
	JSONB_AGG(
		DISTINCT JSONB_BUILD_OBJECT(
			'id',
			PMO.ID,
			'id_metal',
			PMO.ID_METAL,
			'metal_weight',
			PMO.METAL_WEIGHT,
      'band_metal_weight',
      PMO.BAND_METAL_WEIGHT,
			'id_size',
			PMO.ID_SIZE,
			'id_length',
			PMO.ID_LENGTH,
			'id_m_tone',
			PMO.ID_M_TONE,
			'side_dia_weight',
			PMO.SIDE_DIA_WEIGHT,
			'side_dia_count',
			PMO.SIDE_DIA_COUNT,
			'quantity',
			PMO.REMAING_QUANTITY_COUNT,
			'metal_tone',
			CASE
				WHEN PMO.ID_METAL_TONE IS NULL OR TRIM(PMO.ID_METAL_TONE) = '' THEN '{}'::INT[] 
				ELSE STRING_TO_ARRAY(PMO.ID_METAL_TONE, '|')::INT[]
			END,
			'catalogue_design_price',
			CASE
				WHEN P.PRODUCT_TYPE = ${SingleProductType.cataLogueProduct
      } THEN (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE +PMO.RETAIL_PRICE)
				ELSE 0
			END,
      'wishlist_id',
      null,
			'Price',
			CASE
				WHEN P.PRODUCT_TYPE = ${SingleProductType.VariantType} THEN  (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + PMO.RETAIL_PRICE)
				ELSE CASE
					WHEN PMO.ID_KARAT IS NULL THEN (
						METAL_MASTERS.METAL_RATE * PMO.METAL_WEIGHT + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SUM_PRICE, 0)
					)
					ELSE (
						METAL_MASTERS.METAL_RATE / METAL_MASTERS.CALCULATE_RATE * GOLD_KTS.calculate_rate * PMO.METAL_WEIGHT + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SUM_PRICE, 0)
					)
				END
			END,
      'choose_setting_price_with_band',
			CASE
				WHEN P.PRODUCT_TYPE = ${SingleProductType.VariantType} THEN  (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + PMO.RETAIL_PRICE + PMO.BAND_METAL_PRICE) - PMO.CENTER_DIAMOND_PRICE
				ELSE CASE
					WHEN PMO.ID_KARAT IS NULL THEN (
						METAL_MASTERS.METAL_RATE * (PMO.METAL_WEIGHT + COALESCE(PMO.BAND_METAL_WEIGHT,0)) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITH_BAND, 0)
					)
					ELSE (
						METAL_MASTERS.METAL_RATE / METAL_MASTERS.CALCULATE_RATE * GOLD_KTS.calculate_rate * (PMO.METAL_WEIGHT + COALESCE(PMO.BAND_METAL_WEIGHT,0)) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITH_BAND, 0)
					)
				END
			END,
      'choose_setting_price_without_band',
			CASE
				WHEN P.PRODUCT_TYPE = ${SingleProductType.VariantType} THEN  (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + PMO.RETAIL_PRICE) - PMO.CENTER_DIAMOND_PRICE
				ELSE CASE
					WHEN PMO.ID_KARAT IS NULL THEN (
						METAL_MASTERS.METAL_RATE * (PMO.METAL_WEIGHT) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITHOUT_BAND, 0)
					)
					ELSE (
						METAL_MASTERS.METAL_RATE / METAL_MASTERS.CALCULATE_RATE * GOLD_KTS.calculate_rate * (PMO.METAL_WEIGHT) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITHOUT_BAND, 0)
					)
				END
			END,
			'id_karat',
			PMO.ID_KARAT,
      'remaining_quantity_count',
      remaing_quantity_count,
      'delivery_date',
      CASE WHEN PMO.remaing_quantity_count IS NOT NULL AND remaing_quantity_count > 0 THEN CURRENT_DATE + INTERVAL '${IN_STOCK_PRODUCT_DELIVERY_TIME} days' 
          ELSE CURRENT_DATE + INTERVAL '${OUT_OF_STOCK_PRODUCT_DELIVERY_TIME} days' END,
      'delivery_days',
      CASE WHEN PMO.remaing_quantity_count IS NOT NULL AND remaing_quantity_count > 0 THEN  '${IN_STOCK_PRODUCT_DELIVERY_TIME} days' 
          ELSE '${OUT_OF_STOCK_PRODUCT_DELIVERY_TIME} days' END 
      
		)
	) AS "PMO",
	JSONB_AGG(
		DISTINCT JSONB_BUILD_OBJECT(
			'id',
			PDO.ID,
			'id_diamond_group',
			PDO.ID_DIAMOND_GROUP,
			'weight',
			PDO.WEIGHT,
			'count',
			PDO.COUNT,
			'id_type',
			PDO.ID_TYPE,
			'diamond_shape',
			DS.NAME,
			'stone',
			GS.NAME,
      'stone_type',
      GS.IS_DIAMOND,
			'mm_size',
			MS.VALUE,
			'diamond_color',
			C.NAME,
			'diamond_clarity',
			CL.NAME,
			'diamond_cut',
			CT.VALUE,
      'total_diamond_weight',
      PDO.WEIGHT*PDO.COUNT
		)
	) AS "PDO"
FROM
	PRODUCTS AS P
	LEFT JOIN PRODUCT_REVIEWS AS PR ON PR.PRODUCT_ID = P.ID
	AND IS_APPROVED = '${ActiveStatus.Active}'
	LEFT JOIN PRODUCT_CATEGORIES AS PCO ON PCO.ID_PRODUCT = P.ID
	AND PCO.IS_DELETED = '${DeletedStatus.No}'
	INNER JOIN CATEGORIES ON CATEGORIES.ID = PCO.ID_CATEGORY
	LEFT JOIN CATEGORIES SUB_CAT ON SUB_CAT.ID = PCO.ID_SUB_CATEGORY
	LEFT JOIN CATEGORIES SUB_SUB_CAT ON SUB_SUB_CAT.ID = PCO.ID_SUB_SUB_CATEGORY
	LEFT JOIN PRODUCT_IMAGES P_IMG ON P_IMG.ID_PRODUCT = P.ID
	AND P_IMG.IS_DELETED = '${DeletedStatus.No}'
	LEFT JOIN METAL_TONES ON METAL_TONES.ID = P_IMG.ID_METAL_TONE
	INNER JOIN PRODUCT_METAL_OPTIONS AS PMO ON PMO.ID_PRODUCT = P.ID AND PMO.IS_DELETED = '${DeletedStatus.No
      }'
	LEFT JOIN METAL_MASTERS ON METAL_MASTERS.ID = PMO.ID_METAL
	LEFT JOIN GOLD_KTS ON GOLD_KTS.ID = PMO.ID_KARAT
	LEFT JOIN PRODUCT_DIAMOND_OPTIONS AS PDO ON PDO.ID_PRODUCT = P.ID AND PDO.IS_DELETED = '${DeletedStatus.No}'
	LEFT JOIN (
		SELECT
			PDO.ID_PRODUCT AS ID_PRODUCT,
			SUM(
				CASE WHEN PDO.IS_BAND IS FALSE OR PDO.IS_BAND IS NULL THEN (PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT) ELSE 0 END
			) AS TOTAL_DIAMOND_WEIGHT,
			SUM(
				CASE WHEN PDO.IS_BAND IS FALSE OR PDO.IS_BAND IS NULL THEN ((CASE WHEN DGM.rate IS NULL OR DGM.rate = 0 THEN DGM.synthetic_rate ELSE DGM.rate END) * PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT::DOUBLE PRECISION) ELSE 0 END
			) AS SUM_PRICE,
      SUM(
				CASE WHEN PDO.ID_TYPE = 2 THEN((CASE WHEN DGM.rate IS NULL OR DGM.rate = 0 THEN DGM.synthetic_rate ELSE DGM.rate END) * PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT::DOUBLE PRECISION) ELSE 0 END
			) AS SIDE_DIAMOND_PRICE_WITH_BAND,
      SUM(
				CASE WHEN PDO.ID_TYPE = 2 AND PDO.IS_BAND IS FALSE THEN((CASE WHEN DGM.rate IS NULL OR DGM.rate = 0 THEN DGM.synthetic_rate ELSE DGM.rate END) * PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT::DOUBLE PRECISION) ELSE 0 END
			) AS SIDE_DIAMOND_PRICE_WITHOUT_BAND

		FROM
			PRODUCT_DIAMOND_OPTIONS PDO
			LEFT JOIN DIAMOND_GROUP_MASTERS DGM ON DGM.ID = PDO.ID_DIAMOND_GROUP
		WHERE
			PDO.IS_DELETED = '${DeletedStatus.No}'::"bit"
		GROUP BY
			PDO.ID_PRODUCT
	) SUM_PRICE ON SUM_PRICE.ID_PRODUCT = P.ID
  LEFT JOIN DIAMOND_GROUP_MASTERS DGM ON DGM.ID = PDO.ID_DIAMOND_GROUP
	LEFT JOIN DIAMOND_SHAPES DS ON DS.ID = CASE WHEN PDO.ID_SHAPE IS NOT NULL THEN PDO.ID_SHAPE ELSE DGM.ID_SHAPE END
	LEFT JOIN GEMSTONES GS ON GS.ID = CASE WHEN PDO.ID_STONE IS NOT NULL THEN PDO.ID_STONE ELSE DGM.ID_STONE END
	LEFT JOIN MM_SIZES MS ON MS.ID = CASE WHEN PDO.ID_MM_SIZE IS NOT NULL THEN PDO.ID_MM_SIZE ELSE DGM.ID_MM_SIZE END
	LEFT JOIN COLORS C ON C.ID = CASE WHEN PDO.ID_COLOR IS NOT NULL THEN PDO.ID_COLOR ELSE DGM.ID_COLOR END
	LEFT JOIN CLARITIES CL ON CL.ID = CASE WHEN PDO.ID_CLARITY IS NOT NULL THEN PDO.ID_CLARITY ELSE DGM.ID_CLARITY END
	LEFT JOIN CUTS CT ON CT.ID = CASE WHEN PDO.ID_CUT IS NOT NULL THEN PDO.ID_CUT ELSE DGM.ID_CUTS END
  WHERE
	p.is_deleted = '${DeletedStatus.No}' AND
	p.is_active = '${ActiveStatus.Active}' AND
	P.SLUG = '${slug}' AND
  GROUP BY
	P.ID,	SUM_PRICE.TOTAL_DIAMOND_WEIGHT`,
      { type: QueryTypes.SELECT }
    );

    if (!(products && products.length > 0 && products[0])) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    const diamondGroup =
      products && products[0]?.PDO.map((value: any) => value.id_diamond_group);

    const findDiamondGroup = await DiamondGroupMaster.findAll({
      where: { id: diamondGroup, },
      attributes: ["id", "id_shape"],
    });

    const tages = await Tag.findAll({
      where: { id: products[0].tag ,},
      attributes: ["id", "name"],
    });

    const size = await SizeData.findAll({
      where: { id: products[0].size, },
      order: [
        [
          Sequelize.cast(
            Sequelize.fn(
              "regexp_replace",
              Sequelize.col("slug"),
              "^[^0-9]*([0-9]+(?:\\.[0-9]+)?).*$", // Extracts the first numeric part
              "\\1"
            ),
            "NUMERIC"
          ),
          "ASC",
        ],
      ],
      attributes: ["id", "size"],
    });

    const length = await LengthData.findAll({
      where: { id: products[0].length, },
      order: [
        [
          Sequelize.cast(
            Sequelize.fn(
              "regexp_replace",
              Sequelize.col("slug"),
              "^[^0-9]*([0-9]+(?:\\.[0-9]+)?).*$", // Extracts the first numeric part
              "\\1"
            ),
            "NUMERIC"
          ),
          "ASC",
        ],
      ],
      attributes: ["id", "length"],
    });

    const diamond_shape = await DiamondShape.findAll({
      where: { id: findDiamondGroup.map((value: any) => value.id_shape), },
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [Sequelize.literal("diamond_shape_image.image_path"), "image_path"]
      ],
      include: [{ model: Image, as: "diamond_shape_image", attributes: [],where:{} }],
    });

    const choose_setting_diamond_shape = await DiamondShape.findAll({
      where: { id: products[0]?.setting_diamond_shapes, },
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [Sequelize.literal("diamond_shape_image.image_path"), "image_path"]
      ],
      include: [{ model: Image, as: "diamond_shape_image", attributes: [],where:{} }],
    });

    const choose_setting_diamond_size = await DiamondCaratSize.findAll({
      where: { id: products[0]?.setting_diamond_sizes, },
      attributes: [
        "id",
        "value",
        "slug",
        "sort_code",
        [Sequelize.literal("diamond_carat_image.image_path"), "image_path"]
      ],
      include: [{ model: Image, as: "diamond_carat_image", attributes: [],where:{} }],
    });

    const metalTone = products[0].PMO.map((t: any) => t.metal_tone);
    const metal = products[0].PMO.map((t: any) => t.id_metal);
    const karat = products[0].PMO.map((t: any) => t.id_karat).filter((t: any) => t !== null);

    const metal_tone = await MetalTone.findAll({
      where: {
        id: metalTone.flat().map((t: any) => t),
        is_deleted: DeletedStatus.No,
        is_active: ActiveStatus.Active,
      },
      attributes: [
        "id",
        "name",
        "sort_code",
        [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "metal_tone_image", attributes: [],where:{} }],
    });

    const metal_karat = await GoldKarat.findAll({

      where: {
        id: karat.flat().map((t: any) => t),
        is_deleted: DeletedStatus.No,
        is_active: ActiveStatus.Active,
      },
      order: [["name", "ASC"]],
      attributes: [
        "id",
        "name",
        [Sequelize.literal("karat_image.image_path"), "image_path"],
      ],
      include: [{required: false, model: Image, as: "karat_image", attributes: [],where:{} }],
    });

    const metals = await MetalMaster.findAll({
      where: {
        id: metal.flat().map((t: any) => t),
        is_deleted: DeletedStatus.No,
        is_active: ActiveStatus.Active,
      },
      attributes: ["id", "name"],
      order: [["id", "ASC"]],
    });

    const center_diamond_details = await dbContext.query(
      `SELECT gemstones.name as diamond, product_diamond_options.count AS count, diamond_shapes.name as shape,  mm_sizes.value as MM_size,
       colors.value as diamond_color, clarities.value as diamond_clarity, cuts.value as diamond_cut,
        (product_diamond_options.weight*product_diamond_options.count) AS weight, product_diamond_options.weight as diamond_size_value,
        product_diamond_options.count as stone_count
         FROM products LEFT OUTER JOIN product_diamond_options ON product_diamond_options.id_product = products.id AND product_diamond_options.is_deleted = '${DeletedStatus.No}'
      LEFT OUTER JOIN diamond_group_masters ON product_diamond_options.id_diamond_group = diamond_group_masters.id AND diamond_group_masters.is_deleted = '${DeletedStatus.No}'
      LEFT OUTER JOIN gemstones ON diamond_group_masters.id_stone = gemstones.id OR product_diamond_options.id_stone = gemstones.id
      LEFT OUTER JOIN carat_sizes ON diamond_group_masters.id_carat = carat_sizes.id 
      LEFT OUTER JOIN diamond_shapes ON diamond_group_masters.id_shape = diamond_shapes.id OR product_diamond_options.id_shape = diamond_shapes.id
      LEFT OUTER JOIN mm_sizes ON diamond_group_masters.id_mm_size = mm_sizes.id OR product_diamond_options.id_mm_size = mm_sizes.id
      LEFT OUTER JOIN colors ON diamond_group_masters.id_color = colors.id OR product_diamond_options.id_color = colors.id
      LEFT OUTER JOIN clarities ON diamond_group_masters.id_clarity = clarities.id OR product_diamond_options.id_clarity = clarities.id
      LEFT OUTER JOIN cuts ON diamond_group_masters.id_cuts = cuts.id WHERE products.slug = '${slug}' AND products.      AND product_diamond_options.id_type = 1`,
      { type: QueryTypes.SELECT }
    );

    const childProducts: any = await dbContext.query(
      `SELECT
	P.ID,
	P.NAME,
	P.SKU,
	P.SLUG,
	P.ADDITIONAL_DETAIL,
  P.certificate,
	P.SORT_DESCRIPTION,
	P.LONG_DESCRIPTION,
	P.GENDER,
	P.PRODUCT_TYPE,
	P.DISCOUNT_TYPE,
	P.DISCOUNT_VALUE,
  P.SHIPPING_DAY,
  P.IS_CUSTOMIZATION,
  P.PARENT_ID,
  P.META_TITLE,
  P.META_DESCRIPTION,
  P.META_TAG,
  P.IS_SINGLE,
  P.IS_3D_PRODUCT,
  P.head_no,
  P.shank_no,
  P.band_no,
  P.style_no,
  P.IS_BAND,
  P.IS_CHOOSE_SETTING,
  P.SETTING_DIAMOND_SHAPES,
  P.SETTING_DIAMOND_SIZES,
  SUM(PDO.COUNT) as center_diamond_count,
  SUM(
    PDO.WEIGHT) as center_diamond_wt,
  carat_sizes.value as diamond_sizes_value
FROM
	PRODUCTS AS P
	
	LEFT JOIN PRODUCT_DIAMOND_OPTIONS AS PDO ON PDO.ID_PRODUCT = P.ID AND PDO.IS_DELETED = '${DeletedStatus.No
      }' AND PDO.ID_TYPE = 1
  LEFT JOIN diamond_group_masters as DGM ON DGM.id = PDO.id_diamond_group
  LEFT JOIN carat_sizes ON carat_Sizes.id = DGM.id_carat
  WHERE
	p.is_deleted = '${DeletedStatus.No}' AND
	p.is_active = '${ActiveStatus.Active}' AND
  p.  AND p.parent_id = ${products[0].parent_id &&
        products[0].parent_id != "" &&
        products[0].parent_id != undefined &&
        products[0].parent_id != null &&
        products[0].parent_id != "null"
        ? products[0].parent_id
        : products[0].id
      } OR P.id = ${products[0].parent_id &&
        products[0].parent_id != "" &&
        products[0].parent_id != undefined &&
        products[0].parent_id != null &&
        products[0].parent_id != "null"
        ? products[0].parent_id
        : products[0].id
      }
  GROUP BY
	P.ID, carat_sizes.value`,
      { type: QueryTypes.SELECT }
    );

    const findSideDiamondWeight = products[0]?.PDO && products[0].PDO.length > 0 ? products[0].PDO.filter((t: any) => t.id_type == 2).map((value:any) => value.total_diamond_weight): [];
    const findSideDiamondCount = products[0]?.PDO && products[0].PDO.length > 0 ? products[0].PDO.filter((t: any) => t.id_type == 2).map((value:any) => value.count): [];

    const findSideDiamondTotalWeight = findSideDiamondWeight.reduce((a: any, b: any) => a + b, 0)
    const findSideDiamondTotalCount = findSideDiamondCount.reduce((a: any, b: any) => a + b, 0)

    const caratSizeList =
      childProducts.length > 0
        ? childProducts.length == 1 && childProducts[0].id === products[0].id
          ? []
          : await dbContext.query(
            `(SELECT carat_sizes.id, count,weight, carat_sizes.value as carat_size_value,images.image_path as image_path FROM product_diamond_options 
LEFT JOIN diamond_group_masters ON id_diamond_group = diamond_group_masters.id
LEFT JOIN carat_sizes ON id_carat = carat_sizes.id
LEFT JOIN images ON carat_sizes.id_image = images.id
 AND id_product IN (${childProducts
              .map((t: any) => t.id)
              .join(",")}) AND id_type = 1)`,
            { type: QueryTypes.SELECT }
          )
        : [];
        const diamondShapeList =
      childProducts.length > 0
        ? childProducts.length == 1 && childProducts[0].id === products[0].id
          ? []
          : await dbContext.query(
            `(SELECT diamond_shapes.id, diamond_shapes.name, diamond_shapes.sort_code,diamond_shapes.slug,images.image_path as image_path FROM product_diamond_options 
LEFT JOIN diamond_group_masters ON id_diamond_group = diamond_group_masters.id
LEFT JOIN diamond_shapes ON diamond_group_masters.id_shape = diamond_shapes.id
LEFT JOIN images ON diamond_shapes.id_image = images.id
 AND id_product IN (${childProducts
              .map((t: any) => t.id)
              .join(",")}) AND id_type = 1)`,
            { type: QueryTypes.SELECT }
          )
        : [];
    
      // Find all active product offers that are currently valid (by date and days)
    const findAllActiveProductOffers = await fetchActiveOffers(req)

    const productOffers = findAllActiveProductOffers.filter(
      (offer: any) => offer.offer_type === `${offerType.ProductType}`
    );

      let appliedOffers: any = [];
      let totalDiscount = 0;
      const applicableProductOffers: any = await getProductOffersForId(
        productOffers,
        products[0].id,
        products[0].PMO[0].Price,
        req?.body?.session_res?.id_app_user
      );
      let bestProductOffer: any = null;
      let bestProductDiscount = 0;
    for (const offer of applicableProductOffers) {
        
      const discount = calculateDiscountAmount(offer, products[0]?.PMO[0]?.Price);
      if (discount > Number(bestProductDiscount)) {          
          bestProductDiscount = discount;
          bestProductOffer = offer;
        }
    }
    
    if (bestProductOffer) {
        appliedOffers.push({
          ...bestProductOffer,
          discount: bestProductDiscount
        });
        totalDiscount = bestProductDiscount;
      }


const productType = products[0].product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct : null
      const chooseSettingProductType = products[0].product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct : null
    const productDetail = {
      ...products[0],
      offer_detail: appliedOffers[0] && appliedOffers[0]?.offer_id ? {
          offer_id: appliedOffers[0]?.offer_id,
          offer_name: appliedOffers[0]?.offer_name,
          discount_type: appliedOffers[0]?.discount_type,
          discount: bestProductDiscount,
          discount_value: appliedOffers[0]?.discount,
          maximum_discount_amount: appliedOffers[0]?.maximum_discount_amount,
          description: appliedOffers[0]?.description
        } : null,
       
      PMO: await Promise.all(products[0].PMO.map(async(value: any) => ({
        ...value,
        Price: await req.formatPrice(value.Price,productType),
        after_discount_product_price: await req.formatPrice(
          value.Price - calculateDiscountAmount(appliedOffers[0], value.Price),
          productType
        ),
        choose_setting_price_with_band: await req.formatPrice(value.choose_setting_price_with_band, chooseSettingProductType),
        after_discount_choose_setting_price_with_band: await req.formatPrice(
          value.choose_setting_price_with_band - calculateDiscountAmount(appliedOffers[0], value.choose_setting_price_with_band),
          chooseSettingProductType
        ),
        choose_setting_price_without_band: await req.formatPrice(
          value.choose_setting_price_without_band,
          chooseSettingProductType
        ),
        after_discount_choose_setting_price_without_band: await req.formatPrice(
          value.choose_setting_price_without_band - calculateDiscountAmount(appliedOffers[0], value.choose_setting_price_without_band),
          chooseSettingProductType
        ),
      }))),
    };

    return resSuccess({
      
      data: {
        
        products: productDetail,
        size,
        length,
        tages,
        diamond_shape,
        setting_diamond_shapes: diamondShapeList,
        carat_size_list: caratSizeList,
        metal_tone,
        metal_karat,
        metals,
        choose_setting_diamond_shape,
        choose_setting_diamond_size,
        center_diamond_details,
        side_diamond_details: {
          total_diamond_weight: findSideDiamondTotalWeight,
          total_diamond_count: findSideDiamondTotalCount,
          diamonds: products[0]?.PDO && products[0].PDO.length > 0 ? products[0].PDO.filter((t: any) => t.id_type == 2) : [],
        },
        child_products:
          childProducts.length > 0
            ? childProducts.length == 1 &&
              childProducts[0].id === products[0].id
              ? []
              : childProducts
            : [],
      },
    });
  } catch (error) {
    console.log("-----------------------", error);
    throw error;
  }
};

export const featuredProductListUserSide = async (req: any) => {
  try {
    const productList = await dbContext.query(
      `SELECT products.id, products.name, products.sku, products.slug, products.sort_description,
  products.discount_type, products.discount_value, products.setting_style_type,products.product_type,
  products.gender, products.making_charge, products.finding_charge, products.other_charge, products.additional_detail, products.certificate,
  products.meta_title, products.meta_description, products.meta_tag,
  (SELECT jsonb_agg(jsonb_build_object('id', product_images.id, 'image_path', product_images.image_path, 'id_metal_tone', product_images.id_metal_tone))
                             FROM product_images
                             WHERE product_images.id_product = products.id AND is_deleted = '0' 
               AND image_type = 1
  ) AS product_images,
  
  (SELECT jsonb_agg(jsonb_build_object('id',p_metal.id, 'id_metal', p_metal.id_metal, 'id_karat', id_karat, 'id_size', id_size,'id_length', id_length, 
                    'side_dia_weight', side_dia_weight,'side_dia_count', side_dia_count, 'id_m_tone', id_m_tone,
                      'wishlist_id', (SELECT id FROM wishlist_products WHERE product_id = p_metal.id_product AND product_type = ${AllProductTypes.Product
      } AND variant_id = p_metal.id AND user_id = ${req.query.user_id &&
        req.query.user_id != "" &&
        req.query.user_id != undefined &&
        req.query.user_id != null &&
        req.query.user_id != "null"
        ? req.query.user_id
        : 0
      } LIMIT 1),
                     'metal_tone', CASE WHEN id_metal_tone IS NULL THEN '{}'::int[] 
                     ELSE string_to_array(id_metal_tone, '|')::int[] END,
                     'gold_karat', gold_kts.name,
                     'Price', CASE WHEN products.product_type = 2 
                     THEN (products.making_charge+products.finding_charge+products.other_charge+retail_price) 
                     ELSE CASE WHEN id_karat IS NULL THEN
                     (metal_master.metal_rate*p_metal.metal_weight+products.making_charge+products.finding_charge+products.other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0)))
                     ELSE 
                     (metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*p_metal.metal_weight+products.making_charge+products.finding_charge+products.other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0)))
                     END
                     END
                    )) 
             FROM product_metal_options AS p_metal 
             LEFT JOIN metal_masters AS metal_master ON metal_master.id = p_metal.id_metal
             LEFT JOIN gold_kts ON gold_kts.id = p_metal.id_karat
             WHERE p_metal.is_deleted = '0'  
             AND id_product = products.id

  ) AS PMO
             
  FROM products 
LEFT  JOIN product_diamond_options AS PDO ON PDO.id_product = products.id AND PDO.is_deleted = '0'
LEFT  JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group

WHERE products.is_deleted = '0' 
AND products.is_active = '1' 
AND products.is_featured = '1'
GROUP BY products.id
ORDER BY products.id DESC 

`,
      { type: QueryTypes.SELECT }
    );

    await productTypeMetalArrayCreate(productList);

    const products = await Promise.all(productList.map(async(value: any) => {
      const productType = value.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct : null

      const data = await Promise.all(value.pmo.map(async(t: any) => { return { ...t, Price: await req.formatPrice(t.Price,productType) } }));

      return { ...value, pmo: data };
    }))

    return resSuccess({ data: products });
  } catch (error) {
    throw error;
  }
};

export const trendingProductListUserSide = async (req: any) => {
  try {
    const productList = await dbContext.query(
      `SELECT products.id, products.name, products.sku, products.slug, products.sort_description,
    products.discount_type, products.discount_value, products.setting_style_type,products.product_type,
    products.gender, products.making_charge, products.finding_charge, products.other_charge, products.additional_detail,products.certificate,
    products.meta_title, products.meta_description, products.meta_tag,
    (SELECT jsonb_agg(jsonb_build_object('id', product_images.id, 'image_path', product_images.image_path, 'id_metal_tone', product_images.id_metal_tone))
                               FROM product_images
                               WHERE product_images.id_product = products.id AND is_deleted = '0' 
                 AND image_type = 1
    ) AS product_images,
    
    (SELECT jsonb_agg(jsonb_build_object('id',p_metal.id, 'id_metal', p_metal.id_metal, 'id_karat', id_karat, 'id_size', id_size,'id_length', id_length, 
                      'side_dia_weight', side_dia_weight,'side_dia_count', side_dia_count, 'id_m_tone', id_m_tone,
                        'wishlist_id', (SELECT id FROM wishlist_products WHERE product_id = p_metal.id_product AND product_type = ${AllProductTypes.Product
      } AND variant_id = p_metal.id AND user_id = ${req.query.user_id &&
        req.query.user_id != "" &&
        req.query.user_id != undefined &&
        req.query.user_id != null &&
        req.query.user_id != "null"
        ? req.query.user_id
        : 0
      } LIMIT 1),
                       'metal_tone', CASE WHEN id_metal_tone IS NULL THEN '{}'::int[] 
                       ELSE string_to_array(id_metal_tone, '|')::int[] END,
                      'gold_karat', gold_kts.name,
                       'Price', CASE WHEN products.product_type = 2 
                       THEN (products.making_charge+products.finding_charge+products.other_charge+retail_price) 
                       ELSE CASE WHEN id_karat IS NULL THEN
                       (metal_master.metal_rate*p_metal.metal_weight+products.making_charge+products.finding_charge+products.other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0)))
                       ELSE 
                       (metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*p_metal.metal_weight+products.making_charge+products.finding_charge+products.other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0)))
                       END
                       END
                      )) 
               FROM product_metal_options AS p_metal 
               LEFT JOIN metal_masters AS metal_master ON metal_master.id = p_metal.id_metal
               LEFT JOIN gold_kts ON gold_kts.id = p_metal.id_karat
               WHERE p_metal.is_deleted = '0'  
               AND id_product = products.id
  
    ) AS PMO
               
    FROM products 
  LEFT  JOIN product_diamond_options AS PDO ON PDO.id_product = products.id AND PDO.is_deleted = '0'
  LEFT  JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group
  
  WHERE products.is_deleted = '0' 
  AND products.is_active = '1' 
  AND products.is_trending = '1'
  GROUP BY products.id
  ORDER BY products.id DESC 
  
  `,
      { type: QueryTypes.SELECT }
    );

    await productTypeMetalArrayCreate(productList);
    const products = await Promise.all(productList.map(async(value: any) => {
      const productType = value.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct : null
      const data = await Promise.all(value.pmo.map(async(t: any) => { return { ...t, Price: await req.formatPrice(t.Price,productType) } }));

      return { ...value, pmo: data };
    }))
    return resSuccess({ data: products });
  } catch (error) {
    throw error;
  }
};

export const featuredProductStatusUpdate = async (req: Request) => {
  try {
    const { id_product, is_featured } = req.body;
    const findProduct = await Product.findOne({
      where: {
        id: id_product,
        is_deleted: DeletedStatus.No,
      },
    });

    if (!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    await Product.update(
      {
        is_featured: is_featured,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: findProduct.dataValues.id } }
    );
    await addActivityLogs([{
      old_data: { product_id: findProduct.dataValues.id, data:{ ...findProduct.dataValues } },
      new_data: {
        product_id: findProduct.dataValues.id, data: {
          ...findProduct.dataValues, is_featured: is_featured,
          modified_by: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], findProduct.dataValues.id, LogsActivityType.StatusUpdate, LogsType.Product, req.body.session_res.id_app_user)
    // await refreshMaterializedProductListViewdbContext;
    return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

export const trendingProductStatusUpdate = async (req: Request) => {
  try {

    const { id_product, is_trending } = req.body;
    const findProduct = await Product.findOne({
      where: {
        id: id_product,
        is_deleted: DeletedStatus.No,
      },
    });

    if (!(findProduct && findProduct.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    await Product.update(
      {
        is_trending: is_trending,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: findProduct.dataValues.id } }
    );
    // await refreshMaterializedProductListViewdbContext;
    await addActivityLogs([{
      old_data: { product_id: findProduct.dataValues.id, data: {...findProduct.dataValues} },
      new_data: {
        product_id: findProduct.dataValues.id, data: {
          ...findProduct.dataValues, is_trending: is_trending,
          modified_by: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], findProduct.dataValues.id, LogsActivityType.StatusUpdate, LogsType.Product, req.body.session_res.id_app_user)
    return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
  } catch (e) {
    return resUnknownError({ data: e });
  }
};

export const saveProductMetalOption = async (req: Request) => {
  try {

    const {
      id_product,
      created_by,
      product_Gold_metal_options,
      product_silver_options,
      product_platinum_options,
      settingStyleType,
      size,
      length,
      product_diamond_options,
    } = req.body;

    if (!id_product) return resBadRequest({ message: INVALID_ID });
    const products = await Product.findOne({
      where: { id: id_product, is_deleted: DeletedStatus.No },
    });
    if (!(products && products.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    if (
      !product_Gold_metal_options &&
      !product_silver_options &&
      !product_platinum_options
    )
      return resBadRequest({ message: METAL_IS_REQUIRES });
    const trn = await dbContext.transaction();

    try {
      if (size) {
        await Product.update(
          {
            size: size.join("|"),
            modified_by: req.body.session_res.id_app_user,
            modified_date: getLocalDate(),
          },
          { where: { id: id_product }, transaction: trn }
        );
      }

      if (length) {
        await Product.update(
          {
            length: length.join("|"),
            modified_by: req.body.session_res.id_app_user,
            modified_date: getLocalDate(),
          },
          { where: { id: id_product }, transaction: trn }
        );
      }

      if (settingStyleType) {
        await Product.update(
          {
            setting_style_type: settingStyleType.join("|"),
            modified_by: req.body.session_res.id_app_user,
            modified_date: getLocalDate(),
          },
          { where: { id: id_product }, transaction: trn }
        );
      }

      if (product_Gold_metal_options) {
        let pmgo: IProductMetalGoldData;
        const validation_gold = product_Gold_metal_options.filter(
          (value: any) => value.metal_weight != null
        );

        if (validation_gold.length == 0) {
          await trn.rollback();
          return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
        }
        for (pmgo of product_Gold_metal_options) {
          if (pmgo.id === 0) {
            await ProductMetalOption.create(
              {
                id_product: id_product,
                id_metal: pmgo.id_metal,
                metal_weight: pmgo.metal_weight,
                id_metal_tone: pmgo.id_metal_tone.join("|"),
                id_karat: pmgo.id_karat,
                created_date: getLocalDate(),
                created_by: req.body.session_res.id_app_user,
              },
              { transaction: trn }
            );
          } else {
            let productMetal = await ProductMetalOption.findOne({
              where: { id: pmgo.id, is_deleted: DeletedStatus.No },
              transaction: trn,
            });

            if (!(productMetal && productMetal.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
            }
            await ProductMetalOption.update(
              {
                id_product: id_product,
                id_metal: pmgo.id_metal,
                metal_weight: pmgo.metal_weight,
                id_metal_tone: pmgo.id_metal_tone.join("|"),
                id_karat: pmgo.id_karat,
                modified_date: getLocalDate(),
                modified_by: req.body.session_res.id_app_user,
              },

              { where: { id: pmgo.id, is_deleted: DeletedStatus.No }, transaction: trn }
            );
          }
        }
      }

      if (product_silver_options) {
        let pmso: IProductMetalSilverData;

        for (pmso of product_silver_options) {
          if (pmso.id_metal == null) {
            await trn.rollback();
            return resBadRequest({ message: METAL_IS_REQUIRES });
          } else {
            if (pmso.id_metal != null) {
              if (pmso.metal_weight == null) {
                await trn.rollback();
                return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
              }
            }
          }

          if (pmso.id === 0) {
            await ProductMetalOption.create(
              {
                id_product: id_product,
                id_metal: pmso.id_metal,
                metal_weight: pmso.metal_weight,
                id_metal_tone: pmso.id_metal_tone.join("|"),
                created_date: getLocalDate(),
                created_by: req.body.session_res.id_app_user,
              },
              { transaction: trn }
            );
          } else {
            let productMetal = await ProductMetalOption.findOne({
              where: { id: pmso.id, is_deleted: DeletedStatus.No },
              transaction: trn,
            });

            if (!(productMetal && productMetal.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
            }
            await ProductMetalOption.update(
              {
                id_product: id_product,
                id_metal: pmso.id_metal,
                metal_weight: pmso.metal_weight,
                id_metal_tone: pmso.id_metal_tone.join("|"),
                modified_date: getLocalDate(),
                modified_by: req.body.session_res.id_app_user,
              },

              { where: { id: pmso.id, is_deleted: DeletedStatus.No }, transaction: trn }
            );
          }
        }
      }

      if (product_platinum_options) {
        let pmpo: IProductMetalSilverData;

        for (pmpo of product_platinum_options) {
          if (pmpo.id_metal == null) {
            await trn.rollback();
            return resBadRequest({ message: METAL_IS_REQUIRES });
          } else {
            if (pmpo.id_metal != null) {
              if (pmpo.metal_weight == null) {
                await trn.rollback();
                return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
              }
            }
          }

          if (pmpo.id === 0) {
            await ProductMetalOption.create(
              {
                id_product: id_product,
                id_metal: pmpo.id_metal,
                metal_weight: pmpo.metal_weight,
                id_metal_tone: pmpo.id_metal_tone.join("|"),
                created_date: getLocalDate(),
                created_by: req.body.session_res.id_app_user,
              },
              { transaction: trn }
            );
          } else {
            let productMetal = await ProductMetalOption.findOne({
              where: { id: pmpo.id, is_deleted: DeletedStatus.No },
              transaction: trn,
            });

            if (!(productMetal && productMetal.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
            }

            await ProductMetalOption.update(
              {
                id_product: id_product,
                id_metal: pmpo.id_metal,
                metal_weight: pmpo.metal_weight,
                id_metal_tone: pmpo.id_metal_tone.join("|"),
                modified_date: getLocalDate(),
                modified_by: req.body.session_res.id_app_user,
              },

              { where: { id: pmpo.id, is_deleted: DeletedStatus.No }, transaction: trn }
            );
          }
        }
      }

      if (product_diamond_options) {
        let pdod;

        for (pdod of product_diamond_options) {
          let diamondGroup = await DiamondGroupMaster.findOne({
            where: {
              id_stone: pdod.id_stone,
              id_shape: pdod.id_shape,
              id_mm_size: pdod.id_mm_size,
              id_color: pdod.id_color,
              id_clarity: pdod.id_clarity,
              id_cuts: pdod.id_cuts,
              is_deleted: DeletedStatus.No,
            },
            transaction: trn,
          });

          if (diamondGroup === null) {
            await trn.rollback();
            return resBadRequest({ message: DIAMOND_GROUP_NOT_FOUND });
          }

          if (pdod.id === 0) {
            await ProductDiamondOption.create(
              {
                id_product: id_product,
                id_diamond_group: diamondGroup.dataValues.id,
                id_type: pdod.id_type,
                id_setting: pdod.id_setting,
                weight: pdod.weight,
                count: pdod.count,
                is_default: pdod.is_default,
                created_date: getLocalDate(),
                created_by: req.body.session_res.id_app_user,
              },
              { transaction: trn }
            );
          } else {
            let diamondOption = await ProductDiamondOption.findOne({
              where: { id: pdod.id, is_deleted: DeletedStatus.No },
              transaction: trn,
            });

            if (!(diamondOption && diamondOption.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_DIAMOND_OPTION_NOT_FOUND });
            }

            await ProductDiamondOption.update(
              {
                id_product: id_product,
                id_diamond_group: diamondGroup.dataValues.id,
                id_type: pdod.id_type,
                id_setting: pdod.id_setting,
                weight: pdod.weight,
                count: pdod.count,
                is_default: pdod.is_default,
                modified_date: getLocalDate(),
                modified_by: req.body.session_res.id_app_user,
              },

              { where: { id: pdod.id, is_deleted: DeletedStatus.No }, transaction: trn }
            );
          }
        }
      }
      await trn.commit();
      // await refreshMaterializedProductListViewdbContext;
      return resSuccess();
    } catch (error) {
      await trn.rollback();
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const addProductAllDetailsApi = async (req: Request) => {
  try {
    const {
      id_product,
      name,
      sku,
      sort_description,
      long_description,
      tag,
      product_categories,
      making_charge,
      finding_charge,
      other_charge,
      product_Gold_metal_options,
      product_silver_options,
      product_platinum_options,
      settingStyleType,
      size,
      length,
      product_diamond_options,
      gender,
      discount_type,
      discount_value,
      product_type,
      additional_detail = null,
      certificate = null,
      shipping_day = null,
      is_customization = "0",
      parent_id = null,
      collection,
      is_quantity_track = "0",
      quantity = 0,
      meta_title = null,
      meta_description = null,
      meta_tag = null,
      is_single,
      is_3d_product,
      is_choose_setting,
      is_band,
      setting_diamond_shapes,
      setting_diamond_sizes
    } = req.body;
    let slug = name
      .toLowerCase()
      .replaceAll(" ", "-")
      .replaceAll(/['/|]/g, "-");

    let resIdProduct = 0;
    if (id_product !== 0) {
      resIdProduct = id_product;
    }
    let productToBeUpdate;
    if (id_product !== 0) {
      productToBeUpdate = await Product.findOne({
        where: {
          id: id_product,
          is_deleted: DeletedStatus.No,
        },
      });

      if (!(productToBeUpdate && productToBeUpdate.dataValues)) {
        return resNotFound({ message: PRODUCT_NOT_FOUND });
      }
    }

    let activitylogs: any = { category: [], metals: [], diamonds: [] }

    // check the valid collection

    const validCollection = await validateProductCollection({
      collection,
      oldCollection:
        productToBeUpdate && productToBeUpdate.dataValues.id_collection
          ? productToBeUpdate.dataValues.id_collection
          : "",
    })

    if (validCollection.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validCollection;
    }
    const validTag = await validateProductTag({
      tag,
      oldTag:
        productToBeUpdate && productToBeUpdate.dataValues.tag
          ? productToBeUpdate.dataValues.tag
          : ""
      });

    if (validTag.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validTag;
    }

    const validPC = await validateProductCategories({
      categories: product_categories,
      id_product: id_product !== 0 ? id_product : null,
    });

    if (validPC.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validPC;
    }

    if (
      !product_Gold_metal_options &&
      !product_silver_options &&
      !product_platinum_options
    )
      return resBadRequest({ message: METAL_IS_REQUIRES });

    const trn = await dbContext.transaction();
    try {
      if (id_product === 0) {
        const productSKU = await Product.findOne({
          where: { sku: sku, is_deleted: DeletedStatus.No, },
        });

        if (productSKU != null) {
          await trn.rollback();
          return resErrorDataExit({ message: PRODUCT_EXIST_WITH_SAME_SKU });
        }
        // slug create and same slug create then change the slug
        const sameSlugCount = await Product.count({
          where: [
            columnValueLowerCase("name", name),
            { is_deleted: DeletedStatus.No },
            
          ],
        });

        if (sameSlugCount > 0) {
          slug = `${slug}-${sameSlugCount}`;
        }
        const resProduct = await Product.create(
          {
            name: name,
            sku: sku,
            additional_detail: additional_detail,
            certificate: certificate,
            sort_description: sort_description,
            long_description: long_description,
            tag: tag.join("|"),
            slug: slug,
            making_charge,
            finding_charge,
            other_charge,
            is_customization: is_customization,
            parent_id: parent_id,
            product_type: product_type ? product_type : null,
            discount_type: discount_type,
            discount_value:
              discount_type == DISCOUNT_TYPE.PAR
                ? discount_value / 100
                : discount_value,
            gender: gender == false ? null : gender.join("|"),
            size: size == false ? null : size.join("|"),
            length: length == false ? null : length.join("|"),
            setting_style_type:
              settingStyleType == false ? null : settingStyleType.join("|"),
            is_active: ActiveStatus.Active,
            is_featured: FeaturedProductStatus.InFeatured,
            is_trending: TrendingProductStatus.InTrending,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
            quantity: quantity,
            is_quantity_track: is_quantity_track,
            shipping_day: shipping_day,
            is_single: is_single || "0",
            is_3d_product: is_3d_product || false,
            is_choose_setting: is_choose_setting || "0",
            is_band: is_band || "0",
            setting_diamond_shapes: setting_diamond_shapes && setting_diamond_shapes.length > 0 ?
            setting_diamond_shapes.join("|") : null,
            setting_diamond_sizes: setting_diamond_sizes && setting_diamond_sizes.length > 0 ?
            setting_diamond_sizes.join("|") : null,
            meta_title: meta_title,
            meta_description: meta_description,
            meta_tag: meta_tag,
            id_collection:
              collection &&
                collection != null &&
                collection != undefined &&
                collection.length > 0
                ? collection.join("|")
                : null,
          },
          { transaction: trn }
        );
        activitylogs = {...activitylogs, products: resProduct.dataValues }
        for (const productCategory of product_categories) {
         const categoryData = await ProductCategory.create(
            {
              id_product: resProduct.dataValues.id,
              id_category: productCategory.id_category,
              id_sub_category: productCategory.id_sub_category,
              id_sub_sub_category: productCategory.id_sub_sub_category,
              created_by: req.body.session_res.id_app_user,
              created_date: getLocalDate(),
            },
            { transaction: trn }
          );

          activitylogs = { ...activitylogs, category: [...activitylogs.category, categoryData.dataValues] }
        }
        let stockChangeLogPayload = [];
        if (product_Gold_metal_options) {
          let pmgo: IProductMetalGoldData;
          const validation_gold = product_Gold_metal_options.filter(
            (value: any) => value.metal_weight != null
          );

          if (validation_gold.length == 0) {
            await trn.rollback();
            return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
          }

          for (pmgo of product_Gold_metal_options) {
            if (pmgo.id === 0) {
              if (pmgo.metal_weight) {
                const data = await ProductMetalOption.create(
                  {
                    id_product: resProduct.dataValues.id,
                    id_metal: pmgo.id_metal,
                    metal_weight: pmgo.metal_weight,
                    id_metal_tone: pmgo.id_metal_tone.join("|"),
                    id_karat: pmgo.id_karat,
                    retail_price: pmgo.retail_price,
                    compare_price: pmgo.compare_price,
                    created_date: getLocalDate(),
                    quantity: pmgo.quantity,
                    band_metal_weight: pmgo.band_metal_weight || 0,
                    remaing_quantity_count: pmgo.quantity,
                    created_by: req.body.session_res.id_app_user,
                  },
                  { transaction: trn }
                );
                activitylogs = { ...activitylogs, metals: [...activitylogs.metals, data.dataValues] }
                if (is_quantity_track) {
                  stockChangeLogPayload.push({
                    product_id: id_product,
                    variant_id: data.dataValues.id,
                    product_type: STOCK_PRODUCT_TYPE.Product,
                    sku: sku,
                    prev_quantity: 0,
                    new_quantity: pmgo.quantity || 0,
                    transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                    changed_by: req.body.session_res.id_app_user,
                    email: null,
                    change_date: getLocalDate(),
                  });
                }
              }
            }
          }
        }
        if (product_silver_options) {
          let pmso: IProductMetalSilverData;
          for (pmso of product_silver_options) {
            if (pmso.id_metal == null) {
              await trn.rollback();
              return resBadRequest({ message: METAL_IS_REQUIRES });
            } else {
              if (pmso.id_metal != null) {
                if (pmso.metal_weight == null) {
                  await trn.rollback();
                  return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
                }
              }
            }

            if (pmso.id === 0) {
              const data = await ProductMetalOption.create(
                {
                  id_product: resProduct.dataValues.id,
                  id_metal: pmso.id_metal,
                  metal_weight: pmso.metal_weight,
                  id_metal_tone: pmso.id_metal_tone.join("|"),
                  created_date: getLocalDate(),
                  retail_price: pmso.retail_price,
                  compare_price: pmso.compare_price,
                  quantity: pmso.quantity,
                  band_metal_weight: pmso.band_metal_weight || 0,
                  remaing_quantity_count: pmso.quantity,
                  created_by: req.body.session_res.id_app_user,
                },
                { transaction: trn }
              );
              activitylogs = { ...activitylogs, metals: [...activitylogs.metals, data.dataValues] }
              if (is_quantity_track) {
                stockChangeLogPayload.push({
                  product_id: id_product,
                  variant_id: data.dataValues.id,
                  product_type: STOCK_PRODUCT_TYPE.Product,
                  sku: sku,
                  prev_quantity: 0,
                  new_quantity: pmso.quantity || 0,
                  transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                  changed_by: req.body.session_res.id_app_user,
                  email: null,
                  change_date: getLocalDate(),
                });
              }
            }
          }
        }

        if (product_platinum_options) {
          let pmpo: IProductMetalSilverData;

          for (pmpo of product_platinum_options) {
            if (pmpo.id_metal == null) {
              await trn.rollback();
              return resBadRequest({ message: METAL_IS_REQUIRES });
            } else {
              if (pmpo.id_metal != null) {
                if (pmpo.metal_weight == null) {
                  await trn.rollback();
                  return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
                }
              }
            }

            if (pmpo.id === 0) {
              const data = await ProductMetalOption.create(
                {
                  id_product: resProduct.dataValues.id,
                  id_metal: pmpo.id_metal,
                  metal_weight: pmpo.metal_weight,
                  id_metal_tone: pmpo.id_metal_tone.join("|"),
                  created_date: getLocalDate(),
                  retail_price: pmpo.retail_price,
                  compare_price: pmpo.compare_price,
                  quantity: pmpo.quantity,
                  band_metal_weight: pmpo.band_metal_weight || 0,
                  remaing_quantity_count: pmpo.quantity,
                  created_by: req.body.session_res.id_app_user,
                },
                { transaction: trn }
              );
              activitylogs = { ...activitylogs, metals: [...activitylogs.metals, data.dataValues] }
              if (is_quantity_track) {
                stockChangeLogPayload.push({
                  product_id: id_product,
                  variant_id: data.dataValues.id,
                  product_type: STOCK_PRODUCT_TYPE.Product,
                  sku: sku,
                  prev_quantity: 0,
                  new_quantity: pmpo.quantity || 0,
                  transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                  changed_by: req.body.session_res.id_app_user,
                  email: null,
                  change_date: getLocalDate(),
                });
              }
            }
          }
        }

        if (product_diamond_options) {
          let pdod;

          for (pdod of product_diamond_options) {
            let diamondGroup = await DiamondGroupMaster.findOne({
              where: {
                id_stone: pdod.id_stone,
                id_shape: pdod.id_shape,
                id_mm_size: pdod.id_mm_size,
                id_color: pdod.id_color,
                id_clarity: pdod.id_clarity,
                id_cuts: pdod.id_cuts,
                is_deleted: DeletedStatus.No,
              },
              transaction: trn,
            });

            if (diamondGroup === null) {
              await trn.rollback();
              return resBadRequest({ message: DIAMOND_GROUP_NOT_FOUND });
            }

            if (pdod.id === 0) {
              const diamondData = await ProductDiamondOption.create(
                {
                  id_product: resProduct.dataValues.id,
                  id_diamond_group: diamondGroup.dataValues.id,
                  id_type: pdod.id_type,
                  is_band: pdod.is_band || false,
                  id_setting:
                    pdod.id_setting === null || pdod.id_setting === ""
                      ? null
                      : pdod.id_setting,
                  weight: pdod.weight,
                  count: pdod.count,
                  is_default: pdod.is_default,
                  created_date: getLocalDate(),
                  created_by: req.body.session_res.id_app_user,
                },
                { transaction: trn }
              );
              activitylogs = { ...activitylogs, diamonds: [...activitylogs.diamonds, diamondData.dataValues] }
            }
          }
        }
      } else {
        const productSKU = await Product.findOne({
          where: { sku: sku, is_deleted: DeletedStatus.No, id: { [Op.ne]: id_product },  },
        });

        if (productSKU != null) {
          return resErrorDataExit({ message: PRODUCT_EXIST_WITH_SAME_SKU });
        }

        const sameSlugCount = await Product.count({
          where: [
            columnValueLowerCase("slug", slug),
            { is_deleted: DeletedStatus.No },
            { id: { [Op.ne]: id_product } },
            
          ],
        });

        if (sameSlugCount > 0) {
          slug = `${slug}-${sameSlugCount}`;
        }
        await Product.update(
          {
            name: name,
            sku: sku,
            additional_detail: additional_detail,
            certificate: certificate,
            sort_description: sort_description ? sort_description : null,
            long_description: long_description ? long_description : null,
            tag: tag.join("|"),
            slug: slug,
            making_charge,
            finding_charge,
            other_charge,
            shipping_day: shipping_day,
            is_customization: is_customization,
            parent_id: parent_id,
            is_single: is_single || "0",
            is_3d_product: is_3d_product || false,
            is_choose_setting: is_choose_setting || "0",
            is_band: is_band || "0",
            setting_diamond_shapes: setting_diamond_shapes && setting_diamond_shapes.length > 0 ?
            setting_diamond_shapes.join("|") : null,
            setting_diamond_sizes: setting_diamond_sizes && setting_diamond_sizes.length > 0 ?
            setting_diamond_sizes.join("|") : null,
            gender: gender == false ? null : gender.join("|"),
            size: size == false ? null : size.join("|"),
            length: length == false ? null : length.join("|"),
            setting_style_type:
              settingStyleType == false ? null : settingStyleType.join("|"),
            modified_by: req.body.session_res.id_app_user,
            modified_date: new Date(),
            quantity: quantity,
            is_quantity_track: is_quantity_track,
            id_collection:
              collection &&
                collection != null &&
                collection != undefined &&
                collection.length > 0
                ? collection.join("|")
                : null,
          },
          { where: { id: id_product, }, transaction: trn }
        );

        for (const productCategory of product_categories) {
          if (productCategory.id === 0) {
            await ProductCategory.create(
              {
                id_product: id_product,
                id_category: productCategory.id_category,
                id_sub_category: productCategory.id_sub_category,
                id_sub_sub_category: productCategory.id_sub_sub_category,
                created_by: req.body.session_res.id_app_user,
                created_date: new Date(),
              },
              { transaction: trn }
            );
          } else {
            await ProductCategory.update(
              {
                id_category: productCategory.id_category,
                id_sub_category: productCategory.id_sub_category,
                id_sub_sub_category: productCategory.id_sub_sub_category,
                modified_by: req.body.session_res.id_app_user,
                modified_date: new Date(),
              },
              { where: { id: productCategory.id, }, transaction: trn }
            );
          }
        }

        for (const productCategory of validPC.data) {
          await ProductCategory.update(
            {
              is_deleted: DeletedStatus.yes,
              modified_by: req.body.session_res.id_app_user,
              modified_date: new Date(),
            },
            { where: { id: productCategory.id, }, transaction: trn }
          );
        }

        if (product_Gold_metal_options) {
          let pmgo: IProductMetalGoldData;
          const validation_gold = product_Gold_metal_options.filter(
            (value: any) => value.metal_weight != null
          );

          if (validation_gold.length == 0) {
            await trn.rollback();
            return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
          }
          for (pmgo of product_Gold_metal_options) {
            if (pmgo.id === 0) {
              if (pmgo.metal_weight) {
                await ProductMetalOption.create(
                  {
                    id_product: id_product,
                    id_metal: pmgo.id_metal,
                    metal_weight: pmgo.metal_weight,
                    id_metal_tone: pmgo.id_metal_tone.join("|"),
                    id_karat: pmgo.id_karat,
                    retail_price: pmgo.retail_price,
                    compare_price: pmgo.compare_price,
                    created_date: getLocalDate(),
                    quantity: pmgo.quantity,
                    remaing_quantity_count: pmgo.quantity,
                    created_by: req.body.session_res.id_app_user,
                  },
                  { transaction: trn }
                );
              }
            } else {
              let productMetal = await ProductMetalOption.findOne({
                where: { id: pmgo.id, is_deleted: DeletedStatus.No,  },
                transaction: trn,
              });

              if (!(productMetal && productMetal.dataValues)) {
                await trn.rollback();
                return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
              }
              await ProductMetalOption.update(
                {
                  id_product: id_product,
                  id_metal: pmgo.id_metal,
                  metal_weight: pmgo.metal_weight,
                  id_metal_tone: pmgo.id_metal_tone.join("|"),
                  id_karat: pmgo.id_karat,
                  retail_price: pmgo.retail_price,
                  compare_price: pmgo.compare_price,
                  modified_date: getLocalDate(),
                  quantity: pmgo.quantity !=
                    productMetal.dataValues.remaing_quantity_count
                    ? Number(productMetal.dataValues.quantity) +
                    Number(pmgo.quantity) -
                    Number(productMetal.dataValues.remaing_quantity_count)
                    : productMetal.dataValues.quantity,
                  remaing_quantity_count: pmgo.quantity,
                  modified_by: req.body.session_res.id_app_user,
                },

                { where: { id: pmgo.id, is_deleted: DeletedStatus.No,  }, transaction: trn }
              );
            }
          }
        }

        if (product_silver_options) {
          let pmso: IProductMetalSilverData;

          for (pmso of product_silver_options) {
            if (pmso.id_metal == null) {
              await trn.rollback();
              return resBadRequest({ message: METAL_IS_REQUIRES });
            } else {
              if (pmso.id_metal != null) {
                if (pmso.metal_weight == null) {
                  await trn.rollback();
                  return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
                }
              }
            }

            if (pmso.id === 0) {
              await ProductMetalOption.create(
                {
                  id_product: id_product,
                  id_metal: pmso.id_metal,
                  metal_weight: pmso.metal_weight,
                  id_metal_tone: pmso.id_metal_tone.join("|"),
                  created_date: getLocalDate(),
                  retail_price: pmso.retail_price,
                  compare_price: pmso.compare_price,
                  quantity: pmso.quantity,
                  remaing_quantity_count: pmso.quantity,
                  created_by: req.body.session_res.id_app_user,
                },
                { transaction: trn }
              );
            } else {
              let productMetal = await ProductMetalOption.findOne({
                where: { id: pmso.id, is_deleted: DeletedStatus.No , },
                transaction: trn,
              });

              if (!(productMetal && productMetal.dataValues)) {
                await trn.rollback();
                return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
              }
              await ProductMetalOption.update(
                {
                  id_product: id_product,
                  id_metal: pmso.id_metal,
                  metal_weight: pmso.metal_weight,
                  retail_price: pmso.retail_price,
                  compare_price: pmso.compare_price,
                  id_metal_tone: pmso.id_metal_tone.join("|"),
                  modified_date: getLocalDate(),
                  quantity: pmso.quantity !=
                    productMetal.dataValues.remaing_quantity_count
                    ? Number(productMetal.dataValues.quantity) +
                    Number(pmso.quantity) -
                    Number(productMetal.dataValues.remaing_quantity_count)
                    : productMetal.dataValues.quantity,
                  remaing_quantity_count: pmso.quantity,
                  modified_by: req.body.session_res.id_app_user,
                },

                { where: { id: pmso.id, is_deleted: DeletedStatus.No, }, transaction: trn }
              );
            }
          }
        }

        if (product_platinum_options) {
          let pmpo: IProductMetalSilverData;

          for (pmpo of product_platinum_options) {
            if (pmpo.id_metal == null) {
              await trn.rollback();
              return resBadRequest({ message: METAL_IS_REQUIRES });
            } else {
              if (pmpo.id_metal != null) {
                if (pmpo.metal_weight == null) {
                  await trn.rollback();
                  return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
                }
              }
            }

            if (pmpo.id === 0) {
              await ProductMetalOption.create(
                {
                  id_product: id_product,
                  id_metal: pmpo.id_metal,
                  metal_weight: pmpo.metal_weight,
                  retail_price: pmpo.retail_price,
                  compare_price: pmpo.compare_price,
                  id_metal_tone: pmpo.id_metal_tone.join("|"),
                  created_date: getLocalDate(),
                  remaing_quantity_count: pmpo.quantity,
                  quantity: pmpo.quantity,
                  created_by: req.body.session_res.id_app_user,
                },
                { transaction: trn }
              );
            } else {
              let productMetal = await ProductMetalOption.findOne({
                where: { id: pmpo.id, is_deleted: DeletedStatus.No, },
                transaction: trn,
              });

              if (!(productMetal && productMetal.dataValues)) {
                await trn.rollback();
                return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
              }

              await ProductMetalOption.update(
                {
                  id_product: id_product,
                  id_metal: pmpo.id_metal,
                  metal_weight: pmpo.metal_weight,
                  retail_price: pmpo.retail_price,
                  compare_price: pmpo.compare_price,
                  id_metal_tone: pmpo.id_metal_tone.join("|"),
                  modified_date: getLocalDate(),
                  quantity: pmpo.quantity !=
                    productMetal.dataValues.remaing_quantity_count
                    ? Number(productMetal.dataValues.quantity) +
                    Number(pmpo.quantity) -
                    Number(productMetal.dataValues.remaing_quantity_count)
                    : productMetal.dataValues.quantity,
                  remaing_quantity_count: pmpo.quantity,
                  modified_by: req.body.session_res.id_app_user,
                },

                { where: { id: pmpo.id, is_deleted: DeletedStatus.No, }, transaction: trn }
              );
            }
          }
        }

        if (product_diamond_options) {
          let pdod;

          for (pdod of product_diamond_options) {
            let diamondGroup = await DiamondGroupMaster.findOne({
              where: {
                id_stone: pdod.id_stone,
                id_shape: pdod.id_shape,
                id_mm_size: pdod.id_mm_size,
                id_color: pdod.id_color,
                id_clarity: pdod.id_clarity,
                id_cuts: pdod.id_cuts,
                is_deleted: DeletedStatus.No,
              },
              transaction: trn,
            });

            if (diamondGroup === null) {
              await trn.rollback();
              return resBadRequest({ message: DIAMOND_GROUP_NOT_FOUND });
            }

            if (pdod.id === 0) {
              await ProductDiamondOption.create(
                {
                  id_product: id_product,
                  id_diamond_group: diamondGroup.dataValues.id,
                  id_type:
                    pdod.id_type && pdod.id_type != "" ? pdod.id_type : 2,
                  id_setting:
                    pdod.id_setting && pdod.id_setting != ""
                      ? pdod.id_setting
                      : null,
                  weight: pdod.weight,
                  count: pdod.count,
                  is_band: pdod.is_band || false,
                  is_default: pdod.is_default,
                  created_date: getLocalDate(),
                  created_by: req.body.session_res.id_app_user,
                },
                { transaction: trn }
              );
            } else {
              let diamondOption = await ProductDiamondOption.findOne({
                where: { id: pdod.id, is_deleted: DeletedStatus.No, },
                transaction: trn,
              });

              if (!(diamondOption && diamondOption.dataValues)) {
                await trn.rollback();
                return resNotFound({
                  message: PRODUCT_DIAMOND_OPTION_NOT_FOUND,
                });
              }

              await ProductDiamondOption.update(
                {
                  id_product: id_product,
                  id_diamond_group: diamondGroup.dataValues.id,
                  id_type:
                    pdod.id_type && pdod.id_type != "" ? pdod.id_type : 2,
                  id_setting:
                    pdod.id_setting && pdod.id_setting != ""
                      ? pdod.id_setting
                      : null,
                  weight: pdod.weight,
                  count: pdod.count,
                  is_default: pdod.is_default || "0",
                  modified_date: getLocalDate(),
                  modified_by: req.body.session_res.id_app_user,
                },

                { where: { id: pdod.id, is_deleted: DeletedStatus.No, }, transaction: trn }
              );
            }
          }
        }
      }
      await addActivityLogs([{ old_data: null, new_data: activitylogs }], null, LogsActivityType.Add, LogsType.Product, req.body.session_res.id_app_user,trn)

      await trn.commit();
      // await refreshMaterializedProductListViewdbContext;
      return resSuccess();
    } catch (e) {
      // await refreshMaterializedProductListViewdbContext;
      await trn.rollback();
      return resUnknownError({ data: e });
    }
  } catch (error) {
    return resUnknownError({ data: error });
  }
};

export const editproductApi = async (req: Request) => {
  try {
    const {
      id_product,
      name,
      sku,
      sort_description,
      long_description,
      tag,
      product_categories,
      making_charge,
      finding_charge,
      other_charge,
      product_Gold_metal_options,
      product_silver_options,
      product_platinum_options,
      settingStyleType,
      size,
      length,
      product_diamond_options,
      gender,
      discount_type,
      discount_value,
      additional_detail = null,
      certificate = null,
      shipping_day = null,
      is_customization = "0",
      quantity = 0,
      is_quantity_track = "0",
      parent_id = null,
      collection,
      meta_title = null,
      meta_description = null,
      meta_tag = null,
      is_single,
      is_3d_product,
      is_choose_setting,
      is_band,
      setting_diamond_shapes,
      setting_diamond_sizes
    } = req.body;
    let slug = name
      .toLowerCase()
      .replaceAll(" ", "-")
      .replaceAll(/['/|]/g, "-");

    let resIdProduct = 0;
    if (id_product !== 0) {
      resIdProduct = id_product;
    }
    let productToBeUpdate;
    if (id_product !== 0) {
      productToBeUpdate = await Product.findOne({
        where: {
          id: id_product,
          is_deleted: DeletedStatus.No,
        },
      });

      if (!(productToBeUpdate && productToBeUpdate.dataValues)) {
        return resNotFound({ message: PRODUCT_NOT_FOUND });
      }
    }
    const productMetal = await ProductMetalOption.findAll({ where: { id_product: productToBeUpdate.dataValues.id, is_deleted: DeletedStatus.No, } })
    const productDiamond = await ProductDiamondOption.findAll({ where: { id_product: productToBeUpdate.dataValues.id, is_deleted: DeletedStatus.No, } })
    const productCategory = await ProductCategory.findAll({ where: { id_product: productToBeUpdate.dataValues.id, is_deleted: DeletedStatus.No, } })
    const productsku = await Product.findOne({
      where: { sku: sku, id: { [Op.ne]: id_product }, is_deleted: DeletedStatus.No, },
    });

    if (productsku != null) {
      return resErrorDataExit({ message: PRODUCT_EXIST_WITH_SAME_SKU });
    }

    const validTag = await validateProductTag({
      tag,
      oldTag:
        productToBeUpdate && productToBeUpdate.dataValues.tag
          ? productToBeUpdate.dataValues.tag
          : "",
    });

    if (validTag.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validTag;
    }

    const validPC = await validateProductCategories({
      categories: product_categories,
      id_product: id_product !== 0 ? id_product : null,
    });

    if (validPC.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validPC;
    }

    // check the valid collection

    const validCollection = await validateProductCollection({
      collection,
      oldCollection:
        productToBeUpdate && productToBeUpdate.dataValues.id_collection
          ? productToBeUpdate.dataValues.id_collection
          : "",
    });

    if (validCollection.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validCollection;
    }

    if (
      !product_Gold_metal_options &&
      !product_silver_options &&
      !product_platinum_options
    )
      return resBadRequest({ message: METAL_IS_REQUIRES });
    const sameSlugCount = await Product.count({
      where: [
        columnValueLowerCase("name", name),
        { is_deleted: DeletedStatus.No },
        { id: { [Op.ne]: id_product } },
        
      ],
    });

    if (sameSlugCount > 0) {
      slug = `${slug}-${sameSlugCount}`;
    }
    let activitylogs: any = { category: [], metals: [], diamonds: [] }
    const trn = await dbContext.transaction();
    try {
      await Product.update(
        {
          name: name,
          sku: sku,
          additional_detail: additional_detail,
          certificate: certificate,
          sort_description: sort_description ? sort_description : null,
          long_description: long_description ? long_description : null,
          tag: tag.join("|"),
          gender: gender == false ? null : gender.join("|"),
          slug: slug,
          making_charge,
          finding_charge,
          other_charge,
          is_customization: is_customization,
          parent_id: parent_id,
          shipping_day: shipping_day,
          discount_type: discount_type,
          quantity: quantity,
          is_quantity_track: is_quantity_track,
          meta_title: meta_title,
          meta_description: meta_description,
          meta_tag: meta_tag,
          is_single: is_single || productToBeUpdate?.dataValues?.is_single,
          is_3d_product: is_3d_product || productToBeUpdate?.dataValues?.is_3d_product,
          is_choose_setting: is_choose_setting || productToBeUpdate?.dataValues?.is_choose_setting,
          is_band: is_band || productToBeUpdate?.dataValues?.is_band,
          setting_diamond_shapes: setting_diamond_shapes && setting_diamond_shapes.length > 0 ?
          setting_diamond_shapes.join("|") : productToBeUpdate?.dataValues?.setting_diamond_shapes,
          setting_diamond_sizes: setting_diamond_sizes && setting_diamond_sizes.length > 0 ?
          setting_diamond_sizes.join("|") : productToBeUpdate?.dataValues?.setting_diamond_sizes,
          id_collection:
            collection &&
              collection != null &&
              collection != undefined &&
              collection.length > 0
              ? collection.join("|")
              : null,
          discount_value:
            discount_type == DISCOUNT_TYPE.PAR
              ? discount_value / 100
              : discount_value,
          size: size == false ? null : size.join("|"),
          length: length == false ? null : length.join("|"),
          setting_style_type:
            settingStyleType == false ? null : settingStyleType.join("|"),
          modified_by: req.body.session_res.id_app_user,
          modified_date: new Date(),
        },
        { where: { id: id_product, }, transaction: trn }
      );
      activitylogs = {
        ...activitylogs, products: {
          ...productToBeUpdate.dataValues, name: name,
          sku: sku,
          additional_detail: additional_detail,
          certificate: certificate,
          sort_description: sort_description ? sort_description : null,
          long_description: long_description ? long_description : null,
          tag: tag.join("|"),
          gender: gender == false ? null : gender.join("|"),
          slug: slug,
          making_charge,
          finding_charge,
          other_charge,
          is_customization: is_customization,
          parent_id: parent_id,
          shipping_day: shipping_day,
          discount_type: discount_type,
          quantity: quantity,
          is_quantity_track: is_quantity_track,
          id_collection:
            collection &&
              collection != null &&
              collection != undefined &&
              collection.length > 0
              ? collection.join("|")
              : null,
          discount_value:
            discount_type == DISCOUNT_TYPE.PAR
              ? discount_value / 100
              : discount_value,
          size: size == false ? null : size.join("|"),
          length: length == false ? null : length.join("|"),
          setting_style_type:
            settingStyleType == false ? null : settingStyleType.join("|"),
          modified_by: req.body.session_res.id_app_user,
          modified_date: new Date(),
        }
      }
      for (const productCategory of product_categories) {
        if (productCategory.id === 0) {
          const data = await ProductCategory.create(
            {
              id_product: id_product,
              id_category: productCategory.id_category,
              id_sub_category: productCategory.id_sub_category,
              id_sub_sub_category: productCategory.id_sub_sub_category,
              created_by: req.body.session_res.id_app_user,
              created_date: new Date(),
            },
            { transaction: trn }
          );
          activitylogs = { ...activitylogs, category: [...activitylogs.category, data.dataValues] }
        } else {
          const categoryData = await ProductCategory.findOne({ where: { id: productCategory.id, } })
          await ProductCategory.update(
            {
              id_category: productCategory.id_category??null,
              id_sub_category: productCategory.id_sub_category??null,
              id_sub_sub_category: productCategory.id_sub_sub_category??null,
              modified_by: req.body.session_res.id_app_user,
              modified_date: new Date(),
            },
            { where: { id: productCategory.id, }, transaction: trn }
          );
    
          activitylogs = {
            ...activitylogs, category: [...activitylogs.category, {
              ...categoryData.dataValues, id_category: productCategory.id_category,
              id_sub_category: productCategory.id_sub_category,
              id_sub_sub_category: productCategory.id_sub_sub_category,
              modified_by: req.body.session_res.id_app_user,
              modified_date: new Date(),
            }]
          }
        }
      }

      for (const productCategory of validPC.data) {
        const categoryData = await ProductCategory.findOne({ where: { id: productCategory.id, } })

        await ProductCategory.update(
          {
            is_deleted: DeletedStatus.yes,
            modified_by: req.body.session_res.id_app_user,
            modified_date: new Date(),
          },
          { where: { id: productCategory.id, }, transaction: trn }
        );

        activitylogs = {
          ...activitylogs, category: [...activitylogs.category, {
            ...categoryData.dataValues, is_deleted: DeletedStatus.yes,
            modified_by: req.body.session_res.id_app_user,
            modified_date: new Date(),
          }]
        }
      }

      if (product_Gold_metal_options) {
        let pmgo: IProductMetalGoldData;
        const validation_gold = product_Gold_metal_options.filter(
          (value: any) => value.metal_weight != null
        );

        if (validation_gold.length == 0) {
          await trn.rollback();
          return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
        }
        let stockChangeLogPayload = [];
        for (pmgo of product_Gold_metal_options) {
          if (pmgo.id === 0) {
            if (pmgo.metal_weight) {
              const data = await ProductMetalOption.create(
                {
                  id_product: id_product,
                  id_metal: pmgo.id_metal,
                  metal_weight: pmgo.metal_weight,
                  id_metal_tone: pmgo.id_metal_tone.join("|"),
                  id_karat: pmgo.id_karat,
                  retail_price: pmgo.retail_price,
                  compare_price: pmgo.compare_price,
                  created_date: getLocalDate(),
                  quantity: pmgo.quantity,
                  remaing_quantity_count: pmgo.quantity,
                  band_metal_weight: pmgo.band_metal_weight || 0,
                  created_by: req.body.session_res.id_app_user,
                  is_deleted: pmgo.is_deleted,
                },
                { transaction: trn }
              );
              activitylogs = {
                ...activitylogs, metals: [...activitylogs.metals, {
                  ...data.dataValues
                }]
              }
              if (is_quantity_track && is_quantity_track == "1") {
                stockChangeLogPayload.push({
                  product_id: id_product,
                  variant_id: data.dataValues.id,
                  product_type: STOCK_PRODUCT_TYPE.Product,
                  sku: sku,
                  prev_quantity: 0,
                  new_quantity: pmgo.quantity || 0,
                  transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                  changed_by: req.body.session_res.id_app_user,
                  email: null,
                  change_date: getLocalDate(),
                });
              }
            }
          } else {
            let productMetal = await ProductMetalOption.findOne({
              where: { id: pmgo.id, is_deleted: DeletedStatus.No, },
              transaction: trn,
            });

            if (!(productMetal && productMetal.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
            }
            const payload = {
              id_product: id_product,
              id_metal: pmgo.id_metal,
              metal_weight: pmgo.metal_weight,
              id_metal_tone: pmgo.id_metal_tone.join("|"),
              id_karat: pmgo.id_karat,
              retail_price: pmgo.retail_price,
              compare_price: pmgo.compare_price,
              modified_date: getLocalDate(),
              band_metal_weight: pmgo.band_metal_weight || 0,
              quantity: pmgo.quantity !=
                productMetal.dataValues.remaing_quantity_count
                ? Number(productMetal.dataValues.quantity) +
                Number(pmgo.quantity) -
                Number(productMetal.dataValues.remaing_quantity_count)
                : productMetal.dataValues.quantity,
              remaing_quantity_count: pmgo.quantity,
              modified_by: req.body.session_res.id_app_user,
              is_deleted: pmgo.metal_weight != null && pmgo.metal_weight != undefined && pmgo.metal_weight != 0 ? pmgo.is_deleted : DeletedStatus.yes,
            }
            await ProductMetalOption.update(
              payload,
              { where: { id: pmgo.id, is_deleted: DeletedStatus.No, }, transaction: trn }
            );
            activitylogs = {
              ...activitylogs, metals: [...activitylogs.metals, {
                ...productMetal.dataValues, ...payload
              }]
            }

            if (
              is_quantity_track && is_quantity_track == "1" &&
              productMetal.dataValues.remaing_quantity_count !=
              pmgo.quantity
            ) {

              stockChangeLogPayload.push({
                product_id: id_product,
                variant_id: pmgo.id,
                product_type: STOCK_PRODUCT_TYPE.Product,
                sku: sku,
                prev_quantity: productMetal.dataValues.remaing_quantity_count || 0,
                new_quantity: pmgo.quantity || 0,
                transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                changed_by: req.body.session_res.id_app_user,
                email: null,
                change_date: getLocalDate(),
              });
            }
          }
        }
        if (stockChangeLogPayload.length > 0) {
          await StockChangeLog.bulkCreate(stockChangeLogPayload, {
            transaction: trn,
          });
        }
      }

      if (product_silver_options) {
        let pmso: IProductMetalSilverData;
        let stockChangeLogPayload = [];
        for (pmso of product_silver_options) {
          if (pmso.id_metal == null) {
            await trn.rollback();
            return resBadRequest({ message: METAL_IS_REQUIRES });
          } else {
            if (pmso.id_metal != null) {
              if (pmso.metal_weight == null) {
                await trn.rollback();
                return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
              }
            }
          }

          if (pmso.id === 0) {
            const data = await ProductMetalOption.create(
              {
                id_product: id_product,
                id_metal: pmso.id_metal,
                metal_weight: pmso.metal_weight,
                id_metal_tone: pmso.id_metal_tone.join("|"),
                created_date: getLocalDate(),
                retail_price: pmso.retail_price,
                compare_price: pmso.compare_price,
                quantity: pmso.quantity,
                band_metal_weight: pmso.band_metal_weight || 0,
                remaing_quantity_count: pmso.quantity,
                created_by: req.body.session_res.id_app_user,
                is_deleted: pmso.is_deleted,
              },
              { transaction: trn }
            );
            activitylogs = {
              ...activitylogs, metals: [...activitylogs.metals, {
                ...data.dataValues
              }]
            }
            if (is_quantity_track && is_quantity_track == "1") {
              stockChangeLogPayload.push({
                product_id: id_product,
                variant_id: data.dataValues.id,
                product_type: STOCK_PRODUCT_TYPE.Product,
                sku: sku,
                prev_quantity: 0,
                new_quantity: pmso.quantity || 0,
                transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                changed_by: req.body.session_res.id_app_user,
                email: null,
                change_date: getLocalDate(),
              });
            }
          } else {
            let productMetal = await ProductMetalOption.findOne({
              where: { id: pmso.id, is_deleted: DeletedStatus.No, },
              transaction: trn,
            });

            if (!(productMetal && productMetal.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
            }
            const payload = {
              id_product: id_product,
              id_metal: pmso.id_metal,
              metal_weight: pmso.metal_weight,
              id_metal_tone: pmso.id_metal_tone.join("|"),
              modified_date: getLocalDate(),
              retail_price: pmso.retail_price,
              compare_price: pmso.compare_price,
              band_metal_weight: pmso.band_metal_weight || 0,
              quantity: pmso.quantity !=
                productMetal.dataValues.remaing_quantity_count
                ? Number(productMetal.dataValues.quantity) +
                Number(pmso.quantity) -
                Number(productMetal.dataValues.remaing_quantity_count)
                : productMetal.dataValues.quantity,
              remaing_quantity_count: pmso.quantity,
              modified_by: req.body.session_res.id_app_user,
              is_deleted: pmso.metal_weight != null && pmso.metal_weight != undefined && pmso.metal_weight != 0 ? pmso.is_deleted : DeletedStatus.yes,
            }
            await ProductMetalOption.update(
              payload,
              { where: { id: pmso.id, is_deleted: DeletedStatus.No, }, transaction: trn }
            );
            activitylogs = {
              ...activitylogs, metals: [...activitylogs.metals, {
                ...productMetal.dataValues, ...payload
              }]
            }
            if (
              is_quantity_track && is_quantity_track == "1" &&
              productMetal.dataValues.remaing_quantity_count !=
              pmso.quantity
            ) {

              stockChangeLogPayload.push({
                product_id: id_product,
                variant_id: pmso.id,
                product_type: STOCK_PRODUCT_TYPE.Product,
                sku: sku,
                prev_quantity: productMetal.dataValues.remaing_quantity_count || 0,
                new_quantity: pmso.quantity || 0,
                transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                changed_by: req.body.session_res.id_app_user,
                email: null,
                change_date: getLocalDate(),
              });
            }
          }

        }
        if (stockChangeLogPayload.length > 0) {
          await StockChangeLog.bulkCreate(stockChangeLogPayload, {
            transaction: trn,
          });
        }
      }

      if (product_platinum_options) {
        let pmpo: IProductMetalSilverData;
        let stockChangeLogPayload = [];
        for (pmpo of product_platinum_options) {
          if (pmpo.id_metal == null) {
            await trn.rollback();
            return resBadRequest({ message: METAL_IS_REQUIRES });
          } else {
            if (pmpo.id_metal != null) {
              if (pmpo.metal_weight == null) {
                await trn.rollback();
                return resBadRequest({ message: GOLD_WEIGHT_REQUIRES });
              }
            }
          }

          if (pmpo.id === 0) {
            const data = await ProductMetalOption.create(
              {
                id_product: id_product,
                id_metal: pmpo.id_metal,
                metal_weight: pmpo.metal_weight,
                id_metal_tone: pmpo.id_metal_tone.join("|"),
                created_date: getLocalDate(),
                retail_price: pmpo.retail_price,
                compare_price: pmpo.compare_price,
                remaing_quantity_count: pmpo.quantity,
                band_metal_weight: pmpo.band_metal_weight || 0,
                quantity: pmpo.quantity,
                created_by: req.body.session_res.id_app_user,
                is_deleted: pmpo.is_deleted,
              },
              { transaction: trn }
            );
            activitylogs = {
              ...activitylogs, metals: [...activitylogs.metals, {
                ...data.dataValues
              }]
            }
            if (is_quantity_track && is_quantity_track == "1") {
              stockChangeLogPayload.push({
                product_id: id_product,
                variant_id: data.dataValues.id,
                product_type: STOCK_PRODUCT_TYPE.Product,
                sku: sku,
                prev_quantity: 0,
                new_quantity: pmpo.quantity || 0,
                transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                changed_by: req.body.session_res.id_app_user,
                email: null,
                change_date: getLocalDate(),
              });
            }
          } else {
            let productMetal = await ProductMetalOption.findOne({
              where: { id: pmpo.id, is_deleted: DeletedStatus.No, },
              transaction: trn,
            });

            if (!(productMetal && productMetal.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
            }

            const payload = {
              id_product: id_product,
              id_metal: pmpo.id_metal,
              metal_weight: pmpo.metal_weight,
              id_metal_tone: pmpo.id_metal_tone.join("|"),
              modified_date: getLocalDate(),
              retail_price: pmpo.retail_price,
              compare_price: pmpo.compare_price,
              band_metal_weight: pmpo.band_metal_weight || 0,
              quantity: pmpo.quantity !=
                productMetal.dataValues.remaing_quantity_count
                ? Number(productMetal.dataValues.quantity) +
                Number(pmpo.quantity) -
                Number(productMetal.dataValues.remaing_quantity_count)
                : productMetal.dataValues.quantity,
              remaing_quantity_count: pmpo.quantity,
              modified_by: req.body.session_res.id_app_user,
              is_deleted: pmpo.metal_weight != null && pmpo.metal_weight != undefined && pmpo.metal_weight != 0 ? pmpo.is_deleted : DeletedStatus.yes,
            }
            await ProductMetalOption.update(
              payload,

              { where: { id: pmpo.id, is_deleted: DeletedStatus.No, }, transaction: trn }
            );
            activitylogs = {
              ...activitylogs, metals: [...activitylogs.metals, {
                ...productMetal.dataValues, ...payload
              }]
            }

            if (
              is_quantity_track && is_quantity_track == "1" &&
              productMetal.dataValues.remaing_quantity_count !=
              pmpo.quantity
            ) {

              stockChangeLogPayload.push({
                product_id: id_product,
                variant_id: pmpo.id,
                product_type: STOCK_PRODUCT_TYPE.Product,
                sku: sku,
                prev_quantity: productMetal.dataValues.remaing_quantity_count || 0,
                new_quantity: pmpo.quantity || 0,
                transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
                changed_by: req.body.session_res.id_app_user,

                email: null,
                change_date: getLocalDate(),
              });
            }
          }
        }
        if (stockChangeLogPayload.length > 0) {
          await StockChangeLog.bulkCreate(stockChangeLogPayload, {
            transaction: trn,
          });
        }
      }

      if (product_diamond_options) {
        let pdod;

        for (pdod of product_diamond_options) {
          let diamondGroup = await DiamondGroupMaster.findOne({
            where: {
              id_stone: pdod.id_stone,
              id_shape: pdod.id_shape,
              id_mm_size: pdod.id_mm_size,
              id_color: pdod.id_color,
              id_clarity: pdod.id_clarity,
              id_cuts: pdod.id_cuts,
              is_deleted: DeletedStatus.No,
            },
            transaction: trn,
          });

          if (diamondGroup === null) {
            await trn.rollback();
            return resBadRequest({ message: DIAMOND_GROUP_NOT_FOUND });
          }

          if (pdod.id === 0) {
            const data = await ProductDiamondOption.create(
              {
                id_product: id_product,
                id_diamond_group: diamondGroup.dataValues.id,
                id_type: pdod.id_type && pdod.id_type != "" ? pdod.id_type : 2,
                id_setting:
                  pdod.id_setting && pdod.id_setting != ""
                    ? pdod.id_setting
                    : null,
                is_band: pdod.is_band || false,
                weight: pdod.weight,
                count: pdod.count,
                is_default:
                  pdod.is_default && pdod.is_default != ""
                    ? pdod.is_default
                    : "0",
                created_date: getLocalDate(),
                created_by: req.body.session_res.id_app_user,
                is_deleted: pdod.is_deleted,
              },
              { transaction: trn }
            );
            activitylogs = {
              ...activitylogs, diamonds: [...activitylogs.diamonds, {
                ...data.dataValues
              }]
            }
          } else {
            let diamondOption = await ProductDiamondOption.findOne({
              where: { id: pdod.id, is_deleted: DeletedStatus.No, },
              transaction: trn,
            });

            if (!(diamondOption && diamondOption.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_DIAMOND_OPTION_NOT_FOUND });
            }

            const payload = {
              id_product: id_product,
              id_diamond_group: diamondGroup.dataValues.id,
              id_type: pdod.id_type && pdod.id_type != "" ? pdod.id_type : 2,
              id_setting:
                pdod.id_setting && pdod.id_setting != ""
                  ? pdod.id_setting
                  : null,
              weight: pdod.weight,
              count: pdod.count,
              is_band: pdod.is_band || false,
              is_default:
                pdod.is_default && pdod.is_default != ""
                  ? pdod.is_default
                  : "0",
              modified_date: getLocalDate(),
              modified_by: req.body.session_res.id_app_user,
              is_deleted: pdod.is_deleted,
            }
            await ProductDiamondOption.update(
              {
                id_product: id_product,
                id_diamond_group: diamondGroup.dataValues.id,
                id_type: pdod.id_type && pdod.id_type != "" ? pdod.id_type : 2,
                id_setting:
                  pdod.id_setting && pdod.id_setting != ""
                    ? pdod.id_setting
                    : null,
                weight: pdod.weight,
                count: pdod.count,
                is_default:
                  pdod.is_default && pdod.is_default != ""
                    ? pdod.is_default
                    : "0",
                modified_date: getLocalDate(),
                modified_by: req.body.session_res.id_app_user,
                is_deleted: pdod.is_deleted,
              },

              { where: { id: pdod.id, is_deleted: DeletedStatus.No, }, transaction: trn }
            );

            activitylogs = {
              ...activitylogs, diamonds: [...activitylogs.diamonds, {
                ...diamondOption.dataValues, ...payload
              }]
            }
          }
        }
      }
      await addActivityLogs([{ old_data: { products: productToBeUpdate.dataValues, category: productCategory.map((t: any) => t.dataValues), metals: productMetal.map((t: any) => t.dataValues), diamonds: productDiamond.map((t: any) => t.dataValues) }, new_data: activitylogs }], productToBeUpdate.dataValues.id, LogsActivityType.Edit, LogsType.Product, req.body.session_res.id_app_user,trn)

      await trn.commit();
      return resSuccess();
    } catch (e) {
      await trn.rollback();
      return resUnknownError({ data: e });
    }
  } catch (error) {
    return resUnknownError({ data: error });
  }
};

export const wishlistCartListCount = async (req: Request) => {
  try {
    const { user_id } = req.body;


    const wish_list_count = await ProductWish.count({
      where: { user_id: user_id, },
    });

    const cart_list_count = await CartProducts.sum("quantity", {
      where: { user_id: user_id, },
    });

    return resSuccess({ data: { wish_list_count, cart_list_count } });
  } catch (error) {
    throw error;
  }
};

export const searchProductGlobally = async (req: any) => {
  try {

    // Replace any character that is NOT:
    // - letters (a-z, A-Z)
    // - digits (0-9)
    // - whitespace (spaces, tabs, newlines)
    // - hyphen (-)
    // with a space
    req.query.search_text = req.query.search_text
      .toString()
      .replace(/[^a-zA-Z0-9\s\-]/g, " ");
    const searchValue = req.query.search_text
      .trim();
    
    const productList = await dbContext.query(`
      WITH filtered_pmo AS (
         SELECT DISTINCT ON (pmo.id_product) pmo.id,
            pmo.id_product,
            pmo.id_metal_group,
            pmo.metal_weight,
            pmo.is_deleted,
            pmo.created_by,
            pmo.created_date,
            pmo.modified_by,
            pmo.modified_date,
            pmo.is_default,
            pmo.id_metal,
            pmo.id_karat,
            pmo.id_metal_tone,
            pmo.retail_price,
            pmo.compare_price,
            pmo.id_size,
            pmo.id_length,
            pmo.quantity,
            pmo.side_dia_weight,
            pmo.side_dia_count,
            pmo.remaing_quantity_count,
            pmo.id_m_tone,
            pmo.center_diamond_price,
            karats.name,
            karats.calculate_rate AS karat_calculate_rate,
           FROM product_metal_options pmo
             LEFT JOIN gold_kts karats ON karats.id = pmo.id_karat AND karats.is_deleted = '0'::"bit" AND karats.is_active = '1'::"bit"
          WHERE pmo.is_deleted = '0'::"bit"
          ORDER BY pmo.id_product, karats.name
        ), product_images_data AS (
         SELECT product_images.id_product,
            product_images.id AS image_id,
            concat(web_config_setting.image_base_url, product_images.image_path) AS image_path,
            product_images.id_metal_tone,
            product_images.image_type
           FROM product_images
          WHERE product_images.is_deleted = '0'::"bit" AND (product_images.image_type = ANY (ARRAY[1, 4]))
        ), sum_price AS (
         SELECT pdo_1.id_product,
            sum(
                CASE
                    WHEN dgm_1.rate IS NOT NULL AND dgm_1.rate <> 0::double precision THEN dgm_1.rate
                    ELSE dgm_1.synthetic_rate
                END * pdo_1.weight::double precision * pdo_1.count::double precision) AS sum_price
           FROM product_diamond_options pdo_1
             LEFT JOIN diamond_group_masters dgm_1 ON dgm_1.id = pdo_1.id_diamond_group
          WHERE pdo_1.is_deleted = '0'::"bit" AND (pdo_1.id_type = 2 OR 'undefined'::text <> '1'::text)
          GROUP BY pdo_1.id_product
        ), without_center_diamond_price AS (
         SELECT pdo_1.id_product,
            sum(
                CASE
                    WHEN dgm_1.rate IS NOT NULL AND dgm_1.rate <> 0::double precision THEN dgm_1.rate
                    ELSE dgm_1.synthetic_rate
                END * pdo_1.weight::double precision * pdo_1.count::double precision) AS diamond_price
           FROM product_diamond_options pdo_1
             LEFT JOIN diamond_group_masters dgm_1 ON dgm_1.id = pdo_1.id_diamond_group
          WHERE pdo_1.is_deleted = '0'::"bit" AND pdo_1.id_type = 2 AND pdo_1.is_band IS FALSE
          GROUP BY pdo_1.id_product
        )
 SELECT products.id,
    products.name,
    products.sku,
    products.slug,
    CASE
            WHEN products.product_type = 2 THEN products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.compare_price
            ELSE
            CASE
                WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(sum_price.sum_price, 0::double precision)
                ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(sum_price.sum_price, 0::double precision)
            END
        END as "Price",
		product_image.image_path,
		categories.category_name as category_name
   FROM products
     LEFT JOIN filtered_pmo ON filtered_pmo.id_product = products.id
	 LEFT JOIN (
		 SELECT DISTINCT ON (id_product) id_product, image_path
    FROM product_images
    WHERE image_type = 1
    ORDER BY id_product, id ASC
	 ) as product_image ON product_image.id_product = products.id
     LEFT JOIN metal_masters metal_master ON metal_master.id = filtered_pmo.id_metal AND metal_master.is_deleted = '0'::"bit"
     LEFT JOIN sum_price ON sum_price.id_product = products.id
  	 LEFT JOIN product_categories pc ON pc.id_product = products.id AND pc.is_deleted = '0'
	 LEFT JOIN categories ON categories.id = pc.id_category
  WHERE products.is_deleted = '0'::"bit" AND products.is_active = '1'::"bit" 
  AND products.parent_id IS NULL AND products.is_3d_product = false
  AND
      (   products.name ILIKE '%' || :searchValue || '%'
      OR products.sku ILIKE '%' || :searchValue || '%'
       )
  GROUP BY products.id,filtered_pmo.compare_price,filtered_pmo.id_karat,metal_master.metal_rate,filtered_pmo.metal_weight,
  sum_price.sum_price,metal_master.calculate_rate,filtered_pmo.karat_calculate_rate,product_image.image_path,categories.category_name
        `,{ type: QueryTypes.SELECT, replacements: { searchValue } })
   const findRoundingValue = await dbContext.query(`
      SELECT * FROM price_corrections WHERE product_type In (:product_type)  AND is_active = :is_active
    `, { type: QueryTypes.SELECT,
      replacements: {
        product_type: [PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct],
        is_active: ActiveStatus.Active
      }
    });
    const dynamicProductRoundingValue:any = findRoundingValue.find((item: any) => item.product_type === PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct);
    const productListWithCurrency = await Promise.all(productList.map(async(product: any) => {
      const productType = product.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct : null
      const productRoundValue = product.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? dynamicProductRoundingValue && dynamicProductRoundingValue.round_off ? {value: dynamicProductRoundingValue.round_off, flag: true} : {value: 0, flag: false} : {value: 0, flag: false}
      const value = {
        ...product,
        Price: await req.formatPrice(product.Price, productType, productRoundValue),
        retail_price: await req.formatPrice(product.retail_price, productType, productRoundValue),
        compare_price: await req.formatPrice(product.compare_price, productType, productRoundValue),
      };

      return value;
    }));

    return resSuccess({
      data: productListWithCurrency,
    });
  } catch (error) {
    throw error;
  }
};


/* product add and edit with variant data and without variant --- single product and watch product manage in one */

export const addProductWithVariant = async (req: Request) => {
  try {
    const {
      id_product,
      title,
      sku,
      Short_Description,
      long_description,
      tag,
      id_brand,
      collection,
      product_categories,
      making_charge,
      finding_charge,
      other_charge,
      quantity,
      retail_price,
      compare_price,
      product_metal_options,
      is_quantity_track,
      settingStyleType,
      size,
      length,
      product_diamond_options,
      gender,
      discount_type,
      discount_value,
      is_choose_setting,
      is_single,
      is_3d_product,
      setting_diamond_shapes ,
      additional_detail = null,
      certificate = null,
      shipping_day = null,
      meta_title = null,
      meta_description = null,
      meta_tag = null,
      is_band ,
      setting_diamond_sizes
    } = req.body;
    // check if product id is not 0 then check product find
    let productToBeUpdate;
    if (id_product !== 0) {
      productToBeUpdate = await Product.findOne({
        where: {
          id: id_product,
          is_deleted: DeletedStatus.No,
        },
      });

      if (!(productToBeUpdate && productToBeUpdate.dataValues)) {
        return resNotFound({ message: PRODUCT_NOT_FOUND });
      }

      // check same SKU exited or not  (all sku is different)
      const productSKU = await Product.findOne({
        where: {
          id: { [Op.ne]: productToBeUpdate.dataValues.id },
          sku: sku,
          is_deleted: DeletedStatus.No,
        },
      });

      if (productSKU != null) {
        return resErrorDataExit({ message: PRODUCT_EXIST_WITH_SAME_SKU });
      }
    } else {
      // check same SKU exited or not  (all sku is different)
      const productSKU = await Product.findOne({
        where: { sku: sku, is_deleted: DeletedStatus.No },
      });

      if (productSKU != null) {
        return resErrorDataExit({ message: PRODUCT_EXIST_WITH_SAME_SKU });
      }
    }

    const categoryData = await ProductCategory.findAll({ where: { id_product: id_product !== 0 ? id_product : 0 } })
    const metalsData = await ProductMetalOption.findAll({ where: { id_product: id_product !== 0 ? id_product : 0 } })
    const diamondData = await ProductDiamondOption.findAll({ where: { id_product: id_product !== 0 ? id_product : 0 } })

    // check the valid tag

    const validTag = await validateProductTag({
      tag,
      oldTag:
        productToBeUpdate && productToBeUpdate.dataValues.tag
          ? productToBeUpdate.dataValues.tag
          : "",
    });

    if (validTag.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validTag;
    }

    // check the valid category

    const validPC = await validateProductCategories({
      categories: product_categories,
      id_product: id_product !== 0 ? id_product : null,
    });

    if (validPC.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validPC;
    }

    // check the valid brand

    if (
      id_brand &&
      id_brand != undefined &&
      id_brand != null &&
      id_brand != ""
    ) {
      const validBrand = await BrandData.findOne({
        where: { id: id_brand, is_deleted: DeletedStatus.No },
      });

      if (!(validBrand && validBrand.dataValues)) {
        return resNotFound({
          message: prepareMessageFromParams(DATA_NOT_FOUND, [
            ["field_name", "Brand"],
          ]),
        });
      }
    }

    // check the valid collection

    const validCollection = await validateProductCollection({
      collection,
      oldCollection:
        productToBeUpdate && productToBeUpdate.dataValues.id_collection
          ? productToBeUpdate.dataValues.id_collection
          : "",
    });

    if (validCollection.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validCollection;
    }

    // check the valid size

    const validSize = await validateProductSize({
      size,
      oldSize:
        productToBeUpdate && productToBeUpdate.dataValues.size
          ? productToBeUpdate.dataValues.size
          : "",
        });

    if (validSize.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validSize;
    }

    // check the valid length

    const validLength = await validateProductLength({
      length,
      oldLength:
        productToBeUpdate && productToBeUpdate.dataValues.length
          ? productToBeUpdate.dataValues.length
          : "",
        });

    if (validLength.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validLength;
    }

    if (is_choose_setting === "1" && is_single === "1") {
      for (const pmo of product_metal_options) {
        if (
          pmo.is_deleted !== "1" &&
          !pmo.center_diamond_price &&
          pmo.center_diamond_price !== 0
        ) {
          return resBadRequest({
            message: PRODUCT_METAL_OPTIONS_CENTER_DIAMOND_PRICE_IS_REQUIRED,
          });
        }
      }
    }

    if (
      is_choose_setting === "1" &&
      (!setting_diamond_shapes || setting_diamond_shapes.length === 0)
    ) {
      return resBadRequest({ message: SETTING_DIAMOND_SHAPES_IS_REQUIRED });
    }

    if (setting_diamond_shapes && setting_diamond_shapes.length > 0) {
      const validShapes = await validateDiamondShapes({
        shapes: setting_diamond_shapes,
        oldShapes:
          productToBeUpdate &&
            productToBeUpdate.dataValues.setting_diamond_shapes
            ? productToBeUpdate.dataValues.setting_diamond_shapes
            : "",
              });

      if (validShapes.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return validShapes;
      }
    }
    let activitylogs: any = { category: [], metals: [], diamonds: [] }
    let productId: any;

    const trn = await dbContext.transaction();
    // product add and edit process
    try {
      // product add and edit

      if (id_product == 0) {
        // slug create and same slug create then change the slug
        let slug = title
          .toLowerCase()
          .replaceAll(" ", "-")
          .replaceAll(/['/|]/g, "-");
        const sameSlugCount = await Product.count({
          where: [
            columnValueLowerCase("slug", slug),
            { is_deleted: DeletedStatus.No },
            
          ],
        });

        if (sameSlugCount > 0) {
          slug = `${slug}-${sameSlugCount}`;
        }
        const resProduct = await Product.create(
          {
            name: title,
            sku: sku,
            additional_detail: additional_detail,
            certificate: certificate,
            sort_description: Short_Description,
            long_description: long_description,
            tag: tag.join("|"),
            slug: slug,
            making_charge,
            finding_charge,
            other_charge,
            id_collection:
              collection &&
                collection != null &&
                collection != undefined &&
                collection.length > 0
                ? collection.join("|")
                : null,
            id_brand:
              id_brand && id_brand != undefined && id_brand != null
                ? id_brand
                : null,
            product_type: SingleProductType.VariantType,
            discount_type:
              discount_type &&
                discount_type != null &&
                discount_type != undefined &&
                discount_type != ""
                ? discount_type
                : null,
            discount_value:
              discount_type &&
                discount_type != null &&
                discount_type != undefined &&
                discount_type != "" &&
                discount_value &&
                discount_value != null
                ? discount_type == DISCOUNT_TYPE.PAR
                  ? discount_value / 100
                  : discount_value
                : null,
            gender: gender && gender.length > 0 ? gender.join("|") : null,
            size: size && size.length > 0 ? size.join("|") : null,
            length: length && length.length > 0 ? length.join("|") : null,
            setting_style_type:
              settingStyleType && settingStyleType.length > 0
                ? settingStyleType.join("|")
                : null,
            is_active: ActiveStatus.Active,
            is_featured: FeaturedProductStatus.InFeatured,
            is_trending: TrendingProductStatus.InTrending,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
            quantity: quantity,
            retail_price: retail_price,
            compare_price: compare_price,
            shipping_day: shipping_day,
            is_quantity_track: is_quantity_track,
            is_choose_setting: is_choose_setting || "0",
            is_single: is_single || "1",
            is_3d_product: is_3d_product || false,
            setting_diamond_shapes:
              setting_diamond_shapes && setting_diamond_shapes.length > 0
                ? setting_diamond_shapes.join("|")
                : null,
            is_band: is_band || "0",
            setting_diamond_sizes:
            setting_diamond_sizes && setting_diamond_sizes.length > 0
                ? setting_diamond_sizes.join("|")
                : null,
            is_deleted: DeletedStatus.No,
            meta_title,
            meta_description,
            meta_tag,
          },
          { transaction: trn }
        );

        activitylogs = { ...activitylogs, product: { ...resProduct.dataValues } }

        productId = resProduct.dataValues.id;
      } else {
        // slug create and same slug create then change the slug
        let slug = title
          .toLowerCase()
          .replaceAll(" ", "-")
          .replaceAll(/['/|]/g, "-");
        const sameSlugCount = await Product.count({
          where: [
            columnValueLowerCase("slug", slug),
            { is_deleted: DeletedStatus.No },
            { id: { [Op.ne]: id_product } },
            
          ],
        });

        if (sameSlugCount > 0) {
          slug = `${slug}-${sameSlugCount}`;
        }
        const payload = {
          name: title,
          sku: sku,
          additional_detail: additional_detail,
          certificate: certificate,
          sort_description: Short_Description,
          long_description: long_description,
          tag: tag.join("|"),
          slug: slug,
          making_charge,
          finding_charge,
          other_charge,
          shipping_day: shipping_day,
          id_collection:
            collection &&
              collection != null &&
              collection != undefined &&
              collection.length > 0
              ? collection.join("|")
              : null,
          id_brand:
            id_brand && id_brand != undefined && id_brand != null
              ? id_brand
              : null,
          product_type: SingleProductType.VariantType,
          discount_type:
            discount_type &&
              discount_type != null &&
              discount_type != undefined &&
              discount_type != ""
              ? discount_type
              : null,
          discount_value:
            discount_type &&
              discount_type != null &&
              discount_type != undefined &&
              discount_type != "" &&
              discount_value &&
              discount_value != null
              ? discount_type == DISCOUNT_TYPE.PAR
                ? discount_value / 100
                : discount_value
              : null,
          gender: gender && gender.length > 0 ? gender.join("|") : null,
          size: size && size.length > 0 ? size.join("|") : null,
          length: length && length.length > 0 ? length.join("|") : null,
          setting_style_type:
            settingStyleType && settingStyleType.length > 0
              ? settingStyleType.join("|")
              : null,
          is_featured: FeaturedProductStatus.InFeatured,
          is_trending: TrendingProductStatus.InTrending,
          modified_by: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
          quantity: quantity,
          is_quantity_track: is_quantity_track,
          retail_price: retail_price,
          compare_price: compare_price,
          is_choose_setting: is_choose_setting || productToBeUpdate?.dataValues?.is_choose_setting,
          is_single: is_single || productToBeUpdate?.dataValues?.is_single,
          is_3d_product: is_3d_product || productToBeUpdate?.dataValues?.is_3d_product,
          meta_title,
          meta_description,
          meta_tag,
          setting_diamond_shapes:
            setting_diamond_shapes && setting_diamond_shapes.length > 0
              ? setting_diamond_shapes.join("|")
              : productToBeUpdate?.dataValues?.setting_diamond_shapes,
          is_band: is_band || productToBeUpdate?.dataValues?.is_band,
          setting_diamond_sizes:
            setting_diamond_sizes && setting_diamond_sizes.length > 0
              ? setting_diamond_sizes.join("|")
              : productToBeUpdate?.dataValues?.setting_diamond_sizes,
        }
        await Product.update(
          payload,
          { where: { id: id_product }, transaction: trn }
        );
        activitylogs = { ...activitylogs, product: { ...productToBeUpdate.dataValues, ...payload } }
        productId = id_product;
      }

      // add and update  product category

      for (const productCategory of product_categories) {
        if (productCategory.id === 0) {
          const data = await ProductCategory.create(
            {
              id_product: productId,
              id_category: productCategory.id_category,
              id_sub_category: productCategory.id_sub_category,
              id_sub_sub_category: productCategory.id_sub_sub_category,
              created_by: req.body.session_res.id_app_user,
              created_date: getLocalDate(),
              is_deleted: DeletedStatus.No,
            },
            { transaction: trn }
          );
          activitylogs = { ...activitylogs, category: [...activitylogs.category, data] }
        } else {
          const categoryData = await ProductCategory.findOne({ where: { id: productCategory.id } })
          await ProductCategory.update(
            {
              id_category: productCategory.id_category??null,
              id_sub_category: productCategory.id_sub_category??null,
              id_sub_sub_category: productCategory.id_sub_sub_category??null,
              modified_by: req.body.session_res.id_app_user,
              modified_date: getLocalDate(),
            },
            { where: { id: productCategory.id }, transaction: trn }
          );
          activitylogs = {
            ...activitylogs, category: [...activitylogs.category, {
              ...categoryData, id_category: productCategory.id_category,
              id_sub_category: productCategory.id_sub_category,
              id_sub_sub_category: productCategory.id_sub_sub_category,
              modified_by: req.body.session_res.id_app_user,
              modified_date: getLocalDate(),
            }]
          }
        }
      }

      // delete product category
      if (validPC.data.length > 0) {
        for (const productCategory of validPC.data) {
          const categoryData = await ProductCategory.findOne({ where: { id: productCategory.id } })
          await ProductCategory.update(
            {
              is_deleted: DeletedStatus.yes,
              modified_by: req.body.session_res.id_app_user,
              modified_date: getLocalDate(),
            },
            { where: { id: productCategory.id }, transaction: trn }
          );
          activitylogs = {
            ...activitylogs, category: [...activitylogs.category, {
              ...categoryData, is_deleted: DeletedStatus.yes,
              modified_by: req.body.session_res.id_app_user,
              modified_date: getLocalDate(),
            }]
          }

        }
      }

      // add and update and delete  product metal data
      let productMetalData: IProductVariantMetalData;
      let addVariantList = [];

      if (product_metal_options.length === 1) {
        if (
          product_metal_options[0].id == 0 &&
          (product_metal_options[0].id_metal == null ||
            product_metal_options[0].id_metal == undefined ||
            product_metal_options[0].id_metal == "")
        ) {
          await ProductImage.update(
            {
              is_deleted: DeletedStatus.yes,
            },
            {
              where: {
                id_product: productId,
                id_metal_tone: { [Op.not]: null },
              },
            }
          );
          const productMetalData = await ProductMetalOption.findAll({
            where: {
              id_product: productId,
              is_deleted: DeletedStatus.No,
              id_metal: { [Op.ne]: null },
            },
          });
          await ProductMetalOption.update(
            {
              is_deleted: DeletedStatus.yes,
            },
            { where: { id: productMetalData.map((t: any) => t.dataValues.id) } }
          );

          activitylogs = { ...activitylogs, metals: [...activitylogs.metals, { ...productMetalData, is_deleted: DeletedStatus.yes, }] }
        }
      } else {
        const productMetalData = await ProductMetalOption.findAll({
          where: { id_product: productId, is_deleted: DeletedStatus.No },
        });
        if (
          productMetalData.length == 1 &&
          (productMetalData[0].dataValues.id_metal == null ||
            productMetalData[0].dataValues.id_metal == undefined ||
            productMetalData[0].dataValues.id_metal == "") &&
          (productMetalData[0].dataValues.id_karat == null ||
            productMetalData[0].dataValues.id_karat == undefined ||
            productMetalData[0].dataValues.id_karat == "")
        ) {
          await ProductImage.update(
            {
              is_deleted: DeletedStatus.yes,
            },
            {
              where: {
                id_product: productId,
                id_metal_tone: { [Op.is]: null },
              },
            }
          );

          activitylogs = { ...activitylogs, metals: [...activitylogs.metals, { ...productMetalData, is_deleted: DeletedStatus.yes, }] }

        }
      }

      let stockChangeLogPayload = [];
      const updatedMetalList: any = await createToneArrayBasedOnKarat(
        product_metal_options,
        "id_karat",
        "id_metal",
        "id_metal_tone",
        "metal_tone"
      );
      for (productMetalData of updatedMetalList) {
        if (
          productMetalData.id == 0 &&
          String(productMetalData.is_deleted) == DeletedStatus.No
        ) {
          addVariantList.push({
            id_product: productId,
            metal_weight: productMetalData.metal_weight,
            id_metal: productMetalData.id_metal,
            id_karat:
              productMetalData.id_karat &&
                productMetalData.id_karat != undefined
                ? productMetalData.id_karat
                : null,
            retail_price: productMetalData.retail_price,
            compare_price: productMetalData.compare_price,
            band_band_metal_price: productMetalData.band_metal_price,
            band_metal_weight: productMetalData.band_metal_weight,
            id_size:
              productMetalData.id_size && productMetalData.id_size != undefined
                ? productMetalData.id_size
                : null,
            id_length:
              productMetalData.id_length &&
                productMetalData.id_length != undefined
                ? productMetalData.id_length
                : null,
            quantity: productMetalData.quantity,
            side_dia_weight: productMetalData.side_dia_weight,
            side_dia_count: productMetalData.side_dia_count,
            id_metal_tone: productMetalData.metal_tone
              ? productMetalData.metal_tone.join("|")
              : null,
            remaing_quantity_count: productMetalData.quantity,
            id_m_tone: productMetalData.id_metal_tone,
            center_diamond_price: productMetalData.center_diamond_price
              ? Number(productMetalData.center_diamond_price)
              : null,
            is_deleted: DeletedStatus.No,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
          });
        } else if (
          productMetalData.id != 0 &&
          String(productMetalData.is_deleted) == DeletedStatus.No
        ) {
          let productMetal = await ProductMetalOption.findOne({
            where: { id: productMetalData.id, is_deleted: DeletedStatus.No },
            transaction: trn,
          });
          if (!(productMetal && productMetal.dataValues)) {
            await trn.rollback();
            return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
          }
          const payload = {
            id_product: productId,
            metal_weight: productMetalData.metal_weight,
            id_metal: productMetalData.id_metal,
            id_karat:
              productMetalData.id_karat &&
                productMetalData.id_karat != undefined
                ? productMetalData.id_karat
                : null,
            retail_price: productMetalData.retail_price,
            compare_price: productMetalData.compare_price,
            id_size:
              productMetalData.id_size &&
                productMetalData.id_size != undefined
                ? productMetalData.id_size
                : null,
            band_metal_price: productMetalData.band_metal_price,
            band_metal_weight: productMetalData.band_metal_weight,
            id_length:
              productMetalData.id_length &&
                productMetalData.id_length != undefined
                ? productMetalData.id_length
                : null,
            quantity:
              productMetalData.quantity !=
                productMetal.dataValues.remaing_quantity_count
                ? Number(productMetal.dataValues.quantity) +
                Number(productMetalData.quantity) -
                Number(productMetal.dataValues.remaing_quantity_count)
                : productMetal.dataValues.quantity,
            side_dia_weight: productMetalData.side_dia_weight,
            side_dia_count: productMetalData.side_dia_count,
            remaing_quantity_count: productMetalData.quantity,
            id_metal_tone: productMetalData.metal_tone.join("|"),
            id_m_tone: productMetalData.id_metal_tone,
            center_diamond_price: productMetalData.center_diamond_price
              ? Number(productMetalData.center_diamond_price)
              : null,
            modified_by: req.body.session_res.id_app_user,
            modified_date: getLocalDate(),
          }
          await ProductMetalOption.update(
            payload,
            { where: { id: productMetalData.id }, transaction: trn }
          );
          activitylogs = { ...activitylogs, metals: [...activitylogs.metals, { ...productMetal, ...payload }] }

          if (
            is_quantity_track && is_quantity_track == "1" &&
            productMetal.dataValues.remaing_quantity_count !=
            productMetalData.quantity
          ) {

            stockChangeLogPayload.push({
              product_id: productId,
              variant_id: productMetalData.id,
              product_type: STOCK_PRODUCT_TYPE.Product,
              sku: sku,
              prev_quantity: productMetal.dataValues.remaing_quantity_count,
              new_quantity: productMetalData.quantity || 0,
              transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
              changed_by: req.body.session_res.id_app_user,
              email: null,
              change_date: getLocalDate(),
            });
          }
        } else if (
          productMetalData.id != 0 &&
          String(productMetalData.is_deleted) == DeletedStatus.yes
        ) {
          let productMetal = await ProductMetalOption.findOne({
            where: { id: productMetalData.id, is_deleted: DeletedStatus.No },
            transaction: trn,
          });

          if (!(productMetal && productMetal.dataValues)) {
            await trn.rollback();
            return resNotFound({ message: PRODUCT_METAL_OPTION_NOT_FOUND });
          }

          await ProductMetalOption.update(
            {
              is_deleted: DeletedStatus.yes,
              modified_by: req.body.session_res.id_app_user,
              modified_date: getLocalDate(),
            },
            { where: { id: productMetalData.id }, transaction: trn }
          );

          activitylogs = {
            ...activitylogs, metals: [...activitylogs.metals, {
              ...productMetal, is_deleted: DeletedStatus.yes,
              modified_by: req.body.session_res.id_app_user,
              modified_date: getLocalDate(),
            }]
          }

        }
      }

      if (addVariantList.length > 0) {
        const resCreatePmo = await ProductMetalOption.bulkCreate(
          addVariantList,
          {
            transaction: trn,
          }
        );
        activitylogs = { ...activitylogs, metals: [...activitylogs.metals, ...resCreatePmo] }
        for (const rcp of resCreatePmo) {
          if (is_quantity_track && is_quantity_track == "1") {
            stockChangeLogPayload.push({
              product_id: productId,
              variant_id: rcp.dataValues.id,
              product_type: STOCK_PRODUCT_TYPE.Product,
              sku: sku,
              prev_quantity: 0,
              new_quantity: productMetalData.quantity || 0,
              transaction_type: STOCK_TRANSACTION_TYPE.StockUpdate,
              changed_by: req.body.session_res.id_app_user,
              email: null,
              change_date: getLocalDate(),
            });
          }
        }
      }

      if (stockChangeLogPayload.length > 0) {
        await StockChangeLog.bulkCreate(stockChangeLogPayload, {
          transaction: trn,
        });
      }
      // add  diamond details

      if (product_diamond_options && product_diamond_options.length > 0) {
        let pdod;

        for (pdod of product_diamond_options) {
          let diamondGroup = await DiamondGroupMaster.findOne({
            where: {
              id_stone: pdod.id_stone,
              id_shape: pdod.id_shape,
              id_mm_size: pdod.id_mm_size,
              id_color: pdod.id_color,
              id_clarity: pdod.id_clarity,
              id_cuts: pdod.id_cuts,
              is_deleted: DeletedStatus.No,
            },
            transaction: trn,
          });

          if (pdod.id === 0 && pdod.id_type != null) {
            const data = await ProductDiamondOption.create(
              {
                id_product: productId,
                id_diamond_group:
                  diamondGroup && diamondGroup.dataValues
                    ? diamondGroup.dataValues.id
                    : null,
                id_type: pdod.id_type,
                id_setting: pdod.id_setting,
                weight:
                  pdod.weight && pdod.weight != undefined ? pdod.weight : null,
                count:
                  pdod.count && pdod.count != undefined ? pdod.count : null,
                id_stone: pdod.id_stone,
                id_shape: pdod.id_shape,
                id_mm_size: pdod.id_mm_size,
                id_color: pdod.id_color,
                id_clarity: pdod.id_clarity,
                id_cut: pdod.id_cuts,
                is_default: pdod.is_default,
                created_date: getLocalDate(),
                created_by: req.body.session_res.id_app_user, 
                is_deleted: pdod.is_deleted,
              },
              { transaction: trn }
            );

            activitylogs = { ...activitylogs, diamonds: [...activitylogs.category, data] }
          } else if (pdod.id != 0) {
            let diamondOption = await ProductDiamondOption.findOne({
              where: { id: pdod.id, is_deleted: DeletedStatus.No },
              transaction: trn,
            });

            if (!(diamondOption && diamondOption.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_DIAMOND_OPTION_NOT_FOUND });
            }
            const payload = {
              id_product: productId,
              id_diamond_group:
                diamondGroup && diamondGroup.dataValues
                  ? diamondGroup.dataValues.id
                  : null,
              id_type: pdod.id_type,
              id_stone: pdod.id_stone,
              id_shape: pdod.id_shape,
              id_mm_size: pdod.id_mm_size,
              id_color: pdod.id_color,
              id_clarity: pdod.id_clarity,
              id_cut: pdod.id_cuts,
              id_setting: pdod.id_setting,
              weight:
                pdod.weight && pdod.weight != undefined ? pdod.weight : null,
              count:
                pdod.count && pdod.count != undefined ? pdod.count : null,
              is_default: pdod.is_default,
              modified_date: getLocalDate(),
              modified_by: req.body.session_res.id_app_user,
              is_deleted: pdod.is_deleted,
            }
            await ProductDiamondOption.update(
              payload,

              { where: { id: pdod.id, is_deleted: DeletedStatus.No }, transaction: trn }
            );

            activitylogs = { ...activitylogs, diamonds: [...activitylogs.category, { ...diamondOption, ...payload }] }
          }
        }
      }
      if (id_product != 0) {
            await addActivityLogs([{ old_data: { ...productToBeUpdate, category: categoryData.map((t: any) => t.dataValues), metals: metalsData.map((t: any) => t.dataValues), diamonds: diamondData.map((t: any) => t.dataValues) }, new_data: activitylogs }], id_product, LogsActivityType.Edit, LogsType.Product, req.body.session_res.id_app_user,trn)
      } else {
        await addActivityLogs([{ old_data: null, new_data: activitylogs }], null, LogsActivityType.Edit, LogsType.Product, req.body.session_res.id_app_user,trn)
      }
      await trn.commit();
      // await refreshMaterializedProductListViewdbContext;
      return resSuccess();
    } catch (error) {
      // await refreshMaterializedProductListViewdbContext;
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } catch (error) {
    throw error;
  }
};

// get all image name based on zip file

export const getAllProductImageNamePublicAPI = async (req: Request) => {
  try {
    const { sku, images } = req.body;
    const product = await Product.findOne({
      where: { sku: sku, is_deleted: DeletedStatus.No,  },
    });

    const productImages = await ProductImage.findAll({
      where: {
        id_product: product.dataValues.id,
        is_deleted: DeletedStatus.No,
      },
    });
    const metalTones = await MetalTone.findAll({
      where: { is_deleted: DeletedStatus.No, },
    });
    let result = [];
    if (product && product.dataValues) {
      for (const tone of metalTones) {
        const filteredImages = images.filter((img) =>
          img
            .toLowerCase()
            .includes(`${tone.dataValues.sort_code.toLowerCase()}`)
        );
        for (let image of filteredImages) {
          const findImage = productImages.find(
            (img) => img.dataValues.image_path === image
          );

          if (!(findImage && findImage.dataValues)) {
            result.push({
              id_metal_tone: tone.dataValues.id,
              id_product: product.dataValues.id,
              image_path: image,
              image_type: image.toLowerCase().includes(".mp4")
                ? PRODUCT_IMAGE_TYPE.Video
                : image.toLowerCase().includes(".glb")
                  ? PRODUCT_IMAGE_TYPE.GLB
                  : image.toLocaleLowerCase().includes("-meta") ? PRODUCT_IMAGE_TYPE.SEO : PRODUCT_IMAGE_TYPE.Feature,
              is_deleted: DeletedStatus.No,
              created_date: getLocalDate(),
              created_by: null,
            });
          }
        }
      }
    }

    const otherImages = images.filter(
      (img) => !result.map((t) => t.image_path).includes(img)
    );

    if (otherImages.length > 0) {
      for (let image of otherImages) {
        result.push({
          id_metal_tone: null,
          id_product: product.dataValues.id,
          image_path: image,
          image_type: image.toLowerCase().includes(".mp4")
            ? PRODUCT_IMAGE_TYPE.Video
            : image.toLowerCase().includes(".glb")
              ? PRODUCT_IMAGE_TYPE.GLB
              : image.toLocaleLowerCase().includes("-meta") ? PRODUCT_IMAGE_TYPE.SEO : PRODUCT_IMAGE_TYPE.Image,
          is_deleted: DeletedStatus.No,
          created_date: getLocalDate(),
          created_by: null,
        });
      }
    }
    if (result.length > 0) {
      await ProductImage.bulkCreate(result);
    }
    // await refreshMaterializedProductListViewdbContext;
    return resSuccess({ data: result });
  } catch (error) {
    throw error;
  }
};

export const getAllProductSlug = async (req:Request) => {
  try {
    const result = await Product.findAll({
      where: {
        is_deleted: DeletedStatus.No,
        is_active: ActiveStatus.Active,
        parent_id: null,
        is_3d_product: false
      },
      attributes: ["slug"],
    });

    return resSuccess({ data: result.map((t) => t.dataValues.slug) });
  } catch (error) {
    throw error;
  }
};

export const similarProductList = async (req: any) => {
  try {
    const {
      category = false,
      sub_category = false,
      collection = false,
      setting_style = false,
      metal_tone = false,
      gender = false,
      limit = 10,
      meta_title,
      meta_description,
      meta_tag,
    } = req.query;
    const { slug } = req.params;
    const product = await Product.findOne({
      attributes: [
        "id",
        "name",
        "sku",
        "slug",
        "id_brand",
        "additional_detail",
        "certificate",
        "is_customization",
        "parent_id",
        "meta_title",
        "meta_description",
        "meta_tag",
        [
          Sequelize.literal(
            `CASE WHEN "gender" IS NULL THEN '{}'::int[] ELSE string_to_array("gender", '|')::int[] END`
          ),
          "gender",
        ],
        "sort_description",
        "long_description",
        "making_charge",
        "finding_charge",
        "other_charge",
        "product_type",
        "discount_type",
        "discount_value",
        "is_featured",
        "is_trending",
        "is_quantity_track",
        "retail_price",
        "compare_price",
        "quantity",
        [
          Sequelize.literal(
            `CASE WHEN "products"."id_collection" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."id_collection", '|')::int[] END`
          ),
          "id_collection",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."tag" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."tag", '|')::int[] END`
          ),
          "tag",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."size" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."size", '|')::int[] END`
          ),
          "size",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."length" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."length", '|')::int[] END`
          ),
          "length",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "products"."setting_style_type" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."setting_style_type", '|')::int[] END`
          ),
          "setting_style_type",
        ],
        "is_single",
        "is_3d_product",
        "is_choose_setting",
        "head_no",
        "shank_no",
        "band_no",
        "style_no",
        [
          Sequelize.literal(
            `CASE WHEN "products"."setting_diamond_shapes" IS NULL THEN '{}'::int[] ELSE string_to_array("products"."setting_diamond_shapes", '|')::int[] END`
          ),
          "setting_diamond_shapes",
        ],
      ],
      where: {
        slug: slug,
        is_deleted: DeletedStatus.No,
      },
      include: [
        {
          required: false,
          model: ProductMetalOption,
          as: "PMO",
          attributes: [
            "id",
            "id_metal_group",
            "metal_weight",
            "id_metal",
            "retail_price",
            "compare_price",
            "id_size",
            "id_m_tone",
            "id_length",
            [Sequelize.literal('"PMO"."remaing_quantity_count"'), "quantity"],
            "side_dia_weight",
            "side_dia_count",
            "id_m_tone",
            [
              Sequelize.literal(`
                CASE 
                  WHEN "PMO"."id_metal_tone" IS NULL OR TRIM("PMO"."id_metal_tone") = '' THEN '{}'::int[] 
                  ELSE string_to_array(TRIM(BOTH '|' FROM "PMO"."id_metal_tone"), '|')::int[]
                END
              `),
              'metal_tone'
            ],
            "center_diamond_price",
            "id_karat",
            "is_default",
            "is_deleted",
          ],
          where: { is_deleted: DeletedStatus.No, },
        },
        {
          required: false,
          model: ProductDiamondOption,
          as: "PDO",
          attributes: [
            "id",
            "id_diamond_group",
            "id_type",
            "id_setting",
            "weight",
            "count",
            "is_default",
            "id_stone",
            "id_shape",
            "id_mm_size",
            "id_color",
            "id_clarity",
            "id_cut",
          ],

          where: { is_deleted: DeletedStatus.No, },
        },
        {
          required: false,
          model: ProductCategory,
          as: "product_categories",
          attributes: [
            "id",
            "id_category",
            "id_sub_category",
            "id_sub_sub_category",
          ],
          where: { is_deleted: DeletedStatus.No, },
        },
      ],
    });

    if (!(product && product.dataValues)) {
      return resNotFound({ message: PRODUCT_NOT_FOUND });
    }

    const configData = await getWebSettingData()
    const similarProduct = await dbContext.query(`(WITH filtered_pmo AS (
      SELECT DISTINCT ON (pmo.id_product) pmo.id,
         pmo.id_product,
         pmo.id_metal_group,
         pmo.metal_weight,
         pmo.is_deleted,
         pmo.created_by,
         pmo.created_date,
         pmo.modified_by,
         pmo.modified_date,
         pmo.is_default,
         pmo.id_metal,
         pmo.id_karat,
         pmo.id_metal_tone,
         pmo.retail_price,
         pmo.compare_price,
         pmo.id_size,
         pmo.id_length,
         pmo.quantity,
         pmo.side_dia_weight,
         pmo.side_dia_count,
         pmo.remaing_quantity_count,
         pmo.id_m_tone,
         pmo.center_diamond_price,
         karats.name,
         karats.calculate_rate AS karat_calculate_rate
        FROM product_metal_options pmo
          LEFT JOIN gold_kts karats ON karats.id = pmo.id_karat
 AND pmo.is_deleted = '${DeletedStatus.No}'::"bit"
       ORDER BY pmo.id_product, karats.name
     ), product_images_data AS (
      SELECT product_images.id_product,
         product_images.id AS image_id,
         CONCAT(
         '${configData.image_base_url}',
         PRODUCT_IMAGES.IMAGE_PATH
       ) AS image_path,
         product_images.id_metal_tone,
         product_images.image_type
        FROM product_images
 AND product_images.is_deleted = '${DeletedStatus.No}'::"bit" AND product_images.image_type = ${PRODUCT_IMAGE_TYPE.Feature}
     ), sum_price AS (
      SELECT pdo_1.id_product,
         sum((CASE WHEN dgm_1.rate IS NULL THEN dgm_1.synthetic_rate ELSE dgm_1.rate END) * pdo_1.weight::double precision * pdo_1.count::double precision) AS sum_price
        FROM product_diamond_options pdo_1
          LEFT JOIN diamond_group_masters dgm_1 ON dgm_1.id = pdo_1.id_diamond_group
  AND pdo_1.is_deleted = '${DeletedStatus.No}'::"bit" AND (pdo_1.id_type = ${SingleProductType.VariantType} OR 'undefined'::text <> '1'::text)
       GROUP BY pdo_1.id_product
     )
SELECT products.id,
 products.name,
 products.sku,
 products.slug,
 products.sort_description,
 products.created_date,
 products.product_type,
 products.setting_style_type,
 products.gender,
 products.id_collection,
 products.id_brand,
 products.setting_diamond_shapes,
 products.is_trending,
 products.parent_id,
 products.meta_title,
 products.meta_description,
 products.meta_tag,
 products.is_customization,
 jsonb_agg(DISTINCT jsonb_build_object('id', product_categories.id, 'id_category', product_categories.id_category, 'id_sub_category', product_categories.id_sub_category, 'id_sub_sub_category', product_categories.id_sub_sub_category, 'category_name', categories.category_name, 'sub_category_name', sub_categories.category_name, 'sub_sub_category', sub_sub_categories.category_name)) AS product_categories,
 jsonb_agg(DISTINCT jsonb_build_object('id', product_images_data.image_id, 'image_path', product_images_data.image_path, 'id_metal_tone', product_images_data.id_metal_tone, 'image_type', product_images_data.image_type)) AS product_images,
 jsonb_agg(DISTINCT jsonb_build_object('id', filtered_pmo.id, 'id_metal', filtered_pmo.id_metal, 'id_karat', filtered_pmo.id_karat, 'id_size', filtered_pmo.id_size, 'id_length', filtered_pmo.id_length, 'id_m_tone', filtered_pmo.id_m_tone, 'quantity', filtered_pmo.remaing_quantity_count, 'wishlist_id', NULL::unknown, 'metal_tone',
     CASE
         WHEN filtered_pmo.id_metal_tone IS NULL THEN '{}'::integer[]
         ELSE string_to_array(filtered_pmo.id_metal_tone::text, '|'::text)::integer[]
     END, 'gold_karat', filtered_pmo.name, 'catalogue_design_price', filtered_pmo.retail_price, 'Price',
     CASE
         WHEN products.product_type = ${SingleProductType.VariantType} THEN
         CASE
             WHEN 'undefined'::text = '1'::text THEN filtered_pmo.retail_price - COALESCE(filtered_pmo.center_diamond_price, 0::numeric)::double precision
             ELSE products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.retail_price
         END
         ELSE
         CASE
             WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(sum_price.sum_price, 0::double precision)
             ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(sum_price.sum_price, 0::double precision)
         END
     END, 'compare_price',
     CASE
         WHEN products.product_type = ${SingleProductType.VariantType} THEN products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + filtered_pmo.compare_price
         ELSE
         CASE
             WHEN filtered_pmo.id_karat IS NULL THEN metal_master.metal_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(sum_price.sum_price, 0::double precision)
             ELSE metal_master.metal_rate / metal_master.calculate_rate * filtered_pmo.karat_calculate_rate * filtered_pmo.metal_weight::double precision + products.making_charge::double precision + products.finding_charge::double precision + products.other_charge::double precision + COALESCE(sum_price.sum_price, 0::double precision)
         END
     END)) AS pmo,
 jsonb_agg(DISTINCT jsonb_build_object('id', pdo.id, 'weight', pdo.weight, 'count', pdo.count, 'id_shape',
     CASE
         WHEN products.product_type = ${SingleProductType.DynemicPrice} THEN dgm.id_shape
         ELSE pdo.id_shape
     END, 'id_stone', pdo.id_stone, 'id_color', pdo.id_color, 'id_clarity', pdo.id_clarity, 'id_type', pdo.id_type)) AS pdo
FROM products
  LEFT JOIN product_images_data ON product_images_data.id_product = products.id
  LEFT JOIN product_categories ON product_categories.id_product = products.id AND product_categories.is_deleted = '${DeletedStatus.No}'::"bit"
  LEFT JOIN categories ON categories.id = product_categories.id_category
  LEFT JOIN categories sub_categories ON sub_categories.id = product_categories.id_sub_category
  LEFT JOIN categories sub_sub_categories ON sub_sub_categories.id = product_categories.id_sub_sub_category
  LEFT JOIN filtered_pmo ON filtered_pmo.id_product = products.id
  LEFT JOIN metal_masters metal_master ON metal_master.id = filtered_pmo.id_metal AND metal_master.is_deleted = '${DeletedStatus.No}'::"bit"
  LEFT JOIN product_diamond_options pdo ON pdo.id_product = products.id AND pdo.is_deleted = '${DeletedStatus.No}'::"bit"
  LEFT JOIN diamond_group_masters dgm ON dgm.id = pdo.id_diamond_group AND dgm.is_deleted = '${DeletedStatus.No}'::"bit"
  LEFT JOIN sum_price ON sum_price.id_product = products.id
 AND products.is_deleted = '${DeletedStatus.No}'::"bit" 
AND products.is_active = '${ActiveStatus.Active}'::"bit"
AND PRODUCTs.ID != ${product.dataValues.id}
 AND products.parent_id IS NULL
${category.toString() == "true"
        ? `AND product_categories.id_category = ${product.dataValues.product_categories[0].dataValues.id_category}`
        : ``
      }
${sub_category.toString() == "true"
        ? `AND product_categories.id_sub_category = ${product.dataValues.product_categories[0].dataValues.id_sub_category}`
        : ``
      }
${collection.toString() == "true"
        ? `AND string_to_array(products.id_collection, '|')::int[] && ARRAY[${product.dataValues.id_collection.join(
          ","
        )}]`
        : ``
      }
${setting_style.toString() == "true"
        ? `AND string_to_array(setting_style_type, '|')::int[] && ARRAY[${product.dataValues.setting_style_type.join(
          ","
        )}]`
        : ``
      }
${gender.toString() == "true"
        ? `AND string_to_array(gender, '|')::int[] && ARRAY[${product.dataValues.gender.join(
          ","
        )}]`
        : ``
      }
GROUP BY products.id
${metal_tone.toString() == "true"
        ? `HAVING SUM(CASE WHEN string_to_array(filtered_pmo.id_metal_tone, '|')::int[] && ARRAY[${product.dataValues.PMO[0].dataValues.metal_tone.join(
          ","
        )}] THEN 1 ELSE 0 END) > 0 `
        : ``
      }
LIMIT ${limit}
)`, { type: QueryTypes.SELECT })

    const productList = await Promise.all(similarProduct.map(async(product: any) => {
      const productType = product.product_type == SingleProductType.DynemicPrice || SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct : null
      return ({
      ...product,
      pmo: await Promise.all( product.pmo.map(async(metalDetail) => ({
        ...metalDetail,
        Price: await req.formatPrice(metalDetail.Price,productType),
        compare_price: await req.formatPrice(metalDetail.compare_price,productType)
      }))),
    })
    }));
    return resSuccess({ data: productList });
  } catch (error) {
    throw error;
  }
};

export const deleteMultipleProducts = async (req: Request) => {
  try {
    const { product_sku } = req.body;
    const productList = await Product.findAll({
      where: {
        sku: {
          [Op.in]: product_sku,
        },
      },
    })
    await Product.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: {
          sku: {
            [Op.in]: product_sku,
          },
        },
      }
    );

    const updatedProducts = await Product.findAll({
      where: {
        sku: {
          [Op.in]: product_sku,
        },
      },
    })
    await addActivityLogs([{ old_data: productList, new_data: updatedProducts }], productList.map((t: any) => t.dataValues.id).join(","), LogsActivityType.Delete, LogsType.Product, req.body.session_res.id_app_user)

    // await refreshMaterializedProductListViewdbContext;
    return resSuccess({ message: RECORD_DELETE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const statusUpdateForMultipleProducts = async (req: Request) => {
  try {
    const { product_sku, is_active } = req.body;
    const productList = await Product.findAll({
      where: {
        sku: {
          [Op.in]: product_sku,
        },
      },
    })
    await Product.update(
      {
        is_active: is_active,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: {
          sku: {
            [Op.in]: product_sku,
          },
        },
      }
    );
    const updatedProducts = await Product.findAll({
      where: {
        sku: {
          [Op.in]: product_sku,
        },
      },
    })
    await addActivityLogs([{ old_data: productList, new_data: updatedProducts }], productList.map((t: any) => t.dataValues.id).join(","), LogsActivityType.Delete, LogsType.Product, req.body.session_res.id_app_user)

    // await refreshMaterializedProductListViewdbContext;
    return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const getProductImagesUsingS3AndAddInDB = async (req: Request) => {
  try {
    const { sku } = req.body;
    let result = [];
    for (let productSKU of sku) {
      const product = await Product.findOne({
        where: { sku: productSKU, is_deleted: DeletedStatus.No, },
      });

      const productImages = await ProductImage.findAll({
        where: {
          id_product: product.dataValues.id,
          is_deleted: DeletedStatus.No,
        },
      });
      const metalTones = await MetalTone.findAll({
        where: { is_deleted: DeletedStatus.No, },
      });

      const s3Images = await s3ListObjects(dbContext,`products/${productSKU}/`,null);
      if (product && product.dataValues) {
        for (const tone of metalTones) {
          const filteredImages = s3Images.filter((img) =>
            img
              .toLowerCase()
              .includes(`${tone.dataValues.sort_code.toLowerCase()}`)
          );
          for (let image of filteredImages) {
            const findImage = productImages.find(
              (img) => img.dataValues.image_path === image
            );
            if (!(findImage && findImage.dataValues)) {
              result.push({
                id_metal_tone: tone.dataValues.id,
                id_product: product.dataValues.id,
                image_path: image,
                image_type: image.toLowerCase().includes(".mp4")
                  ? 4
                  : image.toLowerCase().includes(".glb")
                    ? 5
                    : 1,
                is_deleted: DeletedStatus.No,
                created_date: getLocalDate(),
                created_by: null,
              });
            }
          }
        }
      }
    }

    if (result.length > 0) {
      // await refreshMaterializedProductListViewdbContext;
      await ProductImage.bulkCreate(result);
    }
    // await refreshMaterializedProductListViewdbContext;
    return resSuccess({ data: result });
  } catch (error) {
    throw error;
  }
};

export const addProductSearchValue = async (req: Request) => {
  try {
    const { value } = req.body;
    const addSearchValueList: any = [];
    const updateSearchValueList: any = [];
    if (value.length <= 0) {
      return resSuccess();
    }

    const productSearch = await ProductSearchHistories.findAll({where:{}});
    for (const data of value) {
      const findvalue = productSearch.find(
        (item) =>
          item.dataValues.value?.toLocaleLowerCase() ===
          data?.toLocaleLowerCase() &&
          item.dataValues.user_id === req.body.session_res.id_app_user
      );
      if (findvalue && findvalue.dataValues) {
        updateSearchValueList.push({
          id: findvalue.dataValues.id,
          value: data?.toLocaleLowerCase(),
          user_id: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
          created_date: findvalue.dataValues.created_date,
        });
      } else {
        addSearchValueList.push({
          value: data?.toLocaleLowerCase(),
          user_id: req.body.session_res.id_app_user,
          created_date: getLocalDate(),
          modified_date: getLocalDate(),
        });
      }
    }

    await ProductSearchHistories.bulkCreate(addSearchValueList);
    await ProductSearchHistories.bulkCreate(updateSearchValueList, {
      updateOnDuplicate: ["modified_date"],
    });
    return resSuccess();
  } catch (error) {
    throw error;
  }
};

export const productSearchListForUser = async (req: Request) => {
  try {
    const userId = req.body.session_res.id_app_user || 0;
    const popularSearch = await dbContext.query(
      `(SELECT value FROM product_search_histories WHERE product_search_histories. GROUP BY value ORDER BY COUNT(value) DESC LIMIT 10
)`,
      { type: QueryTypes.SELECT }
    );

    const recentSearch = await dbContext.query(
      `(SELECT id,value FROM product_search_histories WHERE product_search_histories. AND user_id = ${userId} ORDER BY modified_date DESC LIMIT 10)`,
      { type: QueryTypes.SELECT }
    );

    return resSuccess({
      data: { popular_search: popularSearch, recent_search: recentSearch },
    });
  } catch (error) {
    throw error;
  }
};

export const deleteProductSearchValueForUser = async (req: Request) => {
  try {
    const ids = req.params.ids.split(",");
    await ProductSearchHistories.destroy({ where: { id: ids, } });

    return resSuccess({ message: RECORD_DELETE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const popularSearchList = async (req: Request) => {
  try {
    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };
    const totalItems = await dbContext.query(
      `(SELECT value as ids FROM product_search_histories 
      ${req.query.search_text
        ? `WHERE product_search_histories. AND value LIKE '%${req.query.search_text}%'`
        : ""
      }
GROUP BY value 
ORDER BY COUNT(value) DESC
)`,
      {
        type: QueryTypes.SELECT,
      }
    );
    pagination.total_items = totalItems.length;
    pagination.total_pages = Math.ceil(
      totalItems.length / pagination.per_page_rows
    );
    const popularSearch = await dbContext.query(
      `(SELECT value,COUNT(value), jsonb_agg(product_search_histories.id) as ids FROM product_search_histories 
      ${req.query.search_text
        ? `WHERE product_search_histories. AND value ILIKE '%${req.query.search_text}%'`
        : ""
      }
GROUP BY value 
ORDER BY COUNT(value) DESC
OFFSET
        ${(pagination.current_page - 1) * pagination.per_page_rows} ROWS
        FETCH NEXT ${pagination.per_page_rows} ROWS ONLY
)`,
      { type: QueryTypes.SELECT }
    );

    return resSuccess({ data: { pagination, result: popularSearch } });
  } catch (error) {
    throw error;
  }
};
export const deleteProductSearchValueForAdmin = async (req: Request) => {
  try {
    const ids = req.params.ids.split(",");

    await ProductSearchHistories.destroy({ where: { id: ids } });

    return resSuccess({ message: RECORD_DELETE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};
export const recentSearchList = async (req: Request) => {
  try {
    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };
    const totalItems = await dbContext.query(
      `(SELECT product_search_histories.* FROM product_search_histories  
        LEFT JOIN app_users ON app_users.id = user_id
        LEFT JOIN customer_users ON customer_users.id_app_user = app_users.id
        ${req.query.search_text
        ? `WHERE product_search_histories. AND value ILIKE '%${req.query.search_text}%' OR customer_users.full_name ILIKE '%${req.query.search_text}%' OR customer_users.email ILIKE '%${req.query.search_text}%'`
        : ""
      }
        ORDER BY ${pagination.sort_by} ${pagination.order_by}
        OFFSET
        ${(pagination.current_page - 1) * pagination.per_page_rows} ROWS
        FETCH NEXT ${pagination.per_page_rows} ROWS ONLY
        )`,
      { type: QueryTypes.SELECT }
    );
    pagination.total_items = totalItems.length;
    pagination.total_pages = Math.ceil(
      totalItems.length / pagination.per_page_rows
    );
    pagination.sort_by =
      (req.query.sort_by && req.query.sort_by.toString()) || "modified_date";
    pagination.order_by =
      (req.query.order_by && req.query.order_by.toString()) || "desc";
    const recentSearch = await dbContext.query(
      `(SELECT product_search_histories.*,customer_users.full_name,customer_users.email FROM product_search_histories  
        LEFT JOIN app_users ON app_users.id = user_id
        LEFT JOIN customer_users ON customer_users.id_app_user = app_users.id
        ${req.query.search_text
        ? `WHERE product_search_histories. AND value ILIKE '%${req.query.search_text}%' OR customer_users.full_name ILIKE '%${req.query.search_text}%' OR customer_users.email ILIKE '%${req.query.search_text}%'`
        : ""
      }
        ORDER BY ${pagination.sort_by} ${pagination.order_by}
        OFFSET
        ${(pagination.current_page - 1) * pagination.per_page_rows} ROWS
        FETCH NEXT ${pagination.per_page_rows} ROWS ONLY
        )`,
      { type: QueryTypes.SELECT }
    );

    return resSuccess({ data: { pagination, result: recentSearch } });
  } catch (error) {
    throw error;
  }
};

export const withoutVariantProductExport = async (req: Request) => {
  try {
    const products = await dbContext.query(
      `SELECT 
1 as id_parent,
main_cat.category_name as category,
sub_cat.category_name as sub_category,
sub_sub_cat.category_name as sub_sub_category,
product.name as title,
product.sku as sku,
brands.name as brand,

(SELECT STRING_AGG(name, ' | ')  as name FROM collections WHERE id IN (
        SELECT UNNEST(STRING_TO_ARRAY(REPLACE(product.id_collection, '|', ','), ','))::INTEGER
        )) as collection,
		
REPLACE(REPLACE(REPLACE(gender, '1', 'male'), '2', 'female'),'3', 'unisex') as gender,

(SELECT STRING_AGG(name, ' | ')  as name FROM tags WHERE id IN (
        SELECT UNNEST(STRING_TO_ARRAY(REPLACE(product.tag, '|', ','), ','))::INTEGER
        )) as tag,

product.sort_description as short_description,
product.long_description as long_description,
(SELECT STRING_AGG(name,  '|') as name FROM setting_styles WHERE id IN (
        SELECT UNNEST(STRING_TO_ARRAY(REPLACE(setting_style_type, '|', ','), ','))::INTEGER
        )) as setting_style_type,
		
is_quantity_track as quantity_track,

(SELECT STRING_AGG(items_sizes.size, '|') as name FROM items_sizes WHERE id IN (
        SELECT UNNEST(STRING_TO_ARRAY(REPLACE(product.size, '|', ','), ','))::INTEGER
        )) as size,
		
(SELECT STRING_AGG(items_lengths.length, '|') as name FROM items_lengths WHERE id IN (
        SELECT UNNEST(STRING_TO_ARRAY(REPLACE(product.length, '|', ','), ','))::INTEGER
        )) as length,
		
metal.name as metal,
karat.name as karat,
tone.sort_code as metal_tone,
PMO.metal_weight as metal_weight,
PMO.quantity as quantity,
PMO.side_dia_weight as side_dia_weight,
PMO.side_dia_count as side_dia_count,
PMO.retail_price as retail_price,
PMO.compare_price as compare_price,

CASE WHEN id_type = 1 THEN 'centre' WHEN id_type = 2 THEN 'side'  END as stone_type,
stone.name as stone,
NULL as stone_category,
NULL as certification,
shape.name as shape,
mm_sizes.value as mm_size,
colors.value as color,
clarity.value as clarity,
cut.value as cut,
setting.name as stone_setting,
PDO.weight as stone_weight,
PDO.count as stone_count,
additional_detail,
NULL as media

FROM products as product
LEFT JOIN product_metal_options as PMO  ON product.id = PMO.id_product
LEFT JOIN metal_masters as metal ON metal.id = PMO.id_metal
LEFT JOIN gold_kts as karat ON karat.id = PMO.id_karat
LEFT JOIN metal_tones as tone ON tone.id = PMO.id_m_tone
LEFT JOIN product_categories as PC ON pc.id_product = product.id
LEFT JOIN categories as main_cat ON main_cat.id = PC.id_category
LEFT JOIN categories as sub_cat ON sub_cat.id = PC.id_sub_category
LEFT JOIN categories as sub_sub_cat ON sub_sub_cat.id = PC.id_sub_sub_category
LEFT JOIN brands ON brands.id = product.id_brand
LEFT JOIN product_diamond_options AS PDO ON PDO.id_product = product.id
LEFT JOIN diamond_group_masters AS DGM ON DGM.id = id_diamond_group
LEFT JOIN gemstones AS stone ON stone.id = DGM.id_stone
LEFT JOIN diamond_shapes AS shape ON shape.id = DGM.id_shape
LEFT JOIN mm_sizes AS mm_sizes ON mm_sizes.id = DGM.id_mm_size
LEFT JOIN colors AS colors ON colors.id = DGM.id_color
LEFT JOIN clarities AS clarity ON clarity.id = DGM.id_color
LEFT JOIN cuts AS cut ON cut.id = DGM.id_cuts
LEFT JOIN setting_styles as setting ON setting.id = id_setting
AND product.product_type = ${SingleProductType.VariantType} AND
product.is_deleted = '${DeletedStatus.No}' 
GROUP BY main_cat.category_name,sub_cat.category_name,
sub_sub_cat.category_name, product.id,brands.name,metal.name,karat.name,
tone.sort_code,PMO.id,PDO.id,stone.name,shape.name,mm_sizes.value,colors.value,
clarity.value,cut.value,setting.name
HAVING COUNT(PMO.id) = 1 AND COUNT(PDO.id) <= 1
ORDER BY product.id DESC`,
      { type: QueryTypes.SELECT }
    );
    return resSuccess({ data: products });
  } catch (error) {
    throw error;
  }
};


export const getProductsBasedOnTheSettingStyle = async (req: any) => {
  try {
    const { setting_style, user_id } = req.body;
    
    const findSettingStyle = await SettingTypeData.findOne({
      where: { name: setting_style, is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No, },
    });

    if(!(findSettingStyle && findSettingStyle?.dataValues)){
      return resUnprocessableEntity({ message: prepareMessageFromParams(DATA_NOT_FOUND, [["field_name", "Setting Style"]]) });
    }

      const products: any = await dbContext.query(
        `SELECT
    P.ID,
    P.NAME,
    P.SKU,
    P.SLUG,
    P.ADDITIONAL_DETAIL,
    P.certificate,
    P.SORT_DESCRIPTION,
    P.LONG_DESCRIPTION,
    P.GENDER,
    P.PRODUCT_TYPE,
    P.DISCOUNT_TYPE,
    P.DISCOUNT_VALUE,
    P.SHIPPING_DAY,
    P.IS_CUSTOMIZATION,
    P.PARENT_ID,
    P.META_TITLE,
    P.META_DESCRIPTION,
    P.META_TAG,
    P.IS_SINGLE,
    P.IS_3D_PRODUCT,
    P.IS_BAND,
    P.IS_CHOOSE_SETTING,
    P.META_TITLE,
    P.META_DESCRIPTION,
    P.META_TAG,
    P.head_no,
    P.shank_no,
    P.band_no,
    P.style_no,
    P.setting_diamond_shapes as setting_diamond_shapes,
    P.setting_diamond_sizes as setting_diamond_sizes,
    SUM_PRICE.TOTAL_DIAMOND_WEIGHT AS TOTAL_DIAMOND_WEIGHT,
    (
      SELECT
        CASE
          WHEN COUNT(ORDERS.*) >= 1 THEN TRUE
          ELSE FALSE
        END
      FROM
        ORDER_DETAILS
        LEFT OUTER JOIN ORDERS ON ORDER_ID = ORDERS.ID
      WHERE
        PRODUCT_ID = P.ID
        AND USER_ID = ${user_id && user_id != undefined && user_id != null && user_id != "null"
          ? user_id
          : 0
        }
    ) AS IS_ORDER_PRODUCT,
    (
      SELECT
        CASE
          WHEN COUNT(*) >= 1 THEN TRUE
          ELSE FALSE
        END
      FROM
        PRODUCT_REVIEWS
      WHERE
        PRODUCT_ID = P.ID
        AND REVIEWER_ID = ${user_id && user_id != undefined && user_id != null && user_id != "null"
          ? user_id
          : 0
        }
    ) AS IS_ADDED_REVIEW,
    COALESCE(AVG(PR.RATING), 0) AS RATING,
    COUNT(DISTINCT REVIEWER_ID) AS RATING_USER_COUNT,
    CASE
      WHEN P.TAG IS NULL THEN '{}'::INT[]
      ELSE STRING_TO_ARRAY(P.TAG, '|')::INT[]
    END AS TAG,
    CASE
      WHEN P.SIZE IS NULL THEN '{}'::INT[]
      ELSE STRING_TO_ARRAY(P.SIZE, '|')::INT[]
    END AS SIZE,
    CASE
      WHEN P.LENGTH IS NULL THEN '{}'::INT[]
      ELSE STRING_TO_ARRAY(P.LENGTH, '|')::INT[]
    END AS LENGTH,
   
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id',
        PCO.ID,
        'id_category',
        PCO.ID_CATEGORY,
        'id_sub_category',
        PCO.ID_SUB_CATEGORY,
        'id_sub_sub_category',
        PCO.ID_SUB_SUB_CATEGORY,
        'category_name',
        CATEGORIES.CATEGORY_NAME,
        'sub_category_name',
        SUB_CAT.CATEGORY_NAME,
        'sub_sub_category_name',
        SUB_SUB_CAT.CATEGORY_NAME
      )
    ) AS PRODUCT_CATEGORIES,
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id',
        P_IMG.ID,
        'image_path',
        P_IMG.IMAGE_PATH,
        'id_metal_tone',
        P_IMG.ID_METAL_TONE,
        'image_type',
        P_IMG.IMAGE_TYPE,
        'metal_tone_sort_code',
        METAL_TONES.SORT_CODE
      )
    ) AS PRODUCT_IMAGES,
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id',
        PMO.ID,
        'id_metal',
        PMO.ID_METAL,
        'metal_weight',
        PMO.METAL_WEIGHT,
        'band_metal_weight',
        PMO.BAND_METAL_WEIGHT,
        'id_size',
        PMO.ID_SIZE,
        'id_length',
        PMO.ID_LENGTH,
        'id_m_tone',
        PMO.ID_M_TONE,
        'side_dia_weight',
        PMO.SIDE_DIA_WEIGHT,
        'side_dia_count',
        PMO.SIDE_DIA_COUNT,
        'quantity',
        PMO.REMAING_QUANTITY_COUNT,
        'metal_tone',
        CASE
          WHEN PMO.ID_METAL_TONE IS NULL OR product_type = ${SingleProductType.VariantType
        } THEN '{}'::INT[] 
          ELSE STRING_TO_ARRAY(PMO.ID_METAL_TONE, '|')::INT[]
        END,
        'catalogue_design_price',
        CASE
          WHEN P.PRODUCT_TYPE = ${SingleProductType.cataLogueProduct
        } THEN (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE +PMO.RETAIL_PRICE)
          ELSE 0
        END,
        'wishlist_id',
        null,
        'Price',
        CEIL(CASE
          WHEN P.PRODUCT_TYPE = ${SingleProductType.VariantType} THEN  (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + PMO.RETAIL_PRICE)
          ELSE CASE
            WHEN PMO.ID_KARAT IS NULL THEN (
              METAL_MASTERS.METAL_RATE * PMO.METAL_WEIGHT + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SUM_PRICE, 0)
            )
            ELSE (
              METAL_MASTERS.METAL_RATE / METAL_MASTERS.CALCULATE_RATE * GOLD_KTS.calculate_rate * PMO.METAL_WEIGHT + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SUM_PRICE, 0)
            )
          END
        END),
        'choose_setting_price_with_band',
        CEIL(CASE
          WHEN P.PRODUCT_TYPE = ${SingleProductType.VariantType} THEN  (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + PMO.RETAIL_PRICE + PMO.BAND_METAL_PRICE) - PMO.CENTER_DIAMOND_PRICE
          ELSE CASE
            WHEN PMO.ID_KARAT IS NULL THEN (
              METAL_MASTERS.METAL_RATE * (PMO.METAL_WEIGHT + COALESCE(PMO.BAND_METAL_WEIGHT,0)) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITH_BAND, 0)
            )
            ELSE (
              METAL_MASTERS.METAL_RATE / METAL_MASTERS.CALCULATE_RATE * GOLD_KTS.calculate_rate * (PMO.METAL_WEIGHT + COALESCE(PMO.BAND_METAL_WEIGHT,0)) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITH_BAND, 0)
            )
          END
        END),
        'choose_setting_price_without_band',
        CEIL(CASE
          WHEN P.PRODUCT_TYPE = ${SingleProductType.VariantType} THEN  (P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + PMO.RETAIL_PRICE) - PMO.CENTER_DIAMOND_PRICE
          ELSE CASE
            WHEN PMO.ID_KARAT IS NULL THEN (
              METAL_MASTERS.METAL_RATE * (PMO.METAL_WEIGHT) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITHOUT_BAND, 0)
            )
            ELSE (
              METAL_MASTERS.METAL_RATE / METAL_MASTERS.CALCULATE_RATE * GOLD_KTS.calculate_rate * (PMO.METAL_WEIGHT) + P.MAKING_CHARGE + P.FINDING_CHARGE + P.OTHER_CHARGE + COALESCE(SUM_PRICE.SIDE_DIAMOND_PRICE_WITHOUT_BAND, 0)
            )
          END
        END),
        'id_karat',
        PMO.ID_KARAT,
        'remaining_quantity_count',
        remaing_quantity_count,
        'delivery_date',
        CASE WHEN PMO.remaing_quantity_count IS NOT NULL AND remaing_quantity_count > 0 THEN CURRENT_DATE + INTERVAL '${IN_STOCK_PRODUCT_DELIVERY_TIME} days' 
            ELSE CURRENT_DATE + INTERVAL '${OUT_OF_STOCK_PRODUCT_DELIVERY_TIME} days' END,
        'delivery_days',
        CASE WHEN PMO.remaing_quantity_count IS NOT NULL AND remaing_quantity_count > 0 THEN  '${IN_STOCK_PRODUCT_DELIVERY_TIME} days' 
            ELSE '${OUT_OF_STOCK_PRODUCT_DELIVERY_TIME} days' END 
        
      )
    ) AS "PMO",
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id',
        PDO.ID,
        'id_diamond_group',
        PDO.ID_DIAMOND_GROUP,
        'weight',
        PDO.WEIGHT,
        'count',
        PDO.COUNT,
        'id_type',
        PDO.ID_TYPE,
        'diamond_shape',
        DS.NAME,
        'stone',
        GS.NAME,
        'mm_size',
        MS.VALUE,
        'diamond_color',
        C.NAME,
        'diamond_clarity',
        CL.NAME,
        'diamond_cut',
        CT.VALUE
      )
    ) AS "PDO"
  FROM
    PRODUCTS AS P
    LEFT JOIN PRODUCT_REVIEWS AS PR ON PR.PRODUCT_ID = P.ID
    AND IS_APPROVED = '${ActiveStatus.Active}'
    LEFT JOIN PRODUCT_CATEGORIES AS PCO ON PCO.ID_PRODUCT = P.ID
    AND PCO.IS_DELETED = '${DeletedStatus.No}'
    INNER JOIN CATEGORIES ON CATEGORIES.ID = PCO.ID_CATEGORY
    LEFT JOIN CATEGORIES SUB_CAT ON SUB_CAT.ID = PCO.ID_SUB_CATEGORY
    LEFT JOIN CATEGORIES SUB_SUB_CAT ON SUB_SUB_CAT.ID = PCO.ID_SUB_SUB_CATEGORY
    LEFT JOIN PRODUCT_IMAGES P_IMG ON P_IMG.ID_PRODUCT = P.ID
    AND P_IMG.IS_DELETED = '${DeletedStatus.No}'
    LEFT JOIN METAL_TONES ON METAL_TONES.ID = P_IMG.ID_METAL_TONE
    INNER JOIN PRODUCT_METAL_OPTIONS AS PMO ON PMO.ID_PRODUCT = P.ID AND PMO.IS_DELETED = '${DeletedStatus.No
        }'
    LEFT JOIN METAL_MASTERS ON METAL_MASTERS.ID = PMO.ID_METAL
    LEFT JOIN GOLD_KTS ON GOLD_KTS.ID = PMO.ID_KARAT
    LEFT JOIN PRODUCT_DIAMOND_OPTIONS AS PDO ON PDO.ID_PRODUCT = P.ID AND PDO.IS_DELETED = '${DeletedStatus.No}'
    LEFT JOIN (
      SELECT
        PDO.ID_PRODUCT AS ID_PRODUCT,
        SUM(
          CASE WHEN PDO.IS_BAND IS FALSE THEN PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT::DOUBLE PRECISION ELSE 0 END
        ) AS TOTAL_DIAMOND_WEIGHT,
        SUM(
          CASE WHEN PDO.IS_BAND IS FALSE THEN (CASE WHEN DGM.rate IS NULL OR DGM.rate = 0 THEN DGM.synthetic_rate ELSE DGM.rate END) * PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT::DOUBLE PRECISION ELSE 0 END
        ) AS SUM_PRICE,
        SUM(
          CASE WHEN PDO.ID_TYPE = 2 THEN(CASE WHEN DGM.rate IS NULL OR DGM.rate = 0 THEN DGM.synthetic_rate ELSE DGM.rate END) * PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT::DOUBLE PRECISION ELSE 0 END
        ) AS SIDE_DIAMOND_PRICE_WITH_BAND,
        SUM(
          CASE WHEN PDO.ID_TYPE = 2 AND PDO.IS_BAND IS FALSE THEN(CASE WHEN DGM.rate IS NULL OR DGM.rate = 0 THEN DGM.synthetic_rate ELSE DGM.rate END) * PDO.WEIGHT::DOUBLE PRECISION * PDO.COUNT::DOUBLE PRECISION ELSE 0 END
        ) AS SIDE_DIAMOND_PRICE_WITHOUT_BAND
         
      FROM
        PRODUCT_DIAMOND_OPTIONS PDO
        LEFT JOIN DIAMOND_GROUP_MASTERS DGM ON DGM.ID = PDO.ID_DIAMOND_GROUP
      WHERE
        PDO.IS_DELETED = '${DeletedStatus.No}'::"bit"
      GROUP BY
        PDO.ID_PRODUCT
    ) SUM_PRICE ON SUM_PRICE.ID_PRODUCT = P.ID
    LEFT JOIN DIAMOND_GROUP_MASTERS DGM ON DGM.ID = PDO.ID_DIAMOND_GROUP
    LEFT JOIN DIAMOND_SHAPES DS ON DS.ID = DGM.ID_SHAPE
    LEFT JOIN GEMSTONES GS ON GS.ID = DGM.ID_STONE
    LEFT JOIN MM_SIZES MS ON MS.ID = DGM.ID_MM_SIZE
    LEFT JOIN COLORS C ON C.ID = DGM.ID_COLOR
    LEFT JOIN CLARITIES CL ON CL.ID = DGM.ID_CLARITY
    LEFT JOIN CUTS CT ON CT.ID = DGM.ID_CUTs
    WHERE
    p.is_deleted = '${DeletedStatus.No}' AND
    p.is_active = '${ActiveStatus.Active}' AND
    IS_CHOOSE_SETTING = '${ActiveStatus.Active}' AND
    P.IS_3D_PRODUCT IS TRUE AND
    P.setting_style_type = '${findSettingStyle.dataValues.id}' AND
    GROUP BY
    P.ID,	SUM_PRICE.TOTAL_DIAMOND_WEIGHT`,
        { type: QueryTypes.SELECT }
      );
  
      if (!(products && products.length > 0 && products[0])) {
        return resNotFound({ message: PRODUCT_NOT_FOUND });
      }

    let productList = []
    // Find all active product offers that are currently valid (by date and days)
    const findAllActiveProductOffers = await fetchActiveOffers(req)
    const productOffers = findAllActiveProductOffers.filter(
      (offer: any) => offer.offer_type === `${offerType.ProductType}`
    );
    for (const value of products) {
      const pmo = []
      let appliedOffers: any = [];
      let totalDiscount = 0;
      const applicableProductOffers: any = await getProductOffersForId(
        productOffers,
        value.id,
        value.PMO[0].Price,
        req?.body?.session_res?.id_app_user
      );
      let bestProductOffer: any = null;
      let bestProductDiscount = 0;
      for (const offer of applicableProductOffers) {
        const discount = calculateDiscountAmount(offer, value.PMO[0]?.Price);
        if (discount > Number(bestProductDiscount)) {
          bestProductDiscount = discount;
          bestProductOffer = offer;
        }
      }
      if (bestProductOffer) {
        appliedOffers.push({
          ...bestProductOffer,
          discount: bestProductDiscount
        });
        totalDiscount = bestProductDiscount;
      }


      for (const pmoData of value.PMO) {
          const after_dicount_price_with_band = appliedOffers && appliedOffers[0] && appliedOffers.length > 0 ? calculateDiscountAmount(appliedOffers[0], pmoData.choose_setting_price_with_band) : 0;
          const after_dicount_price_without_band = appliedOffers && appliedOffers[0] && appliedOffers.length > 0 ? calculateDiscountAmount(appliedOffers[0], pmoData.choose_setting_price_without_band) : 0;
          pmo.push({...pmoData,choose_setting_price_with_band: await req.formatPrice(pmoData.choose_setting_price_with_band, PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct), choose_setting_price_without_band: await req.formatPrice(pmoData.choose_setting_price_without_band, PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct), after_dicount_price_with_band: await req.formatPrice(pmoData.choose_setting_price_with_band - after_dicount_price_with_band, PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct), after_dicount_price_without_band: await req.formatPrice(pmoData.choose_setting_price_without_band - after_dicount_price_without_band, PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct)})  
      }

      productList.push({...value,offer_detail: appliedOffers && appliedOffers.length > 0 ? appliedOffers[0] : null, total_discount: await req.formatPrice(totalDiscount, null) , PMO: pmo})
    }
  
      const size = await SizeData.findAll({
        where: {  },
        order: [
          [
            Sequelize.cast(
              Sequelize.fn(
                "regexp_replace",
                Sequelize.col("slug"),
                "^[^0-9]*([0-9]+(?:\\.[0-9]+)?).*$", // Extracts the first numeric part
                "\\1"
              ),
              "NUMERIC"
            ),
            "ASC",
          ],
        ],
        attributes: ["id", "size"],
      });
  
  
      const metalTone = products[0].PMO.map((t: any) => t.metal_tone);
      const metal = products[0].PMO.map((t: any) => t.id_metal);
      const karat = products[0].PMO.map((t: any) => t.id_karat).filter((t: any) => t !== null);
  
      const metal_tone = await MetalTone.findAll({
        where: {
          id: metalTone.flat().map((t: any) => t),
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
        },
        attributes: [
          "id",
          "name",
          "sort_code",
          "id_metal",
          [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
        ],
        include: [{ model: Image, as: "metal_tone_image", attributes: [],where:{} }],
      });
  
      const metal_karat = await GoldKarat.findAll({
        where: {
          id: karat.flat().map((t: any) => t),
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
        },
        order: [["name", "ASC"]],
        attributes: [
          "id",
          "name",
          "id_metal",
          [Sequelize.literal("karat_image.image_path"), "image_path"],
        ],
        include: [{required: false, model: Image, as: "karat_image", attributes: [],where:{} }],
      });
  
      const metals = await MetalMaster.findAll({
        where: {
          id: metal.flat().map((t: any) => t),
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
        },
        attributes: ["id", "name"],
        order: [["id", "ASC"]],
      });
  
    const caratSize = await DiamondCaratSize.findAll({
      where: { is_deleted: DeletedStatus.No, id:  products.map((value:any) => value.setting_diamond_sizes)},
      order: [["sort_code", "ASC"]],
      attributes: ["id", "value", "slug", "sort_code", [Sequelize.literal("diamond_carat_image.image_path"), "image_path"]],
      include: [{ model: Image, as: "diamond_carat_image", attributes: [] }],
     })
  
    const diamondShape = await DiamondShape.findAll({
      where: { is_deleted: DeletedStatus.No, id:  products.map((value:any) => value.setting_diamond_shapes)},
      attributes: ["id", "name", "slug", "sort_code", [Sequelize.literal("diamond_shape_image.image_path"), "image_path"]],
      include: [{ model: Image, as: "diamond_shape_image", attributes: [] }],
      order: [["id", "ASC"]],
    })

    const findDiamondColorClarity = products?.map((t: any) => {
      const data = t?.PDO?.map((v: any) => {
        return {
          color: v?.diamond_color,
          clarity: v?.diamond_clarity
        }
      })
      return data
    })[0]

    const diamondColorClarity = findDiamondColorClarity.filter(
      (item, index, self) =>
          index === self.findIndex(
              (t) => JSON.stringify(t) === JSON.stringify(item)
          )
  );
    return resSuccess({
      data: {
        products:productList,
        side_settings: {
          size, metal_tone,
        metal_karat,
        metals, carat_size: caratSize, diamond_shape: diamondShape,
        diamond_color_clarity: diamondColorClarity
      }
      }
      })
      
  } catch (error) {
    console.log("------------", error)

    throw error
  }
}
    
export const getProductQuantityDetails = async (req: Request) => {
  try {
    const products:any = await dbContext.query(
      `SELECT 
        p.id,
        p.sku,
        p.name,
        p.slug,
        jsonb_agg(
        DISTINCT jsonb_build_object(
            'id', PMO.id,
            'variant_id', PMO.id,
            'total_quantity', PMO.quantity,
            'remain_quantity_count', PMO.remaing_quantity_count,
            'order_quantity_count', COALESCE(sub.order_quantity_count, 0),
          'metal', metal.name,
          'karat', karat.name,
          'order_detail', sub.order_detail
          )
        ) AS PMO
      FROM products AS p
      LEFT JOIN product_metal_options AS PMO ON PMO.id_product = p.id
      LEFT JOIN metal_masters as metal ON metal.id = PMO.id_metal
      LEFT JOIN gold_kts as karat ON karat.id = PMO.id_karat
      LEFT JOIN (
        SELECT 
          OD.variant_id,
          OD.product_id,
          COUNT(OD.quantity) AS order_quantity_count,
        jsonb_agg(DISTINCT
          jsonb_build_object('id', orders.id, 'order_number', orders.order_number, 'quantity', OD.quantity)) as order_detail
        FROM order_details AS OD
        LEFT JOIN orders ON orders.id = OD.order_id
        WHERE (OD.order_details_json ->> 'product_type') = '${AllProductTypes.Product}'
        GROUP BY OD.product_id, OD.variant_id
      ) AS sub ON sub.product_id = p.id AND sub.variant_id = PMO.id
      WHERE p.is_deleted = '${DeletedStatus.No}' 
        AND is_quantity_track IS TRUE 
        AND p.sku = '${req.params.sku}'
      GROUP BY p.id, p.sku, p.name, p.slug
      ORDER BY p.id DESC;`,
      { type: QueryTypes.SELECT }
    )
    return resSuccess({ data: products[0] });
  } catch (error) {
    throw error
  }
}

export const bulkUploadSampleFileColumns = async (req: Request) => {
  try { 

    const { type } = req.params;
    const diamondGroupMasters = [
    "stone",
    "shape",
    "seive_size",
    "mm_size",
    "carat",
    "min_carat_range",
    "max_carat_range",
    "average_carat",
    "color",
    "clarity",
    "cuts",
    "natural_rate",
    "synthetic_rate",
    ]
    
    const dynamicProduct = [
    "is_parent",
    "category",
    "sub_category",
    "sub_sub_category",
    "name",
    "sku",
    "parent_sku",
    "is_customization",
    "collection",
    "tag",
    "short_description",
    "long_description",
    "labour_charge",
    "finding_charge",
    "other_charge",
    "setting_style_type",
    "size",
    "length",
    "metal",
    "karat",
    "metal_tone",
    "metal_weight",
    "quantity",
    "stone",
    "shape",
    "mm_size",
    "color",
    "clarity",
    "cut",
    "stone_type",
    "stone_setting",
    "stone_weight",
    "stone_count",
    "gender",
    "meta_title",
    "meta_description",
    "meta_tag",
    "additional_detail",
    "certification",
    "shipping_days",
    ]
    
    const variantProduct = [
    "is_parent",
    "category",
    "sub_category",
    "sub_sub_category",
    "title",
    "sku",
    "brand",
    "collection",
    "gender",
    "tag",
    "short_description",
    "long_description",
    "setting_style_type",
    "quantity_track",
    "size",
    "length",
    "metal",
    "karat",
    "metal_tone",
    "metal_weight",
    "quantity",
    "side_dia_weight",
    "side_dia_count",
    "retail_price",
    "compare_price",
    "stone_type",
    "stone",
    "stone_category",
    "certification",
    "shape",
    "mm_size",
    "color",
    "clarity",
    "cut",
    "stone_setting",
    "stone_weight",
    "stone_count",
    "meta_title",
    "meta_description",
    "meta_tag",
    "additional_detail",
    "shipping_days",
    ]
    
    const chooseSettingProduct = [
    "is_parent",
    "category",
    "sub_category",
    "sub_sub_category",
    "title",
    "sku",
    "brand",
    "collection",
    "gender",
    "tag",
    "short_description",
    "long_description",
    "setting_style_type",
    "is_single",
    "is_3d_product",
    "is_band",
    "setting_diamond_shapes",
    "setting_diamond_sizes",
    "quantity_track",
    "size",
    "length",
    "metal",
    "karat",
    "metal_tone",
    "metal_weight",
    "band_metal_weight",
    "quantity",
    "side_dia_weight",
    "side_dia_count",
    "center_diamond_price",
    "retail_price",
    "compare_price",
    "band_price",
    "stone_type",
    "stone",
    "stone_category",
    "certification",
    "shape",
    "mm_size",
    "color",
    "clarity",
    "cut",
    "stone_setting",
    "stone_weight",
    "stone_count",
    "meta_title",
    "meta_description",
    "meta_tag",
    "additional_detail"
    ]
    
    const dynamicChooseSettingProduct = [
    "is_parent",
    "category",
    "sub_category",
    "sub_sub_category",
    "name",
    "sku",
    "parent_sku",
    "is_customization",
    "collection",
    "tag",
    "short_description",
    "long_description",
    "labour_charge",
    "finding_charge",
    "other_charge",
    "setting_style_type",
    "is_single",
    "is_3d_product",
    "is_band",
    "setting_diamond_shapes",
    "setting_diamond_sizes",
    "size",
    "length",
    "head_no",
    "shank_no",
    "band_no",
    "style_no",
    "product_type",
    "KT_9",
    "KT_10",
    "KT_14",
    "KT_18",
    "KT_22",
    "silver",
    "platinum",
    "metal_tone",
    "quantity",
    "diamond_is_band",
    "stone",
    "shape",
    "mm_size",
    "color",
    "clarity",
    "cut",
    "stone_type",
    "stone_setting",
    "stone_weight",
    "stone_count",
    "gender",
    "meta_title",
    "meta_description",
    "meta_tag",
    "additional_detail",
    "certification",
    "shipping_days",
    ]
    
    const ringConfigurator = [
    "parent_sku_details",
    "product_type",
    "product_style",
    "shank_type",
    "setting_type",
    "head_type",
    "center_dia_wt",
    "center_dia_shape",
    "center_dia_mm_size",
    "center_natural_dia_clarity_color",
    "center_lab_grown_dia_clarity_color",
    "center_dia_count",
    "natural_january",
    "synthetic_january",
    "natural_february",
    "synthetic_february",
    "natural_march",
    "synthetic_march",
    "natural_april",
    "synthetic_april",
    "natural_may",
    "synthetic_may",
    "natural_june",
    "synthetic_june",
    "natural_july",
    "synthetic_july",
    "natural_august",
    "synthetic_august",
    "natural_september",
    "synthetic_september",
    "natural_october",
    "synthetic_october",
    "natural_november",
    "synthetic_november",
    "natural_december",
    "synthetic_december",
    "side_dia_prod_type",
    "product_dia_type",
    "product_dia_shape",
    "product_dia_mm_size",
    "product_dia_clarity",
    "product_dia_color",
    "product_dia_cut",
    "product_dia_carat",
    "product_dia_cost",
    "product_dia_count",
    "head_no",
    "shank_no",
    "band_no",
    "style_no",
    "style_no_WB",
    "short_description",
    "long_description",
    "head_shank",
    "KT_9",
    "KT_10",
    "KT_14",
    "KT_18",
    "KT_22",
    "silver",
    "platinum",
    "metal_tone",
    "labour_charge",
    "other_charge",
    "Margin",
    "product_total_diamond",
    "render_folder_name",
    ]
    
    const threeStoneConfigurator = [
    "parent_sku_details",
    "product_type",
    "product_style",
    "shank_type",
    "setting_type",
    "head_type",
    "center_dia_wt",
    "center_dia_shape",
    "center_dia_mm_size",
    "center_natural_dia_clarity_color",
    "center_lab_grown_dia_clarity_color",
    "center_dia_count",
    "natural_january",
    "synthetic_january",
    "natural_february",
    "synthetic_february",
    "natural_march",
    "synthetic_march",
    "natural_april",
    "synthetic_april",
    "natural_may",
    "synthetic_may",
    "natural_june",
    "synthetic_june",
    "natural_july",
    "synthetic_july",
    "natural_august",
    "synthetic_august",
    "natural_september",
    "synthetic_september",
    "natural_october",
    "synthetic_october",
    "natural_november",
    "synthetic_november",
    "natural_december",
    "synthetic_december",
    "side_dia_prod_type",
    "product_dia_type",
    "product_dia_shape",
    "product_dia_mm_size",
    "product_dia_clarity",
    "product_dia_color",
    "product_dia_cut",
    "product_dia_carat",
    "product_dia_cost",
    "product_dia_count",
    "head_no",
    "shank_no",
    "band_no",
    "style_no",
    "style_no_WB",
    "short_description",
    "long_description",
    "head_shank",
    "KT_9",
    "KT_10",
    "KT_14",
    "KT_18",
    "KT_22",
    "silver",
    "platinum",
    "metal_tone",
    "labour_charge",
    "other_charge",
    "Margin",
    "product_total_diamond",
    "render_folder_name",
  ]

  const eternityBandConfigurator = [
    "parent_sku_details",
    "product_type",
    "product_size",
    "product_length",
    "setting_type",
    "dia_wt",
    "dia_shape",
    "dia_mm_size",
    "natural_dia_clarity_color",
    "lab_grown_dia_clarity_color",
    "product_combination_type",
    "product_total_dia_count",
    "dia_count",
    "alternate_dia_count",
    "natural_january",
    "synthetic_january",
    "natural_february",
    "synthetic_february",
    "natural_march",
    "synthetic_march",
    "natural_april",
    "synthetic_april",
    "natural_may",
    "synthetic_may",
    "natural_june",
    "synthetic_june",
    "natural_july",
    "synthetic_july",
    "natural_august",
    "synthetic_august",
    "natural_september",
    "synthetic_september",
    "natural_october",
    "synthetic_october",
    "natural_november",
    "synthetic_november",
    "natural_december",
    "synthetic_december",
    "style_no",
    "short_description",
    "long_description",
    "KT_9",
    "KT_10",
    "KT_14",
    "KT_18",
    "KT_22",
    "silver",
    "platinum",
    "metal_tone",
    "labour_charge",
    "other_charge",
    ]
    
  const braceletConfigurator = [
    "parent_sku_details",
    "product_type",
    "product_style",
    "style_no",
    "bracelet_no",
    "product_length",
    "setting_type",
    "hook_type",
    "dia_display_wt",
    "alternate_stone",
    "product_dia_type",
    "product_dia_shape",
    "product_dia_mm_size",
    "product_dia_carat",
    "product_dia_count",
    "natural_dia_clarity_color",
    "lab_grown_dia_clarity_color",
    "natural_january",
    "synthetic_january",
    "natural_february",
    "synthetic_february",
    "natural_march",
    "synthetic_march",
    "natural_april",
    "synthetic_april",
    "natural_may",
    "synthetic_may",
    "natural_june",
    "synthetic_june",
    "natural_july",
    "synthetic_july",
    "natural_august",
    "synthetic_august",
    "natural_september",
    "synthetic_september",
    "natural_october",
    "synthetic_october",
    "natural_november",
    "synthetic_november",
    "natural_december",
    "synthetic_december",
    "metal_weight_type",
    "KT_9",
    "KT_10",
    "KT_14",
    "KT_18",
    "KT_22",
    "silver",
    "platinum",
    "labour_charge",
  ]

  const earringConfigurator = [
        "parent_sku_details",
        "product_style",
        "huggies_setting_type",
        "setting_type",
        "center_dia_wt",
        "center_dia_shape",
        "center_dia_mm_size",
        "center_dia_count",
        "side_dia_prod_type",
        "side_dia_shape",
        "side_dia_mm_size",
        "side_dia_carat",
        "side_dia_count",
        "style_no",
        "huggies_no",
        "drop_no",
        "KT_9",
        "KT_14",
        "KT_18",
        "silver",
        "platinum",
        "sort_description",
        "long_description",
        "labour_charge",
        "other_charge",
    ]
  const looseDiamond = [
    "stock #",
    "stone",
    "stone type",
    "Availability",
    "shape",
    "weight",
    "color",
    "clarity",
    "mm_size",
    "seive_size",
    "cut grade",
    "polish",
    "Symmetry",
    "Fluorescence Intensity",
    "Fluorescence color",
    "measurements",
    "lab",
    "Certificate",
    "Certificate url",
    "image link",
    "video link",
    "fancy color",
    "fancy color intensity",
    "fancy color overtone",
    "depth %",
    "Table %",
    "Girdle %",
    "culet size",
    "Sort Description",
    "Long Description",
    "Country",
    "State",
    "City",
    "In matched pair separable",
    "pair stock #",
    "Growth type",
    "total price",
    "price/ct",
    "quantity",
    ]
    const birthStoneProduct = [
    "is_parent",
    "category",
    "sub_category",
    "sub_sub_category",
    "gemstone_count",
    "engraving_count",
    "name",
    "glb_name",
    "style_no",
    "tag",
    "sort_description",
    "long_description",
    "making_charge",
    "finding_charge",
    "other_charge",
    "metal",
    "karat",
    "metal_tone",
    "metal_weight",
    "PLU_NO",
    "price",
    "stone_type",
    "stone",
    "shape",
    "mm_size",
    "color",
    "clarity",
    "cut",
    "carat",
    "stone_count",
    "stone_cost",
    "engraving_lable",
    "engraving_character_count",
    "discount_type",
    "discount_value",
    "image"]

    const studConfigProduct = [
      "parent_sku_details",
      "product_style",
      "huggies_setting_type",
      "setting_type",
      "center_dia_wt",
      "center_dia_shape",
      "center_dia_mm_size",
      "center_dia_count",
      "side_dia_prod_type",
      "side_dia_shape",
      "side_dia_mm_size",
      "side_dia_carat",
      "side_dia_count",
      "style_no",
      "huggies_no",
      "drop_no",
      "KT_9",
      "KT_14",
      "KT_18",
      "silver",
      "platinum",
      "sort_description",
      "long_description",
      "labour_charge",
      "other_charge"
    ]

    const pendantConfigProduct = [
      "parent_sku_details",
      "bale_type",
      "design_type",
      "center_dia_wt",
      "center_dia_shape",
      "center_dia_mm_size",
      "center_dia_count",
      "side_dia_prod_type",
      "side_dia_shape",
      "side_dia_mm_size",
      "side_dia_carat",
      "side_dia_count",
      "style_no",
      "KT_9",
      "KT_14",
      "KT_18",
      "silver",
      "platinum",
      "sort_description",
      "long_description",
      "labour_charge",
      "other_charge"
    ]
    
    let data

    switch (type) {
  case sampleFileType.DiamondGroupMater:
    data = diamondGroupMasters;
    break;
  case sampleFileType.DynamicProduct:
    data = dynamicProduct;
    break;
  case sampleFileType.VariantProduct:
    data = variantProduct;
    break;
  case sampleFileType.ChooseSettingRetailProduct:
    data = chooseSettingProduct;
    break;
  case sampleFileType.ChooseSettingDynamicProduct:
    data = dynamicChooseSettingProduct;
    break;
  case sampleFileType.RingConfigurator:
    data = ringConfigurator;
    break;
  case sampleFileType.ThreeStoneConfigurator:
    data = threeStoneConfigurator;
    break;
  case sampleFileType.EarringConfigurator:
    data = earringConfigurator;
    break;
  case sampleFileType.BraceletConfigurator:
    data = braceletConfigurator;
    break;
  case sampleFileType.EternityBandConfigurator:
    data = eternityBandConfigurator;
    break;
  case sampleFileType.LooseDiamond:
    data = looseDiamond;
    break;
  case sampleFileType.BirthStoneProduct:
    data = ringConfigurator;
    break;   
  case sampleFileType.BirthStoneProduct:
    data = birthStoneProduct;
    break;   
  case sampleFileType.StudConfigProduct:
    data = studConfigProduct;
    break;   
  case sampleFileType.PendantConfigProduct:
    data = pendantConfigProduct;
    break;   
  default:
    data = diamondGroupMasters
}

    return resSuccess({ data })
  }catch (error) {
    throw error;
  }
}

export const updateRingConfiguratorProductHeadNumber = async (req: Request) => {
  try {
    const data: any = req.body.products;
    
    for (const key of data) {
      await dbContext.query(`UPDATE config_products
          SET head_no = '${key?.new_head_number}'
          FROM heads,
              shanks,
              side_setting_styles,
              diamond_group_masters DGM,
              carat_sizes,
              diamond_shapes
          WHERE heads.id = head_type_id
            AND shanks.id = shank_type_id
            AND side_setting_styles.id = config_products.side_setting_id
            AND DGM.id = center_diamond_group_id
            AND carat_sizes.id = DGM.id_carat
            AND diamond_shapes.id = DGM.id_shape
            AND heads.name ILIKE '${key?.head}'
            AND shanks.name ILIKE '${key?.shank}'
            AND side_setting_styles.name ILIKE '${key?.setting}'
            AND diamond_shapes.name ILIKE '${key?.diamond_shape}'
            AND carat_sizes.value ILIKE '${key?.diamond_size}'
            
            `, { type: QueryTypes.INSERT })
    }
    return resSuccess({ message: "Product head number updated successfully" });
   } catch (error) {
    throw error;
  }
}