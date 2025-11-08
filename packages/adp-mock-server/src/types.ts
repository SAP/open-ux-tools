import { HttpRequest, HttpResponse, Expectation as MockServerExpectation } from 'mockserver-client';
import { HttpRequestAndHttpResponse as MockServerHttpRequestAndHttpResponse } from 'mockserver-client/mockServer';

export type HttpRequestAndHttpResponse = Omit<MockServerHttpRequestAndHttpResponse, 'httpRequest' | 'httpResponse'> & {
    httpRequest?: HttpRequest;
    httpResponse?: HttpResponse;
};

export type Expectation = Omit<MockServerExpectation, 'httpRequest'> & { httpRequest?: HttpRequest };

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
