import { Request } from "express";
import {
  addActivityLogs,
  columnValueLowerCase,
  getCompanyIdBasedOnTheCompanyKey,
  getInitialPaginationFromQuery,
  getLocalDate,
  getWebSettingData,
  prepareMessageFromParams,
  resBadRequest,
  resNotFound,
  resSuccess,
  resUnknownError,
} from "../../utils/shared-functions";
import {
  ADDRESS_NOT_EXITS,
  DEFAULT_STATUS_CODE_SUCCESS,
  ERROR_NOT_FOUND,
  INVALID_ID,
  ONLY_STATUS_UPDATE,
  ORDER_NOT_FOUND,
  PRODUCT_NOT_FOUND,
  RECORD_UPDATE_SUCCESSFULLY,
  REQUIRED_ERROR_MESSAGE,
  TOTAL_AMOUNT_WRONG,
  USER_NOT_FOUND,
} from "../../utils/app-messages";
import {
  AllProductTypes,
  ActiveStatus,
  DeliverStatus,
  OrderStatus,
  PaymentStatus,
  DeletedStatus,
  LogsActivityType,
  LogsType,
} from "../../utils/app-enumeration";
import { Op, QueryTypes, Sequelize } from "sequelize";
import { IQueryPagination } from "../../data/interfaces/common/common.interface";
import { ORDER_STATUS_ID_FROM_LABEL } from "../../utils/app-constants";

import {
  PROCESS_ENVIRONMENT,
} from "../../config/env.var";
import { AppUser } from "../model/app-user.model";
import { TaxMaster } from "../model/master/tax.model";
import { CityData } from "../model/master/city.model";
import { UserAddress } from "../model/address.model";
import { Orders } from "../model/order.model";
import { OrdersDetails } from "../model/order-details.model";
import { Product } from "../model/product.model";
import { CouponData } from "../model/coupon.model";
import { CurrencyData } from "../model/master/currency.model";
import { StoreAddress } from "../model/store-address.model";
import { StoneData } from "../model/master/attributes/gemstones.model";
import { CutsData } from "../model/master/attributes/cuts.model";
import { MMSizeData } from "../model/master/attributes/mmSize.model";
import { DiamondShape } from "../model/master/attributes/diamondShape.model";
import { OrderTransaction } from "../model/order-transaction.model";
import { ConfigOrdersDetails } from "../model/config-order-details.model";
import { Invoices } from "../model/invoices.model";
import { CustomerUser } from "../model/customer-user.model";
import { mailSendForOrderStatusUpdate } from "./mail.service";
import dbContext from "../../config/db-context";
const crypto = require("crypto");
const paypal = require("@paypal/checkout-server-sdk");

/* paypal environment */



export const addProductOrder = async (req: Request) => {
  try {
    const {
      user_id,
      email,
      coupon_id,
      sub_total,
      order_note,
      is_add_address,
      payment_method,
      order_total,
      currency_id,
      order_shipping_address,
      order_type,
      shipping_method,
      pickup_store_id,
      order_billing_address,
      product_details,
      shipping_cost,
      discount,
      total_tax,
    } = req.body;
    
    if (user_id) {
      const users = await AppUser.findOne({
        where: { id: user_id, is_deleted: DeletedStatus.No },
      });
      if (!(users && users.dataValues)) {
        return resNotFound({ message: USER_NOT_FOUND });
      }
    }

    const taxValues = await TaxMaster.findAll({
      where: { is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No },
    });

    let productTaxAmount: any;
    let productTax: any;
    let allTax = [];
    let taxRateData = [];
    let ordersDetailsData:any = []; 
    for (const taxData of taxValues) {
      productTax = taxData.dataValues.rate / 100;
      productTaxAmount = sub_total * productTax;
      console.log(productTaxAmount);

      taxRateData.push({
        rate: taxData.dataValues.rate,
        tax_amount: parseFloat(productTaxAmount.toFixed(2)),
        name: taxData.dataValues.name,
      });
      allTax.push(parseFloat(productTaxAmount.toFixed(2)));
    }

    const sumTotal = allTax.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);

    const totalOrderAmount =
      parseFloat(sub_total) + parseFloat(sumTotal.toFixed(2));
    console.log("totalOrderAmount", totalOrderAmount);
    if (totalOrderAmount.toFixed(2) != order_total) {
      return resBadRequest({ message: TOTAL_AMOUNT_WRONG });
    }

    const trn = await dbContext.transaction();
    const order_number = crypto.randomInt(1000000000, 9999999999);

    try {
      const billingAddresscityNameExistes = await CityData.findOne({
        where: [
          columnValueLowerCase("city_name", order_billing_address.city_id),
          { is_deleted: DeletedStatus.No },
          
        ],
      });

      let billingCityCreateId: any;
      if (
        billingAddresscityNameExistes &&
        billingAddresscityNameExistes.dataValues
      ) {
        billingCityCreateId = billingAddresscityNameExistes.dataValues.id;
      } else {
        const created = await CityData.create(
          {
            city_name: order_billing_address.city_id,
            city_code: order_billing_address.city_id,
            id_state: order_billing_address.state_id,
            created_date: getLocalDate(),
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
            
          },
          { transaction: trn }
        );
        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_billing_address_city_id: created?.dataValues?.id, data: {
              ...created?.dataValues
            }
          }
        }], created?.dataValues?.id, LogsActivityType.Add, LogsType.OrderBillingCity, req?.body?.session_res?.id_app_user,trn)
      
        billingCityCreateId = created.dataValues.id;
      }

      const shippingAddresscityNameExistes = await CityData.findOne({
        where: [
          columnValueLowerCase("city_name", order_shipping_address.city_id),
          { is_deleted: DeletedStatus.No },
          
        ],
      });

      let shippingCityCreateId: any;
      if (
        shippingAddresscityNameExistes &&
        shippingAddresscityNameExistes.dataValues
      ) {
        shippingCityCreateId = shippingAddresscityNameExistes.dataValues.id;
      } else {
        const created = await CityData.create(
          {
            city_name: order_shipping_address.city_id,
            city_code: order_shipping_address.city_id,
            id_state: order_shipping_address.state_id,
            created_date: getLocalDate(),
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
            
          },
          { transaction: trn }
        );

        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_shipping_address_city_id: created?.dataValues?.id, data: {
              ...created?.dataValues
            }
          }
        }], created?.dataValues?.id, LogsActivityType.Add, LogsType.OrderShippingCity, req?.body?.session_res?.id_app_user,trn)
      
        shippingCityCreateId = created.dataValues.id;
      }

      if (parseInt(is_add_address) == 1) {
        if (order_billing_address.id && order_shipping_address.id) {
          if (
            order_billing_address.id &&
            parseInt(order_billing_address.id) == 0
          ) {
            const payload = {
              user_id: user_id,
              full_name: order_billing_address.full_name,
              house_building: order_billing_address.house_builing,
              area_name: order_billing_address.area_name,
              pincode: order_billing_address.pincode,
              phone: order_billing_address.phone_number,
              city_id: billingCityCreateId,
              state_id: order_billing_address.state_id,
              country_id: order_billing_address.country_id,
              address_type: 2,
              default_addres: 0,
              is_deleted: 0,
              created_date: getLocalDate(),
              
            };

            const UserAddressData = await UserAddress.create(payload, { transaction: trn });
            await addActivityLogs([{
              old_data: null,
              new_data: {
                order_user_billing_address_id: UserAddressData?.dataValues?.id, data: {
                  ...UserAddressData?.dataValues
                }
              }
            }], UserAddressData?.dataValues?.id, LogsActivityType.Add, LogsType.OrderUserBillingAddress, req?.body?.session_res?.id_app_user,trn)
          } else {
            const addressId = await UserAddress.findOne({
              where: { id: order_billing_address.id, is_deleted: DeletedStatus.No },
            });
            if (!(addressId && addressId.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: ADDRESS_NOT_EXITS });
            }
            const addressInfo = await UserAddress.update(
              {
                house_building: order_billing_address.house_builing,
                full_name: order_billing_address.full_name,
                area_name: order_billing_address.area_name,
                pincode: order_billing_address.pincode,
                phone: order_billing_address.phone_number,
                city_id: billingCityCreateId,
                state_id: order_billing_address.state_id,
                country_id: order_billing_address.country_id,
                address_type: 2,
                default_addres: 0,
                modified_date: getLocalDate(),
              },

              {
                where: { id: addressId.dataValues.id, is_deleted: DeletedStatus.No },
                transaction: trn,
              }
            );
            const afterUpdateFindMegaMenu = await UserAddress.findOne({
              where: { id: order_billing_address.id, is_deleted: DeletedStatus.No },
            });

            await addActivityLogs([{
              old_data: { order_user_billing_address_id: addressId?.dataValues?.id, data: {...addressId?.dataValues}},
              new_data: {
                order_user_billing_address_id: afterUpdateFindMegaMenu?.dataValues?.id, data: { ...afterUpdateFindMegaMenu?.dataValues }
              }
            }], addressId?.dataValues?.id,LogsActivityType.Edit, LogsType.OrderUserBillingAddress, req?.body?.session_res?.id_app_user,trn)
          
          }
          if (order_shipping_address.country_id != null) {
            if (
              order_shipping_address.id &&
              parseInt(order_shipping_address.id) == 0
            ) {
              const payload = {
                user_id: user_id,
                full_name: order_shipping_address.full_name,
                house_building: order_shipping_address.house_builing,
                area_name: order_shipping_address.area_name,
                pincode: order_shipping_address.pincode,
                phone: order_shipping_address.phone_number,
                city_id: shippingCityCreateId,
                state_id: order_shipping_address.state_id,
                country_id: order_shipping_address.country_id,
                address_type: 1,
                default_addres: 0,
                is_deleted: 0,
                created_date: getLocalDate(),
                
              };

              const UserAddressData = await UserAddress.create(payload, { transaction: trn });
              await addActivityLogs([{
                old_data: null,
                new_data: {
                  order_user_shipping_address_id: UserAddressData?.dataValues?.id, data: {
                    ...UserAddressData?.dataValues
                  }
                }
              }], UserAddressData?.dataValues?.id, LogsActivityType.Add, LogsType.OrderUserShippingAddress, req?.body?.session_res?.id_app_user,trn)
            
            } else {
              const addressId = await UserAddress.findOne({
                where: { id: order_shipping_address.id, is_deleted: DeletedStatus.No },
              });
              if (!(addressId && addressId.dataValues)) {
                await trn.rollback();
                return resNotFound({ message: ADDRESS_NOT_EXITS });
              }
              const addressInfo = await UserAddress.update(
                {
                  house_building: order_shipping_address.house_builing,
                  full_name: order_shipping_address.full_name,
                  area_name: order_shipping_address.area_name,
                  pincode: order_shipping_address.pincode,
                  phone: order_shipping_address.phone_number,
                  city_id: shippingCityCreateId,
                  state_id: order_shipping_address.state_id,
                  country_id: order_shipping_address.country_id,
                  address_type: 1,
                  default_addres: 0,
                  modified_date: getLocalDate(),
                },
                {
                  where: { id: addressId.dataValues.id, is_deleted: DeletedStatus.No },
                  transaction: trn,
                }
              );
              const afterUpdateFindMegaMenu = await UserAddress.findOne({
                where: { id: order_shipping_address.id, is_deleted: DeletedStatus.No },
              });
  
              await addActivityLogs([{
                old_data: { order_user_shipping_address_id: addressId?.dataValues?.id, data: {...addressId?.dataValues}},
                new_data: {
                  order_user_shipping_address_id: afterUpdateFindMegaMenu?.dataValues?.id, data: {...afterUpdateFindMegaMenu?.dataValues }
                }
              }], addressId?.dataValues?.id,LogsActivityType.Edit, LogsType.OrderUserShippingAddress, req?.body?.session_res?.id_app_user,trn)
            
            }
          }
        }
      }
      const configData = await getWebSettingData();
      const ordersPayload = {
        order_number: `${configData.order_invoice_number_identity}-${order_number}`,
        user_id: user_id,
        email: email,
        shipping_method: shipping_method,
        pickup_store_id: pickup_store_id,
        coupon_id,
        sub_total: parseFloat(sub_total),
        shipping_cost: parseFloat(shipping_cost),
        discount: parseFloat(discount),
        total_tax: sumTotal,
        order_total: totalOrderAmount,
        payment_method: payment_method,
        currency_id: currency_id,
        order_status: OrderStatus.Pendding,
        payment_status: PaymentStatus.InPaid,
        order_date: getLocalDate(),
        order_type: order_type,
        order_note: order_note,
        order_shipping_address: {
          ...order_shipping_address,
          city_id: shippingCityCreateId,
        },
        order_billing_address: {
          ...order_billing_address,
          city_id: billingCityCreateId,
        },
        order_taxs: JSON.stringify(taxRateData),
        created_by: req.body.session_res.id_app_user,
        
        created_date: getLocalDate(),
      };

      const orders = await Orders.create(ordersPayload, { transaction: trn });

      for (let product of product_details) {
        if (!product.product_id) {
          await trn.rollback();
          return resBadRequest({ message: INVALID_ID });
        }
        const products = await Product.findOne({
          where: { id: product.product_id, is_deleted: DeletedStatus.No },
          transaction: trn,
        });
        if (!(products && products.dataValues)) {
          await trn.rollback();
          return resNotFound({ message: PRODUCT_NOT_FOUND });
        }
        let diamondRate = await dbContext.query(
          `SELECT sum(diamond_group_masters.rate) FROM product_diamond_options LEFT OUTER JOIN diamond_group_masters ON diamond_group_masters.id = product_diamond_options.id_diamond_group WHERE product_diamond_options.id_product = ${product.product_id} `,
          { type: QueryTypes.SELECT }
        );
        const metalRates = await dbContext.query(
          `SELECT CASE WHEN PMO.id_karat IS NULL THEN (metal.metal_rate*PMO.metal_weight) ELSE (metal.metal_rate/metal.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight) END FROM products LEFT OUTER JOIN product_metal_options AS PMO ON PMO.id_product = products.id LEFT OUTER JOIN metal_masters AS metal ON PMO.id_metal = metal.id LEFT OUTER JOIN gold_kts ON PMO.id_karat = gold_kts.id WHERE 
          CASE WHEN PMO.id_karat IS NULL THEN products.id = ${product.product_id} AND PMO.id_metal = ${product.order_details_json.metal_id} ELSE products.id = ${product.product_id} AND PMO.id_metal = ${product.order_details_json.metal_id} AND PMO.id_karat = ${product.order_details_json.karat_id} END`,
          { type: QueryTypes.SELECT }
        );

        const ordersDetails = await OrdersDetails.create(
          {
            order_id: orders.dataValues.id,
            product_id: product.product_id,
            quantity: product.quantity,
            finding_charge: parseFloat(products.dataValues.finding_charge),
            makring_charge: parseFloat(products.dataValues.making_charge),
            other_charge: parseFloat(products.dataValues.other_charge),
            diamond_rate: diamondRate.map((t: any) => t.sum)[0],
            metal_rate: metalRates.map((t: any) => t.case)[0],
            sub_total: parseFloat(product.sub_total),
            product_tax: parseFloat(product.product_tax),
            discount_amount: parseFloat(product.discount_amount),
            shipping_cost: parseFloat(product.shipping_cost),
            shipping_method_id: shipping_method,
            delivery_status: DeliverStatus.Pendding,
            payment_status: PaymentStatus.InPaid,
            order_details_json: product.order_details_json,
            
          },
          { transaction: trn }
        );
        ordersDetailsData.push({...ordersDetails.dataValues})
      }  

      await addActivityLogs([{
        old_data: null,
        new_data: {
          order_id: orders?.dataValues?.id, 
          order_data: {
            ...orders?.dataValues
          },
          order_detail_id: ordersDetailsData.id,
          order_detail_data: ordersDetailsData
        }
      }], orders?.dataValues?.id, LogsActivityType.Add, LogsType.Order, req?.body?.session_res?.id_app_user,trn)
    
      await trn.commit();
      return resSuccess({ data: null });
    } catch (error) {
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } catch (error) {
    throw error;
  }
};

