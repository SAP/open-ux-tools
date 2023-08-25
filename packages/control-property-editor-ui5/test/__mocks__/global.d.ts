import { jest } from 'jest';

declare global {
    interface Global {
        fetch: jest.Mock;
    }
}