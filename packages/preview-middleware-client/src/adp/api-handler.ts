import type { Layer } from 'sap/ui/fl';
import { getError } from '../utils/error';

export const enum ApiEndpoints {
    CHANGES = '/preview/api/changes',
    FRAGMENT = '/adp/api/fragment',
    CONTROLLER = '/adp/api/controller',
    CODE_EXT = '/adp/api/code_ext',
    ANNOTATION_FILE = '/adp/api/annotation',
    MANIFEST_APP_DESCRIPTOR = '/manifest.appdescr_variant'
}

export const enum RequestMethod {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    PATCH = 'PATCH',
    DELETE = 'DELETE'
}

export type Fragments = { fragmentName: string }[];
export type Controllers = { controllerName: string }[];
type ResponseMessage = { message?: string };

export interface FragmentsResponse {
    fragments: Fragments;
    message: string;
}

export interface CodeExtResponse {
    controllerExists: boolean;
    controllerPath: string;
    controllerPathFromRoot: string;
    isRunningInBAS: boolean;
    isTsSupported: boolean;
}

export interface AnnotationFileDetails {
    annotationExistsInWS: boolean;
    annotationPath: string;
    annotationPathFromRoot: string | undefined;
}

export interface AnnotationDataSourceMap {
    [key: string]: { serviceUrl: string; annotationDetails: AnnotationFileDetails; metadataReadErrorMsg: string };
}

export interface AnnotationDataSourceResponse {
    isRunningInBAS: boolean;
    annotationDataSourceMap: AnnotationDataSourceMap;
}
export interface ControllersResponse {
    controllers: Controllers;
    message: string;
}

export interface ManifestAppdescr {
    fileName: string;
    layer: Layer;
    fileType: string;
    reference: string;
    id: string;
    namespace: string;
    version: string;
    content: object[];
}

/**
 * Requests a given endpoint
 *
 * @param endpoint API Endpoint
 * @param method RequestMethod
 * @param data Data to be sent to the server
 * @returns Data from the server request
 */
export async function request<T>(endpoint: ApiEndpoints, method: RequestMethod, data?: unknown): Promise<T> {
    const config: RequestInit = {
        method,
        body: JSON.stringify(data),
        headers: {
            'content-type': 'application/json'
        }
    };

    try {
        const response: Response = await fetch(endpoint, config);

        if (!response.ok) {
            const errorData = (await response.json()) as ResponseMessage;
            const message = errorData?.message ? ` Server message: ${errorData.message}.` : '';
            throw new Error(`Request failed, status: ${response.status}.${message}`);
        }

        switch (method) {
            case RequestMethod.GET:
                return response.json() as T;
            case RequestMethod.POST:
                /**
                 * Since POST usually creates something
                 * and returns nothing (or a message) we just parse the text from res.send(msg)
                 */
                return response.text() as T;
            default:
                return response.json() as T;
        }
    } catch (e) {
        throw getError(e);
    }
}

/**
 * Retrieves all XML fragments from the project's workspace
 *
 * @returns Generic Promise<T>
 */
export async function getFragments(): Promise<FragmentsResponse> {
    return request<FragmentsResponse>(ApiEndpoints.FRAGMENT, RequestMethod.GET);
}

/**
 * Writes an XML fragment to the project's workspace
 *
 * @param data Data to be send to the server
 * @returns Generic Promise<T>
 */
export async function writeFragment<T>(data: T): Promise<T> {
    return request<T>(ApiEndpoints.FRAGMENT, RequestMethod.POST, data);
}

/**
 * Retrieves manifest.appdescr_variant from the project's workspace
 *
 * @returns Generic Promise<T>
 */
export async function getManifestAppdescr(): Promise<ManifestAppdescr> {
    return request<ManifestAppdescr>(ApiEndpoints.MANIFEST_APP_DESCRIPTOR, RequestMethod.GET);
}

/**
 * Retrieves all controller extensions from the project's workspace
 *
 * @returns Generic Promise<T>
 */
export async function readControllers<T>(): Promise<T> {
    return request<T>(ApiEndpoints.CONTROLLER, RequestMethod.GET);
}

/**
 * Writes a Controller to the project's workspace
 *
 * @param data Data to be send to the server
 * @returns Generic Promise<T>
 */
export async function writeController<T>(data: T): Promise<T> {
    return request<T>(ApiEndpoints.CONTROLLER, RequestMethod.POST, data);
}

/**
 * Writes a new annotation file to the project's workspace
 *
 * @returns Generic Promise<DataSourceAnnotationMap>
 */
export async function getDataSourceAnnotationFileMap(): Promise<AnnotationDataSourceResponse> {
    return request<AnnotationDataSourceResponse>(ApiEndpoints.ANNOTATION_FILE, RequestMethod.GET);
}

/**
 * Checks for existing controller in the project's workspace
 *
 * @param controllerName Name of the controller
 * @returns {CodeExtResponse} Returns path to existing controller if found
 */
export async function getExistingController(controllerName: string): Promise<CodeExtResponse> {
    const params = new URLSearchParams({ name: controllerName });
    const url = `${ApiEndpoints.CODE_EXT}?${params.toString()}` as ApiEndpoints;
    return request<CodeExtResponse>(url, RequestMethod.GET);
}

/**
 * Writes a change object to the project's workspace
 *
 * @param data Data to be send to the server
 * @returns Generic Promise<T>
 */
export async function writeChange<T>(data: T): Promise<T> {
    return request<T>(ApiEndpoints.CHANGES, RequestMethod.POST, { change: data });
}
