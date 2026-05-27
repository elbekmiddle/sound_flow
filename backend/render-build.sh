#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Downloading latest yt-dlp nightly..."
curl -sL https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o yt-dlp
chmod a+rx yt-dlp

echo "yt-dlp version:"
./yt-dlp --version

echo "✅ yt-dlp installed successfully!"
