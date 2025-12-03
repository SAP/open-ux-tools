import { once, omit } from 'lodash';
import { getLocal, Mockttp } from 'mockttp';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger';

export const getReplayServer = once(getReplayServerInternal);

async function getReplayServerInternal(): Promise<Mockttp> {
    const server = getLocal({ debug: false });

    const responses = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'mock-data', 'responses.json'), 'utf8'));

    await Promise.all(
        responses.map(({ httpRequest, httpResponse }: any) => {
            let mock;
            const stripPath = httpRequest.path.split('?')[0];
            const params = new URLSearchParams(httpRequest.path.split('?')[1]);
            const paramsObj = Object.fromEntries(params.entries());
            switch (httpRequest.method.toUpperCase()) {
                case 'GET':
                    mock = server.forGet(stripPath);
                    break;
                case 'POST':
                    mock = server.forPost(stripPath);
                    break;
                case 'PUT':
                    mock = server.forPut(stripPath);
                    break;
                case 'DELETE':
                    mock = server.forDelete(stripPath);
                    break;
                default:
                    break;
            }

            mock?.withQuery(paramsObj);

            // if (httpRequest.headers) {
            //     mock?.withHeaders(httpRequest.headers);
            // }

            if (httpRequest.body) {
                mock?.withBody(httpRequest.body);
            }

            // logger.info(`${stripPath} ${JSON.stringify(paramsObj)}`);
            // logger.info(JSON.stringify(omit(httpResponse, 'body')));

            return mock?.thenReply(httpResponse.statusCode, httpResponse.body || '');
        })
    );

    return server;
}
