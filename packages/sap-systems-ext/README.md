# SAP Saved Systems Extension

SAP Saved systems extension allows you to save the connection information for a remote system. This functionality provides faster authentication when using the system with SAP development tooling. The credentials are saved in the operating system secured storage, such as Credential Manager in Windows and Keychain in Mac.

---

## Create New SAP System
To create a new SAP system entry, you can:

Click the ➕ (Add) icon in the SAP Systems activity bar panel.
Or open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P) and select SAP: Add SAP System. You can then enter the systems details for either an ABAP On Premise or ABAP Environment (BTP) system. Once saved, the system will appear in the SAP Systems view for quick access.

---

## View SAP System Details

To see the stored system details, click a specific system entry in the SAP Systems panel or right-click and select **Show SAP System Details**.

---

## Test SAP System Connection

To test the connection of an existing SAP system, perform the following steps:

1. Open the details of a saved system.
2. Click **Test Connection**.
3. As a result, you’ll see if the system connection was successful and whether it supports OData V2 and/or OData V4 services.

---

## Edit SAP System Connection

To edit the connection details for an existing SAP system, perform the following steps:

1. Right-click the saved system name you wish to edit and click the **Show SAP System Details** button.

### For ABAP On Premise, update any of the following fields:

* System Name
* URL
* Client
* Username
* Password (optional)

### For ABAP Environment on SAP Business Technology Platform, update the following fields:

* **System Name:** editable
* **URL:** editable

Then:

1. Click on **Test Connection**.
2. Click **Save**.

---

## Delete SAP System Connection

1. Select the saved system you wish to delete.
2. Click the **🗑 (Delete)** icon next to the system name.
3. Click **Yes** in the confirmation dialogue box.

---

