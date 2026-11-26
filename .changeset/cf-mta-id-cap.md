---
"@sap-ux/cf-deploy-config-writer": patch
---

FIX: Cap the generated MTA ID at 30 characters. The CF html5-apps-repo CLI derives the destination service instance name as `<mta-id>-destination-service` from the MTA ID rather than reading the mta.yaml service-name; capping the ID keeps that derived name within Cloud Foundry's 50-character service-instance limit so it matches the deployed service and commands such as `cf html5-list -di <mta-id>-destination-service --runtime launchpad` resolve correctly
