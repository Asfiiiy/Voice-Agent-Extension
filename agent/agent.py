import anyio._backends._asyncio  # Preload anyio to avoid blocking asyncio loop during call start
import asyncio
import logging
import os
import sys
import time
import random
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Set root & plugin loggers to INFO/WARNING to prevent massive DEBUG eou-prediction console stalls on Windows
logging.getLogger().setLevel(logging.INFO)
for _noisy_logger in ("livekit.plugins.turn_detector", "httpx", "httpcore", "openai", "groq"):
    logging.getLogger(_noisy_logger).setLevel(logging.WARNING)

from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli, AutoSubscribe, llm, tts, tokenize, APIConnectOptions, text_transforms
from livekit.plugins import google, silero, cartesia, groq, openai, inworld
from livekit.plugins.google import beta
from livekit.plugins.turn_detector.english import EnglishModel

try:
    from livekit.plugins import deepgram
except ImportError:
    deepgram = None

from orchestrator import CallOrchestrator
from tts_edge import EdgeTTS, create_edge_tts
import rag
import redis_cache
import live_courses
import wp_connector
import json
import re
import dataclasses
from datetime import datetime, timezone, timedelta

# Load environment variables from agent directory as well as current working directory
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
load_dotenv()

# Advisor configuration (strictly from config/env, never from LLM arguments; Sonia is the AI caller)
_raw_advisor = os.getenv("ADVISOR_NAME", "").strip()
_raw_ext = os.getenv("ADVISOR_EXTENSION", "").strip()
if _raw_advisor and _raw_advisor.lower() not in ("sonia", "none", "unknown"):
    ADVISOR_NAME = _raw_advisor
    ADVISOR_DISPLAY = f"{ADVISOR_NAME} ({_raw_ext})" if _raw_ext else ADVISOR_NAME
    ADVISOR_TITLE = f"Senior Admissions Advisor {ADVISOR_DISPLAY}"
else:
    ADVISOR_NAME = ""
    ADVISOR_DISPLAY = "Admissions Advisor"
    ADVISOR_TITLE = "our admissions advisor"

# Deterministic LLM Configuration: Fixed Seed and Temperature 0.0
FIXED_LLM_SEED = int(os.getenv("LLM_SEED", "42"))

class VADSlowDetector(logging.Handler):
    """Tracks Silero VAD slower-than-realtime occurrences for DIAG=1 metrics."""
    def __init__(self):
        super().__init__()
        self.count = 0

    def emit(self, record):
        try:
            msg = record.getMessage().lower()
            if "slower than realtime" in msg or "vad inference is slower" in msg:
                self.count += 1
        except Exception:
            pass

vad_slow_detector = VADSlowDetector()
logging.getLogger("livekit.plugins.silero").addHandler(vad_slow_detector)
logging.getLogger().addHandler(vad_slow_detector)


def _bg_print(msg: str) -> None:
    """Dispatches console stdout writes to a worker thread so Windows conhost scrolling never blocks the asyncio audio loop."""
    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, print, msg)
    except RuntimeError:
        print(msg)


async def custom_speech_cleaner(text):
    """Sanitizes text stream before TTS: buffers to clause/sentence boundaries so currency & brackets spanning chunks are cleanly handled."""
    buffer = ""
    boundary_regex = re.compile(r'([.!?:\n;]+)')
    async for chunk in text:
        buffer += chunk
        parts = boundary_regex.split(buffer)
        if len(parts) > 1:
            complete_text = "".join(parts[:-1])
            buffer = parts[-1]
            c = re.sub(r'\(.*?\)', '', complete_text)
            c = re.sub(r'£(\d+)', r'\1 pounds', c)
            c = re.sub(r'1-on-1', 'one to one', c, flags=re.IGNORECASE)
            c = re.sub(r'[\*#•–—_`\(\)\ufffd]', ' ', c)
            if c.strip():
                yield c
    if buffer.strip():
        c = re.sub(r'\(.*?\)', '', buffer)
        c = re.sub(r'£(\d+)', r'\1 pounds', c)
        c = re.sub(r'1-on-1', 'one to one', c, flags=re.IGNORECASE)
        c = re.sub(r'[\*#•–—_`\(\)\ufffd]', ' ', c)
        if c.strip():
            yield c

# Global tracker for latest LLM turn token usage, finish_reason & provider (used by [TURN METRICS])
LAST_LLM_USAGE = {
    "provider": None,
    "model": None,
    "prompt_tokens": None,
    "completion_tokens": None,
    "finish_reason": None,
    "tool_calls": [],
}
LENGTH_CUTOFF_COUNT = 0
_TOKEN_USAGE_HISTORY = []  # List of (timestamp, token_count) for 60s sliding window TPM tracking

FILLER_PHRASES = [
    "Hmm, let me check that for you right away…",
    "Let me pull up those details for you…",
    "One moment, let me look that up in our database…",
    "Sure thing, let me check our current course catalogue…",
    "Just a second, pulling up the information for you now…",
    "Hmm, let me see what we have on that…",
    "Let me verify those course details for you…",
    "Right, let me fetch the latest information on that…",
    "One second while I check the course requirements and fees…",
    "Sure, give me just a moment to pull that up…",
    "Hmm, let me take a quick look at our system…",
    "Let me check the exact figures for you…",
    "Just pulling up the full course overview now…",
    "Bear with me for just a second while I check that…",
    "Let me check our system for the latest details…",
    "Right away, let me look into that for you…",
    "Hmm, let me find the exact course breakdown for you…",
    "One moment, let me check the schedule and fees for you…",
    "Sure, let me bring up the official course syllabus…",
    "Let me check that right now for you…",
    "Just checking our admissions database, one moment…",
    "Hmm, let me see what the entry requirements and fees are…",
    "Let me look that up for you right now…",
    "Allow me just a second to pull up those exact facts…",
    "Checking that for you right now, bear with me…",
    "Let me pull up the full details on that qualification…",
    "Sure, one moment while I access that course file…",
    "Hmm, let me get the exact module breakdown for you…",
    "One second, let me check what options we have available…",
    "Let me just pull up our verified admissions data on that…",
]
_last_filler = ""
_last_filler_time = 0.0
_ACTIVE_SESSION = None

def _get_random_filler() -> str:
    global _last_filler
    candidates = [p for p in FILLER_PHRASES if p != _last_filler]
    chosen = random.choice(candidates) if candidates else FILLER_PHRASES[0]
    _last_filler = chosen
    return chosen

def _speak_filler(force: bool = False):
    """Immediately speaks a randomly selected conversational filler before any tool lookup or retrieval delay."""
    global _last_filler_time
    now = time.time()
    if now - _last_filler_time < 2.5 and not force:
        return
    if _ACTIVE_SESSION:
        state = str(getattr(_ACTIVE_SESSION, "agent_state", "")).lower()
        if state == "speaking":
            return
        phrase = _get_random_filler()
        _last_filler_time = now
        try:
            _ACTIVE_SESSION.say(phrase, allow_interruptions=True, add_to_chat_ctx=False)
            print(f"[*] Played conversational filler: '{phrase}'")
        except Exception as e:
            if os.getenv("DIAG") == "1":
                _bg_print(f"[*] Filler notice: {e}")

def record_token_usage(tokens: int):
    now = time.time()
    _TOKEN_USAGE_HISTORY.append((now, tokens))
    while _TOKEN_USAGE_HISTORY and (now - _TOKEN_USAGE_HISTORY[0][0]) > 60:
        _TOKEN_USAGE_HISTORY.pop(0)

def get_tokens_per_minute() -> int:
    now = time.time()
    while _TOKEN_USAGE_HISTORY and (now - _TOKEN_USAGE_HISTORY[0][0]) > 60:
        _TOKEN_USAGE_HISTORY.pop(0)
    return sum(t for _, t in _TOKEN_USAGE_HISTORY)

_CALL_SUMMARY_NOTE = ""
_LAST_SUMMARIZED_COUNT = 0
_SUMMARY_IN_PROGRESS = False

