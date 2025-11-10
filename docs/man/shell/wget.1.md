# NAME

wget - download files from URLs

## SYNOPSIS

```bash
wget <url>
wget <url> -O <filename>
wget -q <url>
```

## DESCRIPTION

The `wget` command downloads files from HTTP/HTTPS URLs and saves them to the virtual filesystem. It automatically extracts the filename from the URL or you can specify a custom name.

This is useful for:
- Downloading data files from APIs
- Fetching configuration files
- Getting JSON data
- Downloading scripts or text files

## OPTIONS

### -O, --output FILENAME

Save the downloaded file with a specific name. If not specified, wget extracts the filename from the URL.

**Example:**
```bash
wget https://example.com/data.json -O mydata.json
```

### -q, --quiet

Quiet mode - suppress progress and status messages. Only errors are shown.

**Example:**
```bash
wget -q https://api.github.com/users/octocat
```

## EXAMPLES

### Download with auto-detected filename

```bash
wget https://example.com/data.json
```

Downloads and saves as `data.json` in current directory.

### Specify output filename

```bash
wget https://api.github.com/users/octocat -O github-user.json
```

Saves the API response as `github-user.json`.

### Download in quiet mode

```bash
wget -q https://example.com/config.txt
```

Downloads without showing progress messages.

### Download to specific directory

```bash
cd /home/downloads
wget https://example.com/file.txt
```

Downloads to `/home/downloads/file.txt`.

### Use in shell scripts

```bash
# download-data.sh
echo "Fetching data..."
wget https://api.example.com/data.json -O data.json
echo "Processing data..."
cat data.json | grep "status"
echo "Done!"
```

### Download and process in pipeline

```bash
wget -q https://api.github.com/users/octocat -O user.json && cat user.json
```

Downloads and then displays the content.

## PRACTICAL USE CASES

### Download configuration files

```bash
wget https://raw.githubusercontent.com/user/repo/main/config.json
```

### Fetch API data

```bash
wget https://api.github.com/repos/anthropics/claude-code -O repo-info.json
cat repo-info.json
```

### Download and analyze

```bash
wget https://example.com/log.txt
grep error log.txt | wc -l
```

### Batch downloads in script

Create `download.sh`:
```bash
# Download multiple files
wget https://example.com/file1.txt
wget https://example.com/file2.txt
wget https://example.com/file3.txt
ls *.txt
```

Run: `sh download.sh`

### Download JSON and extract data

```bash
wget https://api.github.com/users/octocat -O user.json
cat user.json
# Manual JSON inspection (no jq yet, but coming in Phase 6!)
```

## OUTPUT FORMAT

### Default output

```
Downloading https://example.com/data.json...
Saved to data.json (1.25 KB)
Content-Type: application/json
```

### Quiet mode

No output on success. Errors still shown:
```
wget: HTTP 404: Not Found
```

## FILENAME EXTRACTION

wget automatically extracts filenames from URLs:

```
https://example.com/data.json        → data.json
https://example.com/path/to/file.txt → file.txt
https://example.com/                  → index.html
https://api.github.com               → api_github_com.txt
```

If no filename can be determined, uses `downloaded_file.txt`.

## CORS AND SECURITY

- Subject to browser CORS policies
- Can only fetch from servers that allow cross-origin requests
- Most public APIs (GitHub, etc.) support CORS
- Some websites may block requests

If you get CORS errors, the server doesn't allow browser requests.

## LIMITATIONS

Current limitations:

- **Text files only** - Binary files not supported yet (coming later)
- **No progress bar** - Just status messages
- **No resume** - Cannot resume interrupted downloads
- **No authentication** - No support for auth headers yet
- **CORS restrictions** - Subject to browser same-origin policy

Despite these limitations, wget is very useful for:
- Public APIs
- JSON data
- Configuration files
- Text-based resources
- Scripts and documentation

## NOTES

- Downloads are stored in the IndexedDB-backed VFS
- Files persist across page reloads
- Subject to browser storage limits
- Use `-O` to control filename
- Automatically handles HTTP redirects
- Shows file size and content type on success
- Only errors shown in quiet mode

## TROUBLESHOOTING

### "Invalid URL"
Ensure URL starts with `http://` or `https://`

### "CORS error" or "Network error"
The server doesn't allow browser requests. Try a different URL or use an API that supports CORS.

### "HTTP 404" or other errors
The URL doesn't exist or server is unavailable.

### Large files
Files are stored in IndexedDB. Very large downloads may exceed browser quotas.

## SEE ALSO

cat(1), sh(1), run(1)
