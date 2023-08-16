export const enum ApiEndpoints {
    FRAGMENT = './adp/api/fragment',
    CONTROLLER = './adp/api/controller',
    MANIFEST_APP_DESCRIPTOR = '/adp/api/manifest'
}

export const enum RequestMethod {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    PATCH = 'PATCH',
    DELETE = 'DELETE'
}

type Fragments = { fragmentName: string }[];

export interface FragmentsResponse {
    fragments: Fragments;
    filteredFragments: Fragments;
    message: string;
}

/**
 * @description Class responsible for sending requests from client to the server
 */
export default class ApiRequestHandler {
    /**
     * @description Requests a given endpoint
     * @param endpoint API Endpoint
     * @param method RequestMethod
     * @param data Data to be sent to the server
     */
    private static async request<T>(endpoint: ApiEndpoints, method: RequestMethod, data?: unknown): Promise<T> {
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
                throw new Error(`Request failed, status: ${response.status}.`);
            }

            switch (method) {
                case RequestMethod.GET:
                    return response.json();
                case RequestMethod.POST:
                    /**
                     * Since POST usually creates something
                     * and returns nothing (or a message) we just parse the text from res.send(msg)
                     */
                    return response.text() as T;
                default:
                    return response.json();
            }
        } catch (e) {
            throw new Error(e.message);
        }
    }

    /**
     * Retrieves all XML fragments from the project's workspace
     */
    public static async getFragments<T>(): Promise<T> {
        return this.request<T>(ApiEndpoints.FRAGMENT, RequestMethod.GET);
    }

    /**
     * Writes an XML fragment to the project's workspace
     * @param data Data to be send to the server
     */
    public static async writeFragment<T>(data: T): Promise<T> {
        return this.request<T>(ApiEndpoints.FRAGMENT, RequestMethod.POST, data);
    }

    /**
     * Retrieves all JS controllers from the project's workspace
     */
    public static async getControllers<T>(): Promise<T> {
        return this.request<T>(ApiEndpoints.CONTROLLER, RequestMethod.GET);
    }

    /**
     * Writes a JS Controller to the project's workspace
     * @param data Data to be send to the server
     */
    public static async writeController<T>(data: T): Promise<T> {
        return this.request<T>(ApiEndpoints.FRAGMENT, RequestMethod.POST, data);
    }

    /**
     * Retrieves manifest.appdescr_variant from the project's workspace
     */
    public static async getManifestAppdescr<T>(): Promise<T> {
        return this.request<T>(ApiEndpoints.MANIFEST_APP_DESCRIPTOR, RequestMethod.GET);
    }
}
