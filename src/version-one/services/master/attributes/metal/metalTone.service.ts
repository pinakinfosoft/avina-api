import { Request } from "express";
import { Sequelize, Op } from "sequelize";
import {
  ActiveStatus,
  DeletedStatus,
  IMAGE_TYPE,
  LogsActivityType,
  LogsType,
} from "../../../../../utils/app-enumeration";
import {
  DEFAULT_STATUS_CODE_SUCCESS,
  RECORD_DELETE_SUCCESSFULLY,
  RECORD_UPDATE_SUCCESSFULLY,
} from "../../../../../utils/app-messages";
import {
  addActivityLogs,
  columnValueLowerCase,
  createSlug,
  getCompanyIdBasedOnTheCompanyKey,
  getInitialPaginationFromQuery,
  getLocalDate,
  imageAddAndEditInDBAndS3,
  imageDeleteInDBAndS3,
  refreshAllMaterializedView,
  resErrorDataExit,
  resNotFound,
  resSuccess,
  statusUpdateValue,
} from "../../../../../utils/shared-functions";
import { MetalTone } from "../../../../model/master/attributes/metal/metalTone.model";
import { Image } from "../../../../model/image.model";
import dbContext from "../../../../../config/db-context";

export const addMetalTone = async (req: Request) => {
  try {
    const { name, sort_code, metal_master_id } = req.body;
    const slug = createSlug(name);
    const findName = await MetalTone.findOne({
      where: [
        columnValueLowerCase("name", name),
        { is_deleted: DeletedStatus.No },
        
      ],
    });

    const findSortCode = await MetalTone.findOne({
      where: [
        columnValueLowerCase("sort_code", sort_code),
        { is_deleted: DeletedStatus.No },
        
      ],
    });

    if (
      findName &&
      findName.dataValues &&
      findSortCode &&
      findSortCode.dataValues
    ) {
      return resErrorDataExit();
    }

    const trn = await dbContext.transaction();
    try {
      let idImage = null;
      if (req.file) {
        const addImage: any = await imageAddAndEditInDBAndS3(
          req.file,
          IMAGE_TYPE.goldKT,
          req.body.session_res.id_app_user,
          "",
        );
        if (addImage.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          trn.rollback();
          return addImage;
        }
        idImage = addImage.data;
      }
      const payload = {
        name: name,
        slug: slug,
        sort_code: sort_code,
        created_date: getLocalDate(),
        created_by: req.body.session_res.id_app_user,
        
        id_metal: metal_master_id,
        id_image: idImage,
        is_active: ActiveStatus.Active,
        is_deleted: DeletedStatus.No,
      };
      const metalToneData = await MetalTone.create(payload, { transaction: trn });

      await addActivityLogs([{
              old_data: null,
              new_data: {
                metal_tone_id: metalToneData?.dataValues?.id, data: {
                  ...metalToneData?.dataValues
                }
              }
            }], metalToneData?.dataValues?.id, LogsActivityType.Add, LogsType.MetalTone, req?.body?.session_res?.id_app_user,trn)
            

      await trn.commit();
      await refreshAllMaterializedView(dbContext);
      return resSuccess({ data: payload });
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (e) {
    throw e;
  }
};

export const getMetalTones = async (req: Request) => {
  try {
    let paginationProps = {};

    let pagination = {
      ...getInitialPaginationFromQuery(req.query),
      search_text: req.query.search_text,
    };
    let noPagination = req.query.no_pagination === "1";

    let where = [
      { is_deleted: DeletedStatus.No },
      
      pagination.is_active ? { is_active: pagination.is_active } : 
      pagination.search_text
        ? {
            [Op.or]: [
              { name: { [Op.iLike]: "%" + pagination.search_text + "%" } },
              { slug: { [Op.iLike]: "%" + pagination.search_text + "%" } },
            ],
          }
        : {},
    ];

    if (!noPagination) {
      const totalItems = await MetalTone.count({
        where,
      });

      if (totalItems === 0) {
        return resSuccess({ data: { pagination, result: [] } });
      }
      pagination.total_items = totalItems;
      pagination.total_pages = Math.ceil(totalItems / pagination.per_page_rows);

      paginationProps = {
        limit: pagination.per_page_rows,
        offset: (pagination.current_page - 1) * pagination.per_page_rows,
      };
    }

    const result = await MetalTone.findAll({
      ...paginationProps,
      where,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
        "created_date",
        "id_metal",
        "is_active",
        "created_by",
        "is_config",
        "is_band",
        "is_three_stone",
        "is_bracelet",
        "is_pendant",
        "is_earring",
      ],
      include: [{ model: Image, as: "metal_tone_image", attributes: [], required:false }],
    });

    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (error) {
    throw error;
  }
};

export const getByIdMetalTone = async (req: Request) => {
  try {
    const findMetalTone = await MetalTone.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No, },
      attributes: [
        "id",
        "name",
        "slug",
        "id_metal",
        "sort_code",
        [Sequelize.literal("metal_tone_image.image_path"), "image_path"],
        "created_date",
        "is_active",
        "created_by",
        "is_config",
        "is_band",
        "is_three_stone",
        "is_bracelet",
        "is_pendant",
        "is_earring",
      ],
      include: [{ model: Image, as: "metal_tone_image", attributes: [],required:false }],
    });

    if (!(findMetalTone && findMetalTone.dataValues)) {
      return resNotFound();
    }

    return resSuccess({ data: findMetalTone });
  } catch (error) {
    throw error;
  }
};

