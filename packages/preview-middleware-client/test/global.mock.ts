/**
 * A list of mocks prepared before each test file execution start.
 * This file is executed before each test file. Here you can register test hooks
 * like beforeEach etc.
 */

import { showLocalizedMessage } from '../src/utils/localized-message';

jest.mock('../src/utils/localized-message', () => ({
  showLocalizedMessage: jest.fn().mockResolvedValue(undefined),
}));

const showLocalizedMessageMock = showLocalizedMessage as jest.Mock;

beforeEach(() => {
  // Clear mock history.
  showLocalizedMessageMock.mockClear();
});