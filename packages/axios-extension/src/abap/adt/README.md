### Background

ADT services may or may not be available on depending on the ABAP version.
ADT provides a discovery service that responds with ADT service schema, 
which contains availability for ADT services.

### Motivation

Before requesting an ADT service, ADT service schema should be checked to find
out the ADT service availability and service contract
(e.g. available response content types supported by ABAP backend).

We use two decorators to minimize this repeated effort to check ADT schema in the code. Please
see the Usage section below for details.

### Usage

ADT decorator is simple to use. Currently it can be used for methods that 
implement ADT service requests in [AbapServiceProvider](../abap-service-provider.ts) class.
The following use the getAtoInfo() method as an example. 

First, you add `@adt` decorator to the method. This decorator takes the url path of the ADT
service as an input parameter. The url path is used to uniquely identify the ADT service in the schema.
The url path can be defined as a constant in [supportedServices.ts](./supportedServices.ts),
this helps code maintenance in case the service url is changed in the future.

```javascript
import { AdtServices } from './adt/supportedServices'

@adt(AdtServices.ATO_SETTINGS)
public async getAtoInfo() {
    ...
}
```

The `@adt` decorator is responsible to fetch the full ADT schema by calling discovery service if
there is no ADT schema cached previously. It makes sure ADT schema is available locally before
calling the actual ADT request in `getAtoInfo()`. The schema store is defined in AbapServiceProvider,
so it is possible to write one extra line of code in `getAtoInfo()` to obtain the schema of ATO_SETTINGS service.

```javascript
const serviceSchema: AdtCollection = this.getSchemaStore().getAdtCollection(AdtServices.ATO_SETTINGS);
```

We further simplify the usage to avoid writing the line above in every ADT method by using a decorated parameter
`@adtSchema`. To use this decorator, you provide the `serviceSchema` as an optional parameter in `getAtoInfo()` and
decorate this parameter with `@adtSchema`. This parameter doesn't need to be provided when calling the `getAtoInfo()`
method, instead it will be automatically filled during execution of `@adt` decorator. I.e. 
As developer of method `getAtoInfo()`, one doesn't need
to take care of fetching ADT schema and find the schema for the service. Instead, the developer can safely 
access the decorated parameter `serviceSchema` or assume the ADT service is not available on the ABAP backend
if `serviceSchema` is undefined.

```javascript
@adt(AdtServices.ATO_SETTINGS)
public async getAtoInfo(
    ...,
    @adtSchema serviceSchema?: AdtCollection,
    ...
): Promise<AtoSettings> {
    ...
}
```

Complete code example as following.

```javascript
import { AdtServices } from './adt'

@adt(AdtServices.ATO_SETTINGS)
public async getAtoInfo(
    ..., // Developer can define parameters required by the service
    @adtSchema schema?: AdtCollection, // parameter decorated with @adtSchema will
                                       // be auto filled with schema data for ATO_SETTING service
    ...
): Promise<AtoSettings> {
    // If schema doesn't exist, this service is not available on
    // the target ABAP backend
    if (!schema) {
        this.atoSettings = {};
        return this.atoSettings;
    } 
    
    if (!this.atoSettings) {
        try {
            // Use schema for version specific handling. E.g. Find out the http 
            // resonse data content types supported by the backend.
            // Choose the one you want to use and set the Accept header.
            const acceptHeaderValue = schema.accept.find((accept) => accept.includes('xml'));
            const acceptHeaders = {
                headers: {
                    Accept: acceptHeaderValue ?? 'application/*'
                }
            };
            const response = await this.get(url, acceptHeaders);
            this.atoSettings = parseAtoResponse(response.data);
        } catch (error) {
            this.atoSettings = {};
            throw error;
        }
    }
    return this.atoSettings;
}
```