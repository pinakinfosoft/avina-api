import { Request } from "express";
import { Model, Op, Sequelize, Transaction } from "sequelize";
import { IRolePermissionAccess } from "../../data/interfaces/common/common.interface";
import {
  ACCESS_NOT_FOUND,
  DEFAULT_STATUS_CODE_SUCCESS,
  MENU_ITEM_NOT_FOUND,
  ROLE_NOT_FOUND,
  ROLE_WITH_SAME_NAME_AVAILABLE,
  USER_WITH_ROLE_AVAILABLE,
} from "../../utils/app-messages";
import {
  addActivityLogs,
  decryptRequestData,
  getInitialPaginationFromQuery,
  getLocalDate,
  prepareMessageFromParams,
  resNotFound,
  resSuccess,
  resUnauthorizedAccess,
  resUnknownError,
  resUnprocessableEntity,
} from "../../utils/shared-functions";
import {
  AccessRolePermission,
  ActiveStatus,
  DeletedStatus,
  LogsActivityType,
  LogsType,
  SYSTEM_CONFIGURATIONS_KEYS,
  ThemeSectionType,
  USER_TYPE,
} from "../../utils/app-enumeration";
import { fetchConfigurationByKey } from "./auth.service";
import { APP_KEY, APP_MENU, SUPER_ADMIN_CREATED_ROLES_COMPANY_KEY, TEMPLATE_MENU, THEME_SECTION_TYPE_LIST } from "../../utils/app-constants";
import { AppUser } from "../model/app-user.model";
import { Role } from "../model/role.model";
import { BusinessUser } from "../model/business-user.model";
import { CustomerUser } from "../model/customer-user.model";
import { Image } from "../model/image.model";
import { Action } from "../model/action.model";
import { MenuItem } from "../model/menu-items.model";
import { RolePermission } from "../model/role-permission.model";
import { RolePermissionAccess } from "../model/role-permission-access.model";
import { CompanyInfo } from "../model/companyinfo.model";
import { RolePermissionAccessAuditLog } from "../model/role-permission-access-audit-log.model";
import dbContext from "../../config/db-context";

