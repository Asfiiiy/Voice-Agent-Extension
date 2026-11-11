# Inspire London College AI Voice Agent — Technical Project Dossier

**Target File:** `callcenter-dashboard/PROJECT_DOSSIER.md`  
**Generated Date:** 2026-10-13  
**Audience:** External Reviewer / Technical Audit  
**Purpose:** Comprehensive audit and diagnostic breakdown of the LiveKit voice agent system to diagnose reported issues:
- **P1:** Agent stops mid-sentence and goes silent.
- **P2:** Agent forgets earlier parts of the conversation.
- **P3:** Greeting and replies start late.
- **P4:** Agent does not answer course questions (fee, certification) and offers an advisor instead.
- **P5:** Agent misreads short answers (e.g., single "No." ended call; "Hello?" restarted pitch).

---

## Section A. Overview

### 1. File & Directory Tree (2 Levels)
Below is the complete 2-level inventory of `callcenter-dashboard/` with runtime usage status and purpose:

```text
callcenter-dashboard/
├── .dockerignore                            [Build Config] Ignores node_modules, .next, and logs during Docker image build.
├── .env                                     [Runtime] Next.js dashboard environment configuration (LiveKit, Prisma DB URL).
├── .gitignore                               [Dev Config] Git ignore definitions for node, python, next, and temp files.
├── AGENTS.md                                [Documentation] Architecture guidelines and operational rules for voice agent.
├── architecture.md                          [Documentation] System architectural diagram and sequence workflows.
├── CLAUDE.md                                [Documentation] Internal assistant development guidelines.
├── design.md                                [Documentation] Frontend design system, styling palette, and component design.
├── docker-compose.yml                       [Container Config] Multi-service orchestrator for dashboard, PostgreSQL, and agent.
├── Dockerfile                               [Build Config] Container recipe for Next.js web application.
├── eslint.config.mjs                        [Dev Tool] ESLint rules and TypeScript static checking configuration.
├── next-env.d.ts                            [Dev Tool] Next.js TypeScript declaration file.
├── next.config.ts                           [Runtime] Next.js build and runtime server configuration.
├── package-lock.json                        [Dev Tool] Deterministic Node.js dependency tree lockfile.
├── package.json                             [Runtime] Node project manifest, dependencies, and npm run scripts.
├── postcss.config.mjs                       [Build Config] PostCSS configuration for Tailwind CSS compilation.
├── README.md                                [Documentation] Project overview and setup instructions.
├── requirement.txt                          [Dead/Legacy] Outdated root Python package list (superseded by agent/requirements.txt).
├── seed_outbound.js                         [DB Utility] Node script to seed test leads into the PostgreSQL database.
├── techstack.md                             [Documentation] Summary of frontend, backend, and AI pipeline stack.
├── tsconfig.json                            [Dev Tool] TypeScript compiler configuration.
├── tsconfig.tsbuildinfo                     [Build Artifact] Incremental TypeScript compiler cache.
├── agent/
│   ├── .dockerignore                        [Build Config] Ignores venv, caches, and logs during agent image build.
│   ├── .env                                 [Runtime] Agent environment variables (LiveKit, Cartesia, Deepgram, Groq, Google, MySQL).
│   ├── .env.phase2c.bak                     [Backup] Created during Phase 2C (console stall & logging fixes).
│   ├── agent.py                             [Runtime] Core voice agent worker process (LiveKit AgentSession, STT, TTS, VAD, tools).
│   ├── agent.py.bak                         [Backup] Created during initial bug fix (disconnect & room handling).
│   ├── agent.py.bak2                        [Backup] Created during Phase 2A (voice pipeline tuning).
│   ├── agent.py.phase2b.bak                 [Backup] Created during Phase 2B (token reduction & FallbackAdapter).
│   ├── agent.py.phase2c.bak                 [Backup] Created during Phase 2C (event loop latency & Deepgram keyterms).
│   ├── agent.py.phase2d.bak                 [Backup] Created during Phase 2D (callback validation & EOU tuning).
│   ├── agent.py.phase3.bak                  [Backup] Created during Phase 3 (WordPress DB integration & conversation behavior).
│   ├── catalog_search.py                    [Dead/Test] Scratch script testing catalog fuzzy search.
│   ├── check_calls.py                       [Dead/Test] Script verifying calls API response.
│   ├── check_corporate.py                   [Dead/Test] Script inspecting corporate course data.
│   ├── check_course_meta.py                 [Dead/Test] Script checking WooCommerce postmeta keys.
│   ├── check_hs.py                          [Dead/Test] Script inspecting Health & Safety course catalog entry.
│   ├── debug_fails.py                       [Dead/Test] Scratch debugging script for error examination.
│   ├── Dockerfile                           [Build Config] Container recipe for Python LiveKit worker.
│   ├── find_18.py                           [Dead/Test] Scratch diagnostic script inspecting course ID variations.
│   ├── inspire_full_website_data.json       [Dead/Asset] Static JSON dump of historical course data.
│   ├── live_courses.py                      [Dead at Runtime] WooCommerce Store API crawler (imported on agent.py:34, never invoked).
│   ├── orchestrator.py                      [Runtime] Call lifecycle, DB logging, transcripts, recording upload, AI summary.
│   ├── orchestrator.py.bak                  [Backup] Created during initial bug fix.
│   ├── orchestrator.py.phase2c.bak          [Backup] Created during Phase 2C.
│   ├── orchestrator.py.phase2d.bak          [Backup] Created during Phase 2D.
│   ├── orchestrator.py.phase3.bak           [Backup] Created during Phase 3.
│   ├── rag.py                               [Runtime/Init Only] Qdrant client & embedding logic; seeds collection on startup but search is uncalled.
│   ├── requirements.txt                     [Runtime] Python package specifications for agent virtual environment.
│   ├── requirements.txt.bak                 [Backup] Created during initial setup.
│   ├── reseed_kb.py                         [Dead/Utility] Standalone script to populate Qdrant vector database.
│   ├── run_agent.bat                        [Runner] PowerShell/batch launcher for the Python agent worker.
│   ├── run_agent.bat.phase2c.bak            [Backup] Created during Phase 2C.
│   ├── test_benchmark.py                    [Dead/Test] Test measuring STT and TTS streaming latency.
│   ├── test_smart_search.py                 [Dead/Test] Test validating fuzzy matching logic.
│   ├── tts_edge.py                          [Dead at Runtime] Microsoft Edge TTS adapter (imported on agent.py:32, Cartesia is active).
│   ├── wp_connector.py                      [Runtime] WordPress MySQL connector, course facts parser, fuzzy matcher.
│   ├── wp_connector.py.phase2b.bak          [Backup] Created during Phase 2B.
│   ├── wp_connector.py.phase3.bak           [Backup] Created during Phase 3.
│   └── tools/
│       ├── build_ilc_ukpda_rag.py           [Offline Tool] Ingestion script converting website data into vector chunks.
│       ├── build_qdrant.py                  [Offline Tool] Scratch utility creating Qdrant collections.
│       ├── extract_all_pages.py             [Offline Tool] WordPress REST crawler extracting page content.
│       ├── extract_data.py                  [Offline Tool] Scratch script parsing course text.
│       └── test_search.py                   [Offline Tool] Test querying Qdrant points.
├── app/
│   ├── favicon.ico                          [Static Asset] Application favicon icon.
│   ├── globals.css                          [Runtime] Global styling, animations, and Tailwind directives.
│   ├── layout.tsx                           [Runtime] Root layout component with HTML, fonts, and header/sidebar wrapper.
│   ├── page.tsx                             [Runtime] Main dashboard routing switchboard.
│   ├── page.tsx.bak                         [Backup] Created during initial bug fix.
│   ├── agents/page.tsx                      [Runtime] Agent roster and performance dashboard.
│   ├── calls/page.tsx                       [Runtime] Call logs, audio recordings, and transcript inspection view.
│   ├── settings/page.tsx                    [Runtime] System settings, API keys status, and preferences view.
│   ├── test-call/page.tsx                   [Runtime] Inbound browser test call interface.
│   ├── test-call/page.tsx.bak               [Backup] Created during disconnect bug fix.
│   ├── api/
│   │   ├── callbacks/route.ts               [Runtime] Next.js route: POST schedules advisor callback in Prisma DB.
│   │   ├── callbacks/route.ts.phase2d.bak   [Backup] Created during Phase 2D.
│   │   ├── calls/route.ts                   [Runtime] Next.js route: GET lists calls, POST creates inbound call entry.
│   │   ├── calls/[id]/route.ts              [Runtime] Next.js route: PATCH updates call duration, summary, disposition.
│   │   ├── calls/dial/route.ts              [Runtime] Next.js route: POST creates outbound LiveKit room and dispatches agent.
│   │   ├── calls/dial/route.ts.bak          [Backup] Created during initial bug fix.
│   │   ├── calls/outbound/route.ts          [Runtime] Next.js route: POST creates outbound call record in Prisma DB.
│   │   ├── calls/stream/route.ts            [Runtime] Next.js route: Server-Sent Events (SSE) broadcasting live call updates.
│   │   ├── knowledge/route.ts               [Runtime] Next.js route: POST searches knowledge base.
│   │   ├── leads/route.ts                   [Runtime] Next.js route: GET lists leads, PATCH updates lead status/disposition.
│   │   ├── leads/notes/route.ts             [Runtime] Next.js route: POST appends human/AI notes to lead records.
│   │   ├── livekit/token/route.ts           [Runtime] Next.js route: GET generates participant token for inbound test calls.
│   │   ├── recordings/route.ts              [Runtime] Next.js route: POST receives multipart `.ogg` audio files and saves to disk.
│   │   ├── team/route.ts                    [Runtime] Next.js route: GET returns advisor presence statuses.
│   │   ├── team/transfer/route.ts           [Runtime] Next.js route: POST handles live call transfer to advisor extensions.
│   │   ├── token/route.ts                   [Runtime] Next.js route: GET generates LiveKit participant tokens.
│   │   ├── transcripts/route.ts             [Runtime] Next.js route: POST appends transcript line, GET returns room transcript.
│   │   └── transcripts/stream/route.ts      [Runtime] Next.js route: SSE broadcasting live transcript lines to UI.
│   ├── components/
│   │   ├── AgentsView.tsx                   [Runtime] Visual component: agent operational stats.
│   │   ├── CallsView.tsx                    [Runtime] Visual component: call history and audio playback.
│   │   ├── CustomersView.tsx                [Runtime] Visual component: student directory.
│   │   ├── Header.tsx                       [Runtime] Visual component: top navigation bar.
│   │   ├── LeadsManagerView.tsx             [Runtime] Visual component: CSV lead importer and pipeline management.
│   │   ├── MetricCard.tsx                   [Runtime] Visual component: KPI cards.
│   │   ├── OutboundCallsView.tsx            [Runtime] Visual component: outbound call logs and advisor screen pops.
│   │   ├── OutboundLeadsView.tsx            [Runtime] Visual component: campaign leads list with "Dial with AI" button.
│   │   ├── OutboundLeadsView.tsx.bak        [Backup] Created during disconnect bug fix.
│   │   ├── OutboundLeadsView.tsx.bak2       [Backup] Created during disconnect bug fix.
│   │   ├── ReportsView.tsx                  [Runtime] Visual component: conversion charts and CSV export.
│   │   ├── SettingsView.tsx                 [Runtime] Visual component: settings panel.
│   │   ├── Sidebar.tsx                      [Runtime] Visual component: left menu navigation.
│   │   └── TeamPresenceView.tsx             [Runtime] Visual component: advisor extensions board.
│   └── hooks/
│       ├── useLiveCalls.ts                  [Runtime] React hook connecting to `/api/calls/stream` SSE.
│       └── useTranscriptStream.ts           [Runtime] React hook connecting to `/api/transcripts/stream` SSE.
├── lib/
│   ├── liveCallStore.ts                     [Runtime] In-memory event emitter for live call SSE events.
│   ├── prisma.ts                            [Runtime] Prisma client singleton instance.
│   └── transcriptStore.ts                   [Runtime] In-memory buffer and event emitter for live transcript SSE.
├── prisma/
│   └── schema.prisma                        [Runtime] Prisma ORM schema for PostgreSQL (Call, Lead, Advisor, Callback).
└── public/
    ├── file.svg, globe.svg, next.svg...     [Static Assets] Vector graphics and icons.
    ├── leads_ilc_mock.csv                   [Static Asset] Mock CSV dataset of student inquiries.
    └── recordings/                          [Runtime] File storage folder for uploaded `.ogg` call recordings.
```

