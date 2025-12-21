import { Router } from "express";
import {
  activeInactiveProductFn,
  deleteProductFn,
  getProductByIdFn,
  getAllProductFn,
  addProductsFromCSVFileFn,
  saveProductBasicDetailsFn,
  saveMetalDiamondDetailsFn,
  addProductImagesFn,
  addProductVideosFn,
  deleteProductImagesFn,
  deleteProductVideosFn,
  productMetalToneListFn,
  productListUserSideFn,
  productGetByIdUserSideFn,
  saveProductMetalOptionFn,
  trendingProductListUserSideFn,
  featuredProductListUserSideFn,
  featuredProductStatusUpdateFn,
  trendingProductStatusUpdateFn,
  addProductWishListFn,
  getProductWishListByUserIdFn,
  deleteProductWishListFn,
  getProductWishListDataFn,
  addProductAllDetailsApiFn,
  addToCartProductAPIFn,
  cartProductListByUSerIdFn,
  deleteCartProductFn,
  getCartProductListDataFn,
  wishlistCartListCountFn,
  addProductsZipFileFn,
  searchProductGloballyFn,
  editproductApiFn,
  cartProductListgustCheckOutFn,
  addProductWithVariantFn,
  addVariantProductsFromCSVFileFn,
  addVariantProductIntoWishListFn,
  getVariantProductWishlistByUserIdFn,
  deleteVariantProductWishListFn,
  getAllProductImageNamePublicAPIFn,
  getAllProductSlugFn,
  addProductImageCSVFileFn,
  similarProductListFn,
  addChooseSettingProductsFromCSVFileFn,
  deleteMultipleProductsFn,
  statusUpdateForMultipleProductsFn,
  getProductImagesUsingS3AndAddInDBFn,
  getWishListProductsForProductListAndDetailFn,
  deleteVariantProductWishListWithProductFn,
  addProductSearchValueFn,
  productSearchListForUserFn,
  deleteProductSearchValueForUserFn,
  popularSearchListFn,
  deleteProductSearchValueForAdminFn,
  recentSearchListFn,
  withoutVariantProductExportFn,
  moveProductCartToWishlistFn,
  addDynamicChooseSettingProductsFromCSVFileFn,
  addDynamicChooseSettingWithFixedMetalProductsFromCSVFileFn,
  getProductsBasedOnTheSettingStyleFn,
  addBETDynamicChooseSettingProductsFromCSVFileFn,
} from "../../controllers/product.controller";
import {
  authorization,
  customerAuthorization,
  publicAuthentication,
} from "../../../middlewares/authenticate";
import {
  reqAnyTypeImageAnyFormat,
  reqArrayImageParser,
  reqArrayVideoParser,
  reqProductBulkUploadFileParser,
  reqProductBulkZipFileParser,
  reqSingleImageParser,
} from "../../../middlewares/multipart-file-parser";
import {
  activeInactiveProductValidator,
  addProductCartListValidator,
  addProductImagesValidator,
  addProductVideoValidator,
  addProductWishListValidator,
  addProductWithVariantValidator,
  deleteCartProductValidator,
  deleteProductImageValidator,
  deleteProductValidator,
  deleteProductVideoValidator,
  featuredProductValidator,
  saveProductBasicDetailsValidator,
  saveProductMetalDiamondDetailsValidator,
  trendingProductValidator,
} from "../../../validators/product/product.validator";
import {
  addProductReviewFn,
  getProductReviewByProductIDFn,
  getProductReviewListDataFn,
  statusUpdateforProductReviewFn,
} from "../../controllers/product-review.controller";
import { currencyMiddleware } from "../../../middlewares/currency-rate-change";
import { addProductDropdownFn } from "../../controllers/masters/master.controller";

