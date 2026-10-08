#!/bin/bash

# Script to replace sensitive constants.ts with sanitized version
# RUN THIS BEFORE ANY OPEN SOURCE COMMIT

cd "$(dirname "$0")"

echo "🔒 Replacing sensitive constants.ts with sanitized version..."

if [ ! -f "test/helpers/constants.SANITIZED.ts" ]; then
    echo "❌ ERROR: constants.SANITIZED.ts not found!"
    exit 1
fi

# Backup original (for your reference only - DO NOT commit)
cp test/helpers/constants.ts test/helpers/constants.ts.SENSITIVE.backup

# Replace with sanitized version
cp test/helpers/constants.SANITIZED.ts test/helpers/constants.ts

echo "✅ Replaced constants.ts with sanitized version"
echo ""
echo "🔍 Running security check..."
echo ""

# Check for sensitive data
if grep -r "wdf.sap.corp\|int.sap\|ldai\|ldc\|ER9CLNT\|UYTCLNT" test/ 2>/dev/null | grep -v ".backup"; then
    echo ""
    echo "❌ WARNING: Sensitive data still found in test files!"
    echo "Review the matches above and sanitize before committing."
    exit 1
else
    echo "✅ No sensitive data found in test files"
    echo ""
    echo "Next steps:"
    echo "  1. Run: pnpm build"
    echo "  2. Run: pnpm test"
    echo "  3. Security review by colleague"
    echo "  4. Then you can commit"
fi
