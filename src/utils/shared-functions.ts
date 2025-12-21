import Shopify from "shopify-api-node";
import { Op, QueryTypes, Sequelize, Transaction, where } from "sequelize";
import {
  CRYPTO_JS_IV,
  CRYPTO_JS_KEY,
  ENCRYPT_DECRYPT_IV,
  ENCRYPT_DECRYPT_KEY,
  PRICE_FORMULA_LOCALE,
  WHATSAPP_SEND_MESSAGE_API,
  WHATSAPP_SEND_MESSAGE_API_TOKEN,
} from "../config/env.var";
import { IQueryPagination } from "../data/interfaces/common/common.interface";
import { TBitFieldValue, TResponse } from "../data/types/common/common.type";
import {
  BIT_FIELD_VALUES,
  GET_HTTP_METHODS_LABEL,
  INVOICE_FILE_LOCATION,
  IMAGE_TYPE_LOCATION,
  PER_PAGE_ROWS,
  DATE_REGEX,
  TIME_REGEX,
  MAIL_SEND_API_END_POINT,
  MAIL_SEND_API_PASS_KEY,
} from "./app-constants";
import {
  ActiveStatus,
  AllProductTypes,
  CURRENCY_RATE_EXCHANGE_TYPE,
  DATE_FORMAT_TYPE,
  DeletedStatus,
  DYNAMIC_MAIL_TYPE,
  HTTP_METHODS,
  PRICE_CORRECTION_PRODUCT_TYPE,
  SingleProductType,
  USER_TYPE,
} from "./app-enumeration";
import {
  BAD_REQUEST_CODE,
  BAD_REQUEST_MESSAGE,
  COMPONY_KEY_NOT_EXIST,
  DEFAULT_STATUS_CODE_ERROR,
  DEFAULT_STATUS_CODE_SUCCESS,
  DEFAULT_STATUS_ERROR,
  DEFAULT_STATUS_SUCCESS,
  ERROR_ALREADY_EXIST,
  INVALID_DATE_ERROR_MESSAGE,
  INVALID_TIME_ERROR_MESSAGE,
  NOT_FOUND_CODE,
  NOT_FOUND_MESSAGE,
  UNAUTHORIZED_ACCESS_CODE,
  UNAUTHORIZED_ACCESS_MESSAGE,
  UNKNOWN_ERROR_TRY_AGAIN,
  UNPROCESSABLE_ENTITY_CODE,
  UNPROCESSABLE_ENTITY_MESSAGE,
} from "./app-messages";
const CryptoJS = require("crypto-js");
const cron = require("node-cron");
import {
  moveFileToS3ByType,
  moveFileToS3ByTypeAndLocation,
} from "../helpers/file.helper";
import { s3RemoveObject } from "../helpers/s3-client.helper";
// import dbContext from "../config/db-context";
import axios from "axios";
import puppeteer from "puppeteer";
import handlebars from "handlebars";
import path from "path";
import dbContext from "../config/db-context";
import { Image } from "../version-one/model/image.model";
import { CurrencyData } from "../version-one/model/master/currency.model";
import { ActivityLogs } from "../version-one/model/activity-logs.model";
import { EmailTemplate } from "../version-one/model/email-template.model";
import { Invoices } from "../version-one/model/invoices.model";
import { CompanyInfo } from "../version-one/model/companyinfo.model";
import { WebConfigSetting } from "../version-one/model/theme/web-config-setting.model";
import { PriceCorrection } from "../version-one/model/price-correction.model";
const { Client } = require('pg');
const FormData = require("form-data"); // Required for Node.js

export const parseData = (data: Object) => {
  try {
    var info = JSON.stringify(data);
    if (String(info) === "{}") {
      info = String(data);
    }
    return info;
  } catch {
    return String(data);
  }
};

export const resSuccess: TResponse = (payload) => {
  return {
    code: payload?.code || DEFAULT_STATUS_CODE_SUCCESS,
    status: payload?.status || DEFAULT_STATUS_SUCCESS,
    message: payload?.message || DEFAULT_STATUS_SUCCESS,
    data: payload?.data || null,
  };
};

export const resError: TResponse = (payload) => {
  return {
    code: payload?.code || DEFAULT_STATUS_CODE_ERROR,
    status: payload?.status || DEFAULT_STATUS_ERROR,
    message: payload?.message || DEFAULT_STATUS_ERROR,
    data: payload?.data || null,
  };
};

export const resUnauthorizedAccess: TResponse = (payload) => {
  return {
    code: payload?.code || UNAUTHORIZED_ACCESS_CODE,
    status: payload?.status || DEFAULT_STATUS_ERROR,
    message: payload?.message || UNAUTHORIZED_ACCESS_MESSAGE,
    data: payload?.data || null,
  };
};

export const resUnknownError: TResponse = (payload) => {
  return {
    code: payload?.code || DEFAULT_STATUS_CODE_ERROR,
    status: payload?.status || DEFAULT_STATUS_ERROR,
    message: payload?.message || UNKNOWN_ERROR_TRY_AGAIN,
    data: payload?.data || null,
  };
};

export const resBadRequest: TResponse = (payload) => {
  return {
    code: payload?.code || BAD_REQUEST_CODE,
    status: payload?.status || DEFAULT_STATUS_ERROR,
    message: payload?.message || BAD_REQUEST_MESSAGE,
    data: payload?.data || [
      { msg: payload?.message, location: "body", value: "" },
    ],
  };
};

export const resErrorDataExit: TResponse = (payload) => {
  return {
    code: payload?.code || BAD_REQUEST_CODE,
    status: payload?.status || DEFAULT_STATUS_ERROR,
    message: payload?.message || ERROR_ALREADY_EXIST,
    data: payload?.data || null,
  };
};

export const resNotFound: TResponse = (payload) => {
  return {
    code: payload?.code || NOT_FOUND_CODE,
    status: payload?.status || DEFAULT_STATUS_ERROR,
    message: payload?.message || NOT_FOUND_MESSAGE,
    data: payload?.data || null,
  };
};

export const resUnprocessableEntity: TResponse = (payload) => {
  return {
    code: payload?.code || UNPROCESSABLE_ENTITY_CODE,
    status: payload?.status || DEFAULT_STATUS_ERROR,
    message: payload?.message || UNPROCESSABLE_ENTITY_MESSAGE,
    data: payload?.data || null,
  };
};

export const getLocalDate = () => {
  return new Date();
};

export const getCryptoRandomUUID = () => {
  return crypto.randomUUID();
};

export const dateFormat = (
  date: Date,
  dateFormatType: number,
  join: string = "/"
) => {
  const day = (date.getDate() < 10 ? "0" : "") + date.getDate();
  const month = (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1);
  const year = date.getFullYear().toString();
  switch (dateFormatType) {
    case DATE_FORMAT_TYPE.display_format:
      return day + "/" + month + "/" + year;
    case DATE_FORMAT_TYPE.YYYYMMDD:
      return year + join + month + join + day;
    case DATE_FORMAT_TYPE.log_file_name_format:
      return year + month + day;
    default:
      return date.toString();
  }
};

export const getLogSaveDateFormat = (date: Date) => {
  const formatedDate = dateFormat(date, DATE_FORMAT_TYPE.log_file_name_format);
  const hour = date.getHours();
  return {
    date: formatedDate,
    hour: hour < 10 ? "0" + hour : hour + "",
  };
};

