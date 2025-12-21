import { RequestHandler } from "express";
import { callServiceMethod } from "./base.controller";
import { addProductOrder, addProductWithPaypalOrder, deliveryStatusUpdate, getAllOrdersListAdmin, getAllOrdersUser, moveOrderToArchive, orderDetailsAPI, orderDetailsAPIAdmin, orderStatusUpdate, orderTransactionList } from "../services/orders.service";

export const addProductOrderFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, addProductOrder(req), "addProductOrderFn");
}

export const getAllOrdersUserFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, getAllOrdersUser(req), "getAllOrdersUserFn");
}

export const getAllOrdersListAdminFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, getAllOrdersListAdmin(req), "getAllOrdersListAdminFn");
}

export const orderDetailsAPIFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, orderDetailsAPI(req), "orderDetailsAPIFn");
}

export const moveOrderToArchiveFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, moveOrderToArchive(req), "moveOrderToArchiveFn");
}

export const orderDetailsAPIAdminFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, orderDetailsAPIAdmin(req), "orderDetailsAPIAdminFn");
}

export const orderStatusUpdateFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, orderStatusUpdate(req), "orderStatusUpdateFn");
}

export const deliveryStatusUpdateFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, deliveryStatusUpdate(req), "deliveryStatusUpdateFn");
}

export const orderTransactionListFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, orderTransactionList(req), "orderTransactionListFn");
}


/*----------- paypal payment method with order -----------------------*/

export const addProductWithPaypalOrderFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, addProductWithPaypalOrder(req), "addProductWithPaypalOrderFn");
}
