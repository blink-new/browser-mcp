# Browser MCP

A Model Context Protocol (MCP) server for browser automation using Puppeteer. This enables AI assistants like Claude, GPT, and other LLM-powered tools to navigate web pages, take screenshots, click elements, fill forms, and interact with web content.

## Features

- **Navigation**: Navigate to URLs, go back/forward, reload pages
- **Screenshots**: Capture full-page or viewport screenshots
- **Interaction**: Click, type, hover, scroll, select dropdown options
- **Content Extraction**: Get page content, titles, and links
- **JavaScript Execution**: Run custom scripts in the browser context
- **Wait Conditions**: Wait for elements or timeouts

## Installation

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm, pnpm, or bun

### Install via npx (Recommended)

You can run the server directly without installation:

```bash
npx github:blink-new/browser-mcp
```

### Install Globally

```bash
npm install -g github:blink-new/browser-mcp
```

### Install from Source

```bash
git clone https://github.com/blink-new/browser-mcp.git
cd browser-mcp
npm install
npm run build
```

## Setup Instructions

### Ubuntu / Debian Linux

1. **Install Node.js 18+**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install Chromium dependencies**:
   ```bash
   sudo apt-get install -y \
     libnss3 \
     libatk1.0-0 \
     libatk-bridge2.0-0 \
     libcups2 \
     libdrm2 \
     libxkbcommon0 \
     libxcomposite1 \
     libxdamage1 \
     libxfixes3 \
     libxrandr2 \
     libgbm1 \
     libasound2 \
     libpango-1.0-0 \
     libcairo2 \
     libatspi2.0-0
   ```

3. **Configure your MCP client** (see Configuration section below)

### macOS

1. **Install Node.js 18+** (using Homebrew):
   ```bash
   brew install node
   ```
   
   Or using nvm:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   nvm use 20
   ```

2. **Configure your MCP client** (see Configuration section below)

### Windows

1. **Install Node.js 18+**:
   - Download and install from [nodejs.org](https://nodejs.org/)
   - Or use winget: `winget install OpenJS.NodeJS.LTS`

2. **Configure your MCP client** (see Configuration section below)

## Configuration

### OpenCode

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "browser": {
      "type": "local",
      "command": ["npx", "-y", "github:blink-new/browser-mcp"],
      "enabled": true
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "github:blink-new/browser-mcp"]
    }
  }
}
```

### Cursor / VS Code with MCP Extension

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "github:blink-new/browser-mcp"]
    }
  }
}
```

### With Environment Variables

For headless servers or containers:

```json
{
  "mcp": {
    "browser": {
      "type": "local",
      "command": ["npx", "-y", "github:blink-new/browser-mcp"],
      "environment": {
        "BROWSER_MCP_NO_SANDBOX": "true",
        "BROWSER_MCP_HEADLESS": "true"
      },
      "enabled": true
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_MCP_HEADLESS` | Run browser in headless mode | `true` |
| `BROWSER_MCP_NO_SANDBOX` | Disable Chrome sandbox (required for Docker/root) | `false` |
| `BROWSER_MCP_EXECUTABLE_PATH` | Path to Chrome/Chromium executable | Auto-detected |
| `BROWSER_MCP_ARGS` | Additional Chrome arguments (comma-separated) | None |

## Available Tools

### Navigation

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_back` | Go back to previous page |
| `browser_forward` | Go forward to next page |
| `browser_reload` | Reload current page |

### Screenshots & Content

| Tool | Description |
|------|-------------|
| `browser_screenshot` | Take a screenshot (supports fullPage option) |
| `browser_title` | Get the page title |
| `browser_content` | Get HTML content (optional selector) |
| `browser_links` | Get all links on the page |

### Interaction

| Tool | Description |
|------|-------------|
| `browser_click` | Click on an element by CSS selector |
| `browser_type` | Type text into an input field |
| `browser_hover` | Hover over an element |
| `browser_select` | Select an option from a dropdown |
| `browser_scroll` | Scroll up or down |

### Utilities

| Tool | Description |
|------|-------------|
| `browser_wait` | Wait for time or element |
| `browser_evaluate` | Execute JavaScript |
| `browser_close` | Close the browser |

## Examples

### Navigate and Screenshot

```
User: Go to example.com and take a screenshot
AI: [Uses browser_navigate with url="https://example.com"]
AI: [Uses browser_screenshot]
```

### Fill a Form

```
User: Fill out the contact form on the page
AI: [Uses browser_type with selector="#name" text="John Doe"]
AI: [Uses browser_type with selector="#email" text="john@example.com"]
AI: [Uses browser_click with selector="#submit"]
```

### Extract Data

```
User: Get all the links from this page
AI: [Uses browser_links]
```

## Troubleshooting

### Linux: Browser fails to launch

If you see errors about missing libraries, install the Chromium dependencies:

```bash
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

### Docker/Root: Sandbox errors

Use the `--no-sandbox` flag:

```bash
BROWSER_MCP_NO_SANDBOX=true npx github:blink-new/browser-mcp
```

Or in your config:
```json
{
  "environment": {
    "BROWSER_MCP_NO_SANDBOX": "true"
  }
}
```

### macOS: Puppeteer can't find Chrome

The bundled Chromium should work automatically. If not, specify the path:

```bash
BROWSER_MCP_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx github:blink-new/browser-mcp
```

### Windows: Long path errors

Run PowerShell as Administrator and enable long paths:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

## Docker Support

Example Dockerfile:

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

ENV BROWSER_MCP_NO_SANDBOX=true
ENV BROWSER_MCP_HEADLESS=true

CMD ["npx", "-y", "github:blink-new/browser-mcp"]
```

## Development

```bash
# Clone the repository
git clone https://github.com/blink-new/browser-mcp.git
cd browser-mcp

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run production build
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

- Built with [Puppeteer](https://pptr.dev/)
- Uses [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
