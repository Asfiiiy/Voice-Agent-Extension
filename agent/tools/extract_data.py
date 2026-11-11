import os
import sys
import json
import re
import httpx
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

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
    # Filter repetitive short UI elements
    filtered = []
    for t in texts:
        t_clean = re.sub(r'\s+', ' ', t).strip()
        if len(t_clean) < 3 or t_clean in [
            "Skip to content", "View More", "Read More", "Click Here", 
            "Close", "Menu", "Search", "Login", "Register", "Cart"
        ]:
            continue
        filtered.append(t_clean)
    return " ".join(filtered)


def fetch_url(url):
    print(f"[*] Fetching: {url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = httpx.get(url, timeout=15.0, follow_redirects=True, headers=headers)
        if resp.status_code != 200:
            print(f"    [-] Status {resp.status_code} for {url}")
            return None
        parser = WebTextExtractor()
        parser.feed(resp.text)
        text_content = clean_text_block(parser.texts)
        
        # Absolute links
        base_domain = urlparse(str(resp.url)).netloc
        internal_links = set()
        for l in parser.links:
            abs_l = urljoin(str(resp.url), l).split("?")[0].rstrip("/")
            if urlparse(abs_l).netloc == base_domain:
                internal_links.add(abs_l)

        return {
            "url": str(resp.url),
            "title": parser.title or url,
            "content": text_content,
            "links": list(internal_links)
        }
    except Exception as e:
        print(f"    [-] Error fetching {url}: {e}")
        return None


def is_useful_url(url):
    u = url.lower()
    junk = ["cart", "checkout", "wp-content", "wp-json", "feed", "author", "xmlrpc", 
            "account", "login", "register", "logout", "lost-password", "page_id", "shop"]
    if any(j in u for j in junk):
        return False
    # Check extension
    for ext in [".jpg", ".png", ".pdf", ".zip", ".css", ".js", ".svg"]:
        if u.endswith(ext):
            return False
    return True


def crawl_site(start_url, max_pages=20):
    print(f"\n========================================================")
    print(f"AUTO-CRAWLER: Starting crawl for {start_url} (max: {max_pages} pages)")
    print(f"========================================================")
    visited = set()
    queue = [start_url]
    extracted = []

    while queue and len(extracted) < max_pages:
        current_url = queue.pop(0)
        norm_url = current_url.split("#")[0].rstrip("/")
        if norm_url in visited:
            continue
        visited.add(norm_url)

        data = fetch_url(current_url)
        if not data:
            continue

        if len(data["content"]) > 100:
            category = categorize_url(data["url"])
            extracted.append({
                "title": data["title"],
                "url": data["url"],
                "category": category,
                "content": data["content"]
            })
            print(f"    [+] Saved ({len(extracted)}/{max_pages}): {data['title'][:50]} ({len(data['content'])} chars)")

        # Enqueue new links
        for l in data["links"]:
            if l not in visited and is_useful_url(l) and l not in queue:
                queue.append(l)

    return extracted


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


def extract_website_pages(urls, output_file=None):
    if output_file is None:
        output_file = os.path.join(os.path.dirname(__file__), "..", "data", "my_knowledge_base.json")
    output_file = os.path.abspath(output_file)
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    all_pages = []
    page_id = 1
    seen_urls = set()

    for u in urls:
        norm_u = u.split("#")[0].rstrip("/")
        if norm_u in seen_urls:
            continue
        seen_urls.add(norm_u)

        data = fetch_url(u)
        if data and len(data["content"]) > 50:
            all_pages.append({
                "id": page_id,
                "title": data["title"],
                "url": data["url"],
                "category": categorize_url(data["url"]),
                "content": data["content"]
            })
            page_id += 1

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_pages, f, indent=2, ensure_ascii=False)

    print(f"\n[✓] SUCCESS: Extracted {len(all_pages)} pages saved to '{output_file}'.")
    print(f"    Aap is file ko open karke check aur edit kar sakti hain!")
    print(f"    Iske baad 'python tools/build_qdrant.py' run karein taake Qdrant me add ho sake.\n")


def load_urls_from_file():
    txt_path = os.path.join(os.path.dirname(__file__), "..", "data", "urls.txt")
    if os.path.exists(txt_path):
        with open(txt_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip() and not line.strip().startswith("#")]
            if lines:
                return lines
    return None


if __name__ == "__main__":
    output_path = os.path.join(os.path.dirname(__file__), "..", "data", "my_knowledge_base.json")

    # Mode 1: Auto-crawler
    if len(sys.argv) > 1 and sys.argv[1] == "--crawl":
        start_urls = []
        max_p = 20
        if len(sys.argv) > 2:
            if sys.argv[2] == "all":
                start_urls = ["https://inspirelondoncollege.co.uk/", "https://ukpdacademy.co.uk/"]
            else:
                start_urls = [sys.argv[2]]
        else:
            start_urls = ["https://inspirelondoncollege.co.uk/", "https://ukpdacademy.co.uk/"]

        if len(sys.argv) > 3 and sys.argv[3].isdigit():
            max_p = int(sys.argv[3])

        all_extracted = []
        for su in start_urls:
            pages = crawl_site(su, max_pages=max_p)
            all_extracted.extend(pages)

        # Assign IDs
        for idx, p in enumerate(all_extracted, 1):
            p["id"] = idx

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(all_extracted, f, indent=2, ensure_ascii=False)

        print(f"\n[✓] CRAWL COMPLETE: Extracted {len(all_extracted)} total pages saved to '{output_path}'.")
        print(f"    Aap is file ko check karein aur 'python tools/build_qdrant.py' run karein.")
        sys.exit(0)

    # Mode 2: Passed URLs via arguments
    if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        target_urls = sys.argv[1:]
        print(f"[*] Extracting {len(target_urls)} URLs provided via command line...")
        extract_website_pages(target_urls, output_path)
        sys.exit(0)

    # Mode 3: URLs from data/urls.txt
    urls_from_file = load_urls_from_file()
    if urls_from_file:
        print(f"[*] Found {len(urls_from_file)} URLs in 'data/urls.txt'...")
        extract_website_pages(urls_from_file, output_path)
        sys.exit(0)

    # Mode 4: Default fallback
    DEFAULT_URLS = [
        "https://inspirelondoncollege.co.uk/",
        "https://inspirelondoncollege.co.uk/about-us/",
        "https://inspirelondoncollege.co.uk/faq/",
        "https://inspirelondoncollege.co.uk/qualification-fee-and-pricing",
        "https://ukpdacademy.co.uk/",
        "https://ukpdacademy.co.uk/faqs/",
    ]
    print("[*] Extracting default URLs...")
    extract_website_pages(DEFAULT_URLS, output_path)