export const getAllRoles = async (req: Request) => {
  try {
    let paginationProps = {};
    let pagination = getInitialPaginationFromQuery(req.query);
    const updateRoleserdata =  await AppUser.findOne({where:{id:req?.body?.session_res?.id_app_user}});

    if(!updateRoleserdata){
      return resNotFound();
    }


    let where = [
      {is_deleted:DeletedStatus.No, id: { [Op.ne]: 0 } },
      pagination.is_active ? { is_active: pagination.is_active } : {}
    ];
    let noPagination = req.query.no_pagination === "1";
    if (!noPagination) {
      const totalItems = await Role.count({
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

    /*
      Role Access Logic:

      Each role has two flags:
        - is_super_admin: true or false
        - is_sub_admin: true or false

      When a user logs in:

      1. If the **logged-in user is a Super Admin** (i.e., is_super_admin === true):
        - They can view:
          a) All roles where is_super_admin === true (global roles).
          b) Roles belonging to their specific client where:
              - is_sub_admin === true
              - OR both is_super_admin and is_sub_admin are false (regular roles).

      2. If the **logged-in user is NOT a Super Admin** (i.e., is_super_admin === false):
        - They can view:
          - Only roles for their specific client where both:
            - is_super_admin === false
            - AND is_sub_admin === false
          (i.e., regular client roles only, no global or sub-admin roles).
    */

    let result = await Role.findAll({
      ...paginationProps,
      where,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "role_name",
        "is_active",
        "is_super_admin",
        "is_sub_admin",
         [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM app_users AS u
            WHERE u.id_role = roles.id
              AND u.is_deleted = '${DeletedStatus.No}'
          )`),
          "user_count",
        ],
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM app_users AS u
            LEFT JOIN app_users AS creator ON u.created_by = creator.id
            WHERE u.id_role = roles.id
              AND u.is_deleted = '${DeletedStatus.No}'
              AND u.is_active = '${ActiveStatus.Active}'
          )`),
          "active_user_count",
        ],
        [
          Sequelize.literal(`(
            SELECT username 
            FROM app_users 
            WHERE app_users.id = roles.created_by
          )`),
          "created_by_username"
        ]
      ],
      include: {
        required:false,
        model: AppUser,
        as: "role_app_user",
        where: [],
        attributes: [
          "id",
          [
            Sequelize.literal(
              `CASE 
                WHEN "role_app_user->business_users->image"."image_path" IS NOT NULL
                  THEN "role_app_user->business_users->image"."image_path" 
                  ELSE "role_app_user->customer_user->image"."image_path" 
                END`
            ),
            "image_path",
          ],
        ],
        include: [
          {
            required:false,
            model: BusinessUser,
            as:'business_users',
            attributes: [],
            include: [
              {
                required:false,
                model: Image,
                as: "image",
                attributes: [],
              },
            ],
          },
          {
            required:false,
            model: CustomerUser,
            as: "customer_user",
            attributes: [],
            include: [
              {
                required:false,
                model: Image,
                as: "image",
                attributes: [],
              },
            ],
          },
        ],
      },
    });

    result = result.map((role:any) => {
      let data = { ...role.dataValues, app_user: role.dataValues.role_app_user };
      delete data.role_app_user;
      return data
    })
    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (e) {
    throw e;
  }
};

const roleWithSameNameValidation = async (
  role_name: string,
  id: number | null = null,
) => {
  const findRoleWithSameName = await Role.findOne({
    where: [
      { role_name: { [Op.iLike]: role_name },is_deleted:DeletedStatus.No},
      id ? { id: { [Op.ne]: id } } :  {}
    ],
  });
  if (findRoleWithSameName && findRoleWithSameName.dataValues) {
    return resUnprocessableEntity({
      message: prepareMessageFromParams(ROLE_WITH_SAME_NAME_AVAILABLE, [
        ["action", id ? "updated" : "added"],
      ]),
    });
  }

  return resSuccess();
};

export const addRole = async (req: Request) => {
  try {
    const nameValidaton = await roleWithSameNameValidation(req.body.role_name,null);
    if (nameValidaton.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return nameValidaton;
    }

    const RoleData = await Role.create({
      role_name: req.body.role_name,
      is_active: req.body.is_active,
      created_by: req.body.session_res.id_app_user,
      
      created_date: getLocalDate(),
    });

    await addActivityLogs([{
      old_data: null,
      new_data: {
        role_id: RoleData?.dataValues?.id, data: {
          ...RoleData?.dataValues
        }
      }
    }], RoleData?.dataValues?.id, LogsActivityType.Add, LogsType.Role, req?.body?.session_res?.id_app_user)
  
    return resSuccess();
  } catch (e) {
    throw e;
  }
};

export const updateRole = async (req: Request) => {
  try {
    const idRole = parseInt(req.params.id);

    const updateRoleserdata =  await AppUser.findOne({where:{id:req?.body?.session_res?.id_app_user}});

    if(!updateRoleserdata){
      return resNotFound();
    }

    const roleToUpdate = await Role.findOne({
      where: { id: idRole,is_deleted:DeletedStatus.No },
    });

    if (!(roleToUpdate && roleToUpdate.dataValues)) {
      return resNotFound({ message: ROLE_NOT_FOUND });
    }

    if (req.body.only_active_inactive === "1") {
      await Role.update(
        {
          is_active: req.body.is_active,
          modified_by: req.body.session_res.id_app_user,
          modified_date: getLocalDate(),
        },
        { where: { id: roleToUpdate.dataValues.id } }
      );
      await addActivityLogs([{
        old_data: { role_id: roleToUpdate?.dataValues?.id, data: roleToUpdate?.dataValues},
        new_data: {
          role_id: roleToUpdate?.dataValues?.id, data: {
            ...roleToUpdate?.dataValues, is_active: req.body.is_active,
            modified_date: getLocalDate(),
            modified_by: req?.body?.session_res?.id_app_user,
          }
        }
      }], roleToUpdate?.dataValues?.id, LogsActivityType.StatusUpdate, LogsType.Role, req?.body?.session_res?.id_app_user)
    
      return resSuccess();
    }

    const nameValidaton = await roleWithSameNameValidation(
      req.body.role_name,
      idRole,
    );
    if (nameValidaton.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return nameValidaton;
    }

    await Role.update(
      {
        role_name: req.body.role_name,
        is_active: req.body.is_active,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: roleToUpdate.dataValues.id, } }
    );

    const afterUpdateRoleToUpdate = await Role.findOne({
      where: { id: idRole,is_deleted:DeletedStatus.No },
    });

    await addActivityLogs([{
      old_data: { role_id: roleToUpdate?.dataValues?.id, data: {...roleToUpdate?.dataValues}},
      new_data: {
        role_id: afterUpdateRoleToUpdate?.dataValues?.id, data: { ...afterUpdateRoleToUpdate?.dataValues }
      }
    }], roleToUpdate?.dataValues?.id,LogsActivityType.Edit, LogsType.Role, req?.body?.session_res?.id_app_user)
    
    return resSuccess();
  } catch (e) {
    throw e;
  }
};

