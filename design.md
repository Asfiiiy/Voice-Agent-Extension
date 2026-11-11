# AI Customer Support Call System — Detailed Product and Engineering Design

## 1. Product Definition

The application is an AI-assisted inbound customer support platform. Its primary operating mode is:

Customer calls a business number -> telephony provider receives call -> routing policy checks human availability -> if no human is available and AI coverage is enabled, AI answers -> realtime speech pipeline processes the call -> strict enterprise RAG supplies factual context -> LLM decides response -> TTS speaks response -> customer can interrupt -> AI continues -> call is recorded/transcribed according to policy -> post-call workers create summary, disposition and analytics.

The system is designed as an extensible platform rather than a provider-specific application.

## 2. Design Principles

1. Telephony is an adapter.
2. LLM/STT/TTS are adapters.
3. Business logic never depends directly on a vendor SDK.
4. Realtime audio path is isolated from slow background work.
5. Database is the source of truth for durable state.
6. Redis is acceleration/coordination, not the only source of truth.
7. RAG is a controlled knowledge subsystem, not a general web-search mechanism.
8. Configuration changes are versioned and auditable.
9. Every tenant-owned object is authorization-scoped.
10. Every external event is assumed to be duplicated, delayed or reordered.
11. Every external dependency can fail.
12. Production behavior is observable.

## 3. User Roles

### Platform administrator
Manages tenants, global provider pools, platform health and system policies.

### Organization owner/admin
Manages organization users, phone numbers, AI behavior, knowledge, providers and routing.

### Supervisor
Views calls, transcripts, recordings according to permissions, live dashboard and agent availability.

### Agent
Views assigned calls and may take over/escalate calls.

### Auditor
Read-only access to permitted audit/call records.

### Read-only
Operational visibility without modification rights.

## 4. Main Screens

### Dashboard
- active calls
- AI answered calls
- human answered calls
- waiting/escalated calls
- provider health
- average answer latency
- active AI sessions
- errors

### Live Calls
- call ID
- caller identifier
- duration
- state
- assigned agent/AI
- live transcript
- confidence/RAG status
- escalation control

### Call Details
- timeline
- participants
- transcript
- recording
- summary
- disposition
- knowledge sources used
- model/provider used
- latency breakdown
- audit history

### AI Configuration
- personality
- system policy
- greeting
- language
- escalation rules
- prohibited topics
- response limits
- interruption behavior

### Knowledge
- knowledge bases
- documents
- versions
- publish state
- chunk count
- embedding/index state
- test retrieval

### Provider Settings
Separate sections:
- Telephony
- LLM
- STT
- TTS
- LiveKit/realtime

Each provider has:
enabled, priority, weight, concurrency, RPM/TPM limits, timeout, retry policy, health state, credentials reference, supported models/voices.

### Routing
- business hours
- agent availability rules
- AI coverage
- queue timeout
- escalation
- holiday schedules
- department routing

### Security
- users
- roles
- sessions
- API keys
- audit logs
- MFA
- retention

## 5. Call State Machine

CALL_RECEIVED
-> ROUTING
-> HUMAN_RINGING OR AI_STARTING
-> CONNECTED
-> ACTIVE
-> ESCALATING
-> HUMAN_CONNECTED
-> ENDING
-> COMPLETED

Failure states:
ROUTING_FAILED
AI_START_FAILED
PROVIDER_DEGRADED
RECORDING_FAILED
TRANSCRIPTION_FAILED

A state transition must be atomic and version checked.

Example:
UPDATE calls
SET status = 'AI_STARTING', version = version + 1
WHERE id = $1 AND status = 'ROUTING' AND version = $2;

If affected rows = 0, reload state and do not repeat the transition blindly.

## 6. Realtime Conversation Loop

Audio In
-> preprocessing/VAD/noise suppression
-> STT stream
-> partial transcript
-> endpoint detection
-> final user utterance
-> conversation policy
-> strict RAG
-> LLM streaming
-> sentence/phrase segmentation
-> TTS streaming
-> audio out

Barge-in:
- detect user speech while TTS is playing;
- stop/cancel TTS stream;
- preserve already committed conversation state;
- continue STT;
- do not create duplicate assistant messages.

## 7. Conversation Orchestrator

The orchestrator owns:
- current call state
- current turn
- interruption state
- provider allocation
- tool/action authorization
- RAG context
- response policy
- escalation decision

It should not contain provider-specific code.

Interfaces:
TelephonyProvider
MediaProvider
STTProvider
LLMProvider
TTSProvider
EmbeddingProvider
VectorStore
RecordingStore

Concrete adapters implement those interfaces.

## 8. Strict RAG Decision Policy

For each user question:
1. classify whether knowledge retrieval is required;
2. retrieve from published tenant knowledge;
3. apply metadata filters;
4. rerank if configured;
5. calculate retrieval confidence;
6. if evidence is insufficient, ask a clarification or escalate;
7. otherwise provide an answer grounded only in approved evidence.

The LLM receives:
- system policy
- personality
- conversation summary
- recent turns
- retrieved evidence
- explicit output constraints.

It does not receive arbitrary hidden database fields.

Actions such as refunds, cancellations, account changes or bookings must use explicit authorized tools, not free-form model instructions.

## 9. Provider Allocation

Use a provider registry and allocation engine.

