### Template Folder Structure

Template folders are organised to represent the composition of apps from template files and to ease the addition of new features by contributors by having a logical structure. Each folder name has a specific semantic based on the `TemplateType` or the service `OdataVersion`specified when calling the `generate` API. The folders are structured to represent the context in which the templates are applied.

**_common_** - Templates that are applied to all generated apps regardless of odata version or template type appear at the root `./templates`. If under a specific `TemplateType` or `OdataVersion` folder will apply only to those specific cases respectively. i.e. The context in which a template is used is directly related to the folder path.

**_`TemplateType`_** - Template type folders can appear under `./templates` or under a specific `OdataVersion` folder `./templates/v2` or `./templates/v4`. `TemplateType` folders (e.g. `ovp`) at the root `./templates` folder are applied to the specified template type, regardless of odata version. If they appear under an `OdataVersion` folder they will only apply when the specific `OdataVersion` service is used.

**_`OdataVersion`_** - Templates applied to specific odata versions, e.g. v2 or v4. Templates that should be applied to both would appear either under `./templates/common` or `./templates/<TemplateType>`

Within a folder specific files should mirror the output path. For example, `manifest.json` should appear under a parent `webapp` folder.

In addtiion, specific template files should appear under a folder  named `add` or `extend`. Template files appearing under an `add` folder will replace or add previously added files. Templates files appearing under an `extend` folder will insert the contents into existing files. Extension is currently restricted to json file templates.