export const deleteRole = async (req: Request) => {
  try {
    const idRole = parseInt(req.params.id);

    if (idRole === 0) {
      return resUnauthorizedAccess();
    }
    const updateRoleserdata =  await AppUser.findOne({where:{id:req?.body?.session_res?.id_app_user}});

    if(!updateRoleserdata){
      return resNotFound();
    }


    const roleToDelete = await Role.findOne({
      where: { id: idRole,is_deleted:DeletedStatus.No },
      attributes: [
        "id",
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM app_users WHERE app_users.id_role = roles.id AND app_users.is_deleted = '0')`
          ),
          "user_count",
        ],
      ],
    });

    if (!(roleToDelete && roleToDelete.dataValues)) {
      return resNotFound({ message: ROLE_NOT_FOUND });
    }

    if (parseInt(roleToDelete.dataValues.user_count) !== 0) {
      return resUnprocessableEntity({ message: USER_WITH_ROLE_AVAILABLE });
    }

    await Role.update(
      {
       is_deleted:DeletedStatus.yes,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
        { where: { id: roleToDelete.dataValues.id } }
    );
    await addActivityLogs([{
      old_data: { role_id: roleToDelete?.dataValues?.id, data: {...roleToDelete?.dataValues}},
      new_data: {
        role_id: roleToDelete?.dataValues?.id, data: {
          ...roleToDelete?.dataValues, is_deleted: DeletedStatus.yes,
          modified_by: req?.body?.session_res?.id_app_user,
          modified_date: getLocalDate(),
        }
      }
    }], roleToDelete?.dataValues?.id, LogsActivityType.Delete, LogsType.Role, req?.body?.session_res?.id_app_user)
    
    return resSuccess();
  } catch (e) {
    throw e;
  }
};

export const getAllActions = async (req: Request) => {
  try {
    let paginationProps = {};
    let pagination = getInitialPaginationFromQuery(req.query);
    let where = [
      {is_deleted:DeletedStatus.No },
      pagination.is_active ? { is_active: pagination.is_active } : {}
    ];

    let noPagination = req.query.no_pagination === "1";
    if (!noPagination) {
      const totalItems = await Action.count({
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

    const result = await Action.findAll({
      ...paginationProps,
      order: [[pagination.sort_by, pagination.order_by]],
      where,
      attributes: ["id", "action_name", "is_active"],
    });
    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (e) {
    throw e;
  }
};

export const getAllMenuItems = async (req: Request) => {
  try {
    let paginationProps = {};
    let pagination = getInitialPaginationFromQuery(req.query);
    const appUser = await AppUser.findOne({
      where: { id:req?.body?.session_res?.id_app_user, is_deleted: DeletedStatus.No, user_type: [USER_TYPE.Administrator, USER_TYPE.BusinessUser] , 
        },
    });

    
    const configData = await fetchConfigurationByKey(SYSTEM_CONFIGURATIONS_KEYS.VIEW_ACCESS_ID_ACTION);
    if (configData.code !== DEFAULT_STATUS_CODE_SUCCESS) return configData;
    const idAction = configData.data.dataValues.config_value;

    const findHomePage = await CompanyInfo.findOne({
      where: { id: 1  },
      attributes: ["id_home_page"],
    });



    let where: any[] = [];

    
      where = [
        { is_deleted: DeletedStatus.No },
        { is_active: ActiveStatus.Active },{
        
        }
      ];
  
    let noPagination = req.query.no_pagination === "1";
    if (!noPagination) {
      const totalItems = await MenuItem.count({
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

    const result = await MenuItem.findAll({
      ...paginationProps,
      order: [[pagination.sort_by, pagination.order_by]],
      where,
      attributes: [
        "id",
        "name",
        "id_parent_menu",
        "nav_path",
        "menu_location",
        "sort_order",
        "is_active",
      ],
    });
    return resSuccess({ data: noPagination ? result : { pagination, result } });
  } catch (e) {
    throw e;
  }
};

export const fetchRoleConfiguration = async (req: Request) => {
  try {
    const idRole = parseInt(req.params.id);

    const updateRoleserdata =  await AppUser.findOne({where:{id:req?.body?.session_res?.id_app_user}});

    if(!updateRoleserdata){
      return resNotFound();
    }
const isSuperAdmin = updateRoleserdata?.getDataValue('is_super_admin') === true;


    const roleToFetch = await Role.findOne({
      where: { id: idRole,is_deleted:DeletedStatus.No },
    });

    if (!(roleToFetch && roleToFetch.dataValues)) {
      return resNotFound({ message: ROLE_NOT_FOUND });
    }

    const result = await RolePermission.findAll({
      where: { id_role: idRole, is_active: ActiveStatus.Active},
      group: ['"role_permissions"."id"'],
      attributes: [
        "id_menu_item",
        [
          Sequelize.fn("array_agg", Sequelize.col('"RPA"."id_action"')),
          "access",
        ],
      ],
      include: [
        {
          required:false,
          model: RolePermissionAccess,
          as: "RPA",
          where: [{ access: AccessRolePermission.Yes}],
          attributes: [],
        },
      ],
    });
    return resSuccess({
      data: { 
        id_role: idRole, 
        role_name: roleToFetch.dataValues.role_name,
        is_super_admin: roleToFetch.dataValues.is_super_admin,
        is_sub_admin: roleToFetch.dataValues.is_sub_admin,
        role_permission_access: result
      },
    });
  } catch (e) {
    throw e;
  }
};

const validateMenuItemAndAction = async (
  rolePermissionAccessList: IRolePermissionAccess[],
  trn: Transaction | null = null,
) => {
  const findMenuItems = await MenuItem.findAll({
    attributes: ["id"],
    where: {
     is_deleted:DeletedStatus.No,
      // is_active: ActiveStatus.Active,
    },
    ...(trn ? { transaction: trn } : {}),
  });

  const findActions = await Action.findAll({
    attributes: ["id"],
    where: {
     is_deleted:DeletedStatus.No,
      //  is_active: ActiveStatus.Active
    },
    ...(trn ? { transaction: trn } : {}),
  });

  const menuItemList = findMenuItems.map((item) => item.dataValues.id);
  const actionList = findActions.map((item) => item.dataValues.id);

  for (const rolePermissionAccess of rolePermissionAccessList) {
    if (!menuItemList.includes(rolePermissionAccess.id_menu_item)) {
      return resNotFound({ message: MENU_ITEM_NOT_FOUND });
    }
    for (const id of rolePermissionAccess.access) {
      if (!actionList.includes(id)) {
        return resNotFound({ message: ACCESS_NOT_FOUND });
      }
    }
  }

  return resSuccess();
};

export const addRoleConfiguration = async (req: Request) => {
  try {
    const {is_super_admin,is_sub_admin} = req.body;
    const updateRoleserdata =  await AppUser.findOne({where:{id:req?.body?.session_res?.id_app_user}});

    if(!updateRoleserdata){
      return resNotFound();
    }
   
    
    const nameValidaton = await roleWithSameNameValidation(req.body.role_name,null);
    if (nameValidaton.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return nameValidaton;
    }


    const validateMenuAction = await validateMenuItemAndAction(
      req.body.role_permission_access,
      null,
    );
    if (validateMenuAction.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      return validateMenuAction;
    }

    let rolePermissionAccessList = [];
    for (const rpa of req.body.role_permission_access) {
      if (rpa.access.length !== 0) {
        rolePermissionAccessList.push(rpa);
      }
    }

    const trn = await dbContext.transaction();
    try {
      const roleResult = await Role.create(
        {
          role_name: req.body.role_name,
          is_active: ActiveStatus.Active,
          created_by: req.body.session_res.id_app_user,
          is_super_admin: is_super_admin,
          is_sub_admin: is_sub_admin,
          created_date: getLocalDate(),
        },
        { transaction: trn }
      );
      const addRolePermissionAccess = [];
      const RolePermissionData = [];
      for (const rolePermissionAccess of rolePermissionAccessList) {
        if (rolePermissionAccess.access.length !== 0) {
          const rpResult = await RolePermission.create(
            {
              id_role: roleResult.dataValues.id,
              id_menu_item: rolePermissionAccess.id_menu_item,
              is_active: ActiveStatus.Active,
              created_by: req.body.session_res.id_app_user,
              created_date: getLocalDate(),
            },
            { transaction: trn }
          );
          RolePermissionData.push({...rpResult?.dataValues})
          for (const idAction of rolePermissionAccess.access) {
            addRolePermissionAccess.push({
              id_role_permission: rpResult.dataValues.id,
              id_action: idAction,
              access: AccessRolePermission.Yes,
              created_by: req.body.session_res.id_app_user,
              created_date: getLocalDate(), 
            });
          }
        }
      }
      const addRolePermissionAccessData = await RolePermissionAccess.bulkCreate(addRolePermissionAccess, {
        transaction: trn,
      });

      await addActivityLogs([{
        old_data: null,
        new_data: {
          role_config_id: roleResult?.dataValues?.id, data: {
            ...roleResult?.dataValues
          },
          role_permission_data:RolePermissionData,
          role_permission_access_data : addRolePermissionAccessData.map((t)=>t.dataValues)
        }
      }], roleResult?.dataValues?.id, LogsActivityType.Add, LogsType.RoleConfiguration, req?.body?.session_res?.id_app_user,trn)
    
      await trn.commit();
      return resSuccess();
    } catch (e) {
      await trn.rollback();
      throw e;
    }
  } catch (e) {
    throw e;
  }
};

export const updateRoleConfiguration = async (req: Request) => {
  const trn = await dbContext.transaction();
  try {
    const idRole = parseInt(req.params.id);
    const {is_super_admin,is_sub_admin} = req.body;
    const updateRoleserdata =  await AppUser.findOne({where:{id:req?.body?.session_res?.id_app_user}});

    if(!updateRoleserdata){
      return resNotFound();
    }

    const roleToUpdate:any = await Role.findOne({
      where: {
        id: idRole,
        is_deleted: DeletedStatus.No,
      },
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT is_super_admin
              FROM app_users
              WHERE app_users.id = roles.created_by
              LIMIT 1
            )`),
            'has_super_admin'
          ]
        ]
      }        
    });
    

    if (!(roleToUpdate && roleToUpdate.dataValues)) {
      return resNotFound({ message: ROLE_NOT_FOUND });
    }
    
    const nameValidaton = await roleWithSameNameValidation(
      req.body.role_name,
      idRole,
    
    );
    if (nameValidaton.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      await trn.rollback();
      return nameValidaton;
    }
   
    const validateMenuAction = await validateMenuItemAndAction(
      req.body.role_permission_access,
      trn,
    
    );
    if (validateMenuAction.code !== DEFAULT_STATUS_CODE_SUCCESS) {
      await trn.rollback();
      return validateMenuAction;
    }

    await Role.update(
      {
        is_super_admin: is_super_admin,
        is_sub_admin: is_sub_admin,
        role_name: req.body.role_name,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: { id: idRole}, transaction: trn }
    );

    let rolePermissionAccessList = [];
    for (const rpa of req.body.role_permission_access) {
      if (rpa.access.length !== 0) {
        rolePermissionAccessList.push(rpa);
      }
    }

    await updateRolePermission(
      idRole,
      rolePermissionAccessList,
      req.body.session_res.id_app_user,
      trn,
    );

    await trn.commit();
    return resSuccess();
  } catch (e) {
    await trn.rollback();
    throw e;
  }
};

