# @sap-ux/backend-proxy-middleware

## 0.6.36

### Patch Changes

-   5589854: Upgrade qs module and the modules using it because of a potential Denial of Service vulnerabity
-   Updated dependencies [5589854]
    -   @sap-ux/axios-extension@0.13.2

## 0.6.35

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
-   Updated dependencies [070d8dc]
    -   @sap-ux/axios-extension@0.13.1
    -   @sap-ux/btp-utils@0.11.3
    -   @sap-ux/logger@0.3.2
    -   @sap-ux/store@0.3.7

## 0.6.34

### Patch Changes

-   Updated dependencies [9b9b3d7]
    -   @sap-ux/axios-extension@0.13.0

## 0.6.33

### Patch Changes

-   Updated dependencies [116ff5e]
    -   @sap-ux/axios-extension@0.12.0

## 0.6.32

### Patch Changes

-   Updated dependencies [703dc96]
    -   @sap-ux/axios-extension@0.11.1

## 0.6.31

### Patch Changes

-   Updated dependencies [f4ab2cd]
    -   @sap-ux/axios-extension@0.11.0

## 0.6.30

### Patch Changes

-   ee7f9a9: Refactor to use getProxyForUrl directly

## 0.6.29

### Patch Changes

-   Updated dependencies [0439760]
    -   @sap-ux/store@0.3.6

## 0.6.28

### Patch Changes

-   f3cbe4d: Remove dependency to i18n libraries in Yaml module
-   Updated dependencies [f3cbe4d]
    -   @sap-ux/axios-extension@0.10.3

## 0.6.27

### Patch Changes

-   748d24f: Consider ports when checking if a host is excluded from corporate proxy

## 0.6.26

### Patch Changes

-   Updated dependencies [9820cef]
    -   @sap-ux/axios-extension@0.10.2

## 0.6.25

### Patch Changes

-   5b487ef: chore - Apply linting to test folders and linting fixes
-   Updated dependencies [5b487ef]
    -   @sap-ux/axios-extension@0.10.1
    -   @sap-ux/btp-utils@0.11.2
    -   @sap-ux/logger@0.3.1
    -   @sap-ux/store@0.3.5

## 0.6.24

### Patch Changes

-   ba34b64: Makes the proxy request handler more robust

## 0.6.23

### Patch Changes

-   Updated dependencies [8778cbd]
    -   @sap-ux/axios-extension@0.10.0

## 0.6.22

### Patch Changes

-   fac7a5a: Replaced usage of express with simple code to reduce installation size.
-   Updated dependencies [fac7a5a]
    -   @sap-ux/axios-extension@0.9.8

## 0.6.21

### Patch Changes

-   Updated dependencies [dd98509]
    -   @sap-ux/store@0.3.4

## 0.6.20

### Patch Changes

-   8f82b54: Make backend-proxy-middleware more robust

## 0.6.19

### Patch Changes

-   Updated dependencies [b8d5315]
    -   @sap-ux/axios-extension@0.9.7
    -   @sap-ux/btp-utils@0.11.1

## 0.6.18

### Patch Changes

-   Updated dependencies [12e4686]
    -   @sap-ux/axios-extension@0.9.6

## 0.6.17

### Patch Changes

-   Updated dependencies [bc4cb3a]
    -   @sap-ux/btp-utils@0.11.0
    -   @sap-ux/logger@0.3.0
    -   @sap-ux/axios-extension@0.9.5
    -   @sap-ux/store@0.3.3

## 0.6.16

### Patch Changes

-   Updated dependencies [2896b77]
    -   @sap-ux/axios-extension@0.9.4

## 0.6.15

### Patch Changes

-   Updated dependencies [4342e1a]
    -   @sap-ux/axios-extension@0.9.3

## 0.6.14

### Patch Changes

-   Updated dependencies [d7b3e4f]
    -   @sap-ux/axios-extension@0.9.2

## 0.6.13

### Patch Changes

-   5710cfa: fix handling of full url destinations
-   Updated dependencies [5710cfa]
    -   @sap-ux/btp-utils@0.10.4
    -   @sap-ux/axios-extension@0.9.1

## 0.6.12

### Patch Changes

-   5b46c30: Improve error handling of proxy middlewares

## 0.6.11

### Patch Changes

-   Updated dependencies [49dcf36]
    -   @sap-ux/axios-extension@0.9.0

## 0.6.10

### Patch Changes

-   09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
-   Updated dependencies [09c6eb5]
    -   @sap-ux/axios-extension@0.8.1
    -   @sap-ux/btp-utils@0.10.3
    -   @sap-ux/logger@0.2.2
    -   @sap-ux/store@0.3.2

## 0.6.9

### Patch Changes

-   Updated dependencies [732171b]
    -   @sap-ux/axios-extension@0.8.0

## 0.6.8

### Patch Changes

-   fa232ad: Add optonal url property to the type DestinationBackendConfig

## 0.6.7

### Patch Changes

-   7f339ca: Support using direct OData service URLs in BAS

## 0.6.6

### Patch Changes

-   cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
-   Updated dependencies [cc1c406]
    -   @sap-ux/axios-extension@0.7.2
    -   @sap-ux/btp-utils@0.10.2
    -   @sap-ux/logger@0.2.1
    -   @sap-ux/store@0.3.1

## 0.6.5

### Patch Changes

-   6fae741: Support setting credentials via .env file

## 0.6.4

### Patch Changes

-   febef3e: Moves bsp logic to function generateProxyMiddlewareOptions

## 0.6.3

### Patch Changes

-   Updated dependencies [ebc59b4]
    -   @sap-ux/store@0.3.0

## 0.6.2

### Patch Changes

-   Updated dependencies [6f0f217]
    -   @sap-ux/btp-utils@0.10.1
    -   @sap-ux/axios-extension@0.7.1

## 0.6.1

### Patch Changes

-   5c5c904: Add author to package.json

## 0.6.0

### Minor Changes

-   6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

-   Updated dependencies [6f51973]
    -   @sap-ux/axios-extension@0.7.0
    -   @sap-ux/btp-utils@0.10.0
    -   @sap-ux/logger@0.2.0
    -   @sap-ux/store@0.2.0

## 0.5.2

### Patch Changes

-   Updated dependencies [9864fb5]
    -   @sap-ux/axios-extension@0.6.0

## 0.5.1

### Patch Changes

-   Updated dependencies [c70fd4d]
    -   @sap-ux/axios-extension@0.5.2
    -   @sap-ux/btp-utils@0.9.2
    -   @sap-ux/logger@0.1.6
    -   @sap-ux/store@0.1.5

## 0.5.0

### Minor Changes

-   9f84d52: Intrdocded new backend-proxy-middleware.

### Patch Changes

-   Updated dependencies [9f84d52]
    -   @sap-ux/store@0.1.4