### 2. Runtime Environment & Installed Package Versions
- **Python Version:** `Python 3.14.7` (Running in virtual environment at `"C:\Users\New Computer Arena\Documents\voice agent 2\.venv\Scripts\python.exe"`)
- **Node.js Version:** `v24.20.0`
- **npm Version:** `11.19.0`
- **Next.js Version:** `16.3.5` (React `19.2.8`)
- **Core Python Packages (pip freeze output):**
  ```text
  google-api-core==2.38.0
  google-auth==2.58.0
  google-cloud-speech==2.40.0
  google-cloud-texttospeech==2.37.0
  google-genai==2.25.0
  googleapis-common-protos==1.75.3
  livekit==1.1.20
  livekit-agents==1.8.6
  livekit-api==1.2.1
  livekit-blingfire==1.1.0
  livekit-local-inference==0.2.7
  livekit-plugins-cartesia==1.8.6
  livekit-plugins-deepgram==1.8.3
  livekit-plugins-google==1.8.2
  livekit-plugins-groq==1.8.6
  livekit-plugins-krisp==0.4.6
  livekit-plugins-krisp-internal==0.2.0
  livekit-plugins-openai==1.8.6
  livekit-plugins-silero==1.8.2
  livekit-plugins-turn-detector==1.8.6
  livekit-protocol==1.1.27
  pydantic==2.13.5
  pydantic_core==2.46.5
  pymysql==1.1.2
  ```

### 3. Process Execution Commands
- **Next.js Dashboard:**
  ```powershell
  cd "c:\Users\New Computer Arena\Documents\voice agent 2\callcenter-dashboard"
  npm run dev
  # Runs: next dev --webpack on http://localhost:3000
  ```
- **Voice Agent Worker:**
  ```powershell
  cd "c:\Users\New Computer Arena\Documents\voice agent 2\callcenter-dashboard\agent"
  & "C:\Users\New Computer Arena\Documents\voice agent 2\.venv\Scripts\python.exe" agent.py dev
  ```
- **Local WordPress / WooCommerce Database (MariaDB):**
  ```powershell
  & "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
  # Listening on 127.0.0.1:3006 / 3306
  ```

---

## Section B. Call Lifecycle, Step by Step

### Step 1: User Clicks "Dial with AI"
- **Location:** `app/components/OutboundLeadsView.tsx:1100`
- **Execution:** Synchronous UI click event triggers `triggerManualDial(lead)` (`OutboundLeadsView.tsx:493`).
- **Network Call:** Asynchronous HTTP POST `fetch("/api/calls/dial")` with JSON body `{ leadId, leadName, phoneNumber, courseInquired }` (`OutboundLeadsView.tsx:515-524`). Timeout: Browser default fetch timeout.

### Step 2: Next.js API Initiates Room & Dispatches Worker
- **Location:** `app/api/calls/dial/route.ts:8-84`
- **Execution:** Async Next.js Route Handler.
- **Network Calls Made:**
  1. `RoomServiceClient.createRoom(...)` via HTTP POST to `LIVEKIT_URL` (LiveKit Cloud) creating room `outbound-{safeLeadId}-{timestamp}` with metadata (`route.ts:34-39`). Timeout: 10s.
  2. `AgentDispatchClient.createDispatch(...)` via HTTP POST to `LIVEKIT_URL` dispatching agent worker named `"voice-agent"` into the room (`route.ts:46-48`). Timeout: 10s.
  3. Server signs JWT token with `AccessToken` granting `roomJoin`, `canPublish`, `canSubscribe` (`route.ts:61-75`).
- **Response:** JSON `{ success: true, roomName, token, url }`.

### Step 3: Browser Connects WebRTC Room & Publishes Audio
- **Location:** `app/components/OutboundLeadsView.tsx:531-601`
- **Execution:** Async WebRTC connection via `livekit-client`.
- **Network Calls Made:**
  1. `room.connect(targetUrl, data.token)`: WebSocket handshake to `wss://...livekit.cloud`.
  2. `createLocalAudioTrack(...)`: Accesses browser microphone with constraints `{ echoCancellation: true, noiseSuppression: true, autoGainControl: true }`.
  3. `room.localParticipant.publishTrack(audioTrack)`: Publishes WebRTC audio track to LiveKit Cloud.

### Step 4: Python Worker Receives Job Dispatch & Enters Entrypoint
- **Location:** `agent/agent.py:1069-1087` (Prewarm) and `agent/agent.py:336` (`entrypoint`)
- **Execution:** Async coroutine triggered by LiveKit Agent framework.
- **Actions:**
  1. Prewarm: `proc.userdata["vad"]` and `proc.userdata["eou_model"] = EnglishModel()` preloaded in RAM (`agent.py:1074-1077`).
  2. `job_received_time = time.time()` recorded (`agent.py:337`).
  3. `asyncio.create_task(asyncio.to_thread(rag.init_knowledge_base))` started (`agent.py:340`).
  4. `await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)` joins room via WebRTC (`agent.py:343`).
  5. `participant = await ctx.wait_for_participant()` waits for caller (`agent.py:346`).
  6. Parses metadata: determines direction (`OUTBOUND`), lead name, course inquired (`agent.py:363-379`).

