import { RequestHandler } from "express";
import {
  addProductZip,
  addProductsFromCSVFile,
} from "../services/product-bulk-upload.service";
import {
  activeInactiveProduct,
  deleteProduct,
  getProductById,
  getAllProduct,
  saveProductBasicDetails,
  saveMetalDiamondDetails,
  addProductImages,
  addProductVideos,
  deleteProductImages,
  deleteProductVideos,
  productMetalToneList,
  productListUserSide,
  productGetByIdUserSide,
  saveProductMetalOption,
  featuredProductListUserSide,
  trendingProductListUserSide,
  featuredProductStatusUpdate,
  trendingProductStatusUpdate,
  addProductAllDetailsApi,
  wishlistCartListCount,
  searchProductGlobally,
  editproductApi,
  addProductWithVariant,
  getAllProductImageNamePublicAPI,
  getAllProductSlug,
  similarProductList,
  deleteMultipleProducts,
  statusUpdateForMultipleProducts,
  getProductImagesUsingS3AndAddInDB,
  addProductSearchValue,
  productSearchListForUser,
  deleteProductSearchValueForUser,
  popularSearchList,
  deleteProductSearchValueForAdmin,
  recentSearchList,
  getProductsBasedOnTheSettingStyle,
  getProductQuantityDetails,
  bulkUploadSampleFileColumns,
  updateRingConfiguratorProductHeadNumber,
} from "../services/product.service";
import { callServiceMethod } from "./base.controller";
import {
  addProductWishList,
  addVariantProductIntoWishList,
  deleteProductWishList,
  deleteVariantProductWishList,
  deleteVariantProductWishListWithProduct,
  getProductWishListByUserId,
  getProductWishListData,
  getVariantProductWishlistByUserId,
  getWishListProductsForProductListAndDetail,
  moveProductCartToWishlist,
} from "../services/product-wishlist.service";
import {
  addToCartProductAPI,
  cartProductListByUSerId,
  cartProductListgustCheckOut,
  deleteCartProduct,
  getCartProductListData,
} from "../services/cart-product.service";
import { addVariantProductsFromCSVFile } from "../services/product-bulk-upload-with-variant.service";
import { addProductImageCSVFile } from "../services/product-image-bulk-upload.service";
import { addChooseSettingProductsFromCSVFile } from "../services/variant-product-bulk-upload-with-choose-setting.service";
import { addDynamicChooseSettingProductsFromCSVFile } from "../services/dynamic-product-bulk-upload-with-choose-setting.service";
import { addDynamicChooseSettingWithFixedMetalProductsFromCSVFile } from "../services/dynamic-product-bulk-uload-with-fixed-metal-choose-setting.service";
import { addBETDynamicChooseSettingProductsFromCSVFile } from "../services/dynamic-product-bet-product-like-hld-choose-setting-center-diamond-logic-chnage-bulk-upload.service";

export const getAllProductFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllProduct(req), "getAllProductFn");
};

export const getProductByIdFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getProductById(req), "getProductByIdFn");
};

export const activeInactiveProductFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    activeInactiveProduct(req),
    "activeInactiveProductFn"
  );
};

export const deleteProductFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteProduct(req), "deleteProductFn");
};

export const addProductsFromCSVFileFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addProductsFromCSVFile(req),
    "addProductsFromCSVFileFn"
  );
};

export const addProductsZipFileFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addProductZip(req), "addProductsZipFileFn");
};

export const saveProductBasicDetailsFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    saveProductBasicDetails(req),
    "saveProductBasicDetailsFn"
  );
};

export const saveMetalDiamondDetailsFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    saveMetalDiamondDetails(req),
    "saveMetalDiamondDetailsFn"
  );
};

export const addProductImagesFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addProductImages(req), "addProductImagesFn");
};

export const addProductVideosFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addProductVideos(req), "addProductVideosFn");
};

export const deleteProductImagesFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    deleteProductImages(req),
    "deleteProductImagesFn"
  );
};

export const deleteProductVideosFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    deleteProductVideos(req),
    "deleteProductVideosFn"
  );
};

export const getProductWishListDataFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    getProductWishListData(req),
    "getProductWishListDataFn"
  );
};

export const productMetalToneListFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    productMetalToneList(req),
    "productMetalToneListFn"
  );
};

export const productListUserSideFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    productListUserSide(req),
    "productListUserSideFn"
  );
};

export const productGetByIdUserSideFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    productGetByIdUserSide(req),
    "productGetByIdUserSideFn"
  );
};

export const saveProductMetalOptionFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    saveProductMetalOption(req),
    "saveProductMetalOptionFn"
  );
};

export const featuredProductListUserSideFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    featuredProductListUserSide(req),
    "featuredProductListUserSideFn"
  );
};

export const trendingProductListUserSideFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    trendingProductListUserSide(req),
    "trendingProductListUserSideFn"
  );
};

export const featuredProductStatusUpdateFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    featuredProductStatusUpdate(req),
    "featuredProductStatusUpdateFn"
  );
};

export const trendingProductStatusUpdateFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    trendingProductStatusUpdate(req),
    "trendingProductStatusUpdateFn"
  );
};

export const addProductWishListFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addProductWishList(req), "addProductWishListFn");
};

export const getProductWishListByUserIdFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    getProductWishListByUserId(req),
    "getProductWishListByUserIdFn"
  );
};

export const deleteProductWishListFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    deleteProductWishList(req),
    "deleteProductWishListFn"
  );
};

export const addProductAllDetailsApiFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addProductAllDetailsApi(req),
    "addProductAllDetailsApiFn"
  );
};

export const editproductApiFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, editproductApi(req), "editproductApiFn");
};

