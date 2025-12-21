import { Request } from "express";
import {
  addActivityLogs,
  generateInvoicePDF,
  getEmailTemplateContent,
  getLocalDate,
  getPriceFormat,
  getWebSettingData,
  resBadRequest,
  resNotFound,
  resSuccess,
  resUnknownError,
} from "../../utils/shared-functions";
import {
  DEFAULT_STATUS_CODE_ERROR,
  DEFAULT_STATUS_CODE_SUCCESS,
  INVOICE_NOT_FOUND,
  ORDER_AMOUNT_WRONG,
  ORDER_NOT_FOUND,
  ORDER_NUMBER_IS_INVALID,
  TRANSACTION_FAIL_MESSAGE,
  UNPROCESSABLE_ENTITY_CODE,
} from "../../utils/app-messages";
import {
  INVOICE_LOGO_IMAGE_BASE64
} from "../../config/env.var";
import {
  AllProductTypes,
  GIFT_PRODUCT_IMAGE_TYPE,
  LogsActivityType,
  LogsType,
  PRODUCT_IMAGE_TYPE,
  PaymentStatus,
  STONE_TYPE,
} from "../../utils/app-enumeration";
import axios from "axios";
import { Sequelize } from "sequelize";
import { Orders } from "../model/order.model";
import { OrdersDetails } from "../model/order-details.model";
import { OrderTransaction } from "../model/order-transaction.model";
import { Invoices } from "../model/invoices.model";
import { ProductMetalOption } from "../model/product-metal-option.model";
import { CurrencyData } from "../model/master/currency.model";
import { CustomerUser } from "../model/customer-user.model";
import { CartProducts } from "../model/cart-product.model";
import { StoreAddress } from "../model/store-address.model";
import { ConfigOrdersDetails } from "../model/config-order-details.model";
import { CompanyInfo } from "../model/companyinfo.model";
import { PAYMENT_METHOD_ID_FROM_LABEL } from "../../utils/app-constants";
import dbContext from "../../config/db-context";
export const PaymentTransaction = async (req: Request) => {
  const { order_id, order_number, amount, token } = req.body;
  let invoiceDetails: any;
  let errors: {
    error_status: number;
    error_message: any;
  }[] = [];

  const trn = await dbContext.transaction();

  const orderValidate = await Orders.findOne({
    where: {
      id: order_id,
    },
  });

  if (!(orderValidate && orderValidate.dataValues)) {
    return resNotFound({ message: ORDER_NOT_FOUND });
  }

  const orderNameValidate = await Orders.findOne({
    where: {
      id: order_id,
      order_number: order_number,
    },
  });

  if (!(orderNameValidate && orderNameValidate.dataValues)) {
    return resNotFound({ message: ORDER_NUMBER_IS_INVALID });
  }

  const orderAmontValidate = await Orders.findOne({
    where: {
      id: order_id,
      order_number: order_number,
      order_total: amount,
    },
  });

  if (!(orderAmontValidate && orderAmontValidate.dataValues)) {
    return resNotFound({ message: ORDER_AMOUNT_WRONG });
  }

  const order_details = await OrdersDetails.findAll({
    where: { order_id: orderAmontValidate.dataValues.id },
  });

  let i = (await Invoices.count()) + 1;
  const configData =  await getWebSettingData();

  const invoice_number = i.toString().padStart(configData.invoice_number_generate_digit_count, "0");

  const paymentInfo = await axios
    .post(
      "https://online.yoco.com/v1/charges/",
      {
        token: token,
        amountInCents: amount,
        currency: "ZAR",
      },
      {
        headers: {
          "X-Auth-Secret-Key": configData.yoco_secret_key,
        },
      }
    )
    .then(async (res: any) => {
      try {
        const order_transactions = {
          order_id: order_id,
          order_amount: parseFloat(amount),
          payment_status: PaymentStatus.paid,
          payment_currency: res.data.currency,
          payment_datetime: getLocalDate(),
          payment_source_type: res.data.source.brand,
          payment_json: res.data,
          payment_transaction_id: res.data.source.id,
          created_by: req.body.session_res.id_app_user,
          created_date: getLocalDate(),
        };
        const orders = await OrderTransaction.create(order_transactions, {
          transaction: trn,
        });

        const order = await Orders.findOne({where:{
          id: order_id,
          transaction: trn,
        }});

        await Orders.update(
          {
            payment_status: PaymentStatus.paid,
            modified_date: getLocalDate(),
            modified_by: req.body.session_res.id_app_user,
          },
          { where: { id: order_id }, transaction: trn }
        );

        const order_detail = await OrdersDetails.findAll({where:{
          order_id: order_id,
          transaction: trn,
        }});

        await OrdersDetails.update(
          {
            payment_status: PaymentStatus.paid,
          },
          { where: { order_id: order_id }, transaction: trn }
        );

        for (let value of order_details) {
          if (
            value.dataValues.order_details_json.product_type ==
            AllProductTypes.Product &&
            value.dataValues.variant_id
          ) {
            const products = await ProductMetalOption.findOne({
              where: {
                id_product: value.dataValues.product_id,
                id: value.dataValues.variant_id,
              },
              transaction: trn,
            });
            await ProductMetalOption.update(
              {
                remaing_quantity_count:
                  products.dataValues.remaing_quantity_count &&
                    products.dataValues.remaing_quantity_count != null
                    ? products.dataValues.remaing_quantity_count -
                    value.dataValues.quantity
                    : products.dataValues.remaing_quantity_count,
              },
              { where: { id: products.dataValues.id }, transaction: trn }
            );
          }
        }

        const invoiceData = {
          invoice_number: `${configData.order_invoice_number_identity}-${invoice_number}`,
          invoice_date: getLocalDate(),
          invoice_amount: amount,
          billing_address: orderAmontValidate.dataValues.order_billing_address,
          shipping_address: orderAmontValidate.dataValues.order_billing_address,
          order_id: orderAmontValidate.dataValues.id,
          transaction_id: orders.dataValues.id,
          created_date: getLocalDate(),
          created_by: req.body.session_res.id_app_user,
        };
        invoiceDetails = await Invoices.create(invoiceData, {
          transaction: trn,
        });

        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_transaction_id: orders?.dataValues?.id, order_transaction_data: {
              ...orders?.dataValues
            },
            invoice_details_id: invoiceDetails?.dataValues?.id, invoice_details_data: {
              ...invoiceDetails?.dataValues
            },
            orders_id: order?.dataValues?.id, 
            order_data: {
              ...order?.dataValues,payment_status: PaymentStatus.paid,
              modified_by: req?.body?.session_res?.id_app_user,
              modified_date: getLocalDate(),
            },
            order_detail_data: order_detail.map((t)=> ({
              ...t.dataValues,  // Spread the original data
              payment_status: PaymentStatus.paid,  // Add payment status
              modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
              modified_date: getLocalDate(),  // Add modified_date
            }))
        }}], orders?.dataValues?.id, LogsActivityType.Add, LogsType.PaymentTransaction, req?.body?.session_res?.id_app_user,trn)
      
        await trn.commit();
        return res.data;
      } catch (error) {
        errors.push({
          error_status: DEFAULT_STATUS_CODE_ERROR,
          error_message: error,
        });
        await trn.rollback();
        return resUnknownError({ data: error });
      }

      // res.status will contain the HTTP status code
      // res.data will contain the response body
    })
    .catch(async (error: any) => {
      errors.push({
        error_status: error.response.status,
        error_message: error.response.data,
      });
      try {
        const order_transactions = {
          order_id: order_id,
          order_amount: amount,
          payment_status: PaymentStatus.Failed,
          payment_datetime: getLocalDate(),
          payment_json: error,
          created_by: req.body.session_res.id_app_user,
          created_date: getLocalDate(),
        };
        const orders = await OrderTransaction.create(order_transactions, { transaction: trn });

        const order = await Orders.findOne({where:{
          id: order_id,
          transaction: trn,
        }});

        await Orders.update(
          {
            payment_status: PaymentStatus.Failed,
            modified_date: getLocalDate(),
            modified_by: req.body.session_res.id_app_user,
          },
          { where: { id: order_id }, transaction: trn }
        );

        const order_detail = await OrdersDetails.findAll({where:{
          order_id: order_id,
          transaction: trn,
        }});

        await OrdersDetails.update(
          {
            payment_status: PaymentStatus.Failed,
          },
          { where: { order_id: order_id }, transaction: trn }
        );

        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_transaction_id: orders?.dataValues?.id, order_transaction_data: {
              ...orders?.dataValues
            },
            orders_id: order?.dataValues?.id, 
            order_data: {
              ...order?.dataValues,payment_status: PaymentStatus.Failed,
              modified_by: req?.body?.session_res?.id_app_user,
              modified_date: getLocalDate(),
            },
            order_detail_data: order_detail.map((t)=> ({
              ...t.dataValues,  // Spread the original data
              payment_status: PaymentStatus.Failed,  // Add payment status
              modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
              modified_date: getLocalDate(),  // Add modified_date
            }))
        }}], orders?.dataValues?.id, LogsActivityType.Add, LogsType.PaymentTransaction, req?.body?.session_res?.id_app_user,trn)
      
        await trn.commit();
        return resBadRequest();
      } catch (error) {
        errors.push({
          error_status: DEFAULT_STATUS_CODE_ERROR,
          error_message: error,
        });
        await trn.rollback();
        return resUnknownError({ data: error });
      }
      // handle errors
    });

  if (errors.length > 0) {
    return resUnknownError({ data: errors });
  }

  const result: any = await Invoices.findOne({
    where: { order_id: invoiceDetails.dataValues.order_id },
    attributes: [
      "id",
      "invoice_number",
      "invoice_date",
      "invoice_amount",
      "billing_address",
      "shipping_address",
      "order_id",
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (shipping_address ->> 'country_id' AS integer))`
        ),
        "shipping_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (shipping_address ->> 'state_id' AS integer))`
        ),
        "shipping_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (shipping_address ->> 'city_id' AS integer))`
        ),
        "shipping_city",
      ],
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (billing_address ->> 'country_id' AS integer))`
        ),
        "billing_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (billing_address ->> 'state_id' AS integer))`
        ),
        "billing_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (billing_address ->> 'city_id' AS integer))`
        ),
        "billing_city",
      ],
      // [Sequelize.literal(`(SELECT payment_transaction_id FROM order_transactions WHERE order_id = ${invoiceDetails.dataValues.order_id})`), "transactions_id"]
    ],
    include: [
      {
        model: Orders,
        as: "order_invoice",
        attributes: [
          "id",
          "order_number",
          "discount",
          "email",
          "total_tax",
          "order_date",
          "payment_method",
          "shipping_cost",
          "sub_total",
          "order_taxs",
          "currency_id",
        ],
        include: [
          {
            model: OrdersDetails,
            as: "order",
            attributes: [
              "quantity",
              "sub_total",
              "product_tax",
              "order_details_json",
              "product_id",
              "product_details_json",
              "variant_id",
              "quantity",
              [
                Sequelize.literal(
                  `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} THEN (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM product_images WHERE id = CAST (order_details_json ->> 'image_id' AS integer) LIMIT 1) ELSE (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM images WHERE id = CAST (order_details_json ->> 'image_id' AS integer)) END`
                ),
                "product_image",
              ],
              [
                Sequelize.literal(
                  `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} THEN (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM product_images WHERE id = CAST (order_details_json ->> 'image_id' AS integer)) WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM gift_set_product_images WHERE id_product = "product_id" AND image_type = 1 AND is_deleted = '0') ELSE (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM images where id = CAST (order_details_json ->> 'image_id' AS integer)) END`
                ),
                "product_image",
              ],
              [Sequelize.literal("order_total"), "product_price"],
              [
                Sequelize.literal(
                  `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} THEN (SELECT name FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT product_title from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT name from birthstone_products WHERE id = "product_id") ELSE null END`
                ),
                "product_title",
              ],
              [
                Sequelize.literal(
                  `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} THEN (SELECT sku FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT sku from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT sku from birthstone_products WHERE id = "product_id") ELSE null END`
                ),
                "product_sku",
              ],
              [
                Sequelize.literal(
                  `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} THEN (SELECT slug FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT slug from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT slug from birthstone_products WHERE id = "product_id") ELSE null END`
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
      },
    ],
  });

  let logo_image = configData.image_base_url;
  const taxData = JSON.parse(result.dataValues.order_invoice.order_taxs);
  const productData: any = [];
  let findCurrency
  if (result.dataValues.order_invoice.currency_id && result.dataValues.order_invoice.currency_id != null) {
    findCurrency = await CurrencyData.findOne({
      where: { id: result.dataValues.order_invoice.currency_id },
    });
  } else {
    findCurrency = await CurrencyData.findOne({
      where: { is_default: "1" },
    });
   }

  for (const data of result.dataValues.order_invoice.order) {
    let engravingValue: any;
    let singleEngravingStr: any;
    if (
      data.order_details_json.product_type ==
      AllProductTypes.BirthStone_product &&
      data.order_details_json.engraving &&
      data.order_details_json.engraving.length > 0
    ) {
      for (
        let index = 0;
        index < data.order_details_json.engraving.length;
        index++
      ) {
        const element = data.order_details_json.engraving[index];
        if (element.value) {
          singleEngravingStr = `${element.text}: ${element.value}`;
          engravingValue = engravingValue
            ? engravingValue + "|" + " " + singleEngravingStr
            : singleEngravingStr;
        }
      }
    }
    productData.push({
      ...data.dataValues,
      engraving_value: engravingValue,
      engraving:
        AllProductTypes.Config_Ring_product ==
          data.order_details_json.product_type
          ? data.order_details_json.engraving
          : "",
      product_type: data.order_details_json.product_type,
      metal: data.dataValues.metal ? data.dataValues.metal : "",
      Karat: data.dataValues.Karat ? data.dataValues.Karat : "",
      Metal_tone: data.dataValues.Metal_tone ? data.dataValues.Metal_tone : "",
      product_size: data.dataValues.product_size
        ? data.dataValues.product_size
        : "",
      product_length: data.dataValues.product_length
        ? data.dataValues.product_length
        : "",
      currency: findCurrency.dataValues.symbol,
      product_price: getPriceFormat(
        data.dataValues.sub_total + data.dataValues.product_tax
      ),
      sub_total: getPriceFormat(data.dataValues.sub_total),
      font_style: data.order_details_json?.font_style
        ? data.order_details_json?.font_style
        : null,
    });
  }

  const userData = await CustomerUser.findOne({
    where: { id_app_user: orderValidate.dataValues.user_id },
  });

  let attachmentContent = await getEmailTemplateContent(req);
  if(attachmentContent.code !== DEFAULT_STATUS_CODE_SUCCESS){
    trn.rollback();
    return attachmentContent
  }
  
    const attachments:any = {
        invoice_number: result.dataValues.invoice_number,
        invoice_date: new Date(
          result.dataValues.invoice_date
        ).toLocaleDateString("en-GB"),
        total_amount: getPriceFormat(result.dataValues.invoice_amount),
        sub_total_amount: getPriceFormat(
          result.dataValues.order_invoice.sub_total
        ),
        currency: findCurrency.dataValues.symbol,
        total_tax: getPriceFormat(result.dataValues.order_invoice.total_tax),
        discount: result.dataValues.order_invoice.discount,
        shipping_cost: getPriceFormat(
          result.dataValues.order_invoice.shipping_cost
        ),
        order_number: result.dataValues.order_invoice.order_number,
        payment_method:
          PAYMENT_METHOD_ID_FROM_LABEL[
          result.dataValues.order_invoice.payment_method
          ],
        order_date: new Date(
          result.dataValues.order_invoice.order_date
        ).toLocaleDateString("en-GB"),
        billing_address: {
          house_builing: result.dataValues.billing_address.house_builing,
          area_name: result.dataValues.billing_address.area_name,
          city: result.dataValues.billing_city,
          state: result.dataValues.billing_state,
          country: result.dataValues.billing_country,
          pincode: result.dataValues.billing_address.pincode,
        },
        shipping_address: {
          house_builing: result.dataValues.shipping_address.house_builing,
          area_name: result.dataValues.shipping_address.area_name,
          city: result.dataValues.shipping_city,
          state: result.dataValues.shipping_state,
          country: result.dataValues.shipping_country,
          pincode: result.dataValues.shipping_address.pincode,
        },
        tax_array: taxData,
        data: productData,
        logo_image,
        frontend_url: configData?.fronted_base_url
    }
  
    const data = {
      id:result?.dataValues?.id,
      invoice_number: result?.dataValues?.invoice_number,          
    }
  
    const invoiceFromS3 = await generateInvoicePDF(data,attachmentContent.data,attachments);
  

  const mailNewOrderPayload = {
    toEmailAddress: result.dataValues.order_invoice.email,
    contentTobeReplaced: {
      name: userData?.dataValues.full_name
        ? userData?.dataValues.full_name
        : result.dataValues.billing_address.full_name,
      toBeReplace: {
        invoice_number: result.dataValues.invoice_number,
        invoice_date: new Date(
          result.dataValues.invoice_date
        ).toLocaleDateString("en-GB"),
        total_amount: getPriceFormat(result.dataValues.invoice_amount),
        sub_total_amount: getPriceFormat(
          result.dataValues.order_invoice.sub_total
        ),
        currency: findCurrency.dataValues.symbol,
        total_tax: getPriceFormat(result.dataValues.order_invoice.total_tax),
        discount: result.dataValues.order_invoice.discount,
        shipping_cost: getPriceFormat(
          result.dataValues.order_invoice.shipping_cost
        ),
        order_number: result.dataValues.order_invoice.order_number,
        payment_method:
          PAYMENT_METHOD_ID_FROM_LABEL[
          result.dataValues.order_invoice.payment_method
          ],
        order_date: new Date(
          result.dataValues.order_invoice.order_date
        ).toLocaleDateString("en-GB"),
        billing_address: {
          house_builing: result.dataValues.billing_address.house_builing,
          area_name: result.dataValues.billing_address.area_name,
          city: result.dataValues.billing_city,
          state: result.dataValues.billing_state,
          country: result.dataValues.billing_country,
          pincode: result.dataValues.billing_address.pincode,
        },
        shipping_address: {
          house_builing: result.dataValues.shipping_address.house_builing,
          area_name: result.dataValues.shipping_address.area_name,
          city: result.dataValues.shipping_city,
          state: result.dataValues.shipping_state,
          country: result.dataValues.shipping_country,
          pincode: result.dataValues.shipping_address.pincode,
        },
        tax_array: taxData,
        data: productData,
        logo_image,
        frontend_url: configData?.fronted_base_url,
      },
    },
    attachments:{
      filename: `${invoiceFromS3?.data?.filename}`,
      content: invoiceFromS3?.data?.content,
    }
  };

  const admin = {
    toEmailAddress: "info@thecadco.com",
    contentTobeReplaced: {
      mail: 'admin',
      name: userData?.dataValues.full_name
        ? userData?.dataValues.full_name
        : result.dataValues.billing_address.full_name,
      toBeReplace: {
        invoice_number: result.dataValues.invoice_number,
        invoice_date: new Date(
          result.dataValues.invoice_date
        ).toLocaleDateString("en-GB"),
        total_amount: getPriceFormat(result.dataValues.invoice_amount),
        sub_total_amount: getPriceFormat(
          result.dataValues.order_invoice.sub_total
        ),
        total_tax: getPriceFormat(result.dataValues.order_invoice.total_tax),
        discount: getPriceFormat(result.dataValues.order_invoice.discount),
        shipping_cost: getPriceFormat(
          result.dataValues.order_invoice.shipping_cost
        ),
        order_number: result.dataValues.order_invoice.order_number,
        payment_method:
          PAYMENT_METHOD_ID_FROM_LABEL[
          result.dataValues.order_invoice.payment_method
          ],
        order_date: new Date(
          result.dataValues.order_invoice.order_date
        ).toLocaleDateString("en-GB"),
        billing_address: {
          house_builing: result.dataValues.billing_address.house_builing,
          area_name: result.dataValues.billing_address.area_name,
          city: result.dataValues.billing_city,
          state: result.dataValues.billing_state,
          country: result.dataValues.billing_country,
        },
        shipping_address: {
          house_builing: result.dataValues.shipping_address.house_builing,
          area_name: result.dataValues.shipping_address.area_name,
          city: result.dataValues.shipping_city,
          state: result.dataValues.shipping_state,
          country: result.dataValues.shipping_country,
        },
        tax_array: taxData,
        data: productData,
        logo_image,
        frontend_url:configData?.fronted_base_url,
      },
    },
  };

  // await mailNewOrderReceived(mailNewOrderPayload);
  // await mailNewOrderAdminReceived(admin);
  const removeCartData:any = [];
  for (const items of order_details) {
    if (orderAmontValidate.dataValues.user_id) {
      const cartProduct = await CartProducts.findOne(
        {where:{user_id: orderAmontValidate.dataValues.user_id,
        product_id: items.dataValues.product_id}})
        removeCartData.push({...cartProduct?.dataValues})
      await CartProducts.destroy({
        where: {
          user_id: orderAmontValidate.dataValues.user_id,
          product_id: items.dataValues.product_id,
        },
      });
    }
  }
  const cart_list_count = await CartProducts.sum("quantity", {
    where: { user_id: orderAmontValidate.dataValues.user_id },
  });

  await addActivityLogs([{
    old_data: { data: removeCartData}, 
    new_data: null
  }], null, LogsActivityType.Delete, LogsType.PaymentTransaction, req?.body?.session_res?.id_app_user,trn)

  return resSuccess({ data: { paymentInfo, cart_list_count } });
};

export const invoivesDetailsApi = async (req: Request) => {
  try {
    const { order_id } = req.body;

    const configData =  await getWebSettingData();
    const result = await Invoices.findOne({
      where: { order_id: order_id },
      attributes: [
        "id",
        "invoice_number",
        "invoice_date",
        "invoice_amount",
        "billing_address",
        "shipping_address",
        "order_id",
        [
          Sequelize.literal(
            `(SELECT contries.country_name FROM contries WHERE id= CAST (shipping_address ->> 'country_id' AS integer))`
          ),
          "shipping_country",
        ],
        [
          Sequelize.literal(
            `(SELECT state_name FROM states WHERE id=  CAST (shipping_address ->> 'state_id' AS integer))`
          ),
          "shipping_state",
        ],
        [
          Sequelize.literal(
            `(SELECT city_name FROM cities WHERE id =  CAST (shipping_address ->> 'city_id' AS integer))`
          ),
          "shipping_city",
        ],
        [
          Sequelize.literal(
            `(SELECT contries.country_name FROM contries WHERE id= CAST (billing_address ->> 'country_id' AS integer))`
          ),
          "billing_country",
        ],
        [
          Sequelize.literal(
            `(SELECT state_name FROM states WHERE id=  CAST (billing_address ->> 'state_id' AS integer))`
          ),
          "billing_state",
        ],
        [
          Sequelize.literal(
            `(SELECT city_name FROM cities WHERE id =  CAST (billing_address ->> 'city_id' AS integer))`
          ),
          "billing_city",
        ],
        [
          Sequelize.literal(
            `(SELECT payment_transaction_id FROM order_transactions WHERE order_id = ${order_id} ORDER BY id DESC LIMIT 1)`
          ),
          "transactions_id",
        ],
      ],
      include: [
        {
          model: Orders,
          as: "order_invoice",
          attributes: [
            "id",
            "order_taxs",
            "order_number",
            "order_date",
            "payment_method",
            [Sequelize.literal(`CEIL(order_total)`), "order_total"],
            [Sequelize.literal(`CEIL(total_tax)`), "total_tax"],
            [Sequelize.literal(`CEIL("order_invoice"."sub_total")`), "sub_total"],
            [Sequelize.literal(`CEIL(discount)`), "discount"],
          ],
          include: [
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
                [
                  Sequelize.literal(
                    `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM product_images WHERE id = CAST (order_details_json ->> 'image_id' AS integer)) WHEN  CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM gift_set_product_images WHERE id_product = "product_id" AND image_type = 1 AND is_deleted = '0') ELSE (SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM images where id = CAST (order_details_json ->> 'image_id' AS integer)) END`
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
                    `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT name FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT product_title from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT product_title from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT name from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT product_title from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT product_title from config_bracelet_products WHERE id = "product_id") ELSE null END`
                  ),
                  "product_name",
                ],
                [
                  Sequelize.literal(
                    `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT sku FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT sku from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT sku from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT sku from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT sku from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT sku from config_bracelet_products WHERE id = "product_id")  ELSE null END`
                  ),
                  "product_sku",
                ],
                [
                  Sequelize.literal(
                    `CASE WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Product} OR CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.SettingProduct} THEN (SELECT slug FROM products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.GiftSet_product} THEN (SELECT slug from gift_set_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Config_Ring_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Three_stone_config_product} THEN (SELECT slug from config_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BirthStone_product} THEN (SELECT slug from birthstone_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.Eternity_product} THEN (SELECT slug from config_eternity_products WHERE id = "product_id") WHEN CAST (order_details_json ->> 'product_type' AS integer) = ${AllProductTypes.BraceletConfigurator} THEN (SELECT slug from config_bracelet_products WHERE id = "product_id") ELSE null END`
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
                [
                  Sequelize.literal(`order_details_json ->> 'is_band'`),
                  "is_band",
                ],
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
        },
      ],
    });

    if (
      result &&
      result.dataValues &&
      result.dataValues.order_invoice &&
      result.dataValues.order_invoice.dataValues.order
    )
      for (
        let index = 0;
        index < result.dataValues.order_invoice.dataValues.order.length;
        index++
      ) {
        result.dataValues.order_invoice.dataValues.order[
          index
        ].dataValues.product_price =
          result.dataValues.order_invoice.dataValues.order[
            index
          ].dataValues.sub_total;
        result.dataValues.order_invoice.dataValues.order[
          index
        ].dataValues.sub_total =
          result.dataValues.order_invoice.dataValues.order[index].dataValues
            .sub_total +
          result.dataValues.order_invoice.dataValues.order[index].dataValues
            .product_tax;
      }

    if (!(result && result.dataValues)) {
      return resNotFound({ message: INVOICE_NOT_FOUND });
    }

    return resSuccess({ data: result });
  } catch (error) {
    throw error;
  }
};

export const configProductPaymentTransaction = async (req: Request) => {
  const { order_id, order_number, amount, token } = req.body;
  let invoiceDetails: any;
  let errors: {
    error_status: number;
    error_message: any;
  }[] = [];

  const trn = await dbContext.transaction();

  const orderValidate = await Orders.findOne({
    where: {
      id: order_id,
    },
  });

  if (!(orderValidate && orderValidate.dataValues)) {
    return resNotFound({ message: ORDER_NOT_FOUND });
  }

  const orderNameValidate = await Orders.findOne({
    where: {
      id: order_id,
      order_number: order_number,
    },
  });

  if (!(orderNameValidate && orderNameValidate.dataValues)) {
    return resNotFound({ message: ORDER_NUMBER_IS_INVALID });
  }

  const orderAmontValidate = await Orders.findOne({
    where: {
      id: order_id,
      order_number: order_number,
      order_total: amount,
    },
  });

  if (!(orderAmontValidate && orderAmontValidate.dataValues)) {
    return resNotFound({ message: ORDER_AMOUNT_WRONG });
  }

  const order_details = await OrdersDetails.findAll({
    where: { order_id: orderAmontValidate.dataValues.id },
  });

  const configProductDetails = await ConfigOrdersDetails.findAll({
    where: { order_id: orderAmontValidate.dataValues.id },
  });

  let i = (await Invoices.count()) + 1;
  const configData =  await getWebSettingData();

  const invoice_number = i.toString().padStart(configData.invoice_number_generate_digit_count, "0");

  const paymentInfo = await axios
    .post(
      "https://online.yoco.com/v1/charges/",
      {
        token: token,
        amountInCents: amount,
        currency: "ZAR",
      },
      {
        headers: {
          "X-Auth-Secret-Key": configData.yoco_secret_key,
        },
      }
    )
    .then(async (res: any) => {
      try {
        const order_transactions = {
          order_id: order_id,
          order_amount: parseFloat(amount),
          payment_status: PaymentStatus.paid,
          payment_currency: res.data.currency,
          payment_datetime: getLocalDate(),
          payment_source_type: res.data.source.brand,
          payment_json: res.data,
          payment_transaction_id: res.data.source.id,
          created_by: req.body.session_res.id_app_user,
          created_date: getLocalDate(),
        };
        const orders = await OrderTransaction.create(order_transactions, {
          transaction: trn,
        });
        const order = await Orders.findOne({where:{
          id: order_id,
          transaction: trn,
        }});
        await Orders.update(
          {
            payment_status: PaymentStatus.paid,
            modified_date: getLocalDate(),
            modified_by: req.body.session_res.id_app_user,
          },
          { where: { id: order_id }, transaction: trn }
        );
        const order_detail = await OrdersDetails.findAll({where:{
          order_id: order_id,
          transaction: trn,
        }});
        await OrdersDetails.update(
          {
            payment_status: PaymentStatus.paid,
          },
          { where: { order_id: order_id }, transaction: trn }
        );
        const config_order_detail = await ConfigOrdersDetails.findAll({where:{
          order_id: order_id,
          transaction: trn,
        }});
        await ConfigOrdersDetails.update(
          {
            payment_status: PaymentStatus.paid,
          },
          { where: { order_id: order_id }, transaction: trn }
        );

        const invoiceData = {
          invoice_number: `${configData.order_invoice_number_identity}-${invoice_number}`,
          invoice_date: getLocalDate(),
          invoice_amount: amount,
          billing_address: orderAmontValidate.dataValues.order_billing_address,
          shipping_address: orderAmontValidate.dataValues.order_billing_address,
          order_id: orderAmontValidate.dataValues.id,
          transaction_id: orders.dataValues.id,
          created_date: getLocalDate(),
          created_by: req.body.session_res.id_app_user,
        };
        invoiceDetails = await Invoices.create(invoiceData, {
          transaction: trn,
        });

        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_transaction_id: orders?.dataValues?.id, order_transaction_data: {
              ...orders?.dataValues
            },
            invoice_details_id: invoiceDetails?.dataValues?.id, invoice_details_data: {
              ...invoiceDetails?.dataValues
            },
            orders_id: order?.dataValues?.id, 
            order_data: {
              ...order?.dataValues,payment_status: PaymentStatus.paid,
              modified_by: req?.body?.session_res?.id_app_user,
              modified_date: getLocalDate(),
            },
            order_detail_data: order_detail.map((t)=> ({
              ...t.dataValues,  // Spread the original data
              payment_status: PaymentStatus.paid,  // Add payment status
              modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
              modified_date: getLocalDate(),  // Add modified_date
            })),
            config_order_detail_data: config_order_detail.map((t)=> ({
              ...t.dataValues,  // Spread the original data
              payment_status: PaymentStatus.paid,  // Add payment status
              modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
              modified_date: getLocalDate(),  // Add modified_date
            }))
        }}], orders?.dataValues?.id, LogsActivityType.Add, LogsType.ConfigPaymentTransaction, req?.body?.session_res?.id_app_user,trn)
      
        await trn.commit();
        return res.data;
      } catch (error) {
        errors.push({
          error_status: DEFAULT_STATUS_CODE_ERROR,
          error_message: error,
        });
        await trn.rollback();
        return resUnknownError({ data: error });
      }

      // res.status will contain the HTTP status code
      // res.data will contain the response body
    })
    .catch(async (error: any) => {
      errors.push({
        error_status: error.response.status,
        error_message: error.response.data,
      });
      try {
        const order_transactions = {
          order_id: order_id,
          order_amount: amount,
          payment_status: PaymentStatus.Failed,
          payment_datetime: getLocalDate(),
          payment_json: error,
          created_by: req.body.session_res.id_app_user,
          created_date: getLocalDate(),
        };
        const orders = await OrderTransaction.create(order_transactions, { transaction: trn });
        const order = await Orders.findOne({where:{
          id: order_id,
          transaction: trn,
        }});
        await Orders.update(
          {
            payment_status: PaymentStatus.Failed,
            modified_date: getLocalDate(),
            modified_by: req.body.session_res.id_app_user,
          },
          { where: { id: order_id }, transaction: trn }
        );
        const order_detail = await OrdersDetails.findAll({where:{
          order_id: order_id,
          transaction: trn,
        }});
        await OrdersDetails.update(
          {
            payment_status: PaymentStatus.Failed,
          },
          { where: { order_id: order_id }, transaction: trn }
        );
        const config_order_detail = await ConfigOrdersDetails.findAll({where:{
          order_id: order_id,
          transaction: trn,
        }});
        await ConfigOrdersDetails.update(
          {
            payment_status: PaymentStatus.Failed,
          },
          { where: { order_id: order_id }, transaction: trn }
        );

        await addActivityLogs([{
          old_data: null,
          new_data: {
            order_transaction_id: orders?.dataValues?.id, order_transaction_data: {
              ...orders?.dataValues
            },
            invoice_details_id: invoiceDetails?.dataValues?.id, invoice_details_data: {
              ...invoiceDetails?.dataValues
            },
            orders_id: order?.dataValues?.id, 
            order_data: {
              ...order?.dataValues,payment_status: PaymentStatus.Failed,
              modified_by: req?.body?.session_res?.id_app_user,
              modified_date: getLocalDate(),
            },
            order_detail_data: order_detail.map((t)=> ({
              ...t.dataValues,  // Spread the original data
              payment_status: PaymentStatus.Failed,  // Add payment status
              modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
              modified_date: getLocalDate(),  // Add modified_date
            })),
            config_order_detail_data: config_order_detail.map((t)=> ({
              ...t.dataValues,  // Spread the original data
              payment_status: PaymentStatus.Failed,  // Add payment status
              modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
              modified_date: getLocalDate(),  // Add modified_date
            }))
        }}], orders?.dataValues?.id, LogsActivityType.Add, LogsType.ConfigPaymentTransaction, req?.body?.session_res?.id_app_user,trn)
      
        await trn.commit();
        return resBadRequest();
      } catch (error) {
        errors.push({
          error_status: DEFAULT_STATUS_CODE_ERROR,
          error_message: error,
        });
        await trn.rollback();
        return resUnknownError({ data: error });
      }
      // handle errors
    });

  if (errors.length > 0) {
    return resUnknownError({ data: errors });
  }

  const result: any = await Invoices.findOne({
    where: { order_id: order_id },
    attributes: [
      "id",
      "invoice_number",
      "invoice_date",
      "invoice_amount",
      "billing_address",
      "shipping_address",
      "order_id",
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (shipping_address ->> 'country_id' AS integer))`
        ),
        "shipping_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (shipping_address ->> 'state_id' AS integer))`
        ),
        "shipping_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (shipping_address ->> 'city_id' AS integer))`
        ),
        "shipping_city",
      ],
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (billing_address ->> 'country_id' AS integer))`
        ),
        "billing_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (billing_address ->> 'state_id' AS integer))`
        ),
        "billing_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (billing_address ->> 'city_id' AS integer))`
        ),
        "billing_city",
      ],
    ],
    include: [
      {
        required: false,
        model: Orders,
        as: "order_invoice",
        attributes: [
          "id",
          "sub_total",
          "discount",
          "shipping_cost",
          "order_taxs",
        ],
        include: [
          {
            model: OrdersDetails,
            as: "order",
            attributes: [
              "product_id",
              "quantity",
              "sub_total",
              "product_tax",
              "product_details_json",
              [
                Sequelize.literal(
                  `(SELECT products.name FROM products WHERE id = "product_id")`
                ),
                "product_name",
              ],
              [
                Sequelize.literal(
                  `(SELECT products.sku FROM products WHERE id = "product_id")`
                ),
                "product_sku",
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
                Sequelize.literal(
                  `(SELECT shapes.name FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN diamond_shapes AS shapes ON shapes.id = DGM.id_shape WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_shape",
              ],
              [
                Sequelize.literal(
                  `(SELECT gemstones.name FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN gemstones ON gemstones.id = DGM.id_stone WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond",
              ],
              [
                Sequelize.literal(
                  `(SELECT colors.value FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN colors ON colors.id = DGM.id_color WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_color",
              ],
              [
                Sequelize.literal(
                  `(SELECT clarities.value FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN clarities ON clarities.id = DGM.id_clarity WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_clarity",
              ],
            ],
          },
        ],
      },
    ],
  });

  const configProductResult: any = await Invoices.findOne({
    where: { order_id: order_id },
    attributes: [
      "id",
      "invoice_number",
      "invoice_date",
      "invoice_amount",
      "billing_address",
      "shipping_address",
      "order_id",
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (shipping_address ->> 'country_id' AS integer))`
        ),
        "shipping_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (shipping_address ->> 'state_id' AS integer))`
        ),
        "shipping_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (shipping_address ->> 'city_id' AS integer))`
        ),
        "shipping_city",
      ],
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (billing_address ->> 'country_id' AS integer))`
        ),
        "billing_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (billing_address ->> 'state_id' AS integer))`
        ),
        "billing_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (billing_address ->> 'city_id' AS integer))`
        ),
        "billing_city",
      ],
    ],
    include: [
      {
        required: false,
        model: Orders,
        as: "order_invoice",
        attributes: [
          "id",
          "sub_total",
          "discount",
          "shipping_cost",
          "order_taxs",
          "currency_id"
        ],
        include: [
          {
            model: ConfigOrdersDetails,
            as: "config_order",
            attributes: [
              "product_id",
              "quantity",
              "sub_total",
              "product_tax",
              [
                Sequelize.literal(
                  `(SELECT config_products.product_title FROM config_products WHERE id = "product_id")`
                ),
                "product_name",
              ],
              [
                Sequelize.literal(
                  `(SELECT config_products.sku FROM config_products WHERE id = "product_id")`
                ),
                "product_sku",
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
                Sequelize.literal(
                  `(SELECT diamond_shapes.name FROM config_products LEFT OUTER JOIN diamond_group_masters ON diamond_group_masters.id = config_products.center_diamond_group_id LEFT OUTER JOIN diamond_shapes ON diamond_shapes.id = diamond_group_masters.id_shape WHERE config_products.id = "product_id")`
                ),
                "diamond_shape",
              ],
              [
                Sequelize.literal(
                  `(SELECT gemstones.name FROM config_products LEFT OUTER JOIN diamond_group_masters ON diamond_group_masters.id = config_products.center_diamond_group_id LEFT OUTER JOIN gemstones ON gemstones.id = diamond_group_masters.id_stone WHERE config_products.id = "product_id")`
                ),
                "diamond",
              ],
              [
                Sequelize.literal(
                  `(SELECT colors.value FROM config_products LEFT OUTER JOIN diamond_group_masters ON diamond_group_masters.id = config_products.center_diamond_group_id LEFT OUTER JOIN colors ON colors.id = diamond_group_masters.id_color WHERE config_products.id = "product_id")`
                ),
                "diamond_color",
              ],
              [
                Sequelize.literal(
                  `(SELECT clarities.value FROM config_products LEFT OUTER JOIN diamond_group_masters ON diamond_group_masters.id = config_products.center_diamond_group_id LEFT OUTER JOIN clarities ON clarities.id = diamond_group_masters.id_clarity WHERE config_products.id = "product_id")`
                ),
                "diamond_clarity",
              ],
            ],
          },
        ],
      },
    ],
  });

  const allProductList = [
    ...result.dataValues.order_invoice.order,
    ...configProductResult.dataValues.order_invoice.config_order,
  ];
  let findCurrency
  if (result?.dataValues?.order_invoice?.currency_id && result?.dataValues?.order_invoice?.currency_id !== null) {
    findCurrency = await CurrencyData.findOne({
      where: {
        id: result?.dataValues?.order_invoice?.currency_id,
      },
    });
  } else {
    findCurrency = await CurrencyData.findOne({
      where: {
        is_default: "1",
      },
    });
  }
  const findCompanyDetails = await CompanyInfo.findOne({
  });
  let productData = [];

  for (let data of allProductList) {
    const list = {
      product_id: data.dataValues.product_id,
      quantity: data.dataValues.quantity,
      sub_total: data.dataValues.sub_total,
      product_tax: data.dataValues.product_tax,
      product_name: data.dataValues.product_name,
      product_sku: data.dataValues.product_sku,
      metal: data.dataValues.metal,
      Karat: data.dataValues.Karat,
      Metal_tone: data.dataValues.Metal_tone,
      product_size: data.dataValues.product_size,
      product_length: data.dataValues.product_length,
      diamond_shape: data.dataValues.diamond_shape,
      diamond: data.dataValues.diamond,
      diamond_color: data.dataValues.diamond_color,
      diamond_clarity: data.dataValues.diamond_clarity,
      product_price: data.dataValues.sub_total + data.dataValues.product_tax,
      currency: findCurrency.dataValues.symbol,
    };

    productData.push(list);
  }

  let logo_image = configData.image_base_url;
  const taxData = JSON.parse(result.dataValues.order_invoice.order_taxs);

  const userData = await CustomerUser.findOne({
    where: { id_app_user: orderValidate.dataValues.user_id },
  });
    let attachmentContent = await getEmailTemplateContent(req);
    if(attachmentContent.code !== DEFAULT_STATUS_CODE_SUCCESS){
      trn.rollback();
      return attachmentContent
    }
  const attachments:any = {
      invoice_number: result.dataValues.invoice_number,
      invoice_date: new Date(
        result.dataValues.invoice_date
      ).toLocaleDateString("en-GB"),
      total_amount: result.dataValues.invoice_amount,
      pdf_app_logo: INVOICE_LOGO_IMAGE_BASE64,
      currency: findCurrency.dataValues.symbol,
      company_number: findCompanyDetails.dataValues.company_number,
      company_address: findCompanyDetails.dataValues.company_address,
      sub_total_amount: result.dataValues.order_invoice.sub_total,
      discount: result.dataValues.order_invoice.discount,
      shipping_cost: result.dataValues.order_invoice.shipping_cost,
      billing_address: {
        house_builing: result.dataValues.billing_address.house_builing,
        area_name: result.dataValues.billing_address.area_name,
        city: result.dataValues.billing_city,
        state: result.dataValues.billing_state,
        country: result.dataValues.billing_country,
      },
      shipping_address: {
        house_builing: result.dataValues.shipping_address.house_builing,
        area_name: result.dataValues.shipping_address.area_name,
        city: result.dataValues.shipping_city,
        state: result.dataValues.shipping_state,
        country: result.dataValues.shipping_country,
      },
      tax_array: taxData,
      data: productData,
      logo_image,
      frontend_url: configData?.fronted_base_url,
  }

  const data = {
    id:result?.dataValues?.id,
    invoice_number: result?.dataValues?.invoice_number,          
  }

    const invoiceFromS3 = await generateInvoicePDF(data,attachmentContent.data,attachments);

  const mailNewOrderPayload = {
    toEmailAddress: userData?.dataValues.email,
    contentTobeReplaced: { name: userData?.dataValues.full_name },
    attachments: {
      filename: `${invoiceFromS3?.data?.filename}`,
      content: invoiceFromS3?.data?.content
    },
  };

  // await mailNewOrderReceived(mailNewOrderPayload);

  if (order_details.length > 0 || configProductDetails.length > 0) {
    await CartProducts.destroy({
      where: { user_id: orderAmontValidate.dataValues.user_id },
    });

  
  }

  const cart_list_count = await CartProducts.sum("quantity", {
    where: { user_id: orderAmontValidate.dataValues.user_id },
  });

  const totalCartCount = cart_list_count ;

  return resSuccess({ data: { paymentInfo, totalCartCount } });
};

