function Create-TempDir() {
    $TempDir = [System.IO.Path]::GetTempPath()
    $Name = [System.IO.Path]::GetRandomFileName()
    $Folder = New-Item -ItemType Directory -Path (Join-Path $TempDir $Name)
    return $Folder
}

Write-Host "Initiating Fluence CLI installation process..."

# Setting the installation directory for Fluence CLI
# If the variable is empty or unset
if ($null -eq $env:FLUENCE_USER_DIR) {
    $FLUENCE_USER_DIR = "$HOME\.fluence"
} else {
    $FLUENCE_USER_DIR = $env:FLUENCE_USER_DIR
}

# Check that fluence is not installed
try {
    Invoke-Expression -Command "fluence -v" | out-null
    throw @'
Error: Fluence CLI appears to be already installed.
If it was installed with npm please uninstall it first with 'npm uninstall -g @fluencelabs/cli' and then rerun installation script.
If it was installed with installation script you should use 'fluence update' command to update to latest version.
'@
} catch [System.Management.Automation.CommandNotFoundException] {}

# Checking if the Fluence CLI was already installed
if (Test-Path -Path "$FLUENCE_USER_DIR\cli") {
    throw @'
Error: Installation path ${FLUENCE_USER_DIR}\cli already exists.
If you want to reinstall delete it with 'rm -rf ${FLUENCE_USER_DIR}\cli' and rerun installation script.
To update to latest version use 'fluence update' command.
'@
}


if ([Environment]::Is64BitOperatingSystem) {
    $Arch = "x64"
} else {
    $Arch = "x86"
}

$OS = [System.Environment]::OSVersion.Platform

if ($OS -ne "Win32NT") {
    throw "Error: This script is installing CLI for Windows only. For Unix system use bash installation script."
}

# Set archive name and URL based on OS and architecture
$Archive="fluence-win32-$Arch.tar.gz"

# TODO hide S3 URL under some pretty name
$URL="https://fcli-binaries.s3.eu-west-1.amazonaws.com/channels/stable/$Archive"

Write-Host "Downloading and extracting Fluence CLI to $FLUENCE_USER_DIR\cli"

New-Item -ItemType Directory -Path "$FLUENCE_USER_DIR\cli"
$Temp = Create-TempDir

Invoke-WebRequest -URI $URL -OutFile "$Temp\$Archive"

tar --strip-components=1 -xzf "$TEMP\$Archive" -C "$FLUENCE_USER_DIR\cli"

# Add Fluence CLI to path
if ($null -eq ($env:Path.Split(";") | Select-String -Pattern "^$FLUENCE_USER_DIR\\cli\\bin$")) {
    Write-Host "Adding fluence binary to `$PATH. Restart shell to apply changes."
    $env:Path = $env:Path + ";$FLUENCE_USER_DIR\cli\bin"
    [Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$FLUENCE_USER_DIR\cli\bin", [System.EnvironmentVariableTarget]::User)
}

Write-Host "Fluence CLI installation complete."