### Step 5: Orchestrator Initializes Call Record
- **Location:** `agent/orchestrator.py:100-147`
- **Execution:** Fire-and-forget async background task spawned by `asyncio.create_task(orchestrator.start_call())` (`agent.py:390`).
- **Network Calls:**
  1. Background thread pings `/api/callbacks`, `/api/recordings`, `/api/leads`, `/api/transcripts`, `/api/calls/outbound` to pre-warm Next.js dev compiler (`orchestrator.py:87-98`). Timeout: 10.0s.
  2. Background thread calls HTTP POST `http://127.0.0.1:3000/api/calls/outbound` to insert initial database record (`orchestrator.py:107-147`). Timeout: 8.0s.

### Step 6: Session Creation & Prompt Construction
- **Location:** `agent/agent.py:557-730` and `agent/agent.py:961-987`
- **Execution:** Synchronous object construction and asynchronous `session.start`.
- **Actions:**
  1. `match_course_facts(course_inquired)` queries MySQL DB via `wp_connector.get_course_details_from_db` (`agent.py:214`).
  2. Renders `build_outbound_instructions` (< 350 words) injecting verified course data (`agent.py:260-282`).
  3. Constructs `AgentSession` with Deepgram Nova-3 STT, Cartesia Sonic-3 TTS, Silero VAD, FallbackAdapter LLM chain (`agent.py:699-730`).
  4. Calls `await session.start(room=ctx.room, agent=..., record={"audio": True, "traces": False})` (`agent.py:980-987`).

### Step 7: Initial Greeting Spoken
- **Location:** `agent/agent.py:847-875`
- **Execution:** Spawns `timer_task = asyncio.create_task(initial_greeting_timer())` (`agent.py:990`).
- **Actions:**
  1. Renders opening greeting: `"Good afternoon! Am I speaking with Amina Begum?"`.
  2. Invokes `await session.say(greeting, allow_interruptions=False)` (`agent.py:866`).
  3. Audio stream synthesized via Cartesia Sonic-3 and sent over WebRTC audio track to browser.
  4. Measures elapsed time and logs: `[GREETING METRICS] Received job request to first greeting audio start: X.XXs | Finished speaking: X.XXs (Target: < 2.0s)`.
  5. Arms 2-stage silence watchdog (`agent.py:872`).

### Step 8: User Turn, STT, and LLM Execution
- **Location:** `agent/agent.py:878-944` and LiveKit Agent pipeline
- **Execution:** Event-driven streaming.
- **Actions:**
  1. Caller speaks into browser mic. Audio streamed via WebRTC to worker.
  2. Deepgram STT emits streaming events. When `is_final=True`, appends text to `caller_utterances` (`agent.py:885`).
  3. Silero VAD & `EnglishModel` turn detector detect end-of-turn (EOU delay: 0.5s–2.5s).
  4. LiveKit calls `Agent.llm_node`. `TrackedGroqLLM.chat` trims `chat_ctx` to last 6 turns and queries Groq API (`openai/gpt-oss-20b`). Timeout: 3.5s.
  5. Fallback: If Groq fails or returns 429, falls back to secondary Groq (`openai/gpt-oss-120b`, timeout: 3.5s), then `SafeGeminiLLM` (`gemini-flash-lite-latest`, timeout: 10.5s).
  6. LLM response tokens stream through `custom_speech_cleaner` into Cartesia Sonic-3 TTS.
  7. `on_conversation_item_added` fires: logs `[TURN METRICS]` and dispatches transcript line to Next.js API in a background fire-and-forget task (`agent.py:907, orchestrator.py:63-85`).

### Step 9: Function Tool Execution
- **Location:** `agent/agent.py:481-552`
- **Tools Available:** `get_course_info`, `schedule_callback`, `mark_lead_disposition`.
- **Validation:** `schedule_callback` runs `_caller_spoke_day_and_time` validating that caller explicitly spoken weekday and UK time (`agent.py:437-478`).
- **Persistence:** Offloads HTTP sync to worker threads via `asyncio.to_thread(_post_callback_sync, ...)` (`agent.py:506`) to `http://127.0.0.1:3000/api/callbacks`. Timeout: 15.0s.

### Step 10: Silence Watchdog Execution
- **Location:** `agent/agent.py:791-829`
- **Execution:** Async timer sleeping 8.0 seconds while agent state is `listening` and user state is not `speaking`.
- **Stage 1 (8s silence):** Agent speaks check-in line via `session.say("Are you still there, {lead_name}?", allow_interruptions=True)`.
- **Stage 2 (additional 8s silence):** Agent speaks goodbye via `session.say("It seems I cannot hear you right now... goodbye!", allow_interruptions=False)` and signals `disconnect_event.set()`.

### Step 11: Hang-up & Session Shutdown
- **Location:** `agent/agent.py:993-1022`
- **Execution:** Triggered by user clicking "Hang Up" in UI (`activeCallRoom.disconnect()`) or agent ending call.
- **Actions:**
  1. Disconnect event triggers: `await disconnect_event.wait()` unblocks (`agent.py:993`).
  2. Cancels silence watchdog and greeting timer (`agent.py:995-998`).
  3. Calls `audio_out.resume()` and `audio_out.clear_buffer()` to prevent audio hangs (`agent.py:1004-1005`).
  4. Calls `await session.aclose()` (timeout 2.5s) (`agent.py:1012`).
  5. Calls `await recorder_io.aclose()` (timeout 3.0s) to flush recorded audio to disk (`agent.py:1020`).

### Step 12: Recording Upload & Call Finalization
- **Location:** `agent/agent.py:1024-1066` and `agent/orchestrator.py:200-336`
- **Actions:**
  1. Finds `.ogg` file in session directory via worker thread (`agent.py:1047`).
  2. HTTP multipart POST upload to `http://127.0.0.1:3000/api/recordings` (`orchestrator.py:210-226`). Timeout: 8.0s.
  3. `orchestrator.end_call()` generates AI call summary and lead score via Google Gemini API (`gemini-2.5-flash-lite`, timeout 2.5s) (`orchestrator.py:150-198`).
  4. Concurrently updates database records via HTTP PATCH to `/api/calls/{id}` and `/api/leads` (`orchestrator.py:259-336`). Timeout: 4.0s.
  5. Calls `ctx.shutdown(reason="call completed")` terminating worker process cleanly (`agent.py:1064`).

---

## Section C. AgentSession Configuration — VERBATIM

### Verbatim Construction (`callcenter-dashboard/agent/agent.py:699-730`)
```python
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
                "min_delay": 0.5,
                "max_delay": 2.5,
            },
            "interruption": {
                "enabled": True,
                "mode": "vad",
                "min_duration": 0.5,
                "min_words": 1,
                "resume_false_interruption": True,
            },
            "preemptive_generation": {
                "enabled": False,
            },
        },
        aec_warmup_duration=0.0,
        use_tts_aligned_transcript=False,
        user_away_timeout=None,
    )
```

### Verbatim `session.start` Call (`callcenter-dashboard/agent/agent.py:980-987`)
```python
    await session.start(
        room=ctx.room,
        agent=agents.Agent(
            instructions=active_instructions,
            tools=active_tools
        ),
        record={"audio": True, "traces": False}
    )
```

