import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import type NodeCache from 'node-cache';
import type { ReaderCollection } from '@ui5/fs';
import type { ToolsLogger } from '@sap-ux/logger';
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
     * @param logger Logger instance
     * @param cache Caching instance
     */
    constructor(
        private readonly project: ReaderCollection,
        private readonly logger: ToolsLogger,
        private cache: NodeCache
    ) {}

    /**
     * Generic caching function, caches the results of a callback
     *
     * @param key Cache key - unique identifier
     * @param cb Callback used to return data
     * @param ttlSeconds Time-to-live for cached item
     * @template T
     * @returns {T} Type or Interface of the return data
     */
    private withCache<T>(key: string, cb: () => T, ttlSeconds: number = 60): T {
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
     * Handler for retrieving XML Fragments for templates used for Dialogs
     *
     * @param req Request
     * @param res Response
     * @param next Next Function
     */
    public handleGetXMLFragmentByName = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const xmlName = req.params['xmlName'];
            const sanitizedXmlName = sanitize(xmlName);

            if (!sanitizedXmlName) {
                res.send(HttpStatusCodes.NOT_FOUND).send(`Could not find XML Fragment at ${req.path}`);
                return;
            }

            const xmlFragmentPath = path.join(__dirname, '../../templates/rta/ui', sanitizedXmlName);

            if (!fs.existsSync(xmlFragmentPath)) {
                res.send(HttpStatusCodes.NOT_FOUND).send(`XML Fragment does not exist`);
                return;
            }

            // Optionally we can cache the fragment
            const fragment = fs.readFileSync(xmlFragmentPath, 'utf-8');

            res.status(HttpStatusCodes.OK).contentType('application/xml').send(fragment);
        } catch (e) {
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(e.message);
            next(e);
        }
    };

    /**
     * @description Handler for reading all fragment files from the workspace
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
                const fileName = file.getName();
                return {
                    fragmentName: fileName
                };
            });

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
     * Handler for writing a fragment file to the workspace
     *
     * @param req Request
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
                const fragmentTemplatePath = path.join(__dirname, '../../templates/rta', TemplateFileName.Fragment);
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
}
