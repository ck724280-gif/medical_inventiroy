# 🏥 Module Documentation: System Health & Diagnostics (`/super-admin/system-health`)

---

## 🎯 1. Overview & Business Purpose
The **System Health & Diagnostics** module monitors cloud database connectivity, server memory and CPU utilization, API latency, background task execution, and automated backup generation.

---

## 🩺 2. Live Diagnostics

1. **PostgreSQL Database Status**:
   - Connection pool status and query latency.
2. **API Uptime & Performance**:
   - NestJS server process health and response times.
3. **Backup Status**:
   - Timestamp and file size of last automated database snapshot.

---

## 📡 3. Backend Endpoints

* `GET /api/health`: Live health-check ping.
* `GET /api/system/metrics`: Memory, uptime, and database pool metrics.
