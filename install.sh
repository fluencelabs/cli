#! /usr/bin/env bash

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
FLUENCE_USER_DIR="${FLUENCE_USER_DIR-$HOME/.fluence}"

TEMP="$(mktemp -d)"
trap "rm -rf '$TEMP'" EXIT INT TERM

if $(ls -1 ${FLUENCE_USER_DIR}/cli &>/dev/null); then
  echo "${FLUENCE_USER_DIR}/cli exists and is not empty, remove it before continuing"
  exit 1
fi

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

# Construct archive name
archive="fluence-cli-${os}-${arch}.tar.gz"

# Get archive ling
tag="$(curl -sS https://api.github.com/repos/fluencelabs/cli/releases/latest | jq -r .tag_name)"
url="https://github.com/fluencelabs/cli/releases/download/${tag}/${archive}"

# Create fluence dir
mkdir -p "${FLUENCE_USER_DIR}/cli"

# Download and extract archive
echo "Downloading ${tag} for ${os}-${arch}"
curl -L -sS "$url" -o "${TEMP}/${archive}"
tar --strip-components=1 -xzf "${TEMP}/${archive}" -C "${FLUENCE_USER_DIR}/cli"

# Add binary to PATH
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
    echo "Unsopported shell. Please add ${FLUENCE_USER_DIR}/cli/bin to \$PATH yourself"
    exit
    ;;
esac

if ! grep -q "${FLUENCE_USER_DIR}/cli/bin" "$SHELL_PROFILE"; then
  if [[ $SHELL == */fish ]]; then
    echo "set -gx PATH \$PATH ${FLUENCE_USER_DIR}/cli/bin" >>"$SHELL_PROFILE"
  else
    echo "export PATH=\$PATH:${FLUENCE_USER_DIR}/cli/bin" >>"$SHELL_PROFILE"
  fi
fi

case $SHELL in
  */fish)
    set -gx PATH $PATH ${FLUENCE_USER_DIR}/cli/bin
    ;;
  *)
    source "$SHELL_PROFILE"
    ;;
esac
