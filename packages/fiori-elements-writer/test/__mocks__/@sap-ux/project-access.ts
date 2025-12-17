// Manual mock for @sap-ux/project-access
const actual = jest.requireActual('@sap-ux/project-access');

module.exports = {
    ...actual,
    getSpecification: jest.fn().mockRejectedValue(new Error('Mocked - skip specification')),
    createApplicationAccess: jest.fn().mockResolvedValue({}),
    getListReportPage: jest.fn().mockReturnValue(null),
    getFilterFields: jest.fn().mockReturnValue([]),
    getTableColumns: jest.fn().mockReturnValue({})
};
