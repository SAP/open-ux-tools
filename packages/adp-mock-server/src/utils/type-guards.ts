import { BinaryBody, Body } from '../types';

const ZIP_CONTENT_TYPE = 'application/zip';

export function isBodyType(body: unknown): body is Body {
    return typeof body === 'object' && body !== null && 'type' in body && typeof body.type === 'string';
}

export function isBinaryBody(body: unknown): body is BinaryBody {
    return isBodyType(body) && body.type === 'BINARY' && typeof (body as any).base64Bytes === 'string';
}

export function isZipBody(body: unknown): body is BinaryBody {
    return (
        isBodyType(body) &&
        body.type === 'BINARY' &&
        typeof (body as any).base64Bytes === 'string' &&
        (body as any).contentType === ZIP_CONTENT_TYPE
    );
}
