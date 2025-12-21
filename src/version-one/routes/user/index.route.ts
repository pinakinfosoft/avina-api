import { Router } from "express";
import attributesRoute from "./attributes.route";
import authRoute from "../auth.route";

import masterRoute from "./master.route";
import staticPageRoute from "./staticPage.route";
import productRoute from "./product.route";
import enquiriesUserRoute from "./frontend/enquiriesUser.route";
import companyInfoRoute from "./companyinfo.route";
import masterUserRoute from "./frontend/masterUser.route";
import homeAboutCustomerRoute from "./frontend/homeAbout-Customer.route";
import filterListData from "./frontend/flter-list-data.route";
import blogsRoute from "./blogs.route";
import orderRoute from "./order.route";
import paymentRoute from "./payment.route";
import subscriptionRoute from "./subscription.route";
import allProductAddCart from "./allProductAddCart";
import looseDiamondRoute from "./loose-diamond.route";
import infoSectionRoute from "./info-section.route";
import metaDataRoute from "./meta-data.route";
import couponRoute from "./coupon.route";
import megaMenuRoute from "./mega-menu.route";
import faqQuestionAnswerRoute from "./faq-question-answer.route";
import shippingChargeRoute from "./shipping-charge.route";
import aboutUsRoute from "./about-us.route";
import filtersRoute from "./filters.route";
import storeAddressRoute from "./store-address.route";
import templateEightRoute from "./template-eight.route";

export default () => {
  const app = Router();
  authRoute(app);
  masterRoute(app);
  staticPageRoute(app);
  attributesRoute(app);
  productRoute(app);
  enquiriesUserRoute(app);
  companyInfoRoute(app);
  masterUserRoute(app);
  homeAboutCustomerRoute(app);
  filterListData(app);
  blogsRoute(app);
  orderRoute(app);
  paymentRoute(app);
  subscriptionRoute(app);
  allProductAddCart(app);
  looseDiamondRoute(app);
  infoSectionRoute(app);
  metaDataRoute(app);
  couponRoute(app);
  megaMenuRoute(app);
  faqQuestionAnswerRoute(app);
  shippingChargeRoute(app);
  aboutUsRoute(app);
  filtersRoute(app)
  storeAddressRoute(app)
  templateEightRoute(app);
  return app;
};
