import { Router } from "express"
import {  invoivesDetailsApiFn } from "../../controllers/payment.controller"
import { authorization } from "../../../middlewares/authenticate"

export default (app: Router) => {

    app.post("/invoice/details", [authorization], invoivesDetailsApiFn)

}