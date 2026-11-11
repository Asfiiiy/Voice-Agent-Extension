import os
import re
import time
import hashlib
import logging
from typing import Dict, Any, Optional, List, Tuple
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
load_dotenv()

logger = logging.getLogger("redis_cache")
logger.setLevel(logging.INFO)

# Config
REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
DEFAULT_TTL_SEC = int(os.getenv("REDIS_CACHE_TTL", "86400"))  # 24 Hours default TTL

# Lazy redis client initialization
_redis_client = None
_scripts_registered = False
_lua_get_and_track = None
_lua_set_and_track = None
_lua_get_popular = None

# ==============================================================================
# ATOMIC LUA SCRIPTS
# ==============================================================================

# Script 1: Atomic Fetch + Popularity Tracker
# KEYS[1] = faq:cache:<hash>
# KEYS[2] = faq:popular (Sorted Set)
# KEYS[3] = faq:stats:<hash> (Hash)
# ARGV[1] = query_key
# ARGV[2] = timestamp
# ARGV[3] = ttl_seconds
LUA_GET_AND_TRACK_SRC = """
local cache_key = KEYS[1]
local popular_key = KEYS[2]
local stats_key = KEYS[3]

local query_text = ARGV[1]
local now_ts = ARGV[2]
local ttl = tonumber(ARGV[3])

-- Check if cached item exists
local exists = redis.call('EXISTS', cache_key)
if exists == 0 then
    return {0}
end

-- Fetch cached fields
local fields = redis.call('HMGET', cache_key, 'title', 'summary', 'answer', 'category')
local title = fields[1] or ''
local summary = fields[2] or ''
local answer = fields[3] or ''
local category = fields[4] or ''

-- Atomically increment popularity count in the Leaderboard Sorted Set
local new_score = redis.call('ZINCRBY', popular_key, 1, query_text)

-- Increment hits in stats hash
local hits = redis.call('HINCRBY', stats_key, 'hits', 1)
redis.call('HSET', stats_key, 'last_accessed_at', now_ts)

-- Refresh TTL
redis.call('EXPIRE', cache_key, ttl)
redis.call('EXPIRE', stats_key, ttl)

return {1, title, summary, answer, category, tostring(hits), tostring(new_score)}
"""

# Script 2: Atomic Cache Store + Popularity Initialization
# KEYS[1] = faq:cache:<hash>
# KEYS[2] = faq:popular
# KEYS[3] = faq:stats:<hash>
# KEYS[4] = faq:all_queries (Set)
# ARGV[1] = query_key
# ARGV[2] = title
# ARGV[3] = summary
# ARGV[4] = answer
# ARGV[5] = category
# ARGV[6] = ttl_seconds
# ARGV[7] = timestamp
LUA_SET_AND_TRACK_SRC = """
local cache_key = KEYS[1]
local popular_key = KEYS[2]
local stats_key = KEYS[3]
local all_queries_key = KEYS[4]

local query_text = ARGV[1]
local title = ARGV[2]
local summary = ARGV[3]
local answer = ARGV[4]
local category = ARGV[5]
local ttl = tonumber(ARGV[6])
local now_ts = ARGV[7]

-- Save content hash
redis.call('HMSET', cache_key, 'title', title, 'summary', summary, 'answer', answer, 'category', category, 'created_at', now_ts)
redis.call('EXPIRE', cache_key, ttl)

-- Increment popularity in sorted set
local score = redis.call('ZINCRBY', popular_key, 1, query_text)

-- Initialize stats
redis.call('HSET', stats_key, 'query', query_text, 'last_accessed_at', now_ts)
redis.call('HINCRBY', stats_key, 'hits', 1)
redis.call('EXPIRE', stats_key, ttl)

-- Track in registry set
redis.call('SADD', all_queries_key, query_text)

return score
"""

# Script 3: Fetch Top N Most Asked Questions with Scores
# KEYS[1] = faq:popular
# ARGV[1] = limit
LUA_GET_POPULAR_SRC = """
local popular_key = KEYS[1]
local limit = tonumber(ARGV[1]) or 10

return redis.call('ZREVRANGE', popular_key, 0, limit - 1, 'WITHSCORES')
"""


