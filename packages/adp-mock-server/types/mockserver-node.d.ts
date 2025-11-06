declare module 'mockserver-node' {
    interface MockServerOptions {
        serverPort?: number;
        /**
         * Does not support https forwarding without client https forwarding.
         */
        proxyRemotePort?: number;
        proxyRemoteHost?: string;
        verbose?: boolean;
        trace?: boolean;
        jvmOptions?: string[];
    }

    export function start_mockserver(options?: MockServerOptions): Promise<void>;
    export function stop_mockserver(options?: MockServerOptions): Promise<void>;
}