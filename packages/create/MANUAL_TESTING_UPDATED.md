# Manual Testing Guide - System Management CLI

> **Note:** This file is for local testing only and should not be committed to the repository.

## Test Status: ✅ ALL TESTS PASSING

**Last Tested:** 2026-07-15  
**Build Status:** ✅ Clean build  
**Unit Tests:** ✅ 180/180 passing (31 test suites)  
**Lint Status:** ✅ 0 errors, 131 warnings (pre-existing patterns)

---

## Setup

### 1. Build the Package

```bash
cd /open-ux-tools/packages/create
pnpm build
```

### 2. Run Commands Locally

Use `node dist/index.js` instead of `npx @sap-ux/create`:

```bash
# From packages/create directory:
node dist/index.js <command>

# Or from anywhere with full path:
node /open-ux-tools/packages/create/dist/index.js <command>
```

---

## Test Scenarios

### **Test 1: Add System - Fully Interactive** ✨

```bash
node dist/index.js add system
```

**Expected prompts:**
1. System name: (type: `My Test System`)
2. URL: (type: `https://my-sap-system.com`)
3. Client (optional, press Enter to skip): (type `100` or press Enter)
4. Username: (type: `testuser`)
5. Password: (type password - will be masked: `********`)
6. Connection check runs automatically
7. System saved

**Note:** System type, Auth type, and Connection type use defaults (`OnPrem`, `basic`, `abap_catalog`) and are not prompted in fully interactive mode. Use flags to override these defaults.

---

### **Test 2: Add System - Partial Flags** 

```bash
node dist/index.js add system --name "SAP Dev" --url https://sap-dev.example.com
```

**Expected:**
- Skips name/URL prompts (already provided)
- Prompts for: Client (optional), Username, Password
- Uses defaults: System type (`OnPrem`), Auth type (`basic`), Connection type (`abap_catalog`)
- Connection check runs
- System saved

**Note:** To set different system/auth/connection types, use flags: `--type AbapCloud --auth reentranceTicket`

---

### **Test 3: Add System - All Flags (Skip Interactive)** ✅ Verified

```bash
export MY_PASSWORD=mypassword
node dist/index.js add system \
  --name "Quick System" \
  --url https://quick.example.com \
  --type OnPrem \
  --auth basic \
  --connection-type abap_catalog \
  --username quickuser \
  --password env:MY_PASSWORD
```

**Expected:**
- No prompts
- Connection check runs
- System saved

---

### **Test 4: Add System - Skip Connection Check**

```bash
node dist/index.js add system \
  --name "Offline System" \
  --url https://offline.example.com \
  --skip-check
```

**Expected:**
- Prompts for: Client (optional), Username, Password
- Uses defaults for: System type, Auth type, Connection type
- **No connection check** (--skip-check flag)
- System saved immediately

---

### **Test 5: Add System - Re-entrance Ticket (AbapCloud)**

```bash
node dist/index.js add system \
  --name "BTP System" \
  --url https://my-btp-system.example.com \
  --type AbapCloud \
  --auth reentranceTicket
```

