# Diwan Event Platform: The Absolute Technical Reference & SaaS Blueprint

## 1. Executive Summary & SaaS Architecture
**Diwan Event Platform** is a multi-tenant SaaS ecosystem tailored for orchestrating high-profile events. It handles registration, payment gateways, live polling, and real-time attendance tracking.
*   **Backend:** Python 3.10+ / FastAPI (Asynchronous Framework)
*   **Frontend:** React (Vite) with Context API for state management.
*   **Database:** PostgreSQL 15+ (Relational with JSONB for dynamic schema).
*   **Real-time:** WebSockets for live dashboard updates and check-in notifications.

---

## 2. Platform Services & Functional Modules

### 2.1 Dynamic Registration System
Allows organizers to build custom registration forms.
*   **Engine:** Relies on `CustomFieldDefinition` to define fields (Text, Number, Date, Select) dynamically.
*   **Data Storage:** Responses are stored in the `custom_values` JSONB column of the `participants` table, allowing schema-less flexibility while maintaining relational integrity.

### 2.2 Attendance & Access Control (Check-in Engine)
*   **QR Code Generation:** Each participant receives a high-entropy `qr_code` (e.g., `DIWAN-DWN-123456`).
*   **Logging:** The `check_in` endpoint logs every scan into the `attendance` table with precise timestamps (`check_in_time`) and method (`qr_scan`, `walk_in`).
*   **Offline Sync:** Supports syncing offline check-ins from hardware devices via the `/sync` endpoint.

### 2.3 Interactive Engagement & Public Displays
*   **Polls:** Admins create polls; attendees vote. Votes are logged in `poll_votes` and results broadcasted instantly.
*   **Social Wall:** Attendees can post messages to a social wall (`social_wall` table), which admins can approve/pin.
*   **Live Screens:** React components listen to WebSocket `scene_change` events to seamlessly switch between Sponsors, Agenda, Polls, and the Social Wall on large venue screens.

### 2.4 Credential Generation (Badges)
*   **Badge Engine:** Uses Python's `reportlab` to draw text and QR codes onto a PDF canvas dynamically based on participant data.
*   **Batch Export:** Supports generating a single PDF with all participant badges for mass printing.

---

## 3. Database Architecture (The Relational DNA)

### 3.1 Tenant & Security Models
*   **`users`**: Manages organizers and admins (`id`, `email`, `hashed_password`, `role`).
*   **`organizations`**: Enables multi-tenancy grouping.
*   **`audit_logs`**: Tracks sensitive actions (`action`, `resource_type`, `user_id`, `ip_address`).

### 3.2 Event & Configuration Models
*   **`event_settings`**: The core configuration. 
    *   *Keys:* `registration_enabled`, `require_payment`, `ticket_price`, `currency`.
    *   *Branding:* `primary_color`, `secondary_color`, `logo_url`.
    *   *Dynamic Labels:* `org_label_1` through `org_label_4`.

### 3.3 Participant Data Models
*   **`participants`**: Core attendee data.
    *   *Fields:* `full_name`, `email`, `council`, `court`, `phone_number`.
    *   *Tracking:* `order_num`, `qr_code`, `payment_status`.
    *   *Dynamic:* `custom_values` (JSONB).
*   **`attendance`**: Granular tracking.
    *   *Fields:* `participant_id`, `event_type`, `check_in_time`, `entry_method`.

---

## 4. API Endpoints & Core Logic Flows

### 4.1 Data Sanitization & Import (`DataSanitizer`)
When participants are imported via Excel or self-registered:
1.  **Normalization:** `DataSanitizer.sanitize_name` strips diacritics and unifies Arabic characters (أ، إ، آ -> ا).
2.  **Phone Formatting:** `normalize_phone` enforces E.164 formats based on country codes.
3.  **Deduplication:** Queries the DB for exact matches on `(event_id, email)` or `(event_id, phone_number)` to prevent duplicate entries, flagging suspicious ones (`is_flagged`).

### 4.2 Key Endpoints
*   **`POST /api/v1/participants/public/register`**: Public entry point. Validates event status, sanitizes input, generates `order_num`, and adds a BackgroundTask for ticket emails.
*   **`PATCH /api/v1/participants/{id}/check-in`**: Validates RBAC (`checkin:operate`), updates `payment_status` to paid, creates an `Attendance` record, checks attendance milestones, and broadcasts a WebSocket notification.
*   **`GET /api/v1/analytics/{id}/summary`**: Aggregates total attendees, actual check-ins (from the `attendance` table), and distribution by `council`.

---

## 5. Real-Time Infrastructure (WebSockets)
*   **`ConnectionManager` (`app/core/websockets.py`)**: 
    *   Maintains an in-memory dictionary `active_connections: Dict[int, List[tuple]]` mapping `event_id` to active WebSocket connections and their roles.
    *   **Broadcast Mechanism:** `broadcast_to_event(event_id, message)` iterates through connected sockets to push real-time JSON payloads.
*   **Use Cases:**
    *   Live check-in counters updating on the dashboard.
    *   Triggering scene changes on Public Display screens.
    *   Live updates of Poll results.

---

## 6. Payment Processing & Gateways
The platform supports automated payment verification via webhooks.
*   **`POST /payments/create-session`**: Generates a checkout URL dynamically via Stripe or Chargily based on the event's configuration.
*   **Webhook Security (`/webhook/chargily` & `/webhook/stripe`)**:
    *   **Signature Verification:** Crucial for preventing spoofed payments.
    *   Chargily uses HMAC-SHA256 (`hmac.new(SECRET, payload, hashlib.sha256).hexdigest()`) compared against the `signature` header.
    *   Stripe uses `stripe.Webhook.construct_event`.
    *   Upon successful validation, the participant's `payment_status` is updated to `paid`.

---

## 7. Security Governance & Multi-Tenancy

### 7.1 Role-Based Access Control (RBAC)
*   **Implementation:** Custom dependency `require_permission("permission_code")`.
*   **Logic:** Decodes the JWT, fetches the user's role, and checks the `roles_permissions` mapping before allowing access to an endpoint. Roles include `super_admin`, `organizer`, `scanner`, and `viewer`.

### 7.2 Tenant Isolation
*   **Logical Segregation:** There are no cross-event queries. Every data access query enforces `.filter(Model.event_id == requested_event_id)`.
*   **Ownership Check:** The system verifies that the `current_user` actually owns the requested `event_id` before returning sensitive lists (e.g., in `/api/v1/participants/`).

### 7.3 Data Protection
*   **SQL Injection Prevention:** 100% reliance on SQLAlchemy ORM parametrization.
*   **XSS Protection:** React DOM automatically escapes rendered variables.
*   **Rate Limiting:** `slowapi` protects public endpoints (like `/register`) from brute force and DoS attacks.

---

## 8. Deployment Strategy & Scale Roadmap
*   **Current Stack:** Nginx Reverse Proxy -> Uvicorn Workers -> PostgreSQL.
*   **Future Scale (SaaS):**
    1.  **Redis Integration:** Move the WebSocket `ConnectionManager` from in-memory to Redis Pub/Sub to allow horizontal scaling of backend nodes.
    2.  **S3 / Cloud Storage:** Migrate static assets (logos, badges) to object storage for CDN distribution.
    3.  **Background Workers:** Utilize Celery + Redis for heavy PDF generation and mass email dispatching to prevent API blocking.
