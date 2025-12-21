import { Request } from "express";
import { Sequelize, Op } from "sequelize";
import { IQueryPagination } from "../../../../../data/interfaces/common/common.interface";
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
import { GoldKarat } from "../../../../model/master/attributes/metal/gold-karat.model";
import { Image } from "../../../../model/image.model";
import dbContext from "../../../../../config/db-context";

export const addGoldKarat = async (req: Request) => {
  try {
    const { name, metal_master_id, calculate_rate } = req.body;
    const trn = await dbContext.transaction();
    try {
      const findName = await GoldKarat.findOne({
        where: [{ name: name }, { is_deleted: DeletedStatus.No },{}],
        transaction: trn,
      });
      if (findName && findName.dataValues) {
        await trn.rollback();
        return resErrorDataExit();
      }
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
        slug: `${createSlug(name)}K`,
        created_date: getLocalDate(),
        created_by: req.body.session_res.id_app_user,
        
        id_image: idImage,
        calculate_rate:
          calculate_rate &&
            calculate_rate != null &&
            calculate_rate != undefined
            ? calculate_rate / 100
            : name / 24,
        is_active: ActiveStatus.Active,
        id_metal: metal_master_id,
        is_deleted: DeletedStatus.No,
        is_config : DeletedStatus.No,
        is_band: DeletedStatus.No,
        is_three_stone : DeletedStatus.No,
        is_braclet : DeletedStatus.No,
        is_pendant : DeletedStatus.No,
        is_earring : DeletedStatus.No
      };

      const data = await GoldKarat.create(payload, { transaction: trn });
      await addActivityLogs([{
        old_data: null,
        new_data: {
          karat_id: data.dataValues.id, data: {
            ...data.dataValues
          }
        }
      }], data.dataValues.id, LogsActivityType.Add, LogsType.MetalKarat, req.body.session_res.id_app_user,trn)
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

export const getGoldKarat = async (req: Request) => {
  try {
    let pagination: IQueryPagination = {
      ...getInitialPaginationFromQuery(req.query),
    };

    let where = [
      { is_deleted: DeletedStatus.No },
      {  },
      {
        [Op.or]: [
          {
            slug: { [Op.iLike]: "%" + pagination.search_text + "%" },
          },
          Sequelize.where(
            Sequelize.literal(`CAST(name AS TEXT)`),
            "like",
            "%" + pagination.search_text.toLowerCase() + "%"
          ),
          Sequelize.where(
            Sequelize.literal(`CAST((calculate_rate * 100) AS TEXT)`),
            "like",
            "%" + pagination.search_text.toLowerCase() + "%"
          ),
        ],
        is_deleted: DeletedStatus.No,
      },
    ];

    const totalItems = await GoldKarat.count({
      where,
    });

    if (totalItems === 0) {
      return resSuccess({ data: { pagination, result: [] } });
    }
    pagination.total_items = totalItems;
    pagination.total_pages = Math.ceil(totalItems / pagination.per_page_rows);

    const result = await GoldKarat.findAll({
      where,
      limit: pagination.per_page_rows,
      offset: (pagination.current_page - 1) * pagination.per_page_rows,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "name",
        "slug",
        [Sequelize.literal("Image.image_path"), "image_path"],
        "created_date",
        "is_active",
        "created_by",
        "id_metal",
        "is_config",
        "is_band",
        "is_three_stone",
        "is_bracelet",
        "is_pendant",
        "is_earring",
        "calculate_rate",
      ],
      include: [{ model: Image, as: "image", attributes: [],where:{  },required:false }],
    });

    return resSuccess({ data: { pagination, result } });
  } catch (error) {
    throw error;
  }
};

export const getByIdGoldKarat = async (req: Request) => {
  try {
    const findKarat = await GoldKarat.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No, },
      attributes: [
        "id",
        "name",
        "slug",
        [Sequelize.literal("Image.image_path"), "image_path"],
        "created_date",
        "is_active",
        "created_by",
        "id_metal",
        "is_config",
        "is_band",
        "is_three_stone",
        "is_bracelet",
        "is_pendant",
        "is_earring",
        "calculate_rate",
      ],
      include: [{ model: Image, as: "image", attributes: [],where:{  },required:false}],
    });

    if (!(findKarat && findKarat.dataValues)) {
      return resNotFound();
    }

    return resSuccess({ data: findKarat });
  } catch (error) {
    throw error;
  }
};

