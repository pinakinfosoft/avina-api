import { Router } from "express";
import { deliveryStatusUpdateFn, getAllOrdersListAdminFn, orderDetailsAPIAdminFn, orderDetailsAPIFn, orderStatusUpdateFn, orderTransactionListFn } from "../../controllers/orders.controller";
import { deliverySTatusUpdateValidator, orderSTatusUpdateValidator } from "../../../validators/order/order.validator";
import { authorization } from "../../../middlewares/authenticate";

export default  (app: Router) => {

    app.get("/order/list", [authorization], getAllOrdersListAdminFn)
    app.post("/order/detail", [authorization], orderDetailsAPIAdminFn)
    app.put("/order/status/update", [authorization, orderSTatusUpdateValidator], orderStatusUpdateFn)
    app.put("/order/delivery/status", [authorization, deliverySTatusUpdateValidator], deliveryStatusUpdateFn )
    app.get("/order/transaction/list", [authorization], orderTransactionListFn)

    app.post("/order/details",[authorization],orderDetailsAPIFn)

}