def _get_redis():
    """Initializes and returns a thread-safe Redis connection with registered Lua scripts."""
    global _redis_client, _scripts_registered
    global _lua_get_and_track, _lua_set_and_track, _lua_get_popular

    if _redis_client is not None:
        return _redis_client

    try:
        import redis
        pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            db=REDIS_DB,
            socket_timeout=1.5,
            socket_connect_timeout=1.5,
            decode_responses=True,
            max_connections=20
        )
        client = redis.Redis(connection_pool=pool)
        client.ping()

        # Register compiled Lua scripts for maximum execution speed
        _lua_get_and_track = client.register_script(LUA_GET_AND_TRACK_SRC)
        _lua_set_and_track = client.register_script(LUA_SET_AND_TRACK_SRC)
        _lua_get_popular = client.register_script(LUA_GET_POPULAR_SRC)

        _redis_client = client
        _scripts_registered = True
        logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT} (DB: {REDIS_DB}) with Lua scripting enabled.")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis unavailable at {REDIS_HOST}:{REDIS_PORT} ({e}). Running in fallback mode.")
        _redis_client = None
        return None


def normalize_query(query: str) -> str:
    """Normalizes query for high-frequency hit matching: lowercase, strip punctuation and extra spaces."""
    if not query:
        return ""
    q = query.lower().strip()
    q = re.sub(r'[\?!\.,;:"\']+', '', q)
    q = re.sub(r'\s+', ' ', q)
    return q.strip()


def query_to_hash(norm_query: str) -> str:
    """Computes a compact SHA256 hex digest for cache keys."""
    return hashlib.sha256(norm_query.encode("utf-8")).hexdigest()[:16]


# ==============================================================================
# PUBLIC REDIS CACHE API
# ==============================================================================

def get_cached_faq(query: str) -> Optional[Dict[str, Any]]:
    """
    Atomically retrieves FAQ answer and increments popularity/hit counters using Lua script.
    Latency: ~0.2ms - 0.6ms.
    Returns None if cache miss or Redis unavailable.
    """
    client = _get_redis()
    if not client or not _lua_get_and_track:
        return None

    norm_q = normalize_query(query)
    if not norm_q:
        return None

    t0 = time.perf_counter()
    q_hash = query_to_hash(norm_q)
    cache_key = f"faq:cache:{q_hash}"
    popular_key = "faq:popular"
    stats_key = f"faq:stats:{q_hash}"

    try:
        now_ts = str(int(time.time()))
        res = _lua_get_and_track(
            keys=[cache_key, popular_key, stats_key],
            args=[norm_q, now_ts, DEFAULT_TTL_SEC]
        )

        if not res or res[0] == 0:
            return None

        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {
            "found": True,
            "title": res[1],
            "summary": res[2],
            "answer": res[3],
            "category": res[4],
            "hits": int(res[5]),
            "popularity_score": float(res[6]),
            "latency_ms": elapsed_ms,
            "source": "redis_lua_cache"
        }
    except Exception as e:
        logger.debug(f"Redis get_cached_faq error: {e}")
        return None


def cache_faq_answer(query: str, title: str, summary: str, answer: str, category: str = "faq", ttl: int = DEFAULT_TTL_SEC) -> bool:
    """
    Atomically caches a verified FAQ answer and tracks it in the popularity leaderboard using Lua.
    """
    client = _get_redis()
    if not client or not _lua_set_and_track:
        return False

    norm_q = normalize_query(query)
    if not norm_q or not answer:
        return False

    q_hash = query_to_hash(norm_q)
    cache_key = f"faq:cache:{q_hash}"
    popular_key = "faq:popular"
    stats_key = f"faq:stats:{q_hash}"
    all_queries_key = "faq:all_queries"

    try:
        now_ts = str(int(time.time()))
        _lua_set_and_track(
            keys=[cache_key, popular_key, stats_key, all_queries_key],
            args=[norm_q, title, summary, answer, category, ttl, now_ts]
        )
        return True
    except Exception as e:
        logger.debug(f"Redis cache_faq_answer error: {e}")
        return False


