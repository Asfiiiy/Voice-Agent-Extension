# AI Customer Support Call System — Production Architecture

## 1. High-Level Architecture

Internet / PSTN
        |
        v
Telephony Provider (Vonage or adapter)
        |
        | signed webhook + media
        v
+-----------------------------+
| Edge / Load Balancer        |
| TLS / WAF / rate limiting   |
+--------------+--------------+
               |
       +-------+--------+
       |                |
       v                v
 Go API :8080      WebRTC/LiveKit
       |                |
       |                v
       |          Realtime Media
       |                |
       +--------+-------+
                |
                v
       Realtime Orchestrator
                |
       +--------+---------+
       |        |         |
       v        v         v
      STT     RAG        LLM
       |        |         |
       |        v         |
       |    Qdrant/DB     |
       |                  |
       +--------+---------+
                |
                v
               TTS
                |
                v
        LiveKit/Telephony
                |
                v
             Customer

Async plane:
Go API -> Outbox -> Queue -> Workers -> PostgreSQL/Redis/Qdrant/Object Storage

Frontend:
React/TypeScript -> HTTPS :443 -> Go API :8080
React live updates <- SSE /v1/events/stream
