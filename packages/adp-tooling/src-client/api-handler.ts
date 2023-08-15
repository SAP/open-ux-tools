export const enum ApiEndpoints {
    FRAGMENT = './adp/api/fragment',
    CONTROLLER = './adp/api/controller'
}

export const enum RequestMethod {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    PATCH = 'PATCH',
    DELETE = 'DELETE'
}

export interface FragmentsResponse {
    fragments: string[];
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
    private static async request<T>(endpoint: ApiEndpoints, method: RequestMethod, data?: any): Promise<T> {
        const config: RequestInit = {
            method,
            body: JSON.stringify(data),
            headers: {
                'content-type': 'application/json'
            }
        };

        try {
            const response: Response = await fetch(endpoint, config);

            return response.json();
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
}
