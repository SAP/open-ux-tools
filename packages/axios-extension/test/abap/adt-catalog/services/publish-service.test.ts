import { PublishService } from '../../../../src';
import type { ODataServiceTechnicalDetails } from '../../../../src/abap/types';

describe('PublishService', () => {
    let service: PublishService;

    beforeEach(() => {
        service = new PublishService({} as any);
    });

    describe('getAdtCatagory', () => {
        it('should return the static adtCategory', () => {
            expect(PublishService.getAdtCatagory()).toEqual({
                scheme: 'http://www.sap.com/categories/servicebindings/bindingtypes',
                term: 'ODataV4'
            });
        });
    });

    describe('buildServiceBindingContent', () => {
        it('should build correct XML content', () => {
            const xml = (service as any).buildServiceBindingContent('SRV', 'BIND');
            expect(xml).toBe(
                '<?xml version="1.0" encoding="UTF-8"?><adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core"><adtcore:objectReference adtcore:type="SRV" adtcore:name="BIND"/></adtcore:objectReferences>'
            );
        });
    });

    describe('publish', () => {
        it('should call post and parseResponse, returning DATA', async () => {
            const responseData = `
            <asx:abap version="1.0"
            xmlns:asx="http://www.sap.com/abapxml">
            <asx:values>
                <DATA>
                <SEVERITY>OK</SEVERITY>
                <SHORT_TEXT>ZZ1UI_STATES_O4 published locally</SHORT_TEXT>
                <LONG_TEXT/>
                </DATA>
            </asx:values>
            </asx:abap>`;
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?><adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core"><adtcore:objectReference adtcore:type="SRV" adtcore:name="ZZ1UI_STATES_O4"/></adtcore:objectReferences>`;
            const postSpy = jest.spyOn(service, 'post').mockResolvedValue({ data: responseData });
            const result = await service.publish('SRV', 'ZZ1UI_STATES_O4');
            expect(postSpy).toHaveBeenCalledWith(
                '/publishjobs',
                mockContent,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/xml'
                    })
                })
            );
            expect(result).toEqual({ SEVERITY: 'OK', SHORT_TEXT: 'ZZ1UI_STATES_O4 published locally', LONG_TEXT: '' });
        });
    });

    describe('getODataV4ServiceUri', () => {
        it('should call get and parseResponse, returning serviceUrl', async () => {
            const technicalDetails: ODataServiceTechnicalDetails = {
                serviceName: 'ZZ1UI_COUNTRIES002',
                serviceDefinitionName: 'ZZ1UI_COUNTRIES002',
                serviceVersion: '0001'
            };
            const responseData = `<odatav4:serviceGroup odatav4:published="true" odatav4:serviceUrlPrefix="/sap/opu/odata4/sap/zz1ui_countries002/srvd/" adtcore:name="ZZ1UI_COUNTRIES002"
            xmlns:odatav4="http://www.sap.com/categories/odatav4"
            xmlns:adtcore="http://www.sap.com/adt/core">
            <odatav4:services odatav4:repositoryId="SRVD" odatav4:serviceId="ZZ1UI_COUNTRIES002" odatav4:serviceVersion="0001" odatav4:serviceUrl="/sap/opu/odata4/sap/zz1ui_countries002/srvd/sap/zz1ui_countries002/0001/" odatav4:annotationUrl="" odatav4:created="true">
                <serviceInfo:serviceInformation serviceInfo:name="ZZ1UI_COUNTRIES002" serviceInfo:version="0001"
                xmlns:serviceInfo="http://www.sap.com/categories/serviceinformation">
                <serviceInfo:collection serviceInfo:name="Countries" serviceInfo:isLeading="true" serviceInfo:isRoot="true"/>
                </serviceInfo:serviceInformation>
                <odatav4:applicationDetails odatav4:applicationState="NOT_DEPLOYED" odatav4:applicationDescription="Not deployed" odatav4:applicationId=""/>
            </odatav4:services>
            </odatav4:serviceGroup>`;
            const getSpy = jest.spyOn(service, 'get').mockResolvedValue({ data: responseData });
            const result = await service.getODataV4ServiceUri(technicalDetails);
            expect(getSpy).toHaveBeenCalledWith(
                '/ZZ1UI_COUNTRIES002',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Accept: 'application/vnd.sap.adt.businessservices.odatav4.v2+xml'
                    }),
                    params: {
                        servicename: 'ZZ1UI_COUNTRIES002',
                        serviceversion: '0001',
                        srvdname: 'ZZ1UI_COUNTRIES002'
                    }
                })
            );
            expect(result).toBe('/sap/opu/odata4/sap/zz1ui_countries002/srvd/sap/zz1ui_countries002/0001/');
        });
    });
});