export const changeStatusRoleConfiguration = async (req: Request) => {
  const trn = await dbContext.transaction();
  try {
    const idRole = parseInt(req.params.id);
    const updateRoleserdata =  await AppUser.findOne({where:{id:req?.body?.session_res?.id_app_user}});

    if(!updateRoleserdata){
      return resNotFound();
    }

    const whereClause: any = {
      id: idRole,
      is_deleted: DeletedStatus.No,
    };

    const roleToUpdate = await Role.findOne({
      where:whereClause 
    });

    if (!(roleToUpdate && roleToUpdate.dataValues)) {
      return resNotFound({ message: ROLE_NOT_FOUND });
    }

    await Role.update(
      {
        is_active: req.body.is_active,
        modified_by: req.body.session_res.id_app_user,
        modified_date: getLocalDate(),
      },
      { where: whereClause, transaction: trn }
    );
    await addActivityLogs([{
      old_data: { role_id: roleToUpdate?.dataValues?.id, data: {...roleToUpdate?.dataValues}},
      new_data: {
        role_id: roleToUpdate?.dataValues?.id, data: {
          ...roleToUpdate?.dataValues, is_active: req.body.is_active,
          modified_date: getLocalDate(),
          modified_by: req?.body?.session_res?.id_app_user,
        }
      }
    }], roleToUpdate?.dataValues?.id, LogsActivityType.StatusUpdate, LogsType.RoleConfiguration, req?.body?.session_res?.id_app_user,trn)
    
    await trn.commit();
    return resSuccess();
  } catch (e) {
    await trn.rollback();
    throw e;
  }
};