### Explanation of Settings in `livekit-agents 1.8.6` (Verified from Installed Source)
1. `vad=vad_model`: Voice Activity Detection model instance used to detect user speech boundaries; verified from `livekit/agents/voice/agent_session.py:640`.
2. `stt=stt_instance`: Speech-to-Text streaming provider used to transcribe caller speech; verified from `livekit/agents/voice/agent_session.py:636`.
3. `llm=resilient_llm`: Large Language Model provider instance used for reasoning and generating replies; verified from `livekit/agents/voice/agent_session.py:642`.
4. `tts=active_tts`: Text-to-Speech provider instance that synthesizes agent speech audio; verified from `livekit/agents/voice/agent_session.py:645`.
5. `tts_text_transforms`: List of asynchronous text generators applied sequentially to transform or clean text before TTS synthesis; verified from `livekit/agents/voice/agent_session.py:610`.
6. `turn_handling["turn_detection"]`: Model used to predict when the user has finished speaking (e.g. `EnglishModel()`); verified from `livekit/agents/voice/agent_session.py:573`.
7. `turn_handling["endpointing"]["mode"] = "fixed"`: Fixed minimum and maximum silence windows before triggering end-of-turn; verified from `livekit/agents/voice/turn.py:221`.
8. `turn_handling["endpointing"]["min_delay"] = 0.5`: Minimum silence duration (in seconds) required after complete sentences before committing end-of-turn; verified from `livekit/agents/voice/turn.py:225`.
9. `turn_handling["endpointing"]["max_delay"] = 2.5`: Maximum silence duration (in seconds) permitted before forcing an end-of-turn on incomplete utterances; verified from `livekit/agents/voice/turn.py:226`.
10. `turn_handling["interruption"]["enabled"] = True`: Allows the user to interrupt the agent while the agent is speaking; verified from `livekit/agents/voice/turn.py:182`.
11. `turn_handling["interruption"]["mode"] = "vad"`: Uses audio VAD signal directly to initiate interruption rather than waiting for full STT transcription; verified from `livekit/agents/voice/turn.py:183`.
12. `turn_handling["interruption"]["min_duration"] = 0.5`: Minimum continuous speech duration (in seconds) required from the user before triggering an interruption; verified from `livekit/agents/voice/turn.py:185`.
13. `turn_handling["interruption"]["min_words"] = 1`: Minimum transcribed words required to confirm an interruption when STT is available; verified from `livekit/agents/voice/turn.py:186`.
14. `turn_handling["interruption"]["resume_false_interruption"] = True`: Automatically pauses agent audio during user speech and resumes playback if the interruption turns out to be false; verified from `livekit/agents/voice/turn.py:195`.
15. `turn_handling["preemptive_generation"]["enabled"] = False`: Disables speculative LLM generation while the user is still speaking; verified from `livekit/agents/voice/turn.py:270`.
16. `aec_warmup_duration = 0.0`: Acoustic Echo Cancellation warmup duration in seconds, set to 0.0 to disable warmup delay; verified from `livekit/agents/voice/agent_session.py:590`.
17. `use_tts_aligned_transcript = False`: Disables timestamp alignment between TTS audio playback and emitted transcript events; verified from `livekit/agents/voice/agent_session.py:616`.
18. `user_away_timeout = None`: Disables the automatic transition of `user_state` to `"away"` after inactivity; verified from `livekit/agents/voice/agent_session.py:607`.
19. `record={"audio": True, "traces": False}`: Enables local session audio recording to disk while disabling tracing recording; verified from `livekit/agents/voice/agent_session.py:1330`.

---

## Section D. STT / TTS / VAD / Turn Detector — VERBATIM Config

### 1. Deepgram STT Configuration (`agent/agent.py:562-624`)
- **Constructed:** Per call inside `entrypoint(ctx)`.
```python
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
```

### 2. Cartesia TTS Configuration (`agent/agent.py:689-695`)
- **Constructed:** Per call inside `entrypoint(ctx)`.
```python
    cartesia_voice = os.environ["CARTESIA_VOICE_ID"]
    active_tts = cartesia.TTS(
        model="sonic-3",
        voice=cartesia_voice,
        api_key=os.environ.get("CARTESIA_API_KEY"),
    )
```

### 3. Silero VAD Configuration (`agent/agent.py:1074` and `agent/agent.py:557-560`)
- **Constructed:** Preloaded once in `prewarm(proc)` and stored in `proc.userdata["vad"]`; reused per call.
```python
# In prewarm():
proc.userdata["vad"] = silero.VAD.load(min_silence_duration=0.30, min_speech_duration=0.08, activation_threshold=0.55)

# In entrypoint():
vad_model = getattr(ctx.proc, "userdata", {}).get("vad") if hasattr(ctx, "proc") else None
if not vad_model:
    vad_model = silero.VAD.load(min_silence_duration=0.30, min_speech_duration=0.08, activation_threshold=0.55)
```

### 4. Turn Detector Configuration (`agent/agent.py:1076-1077`, `agent/agent.py:661-664`, `agent/agent.py:709-715`)
- **Constructed:** Preloaded once in `prewarm(proc)` as `proc.userdata["eou_model"] = EnglishModel()`; reused per call.
```python
# In prewarm():
from livekit.plugins.turn_detector.eou import EnglishModel
proc.userdata["eou_model"] = EnglishModel()

# In entrypoint():
td_instance = getattr(ctx.proc, "userdata", {}).get("eou_model") if hasattr(ctx, "proc") else None
if td_instance is None:
    td_instance = EnglishModel()

# In session turn_handling:
"turn_detection": turn_detector_instance,
"endpointing": {
    "mode": "fixed",
    "min_delay": 0.5,
    "max_delay": 2.5,
},
```

---

## Section E. LLM Chain — VERBATIM

### 1. Verbatim LLM Classes & Wrappers (`agent/agent.py:131-189`)
```python
class TrackedGroqLLM(groq.LLM):
    """Groq LLM wrapper that trims history to 6 turns, always passes consistent tools with tool_choice='auto', and enforces max_retry=0."""
    def chat(self, *, chat_ctx, tools=None, conn_options=None, **kwargs):
        chat_ctx = _trim_chat_ctx(chat_ctx, max_turns=6)
        if conn_options is not None:
            conn_options = dataclasses.replace(conn_options, max_retry=0)
        else:
            conn_options = APIConnectOptions(timeout=3.5, max_retry=0)
        if tools and "tool_choice" not in kwargs:
            kwargs["tool_choice"] = "auto"
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
        chat_ctx = _trim_chat_ctx(chat_ctx, max_turns=6)
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
        stream = super().chat(chat_ctx=clean_ctx, tools=tools, conn_options=conn_options, **kwargs)
        return _wrap_stream_for_usage(stream, "Gemini", self.model)
```

### 2. Verbatim FallbackAdapter Construction (`agent/agent.py:626-687`)
```python
    groq_api_key = os.getenv("GROQ_API_KEY")
    print(f"[*] GROQ key loaded: {bool(groq_api_key)}")

    def _create_llm_clients():
        g_primary = SafeGeminiLLM(
            api_key=api_key,
            model="gemini-flash-lite-latest",
            temperature=0.35,
            max_output_tokens=120,
        )
        g_secondary = SafeGeminiLLM(
            api_key=api_key,
            model="gemini-flash-latest",
            temperature=0.35,
            max_output_tokens=120,
            thinking_config={"thinking_budget": 0},
        )
        p_groq = None
        s_groq = None
        if groq_api_key:
            p_groq = TrackedGroqLLM(
                model="openai/gpt-oss-20b",
                api_key=groq_api_key,
                temperature=0.35,
                max_completion_tokens=350,
                tool_choice="auto",
            )
            s_groq = TrackedGroqLLM(
                model="openai/gpt-oss-120b",
                api_key=groq_api_key,
                temperature=0.35,
                max_completion_tokens=350,
                tool_choice="auto",
            )
        td_instance = getattr(ctx.proc, "userdata", {}).get("eou_model") if hasattr(ctx, "proc") else None
        if td_instance is None:
            td_instance = EnglishModel()
        return p_groq, s_groq, g_primary, g_secondary, td_instance

    primary_groq, secondary_groq, gemini_primary, gemini_secondary, turn_detector_instance = await asyncio.to_thread(_create_llm_clients)

    llm_list = []
    if groq_api_key and primary_groq is not None:
        print("[*] Primary LLM in use: Groq (openai/gpt-oss-20b, timeout: 3.5s, max_retry: 0)")
        llm_list.append(primary_groq)
        if secondary_groq is not None:
            print("[*] Secondary LLM in use: Groq (openai/gpt-oss-120b, separate 8k TPM bucket, timeout: 3.5s, max_retry: 0)")
            llm_list.append(secondary_groq)
        adapter_timeout = 3.5
    else:
        print("[*] Notice: GROQ_API_KEY not set. Primary LLM in use: SafeGeminiLLM (timeout: 10.5s)")
        adapter_timeout = 10.5

    llm_list.extend([gemini_primary, gemini_secondary])

    resilient_llm = llm.FallbackAdapter(
        llm=llm_list,
        attempt_timeout=adapter_timeout,
        max_retry_per_llm=0,
        retry_interval=0.5,
    )
```

---

## Section F. Conversation Memory — VERBATIM (Critical for P2)

### 1. Verbatim `_trim_chat_ctx` Implementation (`agent/agent.py:82-105`)
```python
def _trim_chat_ctx(chat_ctx: llm.ChatContext, max_turns: int = 6) -> llm.ChatContext:
    """Trims chat_ctx to system instructions + last max_turns (12 items) without splitting tool calls."""
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
    max_non_sys = max_turns * 2  # ~6 turns (user + assistant pairs)
    if len(other_items) > max_non_sys:
        other_items = other_items[-max_non_sys:]
        # Drop any leading orphaned function_call_output whose function_call was sliced off
        while other_items and getattr(other_items[0], "type", "") == "function_call_output":
            other_items.pop(0)
    # Ensure strict user->assistant alternation after system prompt (fixes gpt-oss-20b harmony template after session.say greeting)
    if other_items and getattr(other_items[0], "type", "") == "message" and getattr(other_items[0], "role", "") == "assistant":
        other_items.insert(0, llm.ChatMessage(role="user", content=["Hello"]))
    trimmed = llm.ChatContext(sys_items[:1] + other_items)
    return trimmed
```

