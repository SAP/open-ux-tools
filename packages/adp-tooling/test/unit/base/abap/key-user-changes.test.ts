import { jest } from '@jest/globals';

const mockGetConfiguredProvider = jest.fn<any>();

jest.unstable_mockModule('../../../../src/abap/provider', () => ({
    getConfiguredProvider: mockGetConfiguredProvider
}));

const { fetchKeyUserChanges } = await import('../../../../src/base/abap/key-user-changes.js');

function makeLrep(overrides: Record<string, any> = {}) {
    return {
        getFlexVersions: jest.fn<any>().mockResolvedValue({ versions: [{ versionId: '1' }] }),
        listAdaptations: jest.fn<any>().mockResolvedValue({ adaptations: [{ id: 'DEFAULT' }] }),
        getKeyUserData: jest.fn<any>().mockResolvedValue({ contents: [{ changeType: 'addFields' }] }),
        ...overrides
    };
}

function makeProvider(lrep: ReturnType<typeof makeLrep>) {
    return {
        isAbapCloud: jest.fn<any>().mockResolvedValue(undefined),
        getLayeredRepository: jest.fn<any>().mockReturnValue(lrep)
    };
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;

describe('fetchKeyUserChanges', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns key user change contents on happy path', async () => {
        const lrep = makeLrep();
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        const result = await fetchKeyUserChanges({ system: 'SYS', application: 'app.id', logger: mockLogger });

        expect(result).toEqual([{ changeType: 'addFields' }]);
        expect(lrep.getFlexVersions).toHaveBeenCalledWith('app.id');
        expect(lrep.listAdaptations).toHaveBeenCalledWith('app.id', '1');
        expect(lrep.getKeyUserData).toHaveBeenCalledWith('app.id', 'DEFAULT');
    });

    test('skips draft version (versionId 0) and uses second version', async () => {
        const lrep = makeLrep({
            getFlexVersions: jest.fn<any>().mockResolvedValue({
                versions: [{ versionId: '0' }, { versionId: '2' }]
            })
        });
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        await fetchKeyUserChanges({ system: 'SYS', application: 'app.id', logger: mockLogger });

        expect(lrep.listAdaptations).toHaveBeenCalledWith('app.id', '2');
    });

    test('throws when no adaptations found', async () => {
        const lrep = makeLrep({
            listAdaptations: jest.fn<any>().mockResolvedValue({ adaptations: [] })
        });
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        await expect(fetchKeyUserChanges({ system: 'SYS', application: 'app.id', logger: mockLogger })).rejects.toThrow(
            'No adaptations found'
        );
    });

    test('throws when DEFAULT adaptation not found among existing adaptations', async () => {
        const lrep = makeLrep({
            listAdaptations: jest.fn<any>().mockResolvedValue({
                adaptations: [{ id: 'CUSTOM_1' }, { id: 'CUSTOM_2' }]
            })
        });
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        await expect(fetchKeyUserChanges({ system: 'SYS', application: 'app.id', logger: mockLogger })).rejects.toThrow(
            'No DEFAULT adaptation found'
        );
    });

    test('passes undefined activeVersion to listAdaptations when versions array is empty', async () => {
        const lrep = makeLrep({
            getFlexVersions: jest.fn<any>().mockResolvedValue({ versions: [] })
        });
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        await fetchKeyUserChanges({ system: 'SYS', application: 'app.id', logger: mockLogger });

        expect(lrep.listAdaptations).toHaveBeenCalledWith('app.id', undefined);
    });

    test('forwards credentials to getConfiguredProvider', async () => {
        const lrep = makeLrep();
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        await fetchKeyUserChanges({
            system: 'SYS',
            application: 'app.id',
            client: '200',
            username: 'admin',
            password: 'secret',
            logger: mockLogger
        });

        expect(mockGetConfiguredProvider).toHaveBeenCalledWith(
            { system: 'SYS', client: '200', username: 'admin', password: 'secret' },
            mockLogger
        );
    });

    test('calls logger.info with fetch count', async () => {
        const lrep = makeLrep();
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        await fetchKeyUserChanges({ system: 'SYS', application: 'app.id', logger: mockLogger });

        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('1 key user change'));
    });

    test('returns empty array when contents is undefined', async () => {
        const lrep = makeLrep({
            getKeyUserData: jest.fn<any>().mockResolvedValue({})
        });
        mockGetConfiguredProvider.mockResolvedValue(makeProvider(lrep));

        const result = await fetchKeyUserChanges({ system: 'SYS', application: 'app.id', logger: mockLogger });

        expect(result).toEqual([]);
    });
});
