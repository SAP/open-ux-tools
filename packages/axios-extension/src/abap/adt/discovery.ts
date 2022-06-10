import type { AbapServiceProviderExtension } from '../interface';
import XmlParser from 'fast-xml-parser';
import type { AdtSchemaData } from '../types';
import type { ServiceProvider } from 'index';
import 'reflect-metadata';
import type { AdtServices } from '.';

const ADT_DISCOVERY_URL_PATH = '/sap/bc/adt/discovery';

/**
 * If ADT schema is not loaded, send discovery request to backend to fetch the schema and cache it.
 * If ADT schema is already cached, no request is sent.
 *
 * @param target ServiceProvider instance
 */
async function checkOrLoadAdtDiscoverySchema(target: AbapServiceProviderExtension & ServiceProvider): Promise<void> {
    if (!target.getSchemaStore().isAdtSchemaEmpty()) {
        return;
    }

    const response = await target.get(ADT_DISCOVERY_URL_PATH, {
        headers: {
            Accept: 'application/*'
        }
    });

    const schemaData = parseAdtSchemaData(response.data);
    target.getSchemaStore().updateSchemaData(schemaData);
}

/**
 * @param xml Raw XML schema data from ADT discovery service response data
 * @returns
 */
function parseAdtSchemaData(xml: string): AdtSchemaData | null {
    if (XmlParser.validate(xml) !== true) {
        return null;
    }
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };
    const obj = XmlParser.getTraversalObj(xml, options);
    const parsed = XmlParser.convertToJson(obj, options);

    if (parsed.service) {
        return parsed;
    } else {
        return null;
    }
}

/**
 * Key for storing the index of parameter decorated by @adtSchema
 */
const adtSchemaParam = 'adtSchema';

/**
 * Implementation of @adt decorator. It makes sure ADT schema is available in the cache before calling methods it decorates.
 * If the decorated method has a parameter decorated by @adtSchema, this parameter will be filled with the service schema data
 * before calling the method.
 *
 * @param serviceUrlPath ADT service url path that uniquely identifies an AdtCollection (service schema) in ADT schema store
 *  It is passed to the decorator where decorator is used. E.g @adt('/sap/bc/adt/ato/settings')
 * @returns Decorator function that augments the original method implementation
 */
export const adt = (serviceUrlPath: AdtServices): Function => {
    return function decorator(target: any, functionName: string, descriptor: PropertyDescriptor): void {
        // original is the original method implementation decorated by @adt
        const original = descriptor.value;
        // @adt decorator is only for methods
        if (typeof original !== 'function') {
            return;
        }

        // Interceptor implementation that augments the original method implementation.
        // 'args' refer to the parameter list defined in the original method.
        async function interceptedMethod(...args: any[]): Promise<any> {
            await checkOrLoadAdtDiscoverySchema(this);
            // Find the schema for the input service url path
            const adtCollection = this.getSchemaStore().getAdtCollection(serviceUrlPath);
            // Get the parameter index for parameter decorated by @adtSchema
            const adtSchemaParamIndex = Reflect.getOwnMetadata(adtSchemaParam, target, functionName);
            // Automatically fill the @adtSchema parameter with the service schema
            args[adtSchemaParamIndex] = adtCollection;
            // Call original method decorated by @adt
            return original.apply(this, args);
        }

        descriptor.value = interceptedMethod;
    };
};

/**
 * Implements @adtSchema decorator. Record the index of paramter decorated by @adtSchema. Since
 * parameter decorator is executed before method decorator, it allows the recorded parameter index
 * to be propagated to @adt method decorator.
 *
 * @param target
 * @param propertyKey
 * @param parameterIndex Index of decorated parameter in the parameter list
 */
export const adtSchema = (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(adtSchemaParam, parameterIndex, target, propertyKey);
};
