import os
import sys
import json
import re
import time
from urllib.parse import urljoin, urlparse
from html.parser import HTMLParser
import httpx

class WebTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ignore = False
        self.texts = []
        self.title = ""
        self.in_title = False
        self.links = set()

    def handle_starttag(self, tag, attrs):
        tag_lower = tag.lower()
        if tag_lower in ["script", "style", "nav", "footer", "noscript", "svg", "header"]:
            self.ignore = True
        if tag_lower == "title":
            self.in_title = True
        if tag_lower == "a":
            for k, v in attrs:
                if k.lower() == "href" and v:
                    cleaned_link = v.split("#")[0].rstrip("/")
                    if cleaned_link:
                        self.links.add(cleaned_link)

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower in ["script", "style", "nav", "footer", "noscript", "svg", "header"]:
            self.ignore = False
        if tag_lower == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title = data.strip()
        elif not self.ignore:
            cleaned = data.strip()
            if len(cleaned) > 2:
                self.texts.append(cleaned)


def clean_text_block(texts):
    filtered = []
    for t in texts:
        t_clean = re.sub(r'\s+', ' ', t).strip()
        if len(t_clean) < 3 or t_clean in [
            "Skip to content", "View More", "Read More", "Click Here", 
            "Close", "Menu", "Search", "Login", "Register", "Cart", "Checkout"
        ]:
            continue
        filtered.append(t_clean)
    return " ".join(filtered)


