import { Request } from "express";
import { Sequelize } from "sequelize";
import {
  ActiveStatus,
  DeletedStatus,
  IMAGE_TYPE,
  LogsActivityType,
  LogsType,
} from "../../utils/app-enumeration";
import {
  DEFAULT_STATUS_CODE_SUCCESS,
  RECORD_UPDATE_SUCCESSFULLY,
} from "../../utils/app-messages";
import {
  addActivityLogs,
  encryptResponseData,
  getLocalDate,
  imageAddAndEditInDBAndS3ForOriginalFileName,
  resNotFound,
  resSuccess,
} from "../../utils/shared-functions";
import { LOG_FOR_SUPER_ADMIN, GLEAMORA_KEY } from "../../utils/app-constants";
import { CompanyInfo } from "../model/companyinfo.model";
import { Image } from "../model/image.model";
import { TaxMaster } from "../model/master/tax.model";
import { StaticPageData } from "../model/static_page.model";
import { WebConfigSetting } from "../model/theme/web-config-setting.model";
import { CurrencyData } from "../model/master/currency.model";
import dbContext from "../../config/db-context";

export const addCompanyInfo = async (req: Request) => {
  const {
    company_name,
    company_email,
    company_phone,
    copy_right,
    sort_about,
    web_link,
    facebook_link,
    insta_link,
    youtube_link,
    linkdln_link,
    twitter_link,
    web_primary_color,
    web_secondary_color,
    announce_color,
    announce_text,
    announce_text_color,
    company_address,
    est_shipping_day = null,
    pinterest_link,
    gst_number = null
  } = req.body;

  try {
    const payload = {
      company_name: company_name,
      company_email: company_email,
      company_phone: company_phone,
      copy_right: copy_right,
      sort_about: sort_about,
      web_link: web_link,
      facebook_link: facebook_link,
      insta_link: insta_link,
      youtube_link: youtube_link,
      linkdln_link: linkdln_link,
      twitter_link: twitter_link,
      pinterest_link: pinterest_link,
      web_primary_color: web_primary_color,
      web_secondary_color: web_secondary_color,
      announce_is_active: ActiveStatus.Active,
      announce_color: announce_color,
      announce_text: announce_text,
      announce_text_color: announce_text_color,
      created_date: getLocalDate(),
      company_address: company_address,
      est_shipping_day: est_shipping_day,
      gst_number,
      created_by: req.body.session_res.id_app_user,
    };
    const companyInfoData = await CompanyInfo.create(payload);
    await addActivityLogs([{
      old_data: null,
      new_data: {
        companyinfo_id: companyInfoData?.dataValues?.id, data: {
          ...companyInfoData?.dataValues
        }
      }
    }], companyInfoData?.dataValues?.id, LogsActivityType.Add, LogsType.Companyinfo, req?.body?.session_res?.id_app_user)
    return resSuccess({ data: payload });
  } catch (error) {
    throw error;
  }
};