### 2. Analysis: Does Trimming Affect Only What is Sent, or Delete from Session?
- **Finding:** Trimming affects **ONLY what is SENT to the LLM per request**. It does **NOT delete** items from the session's stored history (`session._chat_ctx` or `agent._chat_ctx`).
- **Proof:**
  In `livekit-agents` 1.8.6 source (`livekit/agents/voice/agent_activity.py:3463`), every inference call creates a copy of the context before dispatching to the LLM node:
  ```python
  chat_ctx = chat_ctx.copy()
  ```
  Then, inside `TrackedGroqLLM.chat` and `SafeGeminiLLM.chat`, `_trim_chat_ctx` instantiates a brand new `llm.ChatContext` object:
  ```python
  trimmed = llm.ChatContext(sys_items[:1] + other_items)
  ```
  The session's underlying `_chat_ctx` continues to accumulate all conversation items throughout the call for recording, transcript dispatching, and summary generation.
- **Root Cause of Problem P2 ("Agent forgets earlier parts of the conversation"):**
  Because `_trim_chat_ctx` caps `other_items` at `max_turns * 2 = 12` items, the LLM receives **only the last 6 turns**.
  Any facts established in turns 1 through 4 (e.g., caller background, requirements, questions asked, or specific personal details) are completely dropped from the prompt sent to Groq and Gemini. By turn 10, the LLM has zero visibility into the first 4 turns of the conversation.

### 3. Number of Turns Sent to LLM on Turn 10 & Exact Simulated Message List
- **Turn 10 Breakdown:**
  - Total items stored in session history: **21 items** (1 system message + 10 user messages + 10 assistant messages).
  - Total items sent to LLM: **13 items** (1 system instruction message + 12 conversation messages = exactly the last 6 turns).
- **Exact Message List for 10-Turn Conversation (`agent/agent.py` simulation):**
  ```text
  [0]  role=system    : You are Sonia, Admissions Advisor at Inspire London College,...
  [1]  role=user      : What certificate will I get?...
  [2]  role=assistant : Recognised hardcopy Certificate & Transcript from Qualifi Lt...
  [3]  role=user      : No....
  [4]  role=assistant : No problem — is there anything else about the course you wou...
  [5]  role=user      : Can you hear me?...
  [6]  role=assistant : Yes, I can hear you. Is there any other information about th...
  [7]  role=user      : How long does it take?...
  [8]  role=assistant : The diploma can be completed in 6 to 12 months, fully online...
  [9]  role=user      : What are the units?...
  [10] role=assistant : Units include managing cyber threats, securing networks, and...
  [11] role=user      : Okay, I want to enrol....
  [12] role=assistant : Great! Which day and what UK time between 10:00 and 17:00 wo...
  ```
  *Note: Turns 1 to 4 ("Hello, is this Sonia?", "Yes, speaking.", "What is the fee for the course?", "Is there an installment plan?") are omitted.*

---

## Section G. Prompts — VERBATIM

### 1. Inbound System Instructions (`agent/agent.py:191-207`)
```text
You are Sonia, Senior Admissions Advisor at Inspire London College (ILC).
SPOKEN STYLE RULES:
- Speak in warm, natural British English: 1 to 2 short spoken sentences per turn (under 30 words), ending with a helpful question.
- Never use markdown, bullet points, asterisks, or parenthetical notes.
- Never tell the caller to wait or hold.
COURSE & PRICE RULES (STRICT):
- Call search_website ONLY when asked about a specific course's fees, deposit, instalments, modules, or duration.
- UNVERIFIED / NOT_SURE RULE: If search_website returns Pricing Status: UNVERIFIED or NOT_SURE, NEVER state or guess any price, fee, deposit, or monthly instalment amount at all. Politely say the confirmed fee schedule for that course is not on your screen right now and offer to book a callback with a Senior Admissions Advisor to confirm.
- HARD PRICE RULE (VERIFIED COURSES ONLY): State ONLY the exact fee, initial deposit, and monthly instalment plan returned by search_website when Pricing Status is VERIFIED. NEVER calculate, divide, or invent any other payment breakdown.
CALLBACK BOOKING RULES (STRICT):
- Your goal is to book a callback with a Senior Admissions Advisor using schedule_callback.
- schedule_callback may ONLY be called when the caller has explicitly spoken BOTH a specific day AND a specific UK time in their own words. Never invent, guess, or assume a day or time.
- If the caller says they want to talk or want a callback without stating both a day and a time, or if schedule_callback returns NEED_DAY_AND_TIME, ask the caller which day and what UK time works best for them.
- If schedule_callback returns FAILED, you MUST NOT say the callback is booked — tell the caller our advisor team will call back today to confirm.
- Only when schedule_callback returns SUCCESS may you say the callback is booked and confirm the exact day and UK time in one sentence.
```

### 2. Outbound Prompt Generator (`agent/agent.py:260-282`)
```python
    return (
        f"You are Sonia, Admissions Advisor at Inspire London College, calling {lead_name}.\n\n"
        f"COURSE DATA:\n"
        f"- Course: {title}\n"
        f"- Level: {level} | Awarding Body: {awarding_body}\n"
        f"- Certificate: {cert_text}\n"
        f"- Fees: {fee}\n"
        f"- Deposit: {deposit}\n"
        f"- Instalments: {instalments}\n"
        f"- Duration: {duration}, 100% online self-paced\n"
        f"- Assessment: {assessment}\n"
        f"- Requirements: {requirements}\n"
        f"- Units: {units}\n\n"
        f"RULES:\n"
        f"1. FLOW: Confirm speaking with {lead_name} -> ask if good time -> ask why they enquired -> answer questions -> when they want to enrol, book an admissions advisor callback: ask which day and what UK time (Mon-Fri 10:00-17:00) works best.\n"
        f"2. ANSWER FROM DATA: Answer fee, deposit, instalments, duration, certificate, assessment, requirements, units directly from COURSE DATA. Offer advisor callback ONLY if a detail is missing in COURSE DATA, or when caller says they want to enrol.\n"
        f"3. CONCISE: Max 2 short sentences per turn, 1 question at a time. Say full course name once; after that 'the course' or 'the diploma'. Never say 'my screen' or 'the system'.\n"
        f"4. HANDLING 'NO': 'No' only answers your last question. Never end call or assume not interested. Ask: 'No problem — is there anything else about the course you would like to know?'\n"
        f"5. NOT INTERESTED: Call mark_lead_disposition with NOT_INTERESTED only if caller explicitly says not interested or stop calling.\n"
        f"6. 'HELLO?': Say 'Yes, I can hear you.' and continue. Never restart pitch.\n"
        f"7. NEVER END CALL unless caller says goodbye or not interested.\n"
        f"8. BOOKING & TOOLS: When caller says they want to enrol, ask for their preferred day and UK time. Call schedule_callback ONLY after the caller has explicitly spoken both a specific day and UK time in their own words."
    )
```

### 3. Greeting & Silence Strings
- **Outbound Greeting (`agent/agent.py:854`):**  
  `"{time_greeting}! Am I speaking with {lead_name}?"` (e.g., `"Good afternoon! Am I speaking with Amina Begum?"`)
- **Inbound Greeting (`agent/agent.py:856`):**  
  `"{time_greeting}! Thank you for calling Inspire London College, my name is Sonia. Who do I have the pleasure of speaking with today?"`
- **Silence Stage 1 Check-In (`agent/agent.py:807`):**  
  `"Are you still there, {lead_name}?"`
- **Silence Stage 2 Goodbye (`agent/agent.py:812-815`):**  
  `"It seems I cannot hear you right now, {lead_name}, so I will end the call for now. Have a lovely day, goodbye!"`

### 4. Final Rendered Prompt for Lead "Amina Begum" / "Qualifi Level 4 Diploma in Cyber Security"
- **Total Character Count:** 2,114 characters
- **Total Word Count:** 344 words
- **Estimated Token Count:** ~447 tokens

```text
You are Sonia, Admissions Advisor at Inspire London College, calling Amina Begum.

COURSE DATA:
- Course: Qualifi Level 4 Diploma in Cyber Security
- Level: RQF Level 4 | Awarding Body: Qualifi Ltd.
- Certificate: Recognised hardcopy Certificate & Transcript included
- Fees: Regular fee £856, discounted to £629 for upfront full payment
- Deposit: £250
- Instalments: £53.75 per month for 8 months
- Duration: 6 Months - 12 Months, 100% online self-paced
- Assessment: Assignments / Report Writing, zero exams
- Requirements: Level 3 qualification or equivalent, ICT and English skills
- Units: Identify and manage cyber threats and risks.; Secure networks and data communications.; Apply database security and programming skills.; Respond to incidents and conduct digital forensics.

RULES:
1. FLOW: Confirm speaking with Amina Begum -> ask if good time -> ask why they enquired -> answer questions -> when they want to enrol, book an admissions advisor callback: ask which day and what UK time (Mon-Fri 10:00-17:00) works best.
2. ANSWER FROM DATA: Answer fee, deposit, instalments, duration, certificate, assessment, requirements, units directly from COURSE DATA. Offer advisor callback ONLY if a detail is missing in COURSE DATA, or when caller says they want to enrol.
3. CONCISE: Max 2 short sentences per turn, 1 question at a time. Say full course name once; after that 'the course' or 'the diploma'. Never say 'my screen' or 'the system'.
4. HANDLING 'NO': 'No' only answers your last question. Never end call or assume not interested. Ask: 'No problem — is there anything else about the course you would like to know?'
5. NOT INTERESTED: Call mark_lead_disposition with NOT_INTERESTED only if caller explicitly says not interested or stop calling.
6. 'HELLO?': Say 'Yes, I can hear you.' and continue. Never restart pitch.
7. NEVER END CALL unless caller says goodbye or not interested.
8. BOOKING & TOOLS: When caller says they want to enrol, ask for their preferred day and UK time. Call schedule_callback ONLY after the caller has explicitly spoken both a specific day and UK time in their own words.
```

