import { v4 as uuidv4 } from 'uuid';

import { getSupportForUI5Yaml } from '../../../../../src';

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mocked-uuid')
}));

jest.mock('../../../../../src/writer/project-utils.ts', () => ({
    getPackageJSONInfo: jest.fn(() => ({
        name: '@sap-ux/adp-tooling',
        version: '1.0.0'
    }))
}));

const uuidv4Mock = uuidv4 as jest.Mock;

describe('getSupportForUI5Yaml', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        uuidv4Mock.mockReset();
    });

    it('should return package info with a generated UUID when toolsId is not provided', () => {
        const result = getSupportForUI5Yaml();

        expect(result).toEqual({
            id: '@sap-ux/adp-tooling',
            version: '1.0.0',
            toolsId: 'mocked-uuid'
        });
        expect(uuidv4Mock).toHaveBeenCalled();
    });

    it('should return package info with the provided toolsId', () => {
        const toolsId = 'custom-tools-id';

        const result = getSupportForUI5Yaml(toolsId);

        expect(result).toEqual({
            id: '@sap-ux/adp-tooling',
            version: '1.0.0',
            toolsId
        });
        expect(uuidv4Mock).not.toHaveBeenCalled();
    });
});
