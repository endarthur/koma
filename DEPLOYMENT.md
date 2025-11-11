# Koma - GitHub Pages Deployment

## Enabling GitHub Pages

To deploy Koma to GitHub Pages at `https://endarthur.github.io/koma`, follow these steps:

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository: https://github.com/endarthur/koma
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar under "Code and automation")
4. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions"
5. Save the settings

### 2. Push Your Code

The `.github/workflows/deploy.yml` workflow is already configured. Simply push to main:

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

### 3. Monitor Deployment

1. Go to the **Actions** tab in your repository
2. Watch the "Deploy to GitHub Pages" workflow run
3. Once completed (green checkmark), your site will be live!

### 4. Access Your Site

Visit: **https://endarthur.github.io/koma**

The terminal should load immediately in your browser!

## What Gets Deployed

The deployment includes:
- `index.html` - Main entry point
- `src/` - All source code (Lexer, Parser, Shell, Commands, Kernel)
- `styles/` - CSS styling
- `examples/` - Example files and komarc
- `docs/` - Man pages and documentation

## Automatic Updates

Every time you push to `main`, GitHub Actions will automatically:
1. Run the deployment workflow
2. Upload the latest code
3. Deploy to GitHub Pages

No manual deployment needed!

## Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file to the repository root with your domain
2. Configure DNS settings:
   - Add a CNAME record pointing to `endarthur.github.io`
3. Enable "Enforce HTTPS" in repository settings

## Troubleshooting

### Deployment fails
- Check the Actions tab for error messages
- Ensure repository is public (or you have GitHub Pro for private repos)
- Verify Pages is enabled in Settings

### Site doesn't load
- Wait a few minutes after first deployment
- Check browser console for errors
- Ensure all paths are relative (no absolute `/` paths)

### Changes don't appear
- GitHub Pages caching can take 1-5 minutes
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Check Actions tab to ensure workflow completed

## Local Development

To test locally before deploying:

```bash
# Simple HTTP server
python -m http.server 8000

# OR with Node.js
npx http-server
```

Then visit: http://localhost:8000

## Features Available on GitHub Pages

✅ Full terminal emulation
✅ 46+ shell commands
✅ Virtual filesystem (IndexedDB)
✅ Man pages
✅ Tab management
✅ Vi-like text editor
✅ Backup/restore functionality
✅ Variable expansion ($HOME, $?, etc.)
✅ Pipelines and redirects
✅ test/[ conditionals
✅ All Phase 6 parser features

Enjoy your terminal anywhere! 🚀