---

## Section H. Tools — VERBATIM

### 1. `get_course_info` (`agent/agent.py:289-316`)
- **Active For:** OUTBOUND and INBOUND calls.
- **Timeout:** Background thread execution; no network timeout.
- **Success Return:** Multiline course facts string containing title, level, awarding body, fee, deposit, instalments, duration, assessment, certificate.
- **Failure Return:** `"Course '{course_name}' was not found in our database. Offer to have an admissions advisor check availability."`
```python
@llm.function_tool(
    name="get_course_info",
    description="Look up information (fee, deposit, instalments, duration, awarding body, assessment) for another qualification or course in the college database."
)
async def get_course_info(course_name: str) -> str:
    """Fetches real course details from the WordPress / WooCommerce database."""
    global _TOOL_IN_PROGRESS
    _TOOL_IN_PROGRESS = True
    try:
        print(f"[*] Tool called: get_course_info(course_name='{course_name}')")
        data = await asyncio.to_thread(wp_connector.get_course_details_from_db, course_name)
        if not data:
            return f"Course '{course_name}' was not found in our database. Offer to have an admissions advisor check availability."
        info = (
            f"Course: {data['title']}\n"
            f"Level: {data['level']}\n"
            f"Awarding Body: {data['awarding_body']}\n"
            f"Fee: {data['fee']}\n"
            f"Deposit: {data['deposit']}\n"
            f"Instalments: {data['instalments']}\n"
            f"Duration: {data['duration']}\n"
            f"Assessment: {data['assessment']}\n"
            f"Certificate: {data['certificate']}"
        )
        print(f"[*] get_course_info output: {info[:180]}...")
        return info
    finally:
        _TOOL_IN_PROGRESS = False
```

### 2. `search_website` (`agent/agent.py:319-333`)
- **Active For:** INBOUND calls only.
- **Timeout:** RAM cache lookup + fuzzy match (sub-millisecond).
- **Success Return:** Formatted course facts or overview string.
- **Failure Return:** Informational fallback string.
```python
@llm.function_tool(
    name="search_website",
    description="Look up course facts (fee, deposit, instalments, units) for a course not already in COURSE FACTS."
)
async def search_website(query: str) -> str:
    """Fetches verified course facts using fuzzy matching in wp_connector."""
    global _TOOL_IN_PROGRESS
    _TOOL_IN_PROGRESS = True
    try:
        print(f"[*] Tool called: search_website(query='{query}')")
        result = await wp_connector.get_live_site_data(query)
        print(f"[*] search_website output: {result[:180]}...")
        return result
    finally:
        _TOOL_IN_PROGRESS = False
```

### 3. `schedule_callback` (`agent/agent.py:480-534`)
- **Active For:** OUTBOUND and INBOUND calls.
- **Timeout:** HTTP sync timeout is 15.0s.
- **Success Return:** `"SUCCESS: Callback booked with Senior Admissions Advisor {ADVISOR_DISPLAY} for {scheduled_slot}. Confirm this exact day ({day_clean}) and UK time ({time_clean}) back to the caller in one warm sentence."`
- **Rejection Return:** `"NEED_DAY_AND_TIME: The caller has not explicitly stated both a day and a time in their own words. Do NOT say a callback is booked. Ask the caller which day and what UK time works best for them."`
- **Failure Return:** `"FAILED: Could not save the callback in the system right now. You MUST NOT say the callback is booked — tell the caller our advisor team will call back today to confirm."`
```python
    @llm.function_tool(
        name="schedule_callback",
        description=(
            "Book a callback with our Senior Admissions Advisor. May ONLY be called when the caller has "
            "explicitly said BOTH a specific day AND a specific time in their own words. Never invent or guess values."
        )
    )
    async def schedule_callback(preferred_day: str, preferred_time_uk: str, notes: str = "") -> str:
        global _TOOL_IN_PROGRESS
        _TOOL_IN_PROGRESS = True
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
                    "Do NOT say a callback is booked. Ask the caller which day and what UK time works best for them."
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
                    f"SUCCESS: Callback booked with Senior Admissions Advisor {ADVISOR_DISPLAY} for {scheduled_slot}. "
                    f"Confirm this exact day ({day_clean}) and UK time ({time_clean}) back to the caller in one warm sentence."
                )

            _bg_print(f"[!] schedule_callback save failed for {scheduled_slot} -> returning FAILED")
            return (
                "FAILED: Could not save the callback in the system right now. "
                "You MUST NOT say the callback is booked — tell the caller our advisor team will call back today to confirm."
            )
        finally:
            _TOOL_IN_PROGRESS = False
```

### 4. `mark_lead_disposition` (`agent/agent.py:535-552`)
- **Active For:** OUTBOUND and INBOUND calls.
- **Timeout:** HTTP sync timeout is 5.0s.
- **Success Return:** `"SUCCESS: Lead marked as {disposition}: {reason}."`
```python
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
```

---

## Section I. Course Data (Critical for P4)

### 1. Course Data Sources in Code
1. `wp_connector.get_course_details_from_db(query)` (`agent/wp_connector.py:622-761`):
   - **Used at Runtime:** YES. Primary data source for outbound prompt injection (`agent.py:214`) and `get_course_info` tool (`agent.py:299`).
   - **Precedence:** Highest (Precedence 1).
2. `VERIFIED_COURSES_CATALOG` (`agent/wp_connector.py:822-1049`):
   - **Used at Runtime:** YES, as fallback if MySQL query returns no match, and used by `search_website` tool for inbound calls.
   - **Precedence:** Secondary (Precedence 2).
3. `COURSE_KNOWLEDGE` (`agent/agent.py.bak:156-218`):
   - **Used at Runtime:** NO. Historical hardcoded dictionary in older backup files. Completely dead in current codebase.
4. `rag.py` / Qdrant (`agent/rag.py`):
   - **Used at Runtime:** Only seeds collection on startup; `search_knowledge_base` is never queried by the agent. Dead for answering queries.
5. `live_courses.py` (`agent/live_courses.py`):
   - **Used at Runtime:** NO. Imported on `agent.py:34`, but no function is ever invoked. Dead code.

### 2. Pricing Gating Logic — VERBATIM (`agent/wp_connector.py:1109-1131`)
```python
def format_matched_course(course: dict) -> str:
    """Formats a single matched course's facts concisely. Omits all prices if pricing_status is UNVERIFIED."""
    if course.get("pricing_status") != "VERIFIED":
        return (
            f"Course Facts for {course['title']}:\n"
            f"- Pricing Status: UNVERIFIED / NOT_SURE (Exact tuition fee, initial deposit, and monthly instalment amounts are NOT confirmed on screen right now. Do NOT state or guess any prices, fees, deposits, or monthly figures. Offer to have a Senior Admissions Advisor call back or transfer to confirm the official fee schedule.)\n"
            f"- Duration & Study Mode: {course['duration']}\n"
            f"- Assessment: {course['assessment']}\n"
            f"- Accreditation: {course['accreditation']}\n"
            f"- Core Units: {course['modules']}"
        )
    return (
        f"Verified Course Facts for {course['title']}:\n"
        f"- Pricing Status: VERIFIED\n"
        f"- Tuition Fee: {course['fee']}\n"
        f"- Initial Deposit: {course['deposit']}\n"
        f"- Official Instalment Plan: {course['instalments']}\n"
        f"- Duration & Study Mode: {course['duration']}\n"
        f"- Assessment: {course['assessment']}\n"
        f"- Accreditation: {course['accreditation']}\n"
        f"- Core Units: {course['modules']}\n"
        f"IMPORTANT: State ONLY the fee, deposit, and instalment plan listed above. If asked for any other payment plan (e.g. a 6-month plan not listed above), say that specific plan is not listed on screen and offer to have a Senior Admissions Advisor confirm."
    )
```

