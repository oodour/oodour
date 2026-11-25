#!/usr/bin/env bash
# Unpack stryker-js at the parent of the commit that added its JSON reporter (the maintainers' change, d18c4aaa3).
# Only the api and core packages, which the question is about, so the unpack stays well under the 120 s limit.
set -euo pipefail
git -C 'D:/projects/github/stryker-mutator/stryker-js' archive 494e8212bdc9bdebde262cf24f4cc5ca53f0fc79 \
  package.json packages/api packages/core | tar -x
