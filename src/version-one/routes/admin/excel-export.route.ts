import { Router } from "express";
import {
  dynamicProductExportFn,
  variantProductExportFn,
} from "../../controllers/excel-export.controller";
import { authorization } from "../../../middlewares/authenticate";

export default (app: Router) => {
  app.get("/excel/dynamic-products",[authorization], dynamicProductExportFn);
  app.get("/excel/variant-products", [authorization], variantProductExportFn);

};