def get_most_asked_questions(limit: int = 10) -> List[Tuple[str, float]]:
    """
    Atomically retrieves the top N most asked student/admissions questions and their frequencies using Lua.
    Returns: [ (query_text, ask_count), ... ]
    """
    client = _get_redis()
    if not client or not _lua_get_popular:
        return []

    try:
        raw_list = _lua_get_popular(keys=["faq:popular"], args=[limit])
        results = []
        if raw_list and isinstance(raw_list, list):
            for i in range(0, len(raw_list), 2):
                q_text = raw_list[i]
                score = float(raw_list[i + 1])
                results.append((q_text, score))
        return results
    except Exception as e:
        logger.debug(f"Redis get_most_asked_questions error: {e}")
        return []


def warmup_popular_faqs():
    """
    Pre-seeds Redis with the top most frequently asked questions across admissions, refunds,
    campus details, and course qualifications so they are served with sub-millisecond response time.
    """
    client = _get_redis()
    if not client:
        return

    import rag

    # Canonical list of highest frequency admissions questions
    CORE_FAQS = [
        # Refunds & Policies
        ("what is your refund policy", "Inspire London College 14-Day Refund & Cancellation Policy"),
        ("can i get a refund", "Inspire London College 14-Day Refund & Cancellation Policy"),
        ("what is the cancellation policy", "Inspire London College 14-Day Refund & Cancellation Policy"),
        ("can i get an extension on vle", "VLE Platform Access Duration & 3-Month Extension Policy"),
        ("how long do i have access to moodle", "VLE Platform Access Duration & 3-Month Extension Policy"),

        # London Campus & Contact
        ("where is your london campus located", "Inspire London College London Campus Address, Phone & Hours"),
        ("what is your address in southall", "Inspire London College London Campus Address, Phone & Hours"),
        ("what are your phone support hours", "Inspire London College London Campus Address, Phone & Hours"),

        # Qualifications & Accreditations
        ("are your courses accredited", "Inspire London College Overview & Accreditations"),
        ("who accredits inspire london college", "Inspire London College Overview & Accreditations"),
        ("what is the difference between cpd and ofqual", "Difference Between CPD Courses and Ofqual Qualifications"),

        # Popular Courses & Practical Training
        ("tell me about phlebotomy training", "Phlebotomy Level 3 Practical Class-Based Training"),
        ("where are the phlebotomy live bloods sessions held", "Phlebotomy Practical Attendance, Location & Requirements"),
        ("tell me about health and social care level 3", "Level 3 Diploma in Health and Social Care (Best Seller)"),
        ("how much is the deposit for health and social care", "Level 3 Diploma in Health and Social Care (Best Seller)"),
        ("tell me about aet teacher training", "Education and Training Awards (AET / PTLLS)"),

        # Enrolment & Payment
        ("how do i enrol in a course", "Inspire London College 5-Step Enrolment & Onboarding"),
        ("what payment methods do you accept", "Payment Methods, Instalment Plans & Security"),
        ("do you provide corporate staff training", "Corporate Staff Training & Workforce Upskilling"),
        ("can international students enrol", "International Students & Non-UK Residents Admission"),
    ]

    count = 0
    for query, title in CORE_FAQS:
        # Match with rag.INDEX_CONTENT_TABLE
        item = next((it for it in rag.INDEX_CONTENT_TABLE if it["title"].lower() == title.lower()), None)
        if item:
            ok = cache_faq_answer(
                query=query,
                title=item["title"],
                summary=item["summary"],
                answer=item["content"],
                category=item["category"],
                ttl=DEFAULT_TTL_SEC * 7  # 7 days for core FAQs
            )
            if ok:
                count += 1

    logger.info(f"Warmed up {count} high-frequency admissions FAQs in Redis with Lua tracking.")
