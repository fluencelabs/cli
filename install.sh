#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

has() {
  [[ -z $1 ]] && return 1
  command -v $1 >/dev/null 2>&1
}

echo "Starting Fluence installation..."

# Identify OS and architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Install in default fluence home dir
FLUENCE_USER_DIR="${FLUENCE_USER_DIR-$HOME/.fluence}"

# Temporary directory creation and cleanup setup
TEMP="$(mktemp -d)"
trap "rm -rf '$TEMP'" EXIT INT TERM

# Check that wget is installed
if ! has "curl"; then
  echo "'curl' is required for the installation. Please install it and rerun the script"
  exit 1
fi

# Verify if the cli directory is empty
if $(ls -1 ${FLUENCE_USER_DIR}/cli &>/dev/null); then
  cat <<ERR
Error: ${FLUENCE_USER_DIR}/cli exists and is not empty.
Remove with rm -rf ${FLUENCE_USER_DIR}/cli and rerun the script.
ERR
  exit 1
fi

# Validate and set system architecture
case "$ARCH" in
  "x86_64") arch="x64" ;;
  "arm64" | "aarch64") arch="arm64" ;;
  *) echo "Error: Unsupported architecture - $ARCH"; exit 1 ;;
esac

# Validate and set the operating system type
case "$OS" in
  "darwin") os="darwin" ;;
  "linux") os="linux" ;;
  *) echo "Error: Unsupported OS - $OS"; exit 1
  ;;
esac

# Set archive name and URL based on OS and architecture
archive="fluence-${os}-${arch}.tar.gz"
# TODO hide S3 URL under some pretty name
url="https://fcli-binaries.s3.eu-west-1.amazonaws.com/channels/stable/${archive}"

echo "Downloading and extracting Fluence archive..."
mkdir -p "${FLUENCE_USER_DIR}/cli"
curl --progress-bar -o "${TEMP}/${archive}" "$url"
tar --strip-components=1 -xzf "${TEMP}/${archive}" -C "${FLUENCE_USER_DIR}/cli"

echo "Fluence CLI installation complete!"
if echo $PATH | grep -q $HOME/.local/bin; then
  mkdir -p $HOME/.local/bin
  ln -sf ${FLUENCE_USER_DIR}/cli/bin/fluence $HOME/.local/bin/fluence
else
  echo "Create a symlink to fluence binary in any directory that is in \$PATH, for example:"
  echo "sudo ln -s ${FLUENCE_USER_DIR}/cli/bin/fluence /usr/local/bin/fluence"
fi
