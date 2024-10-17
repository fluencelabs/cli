#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

# Function to check if a command exists
has() {
  [[ -z $1 ]] && return 1
  command -v $1 >/dev/null 2>&1
}

echo "Initiating Fluence CLI installation process..."

# Determine the operating system and machine architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Setting the installation directory for Fluence CLI
FLUENCE_USER_DIR="${FLUENCE_USER_DIR-$HOME/.fluence}"

# Creating a temporary directory and ensuring its cleanup on script exit
TEMP="$(mktemp -d)"
trap "rm -rf '$TEMP'" EXIT INT TERM

# Ensuring 'curl' is installed for downloading necessary files
if ! has "curl"; then
  echo "Error: Installation requires 'curl'. Please install 'curl' and try again."
  exit 1
fi

# Check that fluence is not installed
if has "fluence"; then
  cat <<ERR
Error: Fluence CLI appears to be already installed.
If it was installed with npm please uninstall it first with 'npm uninstall -g @fluencelabs/cli' and then rerun installation script.
If it was installed with installation script you should use 'fluence update' command to update to latest version.
ERR
  exit 1
fi

# Checking if the Fluence CLI was already installed
if $(ls -1 ${FLUENCE_USER_DIR}/cli &>/dev/null); then
  cat <<ERR
Error: Installation path ${FLUENCE_USER_DIR}/cli already exists.
If you want to reinstall delete it with 'rm -rf ${FLUENCE_USER_DIR}/cli' and rerun installation script.
To update to latest version use 'fluence update' command.
ERR
  exit 1
fi

# Confirming system architecture compatibility
case "$ARCH" in
"x86_64") arch="x64" ;;
"arm64" | "aarch64") arch="arm64" ;;
*)
  echo "Error: Unsupported architecture - $ARCH"
  exit 1
  ;;
esac

# Confirming operating system compatibility
case "$OS" in
"darwin") os="darwin" ;;
"linux") os="linux" ;;
*)
  echo "Error: Unsupported OS - $OS"
  exit 1
  ;;
esac

# Set archive name and URL based on OS and architecture
archive="fluence-${os}-${arch}.tar.gz"
# TODO hide S3 URL under some pretty name
url="https://fcli-binaries.s3.eu-west-1.amazonaws.com/channels/stable/${archive}"

echo "Downloading and extracting Fluence CLI to ${FLUENCE_USER_DIR}/cli"
mkdir -p "${FLUENCE_USER_DIR}/cli"
curl --progress-bar -o "${TEMP}/${archive}" "$url"
tar --strip-components=1 -xzf "${TEMP}/${archive}" -C "${FLUENCE_USER_DIR}/cli"

# Add Fluence CLI to path with symlink
if echo $PATH | grep -q $HOME/.local/bin; then
  echo "Adding Fluence CLI symlink to ${HOME}/.local/fluence"
  mkdir -p $HOME/.local/bin
  ln -sf ${FLUENCE_USER_DIR}/cli/bin/fluence $HOME/.local/bin/fluence
else
  echo "Adding Fluence CLI symlink to /usr/local/bin/fluence"
  sudo ln -sf ${FLUENCE_USER_DIR}/cli/bin/fluence /usr/local/bin/fluence
fi
echo "Fluence CLI installation complete."
