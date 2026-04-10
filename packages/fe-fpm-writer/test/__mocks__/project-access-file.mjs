import { jest } from '@jest/globals';

// Import the real implementation using a relative path to bypass moduleNameMapper.
// moduleNameMapper only intercepts bare specifier `@sap-ux/project-access/dist/file`.
const realModule = await import('../../../project-access/dist/file/index.js');

// Controllable mock for findFilesByExtension that delegates to the real implementation
// by default. Tests that need to override it can import findFilesByExtensionMock and
// call e.g. findFilesByExtensionMock.mockResolvedValue([]).
export const findFilesByExtensionMock = jest.fn(realModule.findFilesByExtension);
export const findFilesByExtension = findFilesByExtensionMock;

// Re-export everything else from the real module so the mock is a transparent wrapper
export const findBy = realModule.findBy;
export const findFiles = realModule.findFiles;
export const findFileUp = realModule.findFileUp;
export const getFilePaths = realModule.getFilePaths;
export const deleteDirectory = realModule.deleteDirectory;
export const deleteFile = realModule.deleteFile;
export const fileExists = realModule.fileExists;
export const readDirectory = realModule.readDirectory;
export const readFile = realModule.readFile;
export const readJSON = realModule.readJSON;
export const updatePackageJSON = realModule.updatePackageJSON;
export const updateManifestJSON = realModule.updateManifestJSON;
export const writeFile = realModule.writeFile;
