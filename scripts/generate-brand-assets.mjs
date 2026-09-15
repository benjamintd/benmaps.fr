// Run after `npx playwright install chromium --only-shell` when the brand changes.
// Raster assets are committed; deployment builds do not need a browser.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const svg = await readFile("public/favicon.svg", "utf8");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await mkdir("public/icons", { recursive: true });
  async function render(size, filename, maskable = false) {
    await page.setViewportSize({ width: size, height: size });
    const art = maskable
      ? svg
          .replace('rx="13"', 'rx="0"')
          .replace("<path ", '<path transform="translate(6 6) scale(.7)" ')
      : svg;
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%}svg{width:100%;height:100%;display:block}</style>${art}`,
    );
    return page.screenshot({ path: filename, omitBackground: true });
  }
  const frames = [];
  for (const size of [16, 32, 48])
    frames.push(
      await render(size, size === 32 ? "public/favicon.png" : undefined),
    );
  // ICO directory containing PNG frames, for browsers requesting /favicon.ico.
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, i) => {
    const entry = 6 + i * 16;
    header[entry] = header[entry + 1] = [16, 32, 48][i];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  await writeFile("public/favicon.ico", Buffer.concat([header, ...frames]));
  await render(180, "public/apple-touch-icon.png", true);
  await render(192, "public/icons/icon-192.png");
  await render(512, "public/icons/icon-512.png");
  await render(512, "public/icons/icon-maskable-512.png", true);
  const font = await readFile(
    "public/fonts/commissioner/Commissioner-Variable.woff2",
  );
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<style>
    @font-face{font-family:Commissioner;src:url(data:font/woff2;base64,${font.toString("base64")})}
    *{box-sizing:border-box}body{margin:0;background:#fff;color:#20242c;font-family:Commissioner,Arial,sans-serif}
    main{height:630px;display:flex;flex-direction:column;justify-content:center;padding:100px}
    .brand{display:flex;align-items:center;gap:28px;font-size:92px;font-weight:500;letter-spacing:-4px}
    svg{width:110px;height:110px}b{color:#2e6ea2;font-weight:500}p{margin:38px 0 0;font-size:34px;color:#626975;letter-spacing:-.5px}
    small{position:absolute;bottom:52px;font-size:22px;color:#626975}
    </style><main><div class="brand">${svg}<span>benmaps<b>.</b></span></div><p>Maps and directions</p><small>benmaps.fr</small></main>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/social-preview.png" });
} finally {
  await browser.close();
}
