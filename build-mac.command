#!/bin/bash
cd "$(dirname "$0")"
echo "Building Arcanum for Mac. The first time takes a few minutes."
npm install && npm run dist:mac && echo && echo "Done. The app is in the dist folder." && open dist || echo "Something went wrong. Make sure Node.js is installed (nodejs.org), then try again."
read -p "Press Return to close."