Example data:
provider_allocations:
- capability: llm/stt/tts/telephony
- provider_id
- model_or_voice
- priority
- weight
- enabled
- max_concurrency
- timeout_ms
- retryable
- circuit_state

Selection:
eligible -> quota check -> concurrency reservation -> weighted choice -> request -> release reservation.

Redis can maintain a fast concurrency counter, but durable usage must be written to the database asynchronously/transactionally.

## 10. Configuration Versioning

Every important configuration has:
id
tenant_id
version
status
created_by
created_at
updated_at

Publication is atomic.

Frontend sends:
version: 17

Backend updates:
WHERE id = ? AND version = 17

On mismatch:
409 Conflict
with current version information.

This prevents one administrator from overwriting another administrator's changes.

## 11. Idempotency

Client operations that create external side effects support:
Idempotency-Key header.

Store:
tenant_id + actor_id + idempotency_key + endpoint + request_hash + response.

Webhook events use:
provider + provider_event_id

Unique constraint prevents duplicate processing.

The handler acknowledges already-processed events without repeating side effects.

## 12. Queue Design

Queues:
- call.finalize
- transcript.finalize
- summary.generate
- analytics.process
- recording.process
- knowledge.ingest
- embedding.generate
- notification.send
- provider.healthcheck
- retention.delete

Workers:
- bounded concurrency
- exponential backoff
- jitter
- dead-letter queue
- visibility/lease timeout
- graceful shutdown
- heartbeat for long jobs

A worker must make jobs idempotent because jobs can be delivered more than once.

## 13. Database Design

PostgreSQL:
- primary durable store
- read replicas later if needed
- PgBouncer for connection pooling
- application pool limits
- statement timeouts
- transaction timeouts
- indexes on tenant_id and high-cardinality lookup keys

Do not hold DB transactions while waiting for LLM/STT/TTS/telephony network responses.

## 14. Redis Design

Redis is used for:
- rate limits
- distributed locks
- session/cache
- provider concurrency
- event fanout
- short-lived call state
- queue infrastructure if selected

Keys must be namespaced:
tenant:{tenant_id}:...
call:{call_id}:...
provider:{provider_id}:...

Do not put unrestricted sensitive transcripts into Redis unless there is a documented reason and TTL.

## 15. SSE Design

GET /v1/events/stream

On connection:
1. authenticate;
2. resolve tenant and permissions;
3. subscribe only to authorized tenant channels;
4. send heartbeat;
5. send event IDs;
6. support Last-Event-ID for reconnect;
7. close stale connections.

Event examples:
call.created
call.status_changed
transcript.final
call.escalated
provider.status_changed
job.failed

For very high fanout, use Redis Streams/pubsub behind an SSE gateway.

## 16. Failure Handling

Telephony provider unavailable:
- reject gracefully or use configured secondary provider.

STT unavailable:
- attempt configured fallback;
- if unavailable, play controlled fallback message and escalate.

LLM unavailable:
- fallback model/provider;
- if all unavailable, transfer/escalate or provide a predefined safe response.

TTS unavailable:
- fallback voice/provider;
- if all unavailable, escalate.

RAG unavailable:
- do not fabricate knowledge-based answers;
- use configured safe response/escalation.

Database unavailable:
- do not pretend durable state was committed.

Redis unavailable:
- features that require Redis must degrade safely; never bypass authorization because cache is unavailable.

## 17. Rate Limiting

Layers:
1. edge/IP
2. authenticated user
3. tenant
4. endpoint
5. provider
6. call/session
7. AI token budget

Use token bucket/sliding window in Redis.

Return 429 with Retry-After where appropriate.

Provider limits must be separate from API limits.

## 18. Security Design

### Authentication
- Argon2id passwords
- short-lived access token/session
- rotating refresh tokens
- secure cookies when web session is used
- MFA for privileged roles
- session revocation

### Authorization
Every request:
principal -> organization membership -> permission -> object tenant -> object permission.

Never:
GET /calls/{id} -> query only by id.

Instead:
SELECT ... FROM calls WHERE id = $1 AND tenant_id = $tenant_from_auth;

### IDOR
All object IDs are treated as untrusted.
Cross-tenant tests are mandatory.

### Webhooks
- signature validation
- timestamp window
- nonce/event ID replay protection
- raw-body validation before JSON mutation where required by provider

## 19. Recording and Privacy

Recording starts only when policy allows.
Consent messaging is configurable by jurisdiction/business policy.
Recordings use encrypted object storage.
Application database stores metadata, not giant binary blobs.

Deletion:
- mark deletion request
- revoke access
- asynchronous object deletion
- delete DB metadata when retention policy requires
- record audit event.

## 20. Observability

Every call receives:
call_id
conversation_id
trace_id

Latency spans:
telephony ingress
routing
STT first partial
STT final
RAG retrieval
LLM first token
LLM complete
TTS first audio
TTS complete
call termination

Metrics:
active_calls
ai_calls
human_calls
provider_errors
provider_latency
stt_latency
llm_latency
tts_latency
rag_no_evidence
escalations
queue_depth
worker_failures
db_pool_usage
redis_latency
sse_connections

## 21. Production Readiness Checklist

- provider adapters tested
- failover tested
- duplicate events tested
- race conditions tested
- authorization tested
- RAG isolation tested
- backups tested
- restore tested
- retention tested
- secret rotation tested
- load tested
- alerting configured
- dashboards configured
- runbooks written
- disaster recovery procedure documented
