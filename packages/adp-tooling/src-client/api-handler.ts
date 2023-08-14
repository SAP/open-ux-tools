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

export default class ApiRequestHandler {
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

    public static async getFragments<T>(): Promise<T> {
        return this.request<T>(ApiEndpoints.FRAGMENT, RequestMethod.GET);
    }

    public static async writeFragment<T>(data: T): Promise<T> {
        return this.request<T>(ApiEndpoints.FRAGMENT, RequestMethod.POST, data);
    }

    public static async getControllers<T>(): Promise<T> {
        return this.request<T>(ApiEndpoints.CONTROLLER, RequestMethod.GET);
    }

    public static async writeController<T>(data: T): Promise<T> {
        return this.request<T>(ApiEndpoints.FRAGMENT, RequestMethod.POST, data);
    }
}
