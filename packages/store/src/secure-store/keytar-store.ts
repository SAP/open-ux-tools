// import type { SecureStore } from './types';
// import type * as Keytar from 'keytar';
// import type { Logger } from '@sap-ux/logger';
// import { errorString } from '../utils';

// type Entities<T> = {
//     [key: string]: T;
// };

// export class KeytarStore implements SecureStore {
//     private readonly log: Logger;
//     private readonly keytar: typeof Keytar;

//     constructor(log: Logger, keytar: typeof Keytar) {
//         console.log("------------- keytar store constructor ------------- ");
//         this.log = log;
//         this.keytar = keytar;
//     }

//     public async save<T>(service: string, key: string, value: T): Promise<boolean> {
//         try {
//             const serialized = JSON.stringify(value);
//             await this.keytar.setPassword(service, key, serialized);
//             return true;
//         } catch (e) {
//             this.log.error(`Error saving to secure store. Service: [${service}], key: [${key}]`);
//             this.log.error(errorString(e));
//             return false;
//         }
//     }

//     public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
//         try {
//             const serializedValue = await this.keytar.getPassword(service, key);
//             console.log("------------- keytar store constructor retrieve", service, "result",  serializedValue && JSON.parse(serializedValue));
//             return serializedValue && JSON.parse(serializedValue);
//         } catch (e) {
//             this.log.error(`Error retrieving from secure store. Service: [${service}], key: [${key}]`);
//             this.log.error(errorString(e));
//             return undefined;
//         }
//     }

//     public async delete(service: string, key: string): Promise<boolean> {
//         try {
//             return await this.keytar.deletePassword(service, key);
//         } catch (e) {
//             this.log.error(`Error deleting from secure store. Service: [${service}], key: [${key}]`);
//             this.log.error(errorString(e));
//             return false;
//         }
//     }

//     public async getAll<T>(service: string): Promise<Entities<T>> {
//         try {
//             return (await this.keytar.findCredentials(service)).reduce((result, entry) => {
//                 try {
//                     result[String(entry.account)] = JSON.parse(entry.password);
//                     //console.log("------------- keytar store constructor rror getting values for service ", service, "result", result);
//                     console.log("---result", JSON.stringify(result, null,2));
//                 } catch (e) {
//                     this.log.error(`Error parsing credentials for [${entry.account}]`);
//                     console.log("------------- keytar store constructor rror getting values for service ", service, e);
//                 }
//                 return result;
//             }, {} as Entities<T>);
//         } catch (e) {
//             this.log.error(`Error getting values for service: [${service}]`);
//             this.log.error(errorString(e));
//             return {};
//         }
//     }
// }
