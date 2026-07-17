import { chromium } from "playwright";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

function parsePrice(value) {
  const numeric = String(value ?? "").replace(/[^0-9]/g, "");
  return numeric ? Number(numeric) : null;
}

async function getTrackedItems() {
  const response = await fetch(`${supabaseUrl}/rest/v1/price_watchlists?select=id,title,product_url,current_price,lowest_price&is_active=eq.true`, { headers });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function findCoupangPrice(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const parse = (value) => {
      const numeric = String(value ?? "").replace(/[^0-9]/g, "");
      return numeric ? Number(numeric) : null;
    };
    const metaPrice = document.querySelector('meta[itemprop="price"]')?.getAttribute("content");
    if (metaPrice) return { price: metaPrice, title: document.title };

    const selectors = [
      ".total-price strong",
      ".prod-sale-price strong",
      ".final-price-amount",
      ".prod-price strong",
      "[data-testid*='price']",
      "[class*='price'] strong",
    ];
    for (const selector of selectors) {
      const text = document.querySelector(selector)?.textContent;
      if (text && /[0-9]/.test(text)) return { price: text, title: document.title };
    }

    const values = [];
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      for (const [key, nested] of Object.entries(value)) {
        if (/(^price$|saleprice|finalprice|discountprice)/i.test(key) && typeof nested !== "object") {
          const candidate = parse(nested);
          if (candidate) values.push(candidate);
        }
        visit(nested);
      }
    };
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => {
        try { return JSON.parse(script.textContent ?? ""); } catch { return null; }
      });
    jsonLd.forEach(visit);
    if (values.length) return { price: values[0], title: document.title };

    const bodyText = document.body?.innerText ?? "";
    const labeledPrice = bodyText.match(/(?:판매가|쿠팡판매가|할인가|즉시할인가)\s*([0-9,]+)\s*원/);
    return { price: labeledPrice?.[1] ?? null, title: document.title };
  });

  return { price: parsePrice(result.price), title: result.title };
}

async function saveResult(item, price) {
  const changed = price !== Number(item.current_price);
  const lowestPrice = Math.min(Number(item.lowest_price), price);
  const patch = await fetch(`${supabaseUrl}/rest/v1/price_watchlists?id=eq.${encodeURIComponent(item.id)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ current_price: price, lowest_price: lowestPrice, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  if (!patch.ok) throw new Error(await patch.text());
  if (!changed) return;
  const history = await fetch(`${supabaseUrl}/rest/v1/price_history`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ watchlist_id: item.id, price, source: "crawler" }),
  });
  if (!history.ok) throw new Error(await history.text());
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "ko-KR",
});

try {
  for (const item of await getTrackedItems()) {
    try {
      await page.goto(item.product_url, { waitUntil: "domcontentloaded", timeout: 30000 });
       const result = await findCoupangPrice(page);
       if (!result.price) throw new Error(`Price element was not found. Page title: ${result.title}`);
       await saveResult(item, result.price);
       console.log(`${item.title}: ${result.price.toLocaleString("ko-KR")} KRW`);
    } catch (error) {
      console.error(`Failed to collect ${item.title}:`, error instanceof Error ? error.message : error);
    }
    await page.waitForTimeout(4000);
  }
} finally {
  await browser.close();
}
