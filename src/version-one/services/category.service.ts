import { Request } from "express";
import { Op, Sequelize } from "sequelize";
import { moveFileToS3ByType } from "../../helpers/file.helper";
import {
  ActiveStatus,
  DeletedStatus,
  IMAGE_TYPE,
  LogsActivityType,
  LogsType,
  searchableCategory,
} from "../../utils/app-enumeration";
import {
  DEFAULT_STATUS_CODE_SUCCESS,
  Id_IS_REQUIRED,
  RECORD_UPDATE_SUCCESSFULLY,
} from "../../utils/app-messages";
import {
  addActivityLogs,
  columnValueLowerCase,
  getLocalDate,
  imageDeleteInDBAndS3,
  refreshMaterializedProductListView,
  resBadRequest,
  resErrorDataExit,
  resNotFound,
  resSuccess,
} from "../../utils/shared-functions";
import { CategoryData } from "../model/category.model";
import { Image } from "../model/image.model";
import dbContext from "../../config/db-context";

// export const addCategory = async (req: Request) => {
//     const {parent_id ,name, position, slug, created_by } = req.body
//     try {
//         const payload = {
//             parent_id: parent_id,
//             slug: slug,
//             category_name: name,
//             position: position,
//             created_date: getLocalDate(),
//             created_by: created_by,
//             is_searchable: searchableCategory.searchable,
//             is_active: ActiveStatus.Active,
//             is_deleted: DeletedStatus.No
//         }

//         const categoryNameExistes = await CategoryData.findOne({ where: { category_name: name, parent_id: { [Op.eq]: parent_id } } })

//         // const categoryNameExistes = await CategoryData.findOne({where: {[Op.and]: {slug: name, parent_id: parent_id} }})

//         if (categoryNameExistes === null) {
//             await CategoryData.create(payload)

//             return resSuccess({data: payload});
//         } else {
//             return resErrorDataExit();
//         }
//     } catch (error) {
//         console.log("error", error);

//         throw (error)
//     }
// }

export const addCategory = async (req: Request) => {
  try {
    const {
      parent_id,
      name,
      position,
      slug,
      is_setting_style,
      is_size,
      is_length,
      id_size,
      id_length,
    } = req.body;

    let imagePath = null;
    if (req.file) {
      const moveFileResult = await moveFileToS3ByType(
        req.file,
        IMAGE_TYPE.category,
      );

      if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return moveFileResult;
      }

      imagePath = moveFileResult.data;
    }

    const trn = await dbContext.transaction();

    try {
      let idImage = null;
      if (imagePath) {
        const imageResult = await Image.create(
          {
            image_path: imagePath,
            image_type: IMAGE_TYPE.category,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
          },
          { transaction: trn }
        );
        idImage = imageResult.dataValues.id;
      }
      const payload = {
        parent_id: parent_id,
        slug: slug,
        category_name: name,
        position: position,
        created_date: getLocalDate(),
        created_by: req.body.session_res.id_app_user,
        id_image: idImage,
        is_setting_style: is_setting_style,
        is_size: is_size,
        is_length: is_length,
        id_size: id_size && id_size.join("|"),
        id_length: id_length && id_length.join("|"),
        is_searchable: searchableCategory.searchable,
        is_active: ActiveStatus.Active,
        is_deleted: DeletedStatus.No,
      };

      const categoryNameExists = await CategoryData.findOne({
        where: {
          category_name: name,
          parent_id: { [Op.eq]: parent_id },
          is_deleted: DeletedStatus.No,
        },
      });
      const categorySlugExists = await CategoryData.findOne({
        where: [columnValueLowerCase("slug", slug), { is_deleted: DeletedStatus.No }],
      });

      if (categoryNameExists && categorySlugExists.dataValues) {
        await trn.rollback();
        return resErrorDataExit();
      }

      if (categorySlugExists && categorySlugExists.dataValues) {
        await trn.rollback();
        return resErrorDataExit();
      }

      const category = await CategoryData.create(payload, { transaction: trn });

      await addActivityLogs([{
        old_data: null,
        new_data: {
          category_id: category?.dataValues?.id, data: {
            ...category?.dataValues
          },
        }
      }], category?.dataValues?.id, LogsActivityType.Add, LogsType.Category, req?.body?.session_res?.id_app_user, trn)

      await trn.commit();
      // await refreshMaterializedProductListViewdbContext;
      return resSuccess({ data: payload });

    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (e) {
    throw e;
  }
};

export const getAllCategory = async (req: Request) => {
  try {
    let where = [{ is_deleted: DeletedStatus.No }];
    const totalItems = await CategoryData.count({
      where,
    });

    const result = await CategoryData.findAll({
      where,
      attributes: [
        "id",
        "parent_id",
        "category_name",
        "slug",
        "position",
        "is_setting_style",
        "is_size",
        "is_length",
        [
          Sequelize.literal(
            `CASE WHEN "id_size" IS NULL THEN '{}'::int[] ELSE string_to_array("id_size", '|')::int[] END`
          ),
          "id_size",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_length" IS NULL THEN '{}'::int[] ELSE string_to_array("id_length", '|')::int[] END`
          ),
          "id_length",
        ],
        [Sequelize.literal("image.image_path"), "image_path"],
        "is_searchable",
        "created_date",
        "is_active",
      ],
      include: [{ model: Image, as: "image", attributes: [], required: false }],
    });

    return resSuccess({ data: result });
  } catch (error) {
    throw error;
  }
};

