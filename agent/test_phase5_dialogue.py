import asyncio
import os
import sys
import json
import time
from dotenv import load_dotenv

load_dotenv()

import wp_connector
from agent import build_outbound_instructions

# 1. Print verification of search_courses("IT") and search_courses("health and social care")
print("=" * 70)
print("1. CATALOGUE AUDIT: search_courses('IT')")
print("=" * 70)
it_courses = wp_connector.search_courses_db("IT", limit=5)
for i, c in enumerate(it_courses, 1):
    print(f"[{i}] {c['title']} | {c['level']} | {c['awarding_body']}")

print("\n" + "=" * 70)
print("1b. CATALOGUE AUDIT: search_courses('health and social care')")
print("=" * 70)
hsc_courses = wp_connector.search_courses_db("health and social care", limit=5)
for i, c in enumerate(hsc_courses, 1):
    print(f"[{i}] {c['title']} | {c['level']} | {c['awarding_body']}")

print("\n" + "=" * 70)
print("2. get_course_info for OTHM IT Course")
print("=" * 70)
if it_courses:
    title = it_courses[0]['title']
    print(f"\n--- Checking '{title}' ---")
    details = wp_connector.get_course_details_from_db(title)
    for k in ['status', 'title', 'level', 'awarding_body', 'fee', 'sale_price', 'deposit', 'monthly_amount', 'months', 'duration', 'assessment', 'units']:
        v = details.get(k)
        if k == 'units' and isinstance(v, list):
            print(f"  {k}: {len(v)} units -> {v}")
        else:
            print(f"  {k}: {v}")

print("\n" + "=" * 70)
print("3. RUNNING 8-TURN SIMULATION")
print("Lead: Amina Begum | Course: Qualifi Level 4 Diploma in Cyber Security")
print("=" * 70)

caller_utterances = []

# Configure advisor display according to item 3
_raw_advisor = os.getenv("ADVISOR_NAME", "").strip()
if _raw_advisor and _raw_advisor.lower() not in ("sonia", "none", "unknown"):
    ADVISOR_TITLE = f"Senior Admissions Advisor {_raw_advisor}"
else:
    ADVISOR_TITLE = "our admissions advisor"

def run_schedule_callback(preferred_day: str = "", preferred_time_uk: str = "", notes: str = "") -> str:
    day_clean = (preferred_day or "").strip()
    time_clean = (preferred_time_uk or "").strip()
    combined = " ".join(caller_utterances).lower()
    has_day = any(d in combined for d in ["monday", "tuesday", "wednesday", "thursday", "friday", "today", "tomorrow"])
    has_time = any(t in combined for t in ["am", "pm", "morning", "afternoon", "10", "11", "12", "1", "2", "3", "4", "5", "o'clock", ":00"])
    if not (has_day and has_time and day_clean and time_clean):
        return (
            "NEED_DAY_AND_TIME: The caller has not explicitly stated both a day and a time in their own words. "
            "Do NOT say a callback is booked. Ask the caller which day and what UK time (Mon-Fri 10:00-17:00) works best for them."
        )
    return (
        f"SUCCESS: Callback booked with {ADVISOR_TITLE} for {day_clean} at {time_clean} (UK Time). "
        f"Confirm this exact day ({day_clean}) and UK time ({time_clean}) back to the caller in one warm sentence."
    )

def run_get_course_info(course_name: str) -> str:
    if "cyber" in course_name.lower():
        return "Facts for this course are already in ENQUIRED COURSE FACTS in your system instructions above. Do NOT call get_course_info for the lead's own course; answer the caller directly using the instructions."
    data = wp_connector.get_course_details_from_db(course_name, threshold=0.50)
    if not data or data.get("status") == "NOT_FOUND":
        closest = data.get("closest_courses", []) if data else []
        closest_str = f" Closest matches in our database: {', '.join(closest)}." if closest else ""
        return f"Course '{course_name}' was not found in our catalogue.{closest_str} Never invent courses or units."
    units_val = data.get("units")
    if isinstance(units_val, list):
        units_str = f"({len(units_val)}): " + ", ".join(units_val)
    elif units_val:
        units_str = str(units_val)
    else:
        units_str = "Standard units"
    cert_val = data.get("certificate") or "Recognised Certificate and Transcript included."
    req_val = data.get("entry_requirements") or "Aged 16 or above with Level 3 qualification or relevant work experience."
    return (
        f"Course: {data.get('title')}\n"
        f"Level: {data.get('level')} | Awarding Body: {data.get('awarding_body')}\n"
        f"Fees: {data.get('sale_price') or data.get('fee')} in full, or {data.get('deposit')} deposit and {data.get('months')} monthly payments of {data.get('monthly_amount')} (standard fee {data.get('fee')})\n"
        f"Duration: {data.get('duration')} | Assessment: {data.get('assessment')}\n"
        f"Certificate: {cert_val}\n"
        f"Entry Requirements: {req_val}\n"
        f"Units {units_str}"
    )

def run_search_courses(keyword_or_category: str) -> str:
    courses = wp_connector.search_courses_db(keyword_or_category, limit=5)
    if not courses:
        return f"No published courses found matching '{keyword_or_category}'. Offer to connect with an admissions advisor."
    lines = []
    for i, c in enumerate(courses, 1):
        lines.append(f"{i}. {c['title']} ({c['level']}, Awarding Body: {c['awarding_body']})")
    return "REAL PUBLISHED COURSES IN DATABASE:\n" + "\n".join(lines)

