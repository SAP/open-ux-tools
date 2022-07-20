### Background

ADT services may or may not be available on depending on the ABAP version.
ADT provides a discovery service that responds with ADT service schema, 
which contains availability for ADT services.


### ADT Service Implementation

The ADT service schema is lazily loaded. The first time an ADT service request is triggered, 
the initial schema discovery request is made.
To use an ADT service, make sure to call `getServiceDefinition()` in 
`AdtCatalogService` first to make sure the service schema is initialized correctly. E.g.

```javascript
    public async getAtoInfo(): Promise<AtoSettings> {
        let serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
            AdtServiceConfigs[AdtServiceName.AtoSettings]
        );

        ...     
    }
```

`getServiceDefinition()` is implemented so that it checks if ADT discovery schema has been cached
locally. If not, it fetches the schema from backend and cache it locally.

`getServiceDefinition()` validates `serviceSchema`, and it log a warning for invalid `serviceSchema` and throws
an error. Developer is then responsible to handle the cases if `serviceSchema` is not found:

```javascript
    public async getAtoInfo(): Promise<AtoSettings> {
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
                AdtServiceConfigs[AdtServiceName.AtoSettings]
            );
        } catch {
            // Service not available on target ABAP backend version, return empty setting config
            this.atoSettings = {};
            return this.atoSettings;
        }
    }
```

And developer should make sure the correct service url is used for the target backend version.
Service url is available in the href property of `serviceSchema`:

```javascript
    public async getAtoInfo(): Promise<AtoSettings> {
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
                AdtServiceConfigs[AdtServiceName.AtoSettings]
            );
        } catch {
            // Service not available on target ABAP backend version, return empty setting config
            this.atoSettings = {};
            return this.atoSettings;
        }

        ...
        // Use the service url specified in the discover schema
        const response = await this.get(serviceSchema.href, acceptHeaders);
    }
```