def _update_summary_background_sync(dropped_items):
    global _CALL_SUMMARY_NOTE, _SUMMARY_IN_PROGRESS
    try:
        dialogue = []
        for it in dropped_items:
            role = getattr(it, "role", "unknown")
            text = getattr(it, "text_content", "") or getattr(it, "content", "")
            if text:
                dialogue.append(f"{role}: {text}")
        if not dialogue:
            return

        prompt = (
            "Summarize the following dropped earlier turns from a phone conversation between admissions advisor Sonia and a caller. "
            "Write a concise note (under 80 words) focusing on: "
            "1. Caller name and personal background / goals / schedule (e.g. night shifts). "
            "2. Specific fees, deposits, or payment plans already mentioned. "
            "3. Any preferred callback days or times already stated.\n\n"
            f"DIALOGUE:\n" + "\n".join(dialogue)
        )

        import httpx
        key = os.getenv("GROQ_API_KEY")
        if key:
            with httpx.Client(timeout=4.0) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={
                        "model": "qwen/qwen3.8-27b",
                        "messages": [
                            {"role": "system", "content": "You are a concise call context extractor. Output 2-3 short bullet points max."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.0,
                        "seed": FIXED_LLM_SEED,
                        "max_tokens": 120,
                    }
                )
                if res.status_code == 200:
                    summary = res.json()["choices"][0]["message"]["content"].strip()
                    _CALL_SUMMARY_NOTE = summary
                    if os.getenv("DIAG") == "1":
                        _bg_print(f"[*] Incremental call summary updated:\n{summary}")
    except Exception as e:
        if os.getenv("DIAG") == "1":
            _bg_print(f"[*] Notice updating earlier call summary: {e}")
    finally:
        _SUMMARY_IN_PROGRESS = False

def _trigger_background_summary(dropped_items):
    global _LAST_SUMMARIZED_COUNT, _SUMMARY_IN_PROGRESS
    if len(dropped_items) > _LAST_SUMMARIZED_COUNT and not _SUMMARY_IN_PROGRESS:
        _SUMMARY_IN_PROGRESS = True
        _LAST_SUMMARIZED_COUNT = len(dropped_items)
        try:
            loop = asyncio.get_running_loop()
            loop.run_in_executor(None, _update_summary_background_sync, dropped_items)
        except RuntimeError:
            import threading
            threading.Thread(target=_update_summary_background_sync, args=(dropped_items,), daemon=True).start()

def _trim_chat_ctx(chat_ctx: llm.ChatContext, max_turns: int = 8) -> llm.ChatContext:
    """Trims chat_ctx to system instructions + 'Earlier in this call' summary + last max_turns (16 items)."""
    global _CALL_SUMMARY_NOTE
    if not chat_ctx or not getattr(chat_ctx, "items", None):
        return chat_ctx
    items = list(chat_ctx.items)
    sys_items = [
        it for it in items
        if getattr(it, "type", "") == "message" and getattr(it, "role", "") in ("system", "developer")
    ]
    other_items = [
        it for it in items
        if not (getattr(it, "type", "") == "message" and getattr(it, "role", "") in ("system", "developer"))
    ]
    max_non_sys = max_turns * 2  # 8 turns = 16 messages
    if len(other_items) > max_non_sys:
        dropped = other_items[:-max_non_sys]
        other_items = other_items[-max_non_sys:]
        while other_items and getattr(other_items[0], "type", "") == "function_call_output":
            other_items.pop(0)
        _trigger_background_summary(dropped)

    if other_items and getattr(other_items[0], "type", "") == "message" and getattr(other_items[0], "role", "") == "assistant":
        other_items.insert(0, llm.ChatMessage(role="user", content=["Hello"]))

    injected = list(sys_items[:1])
    if _CALL_SUMMARY_NOTE:
        injected.append(
            llm.ChatMessage(
                role="system",
                content=[f"Earlier in this call:\n{_CALL_SUMMARY_NOTE}"]
            )
        )
    injected.extend(other_items)
    return llm.ChatContext(injected)

def _wrap_stream_for_usage(stream, provider_label: str, model_name: str):
    """Hooks into LLMStream to record exact prompt_tokens, finish_reason, tool_calls, and provider for [TURN METRICS]."""
    orig_send = stream._event_ch.send_nowait

    def _tracked_send(chunk):
        if getattr(chunk, "delta", None):
            if chunk.delta.content or chunk.delta.tool_calls:
                LAST_LLM_USAGE["provider"] = provider_label
                LAST_LLM_USAGE["model"] = model_name
            if chunk.delta.tool_calls:
                for tc in chunk.delta.tool_calls:
                    fn = getattr(tc, "function", None)
                    if fn and getattr(fn, "name", None):
                        if "<|" in fn.name:
                            fn.name = fn.name.split("<|")[0].strip()
                        calls_list = LAST_LLM_USAGE.setdefault("tool_calls", [])
                        if fn.name and fn.name not in calls_list:
                            calls_list.append(fn.name)
        if getattr(chunk, "usage", None) is not None:
            LAST_LLM_USAGE["provider"] = provider_label
            LAST_LLM_USAGE["model"] = model_name
            pt = getattr(chunk.usage, "prompt_tokens", None)
            ct = getattr(chunk.usage, "completion_tokens", None)
            if pt:
                LAST_LLM_USAGE["prompt_tokens"] = pt
                record_token_usage(pt)
                print(f"[PROMPT TOKENS] Turn prompt tokens: {pt} (Target: < 1,000) | 60s TPM: {get_tokens_per_minute()}/8,000")
            if ct:
                LAST_LLM_USAGE["completion_tokens"] = ct
        return orig_send(chunk)

    stream._event_ch.send_nowait = _tracked_send

    if hasattr(stream, "_parse_choice"):
        orig_parse = stream._parse_choice

        def _tracked_parse(chunk_id, choice, thinking_filter):
            f_reason = getattr(choice, "finish_reason", None)
            if f_reason:
                LAST_LLM_USAGE["finish_reason"] = f_reason
                if f_reason == "length":
                    global LENGTH_CUTOFF_COUNT
                    LENGTH_CUTOFF_COUNT += 1
                    _bg_print(f"[!] Warning: LLM completion cut off by length limit! (total length cut-offs: {LENGTH_CUTOFF_COUNT})")
            return orig_parse(chunk_id, choice, thinking_filter)

        stream._parse_choice = _tracked_parse

    return stream

class TrackedOpenAILLM(openai.LLM):
    """OpenAI LLM wrapper that trims history to 8 turns, passes tools with tool_choice='auto', and enforces max_retry=0."""
    def chat(self, *, chat_ctx, tools=None, conn_options=None, **kwargs):
        chat_ctx = _trim_chat_ctx(chat_ctx, max_turns=8)
        if conn_options is not None:
            conn_options = dataclasses.replace(conn_options, max_retry=0)
        else:
            conn_options = APIConnectOptions(timeout=4.0, max_retry=0)
        if tools and "tool_choice" not in kwargs:
            kwargs["tool_choice"] = "auto"
        extra = kwargs.get("extra_kwargs") or {}
        extra["seed"] = FIXED_LLM_SEED
        extra["temperature"] = 0.0
        kwargs["extra_kwargs"] = extra
        if os.getenv("DIAG") == "1":
            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] chat_ctx sent to OpenAI ({self.model}): {len(chat_ctx.items)} items")
        stream = super().chat(chat_ctx=chat_ctx, tools=tools, conn_options=conn_options, **kwargs)
        return _wrap_stream_for_usage(stream, "OpenAI", self.model)

class TrackedGroqLLM(groq.LLM):
    """Groq LLM wrapper that trims history to 8 turns, always passes consistent tools with tool_choice='auto', enforces max_retry=0, seed, and temperature=0.0."""
    def chat(self, *, chat_ctx, tools=None, conn_options=None, **kwargs):
        chat_ctx = _trim_chat_ctx(chat_ctx, max_turns=8)
        if conn_options is not None:
            conn_options = dataclasses.replace(conn_options, max_retry=0)
        else:
            conn_options = APIConnectOptions(timeout=3.5, max_retry=0)
        if tools and "tool_choice" not in kwargs:
            kwargs["tool_choice"] = "auto"
        extra = kwargs.get("extra_kwargs") or {}
        extra["seed"] = FIXED_LLM_SEED
        extra["temperature"] = 0.0
        kwargs["extra_kwargs"] = extra
        if os.getenv("DIAG") == "1":
            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] chat_ctx sent to LLM ({self.model}): {len(chat_ctx.items)} items")
        stream = super().chat(chat_ctx=chat_ctx, tools=tools, conn_options=conn_options, **kwargs)
        return _wrap_stream_for_usage(stream, "Groq", self.model)


class SafeGeminiLLM(google.LLM):
    """
    Resilient Gemini fallback LLM:
    1. Trims history to last 6 turns.
    2. Converts prior non-Gemini function_call / function_call_output items into plain text
       messages so Gemini never fails with 400 'Function call is missing a thought_signature'.
    3. Enforces >=10.0s timeout and max_retry=0.
    """
    def chat(self, *, chat_ctx, tools=None, conn_options=None, **kwargs):
        chat_ctx = _trim_chat_ctx(chat_ctx, max_turns=8)
        known_sigs = getattr(self, "_thought_signatures", {}) or {}
        sanitized_items = []
        for item in chat_ctx.items:
            itype = getattr(item, "type", "")
            if itype == "function_call":
                cid = getattr(item, "call_id", None)
                if cid and cid in known_sigs:
                    sanitized_items.append(item)
                # Otherwise omit raw FunctionCall from another provider (Groq) to avoid 400 missing thought_signature
            elif itype == "function_call_output":
                cid = getattr(item, "call_id", None)
                if cid and cid in known_sigs:
                    sanitized_items.append(item)
                else:
                    # Convert Groq's tool output into a plain user context note so Gemini has the retrieved facts
                    t_name = getattr(item, "name", "tool")
                    t_out = getattr(item, "output", "")
                    sanitized_items.append(
                        llm.ChatMessage(
                            role="user",
                            content=[f"[Verified Course Lookup from {t_name}]:\n{t_out}"],
                        )
                    )
            else:
                sanitized_items.append(item)

        clean_ctx = llm.ChatContext(sanitized_items)
        if conn_options is not None:
            new_timeout = max(conn_options.timeout, 10.0)
            conn_options = dataclasses.replace(conn_options, timeout=new_timeout, max_retry=0)
        else:
            conn_options = APIConnectOptions(timeout=10.5, max_retry=0)
        if os.getenv("DIAG") == "1":
            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] chat_ctx sent to LLM ({self.model}): {len(clean_ctx.items)} items")
        extra = kwargs.get("extra_kwargs") or {}
        extra["seed"] = FIXED_LLM_SEED
        extra["temperature"] = 0.0
        kwargs["extra_kwargs"] = extra
        stream = super().chat(chat_ctx=clean_ctx, tools=tools, conn_options=conn_options, **kwargs)
        return _wrap_stream_for_usage(stream, "Gemini", self.model)