export const generateRandomString = (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let result = "";
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const getInitialPaginationFromQuery = (
  query: Record<string, any>
): IQueryPagination => {
  let findIsActive;

  if (
    query &&
    typeof query.is_active == "string" &&
    BIT_FIELD_VALUES.includes(query.is_active)
  ) {
    findIsActive = query.is_active as TBitFieldValue;
  }

  return {
    per_page_rows: query.per_page_rows || PER_PAGE_ROWS,
    current_page: query.current_page || 1,
    order_by: query.order_by || "DESC",
    sort_by: query.sort_by || "id",
    is_active: findIsActive,
    total_pages: 0,
    total_items: 0,
    search_text: query.search_text || "",
  };
};

export const prepareMessageFromParams = (
  message: string,
  params: [string, string][]
) => {
  let resultMessage = message;
  for (const [key, value] of params) {
    resultMessage = resultMessage.replace(
      new RegExp("<<" + key + ">>", "g"),
      value
    );
  }
  return resultMessage;
};

export const getMethodFromRequest = (method: string) => {
  switch (method) {
    case GET_HTTP_METHODS_LABEL[HTTP_METHODS.Get]:
      return HTTP_METHODS.Get;
    case GET_HTTP_METHODS_LABEL[HTTP_METHODS.Post]:
      return HTTP_METHODS.Post;
    case GET_HTTP_METHODS_LABEL[HTTP_METHODS.Put]:
      return HTTP_METHODS.Put;
    case GET_HTTP_METHODS_LABEL[HTTP_METHODS.Delete]:
      return HTTP_METHODS.Delete;
    case GET_HTTP_METHODS_LABEL[HTTP_METHODS.Patch]:
      return HTTP_METHODS.Patch;
    default:
      return 0;
  }
};

export const getEncryptedText = (text: String) => {
  const encryptedData = CryptoJS.AES.encrypt(text, CRYPTO_JS_KEY, {
    iv: CRYPTO_JS_IV,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  }).toString();
  return encryptedData;
};

export const getDecryptedText = (text: String) => {
  const descryptedText = CryptoJS.AES.decrypt(text, CRYPTO_JS_KEY, {
    iv: CRYPTO_JS_IV,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  }).toString(CryptoJS.enc.Utf8);
  return descryptedText;
};

export const roundDecimalNumber = (value: number, decimalPoint: number) => {
  return (
    Math.round(value * Math.pow(10, decimalPoint)) / Math.pow(10, decimalPoint)
  );
};

export const shopify = new Shopify({
  shopName: "quickstart-3c059c30.myshopify.com",
  apiKey: "3faeb2b987bba5ae420211b1fe70434e",
  password: "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",
});

export const columnValueLowerCase = (field_name: any, value: any) => {
  return Sequelize.where(
    Sequelize.fn("LOWER", Sequelize.col(`${[field_name]}`)),
    value.toLowerCase()
  );
};

export const getPriceFormat = (price: any) => {
  return Math.ceil(price).toLocaleString(PRICE_FORMULA_LOCALE);
};
export const encryptResponseData = (text: any) => {
  const keyValue: any = ENCRYPT_DECRYPT_KEY;
  const ivValue: any = ENCRYPT_DECRYPT_IV;
  const key = CryptoJS.enc.Hex.parse(keyValue);
  const iv = CryptoJS.enc.Hex.parse(ivValue);
  const cipher = CryptoJS.AES.encrypt(
    JSON.stringify(text), // Data to be encrypted
    key, // Key
    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );

  // Convert to hexadecimal (only contains 0-9 and A-F, no special characters)
  return cipher.ciphertext.toString(CryptoJS.enc.Hex);
};

export const decryptRequestData = (text: any) => {
  const keyValue: any = ENCRYPT_DECRYPT_KEY;
  const ivValue: any = ENCRYPT_DECRYPT_IV;
  const key = CryptoJS.enc.Hex.parse(keyValue);
  const iv = CryptoJS.enc.Hex.parse(ivValue);

  // Create cipher parameters from hex string
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(text)
  });

  const bytes = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

  return decryptedData;
};


export const imageAddAndEditInDBAndS3 = async (
  file: any,
  folder: any,
  created_by: any,
  imageData: any
) => {
  try {


    if (imageData && imageData.dataValues && imageData.dataValues.id === 0) {
      const moveFileResult = await moveFileToS3ByType(file, folder);

      if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return moveFileResult;
      }
      let payload = {
        image_path: moveFileResult.data,
        image_type: folder,
        created_by: created_by,
        created_date: getLocalDate(),
      }


      const imageResult = await Image.create(payload);
      return resSuccess({ data: imageResult.dataValues.id });
    } else {
      if (imageData && imageData.dataValues) {
        await s3RemoveObject(imageData.dataValues.image_path);
        const moveFileResult = await moveFileToS3ByType(file, folder);

        if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return moveFileResult;
        }
        const payload = {
            image_path: moveFileResult.data,
        }
        
        await Image.update(
          payload,
          {
            where: { id: imageData.dataValues.id },
          }
        );
        return resSuccess({ data: imageData.dataValues.id });
      } else {
        const moveFileResult = await moveFileToS3ByType(file, folder);

        if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return moveFileResult;
        }
        let payload = {
          image_path: moveFileResult.data,
          image_type: folder,
          created_by: created_by,
          created_date: getLocalDate(),
        }

        const imageResult = await Image.create(payload);
        return resSuccess({ data: imageResult.dataValues.id });
      }
    }
  } catch (error) {
    console.log("-------------------", error)
    return resUnknownError({ data: error });
  }
};

export const imageAddAndEditInDBAndS3ForOriginalFileName = async (
  file: any,
  folder: any,
  created_by: any,
  imageData: any,
) => {
  try {
    const db_connection = dbContext ? dbContext : dbContext;

    if (imageData && imageData.dataValues && imageData.dataValues.id === 0) {
      const moveFileResult = await moveFileToS3ByTypeAndLocation(file, IMAGE_TYPE_LOCATION[folder]);

      if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return moveFileResult;
      }

      const imageResult = await Image.create({
        image_path: moveFileResult.data,
        image_type: folder,
        created_by: created_by,
        created_date: getLocalDate(),
      });
      return resSuccess({ data: imageResult.dataValues.id });
    } else {
      
      if (imageData && imageData.dataValues) {
        await s3RemoveObject(imageData.dataValues.image_path );
        const moveFileResult = await moveFileToS3ByTypeAndLocation(
          file,
          IMAGE_TYPE_LOCATION[folder]
        );

        if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return moveFileResult;
        }

        await Image.update(
          {
            image_path: moveFileResult.data,
          },
          {
            where: { id: imageData.dataValues.id},
          }
        );
        return resSuccess({ data: imageData.dataValues.id });
      } else {
        const moveFileResult = await moveFileToS3ByTypeAndLocation(
          file,
          IMAGE_TYPE_LOCATION[folder],
        );

        if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return moveFileResult;
        }

        const imageResult = await Image.create({
          image_path: moveFileResult.data,
          image_type: folder,
          created_by: created_by,
          created_date: getLocalDate(),
        });
        return resSuccess({ data: imageResult.dataValues.id });
      }
    }
  } catch (error) {
    return resUnknownError({ data: error });
  }
};

export const imageDeleteInDBAndS3 = async (imageData:any) => {
  try {

    await s3RemoveObject(imageData.dataValues.image_path);
    await Image.destroy({ where: { id: imageData.dataValues.id } });
    return resSuccess({ data: imageData.dataValues.id });
  } catch (error) {
    return resUnknownError({ data: error });
  }
};

export const createSlug = (text: any) => {
  return text.toString().replaceAll(" ", "-").toLowerCase().trim();
};

export const statusUpdateValue = (data: any) => {
  switch (data.dataValues.is_active) {
    case ActiveStatus.Active:
      return ActiveStatus.InActive;
    case ActiveStatus.InActive:
      return ActiveStatus.Active;
    default:
      break;
  }
};

export const getListFromToValues = (
  list: string[],
  from?: string,
  to?: string
) => {
  return list.slice(
    from ? list.indexOf(from) : 0,
    to ? list.indexOf(to) + 1 : list.length
  );
};

export const refreshMaterializedProductListView = async (db_connection: any) => {
  try {
    return await db_connection.query("REFRESH MATERIALIZED VIEW CONCURRENTLY product_list_view");
  } catch (error) {
    throw error;
  }
};

export const refreshMaterializedEternityBandSideBarDataView = async (db_connection: any) => {
  try {
    return await db_connection.query("REFRESH MATERIALIZED VIEW mat_view_eternity_products");
  } catch (error) {
    throw error;
  }
};

export const refreshMaterializedRingThreeStoneConfiguratorPriceFindView =
  async (db_connection: any) => {
    try {
      // return await db_connection.query(
      //   "REFRESH MATERIALIZED VIEW CONCURRENTLY ring_three_stone_configurator_price_view"
      // );
    } catch (error) {
      throw error;
    }
  };
  
