import type { AxiosError, AxiosRequestConfig } from 'axios';
export * from './base/odata-service';
export * from './base/service-provider';
export * from './abap';
export * from './factory';
export * from './auth';

export { AxiosError, AxiosRequestConfig };

/**
 * Casts an unknown error to an AxiosError.
 *
 * @param e unknown error
 * @returns exception casted to AxiosError if it is one
 */
export function isAxiosError(e: unknown): e is AxiosError {
    return typeof e === 'object' && e !== null && 'isAxiosError' in e;
}
