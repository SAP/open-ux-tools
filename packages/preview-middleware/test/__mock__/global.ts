import { jest } from '@jest/globals';

export const fetchMock = jest.fn<() => Promise<any>>();

global.fetch = fetchMock;