export const refreshMaterializedStudConfiguratorPriceFindView =
  async (db_connection: any) => {
    try {
      return await db_connection.query(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY STUD_CONFIG_PRODUCT_PRICE_VIEW"
      );
    } catch (error) {
      throw error;
    }
  };
  
export const refreshMaterializedPendantConfiguratorPriceFindView =
  async (db_connection: any) => {
    try {
      return await db_connection.query(
        "REFRESH MATERIALIZED VIEW CONFIG_PENDANT_PRODUCT_PRICE_VIEW"
      );
    } catch (error) {
      throw error;
    }
  };

export const refreshMaterializedEternityBandConfiguratorPriceFindView =
  async (db_connection: any) => {
    try {
      // return await db_connection.query(
      //   "REFRESH MATERIALIZED VIEW CONCURRENTLY eternity_band_configurator_price_view"
      // );
    } catch (error) {
      throw error;
    }
  };

export const refreshMaterializedBraceletConfiguratorPriceFindView =
  async (db_connection: any) => {
    try {
      // return await db_connection.query(
      //   "REFRESH MATERIALIZED VIEW CONCURRENTLY bracelet_configurator_price_view"
      // );
    } catch (error) {
      throw error;
    }
  };
// Group by id_karat and collect id_metal_tone values

export const refreshAllMaterializedView = async (db_connection: any) => {
  setTimeout(async () => {
    await refreshMaterializedProductListView(db_connection);
    // await refreshMaterializedRingThreeStoneConfiguratorPriceFindView(db_connection);
    // await refreshMaterializedEternityBandConfiguratorPriceFindView(db_connection);
    // await refreshMaterializedBraceletConfiguratorPriceFindView(db_connection);
    await refreshMaterializedStudConfiguratorPriceFindView(db_connection);
    await refreshMaterializedPendantConfiguratorPriceFindView(db_connection);
  }, 5000);
};

export const createToneArrayBasedOnKarat = async (
  data: any,
  id_karat: any,
  id_metal: any,
  id_metal_tone: any,
  metal_tone: any
) => {
  const tonesByKaratAndMetal = data.filter((t:any) => t.is_deleted == DeletedStatus.No).reduce((acc, option) => {
    const key = `${option[id_karat] || "null"}-${option[id_metal]}`;
    
    if (!acc[key]) acc[key] = new Set();
    acc[key].add(option[id_metal_tone]); // Add tones to a Set to ensure uniqueness
    return acc;
  }, {});

  // Add `metal_tone` array to each entry
  const updatedOptions = data.map((option) => {
    if (option.is_deleted && option.is_deleted == DeletedStatus.No) {
      if (option[id_karat] === null) {
        // If `id_karat` is null, set `metal_tone` to an empty array
        return { ...option, metal_tone: [] };
      }
      const key = `${option[id_karat] || "null"}-${option[id_metal]}`;
      return {
        ...option,
        [metal_tone]: Array.from(tonesByKaratAndMetal[key] || []),
      }; // Convert Set to array
    } else {
      return option
    }
  });

     
  return updatedOptions;
};