### 3. WordPress Database Connection Status
- **Test Command:** Executed `SELECT 1` via pymysql.
- **Connection Result:** **SUCCESS** (`Result: (1,)`).
- **Target Host/Database:** Host `localhost:3306`, Database `ilc_db`, User `root`.
- **Environment Variable Names Involved:**
  - `WP_DB_HOST` (Defaults to `127.0.0.1` / `localhost`)
  - `WP_DB_PORT` (Defaults to `3306`)
  - `WP_DB_USER` (Defaults to `root`)
  - `WP_DB_PASSWORD` or `WP_DB_PASS` (Optional database password)
  - `WP_DB_NAME` (Defaults to `ilc_db`)
  - `WP_TABLE_PREFIX` (Defaults to `twh_`)

### 4. Course Facts Received Today for "Qualifi Level 4 Diploma in Cyber Security"
- **Data Extracted from MySQL (`ilc_db`):**
  - Title: `"Qualifi Level 4 Diploma in Cyber Security"`
  - Level: `"RQF Level 4"`
  - Awarding Body: `"Qualifi Ltd."`
  - Certificate: `"Recognised hardcopy Certificate & Transcript included"`
  - Regular Fee: `£856`
  - Discounted Upfront Fee: `£629`
  - Initial Deposit: `£250`
  - Monthly Instalments: `£53.75 per month for 8 months` (or `£71.60 per month for 6 months`)
  - Duration: `6 Months - 12 Months, 100% online self-paced`
  - Assessment: `Assignments / Report Writing, zero exams`
  - Units: 4 core accredited units
- **Root Cause of Problem P4 (Why it previously could NOT answer fee and certification):**
  In Phase 2B/2C before WordPress DB integration, the agent matched the course against `VERIFIED_COURSES_CATALOG`, where `Qualifi Level 4 Diploma in Cyber Security` was hardcoded with `"pricing_status": "UNVERIFIED"`.
  The prompt instructed the agent:
  *"If Pricing Status is UNVERIFIED or NOT_SURE, NEVER state or guess any price, fee, deposit, or monthly instalment amount at all. Politely say the confirmed fee schedule for that course is not on your screen right now and offer to book a callback with a Senior Admissions Advisor to confirm."*
  Because the pricing was marked `UNVERIFIED` and the static dictionary lacked certificate details, the LLM was strictly forbidden by its own system instructions from stating the fee, and forced to offer an admissions advisor!

---

## Section J. Interruption, Silence and Audio (Critical for P1)

### 1. Code Paths That Can Stop or Cancel Agent Speech
1. **VAD-Triggered Interruption (`AgentSession` turn_handling):**
   - With `mode: "vad"` and `min_duration: 0.5`, if user-side audio activity exceeds 500ms while the agent is speaking, LiveKit immediately pauses audio output (`audio_output.pause()`).
   - If Deepgram STT transcribes background noise, cough, breathing, or keyboard tapping as 1 word (`min_words: 1`), LiveKit treats it as an interruption and calls `speech_handle.interrupt(source="user_turn")`.
   - The agent's current speech generation is immediately cancelled mid-sentence!
2. **False-Interruption Playout Freeze (`resume_false_interruption: True`):**
   - In `livekit/agents/voice/agent_activity.py:4878`, LiveKit calls `audio_output.pause()` the instant user speech is suspected.
   - If audio playback pause gets out of sync or the resume event fails to trigger before the speech handle finishes, the audio track stays muted, causing the agent to fall silent.
3. **Silence Watchdog (`agent/agent.py:791-829`):**
   - After the agent finishes speaking and enters `listening`, an 8-second timer starts. If no user speech is detected, it speaks `"Are you still there, {lead_name}?"`.
   - If silence persists for another 8 seconds, it says goodbye and terminates the call.
4. **Token Truncation in Groq Reasoning Models (`p_groq`):**
   - `openai/gpt-oss-20b` and `gpt-oss-120b` emit internal reasoning tokens. When `max_completion_tokens` was configured too low (e.g. 120–260), the model ran out of output tokens before generating the completion text, cutting off speech mid-sentence. (Raised to 350 tokens in Phase 3).

### 2. Frontend Audio Capture Settings — VERBATIM (`app/components/OutboundLeadsView.tsx:535-539, 587-591`)
```typescript
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
```
and:
```typescript
      audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
```
- **Can the agent's own voice be picked up by the browser mic?**
  **YES.** While WebRTC browser `echoCancellation: true` is enabled, acoustic echo cancellation running in laptop browsers (especially when using built-in speakers and laptop microphones at higher volumes) frequently leaks residual audio.
  Because the server-side VAD threshold is sensitive (`min_duration: 0.5`, `activation_threshold: 0.55`), speaker bleed that escapes browser echo cancellation triggers VAD activity on the worker, causing LiveKit to pause or interrupt the agent's own speech!

### 3. Custom TTS Text Cleaner — VERBATIM (`agent/agent.py:60-71`)
```python
async def custom_speech_cleaner(text):
    """Sanitizes text stream before TTS: converts currency, removes markdown & parenthetical notes."""
    async for chunk in text:
        # 1. Strip text inside parentheses like "(regular £330)"
        c = re.sub(r'\(.*?\)', '', chunk)
        # 2. Currency conversion: "£248" -> "248 pounds", "£60" -> "60 pounds"
        c = re.sub(r'£(\d+)', r'\1 pounds', c)
        # 3. Hyphenated replacements: "1-on-1" -> "one to one"
        c = re.sub(r'1-on-1', 'one to one', c, flags=re.IGNORECASE)
        # 4. Strip markdown asterisks, hashes, bullet points, dashes, backticks
        c = re.sub(r'[\*#•–—_`]', ' ', c)
        yield c
```
- **Can it swallow text when `(` arrives in one chunk and `)` in a later chunk?**
  - `re.sub(r'\(.*?\)', '', chunk)` operates **chunk-by-chunk on streamed chunks**.
  - If Chunk 1 is `"The regular fee is £856 ("`, there is no closing `)`. The regex `\(.*?\) does NOT match. Chunk 1 yields `"The regular fee is 856 pounds ("`.
  - If Chunk 2 is `"discounted to £629)"`, Chunk 2 has an unmatched `)`. The regex does NOT match. Chunk 2 yields `"discounted to 629 pounds)"`.
  - Result: The parenthesis characters are NOT stripped; Cartesia TTS pronounces open/close parentheses or stumbles on punctuation.
  - Furthermore, if a chunk contains `(all text here...` that spans multiple chunks, it fails to strip, but if an entire phrase is wrapped in parentheses within a single chunk, the whole phrase inside is stripped.

---

## Section K. Performance (Critical for P3)

### 1. Breakdown: Job Request Received → First Greeting Audio Playback
| Step | Function / Operation | Typical Duration |
|---|---|---|
| 1 | `ctx.connect(auto_subscribe=AUDIO_ONLY)` | 120ms – 250ms |
| 2 | `ctx.wait_for_participant()` | 50ms – 300ms |
| 3 | Room / Job metadata parsing | < 1ms |
| 4 | Background DB prewarm & call start dispatch | 0ms (non-blocking task) |
| 5 | Silero VAD model load | 0ms (preloaded in `prewarm()`) |
| 6 | EOU turn detector model load | 0ms (preloaded in `prewarm()`) |
| 7 | Deepgram STT class instantiation | < 5ms |
| 8 | LLM clients & FallbackAdapter setup | ~50ms (in thread) |
| 9 | Cartesia Sonic-3 TTS class instantiation | < 5ms |
| 10 | `AgentSession` construction | ~10ms – 20ms |
| 11 | `session.start(room=ctx.room, ...)` | 150ms – 300ms |
| 12 | `initial_greeting_timer` sleep | 50ms |
| 13 | Cartesia TTS TTFB for opening greeting | 250ms – 400ms |
| **Total** | **Job Request → First Greeting Audio Start** | **~0.9s – 1.4s (Target < 2.0s achieved)** |

### 2. Blocking / Synchronous Operations on Event Loop
1. `agent/agent.py:214`: `wp_connector.get_course_details_from_db(clean_q)` called synchronously inside `match_course_facts()` during `entrypoint` setup. If MySQL is cold, query takes 40–120ms synchronously before `session.start()`. Subsequent calls hit in-memory cache `< 0.1ms`.
2. `agent/agent.py:51-57`: `_bg_print` offloads console printing to `loop.run_in_executor(None, print, msg)` so Windows conhost stdout scrolling never blocks the asyncio event loop.
3. `agent/agent.py:1004-1005`: `audio_out.resume()` and `audio_out.clear_buffer()` run fast synchronous C-level buffer resets.

### 3. Next.js API Routes Called & Timeout Analysis
- **Routes Called:**
  - `POST /api/calls/outbound` (Call start record)
  - `POST /api/transcripts` (Per-turn transcript line dispatch)
  - `POST /api/callbacks` (Scheduled advisor callback persistence)
  - `PATCH /api/leads` (Lead disposition and score update)
  - `POST /api/recordings` (Audio file upload)
  - `PATCH /api/calls/{id}` (Call finalization)
