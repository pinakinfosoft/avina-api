import { Router } from "express";
import {
 
  getAllHomeAndAboutSectionFn,
} from "../../../controllers/Frontend/homePage.controller";

export default (app: Router) => {
 
  app.get("/homeAndAbout/section", getAllHomeAndAboutSectionFn);
  
};