def fetch_page_content(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = httpx.get(url, timeout=15.0, follow_redirects=True, headers=headers)
        if resp.status_code != 200:
            return None
        
        parser = WebTextExtractor()
        parser.feed(resp.text)
        text = clean_text_block(parser.texts)
        
        base_domain = urlparse(str(resp.url)).netloc
        internal_links = set()
        for l in parser.links:
            abs_l = urljoin(str(resp.url), l).split("?")[0].rstrip("/")
            if urlparse(abs_l).netloc == base_domain:
                internal_links.add(abs_l)

        return {
            "url": str(resp.url),
            "title": parser.title or url,
            "content": text,
            "links": list(internal_links)
        }
    except Exception:
        return None


def is_valid_content_url(url):
    u = url.lower()
    junk = [
        "cart", "checkout", "wp-content", "wp-json", "feed", "author", "xmlrpc", 
        "account", "login", "register", "logout", "lost-password", "page_id", "shop",
        "tag", "replytocom", "elementor", "add-to-cart", "my-account"
    ]
    if any(j in u for j in junk):
        return False
    for ext in [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".zip", ".css", ".js", ".svg", ".mp4"]:
        if u.endswith(ext):
            return False
    return True


def discover_all_urls_from_sitemaps(base_url):
    """Tries to find and parse XML sitemaps to get 100% of website pages."""
    domain = urlparse(base_url).netloc
    scheme = urlparse(base_url).scheme or "https"
    root_url = f"{scheme}://{domain}"

    sitemap_candidates = [
        f"{root_url}/sitemap.xml",
        f"{root_url}/sitemap_index.xml",
        f"{root_url}/page-sitemap.xml",
        f"{root_url}/product-sitemap.xml",
    ]

    all_urls = set()
    headers = {"User-Agent": "Mozilla/5.0"}

    for sm_url in sitemap_candidates:
        try:
            r = httpx.get(sm_url, headers=headers, timeout=12.0, follow_redirects=True)
            if r.status_code == 200:
                locs = re.findall(r'<loc>(.*?)</loc>', r.text)
                for l in locs:
                    l = l.strip()
                    # If this is a nested sitemap (e.g. page-sitemap.xml, product-sitemap.xml)
                    if l.endswith(".xml"):
                        if any(k in l for k in ["page", "product", "course", "post"]):
                            try:
                                sub_r = httpx.get(l, headers=headers, timeout=12.0, follow_redirects=True)
                                if sub_r.status_code == 200:
                                    sub_locs = re.findall(r'<loc>(.*?)</loc>', sub_r.text)
                                    for sl in sub_locs:
                                        sl = sl.strip().split("?")[0].rstrip("/")
                                        if is_valid_content_url(sl) and urlparse(sl).netloc == domain:
                                            all_urls.add(sl)
                            except Exception:
                                pass
                    else:
                        norm = l.split("?")[0].rstrip("/")
                        if is_valid_content_url(norm) and urlparse(norm).netloc == domain:
                            all_urls.add(norm)
        except Exception:
            continue

    return list(all_urls)


def categorize_url(url):
    u = url.lower()
    if any(k in u for k in ["course", "training", "qualification", "diploma", "phlebotomy", "certificate"]):
        return "courses"
    elif "faq" in u:
        return "faq"
    elif "contact" in u:
        return "contact"
    elif any(k in u for k in ["refund", "policy", "terms"]):
        return "policy"
    elif any(k in u for k in ["fee", "price", "pricing"]):
        return "pricing"
    return "general"


def extract_entire_website(target_site_url, max_pages=100, output_path=None):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "..", "data", "my_knowledge_base.json")
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print("=" * 65)
    print(f"[*] WEBSITE FULL EXTRACTOR")
    print(f"[*] Target Website: {target_site_url}")
    print(f"[*] Max Pages Limit: {max_pages if max_pages > 0 else 'UNLIMITED'}")
    print(f"[*] Output File: {output_path}")
    print("=" * 65)

    # 1. Discover URLs via Sitemaps first
    print("\n[Step 1/2] Sitemaps se website ke tamam pages dhoond rahe hain...")
    discovered_urls = discover_all_urls_from_sitemaps(target_site_url)

    if discovered_urls:
        print(f"  [✓] Sitemap se {len(discovered_urls)} unique pages mil gaye!")
        urls_to_crawl = discovered_urls
    else:
        print("  [!] Sitemap nahi mila. Homepage se internal links follow karenge...")
        urls_to_crawl = [target_site_url]

    # Limit URLs if needed
    if max_pages > 0 and len(urls_to_crawl) > max_pages:
        urls_to_crawl = urls_to_crawl[:max_pages]

    print(f"\n[Step 2/2] Total {len(urls_to_crawl)} pages se data extract ho raha hai...")

    # Load existing pages if file exists to preserve or update
    existing_data = []
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
        except Exception:
            existing_data = []

    # Map existing URLs to keep IDs or merge
    existing_by_url = {p["url"].rstrip("/"): p for p in existing_data if "url" in p}
    
    extracted_count = 0
    start_time = time.time()

    for idx, page_url in enumerate(urls_to_crawl, 1):
        print(f"\n[{idx}/{len(urls_to_crawl)}] Extracting: {page_url}")
        content_data = fetch_page_content(page_url)

        if not content_data or len(content_data["content"]) < 80:
            print("      [-] Skipped (Page empty ya fetch fail)")
            continue

        category = categorize_url(content_data["url"])
        norm_url = content_data["url"].rstrip("/")

        page_record = {
            "title": content_data["title"],
            "url": content_data["url"],
            "category": category,
            "content": content_data["content"]
        }

        # Update existing or add new
        if norm_url in existing_by_url:
            existing_by_url[norm_url].update(page_record)
        else:
            existing_by_url[norm_url] = page_record

        extracted_count += 1
        print(f"      [+] Title: {content_data['title'][:45]}...")
        print(f"      [+] Length: {len(content_data['content']):,} chars | Category: {category}")

        # Auto-save every 5 pages so data is never lost
        if extracted_count % 5 == 0 or idx == len(urls_to_crawl):
            # Rebuild clean list with IDs
            all_saved = list(existing_by_url.values())
            for i, p in enumerate(all_saved, 1):
                p["id"] = i

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(all_saved, f, indent=2, ensure_ascii=False)
            print(f"      --> [Auto-Saved] Total {len(all_saved)} pages persisted to JSON.")

    elapsed = round(time.time() - start_time, 1)
    final_list = list(existing_by_url.values())
    for i, p in enumerate(final_list, 1):
        p["id"] = i

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 65)
    print(f"[✓] SUCCESS: Extraction mukammal ho gayi ({elapsed}s)")
    print(f"[✓] Total Pages in Knowledge Base: {len(final_list)}")
    print(f"[✓] File Location: {output_path}")
    print("=" * 65)
    print("\nAgla step: Qdrant Vector Database banane ke liye yeh command chalayein:")
    print(">>> docker exec callcenter-dashboard-agent python tools/build_qdrant.py\n")


if __name__ == "__main__":
    # Default website if none provided
    target = "https://inspirelondoncollege.co.uk/"
    max_p = 50

    if len(sys.argv) > 1:
        target = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2].isdigit():
        max_p = int(sys.argv[2])

    extract_entire_website(target, max_pages=max_p)
