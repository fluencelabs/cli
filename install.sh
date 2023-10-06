#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

# set current working directory to script directory to run script from everywhere
cd "$(dirname "$0")"

# Get the Operating System and Architecture type
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Define the directory where Fluence will be installed, or use a default
FLUENCE_USER_DIR="${FLUENCE_USER_DIR-$HOME/.fluence}"

# Create a temporary directory and ensure it's removed upon script exit or on interrupt/terminate signals
TEMP="$(mktemp -d)"
trap "rm -rf '$TEMP'" EXIT INT TERM

# Check if the cli directory empty
if $(ls -1 ${FLUENCE_USER_DIR}/cli &>/dev/null); then
  echo "${FLUENCE_USER_DIR}/cli exists and is not empty, remove it before continuing"
  exit 1
fi

# Assign a value to 'arch' variable based on the system's architecture
case "$ARCH" in
  "x86_64")
    arch="x64"
    ;;
  "arm64" | "aarch64")
    arch="arm64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Validate the operating system type
case "$OS" in
  "darwin")
    os="darwin"
    ;;
  "linux")
    os="linux"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

# Form archive name and URL for downloading the correct binary based on OS and Architecture
archive="fluence-${os}-${arch}.tar.gz"
url="https://fcli-binaries.s3.eu-west-1.amazonaws.com/channels/stable/${archive}"

# Create directory for Fluence CLI
mkdir -p "${FLUENCE_USER_DIR}/cli"

# Downloade and extracte the Fluence binary archive
curl -L -sS "$url" -o "${TEMP}/${archive}"
tar --strip-components=1 -xzf "${TEMP}/${archive}" -C "${FLUENCE_USER_DIR}/cli"

# Determine shell type and define shell profile file to add Fluence CLI to PATH
case $SHELL in
  */zsh)
    SHELL_PROFILE="$HOME/.zshrc"
    ;;
  */fish)
    SHELL_PROFILE="$HOME/.config/fish/config.fish"
    ;;
  */bash)
    SHELL_PROFILE="$HOME/.bashrc"
    ;;
  *)
    echo "Unsupported shell. Please add ${FLUENCE_USER_DIR}/cli/bin to \$PATH yourself"
    exit
    ;;
esac

# Add the Fluence CLI binary to shell's PATH in the profile file, if it's not already present
if ! grep -q "${FLUENCE_USER_DIR}/cli/bin" "$SHELL_PROFILE"; then
  if [[ $SHELL == */fish ]]; then
    echo "set -gx PATH \$PATH ${FLUENCE_USER_DIR}/cli/bin" >>"$SHELL_PROFILE"
  else
    echo "export PATH=\$PATH:${FLUENCE_USER_DIR}/cli/bin" >>"$SHELL_PROFILE"
  fi
fi

# Activate the new PATH immediately, adjusting based on shell type
case $SHELL in
  */fish)
    set -gx PATH $PATH ${FLUENCE_USER_DIR}/cli/bin
    ;;
  *)
    source "$SHELL_PROFILE"
    ;;
esac
