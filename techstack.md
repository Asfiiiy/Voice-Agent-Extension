# AI Customer Support Call System — Technology Stack

## 1. Backend

### Go + Chi
Primary responsibilities:
- REST API
- authentication
- authorization
- tenant isolation
- webhook ingestion
- call state machine
- routing
- provider registry
- SSE gateway
- job enqueueing
- audit logging
- configuration management

Suggested libraries/components:
- chi router
- pgx
- sqlc or equivalent typed SQL layer
- go-redis
- OpenTelemetry Go
- structured logging such as slog
- JWT/session library as appropriate
- UUID/ULID library
- validator where appropriate

Go should own business-critical durable state transitions.

## 2. AI Backend

### Python + FastAPI
Responsibilities:
- RAG orchestration
- embeddings
- reranking
- LLM adapter calls
- prompt assembly
- conversation intelligence
- STT/TTS adapters when Python SDKs materially improve integration
- AI evaluation
- model routing

Python must remain behind an authenticated internal API.

Do not expose FastAPI directly to the public Internet.

## 3. Frontend

### React + TypeScript
Responsibilities:
- dashboard
- call monitoring
- configuration
- knowledge management
- provider settings
- user/RBAC administration
- audit screens

Recommended:
- React
- TypeScript
- Vite or Next.js depending SEO/server-rendering needs
- TanStack Query
- React Hook Form
- Zod
- native EventSource/SSE client
- WebRTC APIs where browser media is required

Avoid storing sensitive credentials or provider secrets in browser state.

## 4. Realtime

### LiveKit
Use for:
- realtime rooms
- WebRTC media
- audio track transport
- browser agent console
- realtime media orchestration

Use a SIP/telephony integration or media gateway where the telephony provider requires it.

WebRTC:
- Opus where supported internally
- telephony codecs such as G.711 at the PSTN boundary when required
- server-side transcoding only when necessary

Noise control:
- WebRTC audio processing
- VAD
- echo cancellation
- noise suppression
- automatic gain control where appropriate

Avoid duplicate noise processing that adds latency or distorts speech.

## 5. Telephony

Design an adapter interface rather than hard-coding Vonage.

Interface examples:
- create/accept call
- transfer call
- hangup
- play audio
- stream media
- receive DTMF
- receive call events
- recording control

Candidate providers can include Vonage or another SIP/telephony provider depending country, number availability, pricing and media capabilities.

Provider-specific functionality must remain inside adapters.

## 6. STT

Use a streaming STT provider supporting:
- realtime partials
- final transcripts
- endpointing
- language selection
- confidence
- WebSocket/streaming transport

Keep provider interface:
StartSession()
SendAudio()
ReceivePartial()
ReceiveFinal()
Close()

Provider selection must be dynamic.

## 7. LLM

Use an adapter:
Generate()
GenerateStream()
Health()
Models()

Configuration:
- provider
- model
- temperature
- max output tokens
- timeout
- priority
- weight
- concurrency
- retry policy

For production support, prefer deterministic/low-temperature responses for factual workflows and use structured outputs wherever possible.

## 8. TTS

Use streaming TTS with:
- low time-to-first-audio
- voice selection
- language
- speed
- interruption/cancel
- audio format selection

ElevenLabs or another provider can be plugged in through the TTS adapter.

Do not hard-code a single voice provider.

## 9. RAG

Recommended:
- PostgreSQL for document metadata
- object storage for originals
- Qdrant for vectors
- embedding provider/model
- optional reranker

Pipeline:
document
-> validation
-> extraction
-> normalization
-> chunking
-> embedding
-> Qdrant
-> retrieval
-> reranking
-> evidence packet
-> LLM

Every vector record should contain:
tenant_id
knowledge_base_id
document_id
document_version
chunk_id
published
access_scope

The retrieval service must require tenant context.

## 10. PostgreSQL

Use PostgreSQL for:
- users
- tenants
- calls
- call state
- configuration
- prompts
- provider allocation
- audit
- jobs
- usage
- metadata

Recommended:
- pgx for Go
- sqlc for typed queries
- PgBouncer
- migration tool such as goose or migrate

Indexes should begin with tenant_id for tenant-scoped high-volume tables where appropriate.

## 11. Redis

Use for:
- rate limiting
- distributed locks
- cache
- provider concurrency
- realtime fanout
- ephemeral call/session state
- queues if using Redis-based queue technology