export const getAllOrdersUser = async (req: Request) => {
  try {
    const { start_date, end_date, order_status } = req.query;
    
    const user_id = req.query.user_id;
    const startDateFilter: any =
      start_date != undefined ? start_date : new Date().getFullYear();

    const endDateFilter: any = end_date != undefined ? end_date : new Date();
    const endDate = new Date(endDateFilter);
    endDate.setDate(endDate.getDate() + 1);
    if (!user_id) return resBadRequest({ message: INVALID_ID });
    const users = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });
    if (!(users && users.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };
    let noPagination = req.query.no_pagination === "1";

    const result: any = await dbContext.query(
      `SELECT 
      COUNT(orders.id) OVER() AS totalItems,
orders.id,
order_number,
orders.user_id,
orders.email,
CS.full_name as user_name,
orders.order_total,
orders.payment_method,
orders.order_status,
orders.payment_status,
orders.order_date,
orders.order_note,
orders.pickup_store_id,
orders.offer_details,
orders.discount,
store_address.address as store_address,
store_address.map_link as store_map_link,
store_address.branch_name as store_branch_name,
currency_rates.code as currency_code,
currency_rates.symbol as currency_symbol,
currency_rates.symbol_placement as currency_symbol_placement,
orders.order_date + ("delivery_days" * INTERVAL '1 day') as delivery_date,
JSON_BUILD_OBJECT('id', order_shipping_address ->> 'id', 'full_name', order_shipping_address ->> 'full_name',
				  'phone_number', order_shipping_address ->> 'phone_number',
				  'house_builing', order_shipping_address ->> 'house_builing',
				  'area_name', order_shipping_address ->> 'area_name',
				  'pincode', order_shipping_address ->> 'pincode',
				  'city_id', order_shipping_address ->> 'city_id',
				  'state_id', order_shipping_address ->> 'state_id',
				  'country_id', order_shipping_address ->> 'country_id',
				  'city', sp_city.city_name,
				  'state', sp_state.state_name,
				  'country', sp_country.country_name
				 ) as order_shipping_address,
JSON_BUILD_OBJECT('id', order_shipping_address ->> 'id', 'full_name', order_shipping_address ->> 'full_name',
				  'phone_number', order_shipping_address ->> 'phone_number',
				  'house_builing', order_shipping_address ->> 'house_builing',
				  'area_name', order_shipping_address ->> 'area_name',
				  'pincode', order_shipping_address ->> 'pincode',
				  'city_id', order_shipping_address ->> 'city_id',
				  'state_id', order_shipping_address ->> 'state_id',
				  'country_id', order_shipping_address ->> 'country_id',
				  'city', bl_city.city_name,
				  'state', bl_state.state_name,
				  'country', bl_country.country_name
				 ) as order_billing_address,
CASE WHEN coupons.id IS NOT NULL THEN JSON_BUILD_OBJECT('id', coupons.id,
				  'coupon_code', coupon_code,
				  'discount_type', coupons.discount_type,
				  'discount_amount', coupons.discount_amount,
				  'description', coupons.description,
				  'percentage_off', coupons.percentage_off,
				  'maximum_discount_amount', maximum_discount_amount
				 ) END AS coupon,
COALESCE(jsonb_agg(DISTINCT CASE WHEN OD.id IS NOT NULL THEN  jsonb_build_object(
	'quantity', OD.quantity,
	'finding_charge', OD.finding_charge,
	'makring_charge', OD.makring_charge,
	'other_charge', OD.other_charge,
	'diamond_count', OD.diamond_count,
	'diamond_rate', OD.diamond_rate,
	'metal_rate', OD.metal_rate,
	'sub_total', OD.sub_total,
	'product_tax', OD.product_tax,
	'delivery_status', OD.delivery_status,
	'payment_status', OD.payment_status,
	'refund_request_id', OD.refund_request_id,
	'order_details_json', OD.order_details_json,
  'offer_details', OD.offer_details,
  'discount_amount', OD.discount_amount,
	'product_id', OD.product_id, 
	'product_price', OD.sub_total,
	'product_image', CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct}) THEN product_images.image_path 
					 WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN GSPI.image_path ELSE images.image_path END,
	
	'product_title', CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct}) THEN products.name 
					 WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN GSP.product_title 
					 WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN BSP.name 
					WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Config_Ring_product},${AllProductTypes.Three_stone_config_product}) THEN CON_P.product_title
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN CEBP.product_title
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN CBP.product_title
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN SCP.name
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN CPP.name END,
	'product_sku', CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct}) THEN products.sku 
					 WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN GSP.sku 
					WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN BSP.sku
					WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Config_Ring_product},${AllProductTypes.Three_stone_config_product}) THEN CON_P.sku
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN CEBP.sku
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN CBP.sku
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN SCP.sku
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN CPP.sku END,
	'product_slug', CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct}) THEN products.slug 
					 WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN GSP.slug 
					WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN BSP.slug
					WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Config_Ring_product},${AllProductTypes.Three_stone_config_product}) THEN CON_P.slug
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN CEBP.slug
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN CBP.slug
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN SCP.slug
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN CPP.slug END,
	'metal', metal_masters.name,
	'karat', gold_kts.name,
	'head_metal_tone', head_tone.name,
	'shank_metal_tone', shank_tone.name,
	'band_metal_tone', band_tone.name,
	'head_metal_tone_id', CAST (order_details_json ->> 'head_metal_tone' AS integer),
	'shank_metal_tone_id', CAST (order_details_json ->> 'shank_metal_tone' AS integer),
	'band_metal_tone_id', CAST (order_details_json ->> 'band_metal_tone' AS integer),
	'Metal_tone', metal_tones.name,
	'product_size', items_sizes.size,
	'product_length', items_lengths.length,
	'diamond_shape', CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct}) THEN product_diamond.name 
					 WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN null
					WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Config_Ring_product},${AllProductTypes.Three_stone_config_product}) THEN CPDS.name
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN CEBPDS.name
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN CBPDS.name
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN SCPD.name
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN CPPD.name END,
	'category', CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct}) THEN categories.category_name 
					WHEN CAST (order_details_json ->> 'product_type' AS integer) IN (${AllProductTypes.Config_Ring_product},${AllProductTypes.Three_stone_config_product}) THEN 'ring'
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN 'Earring'
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN 'Pendant'
					 WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN b_category.category_name
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN CEBPDS.name
					WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN CBPDS.name END
) END) FILTER (WHERE OD.id IS NOT NULL),
    '[]'::jsonb
) as order
FROM orders 
LEFT JOIN customer_users AS CS ON CS.id_app_user = user_id
LEFT JOIN store_address ON store_address.id = orders.pickup_store_id 
LEFT JOIN contries as sp_country ON sp_country.id = CASE WHEN order_shipping_address ->> 'country_id' = '' THEN NULL ELSE CAST(order_shipping_address ->> 'country_id' as INTEGER) END
LEFT JOIN states as sp_state ON sp_state.id = CASE WHEN order_shipping_address ->> 'state_id' = '' THEN NULL ELSE CAST(order_shipping_address ->> 'state_id' as INTEGER) END
LEFT JOIN cities as sp_city ON sp_city.id = CASE WHEN order_shipping_address ->> 'city_id' = '' THEN NULL ELSE CAST(order_shipping_address ->> 'city_id' as INTEGER) END
LEFT JOIN contries as bl_country ON bl_country.id = CASE WHEN order_billing_address ->> 'country_id' = '' THEN NULL ELSE CAST(order_billing_address ->> 'country_id' as INTEGER) END
LEFT JOIN states as bl_state ON bl_state.id = CASE WHEN order_billing_address ->> 'state_id' = '' THEN NULL ELSE CAST(order_billing_address ->> 'state_id' as INTEGER) END
LEFT JOIN cities as bl_city ON bl_city.id = CASE WHEN order_billing_address ->> 'city_id' = '' THEN NULL ELSE CAST(order_billing_address ->> 'city_id' as INTEGER) END
LEFT JOIN coupons ON coupons.id = coupon_id
LEFT JOIN currency_rates ON currency_rates.id = currency_id
LEFT JOIN order_details AS OD ON orders.id = OD.order_id 
LEFT JOIN product_images ON product_images.id = CAST (order_details_json ->> 'image_id' AS integer) 
AND (CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct})
LEFT JOIN gift_set_product_images as GSPI ON GSPI.id = CAST (order_details_json ->> 'image_id' AS integer) AND CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product}
LEFT JOIN images on images.id = CAST (order_details_json ->> 'image_id' AS integer) 
AND CAST (order_details_json ->> 'product_type' AS integer) NOT IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct},${AllProductTypes.GiftSet_product})
LEFT JOIN products ON products.id = OD.product_id AND (CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} 
													   OR  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct})
LEFT JOIN config_products as CON_P ON CON_P.id = OD.product_id AND (CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} 
																	OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product})
LEFT JOIN gift_set_products as GSP ON GSP.id = OD.product_id AND CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product}
LEFT JOIN birthstone_products as BSP ON BSP.id = OD.product_id AND CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product}
LEFT JOIN config_eternity_products as CEBP ON CEBP.id = OD.product_id AND CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product}
LEFT JOIN config_bracelet_products as CBP ON CBP.id = OD.product_id AND CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator}
LEFT JOIN stud_config_products as SCP ON SCP.id = OD.product_id AND CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator}
LEFT JOIN config_pendant_products as CPP ON CPP.id = OD.product_id AND CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator}
LEFT JOIN metal_masters ON metal_masters.id = CAST (order_details_json ->> 'metal_id' AS integer)
LEFT JOIN gold_kts ON gold_kts.id = CAST (order_details_json ->> 'karat_id' AS integer)
LEFT JOIN metal_tones as head_tone ON head_tone.id = CAST (order_details_json ->> 'head_metal_tone' AS integer)
LEFT JOIN metal_tones as shank_tone ON shank_tone.id = CAST (order_details_json ->> 'shank_metal_tone' AS integer)
LEFT JOIN metal_tones as band_tone ON band_tone.id = CAST (order_details_json ->> 'band_metal_tone' AS integer)
LEFT JOIN metal_tones ON metal_tones.id = CAST (order_details_json ->> 'metal_tone' AS integer)
LEFT JOIN items_sizes ON items_sizes.id = CAST (order_details_json ->> 'size_id' AS integer)
LEFT JOIN items_lengths ON items_lengths.id = CAST (order_details_json ->> 'length_id' AS integer)
-- shape
LEFT JOIN (
    SELECT DISTINCT ON (id_product) id_product, diamond_shapes.name 
    FROM product_diamond_options 
    LEFT JOIN diamond_group_masters ON diamond_group_masters.id = id_diamond_group
    INNER JOIN diamond_shapes ON diamond_shapes.id = diamond_group_masters.id_shape
    ORDER BY id_product, id_type ASC
) as product_diamond ON product_diamond.id_product = OD.product_id AND (CAST(order_details_json ->> 'product_type' as INTEGER) IN (${AllProductTypes.Product},${AllProductTypes.SettingProduct}))

LEFT JOIN diamond_shapes as CPDS ON CPDS.id = center_dia_shape_id
LEFT JOIN diamond_shapes as SCPD ON SCPD.id = SCP.center_dia_shape
LEFT JOIN diamond_shapes as CPPD ON CPPD.id = CPP.center_dia_shape
LEFT JOIN diamond_shapes as CEBPDS ON CEBPDS.id = CEBP.dia_shape_id

LEFT JOIN (
    SELECT DISTINCT ON (config_product_id) config_product_id, diamond_shapes.name 
    FROM config_bracelet_product_diamonds 
    INNER JOIN diamond_shapes ON diamond_shapes.id = config_bracelet_product_diamonds.id_shape
    LIMIT 1
) as CBPDS ON CBPDS.config_product_id = OD.product_id
-- category
LEFT JOIN product_categories ON product_categories.id_product = OD.product_id AND product_categories.is_deleted = '0'
LEFT JOIN categories ON categories.id = product_categories.id_category
LEFT JOIN birthstone_product_categories ON birthstone_product_categories.id_product = OD.product_id
LEFT JOIN categories as b_category ON b_category.id = birthstone_product_categories.id_category
WHERE orders.user_id = ${user_id} AND order_date BETWEEN '${new Date(startDateFilter).toISOString().split("T")[0]
      }' AND '${new Date(endDate).toISOString().split("T")[0]}' 
        ${order_status && order_status != OrderStatus.All.toString()
        ? `AND orders.order_status = '${order_status}'`
        : ""
      }
        ${pagination.search_text
        ? `
          AND (orders.order_number ILIKE '%${pagination.search_text}%' 
          OR CAST(orders.order_total AS character varying) ILIKE '%${pagination.search_text}%'
          OR products.name ILIKE '%${pagination.search_text}%'
          OR products.slug ILIKE '%${pagination.search_text}%'
          OR products.sku ILIKE '%${pagination.search_text}%'
          OR CON_P.product_title ILIKE '%${pagination.search_text}%'
          OR CON_P.slug ILIKE '%${pagination.search_text}%'
          OR CON_P.sku ILIKE '%${pagination.search_text}%'
          OR BSP.name ILIKE '%${pagination.search_text}%'
          OR BSP.slug ILIKE '%${pagination.search_text}%'
          OR BSP.sku ILIKE '%${pagination.search_text}%'
          OR GSP.product_title ILIKE '%${pagination.search_text}%'
          OR GSP.slug ILIKE '%${pagination.search_text}%'
          OR GSP.sku ILIKE '%${pagination.search_text}%'
          OR CEBP.product_title ILIKE '%${pagination.search_text}%'
          OR CEBP.slug ILIKE '%${pagination.search_text}%'
          OR CEBP.sku ILIKE '%${pagination.search_text}%'
          OR CBP.product_title ILIKE '%${pagination.search_text}%'
          OR CBP.slug ILIKE '%${pagination.search_text}%'
          OR CBP.sku ILIKE '%${pagination.search_text}%'
          OR product_diamond.name ILIKE '%${pagination.search_text}%'
          OR CPDS.name ILIKE '%${pagination.search_text}%'
          OR CEBPDS.name ILIKE '%${pagination.search_text}%'
          OR CBPDS.name ILIKE '%${pagination.search_text}%'
          )
          `
        : ""
      } 
GROUP BY orders.id,store_address.id, CS.full_name, sp_city.id,sp_state.id,sp_country.id, bl_city.id,bl_state.id,bl_country.id,coupons.id,currency_rates.id
ORDER BY orders.created_date DESC
OFFSET
        ${(pagination.current_page - 1) * pagination.per_page_rows} ROWS
        FETCH NEXT ${pagination.per_page_rows} ROWS ONLY
`,
      { type: QueryTypes.SELECT }
    );

    if (!noPagination) {
      if (Number(result[0]?.totalitems) === 0) {
        return resSuccess({ data: { pagination, result: [] } });
      }
      pagination.total_items = Number(result[0]?.totalitems);
      pagination.total_pages = Math.ceil(
        Number(result[0]?.totalitems) / pagination.per_page_rows
      );
    }
    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (error) {
    throw error;
  }
};

