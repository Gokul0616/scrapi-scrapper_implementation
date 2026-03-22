# Scrapi Scalability Deep Analysis

## Executive verdict

**Short answer:** Scrapi cannot currently scale like Apify.

It has solid foundations for a scraping SaaS platform — FastAPI, MongoDB, Redis, Celery, Playwright, request queues, scheduling, datasets, key-value storage, billing/workspaces, and admin tooling. But the implementation is still much closer to an **early platform / strong MVP** than to an **Apify-class distributed actor execution platform**.

The codebase shows a partial migration toward better scale, but it is not yet operationally or architecturally mature enough to support Apify-like scale.

---

## What is already strong

### 1. Product/platform surface is real
- Main frontend includes actors, runs, datasets, marketplace/store, schedules, billing, access keys, settings, and organizations/workspaces.
- Admin console includes users, actors, runs, policies, audit logs, docs, dashboard metrics, and team/terminal controls.
- This is the correct general product direction for a scraping platform.

### 2. Background execution has moved beyond a pure monolith
- Runs now dispatch to Celery with plan-based queues.
- Redis is used as broker/backend.
- Docker Compose includes multiple worker roles and Flower.
- This is a meaningful improvement over a single-process async-only design.

### 3. Durable platform primitives exist
- Runs and datasets are persisted in MongoDB.
- Request queues are Redis-backed.
- Scheduling uses APScheduler with a Redis job store.
- Key-value storage can use S3 or GridFS.

### 4. Scraping engine quality is above basic MVP level
- Playwright-based browser automation.
- Stealth integration when available.
- Randomized user agents and anti-detection scripts.
- Shared browser pool abstraction.
- Proxy integration and retry logic.

---

## Why it is not Apify-scale today

## 1. Execution isolation is much weaker than Apify

Apify’s core advantage is not only that it runs scrapers, but that it runs them in **isolated, independently scalable execution units**.

Scrapi currently dispatches jobs into Celery workers, but the actual runtime still executes backend application code directly using shared services and a shared browser pool. That is much weaker than container-per-actor isolation.

### Key issue
The `Actor` model suggests support for custom actors, but the real run execution path only resolves built-in scrapers from the scraper registry by actor name. That means the platform does **not yet behave like a true arbitrary actor runtime**.

### Result
This is closer to a managed built-in scraper platform than to Apify’s tenant-isolated actor execution model.

---

## 2. The architecture is only partially migrated

This is one of the most important scaling risks in the repo.

### Good
- `create_run()` dispatches through Celery.

### Problem
- `run_schedule_now()` still launches work through the in-memory `TaskManager` using `asyncio.create_task`.
- So the system currently has **two execution models**: Celery for standard runs and in-process asyncio tasks for manual schedule runs.

### Why this matters
Mixed execution models create inconsistency in:
- failure handling,
- cancellation behavior,
- observability,
- durability,
- and horizontal scaling semantics.

A system in partial transition is usually not ready for very large-scale production workloads.

---

## 3. Worker orchestration is static, not elastic

Docker Compose defines fixed worker types and fixed concurrency values.

That gives Scrapi some horizontal capacity, but it is still far from Apify-style orchestration:
- no Kubernetes,
- no KEDA/HPA-style autoscaling,
- no queue-depth-based fleet control,
- no cluster-level resource packing,
- no scale-to-zero behavior,
- no cloud-native actor scheduler.

### Additional operational concern
The FastAPI app also tries to auto-start Redis and a Celery worker on startup. That may be convenient in local development, but it is not a good pattern for production-scale service separation.

---

## 4. Request queue exists, but is not yet Apify-grade

The Redis Streams request queue is a strong step in the right direction. It supports:
- deduplication,
- consumer groups,
- enqueue/fetch/ack,
- and simple queue metrics.

### Important limitations
- Deep crawl loop processes one request at a time (`limit=1`).
- Queue accounting is approximate.
- Acked messages are not removed from the stream.
- I do not see robust reclaim/retry logic for abandoned pending messages.
- It behaves more like a per-run helper queue than a mature distributed crawl substrate.

### Result
It can support durable deep-crawl functionality at modest scale, but not yet the type of large, resilient, high-throughput request-queue behavior associated with Apify.

---

## 5. Storage layer is functional but not optimized for very high throughput

### Datasets
Dataset items are inserted into MongoDB one-by-one inside the run execution flow. That is simple but becomes expensive at scale.

### Key-value store
The key-value store is a good feature and can use S3 or GridFS, but S3 access is done through synchronous `boto3` calls inside async code, which is not ideal for high concurrency.

### Missing higher-scale patterns
I do not see:
- bulk write optimization,
- partitioned datasets,
- streaming result export pipeline,
- dedicated data-plane separation,
- or CDN-style asset delivery patterns.

