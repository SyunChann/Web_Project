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
  await page.waitForTimeout(1500);

  const price = await page.evaluate(() => {
    const metaPrice = document.querySelector('meta[itemprop="price"]')?.getAttribute("content");
    if (metaPrice) return metaPrice;
    const selectors = [".total-price strong", ".final-price-amount", "[class*='price'] strong", "[class*='price']"];
    for (const selector of selectors) {
      const text = document.querySelector(selector)?.textContent;
      if (text && /[0-9]/.test(text)) return text;
    }
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => {
        try { return JSON.parse(script.textContent ?? ""); } catch { return null; }
      })
      .flat();
    const offer = jsonLd.find((item) => item?.offers?.price)?.offers;
    return offer?.price ?? null;
  });

  return parsePrice(price);
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
const page = await browser.newPage({ userAgent: "Mozilla/5.0 (compatible; PersonalPriceWatch/1.0)" });

try {
  for (const item of await getTrackedItems()) {
    try {
      await page.goto(item.product_url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const price = await findCoupangPrice(page);
      if (!price) throw new Error("Price element was not found.");
      await saveResult(item, price);
      console.log(`${item.title}: ${price.toLocaleString("ko-KR")} KRW`);
    } catch (error) {
      console.error(`Failed to collect ${item.title}:`, error instanceof Error ? error.message : error);
    }
    await page.waitForTimeout(4000);
  }
} finally {
  await browser.close();
}