export const getAllOrdersListAdmin = async (req: Request) => {
  try {
    const { start_date, end_date, order_status, search_text } = req.query;

    const startDateFilter =
      start_date != undefined ? start_date : new Date().getFullYear();

    const endDateFilter: any = end_date != undefined ? end_date : new Date();

    const endDate = new Date(endDateFilter);
    endDate.setDate(endDate.getDate() + 1);

    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };
    let noPagination = req.query.no_pagination === "1";

    let where = [
      search_text && search_text != "" && search_text != undefined
        ? {
          [Op.or]: [
            { order_number: { [Op.iLike]: `%${search_text}%` } },
            { email: { [Op.iLike]: `%${search_text}%` } },
            Sequelize.where(
              Sequelize.literal(`order_shipping_address ->> 'full_name'`),
              "ILIKE",
              `%${search_text}%`
            ),
            Sequelize.where(
              Sequelize.literal(`(SELECT COUNT(customer_users.id) FROM customer_users WHERE customer_users.id_app_user = "orders"."user_id" AND full_name ILIKE '%${search_text}%')`),
              ">=",
              `1`
            ),
          ],
        }
        : 
      {
        [Op.or]: [{ order_date: { [Op.between]: [startDateFilter, endDate] } }],
      },
      order_status ? { order_status: { [Op.eq]: order_status } } : {order_status: {[Op.ne]: OrderStatus.Archived}},
      
    ];
    let searchConditions = "";
    if (search_text && search_text != "" && search_text != undefined) {
      const escapedSearch = `%${search_text}%`; // safe interpolation
      searchConditions = `
        AND (
          order_number ILIKE '${escapedSearch}'
          OR email ILIKE '${escapedSearch}'
          OR order_shipping_address->>'full_name' ILIKE '${escapedSearch}'
          OR EXISTS (
            SELECT 1 FROM customer_users
            WHERE customer_users.id_app_user = orders.user_id
            AND full_name ILIKE '${escapedSearch}'
          )
        )
      `;
    }

    // Build the status condition with search filters embedded
    const orderStatusCondition = order_status
    ? `order_status = '${order_status}' ${searchConditions}`
    : `order_status != '${OrderStatus.Archived}' ${searchConditions}`;



    const countData: any = await Orders.findOne({
      attributes: [
         [
        Sequelize.literal(`SUM(CASE WHEN ${orderStatusCondition} THEN 1 ELSE 0 END)`),
          "totalItems"
        ],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "all_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.Pendding}' THEN 1 ELSE 0 END`)), "total_pending_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.Confirmed}' THEN 1 ELSE 0 END`)), "total_confirm_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.Processing}' THEN 1 ELSE 0 END`)), "total_in_process_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.OutOfDeliver}' THEN 1 ELSE 0 END`)), "total_out_of_delivery_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.Delivered}' THEN 1 ELSE 0 END`)), "total_delivery_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.Returned}' THEN 1 ELSE 0 END`)), "total_returned_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.Canceled}' THEN 1 ELSE 0 END`)), "total_cancel_order"],
        [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN order_status = '${OrderStatus.Failed}' THEN 1 ELSE 0 END`)), "total_fail_order"],
      ],
      where: {
        [Op.or]: [{ order_date: { [Op.between]: [startDateFilter, endDate] } }],
      },
      raw: true
    });

   
    const result = await Orders.findAll({
      where,
      limit: pagination.per_page_rows,
      offset: (pagination.current_page - 1) * pagination.per_page_rows,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "order_number",
        "coupon_id",
        [Sequelize.literal(`"orders"."user_id"`), "user_id"],
        "email",
        [
          Sequelize.literal(`order_shipping_address ->> 'full_name'`),
          "full_name",
        ],
        [
          Sequelize.literal(
            '(SELECT customer_users.full_name FROM customer_users WHERE customer_users.id_app_user = "orders"."user_id")'
          ),
          "user_name",
        ],
        "shipping_method",
        "pickup_store_id",
        "coupon_id",
        [Sequelize.literal(`CEIL("sub_total")`), "sub_total"],
        "discount",
        "total_tax",
        "shipping_cost",
        [Sequelize.literal(`CEIL("order_total")`), "order_total"],
        "payment_method",
        "currency_id",
        "order_status",
        "payment_status",
        "order_date",
        "order_type",
        "order_note",
        "order_taxs",
        "order_shipping_address",
        "order_billing_address",
        "offer_details",
        [Sequelize.literal("coupon.coupon_code"), "coupon_code"],
        [Sequelize.literal("coupon.description"), "coupon_description"],
        [Sequelize.literal("coupon.discount_type"), "coupon_discount_type"],
        [Sequelize.literal("coupon.percentage_off"), "coupon_percentage_off"],
        [Sequelize.literal("coupon.discount_amount"), "coupon_discount_amount"],
        [Sequelize.literal("currency.symbol"), "currency_symbol"],
        [Sequelize.literal("currency.code"), "currency_code"],
        [Sequelize.literal("currency.symbol_placement"), "currency_symbol_placement"],
        [Sequelize.literal("currency.currency"), "currency_value"],

        [Sequelize.literal("store_address.id"), "store_address_id"],
        [Sequelize.literal("store_address.address"), "store_address_value"],
        [Sequelize.literal("store_address.map_link"), "store_map_link"],
        [Sequelize.literal("store_address.branch_name"), "store_branch_name"],

        [
          Sequelize.literal("coupon.maximum_discount_amount"),
          "coupon_maximum_discount_amount",
        ],
      ],
      include: [
        {
          required: false,
          model: CouponData,
          as: "coupon",
          attributes: [],
        
        },
        {
          required: false,
          model: CurrencyData,
          as: "currency",
          attributes: [],
        },
        {
          required:false,
          model: StoreAddress,
          as: "store_address",
          attributes: [],
        }
      ],
    });
    const count = {
      all_order: Number(countData.all_order ?? 0),
      total_pending_order: Number(countData.total_pending_order ?? 0),
      total_confirm_order: Number(countData.total_confirm_order ?? 0),
      total_in_process_order: Number(countData.total_in_process_order ?? 0),
      total_out_of_delivery_order: Number(countData.total_out_of_delivery_order ?? 0),
      total_delivery_order: Number(countData.total_delivery_order ?? 0),
      total_returned_order: Number(countData.total_returned_order ?? 0),
      total_cancel_order: Number(countData.total_cancel_order ?? 0),
      total_fail_order: Number(countData.total_fail_order ?? 0),
    };

     if (!noPagination) {
      if (Number(countData?.totalItems) === 0) {
        return resSuccess({ data: { count, pagination, result: [] } });
      }
      pagination.total_items = Number(countData?.totalItems);
      pagination.total_pages = Math.ceil(Number(countData?.totalItems) / pagination.per_page_rows);
    }

    

    return resSuccess({
      data: noPagination ? { count, result } : { count, pagination, result },
    });
  } catch (error) {
    throw error;
  }
};