Recommended TTLs for ephemeral keys.
Avoid indefinite data retention.

## 12. Queue

Production options:
- Redis Streams
- NATS JetStream
- RabbitMQ
- Kafka at very high event volume

For the first production architecture, Redis Streams or NATS JetStream can keep the platform simpler while retaining explicit consumer/ack semantics.

The application must not depend on a queue being exactly-once. Consumers must be idempotent.

## 13. Object Storage

S3-compatible:
- AWS S3
- MinIO for self-hosted environments
- another S3-compatible provider

Store:
- recordings
- original knowledge documents
- exports
- generated reports

Use:
- encryption
- private buckets
- lifecycle policies
- signed URLs
- object versioning where appropriate

## 14. Security

Authentication:
- Argon2id
- secure sessions/access tokens
- refresh rotation
- MFA for privileged accounts

Authorization:
- RBAC
- tenant isolation
- object-level checks
- explicit permission middleware

Secrets:
- production secret manager
- encrypted provider credentials
- never expose provider API keys to React

## 15. Observability

OpenTelemetry:
- Go
- Python
- frontend where useful

Metrics:
Prometheus

Dashboards:
Grafana

Errors:
Sentry or equivalent

Logs:
structured JSON

Trace every call through:
telephony -> API -> realtime -> STT -> RAG -> LLM -> TTS -> worker.

## 16. Containers

Every component is Dockerized.

Recommended images:
- edge
- web
- api
- realtime
- ai
- worker
- scheduler
- postgres
- pgbouncer
- redis
- qdrant
- livekit
- minio
- otel
- prometheus
- grafana

Use:
- minimal base images
- non-root users
- read-only filesystem where practical
- dropped Linux capabilities
- pinned dependencies
- vulnerability scanning
- SBOM generation

## 17. CI/CD

Pipeline:
1. lint
2. unit tests
3. type checks
4. integration tests
5. migration test
6. security scan
7. container build
8. image scan
9. SBOM
10. staging deploy
11. smoke tests
12. production approval
13. rolling deployment
14. post-deploy health checks

Never deploy a database migration that cannot coexist with the previous application version during rolling deployment.

## 18. API Versioning

Use:
/v1/...

Breaking API changes use:
 /v2/...

Internal service contracts should also be versioned.

## 19. Configuration Management

Separate:
- application config
- tenant config
- provider config
- secret values

Dynamic provider settings:
Provider -> Capability -> Model/Voice -> Allocation Policy.

Example:
LLM:
provider A / model X / priority 10 / weight 70%
provider B / model Y / priority 20 / weight 30%

STT:
provider A -> model
provider B -> fallback

TTS:
provider A -> voice
provider B -> fallback voice

Telephony:
provider A -> primary DID
provider B -> failover DID

The actual selection engine must verify health, quota and concurrency before allocation.

## 20. Recommended Initial Repository Structure

backend/
  cmd/api/
  cmd/realtime/
  cmd/worker/
  internal/auth/
  internal/rbac/
  internal/tenant/
  internal/calls/
  internal/routing/
  internal/providers/
  internal/webhooks/
  internal/sse/
  internal/audit/
  internal/db/
  internal/queue/
  internal/outbox/
  internal/observability/

ai/
  app/
    api/
    rag/
    llm/
    stt/
    tts/
    conversation/
    providers/
    policies/
    evaluation/

frontend/
  src/
    features/
      calls/
      dashboard/
      knowledge/
      providers/
      users/
      settings/
      audit/
    api/
    auth/
    components/
    hooks/
    sse/

infra/
  docker/
  compose/
  k8s/
  migrations/
  observability/

## 21. Critical Engineering Rules

1. Never trust tenant_id from the browser.
2. Never expose provider secrets to frontend.
3. Never hold DB locks while waiting for external APIs.
4. Never use process-local mutexes for distributed correctness.
5. Never treat Redis cache as the only durable state.
6. Never allow unpublished RAG chunks into production retrieval.
7. Never retry an external side effect without understanding idempotency.
8. Never assume webhook ordering.
9. Never assume provider availability.
10. Never let partial transcript events overwrite final transcript state.
11. Never let an AI answer bypass a human-routing policy.
12. Never make recordings public.
13. Never log raw credentials or unrestricted sensitive audio/transcripts.
14. Never deploy without migration rollback/forward-compatibility planning.
15. Every production call must be traceable by call_id and trace_id.
