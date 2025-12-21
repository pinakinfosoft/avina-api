import { Router } from "express";
import {
  addCityFn,
  addCountryFn,
  addCurrencyFn,
  addProductDropdownFn,
  addStateFn,
  addTaxDataFn,
  configuratorDropDownDataFn,
  dashboardAPIFn,
  deleteCityFn,
  deleteCountryFn,
  deleteCurrencyFn,
  deleteStateFn,
  deleteStaticPageFn,
  deleteTaxFn,
  getAllCityFn,
  getAllCountryFn,
  getAllCurrencyFn,
  getAllStateFn,
  getAllTaxDataFn,
  getByIdCityFn,
  getByIdCountryFn,
  getByIdCurrencyFn,
  getByIdStateFn,
  getByIdTaxFn,
  defaultStatusUpdateForCurrencyFn,
  publicConfiguratorDropDownDataFn,
  statusUpdateForCityFn,
  statusUpdateCountryFn,
  statusUpdateForCurrencyFn,
  statusUpdateForStateFn,
  statusUpdateForTaxFn,
  updateCityFn,
  updateCountryFn,
  updateCurrencyFn,
  updateStateFn,
  updateTaxDataFn,
  updateConfiguratorMasterDataFn,
  allMasterListDataFn,
  addPageFn,
  getPagesFn,
  getByIdPageFn,
  updatePageFn,
  deletePageFn,
  statusUpdateForPageFn,
  restrictStatusUpdateForPageFn,
  pageListForDropdownFn,
  updateImageForSideSettingForConfigFn,
  getSideSettingImageForConfigFn,
} from "../../controllers/masters/master.controller";

import {
  addMasterCurrencyRateValidator,
  addMasterCurrencyValidator,
  addMasterValidator,
  addTagValidator,
  updateMasterCurrencyValidator,
  updateMasterValidator,
} from "../../../validators/master/master.validator";
import { authorization } from "../../../middlewares/authenticate";
import { reqAnyTypeImageAnyFormat, reqSingleImageParser } from "../../../middlewares/multipart-file-parser";
import { getAllProductEnquiriesFn } from "../../controllers/enquirie.controller";
import { getAllOrdersListAdminFn } from "../../controllers/orders.controller";
import { addSideSettingFn, getSideSettingFn } from "../../controllers/masters/attributes.controller";

export default (app: Router) => {

    ///////----- Dashboard --------/////////////////
  
    app.get("/dashboard", [authorization], dashboardAPIFn);
    app.get("/dashboard/order/list", [authorization], getAllOrdersListAdminFn);
    app.get("/dashboard/enquiries/product", [authorization], getAllProductEnquiriesFn);
  

  ////////////---- country ----/////////////
  app.post("/country", [authorization, addMasterValidator], addCountryFn);
  app.get("/country", [authorization], getAllCountryFn);
  app.get("/country/:id", [authorization], getByIdCountryFn);
  app.put(
    "/country/:id",
    [authorization, updateMasterValidator],
    updateCountryFn
  );
  app.delete("/country/:id", [authorization], deleteCountryFn);
  app.patch("/country/:id", [authorization], statusUpdateCountryFn);

  ////////////---- state ----/////////////
  app.post("/state", [authorization, addMasterValidator], addStateFn);
  app.get("/state", [authorization], getAllStateFn);
  app.get("/state/country", [authorization], getAllCountryFn);
  app.get("/state/:id", [authorization], getByIdStateFn);
  app.put("/state/:id", [authorization, updateMasterValidator], updateStateFn);
  app.delete("/state/:id", [authorization], deleteStateFn);
  app.patch("/state/:id", [authorization], statusUpdateForStateFn);


  ////////////---- city ----/////////////
  app.post("/city", [authorization, addMasterValidator], addCityFn);
  app.get("/city", [authorization], getAllCityFn);
  app.get("/city/state", [authorization], getAllStateFn);
  app.get("/city/:id", [authorization], getByIdCityFn);
  app.put("/city/:id", [authorization, updateMasterValidator], updateCityFn);
  app.delete("/city/:id", [authorization], deleteCityFn);
  app.patch("/city/:id", [authorization], statusUpdateForCityFn);

  ////////////---- currency ----/////////////
  app.post(
    "/currency",
    [authorization, addMasterCurrencyRateValidator],
    addCurrencyFn
  );
  app.get("/currency", [authorization], getAllCurrencyFn);
  app.get("/currency/:id", [authorization], getByIdCurrencyFn);
  app.put(
    "/currency/:id",
    [authorization, addMasterCurrencyRateValidator],
    updateCurrencyFn
  );
  app.delete("/currency/:id", [authorization], deleteCurrencyFn);
  app.patch("/currency/:id", [authorization], statusUpdateForCurrencyFn);
  app.patch(
    "/currency/default/:id",
    [authorization],
    defaultStatusUpdateForCurrencyFn
  );

  ////////////---- tax ----/////////////
  app.post("/tax", [authorization, addMasterCurrencyValidator], addTaxDataFn);
  app.get("/tax", [authorization], getAllTaxDataFn);
  app.get("/tax/:id", [authorization], getByIdTaxFn);
  app.put(
    "/tax/:id",
    [authorization, updateMasterCurrencyValidator],
    updateTaxDataFn
  );
  app.delete("/tax/:id", [authorization], deleteTaxFn);
  app.patch("/tax/:id", [authorization], statusUpdateForTaxFn);


  ////////////---- page master ----/////////////
  app.post("/page", [authorization], addPageFn);
  app.get("/page", [authorization], getPagesFn);
  app.get("/page/:id", [authorization], getByIdPageFn);
  app.put("/page/:id", [authorization], updatePageFn);
  app.delete("/page/:id", [authorization], deletePageFn);
  app.patch("/page/:id", [authorization], statusUpdateForPageFn);
  app.patch(
    "/restrict-page/:id",
    [authorization],
    restrictStatusUpdateForPageFn
  );

  app.get("/add-product/dropDown/list",[authorization], addProductDropdownFn);
  app.get("/diamond-group/add-product/dropDown/list",[authorization], addProductDropdownFn);
  app.get("/config-select/dropDown/list",[authorization], configuratorDropDownDataFn);
  app.put("/configurator-master/:config_type",[authorization], updateConfiguratorMasterDataFn);

  app.get("/config-master-list",[authorization], allMasterListDataFn);
  app.get("/page-list",[authorization], pageListForDropdownFn);

  app.put("/side-setting-image/:config_type",[authorization,reqAnyTypeImageAnyFormat()], updateImageForSideSettingForConfigFn);
  app.get("/side-setting-image/:config_type",[authorization],getSideSettingImageForConfigFn);

  app.post(
    "/attribute/side-setting",
    [authorization, reqSingleImageParser("image"), addTagValidator],
    addSideSettingFn
  );
  app.get("/attribute/side-setting", [authorization], getSideSettingFn);
  app.get("/menus/page", [authorization], getPagesFn);

  app.get("/earring/config-master-list",[authorization], allMasterListDataFn);
  app.get("/three-stone/config-master-list",[authorization], allMasterListDataFn);
  app.get("/eternity/config-master-list",[authorization], allMasterListDataFn);
  app.get("/bracelete/config-master-list",[authorization], allMasterListDataFn);
  app.get("/pendent/config-master-list",[authorization], allMasterListDataFn);

};
