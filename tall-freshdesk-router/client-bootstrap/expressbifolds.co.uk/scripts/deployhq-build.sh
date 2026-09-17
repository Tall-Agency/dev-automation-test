#!/bin/bash
set -e

# Build theme front-end assets only (DeployHQ).
cd web/app/themes/expressbifolding
npm install
npm run gulp build --prod
