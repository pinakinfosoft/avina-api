import { Request } from "express";
import { Sequelize, Op } from "sequelize";
import {
  ActiveStatus,
  DeletedStatus,
  IMAGE_TYPE,
  IS_DIAMOND_TYPE,
  LogsActivityType,
  LogsType,
  Pagination,
} from "../../../../utils/app-enumeration";
import {
  DEFAULT_STATUS_CODE_SUCCESS,
  DIAMOND_TYPE_ALREADY_EXITS,
  RECORD_DELETE_SUCCESSFULLY,
  RECORD_UPDATE_SUCCESSFULLY,
} from "../../../../utils/app-messages";
import {
  addActivityLogs,
  columnValueLowerCase,
  createSlug,
  getCompanyIdBasedOnTheCompanyKey,
  getInitialPaginationFromQuery,
  getLocalDate,
  imageAddAndEditInDBAndS3,
  imageDeleteInDBAndS3,
  resErrorDataExit,
  resNotFound,
  resSuccess,
  statusUpdateValue,
} from "../../../../utils/shared-functions";
import { StoneData } from "../../../model/master/attributes/gemstones.model";
import { Image } from "../../../model/image.model";
import dbContext from "../../../../config/db-context";

export const addStone = async (req: Request) => {
  try {
    const { name, sort_code, is_diamond } = req.body;
    const slug = createSlug(name);
    if (IS_DIAMOND_TYPE.Diamond == is_diamond) {
      const isDiamondFind = await StoneData.findAll({
        where: { is_diamond: is_diamond, is_deleted: DeletedStatus.No, },
      });

      if (isDiamondFind && isDiamondFind.length >= 1) {
        return resErrorDataExit({ message: DIAMOND_TYPE_ALREADY_EXITS });
      }
    }

    const findName = await StoneData.findOne({
      where: [
        columnValueLowerCase("name", name),
        { is_deleted: DeletedStatus.No },
        
      ],
    });

    const findSortCode = await StoneData.findOne({
      where: [
        columnValueLowerCase("sort_code", sort_code),
        { is_deleted: DeletedStatus.No },
        
      ],
    });

    if (
      (findName && findName.dataValues) ||
      (findSortCode && findSortCode.dataValues)
    ) {
      return resErrorDataExit();
    }

    const trn = await dbContext.transaction();

    try {
      let idImage = null;
      if (req.file) {
        const imageData = await imageAddAndEditInDBAndS3(
          req.file,
          IMAGE_TYPE.gemstones,
          req.body.session_res.id_app_user,
          ""
        );
        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          console.log("----------------", imageData)
          trn.rollback();
          return imageData;
        }
        idImage = imageData.data;
      }
      const payload = {
        name: name,
        slug: slug,
        sort_code: sort_code,
        created_date: getLocalDate(),
        created_by: req.body.session_res.id_app_user,
        
        id_image: idImage,
        is_active: ActiveStatus.Active,
        is_deleted: DeletedStatus.No,
        is_diamond: is_diamond,
      };

      const stoneData = await StoneData.create(payload, { transaction: trn });
      await addActivityLogs([{
        old_data: null,
        new_data: {
          gem_stone_id: stoneData?.dataValues?.id, data: {
            ...stoneData?.dataValues
          }
        }
      }], stoneData?.dataValues?.id, LogsActivityType.Add, LogsType.Gemstone, req?.body?.session_res?.id_app_user,trn)

      await trn.commit();
      return resSuccess({ data: payload });
    } catch (e) {
    console.log("----------------------------", e)

      await trn.rollback();
      throw e;
    }
  } catch (e) {
    throw e;
  }
};

export const getStones = async (req: Request) => {
  try {

    let paginationProps = {};

    let pagination = {
      ...getInitialPaginationFromQuery(req.query),
      search_text: req.query.search_text,
    };
    let noPagination = req.query.no_pagination === Pagination.no;

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
        : {}
    ];

    if (!noPagination) {
      const totalItems = await StoneData.count({
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

    const result = await StoneData.findAll({
      ...paginationProps,
      where,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "name",
        "sort_code",
        "slug",
        "is_diamond",
        "gemstone_type",
        [Sequelize.literal("stone_image.image_path"), "image_path"],
        "is_active",
      ],
      include: [{ model: Image, as: "stone_image", attributes: [] }],
    });

    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (error) {
    throw error;
  }
};

export const getByIdStone = async (req: Request) => {
  try {

    const GemstonesInfo = await StoneData.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No ,},
      attributes: [
        "id",
        "name",
        "slug",
        "sort_code",
        "is_diamond",
        "gemstone_type",
        [Sequelize.literal("stone_image.image_path"), "image_path"],
        "created_date",
        "is_active",
        "created_by",
      ],
      include: [{ model: Image, as: "stone_image", attributes: [] ,required:false}],
    });

    if (!(GemstonesInfo && GemstonesInfo.dataValues)) {
      return resNotFound();
    }

    return resSuccess({ data: GemstonesInfo });
  } catch (error) {
    throw error;
  }
};

