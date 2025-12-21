import { RequestHandler } from "express";
import { callServiceMethod } from "./base.controller";
import {
  dynamicProductExport,
  variantProductExport,
} from "../services/excel-export.service";

export const dynamicProductExportFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    dynamicProductExport(req),
    "dynamicProductExportFn"
  );
};

export const variantProductExportFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    variantProductExport(req),
    "variantProductExportFn"
  );
};