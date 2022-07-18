### Background

ADT services may or may not be available on depending on the ABAP version.
ADT provides a discovery service that responds with ADT service schema, 
which contains availability for ADT services.


### ADT Service Implementation

A lazy loading strategy is used for fetching Adt discovery schema. I.e. The discovery request is sent
when the first time an ADT service request is triggered. 
To implement ADT services with this lazy loading, developer needs to make sure to call the getServiceDefinition() function in 
AdtCatalogService to fetch the service schema for the ADT service to be implemented. E.g.

```javascript
    public async getAtoInfo(): Promise<AtoSettings> {
        const serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
            AdtServiceConfigs[AdtServiceName.AtoSettings]
        );

        ...     
    }
```

getServiceDefinition() is implemented so that it checks if ADT discovery schema has been cached
locally. If not, it fetches the schema from backend and cache it locally.


Developer is then responsible to handle the cases if the service schema is not found:

```javascript
    public async getAtoInfo(): Promise<AtoSettings> {
        const serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
            AdtServiceConfigs[AdtServiceName.AtoSettings]
        );

        ...

        // Handling ATO settings service is not available on the target ABAP backend version
        if (!serviceSchema) {
            this.atoSettings = {};
            return this.atoSettings;
        }
    }
```

And developer should make sure the correct service url is based for the target backend version.
Service url is available in the href property:

```javascript
    public async getAtoInfo(): Promise<AtoSettings> {
        const serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
            AdtServiceConfigs[AdtServiceName.AtoSettings]
        );

        ...
        // Use the service url specified in the discover schema
        const response = await this.get(serviceSchema.href, acceptHeaders);
    }
```