const updateRolePermission = async (
  idRole: number,
  rolePermissionAccessList: IRolePermissionAccess[],
  idAppUser: number,
  trn: Transaction
) => {
  let availableRP = await RolePermission.findAll({
    where: { id_role: idRole },
    transaction: trn,
  });
  const updateRolePermission = [];

  for (const rolePermissionAccess of rolePermissionAccessList) {
    let idRP: number;
    let findAvailableRP = availableRP.find(
      (item) =>
        item.dataValues.id_menu_item === rolePermissionAccess.id_menu_item
    );

    if (findAvailableRP) {
      idRP = findAvailableRP.dataValues.id;
      availableRP = availableRP.filter((item) => {
        return item.dataValues.id !== idRP;
      });

      if (findAvailableRP.dataValues.is_active === "0") {
        updateRolePermission.push({
          ...findAvailableRP.dataValues,
          is_active: ActiveStatus.Active,
          modified_by: idAppUser,
          modified_date: getLocalDate(),
        });
      }
    } else {
      const rpResult = await RolePermission.create(
        {
          id_role: idRole,
          id_menu_item: rolePermissionAccess.id_menu_item,
          is_active: ActiveStatus.Active,
          created_by: idAppUser,
          created_date: getLocalDate(),
        },
        { transaction: trn }
      );

      idRP = rpResult.dataValues.id;
    }
    await updateRolePermissionAccess(
      idRP,
      rolePermissionAccess.access,
      idAppUser,
      trn,
    );
  }
  await RolePermission.bulkCreate(updateRolePermission, {
    transaction: trn,
    updateOnDuplicate: ["is_active", "modified_by", "modified_date"],
  });
  await updateUnavailableMenuPermission(availableRP, idAppUser, trn);
};

