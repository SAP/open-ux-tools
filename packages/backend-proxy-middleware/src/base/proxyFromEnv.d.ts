import * as proxyFromEnv from 'proxy-from-env';

declare module 'proxy-from-env' {
    function shouldProxy(hostname: string, port: number): boolean;
}
