const btpUtils = jest.requireActual('@sap-ux/btp-utils');

module.exports = {
    ...btpUtils,
    isAppStudio: jest.fn().mockReturnValue(false),
    isAbapSystem: jest.fn().mockReturnValue(true),
    listDestinations: jest.fn()
};
