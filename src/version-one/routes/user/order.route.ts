import { Router } from "express";
import { addProductOrderFn, addProductWithPaypalOrderFn, getAllOrdersUserFn , orderDetailsAPIFn } from "../../controllers/orders.controller";

export default  (app: Router) => {
    app.post("/order/add", addProductOrderFn)
    app.get("/order/list", getAllOrdersUserFn)
    app.post("/order/details", orderDetailsAPIFn)
    

    ////////------------ paypal paymentmethod with order ----------/////////

    app.post("/order/paypal/add", addProductWithPaypalOrderFn)
    
}