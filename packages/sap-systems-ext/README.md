# Connection Manager for SAP Systems 

The connection manager for SAP systems enables you to store connection information for remote SAP systems. By saving your connection details, you can authenticate more quickly when working with SAP development tools. 

Your credentials are securely stored using your operating system's native credential management, such as Credential Manager in Windows and Keychain in macOS. 

> #### ℹ️ **Note**
> The password for an ABAP On Premise system connection is saved in the operating system's secured storage and follows the respective platform’s security policies:
>
> **Windows**  
> Credentials are securely stored in the **Windows Credential Manager** and are accessible to authorized processes while you are signed in.  
> For more information, see [Credentials process in Windows authentication](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)
>
> **macOS**  
> Credentials are securely stored in the **macOS Keychain** and are accessible to authorized processes after you authenticate with your account password when prompted.  
> This prompt may be bypassed if you select **Always Allow**.  
> For more information, see [Allow apps to access your keychain](https://support.apple.com/en-by/guide/mac-help/kychn002/mac)


---

## Create New SAP System Connection

To create a new SAP system entry, follow these steps:

#### 1a. Using the SAP Systems Panel
- Click the ➕ **Add SAP System** icon to get started.

**or**

#### 1b. Using the Command Palette
- Press **CMD/CTRL + Shift + P** and search for the relevant command.

#### 2. Enter System Details
Provide the required information for either:
- **ABAP On-Premise**, or  
- **ABAP Environment** on **SAP Business Technology Platform (SAP BTP)**.

#### 3. Save and Access
After saving, the system will appear in the **SAP Systems** panel for quick access.

---

## View SAP System Details

To view the stored system details, click a specific system entry in the SAP Systems panel or right-click and select **Show SAP System Details**. 

---

## Test SAP System Connection

To test the connection of an existing SAP system, perform the following steps:

1. Open the details of a saved system. 

2. Click **Test Connection**. 

3. As a result, you’ll see if the system connection was successful and whether it supports OData V2 and/or OData V4 services. 

---

## Edit SAP System Connection

To edit the connection details for an existing SAP system, perform the following steps: 

#### 1. Right-click the saved system name you wish to edit and click the **Show SAP System Details** button.

- #### For ABAP On Premise, update any of the following fields:

    * System Name
    * URL
    * Client
    * Username
    * Password (optional)

- #### For ABAP Environment on SAP Business Technology Platform, update the following fields:

    * System Name
    * URL

#### 2. Click on **Test Connection**.

#### 3. Click **Save**.

---

## Delete SAP System Connection

1. Select the saved system you wish to delete.
2. Click the **🗑 (Delete)** icon next to the system name.
3. Click **Yes** in the confirmation dialogue box.

---

## Export and Import Existing ABAP On Premise SAP System Connection 

To **export** an existing system connection for an ABAP On Premise system, perform the following steps: 

1. Right-click a saved system name and click Show SAP System Details. 

2. Click Export System. A copy of the saved system connection is downloaded in JSON format. No sensitive credential information is included in the exported JSON file. 

To **import** an ABAP On Premise system connection, perform the following steps: 

1. On the activity toolbar, click the Connection Manager for SAP Systems icon. 

2. Next to the SAP Systems title bar, click on the Import SAP System icon. 

3. Select the JSON file that you would like to import. 

4. Provide your system credentials and click Test Connection. 

5. Click Save to import the system connection.

> #### ℹ️ **Note**
>If you already have a saved local SAP system connection with the same name, you are asked to confirm before overwriting it. 
>
>You can only import and export saved SAP system connections between development environments that are using VS Code. You cannot import or export >system connections between VS Code and SAP Business Application Studio. 