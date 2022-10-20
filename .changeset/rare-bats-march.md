---
'@sap-ux/axios-extension': minor
---

- Added ADT service for create transport request
- Modified API to query ADT service. Now ADT services are obtained by calling the following getAdtService() method. E.g.
    const transportRequestSerivce = abapServiceProvider.getAdtService<TransportRequestService>(TransportRequestService);
    transportRequestSerivce.getTransportRequestList(...);
- Modified API for AbapServiceProvider APIs:
    ui5AbapRepository() > getUi5AbapRepository()
    appIndex() > getAppIndex()
    layeredRepository() > getLayeredRepository()
