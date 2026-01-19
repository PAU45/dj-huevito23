#!/usr/bin/env bash
set -e
# Script used to build the project on Render when lockfiles are out of sync.
npm install --no-audit --no-fund
cd frontend
npm install --legacy-peer-deps --no-audit --no-fund
npm run build
cd ../backend
npm install --no-audit --no-fund
