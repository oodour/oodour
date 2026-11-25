#!/usr/bin/env bash
# Unpack msw at the parent of the commit that added WebSocket mocking (the maintainers' change, ae786f5), where
# HttpHandler and GraphQLHandler extend the abstract RequestHandler.
set -euo pipefail
git -C 'D:/projects/github/mswjs/msw' archive 562fac96fb5ba1da950bba170ecb05f5156be938 package.json src | tar -x
