import { HttpRequest, HttpResponse } from 'mockserver-client';

export interface HttpRequestAndHttpResponse {
    httpRequest?: HttpRequest;
    httpResponse?: HttpResponse;
    timestamp?: string;
}

export type BodyType =
    | 'BINARY'
    | 'JSON'
    | 'JSON_SCHEMA'
    | 'JSON_PATH'
    | 'PARAMETERS'
    | 'REGEX'
    | 'STRING'
    | 'XML'
    | 'XML_SCHEMA'
    | 'XPATH';

export interface Body {
    type: BodyType;
    not?: boolean;
}

export interface XmlBody extends Body {
    xml: string;
}

export interface BinaryBody extends Body {
    base64Bytes: string;
}
