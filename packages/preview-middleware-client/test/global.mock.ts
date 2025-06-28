/**
 * A list of mocks prepared before each test file execution start.
 * This file is executed before each test file. Here you can register test hooks
 * like beforeEach etc.
 */

import { sendInfoCenterMessage } from '../src/utils/info-center-message';

jest.mock('../src/utils/info-center-message', () => ({
    sendInfoCenterMessage: jest.fn().mockResolvedValue(undefined),
}));

const sendInfoCenterMessageMock = sendInfoCenterMessage as jest.Mock;

beforeEach(() => {
    // Clear mock history.
    sendInfoCenterMessageMock.mockClear();
});