INBOUND_SYSTEM_INSTRUCTIONS = (
    "You are Sonia, Senior Admissions Advisor at Inspire London College (ILC).\n\n"
    "CALLER NAME & PERSONALIZATION (MEMORY):\n"
    "- If the caller shares their name at any point (e.g. in response to your greeting or later), remember it and naturally address them by their name (e.g., 'Certainly, Alex...', 'Great question, Alex...').\n"
    "- Remember their educational background, schedule constraints, and goals mentioned earlier in the call.\n\n"
    "SPOKEN STYLE & TONE:\n"
    "- Speak in warm, empathetic, confident, professional British English.\n"
    "- You are a helpful, consultative, and convincing admissions advisor guiding the caller step-by-step.\n"
    "- Keep each spoken response short, conversational, and natural (1 to 3 spoken sentences per turn).\n"
    "- Never use markdown, asterisks, bullet points, numbered lists, or brackets.\n"
    "- Never tell the caller to wait, hold on, or hang up.\n\n"
    "COURSE INQUIRY: REGULATED VS CPD RECOGNITION (STRICT RULE):\n"
    "- RECOGNIZE REGULATED QUALIFICATIONS IMMEDIATELY:\n"
    "  * If the caller mentions ANY awarding body or regulatory term (such as 'OTHM', 'Qualifi', 'NVQ', 'RQF', 'NOCN', 'iCQ', 'Focus Awards', 'ETA Awards', 'Ofqual', or 'regulated qualification'):\n"
    "    -> You IMMEDIATELY know they are asking for an Ofqual-regulated qualification!\n"
    "    -> DO NOT ask whether they want a qualification or CPD course (they already told you by naming the awarding body/framework!).\n"
    "    -> If they also gave the course subject and level (e.g., 'Qualifi Level 3 Health and Social Care', 'OTHM Level 7 in Management'): call get_course_info immediately and share the brief 1-2 sentence overview.\n"
    "    -> If they mentioned the awarding body and subject but NOT the level (e.g., 'Do you have OTHM Health and Social Care?'): do NOT ask about CPD; simply ask which level they prefer (e.g. Level 3, 4, 5, or 7).\n"
    "- ONLY CONFIRM WHEN NO AWARDING BODY OR FRAMEWORK WAS MENTIONED:\n"
    "  * If the caller asks broadly about a subject or course without naming an awarding body or framework (e.g., 'Tell me about health and social care', 'I want a course in business', 'What level 3 courses do you have?'):\n"
    "    -> DO NOT dump a full course specification immediately.\n"
    "    -> Ask a quick clarifying question to confirm whether they want an Ofqual-regulated qualification (awarded by Qualifi or OTHM) or a short CPD course.\n"
    "    -> Example: 'We offer both Ofqual-regulated qualifications—such as our Level 3 Diploma awarded by Qualifi or OTHM—and shorter CPD accredited courses. Are you looking for a formal regulated qualification for career progression, or a short CPD course?'\n"
    "  * Once they clarify qualification or CPD, call get_course_info or search_courses to fetch verified facts.\n\n"
    "PROGRESSIVE DISCLOSURE (NEVER GIVE ALL DATA IN ONE GO):\n"
    "- When giving course information, give ONLY a short overview (1-2 sentences): the official title, level, awarding body, and 100% online self-paced study format.\n"
    "- Follow up with a dynamic, conversational question asking what they'd like to explore next (e.g. 'Would you like to hear about the entry requirements, the tuition fees and payment options, or the modules you’ll be covering?').\n"
    "- ENTRY REQUIREMENTS: Only explain the entry requirements when the caller asks about entry requirements or eligibility. Explain them clearly and reassuringly (e.g., age requirement, English proficiency, prior experience or qualifications).\n"
    "- TUITION FEES & INSTALLMENTS: Only state fees when the caller asks about price, fees, or installments. Always state the full price and the flexible monthly installment plan from the tool output (e.g., 'The full fee is £679, or you can start with a flexible deposit of £75 followed by 10 monthly payments of £45.40. Would upfront payment or monthly installments work best for you?').\n"
    "- MODULES & CURRICULUM: Only list modules when the caller asks about what they will study or the curriculum. Name 3 to 4 core units and mention that optional modules are also available.\n\n"
    "FAST TRACK / 4-MONTH ACCELERATED PLAN (IMPORTANT):\n"
    "- Our Fast Track plan is also known as the 4-month plan! It allows students to complete the full qualification in 4 months instead of the standard 6 to 12 months.\n"
    "- When a caller asks about a 4-month plan, duration options, or Fast Track:\n"
    "  * Confirm immediately that YES, Fast Track is our 4-month accelerated option.\n"
    "  * State the plan details: e.g. 'Yes! We offer a Fast Track option which allows you to complete the qualification in 4 months. You can pay in full or use our Fast Track installment plan starting from a £279 deposit followed by £100 monthly payments.'\n"
    "  * Never claim we do not have a 4-month plan for qualifications.\n\n"
    "INTERRUPTIONS & REFERENCE MEMORY (STRICT):\n"
    "- When the caller interrupts you while you are speaking to ask a new question (e.g., 'What is the full fee?', 'Is there a four month plan?', 'What about the 6-month plan?'):\n"
    "  * Treat their interruption as your ONLY active query. Do NOT resume or finish your previous sentence.\n"
    "  * NEVER repeat previous sentences or mix duplicate responses.\n"
    "  * USE REFERENCE MEMORY: Keep the active course context already established in the conversation! For example, if you were discussing the Qualifi Level 3 Diploma in Health and Social Care, you already know the course! Answer their new specific question (about the fee, 4-month Fast Track plan, 6-month plan, entry requirements, or modules) directly in 1 to 2 concise spoken sentences without re-introducing the course from scratch.\n\n"
    "STRICT ACCURACY & ZERO HALLUCINATION:\n"
    "- Differentiate strictly between Regulated Qualifications (Ofqual-recognized: OTHM, Qualifi, Focus Awards, NOCN, iCQ, ETA Awards) and CPD courses (Step Ahead CPD Qualifications).\n"
    "- Every single fee, deposit, installment, duration, and module name must come directly from verified tool output. Never fabricate numbers or course names.\n\n"
    "SEARCHING COURSES:\n"
    "- When the caller asks what courses we offer in a subject or level, call search_courses to list options, and ask which one aligns with their background.\n\n"
    "COURSE RECOMMENDATIONS (ADDITIVE FEATURE):\n"
    "- When a caller asks for a course recommendation, advice on what to study, or asks broadly about a field (e.g., 'What do you recommend for nursing?', 'Can you recommend an IT course?', 'What business courses do you suggest?', 'Do you have anything in law?', 'What course should I take?'):\n"
    "  * Call recommend_courses with the subject or field (e.g., 'nursing', 'health', 'it', 'cyber security', 'business', 'law', 'accounting', 'teaching', 'cscs').\n"
    "  * Share the top recommended qualification and why it fits their goal in 1 to 2 warm, natural spoken sentences.\n"
    "  * Follow up with the conversational question provided in the tool output (e.g. for nursing: 'Are you looking to progress onto a university nursing degree, or advance within your current care role?').\n\n"
    "COLLEGE INFORMATION & POLICY:\n"
    "- Call lookup_page_content when asked about our London campus location in Southall, 14-day refund policy, LMS extensions, or college accreditations.\n\n"
    "CALLBACK BOOKING (STRICT):\n"
    "- When the caller wants to enroll or speak with an admissions advisor, offer to schedule a callback.\n"
    "- schedule_callback may ONLY be called when the caller has explicitly spoken BOTH a specific day AND a specific UK time in their own words (Mon-Fri 10:00-17:00 UK). Never guess or assume.\n"
    "- If schedule_callback returns FAILED, you MUST NOT say the callback is booked — tell the caller our advisor team will call back today to confirm.\n"
    "- Only when schedule_callback returns SUCCESS may you confirm the booked day and UK time."
)


def build_outbound_instructions(lead_name: str, course_inquired: str) -> str:
    db_info = wp_connector.get_course_details_from_db(course_inquired, threshold=0.30)
    if db_info.get("status") == "FOUND":
        title = db_info.get("title") or course_inquired
        level = db_info.get("level") or "Ofqual Regulated"
        awarding_body = db_info.get("awarding_body") or "Ofqual Regulated Awarding Organisation"
        fee = db_info.get("fee") or "£856"
        sale_price = db_info.get("sale_price") or "£629"
        deposit = db_info.get("deposit") or "£250"
        monthly = db_info.get("monthly_amount") or "£53.75"
        months = db_info.get("months") or 8
        duration = db_info.get("duration") or "6 to 12 months (100% online self-paced)"
        assessment = db_info.get("assessment") or "Assignments / report writing, zero exams"
        cert = "Recognised Certificate from " + awarding_body
        units_val = db_info.get("units") or []
        units_summary = f"({len(units_val)}): " + ", ".join(units_val) if units_val else "Core accredited qualification units"
    else:
        title = course_inquired
        level = "Ofqual Regulated"
        awarding_body = "Ofqual Regulated Awarding Organisation"
        fee = "Available upon request"
        sale_price = "Available upon request"
        deposit = "Flexible deposit"
        monthly = "Monthly instalment plan"
        months = "6 to 8"
        duration = "6 to 12 months (100% online self-paced)"
        assessment = "Assignments / coursework, zero exams"
        cert = "Official Certificate and Transcript included"
        units_summary = "Core accredited units"

    return (
        f"You are Sonia, Admissions Advisor at Inspire London College, calling {lead_name}.\n\n"
        f"ENQUIRED COURSE FACTS:\n"
        f"- Course: {title}\n"
        f"- Awarding Body: {awarding_body} | Level: {level}\n"
        f"- Duration: {duration}\n"
        f"- Assessment: {assessment} | Certificate: {cert}\n"
        f"- Fees: {sale_price} if paid in full, or a {deposit} deposit and {months} monthly payments of {monthly} (standard fee {fee})\n"
        f"- Units {units_summary}\n\n"
        f"CONVERSATION FLOW (STRICT):\n"
        f"1. OPENING: Opening greeting was already spoken. When caller confirms speaking, say: 'I'm Sonia from Inspire London College — you filled in a form about our {title}. Have you got two minutes to chat?' DO NOT call get_course_info or any tool on this turn — facts for {title} are already in ENQUIRED COURSE FACTS above.\n"
        f"2. ONE PIECE PER TURN: When caller says yes, explain an overview and duration, ending with a short question. When asked about modules, units, or what they will study, state 3 to 4 key core units directly from ENQUIRED COURSE FACTS above.\n"
        f"3. STRICT NUMBER & UNIT ACCURACY: Any number (fees, units, months, deposit) must be read directly from the most recent tool output or ENQUIRED COURSE FACTS above, never recalled from memory or assumed. If units are listed as Units (N), there are exactly N units. If the caller asks about a detail you did not fetch in this turn, call get_course_info again.\n"
        f"4. PAYMENT WORDING: When asked about fees, always state: '{sale_price} if you pay in full, or a {deposit} deposit and {months} monthly payments of {monthly}.' Never call the full fee the regular fee without the upfront option.\n"
        f"5. OTHER SUBJECTS: If they ask for other subjects, call search_courses. Offer max 3 options in ONE natural spoken sentence: e.g. 'We've got an OTHM Level 3 in IT, a Level 2 in cyber security basics, or a Level 5 if you want to go deeper — which sounds closer?' Never speak numbered or bulleted lists. NEVER invent courses, module counts, or units.\n"
        f"6. CLOSING & CALLBACK: When ready to enrol or after answering questions, say: 'Would you like me to book a quick call with our admissions advisor to help you enrol?' When they agree, ask naturally: 'What day and time suit you? Our advisors are free weekdays, ten till five UK time.' Call schedule_callback ONLY after they speak both a specific day and time. Never call the advisor Sonia; Sonia is you.\n"
        f"7. STYLE & NO BRACKETS: Max 2 short spoken sentences per turn. Never use brackets or parentheses anywhere in spoken replies. Say full course name once, then 'the course' or 'the diploma'.\n"
        f"8. POLICY & LOCATION: If asked about refund policy, campus location in Southall, or accreditation, call lookup_page_content."
    )


# Track whether a tool is currently executing so silence timer never fires mid-tool
_TOOL_IN_PROGRESS = False
_CURRENT_ENQUIRED_COURSE = ""