export const updateStone = async (req: Request) => {
  try {

    const { name, sort_code, is_diamond, image_delete = "0" } = req.body;
    const id = req.params.id;
    const slug = createSlug(name);

    const findStone = await StoneData.findOne({
      where: { id: id, is_deleted: DeletedStatus.No, },
    });
    if (!(findStone && findStone.dataValues)) {
      return resNotFound();
    }

    if (IS_DIAMOND_TYPE.Diamond == is_diamond) {
      const findDiamondType = await StoneData.findAll({
        where: {
          is_diamond: is_diamond,
          id: { [Op.ne]: id },
          is_deleted: DeletedStatus.No,
          
        },
      });

      if (findDiamondType && findDiamondType.length >= 1) {
        return resErrorDataExit({ message: DIAMOND_TYPE_ALREADY_EXITS });
      }
    }
    const findName = await StoneData.findOne({
      where: [
        columnValueLowerCase("name", name),
        { id: { [Op.ne]: id } },
        { is_deleted: DeletedStatus.No },
        
      ],
    });

    const findSortCode = await StoneData.findOne({
      where: [
        columnValueLowerCase("sort_code", sort_code),
        { id: { [Op.ne]: id } },
        { is_deleted: DeletedStatus.No },
        
      ],
    });
    if (
      (findName && findName.dataValues) ||
      (findSortCode && findSortCode.dataValues)
    ) {
      return resErrorDataExit();
    }

    const trn = await dbContext.transaction();
    try {
      let imageId = null;
      let findImage = null;
      if (findStone.dataValues.id_image) {
        findImage = await Image.findOne({
          where: { id: findStone.dataValues.id_image, },
          transaction: trn,
        });
      }
      if (req.file) {
        const imageData = await imageAddAndEditInDBAndS3(
          req.file,
          IMAGE_TYPE.gemstones,
          req.body.session_res.id_app_user,
          findImage,
        );

        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          await trn.rollback();
          return imageData;
        }
        imageId = imageData.data;
      }

      const gemstonesInfo = await StoneData.update(
        {
          name: name,
          slug: slug,
          sort_code: sort_code,
          id_image:
            image_delete && image_delete === "1"
              ? null
              : imageId || findStone.dataValues.id_image,
          is_diamond: is_diamond,
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        },

        {
          where: { id: id, is_deleted: DeletedStatus.No , },
          transaction: trn,
        }
      );
      if (image_delete && image_delete === "1" && findImage.dataValues) {
        await imageDeleteInDBAndS3(findImage);
      }

      const afterUpdatefindStone = await StoneData.findOne({
        where: { id: id, is_deleted: DeletedStatus.No }, transaction: trn
      },);

      await addActivityLogs([{
        old_data: { gem_stone_id: afterUpdatefindStone?.dataValues?.id, data: {...afterUpdatefindStone?.dataValues} },
        new_data: {
          gem_stone_id: afterUpdatefindStone?.dataValues?.id, data: {...afterUpdatefindStone?.dataValues }
        }
      }], afterUpdatefindStone?.dataValues?.id, LogsActivityType.Edit, LogsType.Gemstone, req?.body?.session_res?.id_app_user,trn)
      

      await trn.commit();
      return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
    } catch (e) {
      await trn.rollback();

      throw e;
    }
  } catch (error) {
    throw error;
  }
};

export const deleteStone = async (req: Request) => {
  try {
    const findStone = await StoneData.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No ,},
    });

    if (!(findStone && findStone.dataValues)) {
      return resNotFound();
    }
    await StoneData.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: findStone.dataValues.id ,} }
    );
    await addActivityLogs([{
      old_data: { gem_stone_id: findStone?.dataValues?.id, data: {...findStone?.dataValues} },
      new_data: {
        gem_stone_id: findStone?.dataValues?.id, data: {
          ...findStone?.dataValues, is_deleted: DeletedStatus.yes,
          modified_by: req?.body?.session_res?.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], findStone?.dataValues?.id, LogsActivityType.Delete, LogsType.Gemstone, req?.body?.session_res?.id_app_user)

    return resSuccess({ message: RECORD_DELETE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const statusUpdateForStone = async (req: Request) => {
  try {
    const findStone = await StoneData.findOne({
      where: { id: req.params.id, is_deleted: DeletedStatus.No, },
    });
    if (!(findStone && findStone.dataValues)) {
      return resNotFound();
    }
    await StoneData.update(
      {
        is_active: statusUpdateValue(findStone),
        modified_date: getLocalDate(),
        modified_by: req.body.session_res.id_app_user,
      },
      { where: { id: findStone.dataValues.id, } }
    );
    await addActivityLogs([{
      old_data: { gem_stone_id: findStone?.dataValues?.id, data: {...findStone?.dataValues} },
      new_data: {
        gem_stone_id: findStone?.dataValues?.id, data: {
          ...findStone?.dataValues, is_active: statusUpdateValue(findStone),
          modified_date: getLocalDate(),
          modified_by: req?.body?.session_res?.id_app_user,
        }
      }
    }], findStone?.dataValues?.id, LogsActivityType.StatusUpdate, LogsType.Gemstone, req?.body?.session_res?.id_app_user)

    
    return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
  } catch (error) {
    throw error;
  }
};

export const getStoneListAPI = async (req:any) => {
  try {
    
    const stoneList = await StoneData.findAll({
      where: { is_deleted: DeletedStatus.No, is_active: ActiveStatus.Active },
      attributes: ["id", "name", "slug", "sort_code"],
    });

    return resSuccess({ data: stoneList });
  } catch (error) {
    throw error;
  }
};