export const orderDetailsAPI = async (req: Request) => {
  const { order_number } = req.body;

  if (!order_number) {
    return resUnknownError({
      message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [
        ["field_name", "order number"],
      ]),
    });
  }

 

  try {
    const orderDetails: any = await Orders.findOne({
      where: { order_number: order_number },
      attributes: [
        "id",
        "order_number",
        "user_id",
        "email",
        "shipping_method",
        "pickup_store_id",
        "discount",
        [Sequelize.literal(`CEIL("total_tax")`), "total_tax"],
        "coupon_id",
        [Sequelize.literal(`CEIL("orders"."sub_total")`), "sub_total"],
        [Sequelize.literal(`CEIL("shipping_cost")`), "shipping_cost"],
        "discount",
        "currency_rate",
        [Sequelize.literal(`CEIL("order_total")`), "order_total"],
        "payment_method",
        "currency_id",
        "order_status",
        "payment_status",
        "offer_details",
        "order_date",
        [
          Sequelize.literal(
            `"order_date" + ("delivery_days" * INTERVAL '1 day')`
          ),
          "delivery_date",
        ],
        "order_type",
        "order_note",
        "order_taxs",
        "coupon_discount",
        [
          Sequelize.literal(`(JSON_BUILD_OBJECT('id', order_shipping_address ->> 'id', 'full_name', order_shipping_address ->> 'full_name',
				  'phone_number', order_shipping_address ->> 'phone_number',
				  'house_builing', order_shipping_address ->> 'house_builing',
				  'area_name', order_shipping_address ->> 'area_name',
				  'pincode', order_shipping_address ->> 'pincode',
				  'city_id', order_shipping_address ->> 'city_id',
				  'state_id', order_shipping_address ->> 'state_id',
				  'country_id', order_shipping_address ->> 'country_id',
				  'city', (SELECT city_name FROM cities WHERE id = CASE WHEN order_shipping_address ->> 'city_id' = '' THEN NULL ELSE CAST(order_shipping_address ->> 'city_id' as INTEGER) END),
				  'state', (SELECT state_name FROM states WHERE id = CASE WHEN order_shipping_address ->> 'state_id' = '' THEN NULL ELSE CAST(order_shipping_address ->> 'state_id' as INTEGER) END),
				  'country', (SELECT country_name FROM contries WHERE id = CASE WHEN order_shipping_address ->> 'country_id' = '' THEN NULL ELSE CAST(order_shipping_address ->> 'country_id' as INTEGER) END)
				 ))`),
          "order_shipping_address",
        ],
        [
          Sequelize.literal(`(JSON_BUILD_OBJECT('id', order_billing_address ->> 'id', 'full_name', order_billing_address ->> 'full_name',
				  'phone_number', order_billing_address ->> 'phone_number',
				  'house_builing', order_billing_address ->> 'house_builing',
				  'area_name', order_billing_address ->> 'area_name',
				  'pincode', order_billing_address ->> 'pincode',
				  'city_id', order_billing_address ->> 'city_id',
				  'state_id', order_billing_address ->> 'state_id',
				  'country_id', order_billing_address ->> 'country_id',
				  'city', (SELECT city_name FROM cities WHERE id = CASE WHEN order_billing_address ->> 'city_id' = '' THEN NULL ELSE CAST(order_billing_address ->> 'city_id' as INTEGER) END),
				  'state', (SELECT state_name FROM states WHERE id = CASE WHEN order_billing_address ->> 'state_id' = '' THEN NULL ELSE CAST(order_billing_address ->> 'state_id' as INTEGER) END),
				  'country', (SELECT country_name FROM contries WHERE id = CASE WHEN order_billing_address ->> 'country_id' = '' THEN NULL ELSE CAST(order_billing_address ->> 'country_id' as INTEGER) END)
				 ))`),
          "order_billing_address",
        ],
      ],
      include: [
        {
          required:false,
          model: CouponData,
          as: "coupon",
          attributes: [
            "id",
            "coupon_code",
            "description",
            "discount_type",
            "percentage_off",
            "discount_amount",
            "maximum_discount_amount",
          ],
        },
        {
          required:false,
          model: StoreAddress,
          as: "store_address",
          attributes: [
            "id",
            "address",
            "map_link",
            "branch_name"
          ],
        },
        {
          required:false,
          model: CurrencyData,
          as: "currency",
          attributes: [
            "id",
            "code",
            "symbol_placement",
            "symbol",
            "thousand_token"
          ]
        },
        {
          model: OrdersDetails,
          as: "order",
          attributes: [
            "quantity",
            "finding_charge",
            "makring_charge",
            "other_charge",
            "diamond_count",
            "discount_amount",
            "offer_details",
            "diamond_rate",
            "metal_rate",
            "product_details_json",
            [Sequelize.literal(`CEIL("order"."sub_total")`), "sub_total"],

            "product_tax",
            "delivery_status",
            "payment_status",
            "refund_request_id",
            "order_details_json",
            "product_id",
            [
              Sequelize.literal(
                `CAST (order_details_json ->> 'product_type' AS integer)`
              ),
              "product_type",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT image_path FROM product_images WHERE id = CAST (order_details_json ->> 'image_id' AS integer)) WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT image_path FROM gift_set_product_images WHERE id_product = "product_id" AND image_type = 1 AND is_deleted = '0') WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT image_path from loose_diamond_group_masters where id = "product_id") ELSE (SELECT image_path FROM images where id = CAST (order_details_json ->> 'image_id' AS integer)) END`
              ),
              "product_image",
            ],
            [Sequelize.literal(`CEIL("order"."sub_total")`), "product_price"],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT name FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT product_title from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT name from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT product_title from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_title from config_bracelet_products WHERE id = "product_id") WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.StudConfigurator} THEN (SELECT name from stud_config_products WHERE id = "product_id") WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.PendantConfigurator} THEN (SELECT name from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "product_title",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT sku FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT sku from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT sku from birthstone_products WHERE id = "product_id") WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters) WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT sku from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT sku from config_bracelet_products WHERE id = "product_id") WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.StudConfigurator} THEN (SELECT sku from stud_config_products WHERE id = "product_id") WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.PendantConfigurator} THEN (SELECT sku from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "product_sku",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT slug FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT slug from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT slug from birthstone_products WHERE id = "product_id") WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters) WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT slug from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT slug from config_bracelet_products WHERE id = "product_id") WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.StudConfigurator} THEN (SELECT slug from stud_config_products WHERE id = "product_id") WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.PendantConfigurator} THEN (SELECT name from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "product_slug",
            ],
            [
              Sequelize.literal(
                `(SELECT metal_masters.name FROM metal_masters WHERE metal_masters.id = CAST (order_details_json ->> 'metal_id' AS integer))`
              ),
              "metal",
            ],
            [
              Sequelize.literal(
                `(SELECT gold_kts.name FROM gold_kts WHERE gold_kts.id = CAST (order_details_json ->> 'karat_id' AS integer))`
              ),
              "Karat",
            ],
            [
              Sequelize.literal(
                `(SELECT name FROM metal_tones WHERE id = CAST (order_details_json ->> 'head_metal_tone' AS integer))`
              ),
              "head_metal_tone",
            ],
            [
              Sequelize.literal(
                `(SELECT name FROM metal_tones WHERE id = CAST (order_details_json ->> 'shank_metal_tone' AS integer))`
              ),
              "shank_metal_tone",
            ],
            [
              Sequelize.literal(
                `CASE WHEN (order_details_json ->> 'band_metal_tone') = 'null' THEN null ELSE (SELECT name FROM metal_tones WHERE id = CAST (order_details_json ->> 'band_metal_tone' AS integer)) END`
              ),
              "band_metal_tone",
            ],
            [
              Sequelize.literal(
                `CAST (order_details_json ->> 'head_metal_tone' AS integer)`
              ),
              "head_metal_tone_id",
            ],
            [
              Sequelize.literal(
                ` CAST (order_details_json ->> 'shank_metal_tone' AS integer)`
              ),
              "shank_metal_tone_id",
            ],
            [
              Sequelize.literal(
                ` CAST (order_details_json ->> 'band_metal_tone' AS integer)`
              ),
              "band_metal_tone_id",
            ],
            [
              Sequelize.literal(
                `(SELECT metal_tones.name FROM metal_tones WHERE metal_tones.id = CAST (order_details_json ->> 'metal_tone' AS integer))`
              ),
              "Metal_tone",
            ],
            [
              Sequelize.literal(
                `(SELECT items_sizes.size FROM items_sizes WHERE items_sizes.id = CAST (order_details_json ->> 'size_id' AS integer))`
              ),
              "product_size",
            ],
            [
              Sequelize.literal(
                `(SELECT items_lengths.length FROM items_lengths WHERE items_lengths.id = CAST (order_details_json ->> 'length_id' AS integer))`
              ),
              "product_length",
            ],
            [
              Sequelize.literal(`(CASE WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Product} OR CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.SettingProduct}  THEN 
                (SELECT diamond_shapes.name FROM product_diamond_options 
                LEFT JOIN diamond_group_masters ON diamond_group_masters.id = id_diamond_group
                INNER JOIN diamond_shapes  ON diamond_shapes.id = diamond_group_masters.id_shape
                WHERE id_product = "product_id" ORDER by id_type ASC LIMIT 1) 
  
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Config_Ring_product} OR CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Three_stone_config_product} THEN
                (SELECT diamond_shapes.name FROM config_products 
                LEFT JOIN diamond_shapes ON diamond_shapes.id = center_dia_shape_id
                WHERE config_products.id = "product_id")
  
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.BirthStone_product} THEN
                (SELECT diamond_shapes.name FROM birthstone_product_diamond_options 
                LEFT JOIN diamond_shapes ON id_shape = diamond_shapes.id
                WHERE id_product = "product_id" AND birthstone_product_diamond_options.is_deleted = '0' ORDER BY id_type ASC LIMIT 1)
  
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Config_band_product} THEN
                (SELECT diamond_shapes.name FROM config_eternity_product_diamonds  
                INNER JOIN diamond_shapes ON diamond_shapes.id = dia_shape
                WHERE config_eternity_product_diamonds.id = "product_id")

                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.StudConfigurator} THEN
                (SELECT diamond_shapes.name FROM stud_config_products
                LEFT JOIN diamond_shapes ON diamond_shapes.id = center_dia_shape
                WHERE stud_config_products.id = "product_id")
                
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.PendantConfigurator} THEN
                (SELECT diamond_shapes.name FROM config_pendant_products
                LEFT JOIN diamond_shapes ON diamond_shapes.id = center_dia_shape
                WHERE config_pendant_products.id = "product_id")
  
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.BraceletConfigurator} THEN
                (SELECT diamond_shapes.name FROM config_bracelet_product_diamonds 
                LEFT JOIN diamond_shapes ON diamond_shapes.id = id_shape
                WHERE config_product_id = "product_id" LIMIT 1)
                END)`),
              "diamond_shape",
            ],
            [
              Sequelize.literal(`(CASE WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Product} OR CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.SettingProduct}  THEN 
                (SELECT categories.category_name FROM product_categories 
                INNER JOIN categories ON categories.id = id_category
                WHERE id_product = "product_id" ORDER BY product_categories.id ASC LIMIT 1) 
  
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Config_Ring_product} OR CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Three_stone_config_product} THEN
                'Ring'
            
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.StudConfigurator} THEN
                'Earring'
            
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.PendantConfigurator} THEN
                'Pendant'
  
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.BirthStone_product} THEN
                (SELECT categories.category_name FROM birthstone_product_categories 
                INNER JOIN categories ON categories.id = id_category
                WHERE id_product = "product_id" ORDER BY birthstone_product_categories.id ASC LIMIT 1)
  
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.Eternity_product} THEN
                'Eternity Band'
                WHEN CAST(order_details_json ->> 'product_type' as INTEGER) = ${AllProductTypes.BraceletConfigurator} THEN
                'Bracelet'
                END)`),
              "category",
            ],
          ],
          required: false,
        },
      ],
    });

    if (orderDetails == null) {
      return resNotFound();
    }

    for (let index = 0; index < orderDetails.dataValues.order.length; index++) {
      const element = orderDetails.dataValues.order[index];
      orderDetails.dataValues.order[index].dataValues.product_price =
        orderDetails.dataValues.order[index].dataValues.sub_total;
      orderDetails.dataValues.order[index].dataValues.sub_total =
        orderDetails.dataValues.order[index].dataValues.sub_total +
        orderDetails.dataValues.order[index].dataValues.product_tax;
      if (
        element.order_details_json.product_type ==
        AllProductTypes.BirthStone_product &&
        element.order_details_json?.gemstone
      ) {
        for (let j = 0; j < element.order_details_json.gemstone.length; j++) {
          const gemstone = element.order_details_json.gemstone[j];
          const stone = await StoneData.findOne({
            where: { id: gemstone.stone },
          });
          element.order_details_json.gemstone[j].stone_value =
            stone?.dataValues.name;
          const cuts = await CutsData.findOne({ where: { id: gemstone.cut } });
          element.order_details_json.gemstone[j].cut_value =
            cuts?.dataValues.value;
          const mm_size = await MMSizeData.findOne({
            where: { id: gemstone.mm_size },
          });
          element.order_details_json.gemstone[j].mm_size_value =
            mm_size?.dataValues.value;
          const shape = await DiamondShape.findOne({
            where: {
              id:
                gemstone.shape &&
                  gemstone.shape != "null" &&
                  gemstone.shape != "undefined"
                  ? gemstone.shape
                  : null,
              
            },
          });
          element.order_details_json.gemstone[j].shape_value =
            shape?.dataValues.name;
        }
      }
    }
    return resSuccess({ data: orderDetails });
  } catch (error) {
    throw error;
  }
};

export const orderDetailsAPIAdmin = async (req: Request) => {
  const { order_number } = req.body;
  if (!order_number) {
    return resUnknownError({
      message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [
        ["field_name", "order number"],
      ]),
    });
  }

  try {
    const configData = await getWebSettingData();
    const orderDetails = await Orders.findOne({
      where: { order_number: order_number, },
      attributes: [
        "id",
        "order_number",
        "user_id",
        "email",
        [
          Sequelize.literal(
            '(SELECT customer_users.full_name FROM customer_users WHERE customer_users.id_app_user = "user_id")'
          ),
          "user_name",
        ],
        [
          Sequelize.literal(
            '(SELECT customer_users.email FROM customer_users WHERE customer_users.id_app_user = "user_id")'
          ),
          "user_email",
        ],
        [
          Sequelize.literal(
            '(SELECT customer_users.mobile FROM customer_users WHERE customer_users.id_app_user = "user_id")'
          ),
          "user_phone_number",
        ],
        "shipping_method",
        "pickup_store_id",
        "coupon_id",
        "sub_total",
        "shipping_cost",
        "discount",
        "total_tax",
        "currency_rate",
        "order_total",
        "payment_method",
        "currency_id",
        "order_status",
        "payment_status",
        "order_date",
        "order_type",
        "order_note",
        "order_taxs",
        "offer_details",
        "order_shipping_address",
        "order_billing_address",
        [
          Sequelize.literal(
            `(SELECT payment_transaction_id FROM order_transactions WHERE order_id = "orders"."id" AND payment_status = ${PaymentStatus.paid} LIMIT 1)`
          ),
          "payment_transaction_id",
        ],
        [
          Sequelize.literal(
            `(SELECT contries.country_name FROM contries WHERE id= CASE WHEN (order_shipping_address ->> 'country_id') = 'null' OR (order_shipping_address ->> 'country_id') = 'undefined' OR (order_shipping_address ->> 'country_id') = '' OR (order_shipping_address ->> 'country_id') IS NULL THEN NULL ELSE CAST (order_shipping_address ->> 'country_id' AS integer)END) `
          ),
          "shipping_add_country",
        ],
        [
          Sequelize.literal(
            `(SELECT state_name FROM states WHERE id=  CASE WHEN (order_shipping_address ->> 'state_id') = 'null' OR (order_shipping_address ->> 'state_id') = 'undefined' OR (order_shipping_address ->> 'state_id') = '' OR (order_shipping_address ->> 'state_id') IS NULL THEN NULL ELSE CAST (order_shipping_address ->> 'state_id' AS integer)END)`
          ),
          "shipping_add_state",
        ],
        [
          Sequelize.literal(
            `(SELECT city_name FROM cities WHERE id =  CASE WHEN (order_shipping_address ->> 'city_id') = 'null' OR (order_shipping_address ->> 'city_id') = 'undefined' OR (order_shipping_address ->> 'city_id') = '' OR (order_shipping_address ->> 'city_id') IS NULL THEN NULL ELSE CAST (order_shipping_address ->> 'city_id' AS integer)END)`
          ),
          "shipping_add_city",
        ],
        [
          Sequelize.literal(
            `(SELECT contries.country_name FROM contries WHERE id= CASE WHEN (order_billing_address ->> 'country_id') = 'null' OR (order_billing_address ->> 'country_id') = 'undefined' OR (order_billing_address ->> 'country_id') = '' OR (order_billing_address ->> 'country_id') IS NULL THEN NULL ELSE CAST (order_billing_address ->> 'country_id' AS integer)END)`
          ),
          "billing_add_country",
        ],
        [
          Sequelize.literal(
            `(SELECT state_name FROM states WHERE id=  CASE WHEN (order_billing_address ->> 'state_id') = 'null' OR (order_billing_address ->> 'state_id') = 'undefined' OR (order_billing_address ->> 'state_id') = '' OR (order_billing_address ->> 'state_id') IS NULL THEN NULL ELSE CAST (order_billing_address ->> 'state_id' AS integer)END)`
          ),
          "billing_add_state",
        ],
        [
          Sequelize.literal(
            `(SELECT city_name FROM cities WHERE id =  CASE WHEN (order_billing_address ->> 'city_id') = 'null' OR (order_billing_address ->> 'city_id') = 'undefined' OR (order_billing_address ->> 'city_id') = '' OR (order_billing_address ->> 'city_id') IS NULL THEN NULL ELSE CAST (order_billing_address ->> 'city_id' AS integer)END)`
          ),
          "billing_add_city",
        ],
      ],
      include: [
        {
          required: false,
          model:Invoices,
          as:"invoice",
          attributes:["invoice_pdf_path"],
        },
        {
          required: false,
          model: CouponData,
          as: "coupon",
          attributes: [
            "id",
            "coupon_code",
            "description",
            "discount_type",
            "percentage_off",
            "discount_amount",
            "maximum_discount_amount",
          ],
        },
        {
          required: false,
          model: CurrencyData,
          as: "currency",
          attributes: ["id", "code", "symbol", "currency", "symbol_placement", "thousand_token"],
        },
        {
          required:false,
          model: StoreAddress,
          as: "store_address",
          attributes: [
            "id",
            "address",
            "map_link",
            "branch_name"
          ],
        },
        {
          model: OrdersDetails,
          as: "order",
          attributes: [
            "quantity",
            "finding_charge",
            "makring_charge",
            "other_charge",
            "diamond_count",
            "discount_amount",
            "offer_details",
            "diamond_rate",
            "metal_rate",
            "sub_total",
            "product_tax",
            "product_details_json",
            "delivery_status",
            "payment_status",
            "refund_request_id",
            "order_details_json",
            "product_id",
            "variant_id",
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM product_images WHERE id = CAST (order_details_json ->> 'image_id' AS integer)) WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM gift_set_product_images WHERE id_product = "product_id" AND image_type = 1 AND is_deleted = '0') WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT CONCAT('${configData.image_base_url}', image_path) FROM loose_diamond_group_masters where id = "product_id") ELSE (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM images where id = CAST (order_details_json ->> 'image_id' AS integer)) END`
              ),
              "product_image",
            ],
            [Sequelize.literal("order_total"), "product_price"],
            [
              Sequelize.literal(
                `(SELECT  AVG(product_reviews.rating) FROM product_reviews WHERE product_reviews.product_id = 87)`
              ),
              "rating",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT name FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT product_title from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT name from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT product_title from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_title from config_bracelet_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN (SELECT name from stud_config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN (SELECT name from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "product_name",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT sort_description FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT short_des from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_sort_des from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_sort_des from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT sort_description from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT sort_description from loose_diamond_group_masters WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT product_sort_des from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_sort_des from config_bracelet_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN (SELECT sort_description from stud_config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN (SELECT sort_description from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "sort_description",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT long_description FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT long_des from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_long_des from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_long_des from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT long_description from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT long_description from loose_diamond_group_masters WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT product_long_des from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_long_des from config_bracelet_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN (SELECT long_description from stud_config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN (SELECT long_description from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "long_description",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT sku FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT sku from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT sku from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT sku from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT sku from config_bracelet_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN (SELECT sku from stud_config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN (SELECT sku from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "product_sku",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT slug FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT slug from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT slug from birthstone_products WHERE id = "product_id")WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.LooseDiamond} THEN (SELECT stock_id from loose_diamond_group_masters WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT slug from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT slug from config_bracelet_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.StudConfigurator} THEN (SELECT slug from stud_config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.PendantConfigurator} THEN (SELECT slug from config_pendant_products WHERE id = "product_id") ELSE null END`
              ),
              "product_slug",
            ],
            [
              Sequelize.literal(
                `(SELECT metal_masters.name FROM metal_masters WHERE metal_masters.id = CAST (order_details_json ->> 'metal_id' AS integer))`
              ),
              "metal",
            ],
            [
              Sequelize.literal(
                `(SELECT gold_kts.name FROM gold_kts WHERE gold_kts.id = CAST (order_details_json ->> 'karat_id' AS integer))`
              ),
              "Karat",
            ],
            [
              Sequelize.literal(
                `(SELECT metal_tones.name FROM metal_tones WHERE metal_tones.id = CAST (order_details_json ->> 'metal_tone' AS integer))`
              ),
              "Metal_tone",
            ],
            [
              Sequelize.literal(
                `(SELECT name FROM metal_tones WHERE id = CAST (order_details_json ->> 'head_metal_tone' AS integer))`
              ),
              "head_metal_tone",
            ],
            [Sequelize.literal(`order_details_json ->> 'is_band'`), "is_band"],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT heads.name FROM config_products LEFT OUTER JOIN heads ON heads.id = head_type_id WHERE config_products.id = "product_id") ELSE null END`
              ),
              "head",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT shanks.name FROM config_products LEFT OUTER JOIN shanks ON shanks.id = shank_type_id WHERE config_products.id = "product_id") ELSE null END`
              ),
              "shank",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT side_setting_styles.name FROM config_products LEFT OUTER JOIN side_setting_styles ON side_setting_styles.id = side_setting_id WHERE config_products.id = "product_id") ELSE null END`
              ),
              "side_setting",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT carat_sizes.value FROM config_products LEFT OUTER JOIN carat_sizes ON carat_sizes.id = center_dia_cts WHERE config_products.id = "product_id") ELSE null END`
              ),
              "center_diamond_size",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT diamond_shapes.name FROM config_products LEFT OUTER JOIN diamond_shapes ON diamond_shapes.id = center_dia_shape_id WHERE config_products.id = "product_id") ELSE null END`
              ),
              "center_diamond_shape",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT clarities.value FROM config_products LEFT OUTER JOIN clarities ON clarities.id = center_dia_clarity_id WHERE config_products.id = "product_id") ELSE null END`
              ),
              "center_diamond_clarity",
            ],
            [
              Sequelize.literal(
                `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT colors.value FROM config_products LEFT OUTER JOIN colors ON colors.id = center_dia_color WHERE config_products.id = "product_id") ELSE null END`
              ),
              "center_diamond_color",
            ],
            [
              Sequelize.literal(
                `(SELECT name FROM metal_tones WHERE id = CAST (order_details_json ->> 'shank_metal_tone' AS integer))`
              ),
              "shank_metal_tone",
            ],
            [
              Sequelize.literal(
                `CASE WHEN (order_details_json ->> 'band_metal_tone') = 'null' THEN null ELSE (SELECT name FROM metal_tones WHERE id = CAST (order_details_json ->> 'band_metal_tone' AS integer)) END`
              ),
              "band_metal_tone",
            ],
            [
              Sequelize.literal(
                `(SELECT items_sizes.size FROM items_sizes WHERE items_sizes.id = CAST (order_details_json ->> 'size_id' AS integer))`
              ),
              "product_size",
            ],
            [
              Sequelize.literal(
                `(SELECT items_lengths.length FROM items_lengths WHERE items_lengths.id = CAST (order_details_json ->> 'length_id' AS integer))`
              ),
              "product_length",
            ],
          ],
          required: false,
        },
      ],
    });

    if (orderDetails == null) {
      return resNotFound();
    }
    for (let index = 0; index < orderDetails.dataValues.order.length; index++) {
      const element = orderDetails.dataValues.order[index];
      orderDetails.dataValues.order[index].dataValues.product_price =
        orderDetails.dataValues.order[index].dataValues.sub_total;
      orderDetails.dataValues.order[index].dataValues.sub_total =
        orderDetails.dataValues.order[index].dataValues.sub_total +
        orderDetails.dataValues.order[index].dataValues.product_tax;
      if (
        element.order_details_json.product_type ==
        AllProductTypes.BirthStone_product &&
        element.order_details_json?.gemstone
      ) {
        for (let j = 0; j < element.order_details_json.gemstone.length; j++) {
          const gemstone = element.order_details_json.gemstone[j];
          const stone = await StoneData.findOne({
            where: { id: gemstone.stone, },
          });
          element.order_details_json.gemstone[j].stone = stone?.dataValues.name;
          const cuts = await CutsData.findOne({ where: { id: gemstone.cut } });
          element.order_details_json.gemstone[j].cut = cuts?.dataValues.value;
          const mm_size = await MMSizeData.findOne({
            where: { id: gemstone.mm_size, },
          });
          element.order_details_json.gemstone[j].mm_size =
            mm_size?.dataValues.value;
          const shape = await DiamondShape.findOne({
            where: {
              id:
                gemstone.shape &&
                  gemstone.shape != "null" &&
                  gemstone.shape != "undefined"
                  ? gemstone.shape
                  : null,
              
            },
          });
          element.order_details_json.gemstone[j].shape = shape?.dataValues.name;
        }
      }
    }

    return resSuccess({ data: orderDetails });
  } catch (error) {
    console.log("-----------------------", error);
    throw error;
  }
};

export const orderStatusUpdate = async (req: Request) => {
  try {
    const orderData = await Orders.findOne({ where: { id: req.body.id} });
    const userDeatil = await CustomerUser.findOne({ where: { id_app_user: orderData.dataValues.user_id } });
    if (!(orderData && orderData.dataValues)) {
      return resNotFound({ message: ORDER_NOT_FOUND });
    }

    const orderStatus = await Orders.update(
      {
        order_status: req.body.order_status,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: orderData.dataValues.id } }
    );

    const mailNewOrderPayload = {
      toEmailAddress: orderData.dataValues.email,
      contentTobeReplaced: {
        name: userDeatil.dataValues.full_name || orderData.dataValues.order_shipping_address.full_name,
        order_status: ORDER_STATUS_ID_FROM_LABEL[req.body.order_status as OrderStatus],
        order_date: new Date(orderData.dataValues.order_date).toLocaleDateString("en-GB"),
        order_number: orderData.dataValues.order_number,
      },
    }
    if (orderStatus) {
      await addActivityLogs([{
        old_data: { order_id: orderData?.dataValues?.id, data: {...orderData?.dataValues}},
        new_data: {
          order_id: orderData?.dataValues?.id, data: {
            ...orderData?.dataValues,order_status: req.body.order_status,
            modified_date: getLocalDate(),
            modified_by: req?.body?.session_res?.id_app_user,
          }
        }
      }], orderData?.dataValues?.id, LogsActivityType.OrderStatus, LogsType.Order, req?.body?.session_res?.id_app_user)
      
      await mailSendForOrderStatusUpdate(mailNewOrderPayload);
      return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
    }
  } catch (error) {
    throw error;
  }
};

export const deliveryStatusUpdate = async (req: Request) => {
  try {
    const orderData = await OrdersDetails.findOne({
      where: { order_id: req.body.order_id },
    });

    if (!(orderData && orderData.dataValues)) {
      return resNotFound({ message: ORDER_NOT_FOUND });
    }

    const orderStatus = await OrdersDetails.update(
      {
        delivery_status: req.body.delivery_status,
      },
      { where: { order_id: orderData.dataValues.order_id } }
    );
    if (orderStatus) {
      await addActivityLogs([{
        old_data: { order_id: orderData?.dataValues?.id, data: {...orderData?.dataValues}},
        new_data: {
          order_id: orderData?.dataValues?.id, data: {
            ...orderData?.dataValues,delivery_status: req.body.delivery_status,
            modified_date: getLocalDate(),
            modified_by: req?.body?.session_res?.id_app_user,
          }
        }
      }], orderData?.dataValues?.id, LogsActivityType.DeliveryStatus, LogsType.Order, req?.body?.session_res?.id_app_user)
      
      return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
    }
  } catch (error) {
    throw error;
  }
};

export const orderTransactionList = async (req: Request) => {
  try {

    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };
    let noPagination = req.query.no_pagination === "1";
    const where = [
      pagination.search_text
        ? {
          [Op.or]: [
            Sequelize.where(
              Sequelize.literal(
                `(SELECT COUNT(*) from orders WHERE id = order_id AND email ILIKE  '%${pagination.search_text}%')`
              ),
              ">",
              "0"
            ),
            Sequelize.where(
              Sequelize.literal(
                `(SELECT COUNT(*) from orders WHERE id = order_id AND order_shipping_address ->> 'full_name' ILIKE  '%${pagination.search_text}%')`
              ),
              ">",
              "0"
            ),
            Sequelize.where(
              Sequelize.literal(
                `(SELECT COUNT(*) FROM orders WHERE id = order_id ANd order_number ILIKE '%${pagination.search_text}%')`
              ),
              ">",
              0
            ),
          ],
        }
        : 
        {},
    ];

    if (!noPagination) {
      const totalItems = await OrderTransaction.count({ where });

      if (totalItems === 0) {
        return resSuccess({ data: { pagination, result: [] } });
      }
      pagination.total_items = totalItems;
      pagination.total_pages = Math.ceil(totalItems / pagination.per_page_rows);
    }

    const result = await OrderTransaction.findAll({
      where,
      limit: pagination.per_page_rows,
      offset: (pagination.current_page - 1) * pagination.per_page_rows,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "order_id",
        [
          Sequelize.literal(
            '(SELECT orders.order_number FROM orders WHERE id = "order_id")'
          ),
          "order_number",
        ],
        "payment_transaction_id",
        "payment_status",
        "order_amount",
        [
          Sequelize.literal('(SELECT email from orders WHERE id = "order_id")'),
          "gust_email",
        ],
        [
          Sequelize.literal(
            `(SELECT order_shipping_address ->> 'full_name' from orders WHERE id = "order_id")`
          ),
          "gust_name",
        ],
        [
          Sequelize.literal(
            '(SELECT customer_users.full_name from customer_users LEFT OUTER JOIN orders ON orders.user_id = customer_users.id_app_user WHERE orders.id = "order_id")'
          ),
          "user_name",
        ],
        [
          Sequelize.literal(
            '(SELECT customer_users.email from customer_users LEFT OUTER JOIN orders ON orders.user_id = customer_users.id_app_user WHERE orders.id = "order_id")'
          ),
          "user_email",
        ],
      ],
    });

    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (error) {
    throw error;
  }
};


export const addConfigProductOrder = async (req: Request) => {
  try {
    const {
      user_id,
      coupon_id,
      sub_total,
      order_note,
      is_add_address,
      payment_method,
      order_total,
      currency_id,
      order_shipping_address,
      order_type,
      shipping_method,
      pickup_store_id,
      order_billing_address,
      product_details,
      shipping_cost,
      discount,
      total_tax,
    } = req.body;
  
    if (user_id) {
      const users = await AppUser.findOne({
        where: { id: user_id, is_deleted: DeletedStatus.No },
      });
      if (!(users && users.dataValues)) {
        return resNotFound({ message: USER_NOT_FOUND });
      }
    }

    const taxValues = await TaxMaster.findAll({
      where: { is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No },
    });
    let OrderDetailsData:any = [];
    let OrderDetailsConfigData:any = [];
    let productTaxAmount: any;
    let productTax: any;
    let allTax = [];
    let taxRateData = [];
    for (const taxData of taxValues) {
      productTax = taxData.dataValues.rate / 100;
      productTaxAmount = sub_total * productTax;
      console.log("taxData", productTaxAmount);

      taxRateData.push({
        rate: taxData.dataValues.rate,
        tax_amount: parseFloat(productTaxAmount),
        name: taxData.dataValues.name,
      });
      allTax.push(parseFloat(productTaxAmount));
    }

    const sumTotal: any = allTax.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);

    const totalOrderAmount = parseFloat(sub_total) + parseFloat(sumTotal);

    console.log("totalOrderAmount", totalOrderAmount);

    if (totalOrderAmount.toFixed(2) != parseFloat(order_total).toFixed(2)) {
      return resBadRequest({ message: TOTAL_AMOUNT_WRONG });
    }

    const trn = await dbContext.transaction();
    const order_number = crypto.randomInt(1000000000, 9999999999);

    try {
      const billingAddresscityNameExistes = await CityData.findOne({
        where: [
          columnValueLowerCase("city_name", order_billing_address.city_id),
          { is_deleted: DeletedStatus.No },
          
        ],
      });

      let billingCityCreateId: any;
      if (
        billingAddresscityNameExistes &&
        billingAddresscityNameExistes.dataValues
      ) {
        billingCityCreateId = billingAddresscityNameExistes.dataValues.id;
      } else {
        const created = await CityData.create(
          {
            city_name: order_billing_address.city_id,
            city_code: order_billing_address.city_id,
            id_state: order_billing_address.state_id,
            created_date: getLocalDate(),
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
            
          },
          { transaction: trn }
        );
        await addActivityLogs([{
          old_data: null,
          new_data: {
            config_product_order_billing_address_city_id: created?.dataValues?.id, data: {
              ...created?.dataValues
            }
          }
        }], created?.dataValues?.id, LogsActivityType.Add, LogsType.ConfigProductOrderBillingCity, req?.body?.session_res?.id_app_user,trn)
        billingCityCreateId = created.dataValues.id;
      }

      const shippingAddresscityNameExistes = await CityData.findOne({
        where: [
          columnValueLowerCase("city_name", order_shipping_address.city_id),
          { is_deleted: DeletedStatus.No },
          
        ],
      });

      let shippingCityCreateId: any;
      if (
        shippingAddresscityNameExistes &&
        shippingAddresscityNameExistes.dataValues
      ) {
        shippingCityCreateId = shippingAddresscityNameExistes.dataValues.id;
      } else {
        const created = await CityData.create(
          {
            city_name: order_shipping_address.city_id,
            city_code: order_shipping_address.city_id,
            id_state: order_shipping_address.state_id,
            created_date: getLocalDate(),
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
            
          },
          { transaction: trn }
        );

        await addActivityLogs([{
          old_data: null,
          new_data: {
            config_product_order_shipping_address_city_id: created?.dataValues?.id, data: {
              ...created?.dataValues
            }
          }
        }], created?.dataValues?.id, LogsActivityType.Add, LogsType.ConfigProductOrderShippingCity, req?.body?.session_res?.id_app_user,trn)
      
        shippingCityCreateId = created.dataValues.id;
      }

      if (parseInt(is_add_address) == 1) {
        if (order_billing_address.id && order_shipping_address.id) {
          if (
            order_billing_address.id &&
            parseInt(order_billing_address.id) == 0
          ) {
            const payload = {
              user_id: user_id,
              full_name: order_billing_address.full_name,
              house_building: order_billing_address.house_builing,
              area_name: order_billing_address.area_name,
              pincode: order_billing_address.pincode,
              phone: order_billing_address.phone_number,
              city_id: billingCityCreateId,
              state_id: order_billing_address.state_id,
              country_id: order_billing_address.country_id,
              address_type: 2,
              default_addres: 0,
              is_deleted: 0,
              created_date: getLocalDate(),
              
            };

            const UserAddressData = await UserAddress.create(payload, { transaction: trn });
            await addActivityLogs([{
              old_data: null,
              new_data: {
                config_product_order_user_billing_address_id: UserAddressData?.dataValues?.id, data: {
                  ...UserAddressData?.dataValues
                }
              }
            }], UserAddressData?.dataValues?.id, LogsActivityType.Add, LogsType.ConfigProductOrderUserBillingAddress, req?.body?.session_res?.id_app_user,trn)          } else {
            const addressId = await UserAddress.findOne({
              where: { id: order_billing_address.id, is_deleted: DeletedStatus.No, },
            });
            if (!(addressId && addressId.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: ADDRESS_NOT_EXITS });
            }
            const addressInfo = await UserAddress.update(
              {
                house_building: order_billing_address.house_builing,
                full_name: order_billing_address.full_name,
                area_name: order_billing_address.area_name,
                pincode: order_billing_address.pincode,
                phone: order_billing_address.phone_number,
                city_id: billingCityCreateId,
                state_id: order_billing_address.state_id,
                country_id: order_billing_address.country_id,
                address_type: 2,
                default_addres: 0,
                modified_date: getLocalDate(),
              },

              {
                where: { id: addressId.dataValues.id, is_deleted: DeletedStatus.No, },
                transaction: trn,
              }
            );
            const afterUpdateFindMegaMenu = await UserAddress.findOne({
              where: { id: order_billing_address.id, is_deleted: DeletedStatus.No },
            });

            await addActivityLogs([{
              old_data: { config_product_order_user_billing_address_id: addressId?.dataValues?.id, data: {...addressId?.dataValues}},
              new_data: {
                config_product_order_user_billing_address_id: afterUpdateFindMegaMenu?.dataValues?.id, data: { ...afterUpdateFindMegaMenu?.dataValues }
              }
            }], addressId?.dataValues?.id,LogsActivityType.Edit, LogsType.ConfigProductOrderUserBillingAddress, req?.body?.session_res?.id_app_user,trn)
          
          }
          if (order_shipping_address.country_id != null) {
            if (
              order_shipping_address.id &&
              parseInt(order_shipping_address.id) == 0
            ) {
              const payload = {
                user_id: user_id,
                full_name: order_shipping_address.full_name,
                house_building: order_shipping_address.house_builing,
                area_name: order_shipping_address.area_name,
                pincode: order_shipping_address.pincode,
                phone: order_shipping_address.phone_number,
                city_id: shippingCityCreateId,
                state_id: order_shipping_address.state_id,
                country_id: order_shipping_address.country_id,
                address_type: 1,
                default_addres: 0,
                is_deleted: 0,
                created_date: getLocalDate(),
                
              };

              const UserAddressData = await UserAddress.create(payload, { transaction: trn });
              await addActivityLogs([{
                old_data: null,
                new_data: {
                  config_product_order_user_shipping_address_id: UserAddressData?.dataValues?.id, data: {
                    ...UserAddressData?.dataValues
                  }
                }
              }], UserAddressData?.dataValues?.id, LogsActivityType.Add, LogsType.ConfigProductOrderUserShippingAddress, req?.body?.session_res?.id_app_user,trn)            } else {
              const addressId = await UserAddress.findOne({
                where: { id: order_shipping_address.id, is_deleted: DeletedStatus.No },
              });
              if (!(addressId && addressId.dataValues)) {
                await trn.rollback();
                return resNotFound({ message: ADDRESS_NOT_EXITS });
              }
              const addressInfo = await UserAddress.update(
                {
                  house_building: order_shipping_address.house_builing,
                  full_name: order_shipping_address.full_name,
                  area_name: order_shipping_address.area_name,
                  pincode: order_shipping_address.pincode,
                  phone: order_shipping_address.phone_number,
                  city_id: shippingCityCreateId,
                  state_id: order_shipping_address.state_id,
                  country_id: order_shipping_address.country_id,
                  address_type: 1,
                  default_addres: 0,
                  modified_date: getLocalDate(),
                },
                {
                  where: { id: addressId.dataValues.id, is_deleted: DeletedStatus.No },
                  transaction: trn,
                }
              );
              const afterUpdateFindMegaMenu = await UserAddress.findOne({
                where: { id: order_shipping_address.id, is_deleted: DeletedStatus.No },
              });
  
              await addActivityLogs([{
                old_data: { config_product_order_user_shipping_address_id: addressId?.dataValues?.id, data: addressId?.dataValues},
                new_data: {
                  config_product_order_user_shipping_address_id: afterUpdateFindMegaMenu?.dataValues?.id, data: { ...afterUpdateFindMegaMenu?.dataValues }
                }
              }], addressId?.dataValues?.id,LogsActivityType.Edit, LogsType.ConfigProductOrderUserShippingAddress, req?.body?.session_res?.id_app_user,trn)
            
            }
          }
        }
      }
      const configData = await getWebSettingData();

      const ordersPayload = {
        order_number: `${configData.order_invoice_number_identity}-${order_number}`,
        user_id: user_id,
        shipping_method: shipping_method,
        pickup_store_id: pickup_store_id,
        coupon_id,
        sub_total: parseFloat(sub_total),
        shipping_cost: parseFloat(shipping_cost),
        discount: parseFloat(discount),
        total_tax: sumTotal,
        order_total: totalOrderAmount,
        payment_method: payment_method,
        currency_id: currency_id,
        order_status: OrderStatus.Pendding,
        payment_status: PaymentStatus.InPaid,
        order_date: getLocalDate(),
        order_type: order_type,
        order_note: order_note,
        order_shipping_address: {
          ...order_shipping_address,
          city_id: shippingCityCreateId,
        },
        order_billing_address: {
          ...order_billing_address,
          city_id: billingCityCreateId,
        },
        order_taxs: JSON.stringify(taxRateData),
        created_by: req.body.session_res.id_app_user,
        
        created_date: getLocalDate(),
      };

      const orders = await Orders.create(ordersPayload, { transaction: trn });

      for (let product of product_details) {
        if (!product.product_id) {
          await trn.rollback();
          return resBadRequest({ message: INVALID_ID });
        }

        if (product.is_config == 0) {
          const products = await Product.findOne({
            where: { id: product.product_id, is_deleted: DeletedStatus.No },
            transaction: trn,
          });
          if (!(products && products.dataValues)) {
            await trn.rollback();
            return resNotFound({ message: PRODUCT_NOT_FOUND });
          }

          let diamondRate = await dbContext.query(
            `SELECT sum(diamond_group_masters.rate*product_diamond_options.weight*product_diamond_options.count) FROM product_diamond_options LEFT OUTER JOIN diamond_group_masters ON diamond_group_masters.id = product_diamond_options.id_diamond_group WHERE product_diamond_options.id_product = ${product.product_id} `,
            { type: QueryTypes.SELECT }
          );
          const metalRates = await dbContext.query(
            `SELECT CASE WHEN PMO.id_karat IS NULL THEN (metal.metal_rate*PMO.metal_weight) ELSE (metal.metal_rate/metal.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight) END FROM products LEFT OUTER JOIN product_metal_options AS PMO ON PMO.id_product = products.id LEFT OUTER JOIN metal_masters AS metal ON PMO.id_metal = metal.id LEFT OUTER JOIN gold_kts ON PMO.id_karat = gold_kts.id WHERE CASE WHEN PMO.id_karat IS NULL THEN products.id = ${product.product_id} AND PMO.id_metal = ${product.order_details_json.metal_id} ELSE products.id = ${product.product_id} AND PMO.id_metal = ${product.order_details_json.metal_id} AND PMO.id_karat = ${product.order_details_json.karat_id} END`,
            { type: QueryTypes.SELECT }
          );
          const ordersDetails = await OrdersDetails.create(
            {
              order_id: orders.dataValues.id,
              product_id: product.product_id,
              quantity: product.quantity,
              finding_charge: parseFloat(products.dataValues.finding_charge),
              makring_charge: parseFloat(products.dataValues.making_charge),
              other_charge: parseFloat(products.dataValues.other_charge),
              diamond_rate: diamondRate.map((t: any) => t.sum)[0],
              metal_rate: metalRates.map((t: any) => t.case)[0],
              sub_total: parseInt(product.sub_total),
              product_tax: parseFloat(product.product_tax),
              discount_amount: parseFloat(product.discount_amount),
              shipping_cost: parseFloat(product.shipping_cost),
              shipping_method_id: shipping_method,
              delivery_status: DeliverStatus.Pendding,
              payment_status: PaymentStatus.InPaid,
              order_details_json: product.order_details_json,
              
            },
            { transaction: trn }
          );
           OrderDetailsData.push({...ordersDetails?.dataValues});
        } else {
          if (product.is_config == 1) {
            const products = await OrderTransaction.findOne({
              where: { id: product.product_id, is_deleted: DeletedStatus.No },
              transaction: trn,
            });
            if (!(products && products.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: PRODUCT_NOT_FOUND });
            }
            let diamondRate: any = await dbContext.query(
              `SELECT sum(PDGM.rate*CPDO.dia_count) FROM config_product_diamonds AS CPDO  LEFT OUTER JOIN diamond_group_masters AS PDGM ON CPDO.id_diamond_group = PDGM.id WHERE CPDO.config_product_id = ${product.product_id} AND CASE WHEN ${product.order_details_json.is_band} = 1 THEN  CPDO.product_type <> '' ELSE CPDO.product_type <> 'band' END`,
              { type: QueryTypes.SELECT }
            );
            const metalRates: any = await dbContext.query(
              `SELECT CASE WHEN CPMO.karat_id IS NULL THEN (SUM(metal_wt*(metal_master.metal_rate))+COALESCE(sum(CPMO.labor_charge), 0)) ELSE  (SUM(metal_wt*(metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate))+COALESCE(sum(CPMO.labor_charge), 0))  END  AS metal_rate FROM config_product_metals AS CPMO LEFT OUTER JOIN metal_masters AS metal_master ON metal_master.id = CPMO.metal_id LEFT OUTER JOIN gold_kts ON gold_kts.id = CPMO.karat_id WHERE  CPMO.config_product_id =  ${product.product_id} AND CASE WHEN 0 = 1 THEN  CPMO.head_shank_band <> '' ELSE CPMO.head_shank_band <> 'band' END GROUP BY config_product_id, CPMO.karat_id, CPMO.metal_id `,
              { type: QueryTypes.SELECT }
            );
            let diamondCount: any = await dbContext.query(
              `SELECT sum(CPDO.dia_count) FROM config_product_diamonds AS CPDO  LEFT OUTER JOIN diamond_group_masters AS PDGM ON CPDO.id_diamond_group = PDGM.id WHERE AND CPDO.config_product_id = ${product.product_id} AND CASE WHEN ${product.order_details_json.is_band} = 1 THEN  CPDO.product_type <> '' ELSE CPDO.product_type <> 'band' END`,
              { type: QueryTypes.SELECT }
            );
            const ordersDetails = await ConfigOrdersDetails.create(
              {
                order_id: orders.dataValues.id,
                product_id: product.product_id,
                quantity: product.quantity,
                labor_charge: parseFloat(products.dataValues.laber_charge),
                diamond_count: diamondCount[0].sum,
                diamond_rate: diamondRate[0].sum,
                metal_rate: metalRates[0].metal_rate,
                sub_total: parseInt(product.sub_total),
                product_tax: parseFloat(product.product_tax),
                discount_amount: parseFloat(product.discount_amount),
                shipping_cost: parseFloat(product.shipping_cost),
                shipping_method_id: shipping_method,
                delivery_status: DeliverStatus.Pendding,
                payment_status: PaymentStatus.InPaid,
                order_details_json: product.order_details_json,
                
              },
              { transaction: trn }
            );
            OrderDetailsConfigData.push({...ordersDetails?.dataValues});
          }
        }
      }
      await addActivityLogs([{
        old_data: null,
        new_data: {
          consfir_product_order_id: orders?.dataValues?.id, 
          order_data: {
            ...orders?.dataValues
          },
          order_detial_id: OrderDetailsData.id,
          order_detail_data: OrderDetailsData,
          config_order_id: OrderDetailsConfigData?.id,
          config_order_details: OrderDetailsConfigData
        }
      }], orders?.dataValues?.id, LogsActivityType.Add, LogsType.ConfigProductOrder, req?.body?.session_res?.id_app_user,trn)
      await trn.commit();
      return resSuccess({ data: orders });
    } catch (error) {
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } catch (error) {
    throw error;
  }
};

export const getAllConfigOrdersUser = async (req: Request) => {
  try {
    const { user_id, start_date, end_date, order_status } = req.query;
 
    const startDateFilter =
      start_date != undefined ? start_date : new Date().getFullYear();

    const endDateFilter = end_date != undefined ? end_date : new Date();

    if (!user_id) return resBadRequest({ message: INVALID_ID });
    const users = await AppUser.findOne({
      where: { id: user_id, is_deleted: DeletedStatus.No },
    });
    if (!(users && users.dataValues)) {
      return resNotFound({ message: USER_NOT_FOUND });
    }

    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };
    let noPagination = req.query.no_pagination === "1";

    let where = [
      { user_id: user_id },
      
      {
        [Op.or]: [
          { order_date: { [Op.between]: [startDateFilter, endDateFilter] } },
        ],
      },
      order_status && order_status != OrderStatus.All.toString()
        ? { order_status: { [Op.eq]: order_status } }
        : {}
    ];
    if (!noPagination) {
      const totalItems = await Orders.count({
        where,
      });

      if (totalItems === 0) {
        return resSuccess({ data: { pagination, result: [] } });
      }
      pagination.total_items = totalItems;
      pagination.total_pages = Math.ceil(totalItems / pagination.per_page_rows);
    }

    const result = await Orders.findAll({
      where,
      limit: pagination.per_page_rows,
      offset: (pagination.current_page - 1) * pagination.per_page_rows,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "order_number",
        "user_id",
        [
          Sequelize.literal(
            '(SELECT customer_users.full_name FROM customer_users WHERE customer_users.id_app_user = "user_id")'
          ),
          "user_name",
        ],
        "shipping_method",
        "pickup_store_id",
        "coupon_id",
        "sub_total",
        "shipping_cost",
        "discount",
        "total_tax",
        "order_total",
        "payment_method",
        "currency_id",
        "order_status",
        "payment_status",
        "order_type",
        "order_date",
        "order_note",
        "order_taxs",
        "order_shipping_address",
        "order_billing_address",
      ],
    });

    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (error) {
    throw error;
  }
};

export const configOrderDetailsAPI = async (req: Request) => {
  const { order_number } = req.body;
 
  if (!order_number) {
    return resUnknownError({
      message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [
        ["field_name", "order number"],
      ]),
    });
  }
  try {
    const orderDetails = await Orders.findOne({
      where: { order_number: order_number },
      attributes: [
        "id",
        "order_number",
        "user_id",
        "shipping_method",
        "pickup_store_id",
        "discount",
        "total_tax",
        "coupon_id",
        "sub_total",
        "shipping_cost",
        "discount",
        "total_tax",
        "currency_rate",
        "order_total",
        "payment_method",
        "currency_id",
        "order_status",
        "payment_status",
        "order_date",
        "order_type",
        "order_note",
        "order_taxs",
        "order_shipping_address",
        "order_billing_address",
      ],
    });

    if (orderDetails == null) {
      return resNotFound();
    }
    return resSuccess({ data: orderDetails });
  } catch (error) {
    throw error;
  }
};

export const addProductWithPaypalOrder = async (req: Request) => {
  try {
    const {
      user_id,
      email,
      coupon_id,
      sub_total,
      order_note,
      is_add_address,
      payment_method,
      order_total,
      currency_id,
      order_shipping_address,
      order_type,
      shipping_method,
      pickup_store_id,
      order_billing_address,
      product_details,
      shipping_cost,
      discount,
      total_tax,
    } = req.body;
    
    if (user_id) {
      const users = await AppUser.findOne({
        where: { id: user_id, is_deleted: DeletedStatus.No },
      });
      if (!(users && users.dataValues)) {
        return resNotFound({ message: USER_NOT_FOUND });
      }
    }

    const taxValues = await TaxMaster.findAll({
      where: { is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No ,  },
    });
    let productTaxAmount: any;
    let productTax: any;
    let allTax = [];
    let taxRateData = [];
    let ordersDetailsData:any = [];
    for (const taxData of taxValues) {
      productTax = taxData.dataValues.rate / 100;
      productTaxAmount = sub_total * productTax;
      console.log(productTaxAmount);

      taxRateData.push({
        rate: taxData.dataValues.rate,
        tax_amount: parseFloat(productTaxAmount.toFixed(2)),
        name: taxData.dataValues.name,
      });
      allTax.push(parseFloat(productTaxAmount.toFixed(2)));
    }

    const sumTotal = allTax.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);

    const totalOrderAmount =
      parseFloat(sub_total) + parseFloat(sumTotal.toFixed(2));

    if (totalOrderAmount.toFixed(2) != order_total) {
      return resBadRequest({ message: TOTAL_AMOUNT_WRONG });
    }

    const trn = await dbContext.transaction();
    const order_number = crypto.randomInt(1000000000, 9999999999);

    try {
      const billingAddresscityNameExistes = await CityData.findOne({
        where: [
          columnValueLowerCase("city_name", order_billing_address.city_id),
          { is_deleted: DeletedStatus.No },
          {  },
        ],
      });

      let billingCityCreateId: any;
      if (
        billingAddresscityNameExistes &&
        billingAddresscityNameExistes.dataValues
      ) {
        billingCityCreateId = billingAddresscityNameExistes.dataValues.id;
      } else {
        const created = await CityData.create(
          {
            city_name: order_billing_address.city_id,
            city_code: order_billing_address.city_id,
            id_state: order_billing_address.state_id,
            created_date: getLocalDate(),
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
            
          },
          { transaction: trn }
        );
        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_with_paypal_billing_address_city_id: created?.dataValues?.id, data: {
              ...created?.dataValues
            }
          }
        }], created?.dataValues?.id, LogsActivityType.Add, LogsType.OrderBillingCityWithPaypal, req?.body?.session_res?.id_app_user,trn)
      
        billingCityCreateId = created.dataValues.id;
      }

      const shippingAddresscityNameExistes = await CityData.findOne({
        where: [
          columnValueLowerCase("city_name", order_shipping_address.city_id),
          { is_deleted: DeletedStatus.No },
          {  },
        ],
      });

      let shippingCityCreateId: any;
      if (
        shippingAddresscityNameExistes &&
        shippingAddresscityNameExistes.dataValues
      ) {
        shippingCityCreateId = shippingAddresscityNameExistes.dataValues.id;
      } else {
        const created = await CityData.create(
          {
            city_name: order_shipping_address.city_id,
            city_code: order_shipping_address.city_id,
            id_state: order_shipping_address.state_id,
            created_date: getLocalDate(),
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
            
          },
          { transaction: trn }
        );
        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_with_paypal_shipping_address_city_id: created?.dataValues?.id, data: {
              ...created?.dataValues
            }
          }
        }], created?.dataValues?.id, LogsActivityType.Add, LogsType.OrderShippingCityWithPaypal, req?.body?.session_res?.id_app_user,trn)
      
        shippingCityCreateId = created.dataValues.id;
      }

      if (parseInt(is_add_address) == 1) {
        if (order_billing_address.id && order_shipping_address.id) {
          if (
            order_billing_address.id &&
            parseInt(order_billing_address.id) == 0
          ) {
            const payload = {
              user_id: user_id,
              full_name: order_billing_address.full_name,
              house_building: order_billing_address.house_builing,
              area_name: order_billing_address.area_name,
              pincode: order_billing_address.pincode,
              phone: order_billing_address.phone_number,
              city_id: billingCityCreateId,
              state_id: order_billing_address.state_id,
              country_id: order_billing_address.country_id,
              address_type: 2,
              default_addres: 0,
              is_deleted: 0,
              created_date: getLocalDate(),
              
            };

            const UserAddressData = await UserAddress.create(payload, { transaction: trn });
            await addActivityLogs([{
              old_data: null,
              new_data: {
                order_with_paypal_user_billing_address_id: UserAddressData?.dataValues?.id, data: {
                  ...UserAddressData?.dataValues
                }
              }
            }], UserAddressData?.dataValues?.id, LogsActivityType.Add, LogsType.OrderUserBillingAddressWithPaypal, req?.body?.session_res?.id_app_user,trn)          
          } else {
            const addressId = await UserAddress.findOne({
              where: { id: order_billing_address.id, is_deleted: DeletedStatus.No },
            });
            if (!(addressId && addressId.dataValues)) {
              await trn.rollback();
              return resNotFound({ message: ADDRESS_NOT_EXITS });
            }
            const addressInfo = await UserAddress.update(
              {
                house_building: order_billing_address.house_builing,
                full_name: order_billing_address.full_name,
                area_name: order_billing_address.area_name,
                pincode: order_billing_address.pincode,
                phone: order_billing_address.phone_number,
                city_id: billingCityCreateId,
                state_id: order_billing_address.state_id,
                country_id: order_billing_address.country_id,
                address_type: 2,
                default_addres: 0,
                modified_date: getLocalDate(),
                
              },

              {
                where: { id: addressId.dataValues.id, is_deleted: DeletedStatus.No },
                transaction: trn,
              }
            );
            const afterUpdateUseraddress = await UserAddress.findOne({
              where: { id: order_billing_address.id, is_deleted: DeletedStatus.No },
            });

            await addActivityLogs([{
              old_data: { order_with_paypal_user_billing_address_id: addressId?.dataValues?.id, data: addressId?.dataValues},
              new_data: {
                order_with_paypal_user_billing_address_id: afterUpdateUseraddress?.dataValues?.id, data: { ...afterUpdateUseraddress?.dataValues }
              }
            }], addressId?.dataValues?.id,LogsActivityType.Edit, LogsType.OrderUserBillingAddressWithPaypal, req?.body?.session_res?.id_app_user,trn)
          
          }
          if (order_shipping_address.country_id != null) {
            if (
              order_shipping_address.id &&
              parseInt(order_shipping_address.id) == 0
            ) {
              const payload = {
                user_id: user_id,
                full_name: order_shipping_address.full_name,
                house_building: order_shipping_address.house_builing,
                area_name: order_shipping_address.area_name,
                pincode: order_shipping_address.pincode,
                phone: order_shipping_address.phone_number,
                city_id: shippingCityCreateId,
                state_id: order_shipping_address.state_id,
                country_id: order_shipping_address.country_id,
                address_type: 1,
                default_addres: 0,
                is_deleted: 0,
                created_date: getLocalDate(),
                
              };

              const UserAddressData = await UserAddress.create(payload, { transaction: trn });
              await addActivityLogs([{
                old_data: null,
                new_data: {
                  order_with_paypal_user_shipping_address_id: UserAddressData?.dataValues?.id, data: {
                    ...UserAddressData?.dataValues
                  }
                }
              }], UserAddressData?.dataValues?.id, LogsActivityType.Add, LogsType.OrderUserShippingAddressWithPaypal, req?.body?.session_res?.id_app_user,trn)            } else {
              const addressId = await UserAddress.findOne({
                where: { id: order_shipping_address.id, is_deleted: DeletedStatus.No },
              });
              if (!(addressId && addressId.dataValues)) {
                await trn.rollback();
                return resNotFound({ message: ADDRESS_NOT_EXITS });
              }
              const addressInfo = await UserAddress.update(
                {
                  house_building: order_shipping_address.house_builing,
                  full_name: order_shipping_address.full_name,
                  area_name: order_shipping_address.area_name,
                  pincode: order_shipping_address.pincode,
                  phone: order_shipping_address.phone_number,
                  city_id: shippingCityCreateId,
                  state_id: order_shipping_address.state_id,
                  country_id: order_shipping_address.country_id,
                  address_type: 1,
                  default_addres: 0,
                  modified_date: getLocalDate(),
                },
                {
                  where: { id: addressId.dataValues.id, is_deleted: DeletedStatus.No },
                  transaction: trn,
                }
              );
              const afterUpdateFindUseraddress = await UserAddress.findOne({
                where: { id: order_shipping_address.id, is_deleted: DeletedStatus.No },
              });
  
              await addActivityLogs([{
                old_data: { order_with_paypal_user_shipping_address_id: addressId?.dataValues?.id, data: addressId?.dataValues},
                new_data: {
                  order_with_paypal_user_shipping_address_id: afterUpdateFindUseraddress?.dataValues?.id, data: { ...afterUpdateFindUseraddress?.dataValues }
                }
              }], addressId?.dataValues?.id,LogsActivityType.Edit, LogsType.OrderUserShippingAddressWithPaypal, req?.body?.session_res?.id_app_user,trn)
            
            }
          }
        }
      }
      const configData = await getWebSettingData()

      const ordersPayload = {
        order_number: `${configData.order_invoice_number_identity}-${order_number}`,
        user_id: user_id,
        email: email,
        shipping_method: shipping_method,
        pickup_store_id: pickup_store_id,
        coupon_id,
        sub_total: parseFloat(sub_total),
        shipping_cost: parseFloat(shipping_cost),
        discount: parseFloat(discount),
        total_tax: sumTotal,
        order_total: totalOrderAmount,
        payment_method: payment_method,
        currency_id: currency_id,
        order_status: OrderStatus.Pendding,
        payment_status: PaymentStatus.InPaid,
        order_date: getLocalDate(),
        order_type: order_type,
        order_note: order_note,
        order_shipping_address: {
          ...order_shipping_address,
          city_id: shippingCityCreateId,
        },
        order_billing_address: {
          ...order_billing_address,
          city_id: billingCityCreateId,
        },
        order_taxs: JSON.stringify(taxRateData),
        created_by: req.body.session_res.id_app_user,
        
        created_date: getLocalDate(),
      };

      const orders = await Orders.create(ordersPayload, { transaction: trn });

      for (let product of product_details) {
        if (!product.product_id) {
          await trn.rollback();
          return resBadRequest({ message: INVALID_ID });
        }
        const products = await Product.findOne({
          where: { id: product.product_id, is_deleted: DeletedStatus.No },
          transaction: trn,
        });
        if (!(products && products.dataValues)) {
          await trn.rollback();
          return resNotFound({ message: PRODUCT_NOT_FOUND });
        }
        let diamondRate = await dbContext.query(
          `SELECT sum(diamond_group_masters.rate) FROM product_diamond_options LEFT OUTER JOIN diamond_group_masters ON diamond_group_masters.id = product_diamond_options.id_diamond_group WHERE product_diamond_options.id_product = ${product.product_id} `,
          { type: QueryTypes.SELECT }
        );
        const metalRates = await dbContext.query(
          `SELECT CASE WHEN PMO.id_karat IS NULL THEN (metal.metal_rate*PMO.metal_weight) ELSE (metal.metal_rate/metal.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight) END FROM products LEFT OUTER JOIN product_metal_options AS PMO ON PMO.id_product = products.id LEFT OUTER JOIN metal_masters AS metal ON PMO.id_metal = metal.id LEFT OUTER JOIN gold_kts ON PMO.id_karat = gold_kts.id WHERE CASE WHEN PMO.id_karat IS NULL THEN products.id = ${product.product_id} AND PMO.id_metal = ${product.order_details_json.metal_id} ELSE products.id = ${product.product_id} AND PMO.id_metal = ${product.order_details_json.metal_id} AND PMO.id_karat = ${product.order_details_json.karat_id} END`,
          { type: QueryTypes.SELECT }
        );
        const ordersDetails = await OrdersDetails.create(
          {
            order_id: orders.dataValues.id,
            product_id: product.product_id,
            quantity: product.quantity,
            finding_charge: parseFloat(products.dataValues.finding_charge),
            makring_charge: parseFloat(products.dataValues.making_charge),
            other_charge: parseFloat(products.dataValues.other_charge),
            diamond_rate: diamondRate.map((t: any) => t.sum)[0],
            metal_rate: metalRates.map((t: any) => t.case)[0],
            sub_total: parseFloat(product.sub_total),
            product_tax: parseFloat(product.product_tax),
            discount_amount: parseFloat(product.discount_amount),
            shipping_cost: parseFloat(product.shipping_cost),
            shipping_method_id: shipping_method,
            delivery_status: DeliverStatus.Pendding,
            payment_status: PaymentStatus.InPaid,
            order_details_json: product.order_details_json,
            
          },
          { transaction: trn }
        );
        ordersDetailsData.push({...ordersDetails?.dataValues})
      }
      const currency = await CurrencyData.findOne({where: {id: currency_id, is_deleted: DeletedStatus.No }})

      const paayPalPamentData = await paymentPalVerification(
        order_number,
        totalOrderAmount,
        configData,
        currency?.dataValues?.currency_code,
      );
      if (paayPalPamentData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        await trn.rollback();
        return paayPalPamentData;
      }

      await addActivityLogs([{
        old_data: null,
        new_data: {
          order_id: orders?.dataValues?.id, 
          order_data: {
            ...orders?.dataValues
          },
          order_detail_id:ordersDetailsData.id,
          order_detail_data: ordersDetailsData,
          paypal_payment_id: paayPalPamentData.data.result.id,
          paypal_payment_data: paayPalPamentData.data.result
        }
      }], orders?.dataValues?.id, LogsActivityType.Add, LogsType.OrderWithPaypal, req?.body?.session_res?.id_app_user,trn)
    
      await trn.commit();
      return resSuccess({
        data: {
          paypalData: paayPalPamentData.data.result,
          orderData: orders.dataValues,
        },
      });
    } catch (error) {
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } catch (error) {
    throw error;
  }
};

const paymentPalVerification = async (order_number: any, amount: any, configData: any, currency: any) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `${configData.order_invoice_number_identity}-${order_number}`,
        amount: {
          currency_code: currency,
          value: amount,
          breakdown: {
            item_total: {
              currency_code: currency,
              value: amount,
            },
          },
        },
      },
    ],
  });

  try {
    const Environment =
  PROCESS_ENVIRONMENT == "development"
    ? paypal.core.SandboxEnvironment
    : paypal.core.LiveEnvironment;
const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(configData.paypal_public_key, configData.paypal_secret_key)
);
    const order = await paypalClient.execute(request);
    return resSuccess({ data: order });
  } catch (e: any) {
    return resUnknownError({ data: e.message });
  }
};

export const moveOrderToArchive = async (req: any) => {
  try {
    const { ids } = req.params;
    const errors = [];
    const oldOrder = [];
    const updateOrder = []

    if (!(ids) || ids.split(",").length < 1) {
      return resBadRequest({ data: ids, message: prepareMessageFromParams(REQUIRED_ERROR_MESSAGE, [["field_name", "ids"]]) });
    }

    const orders = await Orders.findAll({
      where: {
        order_status: {[Op.ne]: OrderStatus.Archived},
      },
    })
    for (let index = 0; index < ids.split(",").length; index++) {
      const element = ids.split(",")[index];
      
      const findOrder = orders.find((t: any) => t.dataValues.id == element);
      if (!(findOrder && findOrder.dataValues)) {
        errors.push(prepareMessageFromParams(ERROR_NOT_FOUND, [["field_name", `Order #${element} `]]));
      } else {

        if (findOrder.dataValues.order_status == OrderStatus.Confirmed || findOrder.dataValues.order_status == OrderStatus.Delivered || findOrder.dataValues.order_status == OrderStatus.Failed) {
          oldOrder.push({...findOrder.dataValues})
          updateOrder.push({...findOrder.dataValues, order_status: OrderStatus.Archived})
        } else {
          errors.push(prepareMessageFromParams(ONLY_STATUS_UPDATE, [["id", `${element} `],
            ["status_1", `${ORDER_STATUS_ID_FROM_LABEL[OrderStatus.Confirmed]} `],
            ["status_2", `${ORDER_STATUS_ID_FROM_LABEL[OrderStatus.Failed]} `],
            ["status_3", `${ORDER_STATUS_ID_FROM_LABEL[OrderStatus.Delivered]} `]
          ]));
        }
      }
    }

    if (errors.length > 0) {
      return resBadRequest({ data: errors });
    }

    await Orders.bulkCreate(updateOrder, { updateOnDuplicate: ["order_status"] });
    await addActivityLogs([{
          old_data: oldOrder,
          new_data: updateOrder
        }], null, LogsActivityType.OrderStatus, LogsType.Order, req?.body?.session_res?.id_app_user)
    return resSuccess({ data: updateOrder });
    
  } catch (error) {

    throw error
  }
};