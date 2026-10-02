#!/bin/bash
# Sanitize test projects to remove internal SAP patterns before open-source publication

set -e

echo "🧹 Starting test project sanitization..."

cd "$(dirname "$0")/input"

# Backup flag
BACKUP=${1:-"--backup"}

if [ "$BACKUP" = "--backup" ]; then
    echo "📦 Creating backup: test-input-backup.tar.gz"
    cd ..
    tar -czf test-input-backup.tar.gz input/
    cd input
fi

# 1. Sanitize reuse library project (s4h.cfnd → example.lib)
echo "🔧 Sanitizing reuse_library_project..."
find reuse_library_project -type f \( -name "*.json" -o -name ".library" -o -name "*.xml" \) -exec sed -i '' \
  -e 's/sap\.s4h\.cfnd\.featuretoggle/sap.example.lib.featuretoggle/g' \
  -e 's/saps4hcfndfeaturetoggle/examplefeaturetoggle/g' \
  -e 's/\/sap\/s4h\/cfnd\/featuretoggle/\/sap\/example\/lib\/featuretoggle/g' \
  -e 's/sap\/s4h\/cfnd\/featuretoggle/sap\/example\/lib\/featuretoggle/g' {} \;

# Also rename directory structure
if [ -d "reuse_library_project/src/sap/s4h" ]; then
    mkdir -p reuse_library_project/src/sap/example/lib
    mv reuse_library_project/src/sap/s4h/cfnd/featuretoggle reuse_library_project/src/sap/example/lib/
    rm -rf reuse_library_project/src/sap/s4h
fi

# 2. Sanitize webide freestyle (fin.central → demo.central)
echo "🔧 Sanitizing webide_freestyle_custom_webapp_path..."
find webide_freestyle_custom_webapp_path -type f -name "*.json" -exec sed -i '' \
  -e 's/fin\.central\.listreport\.reuse/demo.central.listreport.reuse/g' \
  -e 's/"fin\.central/"demo\.central/g' {} \;

# 3. Sanitize webide lrop reuse lib (i2d.qm → demo.qm)
echo "🔧 Sanitizing webide_v2_lrop_reuselib_ui5_tooling_routing_project..."
find webide_v2_lrop_reuselib_ui5_tooling_routing_project -type f -name "*.json" -exec sed -i '' \
  -e 's/i2d\.qm\.defect\.records1/demo.qm.defect.records/g' \
  -e 's/"i2d\.qm/"demo\.qm/g' {} \;

# 4. Sanitize CA FIORI inbox (cross.fnd → demo)
echo "🔧 Sanitizing CA_FIORI_INBOXExtension..."
find CA_FIORI_INBOXExtension -type f -name "*.json" -exec sed -i '' \
  -e 's/cross\.fnd\.fiori\.inbox\.sample_fiori_inboxextension/demo.fiori.inbox.extension/g' \
  -e 's/cross\.fnd\.fiori\.inbox/demo.fiori.inbox/g' {} \;

# 5. (Optional) Sanitize ES5 references to be more generic
echo "🔧 Sanitizing ES5 references in multi_destination_ovp_mta..."
find multi_destination_ovp_mta -type f -name "*.json" -exec sed -i '' \
  -e 's/ES5_Basic/DEMO_SYSTEM/g' \
  -e 's/ES5 Gateway Demo System/Demo OData System/g' {} \;

echo "✅ Sanitization complete!"
echo ""
echo "Next steps:"
echo "1. Run: cd ../.. && pnpm test"
echo "2. If tests fail, update snapshots: pnpm test -- -u"
echo "3. Review changes: git diff test/input/"
echo "4. To restore backup: tar -xzf test/test-input-backup.tar.gz"