export const taxCalculationBasedOnPrice = async (price: any, taxList: any) => {
  let productTaxAmount: any;
  let productTax: any;
  let allTax = [];
  let taxRateData = [];

  for (const taxData of taxList) {
    productTax = taxData.dataValues.rate / 100;

    productTaxAmount = price.toFixed(2) * productTax.toFixed(2);

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

  return sumTotal.toFixed(2);
};

export const applyShippingCharge = async (amount: any,query?:any) => {
  try {
   

    // Construct SQL query with parameterization
    const shippingChargeData: any = await dbContext.query(
      `
        SELECT *
        FROM SHIPPING_CHARGES
        WHERE 
          ( 
            (SHIPPING_CHARGES.MAX_AMOUNT >= :amount OR SHIPPING_CHARGES.MAX_AMOUNT IS NULL)
            AND (SHIPPING_CHARGES.MIN_AMOUNT <= :amount OR SHIPPING_CHARGES.MIN_AMOUNT IS NULL)
          )
          
          AND shipping_charges.is_deleted = :is_deleted
          AND shipping_charges.is_active = :is_active
      `,
      {
        replacements: {
          amount,
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
        },
        type: QueryTypes.SELECT,
      }
    );

    const beforeShippingChargeAmount = amount;
    const afterShippingChargeAmount =
      amount + (shippingChargeData[0]?.amount ?? 0);
    const shippingCharge = shippingChargeData[0]?.amount ?? 0;

    return resSuccess({
      data: {
        before_shipping_charge_amount: beforeShippingChargeAmount,
        after_shipping_charge_amount: afterShippingChargeAmount,
        shipping_charge: shippingCharge,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

export const findDefaultCurrency = async () => {
  try {
    const findDefaultCurrency = await CurrencyData.findOne({
      where: {
        is_default: "1",
        is_deleted: DeletedStatus.No,
        is_active: ActiveStatus.Active,
      },
    });

    return findDefaultCurrency.dataValues;
  } catch (error) {
    throw error;
  }
};

//Need to work on this - VD
export const updateCurrencyRatesViaCronJob = async () => {
  const findFreeAPIList = await CurrencyData.findAll({
    where: {
      exchange_rate_type: CURRENCY_RATE_EXCHANGE_TYPE.FreeApi,
      is_deleted: DeletedStatus.No,
    },
  });

  const findDefaultCurrencyValue = await findDefaultCurrency();
  const todayDate = new Date().toISOString().slice(0, 10);
  let freeApiCurrencyData: any;
  if (findFreeAPIList.length >= 1 && findDefaultCurrencyValue.code) {
    await axios
      .get(
        `https://${todayDate}.currency-api.pages.dev/v1/currencies/${findDefaultCurrencyValue?.code?.toLowerCase()}.json`
      )
      .then((response) => {
        freeApiCurrencyData =
          response.data[findDefaultCurrencyValue.code.toLowerCase()];
      })
      .catch((error) => {
        console.log(error);
      });
  }

  cron.schedule("0 0 5 * * *", async () => {
    if (findFreeAPIList.length >= 1) {
      for (const currencyData of findFreeAPIList) {
        const rateValue =
          freeApiCurrencyData[currencyData.dataValues.code.toLowerCase()];

        await CurrencyData.update(
          {
            rate:
              rateValue && rateValue !== null && rateValue !== undefined
                ? rateValue
                : currencyData.dataValues.rate,
          },
          {
            where: { id: currencyData.dataValues.id },
          }
        );
      }
    }
  });
};

export const getFreeAPICurrencyPrice = async (code: string, req:any) => {
  try {
    let apiCurrencyData;
    
    const todayDate = new Date().toISOString().slice(0, 10);

    let defaultCode;

    const findDefaultCurrencyValue = await findDefaultCurrency();

    defaultCode = findDefaultCurrencyValue?.code;

    await axios
      .get(
        `https://${todayDate}.currency-api.pages.dev/v1/currencies/${defaultCode.toLowerCase()}.json`
      )
      .then((response) => {
        apiCurrencyData = response.data[defaultCode.toLowerCase()];
      })
      .catch((error) => {
        console.log(error);
      });

    if (apiCurrencyData) {
      if (code) {
        if (!apiCurrencyData[code.toLowerCase()]) {
          return apiCurrencyData[defaultCode.toLowerCase()];
        } else {
          return apiCurrencyData[code.toLowerCase()];
        }
      } else {
        return apiCurrencyData[defaultCode.toLowerCase()];
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getExchangeCurrencyRate = async (code: any, req:any) => {
  try {
   
    let currency: any;
    if (
      code &&
      code !== "" &&
      code !== null &&
      code !== undefined &&
      code !== "null"
    ) {
      currency = await CurrencyData.findOne({
        where: [
          columnValueLowerCase("code", code),
          { is_deleted: DeletedStatus.No },
          { is_active: ActiveStatus.Active },
        ],
      });
      currency = currency?.dataValues;
    } else {
      {
        currency = await findDefaultCurrency();
        currency = currency;
      }
    }

    return {currency};
  } catch (error) {
    throw error;
  }
};

export const formatPrice = async(price: any, separator: any, product_type: any, correctionValue?: any) => {
  const sep = separator || " ";
  const priceValue = Math.ceil(price);
  // Get the price correction value based on the product type and company info id
  
  if (product_type !== null) {
    const roundingValue = correctionValue ? correctionValue : await getPriceCorrectionBasedOnProduct(product_type);
  if (roundingValue.flag) {
    return roundToEnding(priceValue, roundingValue.value).toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  }
  return priceValue
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, sep);
};

export const formatPriceWithoutSeparator = async(price: any, product_type: any) => {
  const priceValue = Math.ceil(price);
  // Get the price correction value based on the product type and company info id
  
  if (product_type !== null) {
    const correctionValue = await getPriceCorrectionBasedOnProduct(product_type);
  if (correctionValue.flag) {
    return roundToEnding(priceValue, correctionValue.value)
  }
  }
  return priceValue
};

export const parseFormattedPrice = (formattedPrice: string) => {
  const numericString = formattedPrice.replace(/[^0-9.]/g, '');
  return Number(numericString);
};

export const formatPriceForFloatValue = (price: any, separator: any) => {
  return (price.toFixed(2))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);
};

export const sendMessageInWhatsApp = async (otp: any, phone: any, config_data?: any) => {
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: `91${phone}`,
    type: "template",
    template: {
      name: 'otp',
      language: {
        code: "en_US"
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: String(otp)
            }
          ]
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            {
              type: "text",
              text: String(otp)
            }
          ]
        }
      ]
    },
  };
  await axios
    .post(`${config_data.whats_app_send_message_api || WHATSAPP_SEND_MESSAGE_API}`, data, {
      headers: {
        Authorization: `Bearer ${config_data.whats_app_send_message_api_token || WHATSAPP_SEND_MESSAGE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      console.log("success",response.data);
      return resSuccess({ data: response.data });
    })
    .catch((error) => {
      console.log("fail",error);

      return resUnprocessableEntity({ data: error });
    });
};

export const addActivityLogs = async (logs: any, ref_id: any, activityType: any, logType: any, id_app_user: any,trn:any = null) => {
  try {

    const options = trn ? { transaction:trn } : {};
    const logsList = []
    for (let index = 0; index < logs.length; index++) {
      const value = logs[index];
      logsList.push({
        log_type: logType,
        activity_type: activityType,
        ref_id: ref_id,
        old_value_json: value.old_data,
        updated_value_json: value.new_data,
        created_by: id_app_user,
        created_date: getLocalDate(),
        modified_by: id_app_user,
        modified_date: getLocalDate()
      })
    }
   const activeity = await ActivityLogs.bulkCreate(logsList,options)
    console.log(activeity);
  } catch (error) {
    return resUnknownError({ data: error })
  }
}

/**
 * Get email template content based on dynamic sending condition.
 * @returns {string|null} - Returns the email template body or null if no template is found.
 */
export const getEmailTemplateContent = async( is_invoice?:any) =>  {
  
  try {
    let attachmentContent = null;
    // If we want to send the email dynamically and have the appropriate conditions
      const existingTemplate = await EmailTemplate.findOne({
        where: {
          is_invoice: is_invoice|| false, // Check if is_invoice is true or false
          message_type: {
            [Op.contains]: [DYNAMIC_MAIL_TYPE.EmailAttachmentInvoice], // Checks if message_type contains 1
          },
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active
        },
      });
    
      if (existingTemplate) {
        attachmentContent = existingTemplate?.dataValues?.body.replace(/\\n/g, '\n');
      }

    return resSuccess({data:attachmentContent});
  } catch (error) {
    console.error('Error retrieving email template:', error);
    // Optionally, you could rethrow the error or return null depending on your requirements
    return resUnknownError(error);
  }

}

/**
 * Generates PDF from HTML, uploads it to S3, updates the database, and returns the file path.
 * @param {Object} data - Data for generating the invoice (used in handlebars template).
 * @param {string} template - The handlebars template for the invoice HTML.
 * @param {Object} replacements - The data to be used in handlebars template for replacing placeholders.
 * @returns {BinaryType} The file of the uploaded PDF in S3.
 */
export const generateInvoicePDF = async(data:any, template:any, replacements:any) => {
  try {
    // Compile the handlebars template
    const templateFile = handlebars.compile(template);
    const htmlToSendFile = templateFile(replacements);

    // Launch Puppeteer to generate the PDF from HTML
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    console.log("browser", browser)
    const page = await browser.newPage();
    await page.setContent(htmlToSendFile, { waitUntil: "domcontentloaded" });

    // Emulate media type and generate the PDF buffer
    await page.emulateMediaType("screen");
    const pdfBuffer = await page.pdf();
    await browser.close();

    // Prepare file object for S3 upload
    const file:any = {
      buffer: pdfBuffer,  // The PDF buffer generated by Puppeteer
      originalname: `Invoice-${data.invoice_number}.pdf`,  // Dynamic file name
      mimetype: 'application/pdf',  // MIME type for PDF
    };

    // Upload PDF to S3 and get the S3 file path
    const resMFTL = await moveFileToS3ByTypeAndLocation(file, `${INVOICE_FILE_LOCATION}`);
    let filePath = resMFTL?.data;

    // Clean the file path to remove any single quotes
    let cleanedFilePath = filePath.replace(/^'|'$/g, "");

    // Update the database with the new file path
    await Invoices.update(
      { invoice_pdf_path: `${cleanedFilePath}` },
      { where: { id: data.id } }  // Assuming `invoice_number` is the unique identifier
    );

    return resSuccess({data:{content:pdfBuffer,filename:file.originalname}});

  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return resUnknownError(error);
  }
}


export const convertImageUrlToDataURL = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        // Extract file extension from URL
        const ext = path.extname(imageUrl).toLowerCase().replace('.', '');
        const mimeType = ext ? `image/${ext}` : 'application/octet-stream'; // Fallback MIME type

        const base64String = Buffer.from(response.data).toString('base64');
    return resSuccess({data: `data:${mimeType};base64,${base64String}`});
} catch (error) {
    return resUnknownError({ data: error })
}
}

export const getCompanyIdBasedOnTheCompanyKey = async(query:any,db_connection: any ) =>{
  try {
    const req = {
      body :{
        db_connection : db_connection,
        company_key : query?.company_key
      }
    }
    
    const companyInfoExistes = await CompanyInfo.findOne({
      where:  { key: req.body.company_key },
    });
    if(!companyInfoExistes){
      return resNotFound({message: COMPONY_KEY_NOT_EXIST});
    }
    return resSuccess({data:companyInfoExistes?.dataValues?.id ? companyInfoExistes?.dataValues?.id : 1 })
  } catch (e) {
    // return resSuccess({data: 1 })
    return resUnknownError(e);
  }
}

export const fileAddAndEditInDBAndS3ForOriginalFileName = async(
  model: any,
  id_config_setting,
  file: any,
  folder: any,
  created_by: any,
  fileData: any,
  trn: any,
) => {
  try {
    if (fileData && fileData.dataValues && fileData.dataValues.id === 0) {
      const moveFileResult = await moveFileToS3ByTypeAndLocation(file, folder);

      if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return moveFileResult;
      }

      const imageResult = await model.create({
        file_path: moveFileResult.data,
        created_by: created_by,
        created_date: getLocalDate(),
        id_config_setting: id_config_setting,
      },{transaction:trn});
      return resSuccess({ data: {old_data: null, new_data: imageResult.dataValues} });
    } else {
      if (fileData && fileData.dataValues) {
        if(fileData.dataValues?.file_path){
          await s3RemoveObject(fileData.dataValues.file_path);
        }else{
          await s3RemoveObject(fileData.dataValues.image_path);
        }        
        const moveFileResult = await moveFileToS3ByTypeAndLocation(
          file,
          folder
        );

        if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return moveFileResult;
        }

        await model.update(
          {
            file_path: moveFileResult.data,
            modified_by: created_by,
            modified_date: getLocalDate()
          },
          {
            where: { id: fileData.dataValues.id },
            transaction:trn
          },
        );
        return resSuccess({ data: {old_data: fileData.dataValues, new_data: {...fileData.dataValues,file_path: moveFileResult.data,
          modified_by: created_by,
          modified_date: getLocalDate() }} });
      } else {
        const moveFileResult = await moveFileToS3ByTypeAndLocation(
          file,
          folder
        );

        if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return moveFileResult;
        }

        const imageResult = await model.create({
          file_path: moveFileResult.data,
          created_by: created_by,
          created_date: getLocalDate(),
          id_config_setting,
        },{transaction:trn});
        return resSuccess({ data: {old_data: null, new_data: imageResult.dataValues} });
      }
    }
  } catch (error) {
    return resUnknownError({ data: error });
  }
}
export const getExtensionFromMimeType = (file:any) => {
  const mimeToExt = {
    // Images
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/x-icon': 'ico',
    
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/html': 'html',
    'application/json': 'json',
    'application/xml': 'xml',

    // Audio
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',

    // Video
    'video/mp4': 'mp4',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',

    // Archives
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
    'application/x-tar': 'tar',
    'application/gzip': 'gz',

    "application/vnd.vson+json": "vson",
  "application/vnd.dmat+json": "dmat",
  "application/vnd.pamt+json": "pamt",
  "application/vnd.collada+xml": "obj",
  "application/vnd.autodesk.fbx": "fbx",
  "application/sla": "stl",
  "model/gltf+json": "gltf",
  "model/gltf-binary": "glb",
  "model/vnd.collada+xml": "dae",
  "model/ply": "ply",
  "application/x-3ds": "3ds",
  "application/vnd.usd+json": "usd",
  "model/vnd.usd+zip": "usdz"
  };

  let extension = mimeToExt[file.mimeType]
  if (!(mimeToExt[file.mimeType])) {
    extension = file.originalname.split('.').pop();
  } else {
    extension = mimeToExt[file.mimeType]
  }

  return extension || null;
}


export const getWebSettingData = async () => {
   
  //We are reading company info from Main Secure database
   const companyInfoExistes = await CompanyInfo.findOne({
      where:  { id: 1 },
   });
  

  const webSettingData = await WebConfigSetting.findOne()
   
  return {...webSettingData.dataValues};
}

export const convertCurrencySymbolIntoHTMLFormate = (currencySymbol: string) => {
  return currencySymbol
    .split('')
    .map(char => `&#${char.charCodeAt(0)};`)
    .join('');
}

export const getEnumValue = (method: string): HTTP_METHODS | null  | any => {
  try {
  
  const normalizedMethod = method.toLowerCase(); // "get"
  const methodKey = normalizedMethod.charAt(0).toUpperCase() + normalizedMethod.slice(1); // "Get"

  if (methodKey in HTTP_METHODS) {
    return resSuccess({data:HTTP_METHODS[methodKey as keyof typeof HTTP_METHODS]});
  }
  return resNotFound({data:method}); // or throw an error if invalid
} catch (error) {
    return resUnknownError(error);
}
}
export const getCurrencyRate = async (code: string, defaultCode: string) => {
  try {
    let apiCurrencyData;

    const todayDate = new Date().toISOString().slice(0, 10);

    await axios
      .get(
        `https://${todayDate}.currency-api.pages.dev/v1/currencies/${defaultCode.toLowerCase()}.json`
      )
      .then((response) => {
        apiCurrencyData = response.data[defaultCode.toLowerCase()];
      })
      .catch((error) => {
        console.log(error);
      });

    if (apiCurrencyData) {
      if (code) {
        if (!apiCurrencyData[code.toLowerCase()]) {
          return apiCurrencyData[defaultCode.toLowerCase()];
        } else {
          return apiCurrencyData[code.toLowerCase()];
        }
      } else {
        return apiCurrencyData[defaultCode.toLowerCase()];
      }
    }

    return apiCurrencyData[defaultCode.toLowerCase()]
  } catch (error) {
    throw error;
  }
};
export const getLocationBasedOnIPAddress = async (ipAddress: any) => {
  try {
    
    const locationResponse = await axios.get(`http://ip-api.com/json/${ipAddress}`);

    return resSuccess({data: locationResponse.data});
  } catch (error) {
    return resUnknownError({ data: error });
  }
}
export const createNewDatabase = async (host: string, port: string, user: string, password: string, database: string) => {
  const client = new Client({
    host: host || process.env.DB_HOST,
    port: port || process.env.DB_PORT || 5432,
    user: user || process.env.DB_USER_NAME,
    password: password || process.env.DB_PASSWORD,
    database: 'postgres', // connect to the default db
  });

  try {
    await client.connect();

    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [database || process.env.DB_NAME]);

    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${database ||process.env.DB_NAME}"`);
      console.log(`✅ Database '${database || process.env.DB_NAME}' created successfully.`);
      return resSuccess({ data: client});
    } else {
      console.log(`✅ Database '${database || process.env.DB_NAME}' already exists.`);
      return resSuccess({ data: client});
    }
  } catch (err) {
    console.error('❌ Error creating database:', err);
    return resUnknownError({ data: err});

  } finally {
    await client.end();
  }
  
}

export const validateEnumValue = (enumType: any, value: string | string[],name?:any): any => {
  const values = Object.values(enumType) as string[];
  // Convert single value to array for uniform processing
  const inputValues = Array.isArray(value) ? value : [value];
  // Find invalid values
  const invalidValues = inputValues.filter((val) => !values.includes(val));
  if (invalidValues.length > 0) {
    return resBadRequest({
      message: `The following value(s) are not valid members of the ENUM: ${invalidValues.join(", ")}. Allow only below value(s):`,
      data: name ?  "The value of " + name + " must be either " + values.join(" or ") : values.join(", "), // Add valid ENUM values to the error response
    });
  }

  return resSuccess({
    message: `All value(s) [${inputValues.join(", ")}] are valid members of the ENUM.`,
  });
};

export const combineDateTime = (date: any, time: any) => {
  try {
    // Ensure the date is in the correct format (YYYY/MM/DD)
    if (!DATE_REGEX.test(date)) {
      return resBadRequest({ message: prepareMessageFromParams(INVALID_DATE_ERROR_MESSAGE, [["field_name", date]]) });
    }

    // If no time is provided or it's invalid, default to "00:00:00"
    if (!time) {
      time = "00:00:00"; // Default time if not given
    } else if (!TIME_REGEX.test(time)) {
      return resBadRequest({ message: prepareMessageFromParams(INVALID_TIME_ERROR_MESSAGE, [["field_name", time]]) });
    }

    // Ensure the time is in the correct format (HH:mm:ss)
    const timeParts = time.split(":");
    const [hours, minutes, seconds = "00"] = timeParts; // If seconds are missing, default to "00"

    // ISO 8601 date-time string (in UTC)

      // Create a Date object from the ISO string
      const dateConvert = new Date(date);

      // Get the year part (UTC)
      const year = dateConvert.getUTCFullYear();

      // Get the month part (UTC), add 1 because months are 0-indexed (0 = January), then pad with 0 if needed
      const month = String(dateConvert.getUTCMonth() + 1).padStart(2, '0');

      // Get the day part (UTC), pad with 0 if it's a single digit
      const day = String(dateConvert.getUTCDate()).padStart(2, '0');

    // Construct the final combined date-time string
    const combinedDateTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);

    // Return the result (success response with the combined Date object)
    return resSuccess({ data: combinedDateTime });
  } catch (error: any) {
    console.error("Error occurred while combining date and time:", error.message);
    // Return error response
    return resUnknownError(error);
  }
};

/**
 * Validates and formats a given time string.
 * Ensures the time is in "hh:mm AM/PM" format.
 *
 * @param time The input time string.
 * @returns The formatted time string or throws an error if invalid.
 */

export const validateAndFormatTime = (time: any): any => {
  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

  if (!timeRegex.test(time)) {
    return resBadRequest({ message:`Invalid time format. Please provide time in the format "hh:mm AM/PM". Example: "3:00 AM"`});
  }

  // Normalize spacing and casing
  const formattedTime = time.toUpperCase().replace(/\s+/g, " ").trim();

  return resSuccess({data:formattedTime});
};

/**
 * Ensures the input value is an array. 
 * If the value is not an array, it wraps it in an array.
 * 
 * @param value The value to check and convert.
 * @returns An array containing the value(s).
 */
export const ensureArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};


export const getRingConfigProductPriceForCart = async (product_id, is_band) => {
  const configProduct: any = await dbContext.query(
          `(
 SELECT cp.id,
 
   CASE 
        WHEN ${is_band} = 1 THEN ceil(
                CASE
                    WHEN cp.center_dia_type = 1 THEN
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN dgm.rate * dgm.average_carat
                            ELSE COALESCE(dgm.rate,0::double precision) * cz.value::double precision
                        END
                        ELSE COALESCE(dgm.rate,0::double precision)
                    END
                    ELSE
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN COALESCE(dgm.synthetic_rate,0::double precision) * dgm.average_carat
                            ELSE COALESCE(dgm.synthetic_rate,0 ::double precision) * cz.value::double precision
                        END
                        ELSE dgm.synthetic_rate
                    END
                END + COALESCE(cp.laber_charge, 0::double precision) + COALESCE(sum(cpmo.metal_wt *
                CASE
                    WHEN cpmo.karat_id IS NULL THEN metal_master.metal_rate
                    ELSE metal_master.metal_rate / metal_master.calculate_rate * gold_kts.calculate_rate
                END + COALESCE(cpmo.labor_charge, 0::double precision)), 0::double precision))
        ELSE ceil(
                CASE
                    WHEN cp.center_dia_type = 1 THEN
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN COALESCE(dgm.rate,0::double precision) * dgm.average_carat
                            ELSE COALESCE(dgm.rate,0::double precision) * cz.value::double precision
                        END
                        ELSE COALESCE(dgm.rate,0::double precision)
                    END
                    ELSE
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN COALESCE(dgm.synthetic_rate,0::double precision) * dgm.average_carat
                            ELSE COALESCE(dgm.synthetic_rate,0::double precision) * cz.value::double precision
                        END
                        ELSE COALESCE(dgm.synthetic_rate,0::double precision)
                    END
                END + COALESCE(cp.laber_charge, 0::double precision) + COALESCE(sum(
                CASE
                    WHEN lower(cpmo.head_shank_band::text) = 'band'::text THEN 0::double precision
                    ELSE cpmo.metal_wt *
                    CASE
                        WHEN cpmo.karat_id IS NULL THEN metal_master.metal_rate
                        ELSE metal_master.metal_rate / metal_master.calculate_rate * gold_kts.calculate_rate
                    END + COALESCE(cpmo.labor_charge, 0::double precision)
                END), 0::double precision)) 
    END AS product_total_price  
   FROM config_products cp
   
	 LEFT JOIN diamond_group_masters dgm ON cp.center_diamond_group_id = dgm.id  AND dgm.is_deleted = '0' AND dgm.is_Active = '1'
	 	
     INNER JOIN carat_sizes cz ON cz.id::double precision = cp.center_dia_cts 
     INNER JOIN gemstones stone ON stone.id = dgm.id_stone AND stone.is_deleted = '0' 
	 INNER JOIN config_product_metals as cpmo ON cpmo.config_product_id = cp.id 
	 INNER JOIN metal_masters metal_master ON metal_master.id = cpmo.metal_id
     LEFT JOIN gold_kts ON gold_kts.id = cpmo.karat_id  
    
    WHERE 
        cp.id = ${product_id}
    GROUP BY cp.id,cz.value,stone.is_diamond,
    dgm.average_carat,dgm.rate,dgm.synthetic_rate
    )`,
          { type: QueryTypes.SELECT }
        );
    const productDiamondPrice:any = await dbContext.query(`(SELECT cpdo.config_product_id,
              
              CASE WHEN ${is_band} != 1 THEN COALESCE(sum(
                  CASE
                      WHEN cpdo.product_type::text ~~* 'band'::text THEN 0::double precision
                      ELSE COALESCE(pdgm.rate, 0::double precision) * cpdo.dia_count::double precision * cpdo.dia_weight
                  END), 0::double precision) ELSE COALESCE(sum(
                  CASE
                      WHEN lower(cpdo.product_type::text) = 'side'::text THEN COALESCE(pdgm.rate, 0::double precision) * cpdo.dia_count::double precision *
                      CASE
                          WHEN gemstones.is_diamond = 1 THEN
                          CASE
                              WHEN pdgm.average_carat IS NOT NULL THEN pdgm.average_carat
                              ELSE cpdo.dia_weight
                          END
                          ELSE 1::double precision
                      END
                      ELSE COALESCE(pdgm.rate, 0::double precision) * cpdo.dia_count::double precision * cpdo.dia_weight
                  END), 0::double precision) END AS diamond_rate
             FROM config_product_diamonds cpdo
               LEFT JOIN diamond_group_masters pdgm ON cpdo.id_diamond_group = pdgm.id AND pdgm.is_deleted = '0' AND pdgm.is_Active = '1'
               LEFT JOIN gemstones ON gemstones.id = pdgm.id_stone
               where cpdo.config_product_id = ${configProduct[0].id}
            GROUP BY cpdo.config_product_id
          )`, { type: QueryTypes.SELECT });
  
  return (configProduct[0]?.product_total_price + (productDiamondPrice[0]?.diamond_rate || 0))
}

export const getThreeStoneConfigProductPriceForCart = async (product_id: any, is_band: any) => {
  
  const configProduct: any = await dbContext.query(
          `(
 SELECT cp.id,
   
   CASE 
        WHEN ${is_band} = 1 THEN ceil(
                CASE
                    WHEN cp.center_dia_type = 1 THEN
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN dgm.rate * dgm.average_carat
                            ELSE COALESCE(dgm.rate,0::double precision) * cz.value::double precision
                        END
                        ELSE COALESCE(dgm.rate,0::double precision)
                    END
                    ELSE
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN COALESCE(dgm.synthetic_rate,0::double precision) * dgm.average_carat
                            ELSE COALESCE(dgm.synthetic_rate,0 ::double precision) * cz.value::double precision
                        END
                        ELSE dgm.synthetic_rate
                    END
                END + COALESCE(cp.laber_charge, 0::double precision) + COALESCE(sum(cpmo.metal_wt *
                CASE
                    WHEN cpmo.karat_id IS NULL THEN metal_master.metal_rate
                    ELSE metal_master.metal_rate / metal_master.calculate_rate * gold_kts.calculate_rate
                END + COALESCE(cpmo.labor_charge, 0::double precision)), 0::double precision))
        ELSE ceil(
                CASE
                    WHEN cp.center_dia_type = 1 THEN
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN COALESCE(dgm.rate,0::double precision) * dgm.average_carat
                            ELSE COALESCE(dgm.rate,0::double precision) * cz.value::double precision
                        END
                        ELSE COALESCE(dgm.rate,0::double precision)
                    END
                    ELSE
                    CASE
                        WHEN stone.is_diamond = 1 THEN
                        CASE
                            WHEN dgm.average_carat IS NOT NULL THEN COALESCE(dgm.synthetic_rate,0::double precision) * dgm.average_carat
                            ELSE COALESCE(dgm.synthetic_rate,0::double precision) * cz.value::double precision
                        END
                        ELSE COALESCE(dgm.synthetic_rate,0::double precision)
                    END
                END + COALESCE(cp.laber_charge, 0::double precision) + COALESCE(sum(
                CASE
                    WHEN lower(cpmo.head_shank_band::text) = 'band'::text THEN 0::double precision
                    ELSE cpmo.metal_wt *
                    CASE
                        WHEN cpmo.karat_id IS NULL THEN metal_master.metal_rate
                        ELSE metal_master.metal_rate / metal_master.calculate_rate * gold_kts.calculate_rate
                    END + COALESCE(cpmo.labor_charge, 0::double precision)
                END), 0::double precision)) 
    END AS product_total_price  
   FROM config_products cp
   
	 LEFT JOIN diamond_group_masters dgm ON cp.center_diamond_group_id = dgm.id  AND dgm.is_deleted = '0' AND dgm.is_Active = '1'
     INNER JOIN carat_sizes cz ON cz.id::double precision = cp.center_dia_cts 
     INNER JOIN gemstones stone ON stone.id = dgm.id_stone AND stone.is_deleted = '0' 
	 INNER JOIN config_product_metals as cpmo ON cpmo.config_product_id = cp.id 
	 INNER JOIN metal_masters metal_master ON metal_master.id = cpmo.metal_id
     LEFT JOIN gold_kts ON gold_kts.id = cpmo.karat_id  
    LEFT JOIN config_product_diamonds as cpdo ON cpdo.config_product_id = cp.id
    WHERE 
    cp.id = ${product_id} 
    GROUP BY cp.id,cz.value,stone.is_diamond,
    dgm.average_carat,dgm.rate,dgm.synthetic_rate
    )`,
          { type: QueryTypes.SELECT }
        );
    
        if(configProduct && configProduct.length == 0){
          return resNotFound({ message: "PRODUCT_NOT_FOUND" });
  }
    const productDiamondPrice:any = await dbContext.query(`(SELECT cpdo.config_product_id,
              
              CASE WHEN ${is_band} != 1 THEN COALESCE(sum(
                  CASE
                      WHEN cpdo.product_type::text ~~* 'band'::text THEN 0::double precision
                      ELSE COALESCE(pdgm.rate, 0::double precision) * cpdo.dia_count::double precision * cpdo.dia_weight
                  END), 0::double precision) ELSE COALESCE(sum(
                  CASE
                      WHEN lower(cpdo.product_type::text) = 'side'::text THEN COALESCE(pdgm.rate, 0::double precision) * cpdo.dia_count::double precision *
                      CASE
                          WHEN gemstones.is_diamond = 1 THEN
                          CASE
                              WHEN pdgm.average_carat IS NOT NULL THEN pdgm.average_carat
                              ELSE cpdo.dia_weight
                          END
                          ELSE 1::double precision
                      END
                      ELSE COALESCE(pdgm.rate, 0::double precision) * cpdo.dia_count::double precision * cpdo.dia_weight
                  END), 0::double precision) END AS diamond_rate
             FROM config_product_diamonds cpdo
               LEFT JOIN diamond_group_masters pdgm ON cpdo.id_diamond_group = pdgm.id AND pdgm.is_deleted = '0' AND pdgm.is_Active = '1'
               LEFT JOIN gemstones ON gemstones.id = pdgm.id_stone
               where cpdo.config_product_id = ${configProduct[0].id}
            GROUP BY cpdo.config_product_id
          )`, { type: QueryTypes.SELECT });
  
  return ( configProduct[0]?.product_total_price + productDiamondPrice[0].diamond_rate)
}

export const getEternityConfigProductPrice = async ( product_id: any) => {
  const productPrice:any = await dbContext.query(`SELECT cebp.id,
         CASE
             WHEN cebpdo.dia_stone IS NOT NULL THEN json_build_object('id', cebpdo.id, 'config_eternity_product_id', cebpdo.config_eternity_product_id, 'dia_clarity', cebpdo.dia_clarity, 'dia_color', cebpdo.dia_color, 'dia_count', cebpdo.dia_count, 'dia_cts', cebpdo.dia_cts, 'dia_cuts', cebpdo.dia_cuts, 'dia_mm_size', cebpdo.dia_mm_size, 'dia_shape', cebpdo.dia_shape, 'dia_stone', cebpdo.dia_stone, 'dia_weight', cebpdo.dia_weight, 'diamond_type', cebpdo.diamond_type, 'id_diamond_group', cebpdo.id_diamond_group, 'rate', dgmp.rate)
             ELSE NULL::json
         END AS diamonds,
         CASE
             WHEN cebpmo.karat_id IS NULL THEN
             CASE
                 WHEN cebp.product_combo_type = 1 OR cebp.product_combo_type = 3 THEN COALESCE(
                 CASE
                     WHEN cebp.dia_type = 2 THEN dgm.synthetic_rate
                     ELSE dgm.rate
                 END * cebp.dia_count *
                 CASE
                     WHEN gemstones.is_diamond = 1 THEN
                     CASE
                         WHEN dgm.average_carat IS NOT NULL OR dgm.average_carat <> 0::double precision THEN dgm.average_carat
                         ELSE carat_sizes.value::double precision
                     END
                     ELSE 1::double precision
                 END, 0::double precision)
                 ELSE COALESCE(
                 CASE
                     WHEN cebp.dia_type = 2 THEN dgmp.synthetic_rate
                     ELSE dgmp.rate
                 END * cebpdo.dia_count::double precision *
                 CASE
                     WHEN gemstones.is_diamond = 1 THEN
                     CASE
                         WHEN dgm.average_carat IS NOT NULL OR dgm.average_carat <> 0::double precision THEN dgm.average_carat
                         ELSE carat_size_sd.value::double precision
                     END
                     ELSE 1::double precision
                 END, 0::double precision) + COALESCE(
                 CASE
                     WHEN cebp.dia_type = 2 THEN dgm.synthetic_rate
                     ELSE dgm.rate
                 END * cebp.dia_count *
                 CASE
                     WHEN gemstones.is_diamond = 1 THEN
                     CASE
                         WHEN dgm.average_carat IS NOT NULL OR dgm.average_carat <> 0::double precision THEN dgm.average_carat
                         ELSE carat_sizes.value::double precision
                     END
                     ELSE 1::double precision
                 END, 0::double precision)
             END + metal_masters.metal_rate * cebpmo.metal_wt + COALESCE(cebp.labour_charge, 0::double precision) + COALESCE(cebp.other_charge, 0::double precision)
             ELSE
             CASE
                 WHEN cebp.product_combo_type = 1 OR cebp.product_combo_type = 3 THEN COALESCE(
                 CASE
                     WHEN cebp.dia_type = 2 THEN dgm.synthetic_rate
                     ELSE dgm.rate
                 END * cebp.prod_dia_total_count *
                 CASE
                     WHEN gemstones.is_diamond = 1 THEN
                     CASE
                         WHEN dgm.average_carat IS NOT NULL OR dgm.average_carat <> 0::double precision THEN dgm.average_carat
                         ELSE carat_sizes.value::double precision
                     END
                     ELSE 1::double precision
                 END, 0::double precision)
                 ELSE COALESCE(
                 CASE
                     WHEN cebp.dia_type = 2 THEN dgmp.synthetic_rate
                     ELSE dgmp.rate
                 END * cebpdo.dia_count::double precision *
                 CASE
                     WHEN gemstones.is_diamond = 1 THEN
                     CASE
                         WHEN dgm.average_carat IS NOT NULL OR dgm.average_carat <> 0::double precision THEN dgm.average_carat
                         ELSE carat_size_sd.value::double precision
                     END
                     ELSE 1::double precision
                 END, 0::double precision) + COALESCE(
                 CASE
                     WHEN cebp.dia_type = 2 THEN dgm.synthetic_rate
                     ELSE dgm.rate
                 END * cebp.alternate_dia_count *
                 CASE
                     WHEN gemstones.is_diamond = 1 THEN
                     CASE
                         WHEN dgm.average_carat IS NOT NULL OR dgm.average_carat <> 0::double precision THEN dgm.average_carat
                         ELSE carat_sizes.value::double precision
                     END
                     ELSE 1::double precision
                 END, 0::double precision)
             END + metal_masters.metal_rate / metal_masters.calculate_rate * gold_kts.name::double precision / 24::double precision * cebpmo.metal_wt + COALESCE(cebp.labour_charge, 0::double precision) + COALESCE(cebp.other_charge, 0::double precision)
         END AS product_price
    FROM config_eternity_products cebp
      JOIN config_eternity_product_metals cebpmo ON cebpmo.config_eternity_id = cebp.id
      LEFT JOIN diamond_group_masters dgm ON dgm.id = cebp.diamond_group_id
      LEFT JOIN carat_sizes ON dgm.id_carat = carat_sizes.id
      LEFT JOIN gemstones ON gemstones.id = dgm.id_stone
      LEFT JOIN metal_masters ON metal_masters.id = cebpmo.metal_id
      LEFT JOIN gold_kts ON gold_kts.id = cebpmo.karat_id
      LEFT JOIN config_eternity_product_diamonds cebpdo ON cebpdo.config_eternity_product_id = cebp.id AND cebpdo.is_deleted = '0'::"bit"
      LEFT JOIN diamond_group_masters dgmp ON dgmp.id = cebpdo.id_diamond_group
      LEFT JOIN carat_sizes carat_size_sd ON dgmp.id_carat = carat_size_sd.id
      WHERE cebp.is_deleted = '0'::"bit"
           AND cebp.id = ${product_id}`, { type: QueryTypes.SELECT });
    return productPrice[0]?.product_price ? productPrice[0]?.product_price : 0;
  
}

export const getBraceletConfigProductPrice = async ( product_id: any) => {
  const productPrice:any = await dbContext.query(`SELECT  
		CASE
            WHEN cbpm.id_karat IS NULL THEN metal_masters.metal_rate * cbpm.metal_wt
            ELSE metal_masters.metal_rate / metal_masters.calculate_rate * gold_kts.calculate_rate::double precision * cbpm.metal_wt 
        END + COALESCE(cbpm.labour_charge,0) 
		+ 
		COALESCE(sum(COALESCE(CASE WHEN cbp.product_dia_type = 1 THEN pdgm.rate ELSE pdgm.synthetic_rate END,0) * cbpd.dia_count::double precision *
                CASE
                    WHEN stone.is_diamond = 1 THEN cbpd.dia_wt
                    ELSE 1::double precision
                END), 0::double precision) as product_price
FROM config_bracelet_products cbp
LEFT JOIN config_bracelet_product_metals cbpm ON cbpm.config_product_id = cbp.id
LEFT JOIN config_bracelet_product_diamonds cbpd ON cbpd.config_product_id = cbp.id
LEFT JOIN metal_masters ON cbpm.id_metal = metal_masters.id
LEFT JOIN gold_kts ON cbpm.id_karat = gold_kts.id
LEFT JOIN diamond_group_masters pdgm ON pdgm.id = cbpd.id_diamond_group_master
LEFT JOIN gemstones stone ON stone.id = pdgm.id_stone
WHERE cbp.id = ${product_id} AND cbp.is_deleted = '${DeletedStatus.No}'::"bit"
GROUP BY cbp.id,cbpm.id_karat,metal_masters.metal_rate,cbpm.metal_wt,
metal_masters.calculate_rate,gold_kts.calculate_rate,cbpm.labour_charge`, { type: QueryTypes.SELECT });
    return productPrice[0]?.product_price || 0;
}
  
export const sendMailAPI = async (host:any,username:any,password,port:any,from:any,to:any,subject:any,body:any,files?:any) => {
  try {

    const formData = new FormData();
    formData.append("host", host);        
    formData.append("username", username);
    formData.append("password", password);
    formData.append("port", port);        
    formData.append("from", from);
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("is_html", "true");
    formData.append("body", `${body}`);
    if(files){
      formData.append("files", Buffer.from(files.content),{
  filename: files.filename,
  contentType: getMimeTypeFromBuffer(Buffer.from(files.content)),
});
    }
    const data = await axios({
      url: MAIL_SEND_API_END_POINT,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      method: "POST",
      data: formData,
      headers: {
        ...formData.getHeaders(),
        "pass-key": MAIL_SEND_API_PASS_KEY,
        "Authorization": "PUBLIC_AUTHORIZATION_TOKEN"
      },
    })
      .then((response) => {
        return resSuccess({ data: response.data });
      })
      .catch((error) => {
        return resUnknownError({ data: error });
      });
    return data;
  } catch (error) {
    return resUnknownError({ data: error });
  }
}

export const getMimeTypeFromBuffer = (buffer:any) => {
  const bufferData = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (bufferData.length < 4) return "application/octet-stream";

  const hex = bufferData.slice(0, 4).toString("hex").toUpperCase();

  // Check using hex signatures
  if (hex.startsWith("25504446")) return "application/pdf";         // %PDF
  if (hex.startsWith("89504E47")) return "image/png";               // PNG
  if (hex.startsWith("FFD8FF"))   return "image/jpeg";              // JPEG
  if (hex.startsWith("47494638")) return "image/gif";               // GIF
  if (hex.startsWith("504B0304")) return "application/zip";         // ZIP, DOCX, XLSX
  if (hex.startsWith("377ABCAF")) return "application/x-7z-compressed"; // 7z
  if (hex.startsWith("52617221")) return "application/x-rar-compressed"; // RAR

  return "application/octet-stream";
}

//CADCO panel login API

export const LoginWithCadcoPanelUsingAPI = async (email:any, password:any) => {
  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("device_id", '123456');

    const data = await axios({
      url: process.env.CADCO_PORTAL_LOGIN_URL,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      method: "POST",
      data: formData,
      headers: {
        ...formData.getHeaders()
      },
    })
      .then((response) => {
        return resSuccess({ data: response.data });
      })
      .catch((error) => {
        return resUnknownError({ data: error });
      });
    return data;
  } catch (error) {
    console.error("Error during CADCO panel login:", error);
    return resUnknownError({ data: error });
  }
} 


export const getPriceCorrectionBasedOnProduct = async (product_type:any) => {
  try {
    const findRoudOfferValue = await PriceCorrection.findOne({
      where : { product_type: product_type}
    })

    if(findRoudOfferValue && findRoudOfferValue.dataValues){
      return {value: findRoudOfferValue.dataValues.round_off, flag: true};
    } else {
      return {value: 0, flag: false};
    }
    
  } catch (error) {
     return {value: 0, flag: false};
  }
}

export const roundToEnding = (value:any, targetEnding:any) => {

    let roundedValue = Math.round(value);
    let remainder = roundedValue % 10;

    if (remainder > targetEnding) {
        // Jump to next 10 and subtract to reach targetEnding
        roundedValue += (10 - remainder) + targetEnding;
    } else if (remainder < targetEnding) {
        // Just add difference to reach targetEnding
        roundedValue += (targetEnding - remainder);
    }
    // If remainder === targetEnding, it's already correct
    return roundedValue;
}

export const getProductTypeForPriceCorrection = async (product_type: any, singleProductType:any) => {
  let productType = null;

  switch (product_type) {
    case AllProductTypes.Product:      
    productType = singleProductType == SingleProductType.DynemicPrice || singleProductType == SingleProductType.cataLogueProduct ? PRICE_CORRECTION_PRODUCT_TYPE.DynamicProduct : null;
    break;
  case (AllProductTypes.SettingProduct && singleProductType == SingleProductType.DynemicPrice || singleProductType == SingleProductType.cataLogueProduct):
    productType = PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct;
    break;
  case (AllProductTypes.SingleTreasure && singleProductType == SingleProductType.DynemicPrice || singleProductType == SingleProductType.cataLogueProduct):
    productType = PRICE_CORRECTION_PRODUCT_TYPE.ChooseSettingProduct;
    break;
  case AllProductTypes.Config_Ring_product:
    productType = PRICE_CORRECTION_PRODUCT_TYPE.RingConfigurator;
    break;
  case AllProductTypes.Three_stone_config_product:
    productType = PRICE_CORRECTION_PRODUCT_TYPE.ThreeStoneConfigurator;
    break;
  case AllProductTypes.Eternity_product:
    productType = PRICE_CORRECTION_PRODUCT_TYPE.EternityBandConfigurator;
    break;
  case AllProductTypes.BraceletConfigurator:
    productType = PRICE_CORRECTION_PRODUCT_TYPE.BracelateConfigurator;
      break;
  case AllProductTypes.StudConfigurator:
    productType = PRICE_CORRECTION_PRODUCT_TYPE.StudConfigProduct;
    break;
  case AllProductTypes.PendantConfigurator:
    productType = PRICE_CORRECTION_PRODUCT_TYPE.PendantConfigProduct;
    break;
  default:
    productType = null;
  }

  return productType
}