@llm.function_tool(
    name="get_course_info",
    description="Look up complete official facts (full qualification title, awarding body, RQF level, tuition fees, sale price, deposit, monthly installment plan, duration, online study format, assignment-based assessment, entry requirements, and syllabus modules) for any qualification in our college database."
)
async def get_course_info(course_name: str) -> str:
    """Fetches real course details from the WordPress database with threshold matching."""
    global _TOOL_IN_PROGRESS
    # Guard: if caller asks about lead's own course in an outbound call, return immediately
    if _CURRENT_ENQUIRED_COURSE and (
        wp_connector.score_course_match(course_name, _CURRENT_ENQUIRED_COURSE) >= 0.50
        or course_name.lower().strip() in _CURRENT_ENQUIRED_COURSE.lower()
        or _CURRENT_ENQUIRED_COURSE.lower() in course_name.lower().strip()
    ):
        print(f"[*] get_course_info: requested '{course_name}' matches lead inquired course '{_CURRENT_ENQUIRED_COURSE}' -> using injected facts directly.")
        return (
            f"Facts for '{course_name}' are already in ENQUIRED COURSE FACTS in your system instructions above. "
            f"Do NOT call get_course_info for the lead's own course; answer the caller directly using the instructions."
        )

    _TOOL_IN_PROGRESS = True
    _speak_filler(force=True)
    try:
        print(f"[*] Tool called: get_course_info(course_name='{course_name}')")
        data = await asyncio.to_thread(wp_connector.get_course_details_from_db, course_name, 0.35)
        if not data or data.get("status") == "NOT_FOUND":
            closest = data.get("closest_courses", []) if data else []
            closest_str = f" Closest matches in our database: {', '.join(closest)}." if closest else ""
            return f"Course '{course_name}' was not found in our catalogue.{closest_str} Never invent courses or units."

        units_val = data.get("units")
        if isinstance(units_val, list):
            units_str = f"{len(units_val)} Units: " + ", ".join(units_val[:8])
            if len(units_val) > 8:
                units_str += f" (plus {len(units_val) - 8} more units)"
        elif units_val:
            units_str = str(units_val)
        else:
            units_str = "Comprehensive accredited qualification modules"

        cert_val = data.get("certificate") or "Recognised Certificate and Transcript included."
        req_val = data.get("entry_requirements") or "Aged 18 or above with Level 3 qualification or relevant work experience."

        full_price = str(data.get('sale_price') or data.get('fee') or '')
        if full_price and not full_price.startswith('£'):
            full_price = f"£{full_price}"

        fee_str = f"{full_price} paid in full" if full_price else "Course fee available online"
        if data.get('deposit') and data.get('monthly_amount'):
            months_cnt = f"{data.get('months')} " if data.get('months') else ""
            fee_str += f", or a flexible installment plan from {data.get('deposit')} initial deposit followed by {months_cnt}monthly payments of {data.get('monthly_amount')}"
        if data.get('installments_summary') and data.get('installments_summary') != "Pay in full online.":
            fee_str += f" ({data.get('installments_summary')})"

        duration_val = data.get("duration") or "6 to 12 months (flexible self-paced)"
        assessment_val = data.get("assessment") or "100% assignment and coursework-based with no written exams"

        course_type_str = data.get("course_type") or ("Regulated Qualification" if not data.get("is_cpd") else "CPD Accredited Course")

        info = (
            f"=== VERIFIED COURSE FACTS: {data.get('title')} ===\n"
            f"Classification: {course_type_str}\n"
            f"Official Title: {data.get('title')}\n"
            f"Awarding Body: {data.get('awarding_body')} | Level: {data.get('level')}\n"
            f"Study Format & Duration: {duration_val}, 100% online self-paced via LMS portal with tutor support\n"
            f"Assessment: {assessment_val}\n"
            f"Certification: {cert_val}\n"
            f"Tuition Fees: {fee_str}\n"
            f"Entry Requirements: {req_val}\n"
            f"Modules/Units: {units_str}\n\n"
            f"=== SPOKEN RESPONSE GUIDANCE (PROGRESSIVE DISCLOSURE) ===\n"
            f"1. Give ONLY a short, friendly overview (1-2 sentences): mention the official title, level, awarding body, and 100% online study mode.\n"
            f"2. NEVER dump fee, modules, and requirements all at once! End with a dynamic follow-up question asking what they want to know next (e.g. entry requirements, tuition fee & installments, or course modules).\n"
            f"3. Only explain entry requirements if the caller asks about entry requirements or eligibility.\n"
            f"4. Only explain tuition fees & monthly installments if the caller asks about price or fees.\n"
            f"5. Only list modules if the caller asks about what modules or subjects are covered."
        )
        print(f"[*] get_course_info output:\n{info}")
        return info
    finally:
        _TOOL_IN_PROGRESS = False


@llm.function_tool(
    name="search_courses",
    description="Search the college catalogue for published qualifications or CPD courses matching a keyword, subject, or level (e.g. 'Level 3', 'health and social care', 'IT', 'business')."
)
async def search_courses(keyword_or_category: str) -> str:
    """Returns up to 5 real published courses from the verified catalog."""
    global _TOOL_IN_PROGRESS
    _TOOL_IN_PROGRESS = True
    _speak_filler(force=True)
    try:
        print(f"[*] Tool called: search_courses(keyword_or_category='{keyword_or_category}')")
        courses = await asyncio.to_thread(wp_connector.search_courses_db, keyword_or_category, 5)
        if not courses:
            return f"No published courses found matching '{keyword_or_category}'. Ask whether they are looking for an Ofqual-regulated qualification or a CPD course, and what level or subject."
        lines = []
        for i, c in enumerate(courses, 1):
            lines.append(f"{i}. {c['title']} ({c['level']}, Awarding Body: {c['awarding_body']})")
        res = (
            f"VERIFIED COURSES IN CATALOGUE FOR '{keyword_or_category}':\n" + "\n".join(lines) +
            "\nPresent 2-3 of these options conversationally (never read numbers or bullet points) and ask the caller to confirm which level and awarding body aligns best with their goals."
        )
        print(f"[*] search_courses output:\n{res}")
        return res
    finally:
        _TOOL_IN_PROGRESS = False


@llm.function_tool(
    name="lookup_page_content",
    description="Instantly look up verified college policy pages, London campus address, 14-day refund rules, accreditations, LMS extension, or student FAQs by topic or page title with sub-millisecond response time."
)
async def lookup_page_content(page_title_or_topic: str) -> str:
    """Instantly looks up official page content by title or keyword from the in-memory content index table."""
    global _TOOL_IN_PROGRESS
    _TOOL_IN_PROGRESS = True
    _speak_filler(force=True)
    try:
        print(f"[*] Tool called: lookup_page_content(page_title_or_topic='{page_title_or_topic}')")
        res = await asyncio.to_thread(rag.fast_lookup_page_content, page_title_or_topic)
        print(f"[*] lookup_page_content output:\n{res[:180]}...")
        return res
    finally:
        _TOOL_IN_PROGRESS = False


@llm.function_tool(
    name="recommend_courses",
    description="Recommend accredited qualifications and learning pathways when a caller asks for course recommendations, guidance on what to study, or advice for a career field (e.g. Nursing, Healthcare, IT, Cyber Security, Business Management, Law, Accounting, Teaching, Construction / CSCS, Childcare, Project Management)."
)
async def recommend_courses(field_or_subject: str, level: str = "") -> str:
    """Instantly returns verified, categorized course recommendations and spoken advice from the recommendation index table."""
    global _TOOL_IN_PROGRESS
    _TOOL_IN_PROGRESS = True
    _speak_filler(force=True)
    try:
        print(f"[*] Tool called: recommend_courses(field_or_subject='{field_or_subject}', level='{level}')")
        import course_recommender
        rec = await asyncio.to_thread(course_recommender.recommend_course_for_field, field_or_subject, level)
        if rec.get("status") == "FOUND":
            alts_str = f" Other suitable options: {', '.join(rec.get('alternatives', []))}." if rec.get("alternatives") else ""
            res = (
                f"RECOMMENDATION FOR '{rec.get('category')}':\n"
                f"- Top Recommended Qualification: {rec.get('recommended_course')} ({rec.get('level')}, {rec.get('awarding_body')})\n"
                f"- Suitability & Career Route: {rec.get('suitability')}\n"
                f"- Study Duration: {rec.get('duration')}\n"
                f"- Tuition Fees: {rec.get('fee_summary')}\n"
                f"- Spoken Pitch Advice: {rec.get('spoken_pitch')}{alts_str}\n\n"
                f"Admissions Guidance: Present this recommendation in 1 to 2 warm spoken sentences and end with the dynamic follow-up question."
            )
        else:
            cats = ", ".join(rec.get("available_categories", []))
            res = (
                f"AVAILABLE CAREER DISCIPLINES: {cats}.\n"
                f"Spoken Advice: {rec.get('spoken_pitch')}"
            )
        print(f"[*] recommend_courses output:\n{res}")
        return res
    finally:
        _TOOL_IN_PROGRESS = False



