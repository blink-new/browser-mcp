#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";

// Common device presets for responsive testing
const DEVICE_PRESETS: Record<string, { width: number; height: number; deviceScaleFactor?: number; isMobile?: boolean; hasTouch?: boolean }> = {
  "desktop": { width: 1920, height: 1080 },
  "laptop": { width: 1366, height: 768 },
  "tablet": { width: 768, height: 1024, isMobile: true, hasTouch: true },
  "tablet-landscape": { width: 1024, height: 768, isMobile: true, hasTouch: true },
  "mobile": { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  "mobile-small": { width: 320, height: 568, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  "iphone-14": { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  "iphone-14-pro-max": { width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  "iphone-se": { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  "pixel-7": { width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 },
  "samsung-galaxy-s21": { width: 360, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  "ipad": { width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  "ipad-pro": { width: 1024, height: 1366, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  "ipad-mini": { width: 744, height: 1133, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

const server = new Server(
  {
    name: "browser-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let browser: Browser | null = null;
let page: Page | null = null;

// Parse launch options from environment
function getLaunchOptions(): PuppeteerLaunchOptions {
  const headless = process.env.BROWSER_MCP_HEADLESS !== "false";
  const noSandbox = process.env.BROWSER_MCP_NO_SANDBOX === "true";
  const executablePath = process.env.BROWSER_MCP_EXECUTABLE_PATH || undefined;
  
  const args: string[] = [];
  if (noSandbox) {
    args.push("--no-sandbox", "--disable-setuid-sandbox");
  }
  
  // Add additional args from environment
  const extraArgs = process.env.BROWSER_MCP_ARGS;
  if (extraArgs) {
    args.push(...extraArgs.split(",").map(a => a.trim()).filter(Boolean));
  }

  return {
    headless,
    args: args.length > 0 ? args : undefined,
    executablePath,
  };
}

function getDefaultViewport(): { width: number; height: number; deviceScaleFactor?: number; isMobile?: boolean; hasTouch?: boolean } {
  // Check for device preset first
  const device = process.env.BROWSER_MCP_DEVICE?.toLowerCase();
  if (device && DEVICE_PRESETS[device]) {
    return DEVICE_PRESETS[device];
  }
  
  // Check for custom dimensions
  const width = parseInt(process.env.BROWSER_MCP_WIDTH || "1280", 10);
  const height = parseInt(process.env.BROWSER_MCP_HEIGHT || "720", 10);
  const deviceScaleFactor = process.env.BROWSER_MCP_SCALE ? parseFloat(process.env.BROWSER_MCP_SCALE) : undefined;
  const isMobile = process.env.BROWSER_MCP_MOBILE === "true";
  const hasTouch = process.env.BROWSER_MCP_TOUCH === "true" || isMobile;
  
  return { 
    width: isNaN(width) ? 1280 : width,
    height: isNaN(height) ? 720 : height,
    ...(deviceScaleFactor ? { deviceScaleFactor } : {}),
    ...(isMobile ? { isMobile } : {}),
    ...(hasTouch ? { hasTouch } : {}),
  };
}

async function getBrowser(): Promise<{ browser: Browser; page: Page }> {
  if (!browser) {
    browser = await puppeteer.launch(getLaunchOptions());
    page = await browser.newPage();
    
    // Set default viewport from environment or defaults
    const viewport = getDefaultViewport();
    await page.setViewport(viewport);
    
    // Set user agent for mobile if needed
    if (viewport.isMobile) {
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      );
    }
  }
  return { browser, page: page! };
}

// Tool definitions
const tools = [
  {
    name: "browser_navigate",
    description: "Navigate to a specific URL",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the current page",
    inputSchema: {
      type: "object" as const,
      properties: {
        fullPage: {
          type: "boolean",
          description: "Whether to capture the full page (default: false)",
          default: false,
        },
      },
    },
  },
  {
    name: "browser_title",
    description: "Get the page title",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "browser_content",
    description: "Get the HTML content of the current page",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to get content from specific element (optional)",
        },
      },
    },
  },
  {
    name: "browser_click",
    description: "Click on an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the element to click",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_type",
    description: "Type text into an input element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the input element",
        },
        text: {
          type: "string",
          description: "Text to type",
        },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "browser_links",
    description: "Get all links from the current page",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "browser_close",
    description: "Close the browser",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "browser_scroll",
    description: "Scroll the page",
    inputSchema: {
      type: "object" as const,
      properties: {
        direction: {
          type: "string",
          enum: ["up", "down"],
          description: "Direction to scroll",
        },
        amount: {
          type: "number",
          description: "Amount to scroll in pixels (default: 500)",
          default: 500,
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "browser_wait",
    description: "Wait for a specified time or for an element to appear",
    inputSchema: {
      type: "object" as const,
      properties: {
        timeout: {
          type: "number",
          description: "Time to wait in milliseconds (if no selector provided)",
        },
        selector: {
          type: "string",
          description: "CSS selector to wait for (optional)",
        },
      },
    },
  },
  {
    name: "browser_evaluate",
    description: "Execute JavaScript in the browser context",
    inputSchema: {
      type: "object" as const,
      properties: {
        script: {
          type: "string",
          description: "JavaScript code to execute",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "browser_select",
    description: "Select an option from a dropdown",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the select element",
        },
        value: {
          type: "string",
          description: "Value to select",
        },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "browser_hover",
    description: "Hover over an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the element to hover over",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_back",
    description: "Go back to the previous page",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "browser_forward",
    description: "Go forward to the next page",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "browser_reload",
    description: "Reload the current page",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "browser_resize",
    description: "Resize the browser viewport to test different screen sizes. Use preset device names or custom dimensions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        width: {
          type: "number",
          description: "Viewport width in pixels",
        },
        height: {
          type: "number",
          description: "Viewport height in pixels",
        },
        device: {
          type: "string",
          description: "Device preset: desktop, laptop, tablet, tablet-landscape, mobile, mobile-small, iphone-14, iphone-14-pro-max, iphone-se, pixel-7, samsung-galaxy-s21, ipad, ipad-pro, ipad-mini",
        },
        deviceScaleFactor: {
          type: "number",
          description: "Device scale factor (DPR), e.g., 2 for retina displays",
        },
        isMobile: {
          type: "boolean",
          description: "Whether to emulate mobile device",
        },
        hasTouch: {
          type: "boolean",
          description: "Whether to enable touch events",
        },
      },
    },
  },
  {
    name: "browser_viewport",
    description: "Get the current viewport size and device emulation settings",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const typedArgs = args as Record<string, unknown>;

  try {
    switch (name) {
      case "browser_navigate": {
        const { page: p } = await getBrowser();
        const url = typedArgs.url as string;
        await p.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        const title = await p.title();
        return {
          content: [
            {
              type: "text",
              text: `Navigated to ${url}\nPage title: ${title}`,
            },
          ],
        };
      }

      case "browser_screenshot": {
        const { page: p } = await getBrowser();
        const fullPage = (typedArgs.fullPage as boolean) || false;
        const screenshot = await p.screenshot({
          fullPage,
          encoding: "base64",
        });
        return {
          content: [
            {
              type: "image",
              data: screenshot as string,
              mimeType: "image/png",
            },
          ],
        };
      }

      case "browser_title": {
        const { page: p } = await getBrowser();
        const title = await p.title();
        return {
          content: [
            {
              type: "text",
              text: title,
            },
          ],
        };
      }

      case "browser_content": {
        const { page: p } = await getBrowser();
        let content: string;
        const selector = typedArgs.selector as string | undefined;
        if (selector) {
          const element = await p.$(selector);
          if (!element) {
            throw new Error(`Element not found: ${selector}`);
          }
          content = await element.evaluate((el) => el.innerHTML);
        } else {
          content = await p.content();
        }
        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      }

      case "browser_click": {
        const { page: p } = await getBrowser();
        const selector = typedArgs.selector as string;
        await p.click(selector);
        return {
          content: [
            {
              type: "text",
              text: `Clicked on ${selector}`,
            },
          ],
        };
      }

      case "browser_type": {
        const { page: p } = await getBrowser();
        const selector = typedArgs.selector as string;
        const text = typedArgs.text as string;
        await p.type(selector, text);
        return {
          content: [
            {
              type: "text",
              text: `Typed "${text}" into ${selector}`,
            },
          ],
        };
      }

      case "browser_links": {
        const { page: p } = await getBrowser();
        const links = await p.evaluate(() => {
          return Array.from(document.querySelectorAll("a")).map((a: HTMLAnchorElement) => ({
            text: a.textContent?.trim() || "",
            href: a.href,
          }));
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(links, null, 2),
            },
          ],
        };
      }

      case "browser_close": {
        if (browser) {
          await browser.close();
          browser = null;
          page = null;
        }
        return {
          content: [
            {
              type: "text",
              text: "Browser closed",
            },
          ],
        };
      }

      case "browser_scroll": {
        const { page: p } = await getBrowser();
        const direction = typedArgs.direction as "up" | "down";
        const amount = (typedArgs.amount as number) || 500;
        const scrollAmount = direction === "up" ? -amount : amount;
        await p.evaluate((y) => window.scrollBy(0, y), scrollAmount);
        return {
          content: [
            {
              type: "text",
              text: `Scrolled ${direction} by ${amount}px`,
            },
          ],
        };
      }

      case "browser_wait": {
        const { page: p } = await getBrowser();
        const timeout = typedArgs.timeout as number | undefined;
        const selector = typedArgs.selector as string | undefined;
        
        if (selector) {
          await p.waitForSelector(selector, { timeout: timeout || 30000 });
          return {
            content: [
              {
                type: "text",
                text: `Element ${selector} is now visible`,
              },
            ],
          };
        } else if (timeout) {
          await new Promise((resolve) => setTimeout(resolve, timeout));
          return {
            content: [
              {
                type: "text",
                text: `Waited ${timeout}ms`,
              },
            ],
          };
        } else {
          throw new Error("Either timeout or selector must be provided");
        }
      }

      case "browser_evaluate": {
        const { page: p } = await getBrowser();
        const script = typedArgs.script as string;
        const result = await p.evaluate((code) => {
          // eslint-disable-next-line no-eval
          return eval(code);
        }, script);
        return {
          content: [
            {
              type: "text",
              text: typeof result === "object" ? JSON.stringify(result, null, 2) : String(result),
            },
          ],
        };
      }

      case "browser_select": {
        const { page: p } = await getBrowser();
        const selector = typedArgs.selector as string;
        const value = typedArgs.value as string;
        await p.select(selector, value);
        return {
          content: [
            {
              type: "text",
              text: `Selected "${value}" in ${selector}`,
            },
          ],
        };
      }

      case "browser_hover": {
        const { page: p } = await getBrowser();
        const selector = typedArgs.selector as string;
        await p.hover(selector);
        return {
          content: [
            {
              type: "text",
              text: `Hovered over ${selector}`,
            },
          ],
        };
      }

      case "browser_back": {
        const { page: p } = await getBrowser();
        await p.goBack({ waitUntil: "networkidle2" });
        const url = p.url();
        return {
          content: [
            {
              type: "text",
              text: `Navigated back to ${url}`,
            },
          ],
        };
      }

      case "browser_forward": {
        const { page: p } = await getBrowser();
        await p.goForward({ waitUntil: "networkidle2" });
        const url = p.url();
        return {
          content: [
            {
              type: "text",
              text: `Navigated forward to ${url}`,
            },
          ],
        };
      }

      case "browser_reload": {
        const { page: p } = await getBrowser();
        await p.reload({ waitUntil: "networkidle2" });
        return {
          content: [
            {
              type: "text",
              text: "Page reloaded",
            },
          ],
        };
      }

      case "browser_resize": {
        const { page: p } = await getBrowser();
        const device = typedArgs.device as string | undefined;
        
        let viewport: { width: number; height: number; deviceScaleFactor?: number; isMobile?: boolean; hasTouch?: boolean };
        
        if (device && DEVICE_PRESETS[device.toLowerCase()]) {
          viewport = { ...DEVICE_PRESETS[device.toLowerCase()] };
        } else {
          const width = typedArgs.width as number | undefined;
          const height = typedArgs.height as number | undefined;
          
          if (!width || !height) {
            throw new Error("Either device preset or both width and height are required");
          }
          
          viewport = { width, height };
          
          if (typedArgs.deviceScaleFactor !== undefined) {
            viewport.deviceScaleFactor = typedArgs.deviceScaleFactor as number;
          }
          if (typedArgs.isMobile !== undefined) {
            viewport.isMobile = typedArgs.isMobile as boolean;
          }
          if (typedArgs.hasTouch !== undefined) {
            viewport.hasTouch = typedArgs.hasTouch as boolean;
          }
        }
        
        await p.setViewport(viewport);
        
        // Update user agent for mobile emulation
        if (viewport.isMobile) {
          await p.setUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
          );
        } else {
          await p.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          );
        }
        
        const actualViewport = p.viewport();
        return {
          content: [
            {
              type: "text",
              text: `Viewport resized to ${actualViewport?.width}x${actualViewport?.height}${device ? ` (${device})` : ""}${viewport.isMobile ? " (mobile mode)" : ""}`,
            },
          ],
        };
      }

      case "browser_viewport": {
        const { page: p } = await getBrowser();
        const viewport = p.viewport();
        const availableDevices = Object.keys(DEVICE_PRESETS).join(", ");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...viewport,
                availableDevicePresets: availableDevices,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Cleanup on exit
process.on("SIGINT", async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Browser MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
