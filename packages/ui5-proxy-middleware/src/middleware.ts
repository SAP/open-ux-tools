import express, { RequestHandler, NextFunction, Request, Response } from 'express';
import { ui5Proxy } from './proxy';
module.exports = ({ options }: any): any => {
    const router = express.Router();

    router.use('/', ui5Proxy);

    return router;
};
