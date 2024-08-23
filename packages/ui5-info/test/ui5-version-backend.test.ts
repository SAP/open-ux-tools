import axios from 'axios';
import { getSapSystemUI5Version } from '../src';

describe('Get UI5 Version used on backend ABAP system', () => {
    it('Test getSapSystemUI5Version - host is undefined', async () => {
        const version = await getSapSystemUI5Version('');
        expect(version).toBeFalsy();
    });

    it('Test getSapSystemUI5Version - host is provided', async () => {
        jest.spyOn(axios, 'get').mockReturnValueOnce({ status: 200, data: { Version: '1.80.2' } } as any);
        const version = await getSapSystemUI5Version('http://abc.com:8080');
        expect(version).toEqual('1.80.2');
    });

    it('Test getSapSystemUI5Version - successful query with invalid response data', async () => {
        jest.spyOn(axios, 'get').mockReturnValueOnce({
            status: 200,
            data: 'Error message with 200 status code'
        } as any);
        const version = await getSapSystemUI5Version('http://abc.com:8080');
        expect(version).toBeFalsy();
    });

    it('Test getSapSystemUI5Version - version query fail', async () => {
        jest.spyOn(axios, 'get').mockReturnValueOnce({ status: 403 } as any);
        const version = await getSapSystemUI5Version('http://abc.com:8080');
        expect(version).toBeFalsy();
    });
});