- **Why Timeouts Appeared Previously:**
  Next.js was running in **development mode** (`next dev --webpack`). When an API route is invoked for the first time in dev mode, Next.js compiles the route and its Prisma dependencies on-the-fly, taking 3.0 to 6.0 seconds. The agent's HTTP client had a tight 2.5s–3.0s timeout, causing timeouts during route compilation.
- **Phase 3 Resolution:**
  1. `_prewarm_routes_sync()` (`orchestrator.py:87-98`) sends warmup requests to all Next.js API endpoints in a background thread right at call start to trigger route compilation before dialogue begins.
  2. `start_call()` and `log_transcript()` were converted to background fire-and-forget tasks (`asyncio.create_task`), completely isolating the audio loop from HTTP latency.

### 4. Process Options & Runtime Mode
- `num_idle_processes = 1` (`agent/agent.py:1105`)
- `log_level = "INFO"` (`agent/agent.py:1107`)
- Next.js is running in **development mode** (`next dev --webpack`). For production demo deployment, running `npm run build && npm run start` eliminates on-demand compilation delays entirely.

---

## Section L. Diagnostic Logging (Only if DIAG=1, Off by Default)

Diagnostic logging has been added across the agent lifecycle, strictly activated when the environment variable `DIAG=1` is present (`os.getenv("DIAG") == "1"`). By default, `DIAG` is not set, resulting in zero behavioral or console output changes.

### Git Diff for Diagnostic Logging
```diff
--- a/callcenter-dashboard/agent/agent.py
+++ b/callcenter-dashboard/agent/agent.py
@@ -139,6 +139,8 @@ class TrackedGroqLLM(groq.LLM):
         if tools and "tool_choice" not in kwargs:
             kwargs["tool_choice"] = "auto"
+        if os.getenv("DIAG") == "1":
+            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] chat_ctx sent to LLM ({self.model}): {len(chat_ctx.items)} items")
         stream = super().chat(chat_ctx=chat_ctx, tools=tools, conn_options=conn_options, **kwargs)
         return _wrap_stream_for_usage(stream, "Groq", self.model)
 
@@ -186,6 +188,8 @@ class SafeGeminiLLM(google.LLM):
             conn_options = dataclasses.replace(conn_options, timeout=new_timeout, max_retry=0)
         else:
             conn_options = APIConnectOptions(timeout=10.5, max_retry=0)
+        if os.getenv("DIAG") == "1":
+            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] chat_ctx sent to LLM ({self.model}): {len(clean_ctx.items)} items")
         stream = super().chat(chat_ctx=clean_ctx, tools=tools, conn_options=conn_options, **kwargs)
         return _wrap_stream_for_usage(stream, "Gemini", self.model)
 
@@ -835,6 +839,8 @@ async def entrypoint(ctx: JobContext):
     def on_agent_state_changed(ev):
         new_s = str(getattr(ev, "new_state", "")).lower()
         old_s = str(getattr(ev, "old_state", "")).lower()
+        if os.getenv("DIAG") == "1":
+            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] agent_state changed: {old_s} -> {new_s}")
         if new_s in ("thinking", "speaking", "initializing"):
             cancel_silence_watchdog()
         elif new_s == "listening" and old_s == "speaking":
@@ -843,6 +849,39 @@ async def entrypoint(ctx: JobContext):
     def on_user_state_changed(ev):
         nonlocal silence_stage
         new_s = str(getattr(ev, "new_state", "")).lower()
+        old_s = str(getattr(ev, "old_state", "")).lower()
+        if os.getenv("DIAG") == "1":
+            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] user_state changed: {old_s} -> {new_s}")
         if new_s == "speaking":
             silence_stage = 0
             cancel_silence_watchdog()
+
+    @session.on("agent_false_interruption")
+    def on_agent_false_interruption(ev):
+        if os.getenv("DIAG") == "1":
+            _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] interruption: false_interruption resumed={getattr(ev, 'resumed', False)}")
+
+    @session.on("speech_created")
+    def on_speech_created(ev):
+        if os.getenv("DIAG") == "1":
+            h = getattr(ev, "speech_handle", None)
+            if h:
+                sid = getattr(h, "id", "unknown")
+                t_speech_start = time.time()
+                _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] speech started: speech_id={sid} source={getattr(ev, 'source', '')} allow_interruptions={getattr(h, 'allow_interruptions', True)}")
+
+                def _diag_speech_done(_):
+                    dur = time.time() - t_speech_start
+                    interrupted = getattr(h, "interrupted", False)
+                    source = getattr(h, "_interrupt_source", "none") or "none"
+                    raw_items = getattr(h, "_chat_items", []) or []
+                    txt = "".join(str(getattr(it, "text_content", "") or getattr(it, "content", "") or "") for it in raw_items)
+                    words = len(txt.split())
+                    if interrupted:
+                        _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] speech cancelled: speech_id={sid} duration={dur:.2f}s trigger={source} words={words} text_len={len(txt)}")
+                    else:
+                        _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] speech finished: speech_id={sid} duration={dur:.2f}s words={words} text_len={len(txt)}")
+
+                callbacks = getattr(h, "_done_callbacks", None)
+                if isinstance(callbacks, set):
+                    callbacks.add(_diag_speech_done)
 
@@ -865,6 +904,8 @@ async def entrypoint(ctx: JobContext):
                 elapsed_start = t_greet_start - job_received_time
                 elapsed_done = t_greet_done - job_received_time
                 print(f"[GREETING METRICS] Received job request to first greeting audio start: {elapsed_start:.2f}s | Finished speaking: {elapsed_done:.2f}s (Target: < 2.0s)")
+                if os.getenv("DIAG") == "1":
+                    _bg_print(f"[DIAG {datetime.now(timezone.utc).isoformat()}] job request to first greeting audio: {elapsed_start:.2f}s (finished in {elapsed_done:.2f}s)")
                 _bg_print("[*] Initial greeting finished speaking successfully.")
                 arm_silence_watchdog()
```

---

## Section M. Known Issues

Below is the verified inventory of hardcoded placeholders, workarounds, dead code, and conflicting logic across the codebase:

1. **Hardcoded Advisor Name & Extension Placeholder:**
   - **Locations:**
     - `agent/agent.py:46-48`: `ADVISOR_NAME = os.getenv("ADVISOR_NAME", "Sarah Jenkins").strip() or "Sarah Jenkins"`, `ADVISOR_EXTENSION = "Ext 101"`.
     - `app/components/OutboundLeadsView.tsx:70, 202, 1032, 1115, 1290, 1430`: Hardcoded `"Sarah Jenkins"` and `"Ext 101"`.
     - `app/components/OutboundCallsView.tsx:57, 72, 73, 128, 169`: Hardcoded `"Sarah Jenkins"` and `"Ext 101"`.
     - `app/components/TeamPresenceView.tsx:46-50`: Hardcoded `"Sarah Jenkins"`, `"Ext 101"`.
     - `app/components/LeadsManagerView.tsx:1163`: Defaulting to `"Sarah Jenkins"`.
   - **Impact:** System assumes admissions advisor is always Sarah Jenkins on Extension 101 unless updated across multiple frontend files.

2. **Dead Module: `live_courses.py`:**
   - **Location:** `agent/agent.py:34`: `import live_courses`.
   - **Impact:** The module is imported into `agent.py` but never referenced anywhere in runtime logic. Superseded by `wp_connector.py`.

3. **Dead RAG Search Functionality:**
   - **Location:** `agent/agent.py:340`: `asyncio.create_task(asyncio.to_thread(rag.init_knowledge_base))`.
   - **Impact:** Background task initializes Qdrant vector database collection on call start, but `rag.search_knowledge_base` is never invoked in any tool or handler. Consumes startup resources without contributing to conversation answers.

4. **Streamed Parenthesis Flaw in `custom_speech_cleaner`:**
   - **Location:** `agent/agent.py:64`: `c = re.sub(r'\(.*?\)', '', chunk)`.
   - **Impact:** Performs regex replacement on individual streamed chunks. If an open parenthesis arrives in chunk $N$ and the close parenthesis in chunk $N+1$, the regex fails to match and literal parentheses are passed to Cartesia TTS.

5. **Synchronous Cold DB Query in `agent.py:214`:**
   - **Location:** `agent/agent.py:214`: `db_data = wp_connector.get_course_details_from_db(clean_q)`.
   - **Impact:** Called synchronously inside `match_course_facts()` on the event loop before `session.start()`. If MySQL connection is cold, this blocks the event loop for 40–120ms. Subsequent queries are protected by `_DB_COURSE_CACHE`.

6. **Microphone Echo Bleed Leading to VAD Interruption (P1 Root Cause):**
   - **Location:** `app/components/OutboundLeadsView.tsx:535-539` and `agent/agent.py:716-722`.
   - **Impact:** `mode: "vad"` with `min_duration: 0.5` causes any acoustic leakage from laptop speakers into laptop microphones to pause or abort agent speech mid-sentence.
