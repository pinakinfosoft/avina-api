import { RequestHandler } from "express";
import { callServiceMethod } from "./base.controller";
import { PaymentTransaction, PaymentTransactionWithPaypal, configProductPaymentTransaction, invoivesDetailsApi } from "../services/payment.service";

export const PaymentTransactionFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, PaymentTransaction(req), "PaymentTransactionFn");
}

export const invoivesDetailsApiFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, invoivesDetailsApi(req), "invoivesDetailsApiFn");
}

/////----- config product transaction------------////////////////

export const configProductPaymentTransactionFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, configProductPaymentTransaction(req), "configProductPaymentTransactionFn");
}

//////////--------- paypal with tranction API ------------//////////


export const PaymentTransactionWithPaypalFn: RequestHandler = (req, res) => {
    callServiceMethod(req, res, PaymentTransactionWithPaypal(req), "PaymentTransactionWithPaypalFn");
}