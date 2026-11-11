import asyncio
import os
import time
import json
import uuid
from typing import Optional, List, Dict
import httpx

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:3000/api")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

class CallOrchestrator:
    def __init__(
        self,
        room_name: str,
        caller: str = "MicroSIP Caller",
        phone_number: str = "MicroSIP (100)",
        direction: str = "INBOUND",
        course_inquired: str = "General Qualification",
        lead_id: Optional[str] = None,
    ):
        self.room_name = room_name
        self.caller = caller
        self.phone_number = phone_number
        self.direction = direction.upper()
        self.course_inquired = course_inquired
        self.lead_id = lead_id

        self.start_time: float = time.time()
        self.call_id: str = str(uuid.uuid4())
        self.status: str = "ANSWERED"
        self.disposition: str = "ANSWERED"
        self.transferred_to: Optional[str] = None
        self.scheduled_callback: Optional[str] = None
        self.lead_score: int = 70
        self.recording_url: Optional[str] = None

        # Accumulated transcript for LLM auto-summary
        self.transcript_lines: List[Dict[str, str]] = []
        self._client: Optional[httpx.AsyncClient] = None

    def _request_sync(self, method: str, url: str, json_payload: dict, timeout: float = 8.0) -> Optional[httpx.Response]:
        """Executes HTTP requests in a worker thread so SSL init and socket I/O never block the audio event loop."""
        with httpx.Client(timeout=timeout) as client:
            return client.request(method, url, json=json_payload)

    def set_disposition(
        self,
        disposition: str,
        transferred_to: Optional[str] = None,
        scheduled_callback: Optional[str] = None,
        score: Optional[int] = None,
    ):
        """Sets the call disposition from agent tools or conversational outcomes."""
        self.disposition = disposition.upper()
        if transferred_to:
            self.transferred_to = transferred_to
        if scheduled_callback:
            self.scheduled_callback = scheduled_callback
        if score is not None:
            self.lead_score = score
        print(f"[Orchestrator] Disposition updated: {self.disposition} | Transferred: {self.transferred_to} | Callback: {self.scheduled_callback}")

    async def log_transcript(self, role: str, text: str):
        """Records transcript in memory immediately and dispatches to Next.js API endpoint in a background fire-and-forget task."""
        clean_text = text.strip()
        if clean_text:
            self.transcript_lines.append({"role": role, "text": clean_text})
            # Fire-and-forget background task so Next.js HTTP delays never stall conversational audio
            asyncio.create_task(self._dispatch_transcript_bg(role, clean_text))

    async def _dispatch_transcript_bg(self, role: str, text: str):
        try:
            await asyncio.to_thread(
                self._request_sync,
                "POST",
                f"{API_BASE_URL}/transcripts",
                {
                    "room": self.room_name,
                    "role": role,
                    "text": text,
                },
                3.0,
            )
        except Exception:
            pass

    def _prewarm_routes_sync(self):
        """Pre-warms Next.js API routes at call start so dev compilation never causes mid-call timeouts."""
        try:
            with httpx.Client(timeout=10.0) as client:
                client.get(f"{API_BASE_URL}/callbacks")
                client.get(f"{API_BASE_URL}/recordings")
                client.get(f"{API_BASE_URL}/leads")
                client.get(f"{API_BASE_URL}/transcripts")
                client.get(f"{API_BASE_URL}/calls/outbound")
        except Exception:
            pass


    async def start_call(self):
        """Creates initial call database entry via Next.js Prisma API in a non-blocking background task."""
        self.start_time = time.time()
        asyncio.create_task(self._register_call_start_bg())
        await self.log_transcript("system", f"Voice agent connected with {self.caller} ({self.direction})")

    async def _register_call_start_bg(self):
        try:
            if self.direction == "OUTBOUND":
                res = await asyncio.to_thread(
                    self._request_sync,
                    "POST",
                    f"{API_BASE_URL}/calls/outbound",
                    {
                        "id": self.call_id,
                        "phoneNumber": self.phone_number,
                        "customerName": self.caller,
                        "courseInquired": self.course_inquired,
                        "disposition": "ANSWERED",
                        "summary": f"Outbound campaign call placed to {self.caller} regarding {self.course_inquired}.",
                        "leadScore": self.lead_score,
                        "durationSec": 0,
                    },
                    12.0,
                )
            else:
                res = await asyncio.to_thread(
                    self._request_sync,
                    "POST",
                    f"{API_BASE_URL}/calls",
                    {
                        "id": self.call_id,
                        "phoneNumber": self.phone_number,
                        "customerName": self.caller,
                        "status": "ANSWERED",
                        "waitTimeSec": 2,
                        "durationSec": 0,
                    },
                    12.0,
                )

            if res and res.status_code in (200, 201):
                data = res.json()
                ret_id = data.get("id") or data.get("call", {}).get("id")
                if ret_id:
                    self.call_id = ret_id
                print(f"[Orchestrator] {self.direction} Call registered: {self.call_id} for {self.caller} ({self.phone_number})")
            elif res:
                print(f"[Orchestrator] Call start registration HTTP {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[Orchestrator] Notice during call start registration: {e}")

    async def _generate_ai_summary(self, full_dialogue: str) -> Dict[str, any]:
        """Calls Google Gemini API in a worker thread with a tight 2.5s timeout to generate call summary without delaying shutdown."""
        cb_note = f" Scheduled advisor callback for {self.scheduled_callback}." if self.scheduled_callback else ""
        default_summary = (
            f"{self.caller} spoke with Sonia regarding {self.course_inquired}.{cb_note} "
            f"Call concluded with disposition {self.disposition}."
        )
        default_score = (
            90 if self.disposition in ("ENROLLED", "TRANSFERRED")
            else (85 if self.disposition == "CALLBACK_SCHEDULED" else (20 if self.disposition == "NOT_INTERESTED" else 60))
        )
        if not full_dialogue.strip() or not GOOGLE_API_KEY:
            return {
                "summary": default_summary,
                "leadScore": default_score,
                "disposition": self.disposition or "ANSWERED"
            }

        prompt = (
            f"Analyze this call transcript between Sonia (Admissions Advisor at Inspire London College) and the student ({self.caller}).\n"
            f"Call Direction: {self.direction}\n"
            f"Course Topic: {self.course_inquired}\n\n"
            f"TRANSCRIPT:\n{full_dialogue}\n\n"
            "Return a valid JSON object ONLY with these exact keys:\n"
            "1. 'summary': (2-3 concise, professional sentences summarizing the conversation, caller background, key questions answered, fees/installment mentioned, and next step).\n"
            "2. 'leadScore': (integer 0 to 100 based on interest and readiness to enroll).\n"
            "3. 'disposition': (one of: 'ENROLLED', 'TRANSFERRED', 'CALLBACK_SCHEDULED', 'NOT_INTERESTED', 'ANSWERED')"
        )

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={GOOGLE_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.0,
                    "seed": int(os.getenv("LLM_SEED", "42")),
                    "response_mime_type": "application/json"
                }
            }
            res = await asyncio.to_thread(self._request_sync, "POST", url, payload, 2.5)
            if res and res.status_code == 200:
                data = res.json()
                text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_response)
                print(f"[Orchestrator] AI Summary Generated: {parsed.get('summary', '')[:80]}...")
                return parsed
        except Exception as e:
            print(f"[Orchestrator] Notice: Fast summary fallback used ({e})")

        return {
            "summary": default_summary,
            "leadScore": default_score,
            "disposition": self.disposition or "ANSWERED"
        }

    def _upload_recording_sync(self, file_path: str, target_id: str) -> Optional[str]:
        """Synchronous helper to read recording file from disk and upload in a worker thread without blocking the event loop."""
        if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
            print(f"[Orchestrator] Recording file not found or empty: {file_path}")
            return None

        filename = os.path.basename(file_path)
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        with httpx.Client(timeout=8.0) as sync_client:
            files = {"file": (filename, file_bytes, "audio/ogg")}
            data = {"callId": target_id}
            res = sync_client.post(
                f"{API_BASE_URL}/recordings",
                data=data,
                files=files,
            )
            if res.status_code in (200, 201):
                result = res.json()
                rec_url = result.get("recordingUrl")
                self.recording_url = rec_url
                print(f"[Orchestrator] Call recording saved successfully: {rec_url}")
                return rec_url
            else:
                print(f"[Orchestrator] Recording upload returned {res.status_code}: {res.text}")
        return None

    async def save_recording(self, file_path: str) -> Optional[str]:
        """Uploads the local call recording file to Next.js API endpoint via asyncio.to_thread so disk I/O never blocks the loop."""
        target_id = self.call_id
        try:
            return await asyncio.to_thread(self._upload_recording_sync, file_path, target_id)
        except Exception as e:
            print(f"[Orchestrator] Failed to upload recording: {e}")
        return None

    async def end_call(self, final_status: str = "ANSWERED"):
        """Generates AI written call summary, calculates score, and finalizes database records concurrently."""
        duration_sec = int(time.time() - self.start_time)

        # Format full dialogue transcript
        dialogue_text = "\n".join(
            f"{'Sonia' if item['role'] == 'assistant' else ('Caller' if item['role'] == 'user' else 'System')}: {item['text']}"
            for item in self.transcript_lines
            if item['role'] in ('user', 'assistant')
        )

        # Generate AI Written Summary & Score concurrently with final system transcript log
        log_task = asyncio.create_task(
            self.log_transcript("system", f"Call finished. Duration: {duration_sec}s | Disposition: {self.disposition}")
        )
        ai_data = await self._generate_ai_summary(dialogue_text)
        await asyncio.gather(log_task, return_exceptions=True)

        summary = ai_data.get("summary") or "Call completed with Sonia."
        score = ai_data.get("leadScore", self.lead_score)
        disposition = self.disposition if self.disposition != "ANSWERED" else ai_data.get("disposition", "ANSWERED")

        async def _sync_call_record():
            target_rec_url = self.recording_url or f"/recordings/{self.call_id}.ogg"
            try:
                res = await asyncio.to_thread(
                    self._request_sync,
                    "PATCH",
                    f"{API_BASE_URL}/calls/{self.call_id}",
                    {
                        "status": final_status,
                        "durationSec": duration_sec,
                        "summary": summary,
                        "transcript": dialogue_text,
                        "disposition": disposition,
                        "courseInquired": self.course_inquired,
                        "leadScore": score,
                        "transferredTo": self.transferred_to,
                        "scheduledCallback": self.scheduled_callback,
                        "recordingUrl": target_rec_url,
                    },
                    6.0,
                )
                if res and res.status_code in (200, 201):
                    print(f"[Orchestrator] {self.direction} call record {self.call_id} updated with summary & recording: HTTP {res.status_code}")
                    return
            except Exception as e:
                print(f"[Orchestrator] Notice updating call record: {e}")

            # Fallback if PATCH failed (e.g. 404 because initial call registration timed out)
            if self.direction == "OUTBOUND":
                try:
                    res = await asyncio.to_thread(
                        self._request_sync,
                        "POST",
                        f"{API_BASE_URL}/calls/outbound",
                        {
                            "id": self.call_id,
                            "phoneNumber": self.phone_number,
                            "customerName": self.caller,
                            "courseInquired": self.course_inquired,
                            "disposition": disposition,
                            "summary": summary,
                            "transcript": dialogue_text,
                            "leadScore": score,
                            "durationSec": duration_sec,
                            "transferredTo": self.transferred_to,
                            "scheduledCallback": self.scheduled_callback,
                            "recordingUrl": target_rec_url,
                        },
                        6.0,
                    )
                    if res and res.status_code in (200, 201):
                        print(f"[Orchestrator] Outbound call record saved (fallback): {self.call_id} HTTP {res.status_code}")
                except Exception as e:
                    print(f"[Orchestrator] Failed to save outbound call fallback record: {e}")

        async def _sync_lead_record():
            try:
                lead_status = (
                    "NOT_CONVERTED" if disposition.upper() == "NOT_INTERESTED"
                    else ("CONVERTED" if disposition.upper() == "ENROLLED"
                    else ("SCHEDULED_CALL" if "CALLBACK" in disposition.upper() else "IN_PROGRESS"))
                )
                await asyncio.to_thread(
                    self._request_sync,
                    "PATCH",
                    f"{API_BASE_URL}/leads",
                    {
                        "phoneNumber": self.phone_number,
                        "status": lead_status,
                        "disposition": disposition,
                        "leadScore": score,
                        "scheduledCallback": self.scheduled_callback,
                        "humanNotes": f"[Call Finished • {disposition} • AI Score: {score}]: {summary}"
                    },
                    4.0,
                )
            except Exception as lead_sync_err:
                print(f"[Orchestrator] Notice during Lead final sync: {lead_sync_err}")

        await asyncio.gather(_sync_call_record(), _sync_lead_record(), return_exceptions=True)