export const updateCompanyInfo = async (req: Request) => {

  const {
    id,
    company_name,
    company_email,
    company_phone,
    copy_right,
    sort_about,
    web_link,
    facebook_link,
    insta_link,
    youtube_link,
    linkdln_link,
    twitter_link,
    pinterest_link,
    web_primary_color,
    web_secondary_color,
    announce_color,
    announce_text,
    announce_text_color,
    company_address,
    est_shipping_day = null,
    announce_is_active,
    gst_number = null
  } = req.body;

  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const companyInfo:any = await CompanyInfo.findOne({
      where: { id: id },
    });

    const trn = await dbContext.transaction();

    try {
      let darkIdImage = null;
      if (files["dark_image"]) {
        let findImage = null;
        if (companyInfo.dataValues.dark_id_image) {
          findImage = await Image.findOne({
            where: { id: companyInfo.dataValues.dark_id_image },
            transaction: trn,
          });
        }
        const imageData = await imageAddAndEditInDBAndS3ForOriginalFileName(
          files["dark_image"][0],
          IMAGE_TYPE.headerLogo,
          req.body.session_res.id_app_user,
          findImage,
        );

        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return imageData;
        }
        darkIdImage = imageData.data;
      }
      let lightIdImage = null;
      if (files["light_image"]) {
        let findImage = null;
        if (companyInfo.dataValues.light_id_image) {
          findImage = await Image.findOne({
            where: { id: companyInfo.dataValues.light_id_image },
            transaction: trn,
          });
        }
        const imageData = await imageAddAndEditInDBAndS3ForOriginalFileName(
          files["light_image"][0],
          IMAGE_TYPE.footerLogo,
          req.body.session_res.id_app_user,
          findImage,
        );

        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return imageData;
        }
        lightIdImage = imageData.data;
      }
      let faviconIdImage = null;
      if (files["favicon_image"]) {
        let findImage = null;
        if (companyInfo.dataValues.favicon_image) {
          findImage = await Image.findOne({
            where: { id: companyInfo.dataValues.favicon_image },
            transaction: trn,
          });
        }
        const imageData = await imageAddAndEditInDBAndS3ForOriginalFileName(
          files["favicon_image"][0],
          IMAGE_TYPE.FaviconImage,
          req.body.session_res.id_app_user,
          findImage,
        );
        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return imageData;
        }
        faviconIdImage = imageData.data;
      }

      if (companyInfo) {
        const updatedCompanyInfo = await CompanyInfo.update(
          {
            company_name: company_name,
            company_email: company_email,
            company_phone: company_phone,
            copy_right: copy_right,
            sort_about: sort_about,
            dark_id_image: darkIdImage || companyInfo.dataValues.dark_id_image,
            light_id_image:
              lightIdImage || companyInfo.dataValues.light_id_image,
            favicon_image:
              faviconIdImage || companyInfo.dataValues.favicon_image,
            web_link: web_link,
            facebook_link: facebook_link,
            insta_link: insta_link,
            youtube_link: youtube_link,
            linkdln_link: linkdln_link,
            twitter_link: twitter_link,
            pinterest_link: pinterest_link,
            web_primary_color: web_primary_color,
            web_secondary_color: web_secondary_color,
            announce_is_active: announce_is_active,
            announce_color: announce_color,
            announce_text: announce_text,
            company_address: company_address,
            est_shipping_day: est_shipping_day,
            announce_text_color: announce_text_color,
            modified_date: getLocalDate(),
            gst_number: gst_number,
            modified_by: req.body.session_res.id_app_user,
          },

          { where: { id: companyInfo.dataValues.id }, transaction: trn }
        );
        const updatedData = await CompanyInfo.findOne({
          where: { id: updatedCompanyInfo },
          transaction: trn,
        });

        await addActivityLogs([{
          old_data: { companyinfo_id: companyInfo?.dataValues?.id, data: companyInfo?.dataValues},
          new_data: {
            companyinfo_id: companyInfo?.dataValues?.id, data: { ...companyInfo?.dataValues, ...updatedData?.dataValues }
          }
        }], companyInfo?.dataValues?.id,LogsActivityType.Edit, LogsType.Companyinfo, req?.body?.session_res?.id_app_user,trn)
        await trn.commit();
        return resSuccess({
          message: RECORD_UPDATE_SUCCESSFULLY,
          data: updatedData,
        });
      } else {
        await trn.rollback();
        return resNotFound();
      }
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getCompanyInfoData = async (req: Request) => {
  try {

    const companyInfo = await CompanyInfo.findAll({
      attributes: [
        "id",
        "company_name",
        "company_email",
        "company_phone",
        "copy_right",
        "sort_about",
        "web_link",
        "facebook_link",
        "insta_link",
        "youtube_link",
        "linkdln_link",
        "twitter_link",
        "web_primary_color",
        "web_secondary_color",
        "announce_is_active",
        "announce_color",
        "announce_text",
        "announce_text_color",
        "light_id_image",
        "dark_id_image",
        "favicon_image",
        "company_address",
        "est_shipping_day",
        "pinterest_link",
        "gst_number",
        "key",
        [Sequelize.literal('"dark_image"."image_path"'), "dark_image_path"],
        [Sequelize.literal('"light_image"."image_path"'), "light_image_path"],
        [Sequelize.literal('"favicon"."image_path"'), "favicon_image_path"],
      ],
      include: [
        {
          model: Image,
          as: "dark_image",
          attributes: [],
        },
        {
          model: Image,
          as: "light_image",
          attributes: [],
        },
        {
          model: Image,
          as: "favicon",
          attributes: [],
        },
      ],
    });

    return resSuccess({ data: companyInfo });
  } catch (error) {
    throw error;
  }
};