async def entrypoint(ctx: JobContext):
    job_received_time = time.time()

    # 0. Initialize RAG & warm up Redis FAQ cache in background threads
    asyncio.create_task(asyncio.to_thread(rag.init_knowledge_base))
    asyncio.create_task(asyncio.to_thread(redis_cache.warmup_popular_faqs))

    # 1. Connect to room & subscribe to audio
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # 2. Wait for participant to join
    participant = await ctx.wait_for_participant()
    raw_identity = participant.identity or "MicroSIP-Caller"
    caller_phone = raw_identity.replace("sip:", "").split("@")[0] if "sip:" in raw_identity else raw_identity
    caller_name = participant.name or (f"SIP Caller ({caller_phone})" if caller_phone else "MicroSIP Caller")

    # Direction and Lead Metadata Extraction
    direction = "INBOUND"
    course_inquired = "General Qualification"
    lead_name = caller_name

    # Extract metadata from room, job, or participant
    raw_meta = (
        getattr(ctx.room, "metadata", "")
        or getattr(ctx.job, "metadata", "")
        or getattr(participant, "metadata", "")
        or ""
    )
    if raw_meta:
        try:
            meta = json.loads(raw_meta)
            direction = meta.get("direction", "INBOUND").upper()
            if meta.get("leadName"):
                lead_name = meta["leadName"]
                caller_name = lead_name
            if meta.get("courseInquired"):
                course_inquired = meta["courseInquired"]
            if meta.get("phoneNumber"):
                caller_phone = meta["phoneNumber"]
        except Exception as e:
            print(f"[*] Metadata parse notice: {e}")

    if ctx.room.name.startswith("outbound-"):
        direction = "OUTBOUND"

    print(f"User joined room: {ctx.room.name} | Direction: {direction} | Caller: {caller_name} | Course: {course_inquired}")

    # 3. Call orchestrator database record (non-blocking)
    orchestrator = CallOrchestrator(
        room_name=ctx.room.name,
        caller=caller_name,
        phone_number=caller_phone,
        direction=direction,
        course_inquired=course_inquired,
    )
    asyncio.create_task(orchestrator.start_call())

    # Live list of caller's actual transcribed utterances (used to block hallucinated callback days/times)
    caller_utterances: list[str] = []

    # Helper for running tool HTTP sync in a background worker thread without blocking the audio event loop
    def _post_callback_sync(scheduled_slot: str, clean_notes: str) -> bool:
        import httpx
        with httpx.Client(timeout=15.0) as client:
            r1 = client.post("http://127.0.0.1:3000/api/callbacks", json={
                "customerName": caller_name,
                "phoneNumber": caller_phone,
                "course": course_inquired,
                "scheduledTime": scheduled_slot,
                "agentAssigned": ADVISOR_DISPLAY,
                "notes": f"{clean_notes} (Requested during call with Sonia)",
                "humanNotes": f"[AI Sonia Callback • {scheduled_slot} • Assigned: {ADVISOR_DISPLAY}]: {clean_notes}",
            })
            return r1.status_code in (200, 201)


    def _patch_disposition_sync(disposition: str, lead_status: str, reason: str) -> bool:
        import httpx
        with httpx.Client(timeout=5.0) as client:
            r = client.patch("http://127.0.0.1:3000/api/leads", json={
                "phoneNumber": caller_phone,
                "status": lead_status,
                "disposition": disposition,
                "humanNotes": f"[AI Disposition • {disposition}]: {reason}",
            })
            return r.status_code in (200, 201)

    _DAY_KEYWORDS = {
        "monday", "mon", "tuesday", "tue", "tues", "wednesday", "wed",
        "thursday", "thu", "thur", "thurs", "friday", "fri", "saturday", "sat",
        "sunday", "sun", "today", "tomorrow", "tmrw", "tonight", "weekend",
        "next week", "this week", "january", "february", "march", "april",
        "may", "june", "july", "august", "september", "october", "november", "december",
    }
    _TIME_WORD_PATTERN = re.compile(
        r"(\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|o'?clock)?\b|"
        r"\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b|"
        r"\b(?:am|pm|a\.m\.|p\.m\.|morning|afternoon|evening|noon|midday|o'?clock|half past|quarter)\b)",
        re.IGNORECASE,
    )
    _ORDINAL_DATE_PATTERN = re.compile(r"\b\d{1,2}(?:st|nd|rd|th)\b", re.IGNORECASE)

    def _caller_spoke_day_and_time(day_arg: str, time_arg: str) -> bool:
        """Verifies that both a day and a time were actually spoken by the caller in their own words (prevents LLM hallucination)."""
        vague_tokens = {
            "", "unknown", "none", "null", "n/a", "tbd", "later", "anytime",
            "soon", "unspecified", "not specified", "flexible", "asap", "whenever",
        }
        d_low = day_arg.lower().strip()
        t_low = time_arg.lower().strip()
        if d_low in vague_tokens or t_low in vague_tokens or len(d_low) < 2 or len(t_low) < 1:
            return False
        # Argument itself must look like a day and a time
        arg_has_day = any(k in d_low for k in _DAY_KEYWORDS) or bool(_ORDINAL_DATE_PATTERN.search(d_low))
        arg_has_time = bool(_TIME_WORD_PATTERN.search(t_low))
        if not (arg_has_day and arg_has_time):
            return False

        # Combine all caller utterances collected from STT and conversation items
        transcript_user_texts = [
            it.get("text", "") for it in orchestrator.transcript_lines if it.get("role") == "user"
        ]
        combined_caller = " ".join(caller_utterances + transcript_user_texts).lower()
        if not combined_caller.strip():
            return False

        # Check that caller's own words contain a day reference AND match the specific day word claimed by the LLM
        caller_has_day = any(
            re.search(rf"\b{re.escape(k)}\b", combined_caller) for k in _DAY_KEYWORDS
        ) or bool(_ORDINAL_DATE_PATTERN.search(combined_caller))
        if not caller_has_day:
            return False

        # Ensure the specific weekday/relative day passed in day_arg was actually spoken by the caller
        specific_days = [
            "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "tomorrow", "today", "tonight", "weekend"
        ]
        for sd in specific_days:
            if sd in d_low and sd not in combined_caller:
                return False

        # Check that caller's own words contain a time reference
        caller_has_time = bool(_TIME_WORD_PATTERN.search(combined_caller))
        return caller_has_time

    @llm.function_tool(
        name="schedule_callback",
        description=(
            "Book a callback with our Senior Admissions Advisor. May ONLY be called when the caller has "
            "explicitly said BOTH a specific day AND a specific time in their own words (Mon-Fri 10:00-17:00 UK). Never invent or guess values."
        )
    )
    async def schedule_callback(preferred_day: str = "", preferred_time_uk: str = "", notes: str = "") -> str:
        global _TOOL_IN_PROGRESS
        _TOOL_IN_PROGRESS = True
        _speak_filler()
        try:
            day_clean = (preferred_day or "").strip()
            time_clean = (preferred_time_uk or "").strip()
            if not _caller_spoke_day_and_time(day_clean, time_clean):
                _bg_print(
                    f"[!] schedule_callback rejected (NEED_DAY_AND_TIME): day='{day_clean}', time='{time_clean}' "
                    f"| caller_utterances={caller_utterances[-3:]}"
                )
                return (
                    "NEED_DAY_AND_TIME: The caller has not explicitly stated both a day and a time in their own words. "
                    "Do NOT say a callback is booked. Ask the caller which day and what UK time (Mon-Fri 10:00-17:00) works best for them."
                )

            scheduled_slot = f"{day_clean} at {time_clean} (UK Time)"
            saved_ok = False
            try:
                saved_ok = await asyncio.to_thread(
                    _post_callback_sync,
                    scheduled_slot,
                    notes or "Admissions & fee consultation",
                )
            except Exception as e:
                _bg_print(f"[!] Error during schedule_callback API sync: {e}")
                saved_ok = False

            if saved_ok:
                orchestrator.set_disposition(
                    "CALLBACK_SCHEDULED",
                    transferred_to=ADVISOR_DISPLAY,
                    scheduled_callback=scheduled_slot,
                    score=85,
                )
                return (
                    f"SUCCESS: Callback booked with {ADVISOR_TITLE} for {scheduled_slot}. "
                    f"Confirm this exact day ({day_clean}) and UK time ({time_clean}) back to the caller in one warm sentence."
                )

            _bg_print(f"[!] schedule_callback save failed for {scheduled_slot} -> returning FAILED")
            return (
                "FAILED: Could not save the callback in the system right now. "
                "You MUST NOT say the callback is booked — tell the caller our advisor team will call back today to confirm."
            )
        finally:
            _TOOL_IN_PROGRESS = False

    @llm.function_tool(
        name="mark_lead_disposition",
        description="Mark disposition ONLY when the caller explicitly says they are not interested and is ending the call."
    )
    async def mark_lead_disposition(disposition: str, reason: str) -> str:
        global _TOOL_IN_PROGRESS
        _TOOL_IN_PROGRESS = True
        try:
            score = 20 if disposition.upper() == "NOT_INTERESTED" else (98 if disposition.upper() == "ENROLLED" else 50)
            orchestrator.set_disposition(disposition, score=score)
            lead_status = "NOT_CONVERTED" if disposition.upper() == "NOT_INTERESTED" else ("CONVERTED" if disposition.upper() == "ENROLLED" else "IN_PROGRESS")
            try:
                await asyncio.to_thread(_patch_disposition_sync, disposition, lead_status, reason)
            except Exception as e:
                _bg_print(f"[*] Notice during mark_lead_disposition API sync: {e}")
            return f"SUCCESS: Lead marked as {disposition}: {reason}."
        finally:
            _TOOL_IN_PROGRESS = False


    api_key = os.getenv("GOOGLE_API_KEY")

    # 4. Use optimized Silero VAD model preloaded in prewarm()
    vad_act_threshold = float(os.getenv("VAD_ACTIVATION_THRESHOLD", "0.55"))
    vad_min_silence = float(os.getenv("VAD_MIN_SILENCE", "0.30"))
    vad_min_speech = float(os.getenv("VAD_MIN_SPEECH", "0.08"))
    vad_model = getattr(ctx.proc, "userdata", {}).get("vad") if hasattr(ctx, "proc") else None
    if not vad_model:
        vad_model = silero.VAD.load(
            min_silence_duration=vad_min_silence,
            min_speech_duration=vad_min_speech,
            activation_threshold=vad_act_threshold,
        )

    # 5. Initialize Ultra-Fast Streaming STT (Deepgram Nova-3) with configurable DEEPGRAM_LANGUAGE (.env) and domain keyterms
    deepgram_lang = os.getenv("DEEPGRAM_LANGUAGE", "en").strip() or "en"
    print(f"[*] Active STT: Deepgram Nova-3 Ultra-Fast Streaming STT (language={deepgram_lang})")
    stt_instance = deepgram.STT(
        model="nova-3",
        language=deepgram_lang,
        punctuate=True,
        smart_format=True,
        no_delay=True,
        endpointing_ms=300,
        keyterm=[
            # Phase 2C Pakistani / South Asian English admissions & fee keyterms
            "fee",
            "fees",
            "fee structure",
            "discount",
            "deposit",
            "instalment",
            "instalments",
            "instalment plan",
            "monthly",
            "payment plan",
            "callback",
            "advisor",
            "enrol",
            "enrolment",
            "course",
            "diploma",
            "certificate",
            "level three",
            "level five",
            # College & awarding body keyterms
            "Inspire London College",
            "UKPD Academy",
            "Phlebotomy",
            "Focus Awards",
            "Focus",
            "Qualifi",
            "OTHM",
            "NOCN",
            "iCQ",
            "ATHE",
            "AET",
            "DET",
            "Education and Training",
            "Award in Education and Training",
            "CPD",
            "NVQ",
            "RQF",
            "Ofqual",
            "Level 1",
            "Level 2",
            "Level 3",
            "Level 4",
            "Level 5",
            "Level 7",
            "Health and Safety",
            "CSCS",
            "installment",
            "installments",
            "London",
            "OFQUAL",
            "refund",
            "policy",
        ]
    )

    # 6. Initialize LLMs: OpenAI (Primary if OPENAI_API_KEY present) -> Groq Fallback (max_retry=0)
    openai_api_key = os.getenv("OPENAI_API_KEY")
    openai_model = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
    groq_api_key = os.getenv("GROQ_API_KEY")
    print(f"[*] OpenAI key loaded: {bool(openai_api_key)} | GROQ key loaded: {bool(groq_api_key)}")

    def _create_llm_clients():
        p_openai = None
        if openai_api_key:
            p_openai = TrackedOpenAILLM(
                model=openai_model,
                api_key=openai_api_key,
                temperature=0.0,
                extra_body={"seed": FIXED_LLM_SEED},
            )
        p_groq = None
        s_groq = None
        if groq_api_key:
            p_groq = TrackedGroqLLM(
                model="openai/gpt-oss-20b",
                api_key=groq_api_key,
                temperature=0.0,
                max_completion_tokens=600,
                reasoning_effort="low",
                tool_choice="auto",
            )
            s_groq = TrackedGroqLLM(
                model="openai/gpt-oss-120b",
                api_key=groq_api_key,
                temperature=0.0,
                max_completion_tokens=600,
                reasoning_effort="low",
                tool_choice="auto",
            )
        p_google = None
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if google_api_key:
            p_google = SafeGeminiLLM(
                model="gemini-2.5-flash",
                api_key=google_api_key,
                temperature=0.0,
            )
        td_instance = None
        if os.getenv("ENABLE_EOU_MODEL", "0") == "1":
            td_instance = getattr(ctx.proc, "userdata", {}).get("eou_model") if hasattr(ctx, "proc") else None
            if td_instance is None:
                try:
                    td_instance = EnglishModel()
                except Exception:
                    td_instance = None
        return p_openai, p_groq, s_groq, p_google, td_instance

    primary_openai, primary_groq, secondary_groq, tertiary_google, turn_detector_instance = await asyncio.to_thread(_create_llm_clients)

    llm_list = []
    if openai_api_key and primary_openai is not None:
        print(f"[*] Primary LLM in use: OpenAI ({openai_model}, timeout: 4.0s, max_retry: 0)")
        llm_list.append(primary_openai)
    if groq_api_key and primary_groq is not None:
        label = "Secondary" if llm_list else "Primary"
        print(f"[*] {label} LLM in use: Groq (openai/gpt-oss-20b, timeout: 3.5s, max_retry: 0)")
        llm_list.append(primary_groq)
        if secondary_groq is not None:
            print("[*] Fallback LLM in use: Groq (openai/gpt-oss-120b, separate 8k TPM bucket, timeout: 3.5s, max_retry: 0)")
            llm_list.append(secondary_groq)
    if tertiary_google is not None:
        print("[*] Ultimate Fallback LLM in use: Google Gemini (gemini-2.5-flash, separate quota)")
        llm_list.append(tertiary_google)

    if not llm_list:
        raise RuntimeError("No LLM provider configured! Please set OPENAI_API_KEY or GROQ_API_KEY or GOOGLE_API_KEY.")

    adapter_timeout = 4.0 if primary_openai else 3.5
    resilient_llm = llm.FallbackAdapter(
        llm=llm_list,
        attempt_timeout=adapter_timeout,
        max_retry_per_llm=0,
        retry_interval=0.5,
    )

    # 7. Initialize TTS (Inworld by default, or Cartesia switchable via TTS_PROVIDER in .env)
    tts_provider = os.getenv("TTS_PROVIDER", "inworld").strip().lower()
    if tts_provider == "cartesia":
        cartesia_voice = os.getenv("CARTESIA_VOICE_ID", "")
        active_tts = cartesia.TTS(
            model="sonic-3",
            voice=cartesia_voice,
            api_key=os.getenv("CARTESIA_API_KEY"),
        )
        if os.getenv("DIAG") == "1":
            _bg_print(f"[*] Active TTS: Cartesia (sonic-3, voice={cartesia_voice})")
    else:
        inworld_model = os.getenv("INWORLD_MODEL", "inworld-tts-2-flash").strip()
        if inworld_model.lower() in ("tts-2-flash", "tts-2_flash"):
            inworld_model = "inworld-tts-2-flash"
        elif inworld_model.lower() in ("tts-2", "inworld-v2"):
            inworld_model = "inworld-tts-2"
        inworld_voice = os.getenv("INWORLD_VOICE", "Maisie").strip() or "Maisie"
        active_tts = inworld.TTS(
            model=inworld_model,
            voice=inworld_voice,
            api_key=os.getenv("INWORLD_API_KEY"),
        )
        if os.getenv("DIAG") == "1":
            _bg_print(f"[*] Active TTS: Inworld ({inworld_model}, voice={inworld_voice})")


    session = agents.AgentSession(
        vad=vad_model,
        stt=stt_instance,
        llm=resilient_llm,
        tts=active_tts,
        tts_text_transforms=[
            text_transforms.filter_markdown,
            text_transforms.filter_emoji,
            custom_speech_cleaner,
        ],
        turn_handling={
            "turn_detection": turn_detector_instance,
            "endpointing": {
                "mode": "fixed",
                "min_delay": 0.6,
                "max_delay": 2.5,
            },
            "interruption": {
                "enabled": True,
                "mode": "vad",
                "min_duration": 0.4,
                "min_words": 1,
                "resume_false_interruption": False,
            },
            "preemptive_generation": {
                "enabled": False,
            },
        },
        aec_warmup_duration=3.0,
        use_tts_aligned_transcript=False,
        user_away_timeout=None,
    )

    global _ACTIVE_SESSION
    _ACTIVE_SESSION = session

    # Supported livekit-agents 1.8.6 usage & turn metrics tracking
    turn_metrics_state = {
        "eou_delay": None,
        "prev_input_tokens": {},
        "last_delta_prompt_tokens": None,
        "last_provider": None,
    }

    @session.on("session_usage_updated")
    def on_session_usage_updated(ev):
        try:
            usage = getattr(ev, "usage", None)
            if not usage or not getattr(usage, "model_usage", None):
                return
            for mu in usage.model_usage:
                if getattr(mu, "type", "") == "llm_usage":
                    key = f"{getattr(mu, 'provider', '')}:{getattr(mu, 'model', '')}"
                    curr_in = getattr(mu, "input_tokens", 0) or 0
                    prev_in = turn_metrics_state["prev_input_tokens"].get(key, 0)
                    if curr_in > prev_in:
                        turn_metrics_state["last_delta_prompt_tokens"] = curr_in - prev_in
                        turn_metrics_state["prev_input_tokens"][key] = curr_in
                        prov = (getattr(mu, "provider", "") or "").lower()
                        mod = getattr(mu, "model", "") or ""
                        if "groq" in prov or "gpt-oss" in mod:
                            turn_metrics_state["last_provider"] = f"Groq ({mod})"
                        elif "openai" in prov:
                            turn_metrics_state["last_provider"] = f"OpenAI ({mod})"
                        else:
                            turn_metrics_state["last_provider"] = f"{prov} ({mod})"
        except Exception as ex:
            _bg_print(f"[*] Notice in session_usage_updated: {ex}")

    # Calculate UK time of day greeting using Europe/London timezone
    try:
        uk_hour = datetime.now(ZoneInfo("Europe/London")).hour
    except Exception:
        uk_hour = (datetime.now(timezone.utc) + timedelta(hours=1)).hour
    if uk_hour < 12:
        time_greeting = "Good morning"
    elif uk_hour < 17:
        time_greeting = "Good afternoon"
    else:
        time_greeting = "Good evening"

    # State tracking for Smart Greeting & 2-Stage Post-Speech Silence Watchdog
    greeting_spoken = False
    greeting_lock = asyncio.Lock()
    timer_task = None
    silence_watchdog_task = None
    # silence_stage: 0 = no silence check-in yet since last user speech; 1 = first check-in spoken; 2 = second silence -> hang up
    silence_stage = 0

    def cancel_silence_watchdog():
        nonlocal silence_watchdog_task
        if silence_watchdog_task and not silence_watchdog_task.done():
            silence_watchdog_task.cancel()
        silence_watchdog_task = None

    async def _run_silence_watchdog():
        nonlocal silence_stage
        try:
            await asyncio.sleep(12.0)
            ag_state = str(getattr(session, "agent_state", "")).lower()
            us_state = str(getattr(session, "user_state", "")).lower()
            if (
                not greeting_spoken
                or _TOOL_IN_PROGRESS
                or ag_state != "listening"
                or us_state == "speaking"
            ):
                return

            if silence_stage == 0:
                silence_stage = 1
                checkin_line = f"Are you still there, {lead_name}?"
                _bg_print(f"[*] Caller silent for 12s (stage 1/2) -> Fixed session.say check-in: '{checkin_line}'")
                await session.say(checkin_line, allow_interruptions=True, add_to_chat_ctx=False)
            elif silence_stage == 1:
                silence_stage = 2
                goodbye_line = (
                    f"It seems I cannot hear you right now, {lead_name}, so I will end the call for now. "
                    f"Have a lovely day, goodbye!"
                )
                _bg_print(f"[*] Caller silent for second 12s window (stage 2/2) -> Saying goodbye and ending call...")
                await session.say(goodbye_line, allow_interruptions=False, add_to_chat_ctx=False)
                disconnect_event.set()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            _bg_print(f"[*] Silence watchdog notice: {e}")

    stt_stall_watchdog_task = None
    latest_final_transcript_time = 0.0
    latest_speech_end_time = 0.0

    def cancel_stt_stall_watchdog():
        nonlocal stt_stall_watchdog_task
        if stt_stall_watchdog_task and not stt_stall_watchdog_task.done():
            stt_stall_watchdog_task.cancel()
        stt_stall_watchdog_task = None

    async def _run_stt_stall_watchdog(speech_end_time: float):
        try:
            await asyncio.sleep(3.0)
            ag_state = str(getattr(session, "agent_state", "")).lower()
            us_state = str(getattr(session, "user_state", "")).lower()
            if ag_state in ("thinking", "speaking") or us_state == "speaking" or _TOOL_IN_PROGRESS:
                return
            if latest_final_transcript_time >= speech_end_time:
                return

            _bg_print(f"[*] STT Stall detected (3.0s post-speech with no final transcript) -> Forcing Deepgram finalize...")
            try:
                fut = session.commit_user_turn(transcript_timeout=1.5, stt_flush_duration=1.0)
                finalized_tx = await asyncio.wait_for(fut, timeout=2.0)
                if finalized_tx:
                    _bg_print(f"[*] STT Stall recovered after commit_user_turn: '{finalized_tx}'")
            except Exception as ex:
                if os.getenv("DIAG") == "1":
                    _bg_print(f"[DIAG] commit_user_turn notice: {ex}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            if os.getenv("DIAG") == "1":
                _bg_print(f"[DIAG] STT watchdog notice: {e}")

    def arm_silence_watchdog():
        nonlocal silence_watchdog_task
        cancel_silence_watchdog()
        if greeting_spoken and silence_stage < 2 and not _TOOL_IN_PROGRESS:
            silence_watchdog_task = asyncio.create_task(_run_silence_watchdog())

    thinking_filler_task = None

    async def _run_thinking_filler_timer():
        try:
            await asyncio.sleep(1.2)
            st = str(getattr(session, "agent_state", "")).lower()
            if st == "thinking" and greeting_spoken and (time.time() - _last_filler_time >= 3.0):
                _speak_filler(force=False)
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    @session.on("agent_state_changed")
    def on_agent_state_changed(ev):
        nonlocal thinking_filler_task
        new_s = str(getattr(ev, "new_state", "")).lower()
        old_s = str(getattr(ev, "old_state", "")).lower()
        if os.getenv("DIAG") == "1":
            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] agent_state changed: {old_s} -> {new_s}")
        if new_s in ("thinking", "speaking", "initializing"):
            cancel_silence_watchdog()
        elif new_s == "listening" and old_s == "speaking":
            arm_silence_watchdog()

        if new_s == "thinking":
            if thinking_filler_task and not thinking_filler_task.done():
                thinking_filler_task.cancel()
            thinking_filler_task = asyncio.create_task(_run_thinking_filler_timer())
        elif new_s in ("speaking", "listening"):
            if thinking_filler_task and not thinking_filler_task.done():
                thinking_filler_task.cancel()

    @session.on("user_state_changed")
    def on_user_state_changed(ev):
        nonlocal silence_stage, latest_speech_end_time
        new_s = str(getattr(ev, "new_state", "")).lower()
        old_s = str(getattr(ev, "old_state", "")).lower()
        if os.getenv("DIAG") == "1":
            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] user_state changed: {old_s} -> {new_s}")
        if new_s == "speaking":
            silence_stage = 0
            cancel_silence_watchdog()
            cancel_stt_stall_watchdog()
        elif new_s == "listening" and old_s == "speaking":
            latest_speech_end_time = time.time()
            cancel_stt_stall_watchdog()
            stt_stall_watchdog_task = asyncio.create_task(_run_stt_stall_watchdog(latest_speech_end_time))

    @session.on("agent_false_interruption")
    def on_agent_false_interruption(ev):
        if os.getenv("DIAG") == "1":
            resumed = getattr(ev, "resumed", False)
            last_text = caller_utterances[-1] if caller_utterances else "none"
            _bg_print(
                f"[DIAG {datetime.now(timezone.utc).isoformat()}] interruption: false_interruption "
                f"resumed={resumed} trigger_transcript='{last_text}'"
            )

    @session.on("speech_created")
    def on_speech_created(ev):
        if os.getenv("DIAG") == "1":
            h = getattr(ev, "speech_handle", None)
            if h:
                sid = getattr(h, "id", "unknown")
                t_speech_start = time.time()
                _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] speech started: speech_id={sid} source={getattr(ev, 'source', '')} allow_interruptions={getattr(h, 'allow_interruptions', True)}")

                def _diag_speech_done(_):
                    dur = time.time() - t_speech_start
                    interrupted = getattr(h, "interrupted", False)
                    source = getattr(h, "_interrupt_source", "none") or "none"
                    raw_items = getattr(h, "_chat_items", []) or []
                    txt = "".join(str(getattr(it, "text_content", "") or getattr(it, "content", "") or "") for it in raw_items)
                    words = len(txt.split())
                    trigger_tx = caller_utterances[-1] if (interrupted and caller_utterances) else "none"
                    if interrupted:
                        _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] speech cancelled: speech_id={sid} duration={dur:.2f}s trigger={source} trigger_transcript='{trigger_tx}' words={words} text_len={len(txt)}")
                    else:
                        _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] speech finished: speech_id={sid} duration={dur:.2f}s words={words} text_len={len(txt)}")

                callbacks = getattr(h, "_done_callbacks", None)
                if isinstance(callbacks, set):
                    callbacks.add(_diag_speech_done)

    async def speak_greeting(reason="initial"):
        nonlocal greeting_spoken
        async with greeting_lock:
            if greeting_spoken:
                return
            greeting_spoken = True
            if direction == "OUTBOUND":
                greeting = f"{time_greeting}! Am I speaking with {lead_name}?"
            else:
                greeting = f"{time_greeting}! Thank you for calling Inspire London College, my name is Sonia. Who do I have the pleasure of speaking with today?"
            _bg_print(f"[*] Speaking non-interruptible opening greeting ({reason}): '{greeting}'")
            try:
                # Opening greeting is strictly non-interruptible (allow_interruptions=False);
                # normal interruptions remain enabled on AgentSession for all subsequent turns.
                t_greet_start = time.time()
                await session.say(greeting, allow_interruptions=False)
                t_greet_done = time.time()
                elapsed_start = t_greet_start - job_received_time
                elapsed_done = t_greet_done - job_received_time
                print(f"[GREETING METRICS] Received job request to first greeting audio start: {elapsed_start:.2f}s | Finished speaking: {elapsed_done:.2f}s (Target: < 2.0s)")
                if os.getenv("DIAG") == "1":
                    _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] job request to first greeting audio: {elapsed_start:.2f}s (finished in {elapsed_done:.2f}s)")
                _bg_print("[*] Initial greeting finished speaking successfully.")
                arm_silence_watchdog()
            except Exception as e:
                _bg_print(f"[!] Error speaking greeting: {e}")

    async def initial_greeting_timer():
        await asyncio.sleep(0.05)
        if not greeting_spoken:
            await speak_greeting(reason="session_start")

    # 7. Real-Time Event Listeners for transcripts & state updates (all I/O offloaded from audio loop)
    @session.on("user_input_transcribed")
    def on_user_input(ev):
        nonlocal silence_stage, latest_final_transcript_time
        text = getattr(ev, "transcript", "").strip()
        is_fin = getattr(ev, "is_final", False)
        if is_fin and text:
            latest_final_transcript_time = time.time()
            silence_stage = 0
            cancel_silence_watchdog()
            cancel_stt_stall_watchdog()
            caller_utterances.append(text)
            _bg_print(f"[Deepgram STT Final]: {text}")
            if os.getenv("DIAG") == "1":
                _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] Deepgram Final STT: '{text}'")
        elif not is_fin and text and os.getenv("DIAG") == "1":
            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] Deepgram Interim STT: '{text}'")

    @session.on("conversation_item_added")
    def on_conversation_item_added(ev):
        item = getattr(ev, "item", None)
        if not item:
            return
        role = getattr(item, "role", "unknown")
        text = getattr(item, "text_content", None) or getattr(item, "content", None)
        item_metrics = getattr(item, "metrics", {}) or {}

        if role == "user":
            if text:
                caller_utterances.append(str(text))
            eou = item_metrics.get("end_of_turn_delay")
            if eou is None:
                eou = item_metrics.get("transcription_delay")
            turn_metrics_state["eou_delay"] = eou

        if text:
            _bg_print(f"[{role.upper()}]: {text}")
            asyncio.create_task(orchestrator.log_transcript(role, text))

        if role == "assistant" and text:
            eou_val = turn_metrics_state.get("eou_delay")
            ttft_val = item_metrics.get("llm_node_ttft")
            ttfb_val = item_metrics.get("tts_node_ttfb")
            llm_meta = item_metrics.get("llm_metadata") or {}
            meta_prov = (llm_meta.get("model_provider") or "").lower()
            meta_mod = llm_meta.get("model_name") or ""

            if meta_prov or meta_mod:
                if "groq" in meta_prov or "gpt-oss" in meta_mod:
                    prov_str = f"Groq ({meta_mod})"
                elif "google" in meta_prov or "gemini" in meta_mod:
                    prov_str = f"Gemini ({meta_mod})"
                else:
                    prov_str = f"{meta_prov} ({meta_mod})".strip()
            elif LAST_LLM_USAGE.get("provider"):
                prov_str = f"{LAST_LLM_USAGE['provider']} ({LAST_LLM_USAGE.get('model') or ''})"
            elif turn_metrics_state.get("last_provider"):
                prov_str = turn_metrics_state["last_provider"]
            else:
                prov_str = "Direct/Greeting" if ttft_val is None else ("Groq" if groq_api_key else "Gemini")

            ptokens = LAST_LLM_USAGE.get("prompt_tokens") or turn_metrics_state.get("last_delta_prompt_tokens")
            f_reason = LAST_LLM_USAGE.get("finish_reason") or "stop"
            current_tpm = get_tokens_per_minute()
            eou_str = f"{eou_val * 1000:.0f}ms" if eou_val is not None else "N/A"
            ttft_str = f"{ttft_val * 1000:.0f}ms" if ttft_val is not None else "N/A"
            ttfb_str = f"{ttfb_val * 1000:.0f}ms" if ttfb_val is not None else "N/A"
            ptok_str = str(ptokens) if ptokens is not None else "N/A"

            tools_list = LAST_LLM_USAGE.get("tool_calls") or []
            tools_str = ", ".join(tools_list) if tools_list else "none"

            _bg_print(
                f"[TURN METRICS] EOU delay: {eou_str} | LLM TTFT: {ttft_str} | "
                f"TTS TTFB: {ttfb_str} | LLM: {prov_str} | Prompt tokens: {ptok_str} | "
                f"TPM: {current_tpm}/8000 | Tools: {tools_str} | finish_reason: {f_reason}"
            )
            turn_metrics_state["eou_delay"] = None
            turn_metrics_state["last_delta_prompt_tokens"] = None
            LAST_LLM_USAGE["prompt_tokens"] = None
            LAST_LLM_USAGE["finish_reason"] = None
            LAST_LLM_USAGE["tool_calls"] = []

    # 8. Disconnect handlers (non-blocking)
    disconnect_event = asyncio.Event()

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(p):
        _bg_print(f"[*] Caller disconnected from room: {p.identity}")
        cancel_silence_watchdog()
        disconnect_event.set()

    @ctx.room.on("disconnected")
    def on_disconnected(reason):
        _bg_print(f"[*] Room disconnected: {reason}")
        cancel_silence_watchdog()
        disconnect_event.set()

    if os.getenv("DIAG") == "1":
        logging.getLogger("livekit.plugins.deepgram").setLevel(logging.DEBUG)

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        if track.kind == rtc.TrackKind.KIND_AUDIO and os.getenv("DIAG") == "1":
            async def _monitor_user_audio():
                stream = rtc.AudioStream(track)
                frame_cnt = 0
                byte_cnt = 0
                last_t = time.time()
                async for event in stream:
                    fr = getattr(event, "frame", None)
                    if fr:
                        frame_cnt += 1
                        byte_cnt += len(fr.data.tobytes())
                    now = time.time()
                    if now - last_t >= 2.0:
                        us = str(getattr(session, "user_state", "")).lower()
                        if us == "speaking":
                            _bg_print(
                                f"[DIAG {datetime.now(timezone.utc).isoformat()}] Audio frames received while speaking: "
                                f"{frame_cnt} frames ({round(byte_cnt / 1024, 1)} KB)"
                            )
                        frame_cnt = 0
                        byte_cnt = 0
                        last_t = now
            asyncio.create_task(_monitor_user_audio())

    # 9. Start session with consistent small tool set (transfer_to_support_team removed in browser/demo mode)
    global _CURRENT_ENQUIRED_COURSE
    _CURRENT_ENQUIRED_COURSE = course_inquired
    if direction == "OUTBOUND":
        active_instructions = await asyncio.to_thread(
            build_outbound_instructions,
            lead_name,
            course_inquired
        )
        active_tools = [
            get_course_info,
            search_courses,
            recommend_courses,
            lookup_page_content,
            schedule_callback,
            mark_lead_disposition,
        ]
    else:
        active_instructions = INBOUND_SYSTEM_INSTRUCTIONS
        active_tools = [
            get_course_info,
            search_courses,
            recommend_courses,
            lookup_page_content,
            schedule_callback,
            mark_lead_disposition,
        ]

    vad_slow_detector.count = 0
    cpu_samples = []
    cpu_monitor_running = True

    async def _monitor_worker_cpu():
        try:
            import psutil
            proc = psutil.Process()
            proc.cpu_percent(interval=None)
            while cpu_monitor_running:
                await asyncio.sleep(2.0)
                cpu_samples.append(proc.cpu_percent(interval=None))
        except Exception:
            pass

    cpu_monitor_task = asyncio.create_task(_monitor_worker_cpu())

    await session.start(
        room=ctx.room,
        agent=agents.Agent(
            instructions=active_instructions,
            tools=active_tools
        ),
        record={"audio": True, "traces": False}
    )

    # 10. Start non-interruptible opening greeting immediately
    timer_task = asyncio.create_task(initial_greeting_timer())

    # 11. Keep entrypoint coroutine active until the call finishes
    await disconnect_event.wait()

    cpu_monitor_running = False
    cpu_monitor_task.cancel()
    if os.getenv("DIAG") == "1":
        avg_cpu = (sum(cpu_samples) / len(cpu_samples)) if cpu_samples else 0.0
        _bg_print(
            f"[DIAG METRICS] Call completed | VAD slower-than-realtime count: {vad_slow_detector.count} "
            f"| Average Worker CPU: {avg_cpu:.1f}% ({len(cpu_samples)} samples)"
        )

    cancel_silence_watchdog()
    if timer_task and not timer_task.done():
        timer_task.cancel()

    # 12. Unblock any paused audio output from resume_false_interruption, close session fast, and explicitly flush recorder_io
    try:
        audio_out = getattr(getattr(session, "output", None), "audio", None)
        if audio_out is not None:
            try:
                audio_out.resume()
                audio_out.clear_buffer()
            except Exception:
                pass
        closing_task = getattr(session, "_closing_task", None)
        if closing_task is not None and not closing_task.done():
            await asyncio.wait_for(asyncio.shield(closing_task), timeout=2.5)
        else:
            await asyncio.wait_for(session.aclose(), timeout=2.5)
    except Exception as e:
        _bg_print(f"[*] Notice during session aclose: {e}")

    # Guarantee RecorderIO is flushed and closed before session report or file upload runs
    recorder_io = getattr(session, "_recorder_io", None)
    if recorder_io is not None and getattr(recorder_io, "recording", False):
        try:
            await asyncio.wait_for(recorder_io.aclose(), timeout=3.0)
        except Exception as e:
            _bg_print(f"[*] Notice during recorder_io.aclose(): {e}")

    # 13. Locate recorded audio in a worker thread (avoids synchronous glob/stat on event loop) and upload
    def _find_recorded_audio_sync(s_dir, rec_out_path):
        import tempfile, glob
        if rec_out_path and os.path.exists(str(rec_out_path)) and os.path.getsize(str(rec_out_path)) > 0:
            p = str(rec_out_path)
            return p, round(os.path.getsize(p) / 1024, 1)
        found = list(s_dir.glob("*.ogg")) + list(s_dir.glob("*.wav")) + list(s_dir.rglob("*.ogg"))
        if not found:
            recent_ogg = sorted(
                glob.glob(os.path.join(tempfile.gettempdir(), "*", "audio.ogg")),
                key=os.path.getmtime,
                reverse=True
            )
            if recent_ogg and (time.time() - os.path.getmtime(recent_ogg[0])) < 300:
                found = [recent_ogg[0]]
        if found:
            rec_path = str(found[0])
            kb = round(os.path.getsize(rec_path) / 1024, 1)
            return rec_path, kb
        return None, 0.0

    try:
        rec_out = getattr(recorder_io, "output_path", None) if recorder_io else None
        recording_path, size_kb = await asyncio.to_thread(_find_recorded_audio_sync, ctx.session_directory, rec_out)
        if recording_path:
            _bg_print(f"[*] Call audio recording ready: {recording_path} ({size_kb} KB)")
            await orchestrator.save_recording(recording_path)
        else:
            _bg_print(f"[*] No audio recording found in session directory: {ctx.session_directory}")
    except Exception as e:
        _bg_print(f"[*] Error saving call audio recording: {e}")

    # 14. Finalize database call duration, AI summary, and recording URL within a strict timeout so entrypoint exits cleanly
    try:
        await asyncio.wait_for(orchestrator.end_call(final_status="ANSWERED"), timeout=5.0)
    except Exception as e:
        _bg_print(f"[*] Notice during orchestrator.end_call: {e}")

    # Ensure job context triggers clean shutdown if agent initiated hangup (e.g. after second silence)
    try:
        ctx.shutdown(reason="call completed")
    except Exception:
        pass


