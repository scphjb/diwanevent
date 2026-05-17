# TODO: Making Developer Hub Functional 🚀

This list outlines the necessary steps to transition the Developer Hub from its current localized UI state to a fully functional production system.

## 1. Backend Development (FastAPI)
- [ ] **Create Developer Router**: Implement `app/routers/developer.py` to handle all developer-related endpoints.
- [ ] **API Key CRUD**:
    - [ ] `GET /api/v1/developer/keys`: Fetch keys owned by the current organizer.
    - [ ] `POST /api/v1/developer/keys`: Generate new `dw_...` tokens and save them securely.
    - [ ] `DELETE /api/v1/developer/keys/{id}`: Revoke/Delete a key.
- [ ] **Webhook Management**:
    - [ ] `GET /api/v1/developer/webhooks`: List active subscriptions.
    - [ ] `POST /api/v1/developer/webhooks`: Register a new callback URL.
    - [ ] `DELETE /api/v1/developer/webhooks/{id}`: Unsubscribe.
- [ ] **Webhook Dispatcher**: Implement a background service (e.g., using Celery or FastAPI BackgroundTasks) to send POST requests to registered URLs when events like `participant.checkin` occur.
- [ ] **Usage Analytics**: Create an endpoint to aggregate API request logs into time-series data for the dashboard charts.

## 2. Frontend Integration (React)
- [ ] **API Service Layer**: Add methods to `dashboard/src/services/api.js` for the new developer endpoints.
- [ ] **ApiKeysManager Integration**:
    - [ ] Fetch real keys on component mount.
    - [ ] Implement "Create New Key" modal with real backend response.
    - [ ] Implement "Revoke Key" confirmation flow.
- [ ] **WebhooksManager Integration**:
    - [ ] Fetch active webhooks and display real status/success rates.
    - [ ] Connect the "Add Endpoint" button to the backend.
- [ ] **UsageMonitor Integration**:
    - [ ] Fetch live traffic data and populate the AreaChart.
- [ ] **Playground Integration**:
    - [ ] Update the "Run Request" button to actually hit the backend and display the real response.

## 3. Security & Validation
- [ ] **API Key Middleware**: Implement a FastAPI dependency to validate `X-Diwan-API-Key` headers for external requests.
- [ ] **Rate Limiting**: Apply strict rate limits to API keys based on their assigned tier.
- [ ] **Scope Enforcement**: Ensure keys can only perform actions allowed by their `scopes` (e.g., read-only vs. write).

---
*Note: The UI/UX and Localization are already 100% complete.*
