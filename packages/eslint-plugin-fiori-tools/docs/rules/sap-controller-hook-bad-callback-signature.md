# Controller hook documentation contains malformed callback signature (sap-controller-hook-bad-callback-signature)

The Controller hook documentation contains a malformed callback signature.

## Rule Details

The check includes:

- the type of the owner object is maintained
- the method name is equal to the method name of the hook call
- the parameters carry type information
- the number of parameters match (if there are no parameters the @param tag must not be present)
- the return type carries type information, if present. If there is no return type it's not required to document it.

This is checked at the actual location of the controller hook call, not its definition if there is one.
As a controller hook definition is not mandatory, these locations are not checked at all. If your comment is at the definition please move it to the location of the actual call.
The compatibility check relies on this information, therefore the priority is Very High.

## Bug Report

In case you detect an issue with the check please open a GitHub issue [here](https://github.tools.sap/FIORI-PIPELINE/fioriPipelinesGo/issues).

## Further Reading