export const updateMetalTone = async (req: Request) => {
  try {
    const { name, sort_code, metal_master_id, image_delete = "0" } = req.body;
    const id = req.params.id;
    const slug = createSlug(name);
    const findMetalTone = await MetalTone.findOne({
      where: { id: id, is_deleted: DeletedStatus.No, },
    });
    if (!(findMetalTone && findMetalTone.dataValues)) {
      return resNotFound();
    }
    const findName = await MetalTone.findOne({
      where: [
        columnValueLowerCase("name", name),
        { id: { [Op.ne]: id } },
        { is_deleted: DeletedStatus.No },
        
      ],
    });

    const findSortCode = await MetalTone.findOne({
      where: [
        columnValueLowerCase("sort_code", sort_code),
        { id: { [Op.ne]: id } },
        { is_deleted: DeletedStatus.No },
        
      ],
    });

    if (
      findName &&
      findName.dataValues &&
      findSortCode &&
      findSortCode.dataValues
    ) {
      return resErrorDataExit();
    }
    const trn = await dbContext.transaction();
    try {
      let imageId = null;
      let findImage = null;
      if (findMetalTone.dataValues.id_image) {
        findImage = await Image.findOne({
          where: { id: findMetalTone.dataValues.id_image, },
          transaction: trn,
        });
      }
      if (req.file) {
        const imageData = await imageAddAndEditInDBAndS3(
          req.file,
          IMAGE_TYPE.metalTone,
          req.body.session_res.id_app_user,
          findImage,
        );

        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return imageData;
        }
        imageId = imageData.data;
      }
      await MetalTone.update(
        {
          name: name,
          slug: slug,
          sort_code: sort_code,
          id_image:
            image_delete && image_delete === "1"
              ? null
              : imageId || findMetalTone.dataValues.id_image,
          id_metal: metal_master_id,
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        },
        {
          where: { id: id, is_deleted: DeletedStatus.No, },
          transaction: trn,
        }
      );
      if (image_delete && image_delete === "1" && findImage.dataValues) {
        await imageDeleteInDBAndS3(findImage);
      }

      const afterUpdatefindMetalTone = await MetalTone.findOne({
        where: { id: id, is_deleted: DeletedStatus.No  },transaction: trn
      });

      await addActivityLogs([{
        old_data: { metal_tone_id: findMetalTone?.dataValues?.id, data: {...findMetalTone?.dataValues} },
        new_data: {
          metal_tone_id: afterUpdatefindMetalTone?.dataValues?.id, data: { ...afterUpdatefindMetalTone?.dataValues }
        }
      }], findMetalTone?.dataValues?.id, LogsActivityType.Edit, LogsType.MetalTone, req?.body?.session_res?.id_app_user,trn)
      
      await trn.commit();
      await refreshAllMaterializedView(dbContext);
      return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
    } catch (e) {
      await trn.rollback();

      throw e;
    }
  } catch (error) {
    throw error;
  }
};

export const deleteMetalTone = async (req: Request) => {
  try {
    const findMetalTone = await MetalTone.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No ,},
    });

    if (!(findMetalTone && findMetalTone.dataValues)) {
      return resNotFound();
    }
    await MetalTone.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: findMetalTone.dataValues.id, } }
    );
    await refreshAllMaterializedView(dbContext);
    await addActivityLogs([{
      old_data: { metal_tone_id: findMetalTone?.dataValues?.id, data: {...findMetalTone?.dataValues} },
      new_data: {
        metal_tone_id: findMetalTone?.dataValues?.id, data: {
          ...findMetalTone?.dataValues, is_deleted: DeletedStatus.yes,
          modified_by: req?.body?.session_res?.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], findMetalTone?.dataValues?.id, LogsActivityType.Delete, LogsType.MetalTone, req?.body?.session_res?.id_app_user)

    return resSuccess({ message: RECORD_DELETE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const statusUpdateForMetalTone = async (req: Request) => {
  try {
    const findMetalTone = await MetalTone.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No, },
    });
    if (!(findMetalTone && findMetalTone.dataValues)) {
      return resNotFound();
    }
    await MetalTone.update(
      {
        is_active: statusUpdateValue(findMetalTone),
        modified_date: getLocalDate(),
        modified_by: req.body.session_res.id_app_user,
      },
      { where: { id: findMetalTone.dataValues.id, } }
    );

    await addActivityLogs([{
      old_data: { metal_tone_id: findMetalTone?.dataValues?.id, data: {...findMetalTone?.dataValues} },
      new_data: {
        metal_tone_id: findMetalTone?.dataValues?.id, data: {
          ...findMetalTone?.dataValues, is_active:  statusUpdateValue(findMetalTone),
          modified_date: getLocalDate(),
          modified_by: req?.body?.session_res?.id_app_user,
        }
      }
    }], findMetalTone?.dataValues?.id, LogsActivityType.StatusUpdate, LogsType.MetalTone, req?.body?.session_res?.id_app_user)


    await refreshAllMaterializedView(dbContext);
    return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const metalToneActiveList = async (req: Request) => {
  try {
   
    const metalData = await MetalTone.findAll({
      where: {
        id_metal: req.params.metal_id,
        is_deleted: DeletedStatus.No,
        is_active: ActiveStatus.Active,
      },
      attributes: ["id", "name", "slug", "created_date"],
    });

    return resSuccess({ data: metalData });
  } catch (error) {
    throw error;
  }
};
