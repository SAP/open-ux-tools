
- for Extracting Downloaded Files - Where would be an appropriate location to extract downloaded files? I’m considering extracting them to a temporary directory defined by:
const tempFilePath = join(homedir(), '.fioritools');
zip.extractAllTo(tempFilePath, true);
Once writing the app is auccessful, I plan to delete the directory. Does this approach sound reasonable, or do you have a better suggestion for a temporary extraction path?

- Service Metadata: say we have a service URL like:
https://ldciuia.wdf.sap.corp:44300/sap/opu/odata4/sap/test_service_bindings_07/srvd/sap/test_srvb_01/0001/ from extracted manifest json.
I’m assuming the metadata for this service will always be populated, this is a basic lrop app support correct - so I think its jst gna be an edmx project know? 

- When setting the project path, do we provide an option for the user to specify a name? And if a user selects a name that already exists, how should we handle that scenario? Should we prompt the user for a new name, or overwrite the existing one?

- sourceTemplates id

- services.entityConfig.mainEntity - I have double entitties

- questions about local uri - is it okay to use annotation file manager ?

- how to get annotations form v2 and v4 ? v2 vs v4

- ts or js enabled for tests ? does it matter?


// things to do - use zip.entries mem-fs and then then use fe writers and finally use the fs to modify some stuff - 
// get edmx https://ldciuia.wdf.sap.corp:44300/sap/opu/odata4/sap/test_service_bindings_07/srvd/sap/test_srvb_01/0001/$metadata



discussion with adp 
- 