export const updateGoldKarat = async (req: Request) => {
  try {
    const {
      name,
      metal_master_id,
      image_delete = "0",
      calculate_rate,
    } = req.body;
    const id = req.params.id;
    const findKarat = await GoldKarat.findOne({
      where: { id: id, is_deleted: DeletedStatus.No, },
    });
    if (!(findKarat && findKarat.dataValues)) {
      return resNotFound();
    }
    const findName = await GoldKarat.findOne({
      where: [
        { name: name },
        { id: { [Op.ne]: id } },
        { is_deleted: DeletedStatus.No },
        {  },
      ],
    });
    if (findName && findName.dataValues) {
      return resErrorDataExit();
    }
    const trn = await dbContext.transaction();
    try {
      let imageId = null;
      let findImage = null;
      if (findKarat.dataValues.id_image) {
        findImage = await Image.findOne({
          where: { id: findKarat.dataValues.id_image, },
          transaction: trn,
        });
      }
      if (req.file) {
        const imageData = await imageAddAndEditInDBAndS3(
          req.file,
          IMAGE_TYPE.goldKT,
          req.body.session_res.id_app_user,
          findImage,
          );

        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return imageData;
        }
        imageId = imageData.data;
      }
      const payload = {
        name: name,
        slug: `${createSlug(name)}K`,
        id_image:
          image_delete && image_delete === "1"
            ? null
            : imageId || findKarat.dataValues.id_image,
        id_metal: metal_master_id,
        calculate_rate:
          calculate_rate &&
            calculate_rate != null &&
            calculate_rate != undefined
            ? calculate_rate / 100
            : name / 24,
        modified_date: getLocalDate(),
        modified_by: req.body.session_res.id_app_user,
      }
      await GoldKarat.update(
        payload,
        {
          where: {
            id: findKarat.dataValues.id,
            is_deleted: DeletedStatus.No,
            
          },
          transaction: trn,
        }
      );

      if (image_delete && image_delete === "1" && findImage.dataValues) {
        await imageDeleteInDBAndS3(findImage);
      }

      const afterUpdateFindKarat = await GoldKarat.findOne({
        where: { id: id, is_deleted: DeletedStatus.No, },transaction:trn
      });
      await addActivityLogs([{
        old_data: { karat_id: findKarat.dataValues.id, data: {...findKarat.dataValues} },
        new_data: {
          karat_id: afterUpdateFindKarat.dataValues.id, data: { ...afterUpdateFindKarat.dataValues }
        }
      }], findKarat.dataValues.id, LogsActivityType.Edit, LogsType.MetalKarat, req.body.session_res.id_app_user,trn)
      trn.commit();
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

export const deleteGoldKarat = async (req: Request) => {
  try {
    const findKarat = await GoldKarat.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No, },
    });

    if (!(findKarat && findKarat.dataValues)) {
      return resNotFound();
    }
    await GoldKarat.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
        
      },
      { where: { id: findKarat.dataValues.id,  } }
    );
    await addActivityLogs([{
      old_data: { karat_id: findKarat.dataValues.id, data: {...findKarat.dataValues} },
      new_data: {
        karat_id: findKarat.dataValues.id, data: {
          ...findKarat.dataValues, is_deleted: DeletedStatus.yes,
          modified_by: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], findKarat.dataValues.id, LogsActivityType.Delete, LogsType.MetalKarat, req.body.session_res.id_app_user)
    await refreshAllMaterializedView(dbContext);
    return resSuccess({ message: RECORD_DELETE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const statusUpdateForGoldKarat = async (req: Request) => {
  try {
    const findKarat = await GoldKarat.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No, },
    });
    if (!(findKarat && findKarat.dataValues)) {
      return resNotFound();
    }
    await GoldKarat.update(
      {
        is_active: statusUpdateValue(findKarat),
        modified_date: getLocalDate(),
        modified_by: req.body.session_res.id_app_user,
      },
      { where: { id: findKarat.dataValues.id,       } }
    );
    await addActivityLogs([{
      old_data: { karat_id: findKarat.dataValues.id, data: {...findKarat.dataValues} },
      new_data: {
        karat_id: findKarat.dataValues.id, data: {
          ...findKarat.dataValues, is_active: statusUpdateValue(findKarat),
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        }
      }
    }], findKarat.dataValues.id, LogsActivityType.StatusUpdate, LogsType.MetalKarat, req.body.session_res.id_app_user)
    await refreshAllMaterializedView(dbContext);
    return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const goldKaratActiveList = async (req: Request) => {
  try {
    const karatList = await GoldKarat.findAll({
      where: {
        id_metal: req.params.metal_id,
        is_deleted: DeletedStatus.No,
        is_active: ActiveStatus.Active,
      },
      attributes: ["id", "name", "slug", "created_date"],
    });

    return resSuccess({ data: karatList });
  } catch (error) {
    throw error;
  }
};