export const getAllMainCategory = async (req: Request) => {
  try {
    const maincategoryList = await CategoryData.findAll({
      where: {
        parent_id: {
          [Op.eq]: null,
        },
        is_deleted: DeletedStatus.No,
      },
      attributes: [
        "id",
        "parent_id",
        "category_name",
        "slug",
        "position",
        "is_setting_style",
        "is_size",
        "is_length",
        [
          Sequelize.literal(
            `CASE WHEN "id_size" IS NULL THEN '{}'::int[] ELSE string_to_array("id_size", '|')::int[] END`
          ),
          "id_size",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "id_length" IS NULL THEN '{}'::int[] ELSE string_to_array("id_length", '|')::int[] END`
          ),
          "id_length",
        ],
        [Sequelize.literal("image.image_path"), "image_path"],
        "is_searchable",
        "created_date",
        "is_active",
      ],
      include: [{ model: Image, as: "image", attributes: [], required: false }],
    });

    return resSuccess({ data: maincategoryList });
  } catch (error) {
    throw error;
  }
};

export const getAllSubCategory = async (req: Request) => {
  try {
    if (req.body.parent_id != null) {
      const subCategoryList = await CategoryData.findAll({
        where: {
          parent_id: {
            [Op.eq]: req.body.parent_id,
          },
          is_active: ActiveStatus.Active,
          is_deleted: DeletedStatus.No,
        },
        attributes: [
          "id",
          "parent_id",
          "category_name",
          "slug",
          "position",
          "is_setting_style",
          "is_size",
          "is_length",
          [
            Sequelize.literal(
              `CASE WHEN "id_size" IS NULL THEN '{}'::int[] ELSE string_to_array("id_size", '|')::int[] END`
            ),
            "id_size",
          ],
          [
            Sequelize.literal(
              `CASE WHEN "id_length" IS NULL THEN '{}'::int[] ELSE string_to_array("id_length", '|')::int[] END`
            ),
            "id_length",
          ],
          [Sequelize.literal("image.image_path"), "image_path"],
          "is_searchable",
          "created_date",
          "is_active",
        ],
        include: [{ model: Image, as: "image", attributes: [], required: false }],
      });

      return resSuccess({ data: subCategoryList });
    } else {
      return resBadRequest({ message: Id_IS_REQUIRED });
    }
  } catch (error) {
    throw error;
  }
};

export const updateCategory = async (req: Request) => {
  const {
    id,
    name,
    parent_id,
    position,
    slug,
    updated_by,
    is_setting_style,
    is_size,
    is_length,
    id_size,
    id_length,
    image_delete = "0",
  } = req.body;
  try {
    const CategoryId = await CategoryData.findOne({
      where: { id: id, is_deleted: DeletedStatus.No },
    });

    if (CategoryId == null) {
      return resNotFound();
    }

    let id_image = null;
    let imagePath = null;

    if (req.file) {
      const moveFileResult = await moveFileToS3ByType(
        req.file,
        IMAGE_TYPE.category,
      );

      if (moveFileResult.code !== DEFAULT_STATUS_CODE_SUCCESS) {
        return moveFileResult;
      }

      imagePath = moveFileResult.data;
    }

    const trn = await dbContext.transaction();
    try {
      if (imagePath) {
        const imageResult = await Image.create(
          {
            image_path: imagePath,
            image_type: IMAGE_TYPE.category,
            created_by: req.body.session_res.id_app_user,
            created_date: getLocalDate(),
          },
          { transaction: trn }
        );

        id_image = imageResult.dataValues.id;
      }

      const categoryNameExistes = await CategoryData.findOne({
        where: {
          category_name: name,
          id: { [Op.ne]: id },
          parent_id: { [Op.eq]: parent_id },
          is_deleted: DeletedStatus.No,
        },
      });

      const categorySlugExistes = await CategoryData.findOne({
        where: [
          columnValueLowerCase("slug", slug),
          { id: { [Op.ne]: id } },
          { is_deleted: DeletedStatus.No },
        ],
      });

      if (categoryNameExistes && categoryNameExistes.dataValues) {
        await trn.rollback()
        return resErrorDataExit();
      }

      if (categorySlugExistes && categorySlugExistes.dataValues) {
        await trn.rollback()
        return resErrorDataExit();
      }

      const CategoryInfo = await CategoryData.update(
        {
          category_name: name,
          parent_id: parent_id,
          slug: slug,
          position: position,
          id_image: id_image ?? image_delete == "1" ? null : CategoryId.dataValues.id_image,
          is_setting_style: is_setting_style,
          is_size: is_size,
          is_length: is_length,
          id_size: id_size && id_size.join("|"),
          id_length: id_length && id_length.join("|"),
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        },

        { where: { id: id, is_deleted: DeletedStatus.No }, transaction: trn }
      );

      if (image_delete && image_delete == "1") {
        const findImage = await Image.findOne({
          where: { id: CategoryId.dataValues.id_image },
          transaction: trn,
        });
        await imageDeleteInDBAndS3(findImage);
      }

      if (CategoryInfo) {
        const CategoryInformation = await CategoryData.findOne({
          where: { id: id, is_deleted: DeletedStatus.No },
          transaction: trn,
        });

        await addActivityLogs([{
          old_data: { category_id: CategoryId?.dataValues?.id, data: {...CategoryId?.dataValues} },
          new_data: {
            category_id: CategoryInformation?.dataValues?.id, data: {...CategoryInformation?.dataValues }
          }
        }], CategoryId?.dataValues?.id, LogsActivityType.Edit, LogsType.Category, req?.body?.session_res?.id_app_user, trn)
        await trn.commit();
        return resSuccess({ data: CategoryInformation });
      }

      // await refreshMaterializedProductListViewdbContext
      return resSuccess();
    } catch (e) {
      await trn.rollback();
      console.log("e", e);
      throw e;
    }
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (req: Request) => {
  try {
    const CategoryExists = await CategoryData.findOne({
      where: { id: req.body.id, is_deleted: DeletedStatus.No },
    });


    if (!(CategoryExists && CategoryExists.dataValues)) {
      return resNotFound();
    }
    const ChieldCategoryExists = await CategoryData.findAll({
      where: { parent_id: req.body.id, is_deleted: DeletedStatus.No },
    });
    await CategoryData.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req?.body?.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: {
             id: CategoryExists.dataValues.id ,
        },
      }
    );

     await CategoryData.update(
      {
        is_deleted: DeletedStatus.yes,
        modified_by: req?.body?.id_app_user,
        modified_date: getLocalDate(),
      },
      {
        where: {
          parent_id: CategoryExists.dataValues.id ,
        },
      }
    );

    await addActivityLogs([{
      old_data: { category_id: CategoryExists?.dataValues?.id, data: {...CategoryExists?.dataValues} },
      new_data: {
        category_id: CategoryExists?.dataValues?.id, data: {
          ...CategoryExists?.dataValues, is_deleted: DeletedStatus.yes,
          modified_by: req?.body?.session_res?.id_app_user,
          modified_date: getLocalDate(),
        }, chieldData: ChieldCategoryExists.map((t: any) => t.dataValues)
      }
    }], CategoryExists?.dataValues?.id, LogsActivityType.Delete, LogsType.Category, req?.body?.session_res?.id_app_user)
    return resSuccess();
  } catch (error) {
    throw error;
  }
};

export const statusUpdateCategory = async (req: Request) => {
  try {

    const CategoryExists = await CategoryData.findOne({
      where: { id: req.body.id, is_deleted: DeletedStatus.No },
    });
    if (CategoryExists) {
      const CategoryActionInfo = await CategoryData.update(
        {
          is_active: req.body.is_active,
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        },
        { where: { id: CategoryExists.dataValues.id } }
      );
      if (CategoryActionInfo) {
        await addActivityLogs([{
          old_data: { category_id: CategoryExists?.dataValues?.id, data: {...CategoryExists?.dataValues} },
          new_data: {
            category_id: CategoryExists?.dataValues?.id, data: {
              ...CategoryExists?.dataValues, is_active: req?.body?.is_active,
              modified_date: getLocalDate(),
              modified_by: req?.body?.session_res?.id_app_user,
            }, section_type: CategoryExists?.dataValues?.section_type
          }
        }], CategoryExists?.dataValues?.id, LogsActivityType.StatusUpdate, LogsType.Category, req?.body?.session_res?.id_app_user)

        return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
      }
    } else {
      return resNotFound();
    }
  } catch (error) {
    throw error;
  }
};

export const searchablesCategory = async (req: Request) => {
  try {

    const CategoryExists = await CategoryData.findOne({
      where: { id: req.body.id },
    });
    if (CategoryExists) {
      const CategoryActionInfo = await CategoryData.update(
        {
          is_searchable: req.body.is_searchable,
          modified_date: getLocalDate(),
          modified_by: req.body.session_res.id_app_user,
        },
        { where: { id: CategoryExists.dataValues.id } }
      );
      if (CategoryActionInfo) {
        await addActivityLogs([{
          old_data: { category_id: CategoryExists?.dataValues?.id, data: {...CategoryExists?.dataValues} },
          new_data: {
            category_id: CategoryExists?.dataValues?.id, data: {
              ...CategoryExists?.dataValues, is_searchable: req.body.is_searchable,
              modified_date: getLocalDate(),
              modified_by: req?.body?.session_res?.id_app_user,
            }, section_type: CategoryExists?.dataValues?.section_type
          }
        }], CategoryExists?.dataValues?.id, LogsActivityType.Edit, LogsType.Category, req?.body?.session_res?.id_app_user)

        return resSuccess({ message: RECORD_UPDATE_SUCCESSFULLY });
      }
    } else {
      return resNotFound();
    }
  } catch (error) {
    throw error;
  }
};