const updateRolePermissionAccess = async (
  idRP: number,
  rolePermissionAccessActions: IRolePermissionAccess["access"],
  idAppUser: number,
  trn: Transaction,
) => {
  let auditLogPayload = [];
  const updateRolePermission = [];
  const addRolePermission = [];
  let availableRPA = await RolePermissionAccess.findAll({
    where: { id_role_permission: idRP },     
    transaction: trn,
  });
  for (const idAction of rolePermissionAccessActions) {
    const findRPA = availableRPA.find(
      (item) => item.dataValues.id_action === idAction
    );

    if (findRPA) {
      availableRPA = availableRPA.filter(
        (item) => item.dataValues.id !== findRPA.dataValues.id
      );

      if (findRPA.dataValues.access === "0") {
        auditLogPayload.push({
          id_role_permission_access: findRPA.dataValues.id,
          old_value: "0",
          new_value: "1",
          changed_by: idAppUser,
          changed_date: getLocalDate(),
        });
        updateRolePermission.push({
          ...findRPA.dataValues,
          access: AccessRolePermission.Yes,
          modified_by: idAppUser,
          modified_date: getLocalDate(),
        });
      }
    } else {
      addRolePermission.push({
        id_role_permission: idRP,
        id_action: idAction,
        access: AccessRolePermission.Yes,
        created_by: idAppUser,
        
        created_date: getLocalDate(),
      });
    }
  }

  for (const rpa of availableRPA) {
    if (rpa.dataValues.access === "1") {
      auditLogPayload.push({
        id_role_permission_access: rpa.dataValues.id,
        old_value: "1",
        new_value: "0",
        changed_by: idAppUser,
        
        changed_date: getLocalDate(),
      });
      updateRolePermission.push({
        ...rpa.dataValues,
        access: AccessRolePermission.No,
        modified_by: idAppUser,
        modified_date: getLocalDate(),
      });
    }
  }
  if (addRolePermission.length !== 0) {
    await RolePermissionAccess.bulkCreate(addRolePermission, {
      transaction: trn,
    });
  }
  if (updateRolePermission.length !== 0) {
    await RolePermissionAccess.bulkCreate(updateRolePermission, {
      transaction: trn,
      updateOnDuplicate: ["access", "modified_by", "modified_date"],
    });
  }
  if (auditLogPayload.length !== 0) {
    await RolePermissionAccessAuditLog.bulkCreate(auditLogPayload, {
      transaction: trn,
    });
  }
};