def prewarm(proc: agents.JobProcess):
    """Preload VAD, EOU model, and heavy modules into RAM so process starts immediately with zero delay."""
    logging.getLogger().setLevel(logging.INFO)
    for _noisy_logger in ("livekit.plugins.turn_detector", "httpx", "httpcore", "openai", "groq"):
        logging.getLogger(_noisy_logger).setLevel(logging.WARNING)
    vad_act_threshold = float(os.getenv("VAD_ACTIVATION_THRESHOLD", "0.55"))
    vad_min_silence = float(os.getenv("VAD_MIN_SILENCE", "0.30"))
    vad_min_speech = float(os.getenv("VAD_MIN_SPEECH", "0.08"))
    proc.userdata["vad"] = silero.VAD.load(
        min_silence_duration=vad_min_silence,
        min_speech_duration=vad_min_speech,
        activation_threshold=vad_act_threshold,
    )
    try:
        from livekit.plugins.turn_detector.english import _EUORunnerEn
        _EUORunnerEn._download_files()
    except Exception as e:
        print(f"[*] Notice prewarming EOU model files: {e}")
    try:
        wp_connector.warmup_db_connection()
    except Exception as e:
        print(f"[*] Notice warming up DB connection: {e}")
    try:
        redis_cache.warmup_popular_faqs()
    except Exception as e:
        print(f"[*] Notice warming up Redis FAQ cache: {e}")
    try:
        import cartesia  # noqa: F401
        import livekit.plugins.inworld  # noqa: F401
        import livekit.plugins.deepgram  # noqa: F401
        import google.genai  # noqa: F401
        import huggingface_hub  # noqa: F401
    except Exception:
        pass

