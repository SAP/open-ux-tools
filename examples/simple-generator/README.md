# Example: Simple Yeoman Generator For Fiori Elements
A simplified example illustrating how to create a yeoman generator using the `fiori-elements-writer` and the `axios-extension`.

## Description
This example project contains a generator that asks a few simple questions and then uses the `@sap-ux/fiori-elements-writer` to generate a Fiori application. Additionally it generates a karma config for the project utilizing the [new mockserver middleware](https://www.npmjs.com/package/@sap/ux-ui5-fe-mockserver-middleware).

## Prerequisite
Before you can use the generator, you need to globally install `yo` and build the generator
```
npm install -g yo
pnpm build
```

## Usage
To start the generator execute `pnpm start` or `pnpm start --typescript` if you want to generate a typescript project.
On your local machine, when prompted, enter the request values e.g.
```
? **Application** name myapp
? **Template** List Report
? **Service url** https://sapes5.sapdevcenter.com/sap/opu/odata/sap/SEPMRA_PROD_MAN
? **Username** YOUR_USER
? **Password** *******
? **Main entity** SEPMRA_C_PD_Product
```

The project will be generated in a subfolder of `.tmp`.

If you are too lazy to type, you can also define some of the input defaults using a `.yo-rc.json` file in the root of this project e.g.
```json
{
    "@sap-ux/generator-simple-fe": {
        "url": "https://sapes5.sapdevcenter.com/sap/opu/odata/sap/SEPMRA_PROD_MAN",
        "username": "YOUR_USER",
        "entity": "SEPMRA_C_PD_Product"
    }
}
```