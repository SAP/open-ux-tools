import { join, resolve } from 'node:path';

const mockXml = '<edmx:Edmx Version="4.0"/>';
const mockCwd = resolve('mock', 'cwd');
const relativeMetadataPath = 'metadata.xml';
const absoluteMetadataPath = resolve('absolute', 'path', 'metadata.xml');
const relativeEntityDataPath = 'entityData.json';
const absoluteEntityDataPath = resolve('absolute', 'path', 'entityData.json');
const mockEntityData = [{ entitySetName: 'Agencies', items: [{ ID: '1' }] }];

jest.mock('node:fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);

// Import after mocks are set up
import { existsSync, readFileSync } from 'node:fs';
import { resolveMetadata, resolveEntityData, resolveExternalServices } from '../../../src/app-headless/resolve';

const existsSyncMock = existsSync as jest.Mock;
const readFileSyncMock = readFileSync as jest.Mock;

describe('resolveMetadata', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('inline XML is returned as-is without file resolution', () => {
        const result = resolveMetadata(mockXml);
        expect(result).toBe(mockXml);
        expect(existsSyncMock).not.toHaveBeenCalled();
        expect(readFileSyncMock).not.toHaveBeenCalled();
    });

    test('relative path is resolved against process.cwd()', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(mockXml);

        resolveMetadata(relativeMetadataPath);

        expect(existsSyncMock).toHaveBeenCalledWith(join(mockCwd, relativeMetadataPath));
        expect(readFileSyncMock).toHaveBeenCalledWith(join(mockCwd, relativeMetadataPath), 'utf-8');
    });

    test('absolute path is used as-is', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(mockXml);

        resolveMetadata(absoluteMetadataPath);

        expect(existsSyncMock).toHaveBeenCalledWith(absoluteMetadataPath);
        expect(readFileSyncMock).toHaveBeenCalledWith(absoluteMetadataPath, 'utf-8');
    });

    test('throws when file does not exist', () => {
        existsSyncMock.mockReturnValue(false);

        expect(() => resolveMetadata(relativeMetadataPath)).toThrow(
            `Metadata file not found: ${join(mockCwd, relativeMetadataPath)}`
        );
    });

    test('throws when file cannot be read', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockImplementation(() => {
            throw new Error('permission denied');
        });

        expect(() => resolveMetadata(relativeMetadataPath)).toThrow(
            `Failed to read metadata file: ${join(mockCwd, relativeMetadataPath)}. permission denied`
        );
    });
});

describe('resolveEntityData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('inline array is returned as-is without file resolution', () => {
        const result = resolveEntityData(mockEntityData);
        expect(result).toBe(mockEntityData);
        expect(existsSyncMock).not.toHaveBeenCalled();
        expect(readFileSyncMock).not.toHaveBeenCalled();
    });

    test('relative path is resolved against process.cwd()', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(JSON.stringify(mockEntityData));

        const result = resolveEntityData(relativeEntityDataPath);

        expect(existsSyncMock).toHaveBeenCalledWith(join(mockCwd, relativeEntityDataPath));
        expect(readFileSyncMock).toHaveBeenCalledWith(join(mockCwd, relativeEntityDataPath), 'utf-8');
        expect(result).toEqual(mockEntityData);
    });

    test('absolute path is used as-is', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(JSON.stringify(mockEntityData));

        resolveEntityData(absoluteEntityDataPath);

        expect(existsSyncMock).toHaveBeenCalledWith(absoluteEntityDataPath);
        expect(readFileSyncMock).toHaveBeenCalledWith(absoluteEntityDataPath, 'utf-8');
    });

    test('throws when file does not exist', () => {
        existsSyncMock.mockReturnValue(false);

        expect(() => resolveEntityData(relativeEntityDataPath)).toThrow(
            `Entity data file not found: ${join(mockCwd, relativeEntityDataPath)}`
        );
    });

    test('throws when file cannot be read or parsed', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue('not valid json');

        expect(() => resolveEntityData(relativeEntityDataPath)).toThrow(
            `Failed to read or parse entity data file: ${join(mockCwd, relativeEntityDataPath)}`
        );
    });
});

describe('resolveExternalServices', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('resolves metadata for each service entry', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(mockXml);

        const services = [
            { type: 'value-list' as const, target: 'Entity/Prop', metadata: relativeMetadataPath, path: '/sap/vh/' },
            { type: 'code-list' as const, collectionPath: 'Units', metadata: mockXml, path: '/sap/common/' }
        ];

        const result = resolveExternalServices(services);

        expect(result[0].metadata).toBe(mockXml);
        expect(result[1].metadata).toBe(mockXml);
        expect(existsSyncMock).toHaveBeenCalledTimes(1);
    });

    test('resolves entityData file path to parsed array', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockImplementation((path: string) =>
            path.endsWith('.json') ? JSON.stringify(mockEntityData) : mockXml
        );

        const services = [
            {
                type: 'value-list' as const,
                target: 'Entity/Prop',
                metadata: mockXml,
                path: '/sap/vh/',
                entityData: relativeEntityDataPath
            }
        ] as any;

        const result = resolveExternalServices(services);

        expect(result[0].entityData).toEqual(mockEntityData);
    });

    test('passes through inline entityData array unchanged', () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(mockXml);

        const services = [
            {
                type: 'value-list' as const,
                target: 'Entity/Prop',
                metadata: mockXml,
                path: '/sap/vh/',
                entityData: mockEntityData
            }
        ] as any;

        const result = resolveExternalServices(services);

        expect(result[0].entityData).toBe(mockEntityData);
    });
});
