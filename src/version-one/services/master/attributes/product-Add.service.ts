import { Request } from "express";
import { col, fn, Op, QueryTypes, Sequelize } from "sequelize";
import {
  getCompanyIdBasedOnTheCompanyKey,
  resSuccess,
  resUnknownError,
} from "../../../../utils/shared-functions";
import {
  ActiveStatus,
  AllProductTypes,
  ConfigStatus,
  ConfiguratorManageKeys,
  DeletedStatus,
  OrderStatus,
  PRODUCT_IMAGE_TYPE,
  PaymentStatus,
} from "../../../../utils/app-enumeration";
import { s3UploadObject } from "../../../../helpers/s3-client.helper";
import { DEFAULT_STATUS_CODE_SUCCESS } from "../../../../utils/app-messages";
import { CategoryData } from "../../../model/category.model";
import { Tag } from "../../../model/master/attributes/tag.model";
import { Image } from "../../../model/image.model";
import { SettingTypeData } from "../../../model/master/attributes/settingType.model";
import { SizeData } from "../../../model/master/attributes/item-size.model";
import { LengthData } from "../../../model/master/attributes/item-length.model";
import { MetalMaster } from "../../../model/master/attributes/metal/metal-master.model";
import { MetalTone } from "../../../model/master/attributes/metal/metalTone.model";
import { GoldKarat } from "../../../model/master/attributes/metal/gold-karat.model";
import { MMSizeData } from "../../../model/master/attributes/mmSize.model";
import { StoneData } from "../../../model/master/attributes/gemstones.model";
import { CutsData } from "../../../model/master/attributes/cuts.model";
import { Colors } from "../../../model/master/attributes/colors.model";
import { ClarityData } from "../../../model/master/attributes/clarity.model";
import { DiamondCaratSize } from "../../../model/master/attributes/caratSize.model";
import { DiamondGroupMaster } from "../../../model/master/attributes/diamond-group-master.model";
import { DiamondShape } from "../../../model/master/attributes/diamondShape.model";
import { SettingCaratWeight } from "../../../model/master/attributes/settingCaratWeight.model";
import { SieveSizeData } from "../../../model/master/attributes/seiveSize.model";
import { BrandData } from "../../../model/master/attributes/brands.model";
import { Collection } from "../../../model/master/attributes/collection.model";
import { Orders } from "../../../model/order.model";
import { Enquiries } from "../../../model/enquiries.model";
import { HeadsData } from "../../../model/master/attributes/heads.model";
import { ShanksData } from "../../../model/master/attributes/shanks.model";
import { SideSettingStyles } from "../../../model/master/attributes/side-setting-styles.model";
import dbContext from "../../../../config/db-context";
const { imageToWebp } = require("image-to-webp");
const fs = require("fs");
export const addProductDropdown = async (req: Request) => {
  try {

    let where = [{ is_deleted: DeletedStatus.No }, { is_active: ActiveStatus.Active }];

    const categoryList = await CategoryData.findAll({
      where,
      attributes: [
        "id",
        "parent_id",
        "category_name",
        "slug",
        "is_setting_style",
        [Sequelize.literal(`"categories"."is_size"`), "is_size"],
        [Sequelize.literal(`"categories"."is_length"`), "is_length"],
        [
          Sequelize.literal(
            `CASE WHEN "categories"."id_size" IS NULL THEN '{}'::int[] ELSE string_to_array("categories"."id_size", '|')::int[] END`
          ),
          "id_size",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "categories"."id_length" IS NULL THEN '{}'::int[] ELSE string_to_array("categories"."id_length", '|')::int[] END`
          ),
          "id_length",
        ],
        [Sequelize.literal("image.image_path"), "image_path"],
        "is_searchable",
        [
          Sequelize.literal("parent_category.category_name"),
          "parent_category_name",
        ],
      ],
      include: [
        { model: Image, as: "image", attributes: [], required: false },
        { model: CategoryData, as: "parent_category", attributes: [], required: false },
      ],  
    });

    const keyWords = await Tag.findAll({
      where,
      attributes: ["id", "name"],
    });

    const setting_type_list = await SettingTypeData.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        [Sequelize.literal("setting_type_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "setting_type_image", attributes: [], required: false }],
    });

    const item_size = await SizeData.findAll({
      where,
      attributes: ["id", "size", "slug"],
    });

    const item_length = await LengthData.findAll({
      where,
      attributes: ["id", "length", "slug"],
    });

    const metal_list = await MetalMaster.findAll({
      where,
      order: [["id", "ASC"]],
      attributes: ["id", "name", "metal_rate"],
    });

    const metal_karat = await GoldKarat.findAll({
      where,
      attributes: ["id", "name"],
    });
    const MM_Size = await MMSizeData.findAll({
      where,
      attributes: ["id", "value", "slug"],
    });
    const stone = await StoneData.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        "gemstone_type",
        "is_diamond",
        [Sequelize.literal("stone_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "stone_image", attributes: [], required: false }],
    });

    const stone_cut = await CutsData.findAll({
      where,
      attributes: ["id", "value", "slug"],
    });

    const stone_clarity = await ClarityData.findAll({
      where,
      attributes: ["id", "value", "name", "slug"],
    });

    const stone_color = await Colors.findAll({
      where,
      attributes: ["id", "value", "name", "slug"],
    });

    const stone_shape = await DiamondShape.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        [Sequelize.literal("diamond_shape_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "diamond_shape_image", attributes: [], required: false }],
    });

    const stone_setting = await SettingCaratWeight.findAll({
      where,
      attributes: ["id", "value", "slug"],
    });

    const diamond_master = await DiamondGroupMaster.findAll({
      where,
      attributes: [
        "id",
        "name",
        "id_stone",
        "id_color",
        "id_shape",
        "id_mm_size",
        "id_clarity",
        "id_carat",
        "id_cuts",
        "rate",
        "synthetic_rate",
        "min_carat_range",
        "max_carat_range",
        [Sequelize.literal(`"carats"."value"`), "carat"],
      ],
      include: [
        {
          model: DiamondCaratSize,
          as: "carats",
          attributes: [],
          required: false
        },
      ]
    });

    const metal_tone = await MetalTone.findAll({
      where,
      attributes: ["id", "name", "id_metal"],
    });

    const carat_size = await DiamondCaratSize.findAll({
      where,
      attributes: ["id", ["value", "name"], "slug", "sort_code"],
    });

    const stone_seive = await SieveSizeData.findAll({
      where,
      attributes: ["id", ["value", "name"], "slug", "sort_code"],
    });

    const brands = await BrandData.findAll({
      where,
      attributes: ["id", "name", "slug"],
    });

    const collection = await Collection.findAll({
      where,
      attributes: ["id", "name", "slug"],
    });

    return resSuccess({
      data: {
        categoryList,
        keyWords,
        setting_type_list,
        item_size,
        item_length,
        metal_list,
        stone,
        metal_karat,
        stone_seive,
        stone_clarity,
        stone_color,
        stone_cut,
        stone_shape,
        diamond_master,
        stone_setting,
        MM_Size,
        metal_tone,
        carat_size,
        brands,
        collection,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const dashboardAPI = async (req: Request) => {
  try {

    const today = new Date();
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfTwoWeeksAgo = new Date(startOfThisWeek);
    startOfTwoWeeksAgo.setDate(startOfTwoWeeksAgo.getDate() - 14);

    /* ------------------------- new order ------------------------ */
    const new_order = await Orders.count({
      where: { order_status: OrderStatus.Pendding },
    });

    // find % of last week for New Order
    // Current week order count
    const thisWeekNewOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Pendding,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekNewOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Pendding,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let newOrderPercentChange = 0;

    if ((thisWeekNewOrders > 0 && lastWeekNewOrders > 0) || (lastWeekNewOrders > 0 && thisWeekNewOrders == 0)) {
      newOrderPercentChange = ((thisWeekNewOrders - lastWeekNewOrders) / lastWeekNewOrders) * 100;
    } else {
      if (lastWeekNewOrders == 0 && thisWeekNewOrders > 0) {
        newOrderPercentChange = 100
      }
    }

    /* ------------------------- Confirm order ------------------------ */

    const Confirm_order = await Orders.count({
      where: { order_status: OrderStatus.Confirmed },
    });

    // find % of last week for Confirm Order
    // Current week order count
    const thisWeekConfirmOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Confirmed,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekConfirmOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Confirmed,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let confirmOrderPercentChange = 0;

    if ((thisWeekConfirmOrders > 0 && lastWeekConfirmOrders > 0) || (lastWeekConfirmOrders > 0 && thisWeekConfirmOrders == 0)) {
      confirmOrderPercentChange = ((thisWeekConfirmOrders - lastWeekConfirmOrders) / lastWeekConfirmOrders) * 100;
    } else {
      if (lastWeekConfirmOrders == 0 && thisWeekConfirmOrders > 0) {
        confirmOrderPercentChange = 100
      }
    }

    /* ------------------------- In process order ------------------------ */

    const In_process_order = await Orders.count({
      where: { order_status: OrderStatus.Processing },
    });

    // find % of last week for In process Order
    // Current week order count
    const thisWeekInProgressOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Processing,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekInProgressOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Processing,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let inProcessOrderPercentChange = 0;

    if ((thisWeekInProgressOrders > 0 && lastWeekInProgressOrders > 0) || (lastWeekInProgressOrders > 0 && thisWeekInProgressOrders == 0)) {
      inProcessOrderPercentChange = ((thisWeekInProgressOrders - lastWeekInProgressOrders) / lastWeekInProgressOrders) * 100;
    } else {
      if (lastWeekInProgressOrders == 0 && thisWeekInProgressOrders > 0) {
        inProcessOrderPercentChange = 100
      }
    }
    /* ------------------------- Out of delivery order ------------------------ */
    const out_of_delivery_order = await Orders.count({
      where: { order_status: OrderStatus.OutOfDeliver },
    });

    // find % of last week for In process Order
    // Current week order count
    const thisWeekOutFoDeliveryOrders = await Orders.count({
      where: {
        order_status: OrderStatus.OutOfDeliver,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekOutFoDeliveryOrders = await Orders.count({
      where: {
        order_status: OrderStatus.OutOfDeliver,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let outOfDeliveryOrderPercentChange = 0;

    if ((thisWeekOutFoDeliveryOrders > 0 && lastWeekOutFoDeliveryOrders > 0) || (lastWeekOutFoDeliveryOrders > 0 && thisWeekOutFoDeliveryOrders == 0)) {
      outOfDeliveryOrderPercentChange = ((thisWeekOutFoDeliveryOrders - lastWeekOutFoDeliveryOrders) / lastWeekOutFoDeliveryOrders) * 100;
    } else {
      if (lastWeekOutFoDeliveryOrders == 0 && thisWeekOutFoDeliveryOrders > 0) {
        outOfDeliveryOrderPercentChange = 100
      }
    }

    /* ------------------------- Delivery order ------------------------ */
    const delivery_order = await Orders.count({
      where: { order_status: OrderStatus.Delivered },
    });

    // find % of last week for In process Order
    // Current week order count
    const thisWeekDeliveryOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Delivered,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekDeliveryOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Delivered,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let deliveryOrderPercentChange = 0;

    if ((thisWeekDeliveryOrders > 0 && lastWeekDeliveryOrders > 0) || (lastWeekDeliveryOrders > 0 && thisWeekDeliveryOrders == 0)) {
      deliveryOrderPercentChange = ((thisWeekDeliveryOrders - lastWeekDeliveryOrders) / lastWeekDeliveryOrders) * 100;
    } else {
      if (lastWeekDeliveryOrders == 0 && thisWeekDeliveryOrders > 0) {
        deliveryOrderPercentChange = 100
      }
    }

    /* ------------------------- Cancel order ------------------------ */
    const cancel_order = await Orders.count({
        where: { order_status: OrderStatus.Canceled },
    });

    // find % of last week for In process Order
    // Current week order count
    const thisWeekCancelOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Canceled,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekCancelOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Canceled,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let cancelOrderPercentChange = 0;

    if ((thisWeekCancelOrders > 0 && lastWeekCancelOrders > 0) || (lastWeekCancelOrders > 0 && thisWeekCancelOrders == 0)) {
      cancelOrderPercentChange = ((thisWeekCancelOrders - lastWeekCancelOrders) / lastWeekCancelOrders) * 100;
    } else {
      if (lastWeekCancelOrders == 0 && thisWeekCancelOrders > 0) {
        cancelOrderPercentChange = 100
      }
    }

    /* ------------------------- Return order ------------------------ */
    const return_order = await Orders.count({
      where: { order_status: OrderStatus.Returned },
    });

    // find % of last week for In process Order
    // Current week order count
    const thisWeekReturnOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Returned,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekReturnOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Returned,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let returnOrderPercentChange = 0;

    if ((thisWeekReturnOrders > 0 && lastWeekReturnOrders > 0) || (lastWeekReturnOrders > 0 && thisWeekReturnOrders == 0)) {
      returnOrderPercentChange = ((thisWeekReturnOrders - lastWeekReturnOrders) / lastWeekReturnOrders) * 100;
    } else {
      if (lastWeekReturnOrders == 0 && thisWeekReturnOrders > 0) {
        returnOrderPercentChange = 100
      }
    }

    /* ------------------------- Failed order ------------------------ */
    const failed_order = await Orders.count({
      where: { order_status: OrderStatus.Failed },
    });

    // find % of last week for In process Order
    // Current week order count
    const thisWeekFailedOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Failed,
        created_date: {
          [Op.gte]: startOfThisWeek,
        },
      },
    });

    // Last week order count
    const lastWeekFailedOrders = await Orders.count({
      where: {
        order_status: OrderStatus.Failed,
        created_date: {
          [Op.gte]: startOfLastWeek,
          [Op.lt]: startOfThisWeek,
        },
      },
    });
    let failedOrderPercentChange = 0;

    if ((thisWeekFailedOrders > 0 && lastWeekFailedOrders > 0) || (lastWeekFailedOrders > 0 && thisWeekFailedOrders == 0)) {
      failedOrderPercentChange = ((thisWeekFailedOrders - lastWeekFailedOrders) / lastWeekFailedOrders) * 100;
    } else {
      if (lastWeekFailedOrders == 0 && thisWeekFailedOrders > 0) {
        failedOrderPercentChange = 100
      }
    }

    const total_order = await Orders.count();

    const revenue = await dbContext.query(
      `SELECT sum(order_amount) AS total FROM order_transactions AS OT WHERE OT.payment_status = ${PaymentStatus.paid}`,
      { type: QueryTypes.SELECT }
    );

    const total_revenue = revenue[0];
    const top_selling_product = await dbContext.query(
      `SELECT OD.product_id, products.name, products.sku, products.slug, count(OD.product_id) AS 	order_count , (SELECT product_images.image_path FROM product_images WHERE product_images.id_product = OD.product_id AND product_images.image_type = ${PRODUCT_IMAGE_TYPE.Feature} LIMIT 1) FROM order_details as OD INNER JOIN products ON products.id = OD.product_id WHERE (OD.order_details_json ->> 'product_type') = '${AllProductTypes.Product}' AND products.is_active = '${ActiveStatus.Active}' AND products.is_deleted = '${DeletedStatus.No}' GROUP BY OD.product_id, products.name, products.sku, products.slug ORDER BY count(OD.product_id) DESC LIMIT 10`,
      { type: QueryTypes.SELECT }
    );

    const items = await dbContext.query(
      `SELECT sum(order_details.quantity) AS item FROM order_details`,
      { type: QueryTypes.SELECT }
    );

    const total_items = items[0];

    const startDateFilter: any =
      req.query.start_date != undefined ? req.query.start_date : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDateFilter: any = req.query.end_date != undefined ? req.query.end_date : new Date();
    const endDate = new Date(endDateFilter);
    endDate.setDate(endDate.getDate() + 1);

    const enquiries = await Enquiries.findAll({
      attributes: [
        [fn('DATE', col('created_date')), 'date'],
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('created_date'))],
      order: [Sequelize.literal('DATE("created_date") ASC')]
    });

    const orderRevenue = await Orders.findAll({
      where: [
        { payment_status: PaymentStatus.paid },
        req.query.start_date && req.query.end_date ?
          {
            order_date: {
              [Op.between]: [startDateFilter, endDate]
            }
          } : {}
      ],
      attributes: [
        [fn('TO_CHAR', fn('DATE_TRUNC', 'month', col('created_date')), 'FMMonth'), 'month'],
        [fn('TO_CHAR', fn('DATE_TRUNC', 'month', col('created_date')), 'YYYY'), 'year'],
        [Sequelize.literal(`COALESCE(AVG(order_total / currency_rate), 0)`), 'avg_revenue']
      ],
      group: [fn('DATE_TRUNC', 'month', col('created_date'))],
      order: [[Sequelize.literal(`DATE_TRUNC('month', "created_date")`), 'ASC']],
      raw: true,
    });


    // 1. Create a map for quick lookup
    const revenueMap = new Map(
      orderRevenue.map((item:any) => [`${item.month}-${item.year}`, parseFloat(item.avg_revenue)])
    );

    // 2. Convert month name to number for sorting
    const monthNameToNumber = (monthName:any) => new Date(`${monthName} 1, 2000`).getMonth();

    // 3. Find min and max year/month from data
    const sortedDates = orderRevenue
      .map((item:any) => {
        const monthNum = monthNameToNumber(item?.month);
        return new Date(parseInt(item?.year), monthNum, 1);
      })
      .sort((a:any, b:any) => a - b);

    const startDate = sortedDates[0];
    const endDateValue = sortedDates[sortedDates.length - 1];

    // 4. Build the full array from min to max
    const fullMonthArray = [];
    const cursor = new Date(startDate);

    while (cursor <= endDateValue) {
      const month = cursor.toLocaleString('default', { month: 'long' });
      const year = cursor.getFullYear().toString();
      const key = `${month}-${year}`;

      fullMonthArray.push({
        month,
        year,
        avg_revenue: revenueMap.get(key) || 0
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return resSuccess({
      data: {
        new_order,
        new_order_last_week: { last_week: lastWeekNewOrders, this_week: thisWeekNewOrders, percentChange: newOrderPercentChange.toFixed(2) },
        Confirm_order,
        confirm_order_last_week: { last_week: lastWeekConfirmOrders, this_week: thisWeekConfirmOrders, percentChange: confirmOrderPercentChange.toFixed(2) },
        In_process_order,
        In_process_order_last_week: { last_week: lastWeekInProgressOrders, this_week: thisWeekInProgressOrders, percentChange: inProcessOrderPercentChange.toFixed(2) },
        out_of_delivery_order,
        out_of_delivery_order_last_week: { last_week: lastWeekOutFoDeliveryOrders, this_week: thisWeekOutFoDeliveryOrders, percentChange: outOfDeliveryOrderPercentChange.toFixed(2) },
        delivery_order,
        delivery_order_last_week: { last_week: lastWeekDeliveryOrders, this_week: thisWeekDeliveryOrders, percentChange: deliveryOrderPercentChange.toFixed(2) },
        cancel_order,
        cancel_order_last_week: { last_week: lastWeekCancelOrders, this_week: thisWeekCancelOrders, percentChange: cancelOrderPercentChange.toFixed(2) },
        return_order,
        return_order_last_week: { last_week: lastWeekReturnOrders, this_week: thisWeekReturnOrders, percentChange: returnOrderPercentChange.toFixed(2) },
        failed_order,
        failed_order_last_week: { last_week: lastWeekFailedOrders, this_week: thisWeekFailedOrders, percentChange: failedOrderPercentChange.toFixed(2) },
        total_order,
        total_revenue,
        total_items,
        top_selling_product,
        enquiries,
        order_revenue: fullMonthArray
      },
    });
  } catch (error) {
    throw error;
  }
};

export const configuratorDropDownData = async (req: Request) => {
  try {
    
    let categoryName = "ring";
    const query: any = req.query;
    let whereConfig: any = [{ is_deleted: DeletedStatus.No }, { is_active: ActiveStatus.Active }];

    if (query.is_config == "1") {
      categoryName = "ring";
      whereConfig = [...whereConfig, { is_config: query.is_config }];
    } else if (query.is_band == "1") {
      categoryName = "eternity band";
      whereConfig = [...whereConfig, { is_band: query.is_band }];
    } else if (query.is_three_stone == "1") {
      categoryName = "ring";
      whereConfig = [...whereConfig, { is_three_stone: query.is_three_stone }];
    } else if (query.is_bracelet == "1") {
      categoryName = "bracelet";
      whereConfig = [...whereConfig, { is_bracelet: query.is_bracelet }];
    } else if (query.is_pendant == "1") {
      categoryName = "pendant";
      whereConfig = [...whereConfig, { is_pendant: query.is_pendant }];
    } else if (query.is_earring == "1") {
      categoryName = "earring";
      whereConfig = [...whereConfig, { is_earring: query.is_earring }];
    } else {
      categoryName = "ring";
      whereConfig = [
        ...whereConfig,
        {
          [Op.or]: [
            { is_config: "1" },
            { is_band: "1" },
            { is_three_stone: "1" },
            { is_bracelet: "1" },
            { is_pendant: "1" },
            { is_earring: "1" },
          ],
        },
      ];
    }

    const gemstoneList = await StoneData.findAll({
      where: whereConfig,
      order: [
        [
          Sequelize.literal(`
            CASE 
              WHEN LOWER(sort_code) IN ('january', 'february', 'march', 'april', 'may', 'june', 
                                        'july', 'august', 'september', 'october', 'november', 'december') 
              THEN TO_DATE(sort_code || '-01', 'Month')
            END
          `),
          'ASC'  // This must be outside the literal!
        ]
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "is_diamond",
        "sort_code",
        "gemstone_type",
        [Sequelize.literal("stone_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "stone_image", attributes: [] }],
    });

    const diamondShapeList = await DiamondShape.findAll({
      where: whereConfig,
      order: [
        Sequelize.literal(
          `CASE WHEN '${query.is_config}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END ASC`
        ),
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] WHEN '${query.is_band}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.EternityBandConfigurator}')), ',')::int[] WHEN '${query.is_bracelet}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.BraceletConfigurator}')), ',')::int[] WHEN '${query.is_pendant}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.PendantConfigurator}')), ',')::int[] WHEN '${query.is_earring}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.EarringConfigurator}')), ',')::int[] WHEN '${query.is_three_stone}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')), ',')::int[] ELSE string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] END`
          ),
          "diamond_size_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (is_diamond::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END`
          ),
          "is_diamond",
        ],
        [Sequelize.literal("diamond_shape_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "diamond_shape_image", attributes: [] }],
    });

    const caratSizeList = await DiamondCaratSize.findAll({
      where: whereConfig,
      order: [["value", "ASC"]],
      attributes: [
        "id",
        "value",
        "slug",
        "sort_code",
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (is_diamond::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (is_diamond::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END`
          ),
          "is_diamond",
        ],
        "is_diamond_shape",
        [Sequelize.literal("diamond_carat_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "diamond_carat_image", attributes: [] }],
    });

    const headList = await HeadsData.findAll({
      where: whereConfig,
      order: [
        Sequelize.literal(
          `CASE WHEN '${query.is_config}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END ASC`
        ),
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] WHEN '${query.is_band}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.EternityBandConfigurator}')), ',')::int[] WHEN '${query.is_bracelet}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.BraceletConfigurator}')), ',')::int[] WHEN '${query.is_pendant}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.PendantConfigurator}')), ',')::int[] WHEN '${query.is_earring}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.EarringConfigurator}')), ',')::int[] WHEN '${query.is_three_stone}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')), ',')::int[] ELSE string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] END`
          ),
          "diamond_size_id",
        ],
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] WHEN '${query.is_band}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.EternityBandConfigurator}')), ',')::int[] WHEN '${query.is_bracelet}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.BraceletConfigurator}')), ',')::int[] WHEN '${query.is_pendant}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.PendantConfigurator}')), ',')::int[] WHEN '${query.is_earring}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.EarringConfigurator}')), ',')::int[] WHEN '${query.is_three_stone}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')), ',')::int[] ELSE string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] END`
          ),
          "diamond_shape_id",
        ],
        [Sequelize.literal("head_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "head_image", attributes: [], required: false }],
    });

    const shankList = await ShanksData.findAll({
      where: whereConfig,
      order: [
        Sequelize.literal(
          `CASE WHEN '${query.is_config}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END ASC`
        ),
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN string_to_array(trim(both '[]' from (side_setting_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] WHEN '${query.is_band}' = '1' THEN string_to_array(trim(both '[]' from (side_setting_id ->> '${ConfiguratorManageKeys.EternityBandConfigurator}')), ',')::int[] WHEN '${query.is_bracelet}' = '1' THEN string_to_array(trim(both '[]' from (side_setting_id ->> '${ConfiguratorManageKeys.BraceletConfigurator}')), ',')::int[] WHEN '${query.is_pendant}' = '1' THEN string_to_array(trim(both '[]' from (side_setting_id ->> '${ConfiguratorManageKeys.PendantConfigurator}')), ',')::int[] WHEN '${query.is_earring}' = '1' THEN string_to_array(trim(both '[]' from (side_setting_id ->> '${ConfiguratorManageKeys.EarringConfigurator}')), ',')::int[] WHEN '${query.is_three_stone}' = '1' THEN string_to_array(trim(both '[]' from (side_setting_id ->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')), ',')::int[] ELSE string_to_array(trim(both '[]' from (side_setting_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] END`
          ),
          "side_setting_id",
        ],

        [Sequelize.literal("shank_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "shank_image", attributes: [], required: false }],
    });

    const sideSettingStyle = await SideSettingStyles.findAll({
      where: whereConfig,
      order: [
        Sequelize.literal(
          `CASE WHEN '${query.is_config}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (sort_order::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (sort_order::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END ASC`
        ),
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] WHEN '${query.is_band}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.EternityBandConfigurator}')), ',')::int[] WHEN '${query.is_bracelet}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.BraceletConfigurator}')), ',')::int[] WHEN '${query.is_pendant}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.PendantConfigurator}')), ',')::int[] WHEN '${query.is_earring}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.EarringConfigurator}')), ',')::int[] WHEN '${query.is_three_stone}' = '1' THEN string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')), ',')::int[] ELSE string_to_array(trim(both '[]' from (diamond_shape_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] END`
          ),
          "diamond_shape",
        ],
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] WHEN '${query.is_band}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.EternityBandConfigurator}')), ',')::int[] WHEN '${query.is_bracelet}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.BraceletConfigurator}')), ',')::int[] WHEN '${query.is_pendant}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.PendantConfigurator}')), ',')::int[] WHEN '${query.is_earring}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.EarringConfigurator}')), ',')::int[] WHEN '${query.is_three_stone}' = '1' THEN string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')), ',')::int[] ELSE string_to_array(trim(both '[]' from (diamond_size_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] END`
          ),
          "diamond_size_id",
        ],

        [
          Sequelize.literal(
            `CASE WHEN "id_shank" IS NULL THEN '{}'::int[] ELSE string_to_array("id_shank", '|')::int[] END`
          ),
          "id_shank",
        ],
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN 
            CASE 
        WHEN (config_image::json->> '${ConfiguratorManageKeys.RingConfigurator}') IS NOT NULL 
        THEN (SELECT image_path FROM images WHERE id = (config_image::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int)
        ELSE "side_setting_image"."image_path" 
      END
            WHEN '${query.is_band}' = '1' THEN 
            CASE 
        WHEN (config_image::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}') IS NOT NULL 
        THEN (SELECT image_path FROM images WHERE id = (config_image::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int)
        ELSE "side_setting_image"."image_path" 
      END
            WHEN '${query.is_bracelet}' = '1' THEN CASE 
        WHEN (config_image::json->> '${ConfiguratorManageKeys.BraceletConfigurator}') IS NOT NULL 
        THEN (SELECT image_path FROM images WHERE id = (config_image::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int)
        ELSE "side_setting_image"."image_path" 
      END
            WHEN '${query.is_pendant}' = '1' THEN CASE 
        WHEN (config_image::json->> '${ConfiguratorManageKeys.PendantConfigurator}') IS NOT NULL 
        THEN (SELECT image_path FROM images WHERE id = (config_image::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int )
        ELSE "side_setting_image"."image_path" 
      END
            WHEN '${query.is_earring}' = '1' THEN CASE 
        WHEN (config_image::json->> '${ConfiguratorManageKeys.EarringConfigurator}') IS NOT NULL 
        THEN (SELECT image_path FROM images WHERE id = (config_image::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int)
        ELSE "side_setting_image"."image_path" 
      END
            WHEN '${query.is_three_stone}' = '1' THEN CASE 
        WHEN (config_image::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}') IS NOT NULL 
        THEN (SELECT image_path FROM images WHERE id = (config_image::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int )
        ELSE "side_setting_image"."image_path" 
      END
            ELSE CASE 
        WHEN (config_image::json->> '${ConfiguratorManageKeys.RingConfigurator}') IS NOT NULL 
        THEN (SELECT image_path FROM images WHERE id = (config_image::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int)
        ELSE "side_setting_image"."image_path" 
      END
            END`
          ),
          "image_path",
        ]
      ],
      include: [{ model: Image, as: "side_setting_image", attributes: [], required: false }],
    });
    const category = await CategoryData.findOne({
      where: [
        { is_deleted: DeletedStatus.No },
        { is_active: ActiveStatus.Active },
        { [Op.and]: [{ category_name: { [Op.iLike]: `${categoryName}%` } }] },
        { parent_id: { [Op.eq]: null } },
      ],
      attributes: [
        "id",
        "parent_id",
        "category_name",
        [
          Sequelize.literal(
            `CASE WHEN "id_size" IS NULL THEN '{}'::int[] ELSE string_to_array("id_size", '|')::int[] END`
          ),
          "id_size",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_length" IS NULL THEN '{}'::int[] ELSE string_to_array("id_length", '|')::int[] END`
          ),
          "id_length",
        ],
      ],
    });

    const metal = await MetalMaster.findAll({
      where: [...whereConfig, { id: { [Op.ne]: 1 } }],
      attributes: ["id", ["id", "id_metal"], "name", "slug", "metal_rate"],
    });

    const GoldKTList = await GoldKarat.findAll({
      where: whereConfig,
      order: [["name", "ASC"]],
      attributes: [
        "id",
        "name",
        "slug",
        ["id", "id_karat"],
        "id_metal",
        [
          Sequelize.literal(
            `CASE WHEN '${query.is_config}' = '1' THEN string_to_array(trim(both '[]' from (metal_tone_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] WHEN '${query.is_band}' = '1' THEN string_to_array(trim(both '[]' from (metal_tone_id ->> '${ConfiguratorManageKeys.EternityBandConfigurator}')), ',')::int[] WHEN '${query.is_bracelet}' = '1' THEN string_to_array(trim(both '[]' from (metal_tone_id ->> '${ConfiguratorManageKeys.BraceletConfigurator}')), ',')::int[] WHEN '${query.is_pendant}' = '1' THEN string_to_array(trim(both '[]' from (metal_tone_id ->> '${ConfiguratorManageKeys.PendantConfigurator}')), ',')::int[] WHEN '${query.is_earring}' = '1' THEN string_to_array(trim(both '[]' from (metal_tone_id ->> '${ConfiguratorManageKeys.EarringConfigurator}')), ',')::int[] WHEN '${query.is_three_stone}' = '1' THEN string_to_array(trim(both '[]' from (metal_tone_id ->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')), ',')::int[] ELSE string_to_array(trim(both '[]' from (metal_tone_id ->> '${ConfiguratorManageKeys.RingConfigurator}')), ',')::int[] END`
          ),
          "metal_tone_id",
        ],
        [Sequelize.literal("metal.name"), "metal_name"],
      ],
      include: [
        {
          model: MetalMaster,
          as: "metal",
          attributes: [],
          where: whereConfig
        },
      ],
    });

    const metalToneList = await MetalTone.findAll({
      where: whereConfig,
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        "id_metal",
        [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "metal_tone_image", attributes: [], required: false }],
    });

    const cutsList = await CutsData.findAll({
      where: whereConfig,
      attributes: ["id", "value", "slug"],
    });

    const item_size = await SizeData.findAll({
      where: [
        { is_deleted: DeletedStatus.No },
        { is_active: ActiveStatus.Active },
        {
          id: {
            [Op.in]: category?.dataValues.id_size
              ? category?.dataValues.id_size
              : [],
          },
        },
      ],
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
      attributes: ["id", "size", "slug"],
    });
    const item_length = await LengthData.findAll({
      where: [
        { is_deleted: DeletedStatus.No },
        { is_active: ActiveStatus.Active },
        {
          id: {
            [Op.in]: category?.dataValues.id_length
              ? category?.dataValues.id_length
              : [],
          },
        },
      ],
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
      attributes: ["id", "length", "slug"],
    });
    const colorClarityList = await dbContext.query(
      `SELECT id_color, id_clarity, is_config, CASE WHEN '${query.is_config}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (is_diamond_type::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END AS is_diamond_type, Colors.name AS color_name, clarities.name AS clarity_name FROM diamond_group_masters AS DGM INNER JOIN colors ON Colors.id = DGM.id_color INNER JOIN clarities ON clarities.id = DGM.id_clarity WHERE CASE WHEN '${query.is_config}' = '1' THEN  DGM.is_config = '1' WHEN '${query.is_three_stone}' = '1' THEN DGM.is_three_stone = '1' WHEN '${query.is_band}' = '1' THEN DGM.is_band = '1' WHEN '${query.is_bracelet}' = '1' THEN DGM.is_bracelet = '1' WHEN '${query.is_pendant}' = '1' THEN DGM.is_pendant = '1' WHEN '${query.is_earring}' = '1' THEN DGM.is_earring = '1' ELSE DGM.is_config = '1' END AND  DGM.is_deleted = '0'AND DGM.is_active = '1' GROUP BY DGM.id, Colors.name, clarities.name`,
      { type: QueryTypes.SELECT }
    );

    const metalList = [...GoldKTList, ...metal];

    let eternityProductSizeList;
    if (query.is_band == "1") {
      eternityProductSizeList = await dbContext.query(
        `SELECT
    DISTINCT 
    product_size,
    product_length,
    dia_shape_id,
    dia_cts,
    side_setting_id,
    is_alternate
FROM
    mat_view_eternity_products WHERE product_type ilike 'Eternity Band';`,
        { type: QueryTypes.SELECT }
      );
    }

    const clarityList = await dbContext.query(
      `SELECT id_clarity, is_config, CASE WHEN '${query.is_config}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (is_diamond_type::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END AS is_diamond_type, clarities.name AS clarity_name FROM diamond_group_masters AS DGM INNER JOIN clarities ON clarities.id = DGM.id_clarity WHERE CASE WHEN '${query.is_config}' = '1' THEN  DGM.is_config = '1' WHEN '${query.is_three_stone}' = '1' THEN DGM.is_three_stone = '1' WHEN '${query.is_band}' = '1' THEN DGM.is_band = '1' WHEN '${query.is_bracelet}' = '1' THEN DGM.is_bracelet = '1' WHEN '${query.is_pendant}' = '1' THEN DGM.is_pendant = '1' WHEN '${query.is_earring}' = '1' THEN DGM.is_earring = '1' ELSE DGM.is_config = '1' END AND  DGM.is_deleted = '0'AND DGM.is_active = '1' GROUP BY DGM.id, clarities.name`,
      { type: QueryTypes.SELECT }
    );

    const colorList = await dbContext.query(
      `SELECT id_color, is_config, CASE WHEN '${query.is_config}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int WHEN '${query.is_band}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.EternityBandConfigurator}')::int WHEN '${query.is_bracelet}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.BraceletConfigurator}')::int WHEN '${query.is_pendant}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.PendantConfigurator}')::int WHEN '${query.is_earring}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.EarringConfigurator}')::int WHEN '${query.is_three_stone}' = '1' THEN (is_diamond_type::json->> '${ConfiguratorManageKeys.ThreeStoneConfigurator}')::int ELSE (is_diamond_type::json->> '${ConfiguratorManageKeys.RingConfigurator}')::int END AS is_diamond_type, Colors.name AS color_name FROM diamond_group_masters AS DGM INNER JOIN colors ON Colors.id = DGM.id_color WHERE CASE WHEN '${query.is_config}' = '1' THEN  DGM.is_config = '1' WHEN '${query.is_three_stone}' = '1' THEN DGM.is_three_stone = '1' WHEN '${query.is_band}' = '1' THEN DGM.is_band = '1' WHEN '${query.is_bracelet}' = '1' THEN DGM.is_bracelet = '1' WHEN '${query.is_pendant}' = '1' THEN DGM.is_pendant = '1' WHEN '${query.is_earring}' = '1' THEN DGM.is_earring = '1' ELSE DGM.is_config = '1' END AND  DGM.is_deleted = '0'AND DGM.is_active = '1' GROUP BY DGM.id, Colors.name`,
      { type: QueryTypes.SELECT }
    );

    return resSuccess({
      data: {
        gemstoneList,
        diamondShapeList,
        cutsList,
        caratSizeList,
        headList,
        shankList,
        sideSettingStyle,
        metalList,
        GoldKTList,
        metalToneList,
        colorClarityList,
        clarityList,
        colorList,
        item_size,
        item_length,
        eternityProductSizeList
      },
    });
  } catch (error) {
    throw error;
  }
};
export const publicConfiguratorDropDownData = async (req: Request) => {
  try {

    let where = [{ is_deleted: DeletedStatus.No }, { is_active: ActiveStatus.Active }];

    const gemstoneList = await StoneData.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        "is_diamond",
        "sort_code",
        "gemstone_type",
        [Sequelize.literal("stone_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "stone_image", attributes: [], required: false }],
    });

    const diamondShapeList = await DiamondShape.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        "diamond_size_id",
        "is_diamond",
        [Sequelize.literal("diamond_shape_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "diamond_shape_image", attributes: [], required: false }],
    });

    const caratSizeList = await DiamondCaratSize.findAll({
      where: [{ is_deleted: DeletedStatus.No }, { is_active: ActiveStatus.Active }, { is_config: "1" }],
      attributes: [
        "id",
        "value",
        "slug",
        "sort_code",
        "is_diamond",
        "is_diamond_shape",
        [Sequelize.literal("diamond_carat_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "diamond_carat_image", attributes: [], required: false }],
    });

    const headList = await HeadsData.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        "diamond_size_id",
        "diamond_shape_id",
        [Sequelize.literal("head_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "head_image", attributes: [], required: false }],
    });

    const shankList = await ShanksData.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        "side_setting_id",
        [Sequelize.literal("shank_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "shank_image", attributes: [], required: false }],
    });

    const sideSettingStyle = await SideSettingStyles.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        "id_shank",
        [Sequelize.literal("side_setting_image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "side_setting_image", attributes: [], required: false }],
    });

    const metal = await MetalMaster.findAll({
      where: [
        { is_active: ActiveStatus.Active },
        { is_deleted: DeletedStatus.No },
        { is_config: ConfigStatus.Yes },
        { id: { [Op.ne]: 1 } },
      ],
      attributes: ["id", ["id", "id_metal"], "name", "slug", "metal_rate"],
    });

    const GoldKTList = await GoldKarat.findAll({
      where: [{ is_deleted: DeletedStatus.No }, { is_active: ActiveStatus.Active }, { is_config: "1" }],
      order: [["name", "ASC"]],
      attributes: [
        "id",
        "name",
        "slug",
        ["id", "id_karat"],
        "id_metal",
        [
          Sequelize.literal(
            '(SELECT metal_masters.name FROM metal_masters WHERE id = "id_metal")'
          ),
          "metal_name",
        ],
      ],
    });

    const metalToneList = await MetalTone.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        "id_metal",
        [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
      ],
        include: [{ model: Image, as: "metal_tone_image", attributes: [], required: false }],
    });

    const cutsList = await CutsData.findAll({
      where,
      attributes: ["id", "value", "slug"],
    });

    const mm_size = await MMSizeData.findAll({
      where,
      attributes: ["id", "value", "slug"],
    });
    // const item_size = await SizeData.findAll({
    //   where,
    //   order: [
    //     [
    //       Sequelize.cast(
    //         Sequelize.fn(
    //           "regexp_replace",
    //           Sequelize.col("slug"),
    //           "^[^0-9.]+",
    //           ""
    //         ),
    //         "NUMERIC"
    //       ),
    //       "ASC",
    //     ],
    //   ],
    //   attributes: ["id", "size", "slug"],
    // });
    const colorClarityList = await dbContext.query(
      `SELECT id_color, id_clarity, is_config, is_diamond_type, Colors.name AS color_name, clarities.name AS clarity_name FROM diamond_group_masters AS DGM INNER JOIN colors ON Colors.id = DGM.id_color INNER JOIN clarities ON clarities.id = DGM.id_clarity WHERE DGM.is_config = '1' AND  DGM.is_deleted = '0'AND DGM.is_active = '1' GROUP BY DGM.id, Colors.name, clarities.name`,
      { type: QueryTypes.SELECT }
    );

    const metalList = [...GoldKTList, ...metal];

    return resSuccess({
      data: {
        metal,
        gemstoneList,
        diamondShapeList,
        cutsList,
        caratSizeList,
        headList,
        shankList,
        sideSettingStyle,
        metalList,
        GoldKTList,
        metalToneList,
        colorClarityList,
        mm_size,
        // item_size,
      },
    });
  } catch (error) {
    console.log("----------------", error)
    throw error;
  }
};
export const convertImageToWebpAPI = async (req: Request) => {
  try {
    let destinationPath = "demo" + "/" + req.file?.filename;
    const lastDotIndex = destinationPath.lastIndexOf(".");

    const prefix = destinationPath.substring(0, lastDotIndex);

    const webpImage = await imageToWebp(req.file?.path, 100);
    const fileStream = fs.readFileSync(webpImage);
    const data = await s3UploadObject(
      dbContext,
      fileStream,
      `${prefix}.webp`,
      "image/webp",
      null
    );
    fs.rmSync(req.file?.path);
    if (data.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return data;
    }
    return resSuccess({ data: data });
    // const file = req.file?.path
    // console.log("file", file)
    // const webpImage = await imageToWebp(file, 30);
    // fs.copyFileSync(webpImage, "./public/images/demo.webp");
    // return resSuccess({data: { file, webpImage }})
  } catch (error) {
    resUnknownError({ data: error });
    throw error;
  }
};
