#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o yt-dlp
chmod a+rx yt-dlp
echo "yt-dlp installed locally!"
