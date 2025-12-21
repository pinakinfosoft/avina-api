import { Router } from "express"
import { PaymentTransactionFn, PaymentTransactionWithPaypalFn , invoivesDetailsApiFn } from "../../controllers/payment.controller"

export default (app: Router) => {

    app.post("/paymet/add",  PaymentTransactionFn)

    /* paypal method */

    app.post("/paymet/paypal/add",  PaymentTransactionWithPaypalFn)

}