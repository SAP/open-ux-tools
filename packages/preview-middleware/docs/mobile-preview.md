# Mobile Device Preview Support

The preview middleware now supports previewing applications on physical mobile devices, enabling developers to test their applications on real mobile devices directly from VSCode and BAS.

## Overview

This feature allows developers to:
- Generate remote URLs for mobile device access
- Enable remote connections through launch configurations
- Preview applications on mobile devices from both VSCode and BAS environments

## Usage

### VSCode Environment

1. **Enable Remote Access in Launch Configuration**
   - Add `enableRemoteAccess: true` to your FioriOptions when creating launch configurations
   - This will add the `--accept-remote-connections` parameter to the preview command

2. **Start the Application with Remote Access**
   ```bash
   npm run start -- --accept-remote-connections
   ```

3. **Access the Remote URL**
   - The middleware will automatically detect the `--accept-remote-connections` flag
   - A remote URL will be logged in the console: `Remote URL: http://192.168.1.100:8080`
   - Use this URL to access your application from mobile devices on the same network

### BAS Environment

1. **Automatic Remote URL Generation**
   - In BAS, remote URLs are automatically generated using the BAS SDK
   - No additional configuration is required

2. **Access the Application**
   - The remote URL will be logged in the console: `Remote URL: https://bas-workspace.example.com:8080`
   - Use this URL to access your application from mobile devices

## Implementation Details

### Remote URL Generation

The middleware uses different strategies for URL generation:

- **VSCode**: Detects the local network IP address and constructs the URL
- **BAS**: Uses the BAS SDK to retrieve the exposed workspace URL

### Launch Configuration Support

The launch configuration system has been extended to support:

- `enableRemoteAccess` option in FioriOptions
- `--accept-remote-connections` argument in the Arguments enum
- Automatic parsing and handling of remote access settings

### Security Considerations

- Remote access is only enabled when explicitly requested
- The `--accept-remote-connections` flag must be present for VSCode environments
- Network access is limited to the local network where the development server is running

## API Reference

### Remote URL Functions

```typescript
import { getRemoteUrl, isRemoteConnectionsEnabled, getPortFromArgs } from '@sap-ux/preview-middleware';

// Check if remote connections are enabled
const isEnabled = isRemoteConnectionsEnabled();

// Get port from command line arguments
const port = getPortFromArgs();

// Generate remote URL
const remoteUrl = await getRemoteUrl({
    acceptRemoteConnections: true,
    port: 8080,
    protocol: 'http'
}, logger);
```

### Launch Configuration Options

```typescript
interface FioriOptions {
    // ... other options
    enableRemoteAccess?: boolean; // Enable remote access for mobile preview
}
```

## Examples

### Creating a Launch Configuration with Remote Access

```typescript
import { createLaunchConfig } from '@sap-ux/launch-config';

const fioriOptions = {
    name: 'My App',
    projectRoot: '/path/to/project',
    enableRemoteAccess: true, // Enable mobile preview
    // ... other options
};

await createLaunchConfig('/workspace', fioriOptions);
```

### Manual Remote URL Generation

```typescript
import { getRemoteUrl } from '@sap-ux/preview-middleware';
import { ToolsLogger } from '@sap-ux/logger';

const logger = new ToolsLogger();
const remoteUrl = await getRemoteUrl({
    acceptRemoteConnections: true,
    port: 8080,
    protocol: 'http'
}, logger);

if (remoteUrl) {
    console.log(`Access your app on mobile: ${remoteUrl}`);
}
```

## Troubleshooting

### Common Issues

1. **No Remote URL Generated**
   - Ensure `--accept-remote-connections` is present in the command
   - Check that the network interface is available and accessible

2. **Mobile Device Cannot Access URL**
   - Verify both devices are on the same network
   - Check firewall settings on the development machine
   - Ensure the port is not blocked

3. **BAS Environment Issues**
   - Verify BAS SDK is available and properly configured
   - Check BAS workspace permissions and network settings

### Debug Information

Enable debug logging to see detailed information about remote URL generation:

```typescript
const logger = new ToolsLogger({
    logLevel: LogLevel.Debug
});
```

This will provide detailed logs about:
- Network interface detection
- BAS SDK interactions
- URL generation process
- Error details
