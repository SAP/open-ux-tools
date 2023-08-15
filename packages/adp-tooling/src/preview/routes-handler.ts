import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import type NodeCache from 'node-cache';
import type { ReaderCollection } from '@ui5/fs';
import type { ToolsLogger } from '@sap-ux/logger';
import type { NextFunction, Request, Response } from 'express';

import { FolderNames, TemplateFileName, HttpStatusCodes, ProjectFileNames, ManifestAppdescr } from '../types';

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
     * @param project reference to the root of the project
     * @param logger logger instance
     */
    constructor(
        private readonly project: ReaderCollection,
        private readonly logger: ToolsLogger,
        private cache: NodeCache
    ) {}

    private withCache<T>(key: string, ttlSeconds: number = 60, cb: () => T) {
        const cachedData = this.cache.get<T>(key);

        if (cachedData !== undefined) {
            return cachedData;
        } else {
            const data = cb();
            this.cache.set(key, data, ttlSeconds);
            return data;
        }
    }

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

            const fragmentName = sanitize(data.fragmentName);

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
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
        }
    };

    /**
     * Handler for reading the manifest.appdescr_variant contents
     * @param req Request
     * @param res Response
     * @param next Next Function
     */
    public handleReadAppDescrVariant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const projectPath = process.cwd();
            const key = `__express__${req.path}`;

            const fullPath = path.join(projectPath, FolderNames.Webapp, ProjectFileNames.ManifestDescriptor);

            const readFile = () => {
                return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            };

            // Need a way to clear the cache when server is stopped with flushAll()
            const manifest = this.withCache<ManifestAppdescr>(key, 180, readFile);
            res.status(HttpStatusCodes.OK).send(manifest);
        } catch (e) {
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
        }
    };
}
