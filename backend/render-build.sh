#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/download/nightly/yt-dlp -o yt-dlp
chmod a+rx yt-dlp
echo "yt-dlp installed locally!"