export const getCompanyInfoCustomer = async (req: Request) => {
  try {
    const companyInfo = await CompanyInfo.findOne({
      where: { key: req.query.company_key, is_active: ActiveStatus.Active },
      attributes: [
        "id",
        "company_name",
        "company_email",
        "company_phone",
        "copy_right",
        "sort_about",
        "web_link",
        "facebook_link",
        "insta_link",
        "youtube_link",
        "linkdln_link",
        "twitter_link",
        "web_primary_color",
        "web_secondary_color",
        "announce_is_active",
        "announce_color",
        "announce_text",
        "announce_text_color",
        "light_id_image",
        "favicon_image",
        "dark_id_image",
        "pinterest_link",
        "company_address",
        "est_shipping_day",
        "web_restrict_url",
        "gst_number",
        "loader_image",
        "mail_tem_logo",
        "default_image",
        "page_not_found_image",
        "script",
        "address_embed_map",
        "address_map_link",
        "primary_font",
        "primary_font_weight",
        "primary_font_json",
        "secondary_font",
        "secondary_font_weight",
        "secondary_font_json",
        "secondary_font_type",
        "primary_font_type",
        "share_image",
        "product_not_found_image",
        "order_not_found_image",
      ],
    });
    if (companyInfo) {
      const darkImagedata = await Image.findOne({
        where: { id: companyInfo.dataValues.dark_id_image },
      });
      const light_id_image = await Image.findOne({
        where: { id: companyInfo.dataValues.light_id_image },
      });
      const favicon_id_image = await Image.findOne({
        where: { id: companyInfo.dataValues.favicon_image },
      });

      const loaderImage = await Image.findOne({
        where: { id: companyInfo.dataValues.loader_image },
      })

      const defaultImage = await Image.findOne({
        where: { id: companyInfo.dataValues.default_image },
      })

      const pageNotFoundImage = await Image.findOne({
        where: { id: companyInfo.dataValues.page_not_found_image },
      })

      const shareImage = await Image.findOne({
        where: { id: companyInfo.dataValues.share_image },
      }) 
      
      const productNotFoundImage = await Image.findOne({
        where: { id: companyInfo.dataValues.product_not_found_image },
      })

      const orderNotFoundImage = await Image.findOne({
        where: { id: companyInfo.dataValues.order_not_found_image },
      })
      const images = {
        darakImage: darkImagedata?.dataValues.image_path,
        lightImage: light_id_image?.dataValues.image_path,
        faviconImage: favicon_id_image?.dataValues.image_path
          ? favicon_id_image?.dataValues.image_path
          : null,
        loaderImage: loaderImage?.dataValues.image_path
          ? loaderImage?.dataValues.image_path
          : null,
        defaultImage: defaultImage?.dataValues.image_path
          ? defaultImage?.dataValues.image_path
          : null,
        pageNotFoundImage: pageNotFoundImage?.dataValues.image_path
          ? pageNotFoundImage?.dataValues.image_path
          : null,
        shareImage: shareImage?.dataValues.image_path
          ? shareImage?.dataValues.image_path
          : null,
        productNotFoundImage: productNotFoundImage?.dataValues.image_path
          ? productNotFoundImage?.dataValues.image_path
          : null,
        orderNotFoundImage: orderNotFoundImage?.dataValues.image_path
          ? orderNotFoundImage?.dataValues.image_path
          : null
      };

      const taxList = await TaxMaster.findAll({
        where: { is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No },
      });

      const staticPageList = await StaticPageData.findAll({
        where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
        attributes: ["id", "page_title", "slug"],
      });
      const currencyList = await CurrencyData.findAll({
        where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
        attributes: ["id", "currency", "code", "symbol", "thousand_token", "symbol_placement"],
      });

      const webSettings = await WebConfigSetting.findOne({
        where: { company_id: companyInfo.dataValues.id },
        attributes: [
          "razorpay_public_key",
          "razorpay_secret_key",
          "razorpay_script",
          "razorpay_status",
          "stripe_public_key",
          "stripe_secret_key",
          "stripe_script",
          "stripe_status",
          "paypal_public_key",
          "paypal_secret_key",
          "paypal_status",
          "paypal_script",
          "yoco_public_key",
          "yoco_secret_key",
          "yoco_status",
          "yoco_script",
          "affirm_public_key",
          "affirm_secret_key",
          "affirm_status",
          "affirm_script",
          "insta_api_endpoint",
          "insta_access_token",
          "allow_out_of_stock_product_order",
          "image_base_url",
          "metal_tone_identifier",
          "three_stone_glb_key",
          "band_glb_key",
          "glb_key",
          "metal_karat_value",
          "metal_gold_id",
          "metal_silver_id",
          "metal_platinum_id",
          "eternity_band_glb_key",
          "bracelet_glb_key",
          "google_font_key",
          "google_auth_status",
          "google_auth_key",
          "insta_auth_status",
          "insta_auth_key",
          "facebook_auth_status",
          "facebook_auth_key",
          "apple_auth_status",
          "apple_auth_key",
          "insta_secret_key",
          "glb_url",
          "gust_user_allowed",
          "promo_code_allowed",
          "pickup_from_store",
          "move_to_wishlist",
          "shop_now",
          "otp_generate_digit_count",
          "pendant_glb_key",
          "stud_glb_key",
          "is_login",
          "is_config_login",
          "is_sign_up",
          "google_map_api_key",
          ]
      })
      return resSuccess({
        data: {
          companyInfo,
          images: images,
          taxList,
          static_pages: staticPageList,
          currency_list: currencyList,
          web_setting: webSettings
        },
      });
  }
  } catch (error) {
    throw error;
  }
};
export const getCompanyInfoForAdmin = async (req: Request) => {
  try {
    const companyInfo = await CompanyInfo.findOne({
      where: { id: null, is_active: ActiveStatus.Active },
      attributes: [
        "id",
        "key",
        "company_name",
        "company_email",
        "company_phone",
        "copy_right",
        "sort_about",
        "web_link",
        "facebook_link",
        "insta_link",
        "youtube_link",
        "linkdln_link",
        "twitter_link",
        "web_primary_color",
        "web_secondary_color",
        "announce_is_active",
        "announce_color",
        "announce_text",
        "announce_text_color",
        "light_id_image",
        "favicon_image",
        "dark_id_image",
        "pinterest_link",
        "company_address",
        "est_shipping_day",
        "web_restrict_url",
        "gst_number",
        "loader_image",
        "mail_tem_logo",
        "default_image",
        "page_not_found_image",
        "script",
        "address_embed_map",
        "address_map_link",
        "primary_font",
        "primary_font_weight",
        "primary_font_json",
        "secondary_font",
        "secondary_font_weight",
        "secondary_font_json",
        "secondary_font_type",
        "primary_font_type",
        "share_image",
        "product_not_found_image",
        "order_not_found_image",
        [Sequelize.literal(`CASE WHEN key = '${GLEAMORA_KEY}' THEN true ELSE false END`), "is_theme_update"],
      ],
    });
    if (companyInfo) {
      const darkImagedata = await Image.findOne({
        where: { id: companyInfo.dataValues.dark_id_image },
      });
      const light_id_image = await Image.findOne({
        where: { id: companyInfo.dataValues.light_id_image },
      });
      const favicon_id_image = await Image.findOne({
        where: { id: companyInfo.dataValues.favicon_image },
      });

      const loaderImage = await Image.findOne({
        where: { id: companyInfo.dataValues.loader_image },
      })

      const defaultImage = await Image.findOne({
        where: { id: companyInfo.dataValues.default_image },
      })

      const pageNotFoundImage = await Image.findOne({
        where: { id: companyInfo.dataValues.page_not_found_image },
      })

      const shareImage = await Image.findOne({
        where: { id: companyInfo.dataValues.share_image },
      }) 
      
      const productNotFoundImage = await Image.findOne({
        where: { id: companyInfo.dataValues.product_not_found_image },
      })

      const orderNotFoundImage = await Image.findOne({
        where: { id: companyInfo.dataValues.order_not_found_image },
      })
      const images = {
        darakImage: darkImagedata?.dataValues.image_path,
        lightImage: light_id_image?.dataValues.image_path,
        faviconImage: favicon_id_image?.dataValues.image_path
          ? favicon_id_image?.dataValues.image_path
          : null,
        loaderImage: loaderImage?.dataValues.image_path
          ? loaderImage?.dataValues.image_path
          : null,
        defaultImage: defaultImage?.dataValues.image_path
          ? defaultImage?.dataValues.image_path
          : null,
        pageNotFoundImage: pageNotFoundImage?.dataValues.image_path
          ? pageNotFoundImage?.dataValues.image_path
          : null,
        shareImage: shareImage?.dataValues.image_path
          ? shareImage?.dataValues.image_path
          : null,
        productNotFoundImage: productNotFoundImage?.dataValues.image_path
          ? productNotFoundImage?.dataValues.image_path
          : null,
        orderNotFoundImage: orderNotFoundImage?.dataValues.image_path
          ? orderNotFoundImage?.dataValues.image_path
          : null
      };

      const taxList = await TaxMaster.findAll({
        where: { is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No },
      });

      const staticPageList = await StaticPageData.findAll({
        where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
        attributes: ["id", "page_title", "slug"],
      });
      const currencyList = await CurrencyData.findAll({
        where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
        attributes: ["id", "currency", "code", "symbol", "thousand_token"],
      });

      const webSettings = await WebConfigSetting.findOne({
        where: { company_id: companyInfo.dataValues.id },
        attributes: [
          "razorpay_public_key",
          "razorpay_secret_key",
          "razorpay_script",
          "razorpay_status",
          "stripe_public_key",
          "stripe_secret_key",
          "stripe_script",
          "stripe_status",
          "paypal_public_key",
          "paypal_secret_key",
          "paypal_status",
          "paypal_script",
          "yoco_public_key",
          "yoco_secret_key",
          "yoco_status",
          "yoco_script",
          "affirm_public_key",
          "affirm_secret_key",
          "affirm_status",
          "affirm_script",
          "insta_api_endpoint",
          "insta_access_token",
          "allow_out_of_stock_product_order",
          "image_base_url",
          "metal_tone_identifier",
          "three_stone_glb_key",
          "band_glb_key",
          "glb_key",
          "metal_karat_value",
          "metal_gold_id",
          "metal_silver_id",
          "metal_platinum_id",
          "eternity_band_glb_key",
          "bracelet_glb_key",
          "google_font_key",
          "google_auth_status",
          "google_auth_key",
          "insta_auth_status",
          "insta_auth_key",
          "facebook_auth_status",
          "facebook_auth_key",
          "apple_auth_status",
          "apple_auth_key",
          "insta_secret_key",
          "glb_url",
          "gust_user_allowed",
          "promo_code_allowed",
          "pickup_from_store",
          "move_to_wishlist",
          "shop_now",
          "otp_generate_digit_count",
          "pendant_glb_key",
          "stud_glb_key",
          "is_login",
          "is_config_login",
          "is_sign_up",
          "google_map_api_key",
          "fronted_base_url"
          ]
      })
      const defaultCurrency = await CurrencyData.findOne({
        where: {
          is_default: "1",
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
        },
        attributes: ["id", "currency", "code", "symbol", "thousand_token", "symbol_placement"]
      })
      return resSuccess({
        data: {
          companyInfo,
          images: images,
          taxList,
          static_pages: staticPageList,
          currency_list: currencyList,
          web_setting: webSettings, 
          default_currency: defaultCurrency
        },
      });
  }
  } catch (error) {
    throw error;
  }
};
export const updateWebRestrictURL = async (req: Request) => {
  try {
    const { web_link } = req.body;
    const findexistingData:any = await CompanyInfo.findOne( { where: { key: req.params.key } })
    const updateData = await CompanyInfo.update(
      { web_restrict_url: encryptResponseData(web_link) },
      { where: { key: req.params.key } }
    );

    await addActivityLogs([{
      old_data: { companyinfo_id: findexistingData?.dataValues?.id, web_restrict_url: findexistingData?.datavalues?.web_restrict_url},
      new_data: {
        companyinfo_id: findexistingData?.dataValues?.id, web_restrict_url: encryptResponseData(web_link)
      }
    }], findexistingData?.dataValues?.id, LogsActivityType.CompanyinfoURLUpdate, LogsType.Companyinfo, req?.body?.session_res?.id_app_user)
         
    if (updateData) {
      return resSuccess({
        message: RECORD_UPDATE_SUCCESSFULLY,
        data: null,
      });
    }
  } catch (error) {
    throw error;
  }
};