### Result
This is good enough for small-to-moderate scale, but not yet designed for Apify-class output volume.

---

## 6. Proxy infrastructure is much smaller than Apify’s needs

The proxy manager supports:
- active proxy retrieval,
- health checks,
- scoring by success rate and response time,
- random/best selection,
- free proxy ingestion,
- deactivation after repeated failures.

### Major gaps versus Apify-style proxy infra
- no session stickiness,
- no vendor abstraction layer,
- no geo-routing logic,
- no residential fleet orchestration,
- no domain-aware proxy policies,
- no large-scale provider failover control.

### Result
For modest workloads this can work. For large-scale scraping against difficult targets, proxy infrastructure becomes one of the first hard limits.

---

## 7. Observability is not mature enough for Apify-class operations

The repo includes `prometheus_client` and Flower is present in Compose. That is promising.

However, the codebase does not show strong operational instrumentation around:
- queue depth,
- worker saturation,
- browser memory,
- retry storms,
- domain-level failure patterns,
- proxy fleet health,
- or SLA/SLO-style metrics.

### Important distinction
The admin console dashboard provides business/admin metrics. That is useful, but it is **not** the same as deep distributed-systems observability.

### Result
Scrapi has admin visibility, but not yet the SRE-level telemetry needed for Apify-class scale.

---

## 8. Scheduling exists, but is not fully platform-grade

Scheduling has improved because the scheduler now uses Redis-backed persistence instead of only memory.

That said:
- the runtime path is still not fully unified,
- schedule-triggered manual runs still use the old task manager path,
- and the scheduling system is not yet clearly coupled to a single distributed execution model.

That makes it better than a simple MVP scheduler, but not yet a hardened cluster-scale scheduling subsystem.

---

## 9. Actor lifecycle is still incomplete

The `Actor` model includes metadata like:
- version,
- visibility,
- readme,
- tags,
- pricing,
- featured/verified state.

That gives the product an actor-based UI and marketplace feel.

### But Apify-like platforms also need
- actor builds,
- build logs,
- immutable runtime versions,
- actor env vars and secrets,
- resource quotas,
- rollback mechanisms,
- and isolated deployment artifacts.

Those do not appear as fully implemented first-class runtime systems in this repo.

### Result
Scrapi currently has **actor metadata** more than a fully mature **actor runtime platform**.

---

## 10. Internal documentation shows the project is still in transition

The repo contains internal analysis files that describe many of the same scaling limitations and roadmap items. Some of those docs are partly stale because Celery is now wired in, but the broad diagnosis still matches the codebase:
- Scrapi is moving in the right direction,
- but the migration is incomplete,
- and key platform subsystems are still maturing.

This transition state is itself a scale risk.

---

## Practical final assessment

## Can Scrapi scale at all?
**Yes.**

It can scale better than a simple monolithic scraper app because it now has:
- worker queues,
- Redis,
- Celery,
- request queues,
- scheduling,
- storage features,
- workspace concepts,
- billing/admin systems.

## Can it scale like Apify right now?
**No.**

Not yet in the strict sense of:
- distributed isolated actor runtime,
- massive durable crawl orchestration,
- elastic cloud autoscaling,
- hardened multi-tenant safety,
- large-scale proxy operations,
- production-grade request queue semantics,
- and deep observability.

## Best classification
- **Current state:** strong MVP / early scraping platform.
- **Safe near-term scale:** small-to-moderate workloads, especially for controlled built-in actors.
- **Not ready for:** Apify-scale multi-tenant actor ecosystem or very large crawler fleets.

---

## Top blockers to fix first

### Tier 1 — Must fix before serious scale claims
1. Unify all execution through Celery or one distributed execution path.
2. Add true execution isolation per actor/job.
3. Make the request queue production-grade with lease recovery and better throughput.
4. Add real observability and platform telemetry.

### Tier 2 — Needed for Apify-like capability
5. Add actor build/version/runtime lifecycle.
6. Add actor secret/environment variable management.
7. Enforce resource quotas at runtime.
8. Upgrade proxy infrastructure substantially.

### Tier 3 — Needed for Apify competitiveness
9. Move to elastic orchestration (Kubernetes/KEDA or equivalent).
10. Improve dataset/blob/export data plane.
11. Add workflow chaining, webhooks, and event-driven integrations.
12. Add tenant-safe custom code runtime.

---

## Final conclusion

Scrapi has the beginnings of a real scraping platform and is already beyond a toy project.

But if the comparison target is **Apify-level scalability**, the answer is still **no**.

The most accurate statement is:

> Scrapi has a promising platform foundation and some real distributed components, but it is still in a transition stage and is not yet a fully mature, isolated, elastic, observability-rich actor execution platform like Apify.
