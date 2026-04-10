import { jest } from '@jest/globals';

// Controllable mock for findFilesByExtension
// Source code only imports findFilesByExtension from @sap-ux/project-access/dist/file
// This mock is used via moduleNameMapper in jest.config.mjs to avoid the read-only
// ESM module namespace issue with jest.spyOn
export const findFilesByExtensionMock = jest.fn().mockResolvedValue([]);
export const findFilesByExtension = findFilesByExtensionMock;

// Re-export other file utilities that might be imported transitively
// (currently not used by fe-fpm-writer src, but provided for safety)
export const findBy = jest.fn().mockResolvedValue([]);
export const findFiles = jest.fn().mockResolvedValue([]);
export const findFileUp = jest.fn().mockResolvedValue(undefined);
export const getFilePaths = jest.fn().mockResolvedValue([]);
export const deleteDirectory = jest.fn();
export const deleteFile = jest.fn();
export const fileExists = jest.fn().mockResolvedValue(false);
export const readDirectory = jest.fn().mockResolvedValue([]);
export const readFile = jest.fn().mockResolvedValue('');
export const readJSON = jest.fn().mockResolvedValue({});
export const updatePackageJSON = jest.fn();
export const updateManifestJSON = jest.fn();
export const writeFile = jest.fn();
