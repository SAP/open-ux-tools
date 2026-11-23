import { jest } from '@jest/globals';

export const fetchMock = jest.fn();

global.fetch = fetchMock;
