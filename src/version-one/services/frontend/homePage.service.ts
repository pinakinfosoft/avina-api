import { Request } from "express";
import { Op, QueryTypes, Sequelize } from "sequelize";
import {
  ActiveStatus,
  BANNER_TYPE,
  DeletedStatus,
  TEMPLATE_2_BANNER_TYPE,
  TemplateFiveSectionType,
  TemplateThreeSectionType,
} from "../../../utils/app-enumeration";
import { resSuccess } from "../../../utils/shared-functions";
import { DEFAULT_STATUS_CODE_SUCCESS } from "../../../utils/app-messages";
import { Image } from "../../model/image.model";
import { HomeAboutMain } from "../../model/home-about/home-about-main.model";
import { HomeAboutSub } from "../../model/home-about/home-about-sub.model";
import { OurStory } from "../../model/our-stories.model";
import { CategoryData } from "../../model/category.model";
import { Collection } from "../../model/master/attributes/collection.model";
import dbContext from "../../../config/db-context";

export const getAllHomeAndAboutSection = async (req: Request) => {
  try {
   
    let where = [{ is_deleted: DeletedStatus.No }, { is_active: ActiveStatus.Active }];
    const mainContentData = await HomeAboutMain.findAll({
      attributes: ["id", "sort_title", "title", "content", "created_date"],
      where,
    });
    const totalItems = await HomeAboutSub.count({
      where,
    });
    const result = await HomeAboutSub.findAll({
      where,
      order: [["sort_order", "ASC"]],
      attributes: [
        "id",
        "title",
        "content",
        "target_link",
        "button_name",
        "created_date",
        "sort_order",
        "title_color",
        "description_color",
        [Sequelize.literal("image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "image", attributes: [] }],
    });
    return resSuccess({ data: { mainContentData, totalItems, result } });
  } catch (error) {
    throw error;
  }
};

export const getAllOurStoryList = async (req: Request) => {
  try {
    let where = [{ is_deleted: DeletedStatus.No }, { is_active: ActiveStatus.Active }];
    const totalItems = await OurStory.count({
      where,
    });
    const result = await OurStory.findAll({
      where,
      attributes: [
        "id",
        "title",
        "created_date",
        "content",
        [Sequelize.literal("image.image_path"), "image_path"],
      ],
      include: [{ model: Image, as: "image", attributes: [] }],
    });
    return resSuccess({ data: { totalItems, result } });
  } catch (error) {
    throw error;
  }
};