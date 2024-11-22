# Import the CredentialManager module
Import-Module CredentialManager

# Access the first argument passed to the script
$uniqueKey = $args[0]

if (-not $uniqueKey) {
    Write-Host "No service name provided."
    exit 1
}
# Example usage with the passed $uniqueKey
Write-Host "Service: $uniqueKey"

# Retrieve the credential
$retrievedCreds = Get-StoredCredential -Target $uniqueKey

if ($retrievedCreds) {
    # Convert the SecureString password to plain text
    $securePassword = $retrievedCreds.Password
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)

    # Trim any surrounding whitespace (in case it was added)
    $plainPassword = $plainPassword.Trim()

    # Check if the password is a valid Base64 string
    if ($plainPassword -match '^[a-zA-Z0-9\+/=]+$' -and $plainPassword.Length % 4 -eq 0) {
        try {
            # Decode the Base64 string
            $decodedBytes = [System.Convert]::FromBase64String($plainPassword)
            $decodedJson = [System.Text.Encoding]::UTF8.GetString($decodedBytes)

            # Convert JSON to a PowerShell object
            $passwordObject = $decodedJson | ConvertFrom-Json

            # Prepare output as a JSON object
            $outputObject = @{
                username = $passwordObject.username
                password = $passwordObject.password
            }

            # Convert to JSON format for easy consumption
            $jsonOutput = $outputObject | ConvertTo-Json

            Write-Output $jsonOutput  # This is the output in the desired format
        
        } catch {
            Write-Output "Error decoding Base64 password: $_"
        }
    } else {
        Write-Output "Stored password is not a valid Base64 string."
    }
} else {
    Write-Output "No credentials found for $uniqueKey."
}
