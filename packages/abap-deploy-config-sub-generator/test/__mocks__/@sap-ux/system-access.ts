const systemAccess = jest.requireActual('@sap-ux/system-access');

module.exports = {
    ...systemAccess,
    createAbapServiceProvider: jest.fn().mockResolvedValue({
        get: jest.fn().mockResolvedValue({}),
        getAdtService: jest.fn().mockResolvedValue({ listPackages: jest.fn().mockResolvedValue(['testPackage']) })
    } as any)
};