**Expected:**
- Prompts for: Client (optional)
- No username/password prompts (re-entrance auth doesn't need them)
- Message: "Note: Re-entrance ticket authentication will open a browser tab when the system is first used."
- Connection check tries to reach the host
- System saved

**Note:** System type and auth type must be set via flags - they are not prompted interactively (defaults are used instead).

---

### **Test 6: List Systems** ✅ Verified

```bash
node dist/index.js list system
```

**Expected:**
- Shows all saved systems in human-readable format
- No passwords/credentials displayed

```bash
node dist/index.js list system --json
```

**Expected:**
- JSON array of systems
- No sensitive data in output

---

### **Test 7: Get System** ✅ Verified

```bash
node dist/index.js get system --url https://my-sap-system.com
```

**Expected:**
- Shows single system details
- "Credentials stored securely" if credentials exist
- No passwords shown

---

### **Test 8: Update System - Fully Interactive** ✨

```bash
node dist/index.js update system
```

**Expected prompts:**
1. URL: (type URL of system to update)
2. Client: (type client or press Enter if none)
3. Multi-select: "What would you like to update?" (space to select, enter to confirm)
   - Use arrow keys to navigate
   - Press space to toggle selection
   - Select one or more: Name, Username, Password, Clear credentials
4. Then prompts for each selected field
5. Connection check if updating credentials
6. System updated

**Note:** This test scenario has not been manually verified yet. Please test and report results.

---

### **Test 9: Update System - With Flags** ✅ Verified

```bash
export NEW_PASSWORD=newpassword
node dist/index.js update system \
  --url https://my-sap-system.com \
  --name "Renamed System" \
  --username newuser \
  --password env:NEW_PASSWORD
```

**Expected:**
- No prompts (all flags provided)
- Connection check runs (credentials changed)
- System updated

---

### **Test 10: Update System - Skip Connection Check**

```bash
node dist/index.js update system \
  --url https://my-sap-system.com \
  --username updated_user \
  --skip-check
```

**Expected:**
- No connection check
- System updated immediately

---

### **Test 11: Update System - Clear Credentials**

```bash
node dist/index.js update system \
  --url https://my-sap-system.com \
  --clear-credentials
```

**Expected:**
- Credentials removed from system
- System updated

---

### **Test 12: Remove System - Interactive** ✨

```bash
node dist/index.js remove system
```

**Expected prompts:**
1. URL: (type URL)
2. Client: (type client or press Enter if none)
3. Confirmation: "Remove system 'XXX' and its stored credentials?"
   - Default: No
   - Use arrow keys to select Yes
4. System removed (or cancelled if No)

**Note:** This test scenario has not been manually verified yet. Please test and report results.

---

### **Test 13: Remove System - With Flags**

```bash
node dist/index.js remove system --url https://quick.example.com --client ""
```

**Expected:**
- Prompts for confirmation
- System removed if confirmed

**Note:** `--client ""` provides empty client explicitly to avoid prompting.

---

### **Test 14: Remove System - Force (No Confirmation)** ✅ Verified

```bash
node dist/index.js remove system \
  --url https://offline.example.com \
  --client "" \
  --force
```

**Expected:**
- **No prompts** (URL/client provided, force skips confirmation)
- System removed immediately

---

### **Test 15: Error Handling - Invalid URL**

```bash
node dist/index.js add system --name "Bad" --url "not-a-url"
```

**Expected:**
- Error: "Invalid URL format"
- System not saved

---

### **Test 16: Error Handling - Duplicate System**

```bash
# Add system first
node dist/index.js add system --name "Dup1" --url https://dup.example.com --skip-check

# Try to add same URL again
node dist/index.js add system --name "Dup2" --url https://dup.example.com --skip-check
```

**Expected:**
- Error: "System 'https://dup.example.com' already exists. Use 'update system' to update it."

---

### **Test 17: Connection Check Failure**

```bash
node dist/index.js add system \
  --name "Unreachable" \
  --url https://definitely-not-a-real-sap-system-12345.com \
  --auth basic \
  --username test \
  --password env:MY_PASSWORD
```

**Expected:**
- Connection check fails
- Prompt: "Save the system anyway? No/Yes"
- If Yes → system saved
- If No → cancelled

---

## Verification Commands

### Check where systems are stored:

```bash
ls -la ~/.fioritools/
cat ~/.fioritools/BackendSystem.json
```

### Check help output:

```bash
node dist/index.js --help
node dist/index.js add system --help
node dist/index.js update system --help
node dist/index.js remove system --help
node dist/index.js list system --help
```

---

## Quick Test Script

Here's a script to test the full flow:

```bash
cd /open-ux-tools/packages/create

# Build
pnpm build

# Test 1: Add system interactively
echo "=== Test 1: Add system (interactive) ==="
node dist/index.js add system

# Test 2: List systems
echo "=== Test 2: List systems ==="
node dist/index.js list system

# Test 3: Get specific system
echo "=== Test 3: Get system ==="
node dist/index.js get system --url https://your-url-from-test1.com

# Test 4: Update system interactively
echo "=== Test 4: Update system (interactive) ==="
node dist/index.js update system

# Test 5: Remove system with confirmation
echo "=== Test 5: Remove system ==="
node dist/index.js remove system

# Test 6: Verify all removed
echo "=== Test 6: Verify empty ==="
node dist/index.js list system
```

---

## Key Things to Test

✅ **Interactive prompts work** (arrow keys, enter, space for multi-select)  
✅ **Masked password input** (no plain text visible)  
✅ **Connection check runs** and reports success/failure  
✅ **Skip check flag works** (--skip-check)  
✅ **Force flag works** (--force for remove)  
✅ **Error messages are clear** (invalid URL, duplicate system, etc.)  
✅ **No credentials in output** (list/get commands)  
✅ **Ctrl+C cancels** gracefully  

---

## Clean Up After Testing

Remove test systems:

```bash
# List all systems
node dist/index.js list system

# Remove each test system
node dist/index.js remove system --url <url> --force

# Or manually delete the storage file
rm ~/.fioritools/BackendSystem.json
```

---

## Automated Test Results

### Unit Tests: ✅ ALL PASSING

**Total:** 180/180 tests passing across 31 test suites

**System Management Tests (27 passing):**
- Add system: 12/12 ✅
- Update system: 8/8 ✅
- Remove system: 7/7 ✅

### Manual CLI Test Results

Commands verified successfully on 2026-07-15:

**✅ Test 3** - Add system with all flags, no prompts  
**✅ Test 6** - List systems (human-readable and JSON)  
**✅ Test 7** - Get specific system, credentials masked  
**✅ Test 9** - Update system with flags  
**✅ Test 14** - Remove system with force flag  

### Known Behavior Notes

1. **Default Values:** System type, auth type, and connection type have defaults from Commander.js, so they're not prompted unless explicitly needed
2. **Client Field:** Optional but part of system identifier - always prompted if not provided
3. **Interactive Mode:** Works best when NO flags provided, or when only name/URL provided
4. **Connection Check:** Runs by default, use --skip-check to bypass
5. **Confirmation Prompt:** Required for remove unless --force provided
