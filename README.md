# TV Dashboard

Automated office TV dashboard for Gen H. Fetches live business metrics from BigQuery, renders an animated video, and deploys to GitHub Pages for Zoom Rooms digital signage.

**Live**: https://imagine-finance.github.io/tv-dashboard/

## How It Works

1. **GitHub Actions** runs daily at 7am UTC (Mon-Fri) and on manual trigger
2. **Lightdash CLI** fetches metrics from BigQuery (completions, active loans, funder utilisation, etc.)
3. **Remotion** renders a 1920x1080 looping MP4 with 4 animated scenes
4. **GitHub Pages** serves the video via a full-screen auto-playing HTML page
5. **Zoom Rooms** digital signage loads the URL and auto-refreshes every 4 hours

## Manual Trigger

```bash
gh workflow run generate-dashboard.yml
```

## Local Development

```bash
# Interactive preview
cd remotion-dashboard && npm install && npm run dev

# Render video (uses existing metrics.json)
cd remotion-dashboard && npm run render
```
