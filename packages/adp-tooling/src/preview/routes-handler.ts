import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import type { ReaderCollection } from '@ui5/fs';
import type { ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareUtils } from '@ui5/server';
import type { NextFunction, Request, Response } from 'express';

import { FolderNames, TemplateFileName, HttpStatusCodes } from '../types';

interface WriteFragmentBody {
    fragmentName: string;
}

/**
 * @description Handles API Routes
 */
export default class RoutesHandler {
    /**
     * Constructor taking project as input.
     *
     * @param project Reference to the root of the project
     * @param util middleware utilities provided by the UI5 CLI
     * @param logger Logger instance
     */
    constructor(
        private readonly project: ReaderCollection,
        private readonly util: MiddlewareUtils,
        private readonly logger: ToolsLogger
    ) {}

    /**
     * Handler for reading all fragment files from the workspace.
     *
     * @param _ Request
     * @param res Response
     * @param next Next Function
     */
    public handleReadAllFragments = async (_: Request, res: Response, next: NextFunction) => {
        try {
            const files = await this.project.byGlob('/**/changes/**/*.fragment.xml');

            if (!files || files.length === 0) {
                res.status(HttpStatusCodes.OK)
                    .contentType('application/json')
                    .send({ fragments: [], message: `No fragments found in the project workspace.` });
                return;
            }

            const fragments = files.map((f) => ({
                fragmentName: f.getName()
            }));

            res.status(HttpStatusCodes.OK)
                .contentType('application/json')
                .send({
                    fragments,
                    message: `${fragments.length} fragments found in the project workspace.`
                });
            this.logger.debug(`Read fragments ${JSON.stringify(fragments)}`);
        } catch (e) {
            this.logger.error(e.message);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: e.message });
            next(e);
        }
    };

    /**
     * Handler for writing a fragment file to the workspace.
     *
     * @param req Request
     * @param res Response
     * @param next Next Function
     */
    public handleWriteFragment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body as WriteFragmentBody;

            const fragmentName = sanitize(data.fragmentName);

            const sourcePath = this.util.getProject().getSourcePath();

            if (fragmentName) {
                const fullPath = path.join(sourcePath, FolderNames.Changes, FolderNames.Fragments);
                const filePath = path.join(fullPath, `${fragmentName}.fragment.xml`);

                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath);
                }

                if (fs.existsSync(filePath)) {
                    res.status(HttpStatusCodes.CONFLICT).send(`Fragment with name "${fragmentName}" already exists`);
                    this.logger.debug(`XML Fragment with name "${fragmentName}" was created`);
                    return;
                }

                // Copy the template XML Fragment to the project's workspace
                const fragmentTemplatePath = path.join(__dirname, '../../templates/rta', TemplateFileName.Fragment);
                fs.copyFileSync(fragmentTemplatePath, filePath);

                const message = 'XML Fragment created';
                res.status(HttpStatusCodes.CREATED).send(message);
                this.logger.debug(`XML Fragment with name "${fragmentName}" was created`);
            } else {
                res.status(HttpStatusCodes.BAD_REQUEST).send('Fragment name was not provided!');
                this.logger.debug('Bad request. Fragment name was not provided!');
            }
        } catch (e) {
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
        }
    };
}
