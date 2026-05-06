export { Config as ServerConfig } from 'jest-dev-server';

export interface CopyOptions {
    /** Absolute path to root of a project. If provided, a copy of project is generated under `fixtures-copy` folder*/
    projectRoot: string;
    /** Call back function to execute after projects are copied. Useful incase file content of a project need modification */
    cb?: () => Promise<void>;
    /** Delete all contents of a project except `node_modules` and `package-lock.json` before copying contents. By default `delete.content` is `true` and `delete.nodeModules` is `false`. If `nodeModules` is set as `true`, `node_modules` and `package-lock.json` is also deleted */
    remove?: {
        nodeModules?: boolean;
        content?: boolean;
    };
    /** Install project dependencies with `npm i` command. By default is `true` */
    npmI?: boolean;
}
