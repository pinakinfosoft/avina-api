import { RequestHandler } from "express";
import {
  addLooseDiamond,
  addLooseDiamondCSVFile,
  addLooseDiamondImages,
  deleteDiamond,
  getAllMasterDataForLooseDiamond,
  looseDiamondAdminList,
  looseDiamondDetailsForAdmin,
  looseDiamondDetailsForUser,
  looseDiamondUserList,
  statusUpdateLooseDiamond,
  updateLooseDiamond,
} from "../services/loose-diamond-bulk-import.service";
import { callServiceMethod } from "./base.controller";

export const addLooseDiamondCSVFileFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addLooseDiamondCSVFile(req),
    "addLooseDiamondCSVFileFn"
  );
};

export const addLooseDiamondImagesFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    addLooseDiamondImages(req),
    "addLooseDiamondImagesFn"
  );
};

export const getLooseDiamondsAdminFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    looseDiamondAdminList(req),
    "getLooseDiamondsAdminFn"
  );
};

export const getLooseDiamondDetailAdminFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    looseDiamondDetailsForAdmin(req),
    "getLooseDiamondDetailAdminFn"
  );
};

export const deleteLooseDiamondFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, deleteDiamond(req), "deleteLooseDiamondFn");
};

export const getLooseDiamondsFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, looseDiamondUserList(req), "getLooseDiamondsFn");
};

export const getLooseDiamondDetailFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    looseDiamondDetailsForUser(req),
    "getLooseDiamondDetailFn"
  );
};

export const getAllMasterDataForLooseDiamondFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllMasterDataForLooseDiamond(req), "getAllMasterDataForLooseDiamondFn");
};

export const addLooseDiamondFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, addLooseDiamond(req), "addLooseDiamondFn");
};

export const updateLooseDiamondFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, updateLooseDiamond(req), "updateLooseDiamondFn");
};

export const statusUpdateLooseDiamondFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, statusUpdateLooseDiamond(req), "statusUpdateLooseDiamondFn");
};