const updateUnavailableMenuPermission = async (
  unavailableRolePermission: Model<any, any>[],
  idAppUser: number,
  trn: Transaction,
) => {
  let auditLogPayload = [];
  const updateRolePermission = [];
  const updateRolePermissionAccess = [];
  for (const rp of unavailableRolePermission) {
    if (rp.dataValues.is_active === "1") {
      updateRolePermission.push({
        ...rp.dataValues,
        is_active: ActiveStatus.InActive,
        modified_by: idAppUser,
        modified_date: getLocalDate(),
      });

      let availableRPA = await RolePermissionAccess.findAll({
        where: { id_role_permission: rp.dataValues.id },
        transaction: trn,
      });

      for (const rpa of availableRPA) {
        if (rpa.dataValues.access === "1") {
          auditLogPayload.push({
            id_role_permission_access: rpa.dataValues.id,
            old_value: "1",
            new_value: "0",
            changed_by: idAppUser,
            
            changed_date: getLocalDate(),
          });
          updateRolePermissionAccess.push({
            ...rpa.dataValues,
            access: AccessRolePermission.No,
            modified_by: idAppUser,
            modified_date: getLocalDate(),
          });
        }
      }
    }
  }
  if (updateRolePermission.length !== 0) {
    await RolePermission.bulkCreate(updateRolePermission, {
      transaction: trn,
      updateOnDuplicate: ["is_active", "modified_by", "modified_date"],
    });
  }
  if (updateRolePermissionAccess.length !== 0) {
    await RolePermissionAccess.bulkCreate(updateRolePermissionAccess, {
      transaction: trn,
      updateOnDuplicate: ["access", "modified_by", "modified_date"],
    });
  }
  if (auditLogPayload.length !== 0) {
    await RolePermissionAccessAuditLog.bulkCreate(auditLogPayload, {
      transaction: trn,
    });
  }
};

