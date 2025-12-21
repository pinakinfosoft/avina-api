import { Router } from "express";
import {
  configuratorDropDownDataFn,
  addProductDropdownFn,
} from "../../controllers/masters/master.controller";


import { reqAnyTypeImageAnyFormat } from "../../../middlewares/multipart-file-parser";
import { getAllProductEnquiriesFn } from "../../controllers/enquirie.controller";
import { getAllOrdersListAdminFn } from "../../controllers/orders.controller";

export default (app: Router) => {
  

  ///////----- config select DropDown Data --------/////////////////

  app.get("/add-product/dropDown/list", addProductDropdownFn);
  app.get("/config-select/dropDown/list", configuratorDropDownDataFn);
  // app.get(
  //   "/public/config-select/dropDown/list",
  //   publicConfiguratorDropDownDataFn
  // );
  // app.post("/birthstone/name-update", updateBirthstoneProductTitleSlugFn);
  // app.put("/configurator-master/:config_type", updateConfiguratorMasterDataFn);
  // app.put("/side-setting-image/:config_type",[reqAnyTypeImageAnyFormat()], updateImageForSideSettingForConfigFn);
  // app.get("/side-setting-image/:config_type", getSideSettingImageForConfigFn);

};
