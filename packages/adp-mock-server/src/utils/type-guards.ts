import { HttpRequest } from 'mockserver-client';
import { BinaryBody, Body, XmlBody } from '../types';

export function isBodyType(body: unknown): body is Body {
    return typeof body === 'object' && body !== null && 'type' in body && typeof body.type === 'string';
}

export function isBinaryBody(body: unknown): body is BinaryBody {
    return isBodyType(body) && body.type === 'BINARY' && typeof (body as any).base64Bytes === 'string';
}

export function isXmlBody(body: unknown): body is XmlBody {
    return isBodyType(body) && body.type === 'XML' && typeof (body as any).xml === 'string';
}
