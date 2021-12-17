export interface ServiceInfo {
    uaa: {
        clientid: string;
        clientsecret: string;
        url: string;
        username?: string;
        password?: string;
    };
    url: string;
    catalogs: {
        abap: {
            path: string;
            type: string;
        };
    };
    systemid?: string;
}
