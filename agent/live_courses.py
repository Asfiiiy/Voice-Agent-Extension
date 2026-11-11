import asyncio
import html
import re
import time
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx

# In-memory TTL Cache (TTL = 10 minutes)
_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SEC = 600

WEBSITES = {
    "ILC": {
        "name": "Inspire London College",
        "api_url": "https://inspirelondoncollege.co.uk/wp-json/wc/store/v1/products",
        "website": "https://inspirelondoncollege.co.uk",
    },
    "UKPDA": {
        "name": "UKPD Academy",
        "api_url": "https://ukpdacademy.co.uk/wp-json/wc/store/v1/products",
        "website": "https://ukpdacademy.co.uk",
    },
}

def _format_price(price_raw: Optional[str], minor_unit: int = 2, symbol: str = "£") -> str:
    """Converts WooCommerce minor-unit raw string (e.g. '8000' with minor 2) to '£80.00'."""
    if not price_raw or not price_raw.isdigit():
        return "N/A"
    val = int(price_raw) / (10 ** minor_unit)
    return f"{symbol}{val:.2f}"

def _parse_product(product: Dict[str, Any], site_label: str) -> Dict[str, Any]:
    """Extracts clean, agent-ready information from WooCommerce Store API JSON."""
    raw_name = product.get("name", "Unknown Course")
    name = html.unescape(raw_name)
    slug = product.get("slug", "")
    permalink = product.get("permalink", "")
    on_sale = product.get("on_sale", False)
    prices = product.get("prices", {})
    currency = prices.get("currency_symbol", "£")
    minor_unit = prices.get("currency_minor_unit", 2)

    regular_price = _format_price(prices.get("regular_price"), minor_unit, currency)
    current_price = _format_price(prices.get("price") or prices.get("sale_price"), minor_unit, currency)

    price_range = prices.get("price_range")
    if price_range and price_range.get("min_amount") and price_range.get("max_amount"):
        min_p = _format_price(price_range.get("min_amount"), minor_unit, currency)
        max_p = _format_price(price_range.get("max_amount"), minor_unit, currency)
        price_summary = f"{min_p} to {max_p} (depending on payment plan or options)"
    elif on_sale:
        price_summary = f"Sale price: {current_price} (Regular: {regular_price})"
    else:
        price_summary = f"{current_price}"

    # Extract payment modes & dates from attributes
    installment_options = []
    available_dates = []

    for attr in product.get("attributes", []):
        attr_name = (attr.get("name") or "").lower()
        terms = [t.get("name", "") for t in attr.get("terms", [])]
        if "payment" in attr_name or "mode" in attr_name or "instal" in attr_name:
            installment_options.extend(terms)
        elif "date" in attr_name or "schedule" in attr_name:
            available_dates.extend(terms)

    # Categories
    categories = [c.get("name", "") for c in product.get("categories", [])]

    # Availability
    stock_text = product.get("stock_availability", {}).get("text", "")
    is_in_stock = product.get("is_in_stock", True)
    availability = stock_text if stock_text else ("Available / Enrolling" if is_in_stock else "Waitlist")

    # Overview summary (cleaned text)
    raw_desc = product.get("short_description") or product.get("description") or ""
    clean_desc = re.sub(r'<[^>]+>', ' ', html.unescape(raw_desc)).strip()
    clean_desc = re.sub(r'\s+', ' ', clean_desc)
    overview = clean_desc[:200] + "..." if len(clean_desc) > 200 else clean_desc

    return {
        "site": site_label,
        "name": name,
        "price_summary": price_summary,
        "current_price": current_price,
        "regular_price": regular_price,
        "on_sale": on_sale,
        "installments": installment_options,
        "classroom_dates": available_dates,
        "availability": availability,
        "overview": overview,
        "categories": categories,
        "url": permalink,
    }

async def fetch_site_courses(site_key: str, query: str) -> List[Dict[str, Any]]:
    """Fetches matched courses from a single website."""
    site_info = WEBSITES.get(site_key)
    if not site_info:
        return []

    url = f"{site_info['api_url']}?search={urllib.parse.quote_plus(query)}&per_page=4"
    headers = {
        "User-Agent": "Mozilla/5.0",
    }

    try:
        timeout_config = httpx.Timeout(8.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout_config, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                raw_products = resp.json()
                if isinstance(raw_products, list):
                    return [_parse_product(p, site_info["name"]) for p in raw_products]
    except Exception as e:
        print(f"[LiveCourses] Query failed for {site_key} ('{query}'): {repr(e)}")

    return []

async def search_live_website(query: str) -> str:
    """
    Main function called by Sonia AI Voice Agent to fetch real-time course information.
    Checks memory cache first, then queries both live websites in parallel.
    """
    normalized_q = query.strip().lower()
    if not normalized_q:
        return "Please specify a course name or qualification to check live prices."

    # 1. Check TTL Cache
    cached = _cache.get(normalized_q)
    now = time.time()
    if cached and (now - cached["timestamp"]) < CACHE_TTL_SEC:
        return cached["result"]

    # 2. Query both ILC and UKPDA simultaneously in parallel
    results_ilc, results_ukpda = await asyncio.gather(
        fetch_site_courses("ILC", normalized_q),
        fetch_site_courses("UKPDA", normalized_q),
        return_exceptions=True
    )

    all_courses: List[Dict[str, Any]] = []
    list_ilc = results_ilc if isinstance(results_ilc, list) else []
    list_ukpda = results_ukpda if isinstance(results_ukpda, list) else []

    if list_ilc and list_ukpda:
        all_courses = list_ilc[:2] + list_ukpda[:2]
    else:
        all_courses = (list_ilc + list_ukpda)[:4]

    if not all_courses:
        # Fallback message
        return (
            f"No live products found matching '{query}' on the website store. "
            "Please check the standard qualification database for details."
        )

    # 3. Format into spoken-friendly response for Sonia
    formatted_chunks = []
    for c in all_courses[:4]:
        chunk = [f"• {c['name']} (Institution: {c['site']})"]
        chunk.append(f"  - Fee / Pricing: {c['price_summary']}")

        if c.get("classroom_dates"):
            # Limit to next 4 dates so agent doesn't read 10 dates at once
            upcoming = ", ".join(c["classroom_dates"][:4])
            chunk.append(f"  - Upcoming Classroom Dates in London: {upcoming}")

        if c.get("installments"):
            chunk.append(f"  - Payment Plans: {', '.join(c['installments'])}")

        if c.get("overview"):
            chunk.append(f"  - Overview: {c['overview']}")

        chunk.append(f"  - Enrollment Status: {c['availability']}")
        formatted_chunks.append("\n".join(chunk))

    result_text = "Live Website Course Records:\n\n" + "\n\n".join(formatted_chunks)

    # 4. Save to Cache
    _cache[normalized_q] = {
        "timestamp": now,
        "result": result_text,
    }

    return result_text

if __name__ == "__main__":
    # Quick standalone test
    async def _test():
        res = await search_live_website("phlebotomy")
        print(res)
    asyncio.run(_test())
