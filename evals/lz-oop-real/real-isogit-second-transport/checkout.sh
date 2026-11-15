#!/usr/bin/env bash
# Unpack isomorphic-git at the parent of the commit that chose the remote transport by URL protocol (the
# maintainers' change, 139d2a05). Only the sources and the manifest; the test fixtures are large and not needed.
set -euo pipefail
git -C 'D:/projects/github/isomorphic-git/isomorphic-git' archive cc3f111d8c3dde6d207439191952cc32afa3a68e \
  package.json src | tar -x
