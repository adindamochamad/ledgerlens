#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Read metadata from executa.json
TOOL_ID=$(python3 -c "import json; d=json.load(open('executa.json')); print(d['tool_id'])")
VERSION=$(python3 -c "import json; d=json.load(open('executa.json')); print(d['version'])")
DISPLAY_NAME=$(python3 -c "import json; d=json.load(open('executa.json')); print(d['name'])")
DESCRIPTION=$(python3 -c "import json; d=json.load(open('executa.json')); print(d['description'])")

# Detect platform
OS=$(uname -s)
ARCH=$(uname -m)
case "${OS}-${ARCH}" in
  Darwin-arm64)   PLATFORM="darwin-arm64" ;;
  Darwin-x86_64)  PLATFORM="darwin-x86_64" ;;
  Linux-x86_64)   PLATFORM="linux-x86_64" ;;
  *) echo "Unsupported platform: ${OS}-${ARCH}"; exit 1 ;;
esac

echo "Building ${TOOL_ID} v${VERSION} for ${PLATFORM}..."

DIST_DIR="${SCRIPT_DIR}/dist-anna"
mkdir -p "$DIST_DIR"

# Install dependencies
pip install -e . --quiet

# Build single-file binary with PyInstaller
pyinstaller \
  --onefile \
  --name "$TOOL_ID" \
  --distpath "${DIST_DIR}/bin_tmp" \
  --workpath "${DIST_DIR}/build" \
  --specpath "${DIST_DIR}" \
  --hidden-import pdfplumber \
  --hidden-import pdfminer \
  --hidden-import PIL \
  --collect-all pdfplumber \
  --collect-all pdfminer \
  ledgerlens_plugin.py

# Build archive directory structure
ARCHIVE_NAME="${TOOL_ID}-${PLATFORM}"
ARCHIVE_DIR="${DIST_DIR}/${ARCHIVE_NAME}"
rm -rf "$ARCHIVE_DIR"
mkdir -p "${ARCHIVE_DIR}/bin"

cp "${DIST_DIR}/bin_tmp/${TOOL_ID}" "${ARCHIVE_DIR}/bin/${TOOL_ID}"
chmod 0755 "${ARCHIVE_DIR}/bin/${TOOL_ID}"

# Write manifest.json
cat > "${ARCHIVE_DIR}/manifest.json" <<EOF
{
  "name": "${TOOL_ID}",
  "display_name": "${DISPLAY_NAME}",
  "version": "${VERSION}",
  "description": "${DESCRIPTION}",
  "runtime": {
    "binary": {
      "entrypoint": {
        "default": "bin/${TOOL_ID}"
      },
      "permissions": {
        "bin/${TOOL_ID}": "0o755"
      }
    }
  }
}
EOF

# Package as tar.gz
TARBALL="${DIST_DIR}/${ARCHIVE_NAME}.tar.gz"
(cd "${DIST_DIR}" && tar czf "${ARCHIVE_NAME}.tar.gz" "${ARCHIVE_NAME}/")

# SHA-256
shasum -a 256 "$TARBALL" > "${TARBALL}.sha256"

echo ""
echo "Done!"
echo "  Archive : ${TARBALL}"
echo "  SHA-256 : $(cat "${TARBALL}.sha256" | cut -d' ' -f1)"
echo ""

# Validate
printf '{"jsonrpc":"2.0","method":"describe","id":1}\n' | "${ARCHIVE_DIR}/bin/${TOOL_ID}" | python3 -m json.tool > /dev/null && \
  echo "✓ Binary responds to describe" || \
  echo "✗ Binary validation failed"
