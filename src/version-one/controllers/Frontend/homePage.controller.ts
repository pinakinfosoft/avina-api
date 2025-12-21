import { RequestHandler } from "express";
import {
  getAllOurStoryList,

  getAllHomeAndAboutSection,

} from "../../services/frontend/homePage.service";
import { callServiceMethod } from "../base.controller";


export const getAllHomeAndAboutSectionFn: RequestHandler = (req, res) => {
  callServiceMethod(
    req,
    res,
    getAllHomeAndAboutSection(req),
    "getAllHomeAndAboutSectionFn"
  );
};


export const getAllOurStoryListFn: RequestHandler = (req, res) => {
  callServiceMethod(req, res, getAllOurStoryList(req), "getAll3OurStoryListFn");
};