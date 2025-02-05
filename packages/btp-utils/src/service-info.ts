export interface ServiceInfo {
    uaa: {
        clientid: string;
        clientsecret: string;
        url: string;
        username?: string;
        password?: string;
    };
    /**
     * The full resolved cloud host instance url e.g. https://123bd07a-eda5-50bc-b11a-b1a7b88b632b.abap.somewhereaws.hanavlab.ondemand.com
     */
    url: string;
    catalogs: {
        abap: {
            path: string;
            type: string;
        };
    };
    systemid?: string;
}