prompt = build_outbound_instructions("Amina Begum", "Qualifi Level 4 Diploma in Cyber Security")

tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "get_course_info",
            "description": "Look up detailed facts for other qualifications found via search_courses. NEVER call on turn 1 or for the lead's own course (Qualifi Level 4 Diploma in Cyber Security) — all facts are already in ENQUIRED COURSE FACTS.",
            "parameters": {
                "type": "object",
                "properties": {
                    "course_name": {
                        "type": "string",
                        "description": "The course title or qualification to look up."
                    }
                },
                "required": ["course_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_courses",
            "description": "Search the real college database for up to 5 published qualifications/courses matching a keyword or subject (e.g. 'IT', 'cyber', 'health and social care').",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword_or_category": {
                        "type": "string",
                        "description": "The subject or keyword to search for, e.g. 'IT', 'Cyber'."
                    }
                },
                "required": ["keyword_or_category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_callback",
            "description": "Book a callback with our Senior Admissions Advisor. May ONLY be called when the caller has explicitly said BOTH a specific day AND a specific time in their own words (Mon-Fri 10:00-17:00 UK). Never invent or guess values.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preferred_day": {"type": "string", "description": "Specific day explicitly stated by caller, e.g. 'Thursday'"},
                    "preferred_time_uk": {"type": "string", "description": "Specific UK time explicitly stated by caller, e.g. '2pm'"},
                    "notes": {"type": "string", "description": "Brief notes on caller interest"}
                },
                "required": ["preferred_day", "preferred_time_uk"]
            }
        }
    }
]

groq_key = os.getenv("GROQ_API_KEY")
import httpx
client = httpx.Client(timeout=15.0)
model_name = "openai/gpt-oss-20b"
print(f"Using Groq model: {model_name}\n")

messages = [
    {"role": "system", "content": prompt},
    {"role": "assistant", "content": "Hello, am I speaking with Amina Begum?"}
]

dialogue_inputs = [
    "Yes, speaking.",
    "Yes, I have two minutes.",
    "What's the fee?",
    "Can you suggest other courses in IT instead of cyber?",
    "Tell me about the first one.",
    "How many units does it have?",
    "Okay, I'm interested.",
    "Thursday at 2pm.",
]

for turn_idx, user_text in enumerate(dialogue_inputs, 1):
    time.sleep(2.0)
    print(f"\n[TURN {turn_idx}] USER: \"{user_text}\"")
    caller_utterances.append(user_text)
    messages.append({"role": "user", "content": user_text})

    # Tool call handling loop
    while True:
        resp = None
        for current_model in ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}"},
                json={
                    "model": current_model,
                    "messages": messages,
                    "tools": tools_schema,
                    "tool_choice": "auto",
                    "temperature": 0.0,
                    "seed": 42,
                    "max_completion_tokens": 600,
                }
            )
            if resp.status_code == 200:
                break
            elif resp.status_code == 429:
                print(f"  [*] {current_model} rate limited (429), attempting next provider/bucket...")
                continue
            else:
                break

        if resp is None or resp.status_code != 200:
            if resp and resp.status_code == 429:
                print("  [*] Both Groq models rate limited. Waiting 3.0s for TPM bucket...")
                time.sleep(3.0)
                continue
            print(f"  [!] API Error {getattr(resp, 'status_code', 'unknown')}: {getattr(resp, 'text', '')}")
            break

        data = resp.json()
        usage = data.get("usage", {})
        pt = usage.get("prompt_tokens", 0)
        ct = usage.get("completion_tokens", 0)
        print(f"  [USAGE] Model: {current_model} | Prompt Tokens: {pt} (Target: < 1,000) | Completion: {ct}")
        choice = data["choices"][0]
        msg = choice["message"]
        tool_calls = msg.get("tool_calls")

        if tool_calls:
            messages.append(msg)
            for tc in tool_calls:
                fn = tc.get("function", {})
                fn_name = fn.get("name", "")
                if "<|" in fn_name:
                    fn_name = fn_name.split("<|")[0].strip()
                try:
                    args = json.loads(fn.get("arguments", "{}")) if fn.get("arguments") else {}
                except Exception:
                    args = {}
                print(f"  -> TOOL CALL: {fn_name}({args})")

                if fn_name == "get_course_info":
                    res = run_get_course_info(args.get("course_name", ""))
                elif fn_name == "search_courses":
                    res = run_search_courses(args.get("keyword_or_category", ""))
                elif fn_name == "schedule_callback":
                    res = run_schedule_callback(
                        preferred_day=args.get("preferred_day", ""),
                        preferred_time_uk=args.get("preferred_time_uk", ""),
                        notes=args.get("notes", "")
                    )
                else:
                    res = f"Tool {fn_name} not found"

                print(f"  <- TOOL OUTPUT: {res[:200]}...")
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id"),
                    "content": res
                })
            continue

        # Assistant text response
        reply_text = msg.get("content") or ""
        print(f"  SONIA: \"{reply_text.strip()}\"")
        messages.append({"role": "assistant", "content": reply_text})
        break