if __name__ == "__main__":
    if "dev" in sys.argv and not any(a.startswith("--log-level") for a in sys.argv):
        sys.argv.append("--log-level=INFO")
    _startup_groq_key = os.getenv("GROQ_API_KEY")
    _startup_dg_lang = os.getenv("DEEPGRAM_LANGUAGE", "en").strip() or "en"
    print(f"[*] GROQ key loaded: {bool(_startup_groq_key)}")
    print(f"[*] Deepgram Nova-3 language: {_startup_dg_lang} | Configured Advisor: {ADVISOR_DISPLAY}")
    _startup_tts_provider = os.getenv("TTS_PROVIDER", "inworld").strip().lower()
    if _startup_tts_provider == "cartesia":
        _cartesia_voice = os.getenv("CARTESIA_VOICE_ID", "default")
        print(f"[*] Active TTS: Cartesia (sonic-3, voice={_cartesia_voice})")
    else:
        _iw_model = os.getenv("INWORLD_MODEL", "inworld-tts-2-flash").strip()
        if _iw_model.lower() in ("tts-2-flash", "tts-2_flash"):
            _iw_model = "inworld-tts-2-flash"
        elif _iw_model.lower() in ("tts-2", "inworld-v2"):
            _iw_model = "inworld-tts-2"
        _iw_voice = os.getenv("INWORLD_VOICE", "Maisie").strip() or "Maisie"
        print(f"[*] Active TTS: Inworld ({_iw_model}, voice={_iw_voice})")
    _agent_name = os.getenv("AGENT_NAME", "").strip()
    if not _agent_name:
        sys.exit("[!] ERROR: AGENT_NAME environment variable is missing. Set AGENT_NAME in .env (e.g. AGENT_NAME=sonia-v2).")
    print(f"[*] Agent name: {_agent_name}")
    if _startup_groq_key:
        print("[*] Primary LLM in use: Groq (openai/gpt-oss-20b, timeout: 3.5s) -> Secondary: Groq (openai/gpt-oss-120b)")
    else:
        print("[*] Notice: GROQ_API_KEY not set. Primary LLM in use: SafeGeminiLLM (timeout: 10.5s)")
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            load_threshold=float("inf"),
            agent_name=_agent_name,
            num_idle_processes=1,
            initialize_process_timeout=30.0,
            log_level="INFO",
        )
    )