export const getUserAccessMenuItems = async (req: Request) => {
  try {
  
    const { id_app_user, client_id, id_role, user_type } = req.body.session_res;

    const findUser = await AppUser.findOne({
      where: { id: id_app_user, is_active: ActiveStatus.Active, is_deleted: DeletedStatus.No },
    });

    const configData = await fetchConfigurationByKey(SYSTEM_CONFIGURATIONS_KEYS.VIEW_ACCESS_ID_ACTION);
    if (configData.code !== DEFAULT_STATUS_CODE_SUCCESS) return configData;
    const idAction = configData.data.dataValues.config_value;

    const findHomePage = await CompanyInfo.findOne({
      where: { id: client_id },
      attributes: ["id_home_page"],
    });

    

    const isAdministrator = user_type === USER_TYPE.Administrator;

    // Case 1: Admin Super Admin - Full access
    if (isAdministrator && id_role === 0) {
      const allMenus = await MenuItem.findAll({
        where: {
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
        },
        order: [["sort_order", "ASC"]],
        attributes: [
          "id", "name", "id_parent_menu", "nav_path",
          "sort_order", "icon", "menu_location",
        ],
      });
      return resSuccess({ data: allMenus });
    }

    const whereConditions: any = {
      is_deleted: DeletedStatus.No,
      is_active: ActiveStatus.Active,
    };

    const resultAllData = await MenuItem.findAll({
      where: whereConditions,
      order: [["sort_order", "ASC"]],
      attributes: [
        "id", "name", "id_parent_menu", "nav_path",
        "sort_order", "icon", "menu_location", "is_for_super_admin",
      ],
      include: [
        {
          model: RolePermission,
          as: "RP",
          required: false,
          where: {
            id_role,
            is_active: ActiveStatus.Active,
          },
          include: [
            {
              model: RolePermissionAccess,
              as: "RPA",
              required: false,
              where: {
                access: AccessRolePermission.Yes,
              },  
              include: [
                {
                  model: Action,
                  as: "action",
                  attributes: ["id", "action_name"],
                  required: false
                },
              ],
            },
          ],
        },
      ],
    });
    if (resultAllData.length === 0) {
      const result = await MenuItem.findAll({
        order: [["sort_order", "ASC"]],
        attributes: [
          "id", "name", "id_parent_menu", "nav_path",
          "sort_order", "icon", "menu_location",
        ],
        where: {
          is_deleted: DeletedStatus.No,
          is_active: ActiveStatus.Active,
          name: { [Op.iLike]: "%dashboard%" },
        },
      });
      return resSuccess({ data: result });
    }

    if (isAdministrator) return resSuccess({ data: resultAllData });
    const filteredResult = resultAllData
      .map((menuItem: any) => {
        // Extract permissions from role permissions
        const permissions = menuItem?.RP?.flatMap((rp: any) => {
          return rp.RPA.map((rpa: any) => ({
            id_action: rpa.id_action,
            name_action: rpa.action?.action_name,
          }));
        }) || [];

        // For super admin with super admin menus OR non-super admin with regular menus
        // Check proper permissions
        const hasView = menuItem?.RP?.some((rp: any) => 
          rp?.RPA?.some((rpa: any) => rpa.id_action == idAction)
        );

        if (hasView && permissions.length > 0) {
          return {
            id: menuItem.id,
            name: menuItem.name,
            id_parent_menu: menuItem.id_parent_menu,
            nav_path: menuItem.nav_path,
            sort_order: menuItem.sort_order,
            icon: menuItem.icon,
            menu_location: menuItem.menu_location,
            permission: permissions,
          };
        }

        return null;
      })
      .filter(Boolean);

    return resSuccess({ data: filteredResult });
  } catch (e) {
    throw e;
  }
};
export const addMenuItems = async (req: Request) => {
  try {
    const { menu } = req.body;
    const trn = await dbContext.transaction();
    try {
      let menuItemData = [];
      let SubMenuItemData = [];
      let SubSubMenuItemData = [];

      for (let index = 0; index < menu.length; index++) {
        const element = req.body.menu[index];
        const menuItem = await MenuItem.create(
          {
            name: element.title,
            id_parent_menu: null,
            nav_path: element.nav_path,
            menu_location: element.menu_location,
            sort_order: element.sort_order,
            is_active: ActiveStatus.Active,
            is_deleted: DeletedStatus.No,
            created_by: 1,
            created_date: getLocalDate(),
            
            icon: element.icon,
          },
          { transaction: trn }
        );
        menuItemData.push({...menuItem?.dataValues})
        if (element.sub_menu && element.sub_menu.length > 0) {
          for (let index = 0; index < element.sub_menu.length; index++) {
            const subElement = element.sub_menu[index];
            const subMenuItem = await MenuItem.create(
              {
                name: subElement.title,
                id_parent_menu: menuItem.dataValues.id,
                nav_path: subElement.nav_path,
                menu_location: subElement.menu_location,
                sort_order: subElement.sort_order,
                is_active: ActiveStatus.Active,
                is_deleted: DeletedStatus.No,
                created_by: 1,
                created_date: getLocalDate(),
                
                icon: subElement.icon,
              },
              { transaction: trn }
            );

            SubMenuItemData.push({...subMenuItem?.dataValues})

            if (subElement.sub_menu && subElement.sub_menu.length > 0) {
              for (let index = 0; index < subElement.sub_menu.length; index++) {
                const subSubElement = subElement.sub_menu[index];
                const subSubMenuItem = await MenuItem.create(
                  {
                    name: subSubElement.title,
                    id_parent_menu: subMenuItem.dataValues.id,
                    nav_path: subSubElement.nav_path,
                    menu_location: subSubElement.menu_location,
                    sort_order: subSubElement.sort_order,
                    is_active: ActiveStatus.Active,
                    is_deleted: DeletedStatus.No,
                    created_by: 1,
                    created_date: getLocalDate(),
                    
                    icon: subSubElement.icon,
                  },
                  { transaction: trn }
                );
                SubSubMenuItemData.push({...subSubMenuItem?.dataValues})
              }
            }
          }
        }
      }

      await addActivityLogs([{
        old_data: null,
        new_data: {
          menu_item_data: menuItemData,
          sub_menu_item_data: SubMenuItemData,
          sub_sub_menu_item_data: SubSubMenuItemData,
        }
      }], null, LogsActivityType.Add, LogsType.MenuItem, req?.body?.session_res?.id_app_user,trn)
      await trn.commit();
      return resSuccess();
    } catch (error) {
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } catch (error) {
    throw error;
  }
};
