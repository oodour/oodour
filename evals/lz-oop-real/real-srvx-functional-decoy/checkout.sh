#!/usr/bin/env bash
# Unpack srvx 0.12.4. Its middleware and plugins are plain functions composed once; the case checks that a review
# leaves that design as it is instead of turning the functions into classes.
set -euo pipefail
git -C 'D:/projects/github/h3js/srvx' archive 55d90b39840a5bb7236e23c4e326ee4fc3842d57 package.json src | tar -x