export default (app: Router) => {
  
  app.post("/product/metalTone",[authorization], productMetalToneListFn);

  app.get("/product", [authorization], getAllProductFn);
  app.get("/product/:id", [authorization], getProductByIdFn);

  app.post(
    "/active-inactive-product",
    [authorization, activeInactiveProductValidator],
    activeInactiveProductFn
  );
  app.post(
    "/product/featured/status",
    [authorization, featuredProductValidator],
    featuredProductStatusUpdateFn
  );
  app.post(
    "/product/trending/status",
    [authorization, trendingProductValidator],
    trendingProductStatusUpdateFn
  );
  app.post(
    "/product",
    [authorization, deleteProductValidator],
    deleteProductFn
  );
  app.post(
    "/product-csv",
    [authorization, reqProductBulkUploadFileParser("product_csv")],
    addProductsFromCSVFileFn
  );

  app.post(
    "/product-imagezip",
    [authorization, reqProductBulkZipFileParser("product_zip")],
    addProductsZipFileFn
  );
  app.post(
    "/product-basic-details",
    [authorization, saveProductBasicDetailsValidator],
    saveProductBasicDetailsFn
  );
  app.post(
    "/product-metal-diamond-details",
    [authorization, saveProductMetalDiamondDetailsValidator],
    saveMetalDiamondDetailsFn
  );
  app.post(
    "/product-images",
    [authorization, reqAnyTypeImageAnyFormat()],
    addProductImagesFn
  );
  app.post(
    "/product-videos",
    [authorization, reqArrayVideoParser(["videos"]), addProductVideoValidator],
    addProductVideosFn
  );
  app.post(
    "/product-images/deleted",
    [authorization, deleteProductImageValidator],
    deleteProductImagesFn
  );
  app.delete(
    "/product-videos",
    [authorization, deleteProductVideoValidator],
    deleteProductVideosFn
  );

  app.post("/product/add/metal", [authorization], saveProductMetalOptionFn);
  app.get("/product/wish/list", [authorization], getProductWishListDataFn);
  app.post(
    "/product/add/data",
    [authorization, saveProductBasicDetailsValidator],
    addProductAllDetailsApiFn
  );
  app.post(
    "/product/edit/data",
    [authorization, saveProductBasicDetailsValidator],
    editproductApiFn
  );
  app.get(
    "/product/cart/list",
    [authorization],
    getCartProductListDataFn
  );
  app.put(
    "/product/review/status",
    [authorization],
    statusUpdateforProductReviewFn
  );
  app.get(
    "/product/review/lists",
    [authorization],
    getProductReviewListDataFn
  );

  app.post("/product/review/list",[authorization], getProductReviewByProductIDFn);


  /* single product add with variant */

  app.post(
    "/product/variant",
    [authorization, addProductWithVariantValidator],
    addProductWithVariantFn
  );

  /* variant product add using BULK upload */

  app.post(
    "/product/variant/product-csv",
    [authorization, reqProductBulkUploadFileParser("product_csv")],
    addVariantProductsFromCSVFileFn
  );

  /* choose setting product add using BULK upload */
  app.post(
    "/product/variant/choose-setting/product-csv",
    [authorization, reqProductBulkUploadFileParser("product_csv")],
    addChooseSettingProductsFromCSVFileFn
  );

  app.post(
    "/product/dynamic/choose-setting/product-csv",
    [authorization, reqProductBulkUploadFileParser("product_csv")],
    addDynamicChooseSettingProductsFromCSVFileFn
  );

  app.post(
    "/product/dynamic-fixed-metal/choose-setting/product-csv",
    [authorization, reqProductBulkUploadFileParser("product_csv")],
    addDynamicChooseSettingWithFixedMetalProductsFromCSVFileFn
  );
  /* ---------------- BET product import like HLD setting & center diamond logic change product add using BULK upload */
  app.post(
    "/bet-product/dynamic-fixed-metal/choose-setting/product-csv",
    [authorization, reqProductBulkUploadFileParser("product_csv")],
    addBETDynamicChooseSettingProductsFromCSVFileFn
  );
  /* ------------------- variant product wish list CRUD ----------------------- */
  app.post(
    "/product-image-csv",
    [authorization, reqProductBulkUploadFileParser("product_image_csv")],
    addProductImageCSVFileFn
  );


  /* bulk delete and bulk status update for product */

  app.put("/products-delete", [authorization], deleteMultipleProductsFn);
  app.put(
    "/products-status",
    [authorization],
    statusUpdateForMultipleProductsFn
  );

  /* get product images using s3 & add image in db */
  app.post("/product-search",[authorization], addProductSearchValueFn);
  app.get("/product-popular-search", [authorization], popularSearchListFn);
  app.get("/product-recent-search", [authorization], recentSearchListFn);
  app.delete(
    "/product-search/:ids",
    [authorization],
    deleteProductSearchValueForAdminFn
  );
 
  app.get("/add-birthstone/add-product/dropDown/list",[authorization], addProductDropdownFn);
  app.get("/add/add-product/dropDown/list",[authorization], addProductDropdownFn);
  app.get("/add-varriant/add-product/dropDown/list",[authorization], addProductDropdownFn);
  // app.get("/add-product/product-sku",[authorization], productSKUListFn);
  // app.get("/add-product-variant/product-sku",[authorization], productSKUListFn);

  app.get("/image-upload/product/:id", [authorization], getProductByIdFn);
  app.get("/show-image/product/:id", [authorization], getProductByIdFn);
  app.post("/image-upload/product/metalTone", [authorization], productMetalToneListFn);
  app.get("/varriant/product/:id", [authorization], getProductByIdFn);

};