export const PaymentTransactionWithPaypal = async (req: Request) => {
  const {
    order_id,
    order_number,
    amount,
    status,
    currency,
    response_json,
    paypal_order_id,
  } = req.body;
  let invoiceDetails: any;
  // let errors: {
  //   error_status: number
  //   error_message: any;
  // }[] = [];

  const trn = await dbContext.transaction();

  const orderValidate = await Orders.findOne({
    where: {
      id: order_id,
    },
  });

  console.log("----------", orderValidate);

  if (!(orderValidate && orderValidate.dataValues)) {
    return resNotFound({ message: ORDER_NOT_FOUND });
  }

  const orderNameValidate = await Orders.findOne({
    where: {
      id: order_id,
      order_number: order_number,
    },
  });

  if (!(orderNameValidate && orderNameValidate.dataValues)) {
    return resNotFound({ message: ORDER_NUMBER_IS_INVALID });
  }

  const orderAmontValidate = await Orders.findOne({
    where: {
      id: order_id,
      order_number: order_number,
      order_total: amount,
    },
  });

  if (!(orderAmontValidate && orderAmontValidate.dataValues)) {
    return resNotFound({ message: ORDER_AMOUNT_WRONG });
  }

  const order_details = await OrdersDetails.findAll({
    where: { order_id: orderAmontValidate.dataValues.id },
  });

  let i = (await Invoices.count()) + 1;
  const configData =  await getWebSettingData();
  const invoice_number = i.toString().padStart(configData.invoice_number_generate_digit_count, "0");

  if (status == "SUCCESS") {
    try {
      const order_transactions = {
        order_id: order_id,
        order_amount: parseFloat(amount),
        payment_status: PaymentStatus.paid,
        payment_currency: currency,
        payment_datetime: getLocalDate(),
        payment_source_type: "visa",
        payment_json: response_json,
        payment_transaction_id: paypal_order_id,
        created_by: req.body.session_res.id_app_user,
        created_date: getLocalDate(),
      };
      const orders = await OrderTransaction.create(order_transactions, {
        transaction: trn,
      });
      const order = await Orders.findOne({where:{
        id: order_id,
        transaction: trn,
      }});
      await Orders.update(
        {
          payment_status: PaymentStatus.paid,
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        },
        { where: { id: order_id }, transaction: trn }
      );
      const order_detail = await OrdersDetails.findAll({where:{
        order_id: order_id,
        transaction: trn,
      }});
      await OrdersDetails.update(
        {
          payment_status: PaymentStatus.paid,
        },
        { where: { order_id: order_id }, transaction: trn }
      );

      const invoiceData = {
        invoice_number: `${configData.order_invoice_number_identity}-${invoice_number}`,
        invoice_date: getLocalDate(),
        invoice_amount: amount,
        billing_address: orderAmontValidate.dataValues.order_billing_address,
        shipping_address: orderAmontValidate.dataValues.order_billing_address,
        order_id: orderAmontValidate.dataValues.id,
        transaction_id: orders.dataValues.id,
        created_date: getLocalDate(),
        created_by: req.body.session_res.id_app_user,
      };
      invoiceDetails = await Invoices.create(invoiceData, { transaction: trn });

      await addActivityLogs([{
        old_data: null,
        new_data: {
          order_transaction_id: orders?.dataValues?.id, order_transaction_data: {
            ...orders?.dataValues
          },
          invoice_details_id: invoiceDetails?.dataValues?.id, invoice_details_data: {
            ...invoiceDetails?.dataValues
          },
          orders_id: order?.dataValues?.id, 
          order_data: {
            ...order?.dataValues,payment_status: PaymentStatus.paid,
            modified_by: req?.body?.session_res?.id_app_user,
            modified_date: getLocalDate(),
          },
          order_detail_data: order_detail.map((t)=> ({
            ...t.dataValues,  // Spread the original data
            payment_status: PaymentStatus.paid,  // Add payment status
            modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
            modified_date: getLocalDate(),  // Add modified_date
          })),
        
      }}], orders?.dataValues?.id, LogsActivityType.Add, LogsType.PaymentTransactionWithPaypal, req?.body?.session_res?.id_app_user,trn)
    
      await trn.commit();
      // return resSuccess()
    } catch (error) {
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } else if (status == "ERROR") {
    try {
      const order_transactions = {
        order_id: order_id,
        order_amount: amount,
        payment_status: PaymentStatus.Failed,
        payment_datetime: getLocalDate(),
        payment_json: response_json,
        created_by: req.body.session_res.id_app_user,
        created_date: getLocalDate(),
      };
      const orders = await OrderTransaction.create(order_transactions, { transaction: trn });

      const order = await Orders.findOne({where:{
        id: order_id,
        transaction: trn,
      }});
      await Orders.update(
        {
          payment_status: PaymentStatus.Failed,
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        },
        { where: { id: order_id }, transaction: trn }
      );
      const order_detail = await OrdersDetails.findAll({where:{
        order_id: order_id,
        transaction: trn,
      }});
      await OrdersDetails.update(
        {
          payment_status: PaymentStatus.Failed,
        },
        { where: { order_id: order_id }, transaction: trn }
      );

      await addActivityLogs([{
        old_data: null,
        new_data: {
          order_transaction_id: orders?.dataValues?.id, order_transaction_data: {
            ...orders?.dataValues
          },
          orders_id: order?.dataValues?.id, 
          order_data: {
            ...order?.dataValues,payment_status: PaymentStatus.Failed,
            modified_by: req?.body?.session_res?.id_app_user,
            modified_date: getLocalDate(),
          },
          order_detail_data: order_detail.map((t)=> ({
            ...t.dataValues,  // Spread the original data
            payment_status: PaymentStatus.Failed,  // Add payment status
            modified_by: req?.body?.session_res?.id_app_user,  // Add modified_by
            modified_date: getLocalDate(),  // Add modified_date
          })),
        
      }}], orders?.dataValues?.id, LogsActivityType.Add, LogsType.PaymentTransactionWithPaypal, req?.body?.session_res?.id_app_user,trn)
    
      await trn.commit();
      return resUnknownError({
        code: UNPROCESSABLE_ENTITY_CODE,
        message: TRANSACTION_FAIL_MESSAGE,
      });
    } catch (error) {
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  }

  const result: any = await Invoices.findOne({
    where: { order_id: invoiceDetails.dataValues.order_id },
    attributes: [
      "id",
      "invoice_number",
      "invoice_date",
      "invoice_amount",
      "billing_address",
      "shipping_address",
      "order_id",
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (shipping_address ->> 'country_id' AS integer))`
        ),
        "shipping_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (shipping_address ->> 'state_id' AS integer))`
        ),
        "shipping_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (shipping_address ->> 'city_id' AS integer))`
        ),
        "shipping_city",
      ],
      [
        Sequelize.literal(
          `(SELECT contries.country_name FROM contries WHERE id= CAST (billing_address ->> 'country_id' AS integer))`
        ),
        "billing_country",
      ],
      [
        Sequelize.literal(
          `(SELECT state_name FROM states WHERE id=  CAST (billing_address ->> 'state_id' AS integer))`
        ),
        "billing_state",
      ],
      [
        Sequelize.literal(
          `(SELECT city_name FROM cities WHERE id =  CAST (billing_address ->> 'city_id' AS integer))`
        ),
        "billing_city",
      ],
      // [Sequelize.literal(`(SELECT payment_transaction_id FROM order_transactions WHERE order_id = ${invoiceDetails.dataValues.order_id})`), "transactions_id"]
    ],
    include: [
      {
        model: Orders,
        as: "order_invoice",
        attributes: [
          "id",
          "order_number",
          "discount",
          "email",
          "total_tax",
          "order_date",
          "shipping_cost",
          "sub_total",
          "order_taxs",
          "currency_id",
        ],
        include: [
          {
            model: OrdersDetails,
            as: "order",
            attributes: [
              "quantity",
              "sub_total",
              "product_tax",
              "order_details_json",
              "product_id",
              "product_details_json",
              [
                Sequelize.literal(
                  `(SELECT CONCAT('${configData.image_base_url}' ,image_path) FROM product_images WHERE id_product = "product_id" AND image_type = ${PRODUCT_IMAGE_TYPE.Feature} AND id_metal_tone = CAST (order_details_json ->> 'metal_tone' AS integer) LIMIT 1)`
                ),
                "product_image",
              ],
              [
                Sequelize.literal(
                  `(SELECT  CASE WHEN PMO.id_karat IS NULL THEN(metal_master.metal_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0))) ELSE (metal_master.metal_rate/metal_master.calculate_rate*gold_kts.calculate_rate*PMO.metal_weight+making_charge+finding_charge+other_charge+(COALESCE(sum(DGM.rate*PDO.weight*PDO.count), 0))) END FROM products LEFT OUTER JOIN product_metal_options AS PMO ON id_product = products.id LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id AND PDO.is_deleted = '0' LEFT OUTER JOIN metal_masters AS metal_master ON metal_master.id = PMO.id_metal LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN gold_kts ON gold_kts.id = PMO.id_karat WHERE CASE WHEN PMO.id_karat IS NULL THEN products.id = "product_id" AND PMO.id_metal = CAST (order_details_json ->> 'metal_id' AS integer) ELSE products.id = "product_id" AND PMO.id_metal = CAST (order_details_json ->> 'metal_id' AS integer) AND PMO.id_karat = CAST (order_details_json ->> 'karat_id' AS integer) END GROUP BY metal_master.metal_rate, metal_master.calculate_rate, pmo.metal_weight, products.making_charge, products.finding_charge, products.other_charge,PMO.id_karat, gold_kts.calculate_rate)`
                ),
                "product_price",
              ],
              [
                Sequelize.literal(
                  `(SELECT  AVG(product_reviews.rating) FROM product_reviews WHERE product_reviews.product_id = 87)`
                ),
                "rating",
              ],
              [
                Sequelize.literal(
                  `(SELECT products.name FROM products WHERE id = "product_id")`
                ),
                "product_name",
              ],
              [
                Sequelize.literal(
                  `(SELECT products.sku FROM products WHERE id = "product_id")`
                ),
                "product_sku",
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
                Sequelize.literal(
                  `(SELECT shapes.name FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN diamond_shapes AS shapes ON shapes.id = DGM.id_shape WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_shape",
              ],
              [
                Sequelize.literal(
                  `(SELECT gemstones.name FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN gemstones ON gemstones.id = DGM.id_stone WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond",
              ],
              [
                Sequelize.literal(
                  `(SELECT mm_sizes.value FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN mm_sizes ON mm_sizes.id = DGM.id_mm_size WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_mm_sizes",
              ],
              [
                Sequelize.literal(
                  `(SELECT colors.value FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN colors ON colors.id = DGM.id_color WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_color",
              ],
              [
                Sequelize.literal(
                  `(SELECT clarities.value FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN clarities ON clarities.id = DGM.id_clarity WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_clarity",
              ],
              [
                Sequelize.literal(
                  `(SELECT cuts.value FROM products LEFT OUTER JOIN product_diamond_options AS PDO ON PDO.id_product = products.id LEFT OUTER JOIN diamond_group_masters AS DGM ON DGM.id = PDO.id_diamond_group LEFT OUTER JOIN cuts ON cuts.id = DGM.id_cuts WHERE products.id = "product_id" AND PDO.id_type = ${STONE_TYPE.Center})`
                ),
                "diamond_cuts",
              ],
            ],
            required: false,
          },
        ],
      },
    ],
  });
  let findCurrency
  if (result.dataValues.order_invoice.currency_id && result.dataValues.order_invoice.currency_id != null) {
    findCurrency = await CurrencyData.findOne({
      where: { id: result.dataValues.order_invoice.currency_id },
    });
  } else {
    findCurrency = await CurrencyData.findOne({
      where: { is_default: "1" },
    });
   }
  let logo_image = configData.image_base_url;
  const taxData = JSON.parse(result.dataValues.order_invoice.order_taxs);
  const productData: any = [];
  for (const data of result.dataValues.order_invoice.order) {
    productData.push({
      ...data.dataValues,
      currency: findCurrency.dataValues.symbol,
      product_price: getPriceFormat(data.dataValues.product_price),
      sub_total: getPriceFormat(data.dataValues.sub_total),
    });
  }

  const userData = await CustomerUser.findOne({
    where: { id_app_user: orderValidate.dataValues.user_id },
  });

  let attachmentContent = await getEmailTemplateContent(req);
  if(attachmentContent.code !== DEFAULT_STATUS_CODE_SUCCESS){
    trn.rollback();
    return attachmentContent
  }
  const findCompanyDetails = await CompanyInfo.findOne({
  });
  const attachments:any = {
      invoice_number: result.dataValues.invoice_number,
      invoice_date: new Date(
        result.dataValues.invoice_date
      ).toLocaleDateString("en-GB"),
      pdf_app_logo: INVOICE_LOGO_IMAGE_BASE64,
      currency: findCurrency.dataValues.symbol,
      company_number: findCompanyDetails.dataValues.company_number,
      company_address: findCompanyDetails.dataValues.company_address,
      total_amount: getPriceFormat(result.dataValues.invoice_amount),
      sub_total_amount: getPriceFormat(
        result.dataValues.order_invoice.sub_total
      ),
      total_tax: getPriceFormat(result.dataValues.order_invoice.total_tax),
      discount: getPriceFormat(result.dataValues.order_invoice.discount),
      shipping_cost: getPriceFormat(
        result.dataValues.order_invoice.shipping_cost
      ),
      order_number: result.dataValues.order_invoice.order_number,
      billing_address: {
        house_builing: result.dataValues.billing_address.house_builing,
        area_name: result.dataValues.billing_address.area_name,
        city: result.dataValues.billing_city,
        state: result.dataValues.billing_state,
        country: result.dataValues.billing_country,
      },
      shipping_address: {
        house_builing: result.dataValues.shipping_address.house_builing,
        area_name: result.dataValues.shipping_address.area_name,
        city: result.dataValues.shipping_city,
        state: result.dataValues.shipping_state,
        country: result.dataValues.shipping_country,
      },
      tax_array: taxData,
      data: productData,
      logo_image,
      frontend_url: configData?.fronted_base_url,
  }

  const data = {
    id:result?.dataValues?.id,
    invoice_number: result?.dataValues?.invoice_number,          
  }

  const invoiceFromS3 = await generateInvoicePDF(data,attachmentContent.data,attachments);

  const mailNewOrderPayload = {
    toEmailAddress: result.dataValues.order_invoice.email,
    contentTobeReplaced: {
      name: userData?.dataValues.full_name
        ? userData?.dataValues.full_name
        : result.dataValues.billing_address.full_name,
      toBeReplace: {
        invoice_number: result.dataValues.invoice_number,
        invoice_date: new Date(
          result.dataValues.invoice_date
        ).toLocaleDateString("en-GB"),
        total_amount: getPriceFormat(result.dataValues.invoice_amount),
        currency: findCurrency.dataValues.symbol,
        sub_total_amount: getPriceFormat(
          result.dataValues.order_invoice.sub_total
        ),
        total_tax: getPriceFormat(result.dataValues.order_invoice.total_tax),
        discount: result.dataValues.order_invoice.discount,
        shipping_cost: getPriceFormat(
          result.dataValues.order_invoice.shipping_cost
        ),
        order_number: result.dataValues.order_invoice.order_number,
        order_date: new Date(
          result.dataValues.order_invoice.order_date
        ).toLocaleDateString("en-GB"),
        billing_address: {
          house_builing: result.dataValues.billing_address.house_builing,
          area_name: result.dataValues.billing_address.area_name,
          city: result.dataValues.billing_city,
          state: result.dataValues.billing_state,
          country: result.dataValues.billing_country,
        },
        shipping_address: {
          house_builing: result.dataValues.shipping_address.house_builing,
          area_name: result.dataValues.shipping_address.area_name,
          city: result.dataValues.shipping_city,
          state: result.dataValues.shipping_state,
          country: result.dataValues.shipping_country,
        },
        tax_array: taxData,
        data: productData,
        logo_image,
        frontend_url: configData?.fronted_base_url,
      },
    },
    attachments: {
      filename: `${invoiceFromS3?.data?.filename}`,
      content: invoiceFromS3?.data?.content
    },
  };

  const admin = {
    toEmailAddress: "info@thecadco.com",
    contentTobeReplaced: {
      mail: 'admin',
      name: userData?.dataValues.full_name
        ? userData?.dataValues.full_name
        : result.dataValues.billing_address.full_name,
      toBeReplace: {
        invoice_number: result.dataValues.invoice_number,
        invoice_date: new Date(
          result.dataValues.invoice_date
        ).toLocaleDateString("en-GB"),
        total_amount: getPriceFormat(result.dataValues.invoice_amount),
        sub_total_amount: getPriceFormat(
          result.dataValues.order_invoice.sub_total
        ),
        total_tax: getPriceFormat(result.dataValues.order_invoice.total_tax),
        discount: getPriceFormat(result.dataValues.order_invoice.discount),
        shipping_cost: getPriceFormat(
          result.dataValues.order_invoice.shipping_cost
        ),
        order_number: result.dataValues.order_invoice.order_number,
        order_date: result.dataValues.order_invoice.order_date,
        billing_address: {
          house_builing: result.dataValues.billing_address.house_builing,
          area_name: result.dataValues.billing_address.area_name,
          city: result.dataValues.billing_city,
          state: result.dataValues.billing_state,
          country: result.dataValues.billing_country,
        },
        shipping_address: {
          house_builing: result.dataValues.shipping_address.house_builing,
          area_name: result.dataValues.shipping_address.area_name,
          city: result.dataValues.shipping_city,
          state: result.dataValues.shipping_state,
          country: result.dataValues.shipping_country,
        },
        tax_array: taxData,
        data: productData,
        logo_image,
        frontend_url:configData?.fronted_base_url,
      },
    },
  };

  // await mailNewOrderReceived(mailNewOrderPayload);
  // await mailNewOrderAdminReceived(admin);
  for (const items of order_details) {
    if (orderAmontValidate.dataValues.user_id) {
      await CartProducts.destroy({
        where: {
          user_id: orderAmontValidate.dataValues.user_id,
          product_id: items.dataValues.product_id,
        },
      });
    }
  }
  const cart_list_count = await CartProducts.sum("quantity", {
    where: { user_id: orderAmontValidate.dataValues.user_id },
  });

  return resSuccess({ data: { cart_list_count } });
};
