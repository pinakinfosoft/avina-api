import { RequestHandler } from "express";
import {
  addProductDropdown,
  configuratorDropDownData,
  dashboardAPI,
  publicConfiguratorDropDownData,
} from "../../services/master/attributes/product-Add.service";
import {
  addCity,
  deleteCity,
  getAllCity,
  getByIdCity,
  statusUpdateForCity,
  updateCity,
} from "../../services/master/city.service";
import {
  addCountry,
  deleteCountry,
  getAllCountry,
  getByIdCountry,
  getPresignedUrl,
  statusUpdateForCountry,
  updateCountry,
} from "../../services/master/contry.service";
import {
  addCurrency,
  deleteCurrency,
  getAllCurrency,
  getByIdCurrency,
  defaultStatusUpdateForCurrency,
  statusUpdateForCurrency,
  updateCurrency,
} from "../../services/master/currency.service";
import {
  addState,
  deleteState,
  getAllState,
  getByIdState,
  statusUpdateForState,
  updateState,
} from "../../services/master/state.service";
import {
  addStaticPage,
  deleteStaticPage,
  getAllStaticPages,
  getByIdStaticPage,
  statusUpdateStaticPage,
  updateStaticPages,
} from "../../services/static_page.service";
import { callServiceMethod } from "../base.controller";
import {
  addTaxData,
  deleteTax,
  getAllTaxData,
  getByIdTax,
  statusUpdateForTax,
  updateTaxData,
} from "../../services/master/text.service";
import {
  allMasterListData,
  getSideSettingImageForConfig,
  updateConfiguratorMasterData,
  updateImageForSideSettingForConfig,
} from "../../services/master/config-master-manage.service";
import {
  addMaster,
  masterDelete,
  masterDetail,
  masterList,
  masterStatusUpdate,
  updateMaster,
} from "../../services/master/masters.service";
import {
  addPage,
  deletePage,
  getByIdPage,
  getPages,
  pageListForDropdown,
  restrictStatusUpdateForPage,
  statusUpdateForPage,
  updatePage,
} from "../../services/master/page.service";

//////////////----Country ------///////////////////////
export const addCountryFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addCountry(req), "addCountryFn");
};

export const getAllCountryFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllCountry(req), "getAllCountryFn");
};

export const getByIdCountryFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getByIdCountry(req), "getByIdCountryFn");
};

export const updateCountryFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateCountry(req), "updateCountryFn");
};

export const deleteCountryFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteCountry(req), "deleteCountryFn");
};

export const statusUpdateCountryFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    statusUpdateForCountry(req),
    "statusUpdateCountryFn"
  );
};

//////////////---- State ------///////////////////////

export const addStateFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addState(req), "addStateFn");
};

export const getAllStateFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllState(req), "getAllStateFn");
};

export const getByIdStateFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getByIdState(req), "getByIdStateFn");
};

export const updateStateFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateState(req), "updateStateFn");
};

export const deleteStateFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteState(req), "deleteStateFn");
};

export const statusUpdateForStateFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, statusUpdateForState(req), "statusUpdateStateFn");
};

//////////////---- city ------///////////////////////

export const addCityFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addCity(req), "addCityFn");
};

export const getAllCityFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllCity(req), "getAllCityFn");
};

export const getByIdCityFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getByIdCity(req), "getByIdCityFn");
};

export const updateCityFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateCity(req), "updateCityFn");
};

export const deleteCityFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteCity(req), "deleteCityFn");
};

export const statusUpdateForCityFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, statusUpdateForCity(req), "statusUpdateCityFn");
};

//////////////---- currency ------///////////////////////

export const addCurrencyFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addCurrency(req), "addCurrencyFn");
};

export const getAllCurrencyFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllCurrency(req), "getAllCurrencyFn");
};

export const getByIdCurrencyFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getByIdCurrency(req), "getByIdCurrencyFn");
};

export const updateCurrencyFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateCurrency(req), "updateCurrencyFn");
};

export const deleteCurrencyFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteCurrency(req), "deleteCurrencyFn");
};

export const statusUpdateForCurrencyFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    statusUpdateForCurrency(req),
    "statusUpdateCurrencyFn"
  );
};

export const defaultStatusUpdateForCurrencyFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    defaultStatusUpdateForCurrency(req),
    "isDefaultCurrencyFn"
  );
};
//////////////---- static page ------///////////////////////

export const addStaticPageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addStaticPage(req), "addStaticPageFn");
};

export const getAllStaticPageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllStaticPages(req), "getAllStaticPageFn");
};

export const getByIdStaticPageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getByIdStaticPage(req), "getByIdStaticPageFn");
};

export const updateStaticPageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateStaticPages(req), "updateStaticPageFn");
};

export const deleteStaticPageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteStaticPage(req), "deleteStaticPageFn");
};

export const statusUpdateStaticPageFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    statusUpdateStaticPage(req),
    "statusUpdateStaticPageFn"
  );
};

//////////////---- tax  ------///////////////////////

export const addTaxDataFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addTaxData(req), "addTaxDataFn");
};

export const getAllTaxDataFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllTaxData(req), "getAllTaxDataFn");
};

export const getByIdTaxFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getByIdTax(req), "getByIdTaxFn");
};

export const updateTaxDataFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateTaxData(req), "updateTaxDataFn");
};

export const deleteTaxFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteTax(req), "deleteTaxFn");
};

export const statusUpdateForTaxFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, statusUpdateForTax(req), "statusUpdateForTaxFn");
};

/////////----- Add product DropDown Data -----//////////////////

export const addProductDropdownFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addProductDropdown(req), "addProductDropdownFn");
};

////////------ Dashboard -----////////////////////
export const dashboardAPIFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, dashboardAPI(req), "dashboardAPIFn");
};

/////////----- config select DropDown Data -----//////////////////

export const configuratorDropDownDataFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    configuratorDropDownData(req),
    "configuratorDropDownDataFn"
  );
};

export const publicConfiguratorDropDownDataFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    publicConfiguratorDropDownData(req),
    "publicConfiguratorDropDownDataFn"
  );
};

///////////---------- updateBirthstoneProductTitleSlug ---------////////

export const updateConfiguratorMasterDataFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    updateConfiguratorMasterData(req),
    "updateConfiguratorMasterDataFn"
  );
};
export const allMasterListDataFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, allMasterListData(req), "allMasterListDataFn");
};
export const updateImageForSideSettingForConfigFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateImageForSideSettingForConfig(req), "updateImageForSideSettingForConfigFn");
};

export const getSideSettingImageForConfigFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getSideSettingImageForConfig(req), "getSideSettingImageForConfigFn");
};
// ::::::::::---------:::::=== master Master Controller ===:::::---------:::::::::: //
export const addMasterFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addMaster(req), "addMasterFn");
};
export const updateMasterFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateMaster(req), "updateMasterFn");
};
export const masterListFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, masterList(req), "masterListFn");
};
export const masterDetailFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, masterDetail(req), "masterDetailFn");
};
export const masterStatusUpdateFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, masterStatusUpdate(req), "masterStatusUpdateFn");
};
export const masterDeleteFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, masterDelete(req), "masterDeleteFn");
};

// ::::::::::---------:::::=== page master ===:::::---------:::::::::: //
export const addPageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addPage(req), "addPageFn");
};
export const updatePageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updatePage(req), "updatePageFn");
};
export const getPagesFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getPages(req), "getPagesFn");
};
export const getByIdPageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getByIdPage(req), "getByIdPageFn");
};
export const statusUpdateForPageFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    statusUpdateForPage(req),
    "statusUpdateForPageFn"
  );
};
export const deletePageFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deletePage(req), "deletePageFn");
};
export const restrictStatusUpdateForPageFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    restrictStatusUpdateForPage(req),
    "restrictStatusUpdateForPageFn"
  );
};
export const pageListForDropdownFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    pageListForDropdown(req),
    "pageListForDropdownFn"
  );
};


export const getPresignedUrlFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getPresignedUrl(req), "getPresignedUrlFn");
};