import * as fs from 'fs';
import * as path from 'path';
import type { ToolsLogger } from '@sap-ux/logger';
import type { ReaderCollection } from '@ui5/fs';
import type { NextFunction, Request, Response, Router } from 'express';
import { FolderNames, TemplateFileName, HttpStatusCodes } from '../types';

interface WriteFragmentBody {
    fragmentName: string;
}

/**
 *
 */
export default class RoutesHandler {
    /**
     * Constructor taking project as input.
     *
     * @param project reference to the root of the project
     * @param logger logger instance
     */
    constructor(private readonly project: ReaderCollection, private readonly logger: ToolsLogger) {}

    /**
     * Handler for reading all fragment files from the workspace
     * @param _ Request
     * @param res Response
     * @param next Next Function
     */
    public handleReadAllFragments = async (_: Request, res: Response, next: NextFunction) => {
        const files = await this.project.byGlob('/**/changes/**/*.fragment.xml');

        if (!files || files.length === 0) {
            res.status(HttpStatusCodes.OK)
                .contentType('application/json')
                .send({ fragments: [], message: `No fragments found in the project workspace.` });
        }
        try {
            const fragments = files.map((file) => {
                return {
                    fragmentName: file.getName()
                };
            });

            res.status(HttpStatusCodes.OK)
                .contentType('application/json')
                .send({ fragments, message: `${fragments.length} fragments found in the project workspace.` });
            this.logger.debug(`Read fragments ${JSON.stringify(fragments)}`);
        } catch (e) {
            this.logger.error(e.message);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: e.message });
            next(e);
        }
    };

    /**
     * Handler for writing a fragment file to the workspace
     * @param _req Request
     * @param res Response
     * @param next Next Function
     */
    public handleWriteFragment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body as WriteFragmentBody;
            const fragmentName = data.fragmentName;
            const matching = this.project.byPath('/**/changes');

            const projectPath = process.cwd();

            if (fragmentName) {
                const fullPath = path.join(projectPath, FolderNames.Webapp, FolderNames.Changes, FolderNames.Fragments);
                const filePath = path.join(fullPath, `${fragmentName}.fragment.xml`);

                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath);
                }

                if (fs.existsSync(filePath)) {
                    res.status(HttpStatusCodes.CONFLICT).send(`Fragment with name "${fragmentName}" already exists`);
                    return;
                }

                // Copy the template XML Fragment to the project's workspace
                const fragmentTemplatePath = path.join(__dirname, '../templates', TemplateFileName.Fragment);
                fs.copyFileSync(fragmentTemplatePath, filePath);

                const message = 'XML Fragment created';
                res.status(HttpStatusCodes.CREATED).send(message);
            } else {
                res.send(HttpStatusCodes.BAD_REQUEST).send('Fragment Name was not provided!');
            }
        } catch (e) {
            this.logger.error(e.message);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(e.message);
            next(e);
        }
    };
}
