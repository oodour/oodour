#!/usr/bin/env bash
# Unpack typescript-eslint 8.56.0's eslint-plugin sources. The array-type rule switches on syntax-node types that the
# parser package owns; the case checks that a review keeps those switches instead of pushing for polymorphism.
set -euo pipefail
git -C 'D:/projects/github/typescript-eslint/typescript-eslint' archive 8b8b68f200a48ee9d6f7be8670e964629375196c \
  package.json packages/eslint-plugin/package.json packages/eslint-plugin/src | tar -x
