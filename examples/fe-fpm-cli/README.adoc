# Example: CLI using Axios OData

This project contains scripts to fetch OData metadata and annotations by using the `@sap-ux/axios-extension` and `@sap-ux/btp-utils` modules with real environments. It also contains scripts showing how to work with the layered repository service and the ADT services.

## Usage
Create a `.env` folder in this project (all its content is ignored by git) and in there create the `.env/env.properties` file that is used for credentials and other configurions for running the manual tests.

### Local Test With SAP System
Define the test url (`TEST_SYSTEM`) and optionally test user (`TEST_USER`) and password (`TEST_PASSWORD`) in the `.env/env.properties` file, e.g.
```
TEST_SYSTEM=https://my-test-system.example
TEST_USER=MY_TEST_USER
TEST_PASSWORD=MY_SECRET
```

And, then run
```bash
pnpm start abap
```

### Local Test with ABAP Environment on SAP BTP
Copy the service key of your ABAP environment on SAP BTP to the `.env` folder and then add the path (`TEST_SERVICE_INFO_PATH`) to it in the `.env/env.properties` file, e.g.
```
TEST_SERVICE_INFO_PATH=./.env/XYZ_KEYS.json
```

And, then run
```bash
pnpm start btp
```

### Local Test with Cloud ABAP Environment (Embedded Steampunk)
Copy the URL of the Cloud ABAP system and add it to the `.env/env.properties` file:
```
TEST_SYSTEM=https://my-sap-cloud-system.example
```

And, then run
```bash
pnpm start cloud
```

### Test in AppStudio With Destination
Define the test destination (`TEST_DESTINATION`) and optionally test user (`TEST_USER`) and password (`TEST_PASSWORD`) in the `.env/env.properties` file, e.g.
```
TEST_SYSTEM=MY_DESTINATION
TEST_USER=MY_TEST_USER
TEST_PASSWORD=MY_SECRET
```

And, then run
```bash
pnpm start
```

Note: you don't have to define whether the destination is an ABAP environment on SAP BTP or an on-premise ABAP system because in both cases the destination service is utilized as proxy.

### Run a different test activity
You can also run a different test with any of the previously explained environments by adding the name of one of the following activities to your command e.g. `pnpm start abap dta` to run a test deployment of an adaptation project with an ABAP environment.

#### odata
The default activity

### dta
Deploy an adaptation project to the target environment. The configuration requires the additional properties `TEST_ZIP` and `TEST_NAMESPACE` the optional `TEST_PACKAGE` and `TEST_TRANSPORT`. If `TEST_PACKAGE` is undefined then `$TMP` will be used and no transport is required e.g.
```
TEST_ZIP=./.env/webapp.zip
TEST_NAMESPACE=apps/sap.my.existing.app/appVariants/my.custom.dta.project.id/
```

### adt
Fetch available transport request for a given package and application name. The configuration requires the additional properties `TEST_PACKAGE` and `TEST_APP` e.g.
```
TEST_PACKAGE=Z_OPENUX
TEST_APP=my.custom.app
```