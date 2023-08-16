import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import type NodeCache from 'node-cache';
import type { ReaderCollection } from '@ui5/fs';
import type { ToolsLogger } from '@sap-ux/logger';
import type { NextFunction, Request, Response } from 'express';

import type { ManifestAppdescr } from '../types';
import { FolderNames, TemplateFileName, HttpStatusCodes, ProjectFileNames } from '../types';

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
     * @description Handler for reading all fragment files from the workspace
     * @param _ Request
     * @param res Response
     * @param next Next Function
     */
    public handleReadAllFragments = async (_: Request, res: Response, next: NextFunction) => {
        const files = await this.project.byGlob('/**/changes/**/*.fragment.xml');
        const xmlChangeFiles = await this.project.byGlob('/**/changes/*_addXML.change');

        if (!files || files.length === 0) {
            res.status(HttpStatusCodes.OK)
                .contentType('application/json')
                .send({ fragments: [], message: `No fragments found in the project workspace.` });
        }
        try {
            // Dictionary where keys are XML Fragment names that are in the project's workspace
            const dict: { [key: string]: string } = {};

            const fragments = files.map((file) => {
                const fileName = file.getName();
                dict[fileName] = file.getPath();
                return {
                    fragmentName: fileName
                };
            });

            /**
             * Searches every addXML change file and deletes the fragmentName from the dictionary
             */
            await Promise.all(
                xmlChangeFiles
                    .map(async (file) => {
                        const buffer = await file.getBuffer();
                        const data: object & { content: { fragmentPath: string } } = JSON.parse(buffer.toString());
                        // check if the fragment file exists in the workspace, return nothing if it does not
                        const fragmentFileName = data.content.fragmentPath;
                        const fragmentName = fragmentFileName.split('/').pop() as string;

                        delete dict[fragmentName];
                    })
                    .map((f) => Promise.resolve(f))
            );

            /**
             * Returned array consists of fragmentNames that have no corresponding change file
             */
            const filteredFragmentsWithoutChangeFile: { fragmentName: string }[] = Object.keys(dict).map((key) => {
                return {
                    fragmentName: key
                };
            });

            res.status(HttpStatusCodes.OK)
                .contentType('application/json')
                .send({
                    fragments,
                    filteredFragments: filteredFragmentsWithoutChangeFile,
                    message: `${fragments.length} fragments found in the project workspace.`
                });
            this.logger.debug(`Read fragments ${JSON.stringify(fragments)}`);
            this.logger.debug(
                `Read fragments without change file ${JSON.stringify(filteredFragmentsWithoutChangeFile)}`
            );
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
     *
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
            const manifest = this.withCache<ManifestAppdescr>(key, readFile, 180);
            res.status(HttpStatusCodes.OK).send(manifest);
        } catch (e) {
            const sanitizedMsg = sanitize(e.message);
            this.logger.error(sanitizedMsg);
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(sanitizedMsg);
            next(e);
        }
    };
}
