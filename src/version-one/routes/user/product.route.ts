import { Router } from "express";
import {
  productMetalToneListFn,
  productListUserSideFn,
  productGetByIdUserSideFn,
  trendingProductListUserSideFn,
  featuredProductListUserSideFn,
  addProductWishListFn,
  getProductWishListByUserIdFn,
  deleteProductWishListFn,
  addToCartProductAPIFn,
  cartProductListByUSerIdFn,
  deleteCartProductFn,
  wishlistCartListCountFn,
  searchProductGloballyFn,
  cartProductListgustCheckOutFn,
  addVariantProductIntoWishListFn,
  getVariantProductWishlistByUserIdFn,
  deleteVariantProductWishListFn,
  getAllProductImageNamePublicAPIFn,
  getAllProductSlugFn,
  similarProductListFn,
  getProductImagesUsingS3AndAddInDBFn,
  getWishListProductsForProductListAndDetailFn,
  deleteVariantProductWishListWithProductFn,
  addProductSearchValueFn,
  productSearchListForUserFn,
  deleteProductSearchValueForUserFn,
  withoutVariantProductExportFn,
  moveProductCartToWishlistFn,
  getProductsBasedOnTheSettingStyleFn,
} from "../../controllers/product.controller";
import {
  customerAuthorization,
  publicAuthentication,
} from "../../../middlewares/authenticate";
import {
  reqArrayImageParser,
  reqProductBulkUploadFileParser,
  reqSingleImageParser,
} from "../../../middlewares/multipart-file-parser";
import {
  addProductCartListValidator,
  addProductWishListValidator,
  birthstoneProductDetailValidator,
  deleteCartProductValidator,
} from "../../../validators/product/product.validator";
import {
  addProductReviewFn,
  getProductReviewByProductIDFn,
} from "../../controllers/product-review.controller";
import { currencyMiddleware } from "../../../middlewares/currency-rate-change";

export default (app: Router) => {
 
  app.get("/product/list", [currencyMiddleware], productListUserSideFn);
  app.get("/product/featured/list",[currencyMiddleware], featuredProductListUserSideFn);
  app.get("/product/trending/list",[currencyMiddleware], trendingProductListUserSideFn);
  app.post(
    "/product/details",
    [currencyMiddleware],
    productGetByIdUserSideFn
  );
  app.post(
    "/product/wishlist/add",
    [customerAuthorization, addProductWishListValidator],
    addProductWishListFn
  );
  app.post(
    "/product/wishlist/list",
    [customerAuthorization],
    getProductWishListByUserIdFn
  );
  app.post(
    "/product/wishlist/delete",
    [customerAuthorization, addProductWishListValidator],
    deleteProductWishListFn
  );

  app.post(
    "/product/cart/add",
    [customerAuthorization, addProductCartListValidator],
    addToCartProductAPIFn
  );
  app.post(
    "/product/cart/list",
    [customerAuthorization],
    cartProductListByUSerIdFn
  );
  app.post(
    "/product/cart/delete",
    [customerAuthorization, deleteCartProductValidator],
    deleteCartProductFn
  );
  
  app.post(
    "/product/cart/list/gust",
    [currencyMiddleware],
    cartProductListgustCheckOutFn
  );

  app.post(
    "/product/review/add",
    [
      customerAuthorization,
      reqArrayImageParser(["images"]),
      addProductWishListValidator,
    ],
    addProductReviewFn
  );
  app.post("/product/review/list", getProductReviewByProductIDFn);

  app.post("/product/wish/cart/count", wishlistCartListCountFn);
  app.get(
    "/product/serach/list",
    [currencyMiddleware],
    searchProductGloballyFn
  );


  /* new diamond master base One combination config product */

  // app.post(
  //   "/product/config/one-combination/add",
  //   [reqProductBulkUploadFileParser("config_csv")],
  //   addConfigProductsOneCombinationFromCSVFileFn
  // );

  /* config product find based on sku */

  /* ------------------- variant product wish list CRUD ----------------------- */

  app.post(
    "/product/variant/wishlist",
    [reqSingleImageParser("image")],
    [customerAuthorization, addProductWishListValidator],
    addVariantProductIntoWishListFn
  );
  app.get(
    "/product/variant/wishlist/:user_id",
    [customerAuthorization, currencyMiddleware],
    getVariantProductWishlistByUserIdFn
  );

  app.get(
    "/product-wishlist/:user_id",
    getWishListProductsForProductListAndDetailFn
  );
  app.delete(
    "/product/variant/wishlist/:user_id/:whishlist_id",
    [customerAuthorization],
    deleteVariantProductWishListFn
  );
  app.patch(
    "/product/variant/wishlist-delete",
    [customerAuthorization],
    deleteVariantProductWishListWithProductFn
  );

  app.get("/product-slug", getAllProductSlugFn);

  app.get("/similar-product/:slug", [currencyMiddleware], similarProductListFn);

  // app.get("/export/without-variant-products", withoutVariantProductExportFn);



  app.post("/product-search", addProductSearchValueFn);
  app.get("/product-search", productSearchListForUserFn);
  app.delete("/product-search/:ids", deleteProductSearchValueForUserFn);

  
  app.post(
    "/product/wishlist/:cart_id",
    [customerAuthorization],
    moveProductCartToWishlistFn
  );

  app.post("/choose-setting-product/detail",[currencyMiddleware], getProductsBasedOnTheSettingStyleFn)
};