/////////----  cart product --/////////////////
export const addToCartProductAPIFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addToCartProductAPI(req),
    "addToCartProductAPIFn"
  );
};

export const cartProductListByUSerIdFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    cartProductListByUSerId(req),
    "cartProductListByUSerIdFn"
  );
};

export const deleteCartProductFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteCartProduct(req), "deleteCartProductFn");
};

export const getCartProductListDataFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    getCartProductListData(req),
    "getCartProductListDataFn"
  );
};

export const cartProductListgustCheckOutFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    cartProductListgustCheckOut(req),
    "cartProductListgustCheckOut"
  );
};

/////////////--- count ----/////////////////////////

export const wishlistCartListCountFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    wishlistCartListCount(req),
    "wishlistCartListCountFn"
  );
};

export const searchProductGloballyFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    searchProductGlobally(req),
    "searchProductGloballyFn"
  );
};
/* product add and edit with variant data and without variant --- single product and watch product manage in one */

export const addProductWithVariantFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addProductWithVariant(req),
    "addProductWithVariantFn"
  );
};

/* variant product add using BULK upload */

export const addVariantProductsFromCSVFileFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addVariantProductsFromCSVFile(req),
    "addVariantProductsFromCSVFileFn"
  );
};

/* choose setting product add using BULK upload */

export const addChooseSettingProductsFromCSVFileFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    addChooseSettingProductsFromCSVFile(req),
    "addChooseSettingProductsFromCSVFileFn"
  );
};
export const addDynamicChooseSettingProductsFromCSVFileFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    addDynamicChooseSettingProductsFromCSVFile(req),
    "addDynamicChooseSettingProductsFromCSVFileFn"
  );
};

export const addDynamicChooseSettingWithFixedMetalProductsFromCSVFileFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    addDynamicChooseSettingWithFixedMetalProductsFromCSVFile(req),
    "addDynamicChooseSettingWithFixedMetalProductsFromCSVFileFn"
  );
};

/* ---------------- BET product import like HLD setting & center diamond logic change product add using BULK upload */

export const addBETDynamicChooseSettingProductsFromCSVFileFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addBETDynamicChooseSettingProductsFromCSVFile(req),
    "addBETDynamicChooseSettingProductsFromCSVFileFn"
  );
}

/* --------------------- variant wishlist product  CRUD ---------------------------------*/

export const addVariantProductIntoWishListFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addVariantProductIntoWishList(req),
    "addVariantProductIntoWishListFn"
  );
};

export const getVariantProductWishlistByUserIdFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    getVariantProductWishlistByUserId(req),
    "getVariantProductWishlistByUserIdFn"
  );
};

export const deleteVariantProductWishListFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    deleteVariantProductWishList(req),
    "deleteVariantProductWishListFn"
  );
};
export const deleteVariantProductWishListWithProductFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    deleteVariantProductWishListWithProduct(req),
    "deleteVariantProductWishListWithProductFn"
  );
};
export const getWishListProductsForProductListAndDetailFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    getWishListProductsForProductListAndDetail(req),
    "getWishListProductsForProductListAndDetailFn"
  );
};
///////----- add zip images ----/////////////////////

export const getAllProductImageNamePublicAPIFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    getAllProductImageNamePublicAPI(req),
    "getAllProductImageNamePublicAPIFn"
  );
};

export const getAllProductSlugFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllProductSlug(req), "getAllProductSlugFn");
};
/*    product image upload bulk sheet    */
export const addProductImageCSVFileFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addProductImageCSVFile(req),
    "addProductImageCSVFileFn"
  );
};
export const similarProductListFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    similarProductList(req),
    "addProductImageCSVFileFn"
  );
};

export const deleteMultipleProductsFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    deleteMultipleProducts(req),
    "deleteMultipleProductsFn"
  );
};
export const statusUpdateForMultipleProductsFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    statusUpdateForMultipleProducts(req),
    "statusUpdateForMultipleProductsFn"
  );
};

export const withoutVariantProductExportFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    statusUpdateForMultipleProducts(req),
    "withoutVariantProductExportFn"
  );
};

/* get product images using s3 & add image in db */

export const getProductImagesUsingS3AndAddInDBFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    getProductImagesUsingS3AndAddInDB(req),
    "getProductImagesUsingS3AndAddInDBFn"
  );
};

export const addProductSearchValueFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addProductSearchValue(req),
    "addProductSearchValueFn"
  );
};

export const productSearchListForUserFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    productSearchListForUser(req),
    "productSearchListForUserFn"
  );
};
export const deleteProductSearchValueForUserFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    deleteProductSearchValueForUser(req),
    "deleteProductSearchValueForUserFn"
  );
};
export const popularSearchListFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, popularSearchList(req), "popularSearchListFn");
};
export const deleteProductSearchValueForAdminFn: RequestHandler = (
  req,
  res
) => {
  callServiceMethod(
    req,
    res,
    deleteProductSearchValueForAdmin(req),
    "deleteProductSearchValueForAdminFn"
  );
};
export const recentSearchListFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, recentSearchList(req), "recentSearchListFn");
};

export const moveProductCartToWishlistFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, moveProductCartToWishlist(req), "moveProductCartToWishlistFn");
};

export const getProductsBasedOnTheSettingStyleFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getProductsBasedOnTheSettingStyle(req), "getProductsBasedOnTheSettingStyleFn");
};

export const getProductQuantityDetailsFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getProductQuantityDetails(req), "getProductQuantityDetailsFn");
};

export const bulkUploadSampleFileColumnsFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, bulkUploadSampleFileColumns(req), "bulkUploadSampleFileColumnsFn");
};

export const updateRingConfiguratorProductHeadNumberFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateRingConfiguratorProductHeadNumber(req), "updateRingConfiguratorProductHeadNumberFn");
};
