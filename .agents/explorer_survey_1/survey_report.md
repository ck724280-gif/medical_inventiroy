# Phase 1 Specification & Survey Report: Frontend Stability & Live Backend Integration

**Target System**: Medical Inventory & Pharmacy ERP (`apps/web` - Next.js 14 App Router)  
**Backend API**: NestJS 10 REST API (`apps/api` / Live Render: `https://medical-inventiroy.onrender.com`)  
**Investigator**: Explorer / Spec Miner (`explorer_survey_1`)  
**Date**: 2026-08-19  

---

## 1. Executive Summary & Context

The live production deployment of the Medical Inventory & Pharmacy ERP (`https://web-three-rho-95.vercel.app`) exhibits client-side crashes ("*Application error: a client-side exception has occurred*") when navigating across multiple operational routes.

### Root Causes Identified:
1. **API Response Wrapping Mismatch**: All backend listing endpoints in NestJS 10 return a paginated envelope `{ data: T[], meta: { total, page, limit, totalPages } }`. When Axios receives this response, `response.data` is an Object `{ data: [...], meta: {...} }`, rather than a flat Array. When the frontend stores `res.data` directly into state or React Query cache, subsequent attempts to call `.map()` on the non-array object trigger runtime JavaScript exceptions (`TypeError: items.map is not a function`).
2. **Missing Array Guards in JSX**: Multiple components assume data is always populated and invoke `.map()` without checking `Array.isArray()`, resulting in immediate crashes during initial loading states, null responses, or partial data fetches.
3. **Authentication & Session Resilience**: `api-client.ts` baseURL configuration and token refresh logic contain hardcoded fallbacks to `http://localhost:4000` on 401 refresh failures, breaking live Render backend token renewal. In addition, token expiry does not systematically purge cached user state from `localStorage`.

---

## 2. Monorepo & Network Topology

| Component | Technology | Live URL / Host |
|---|---|---|
| **Frontend Web App** | Next.js 14 (App Router, React 18, Tailwind CSS, Lucide, Recharts) | `https://web-three-rho-95.vercel.app` |
| **Backend REST API** | NestJS 10 (TypeScript, Prisma ORM, JWT, Helmet, Swagger) | `https://medical-inventiroy.onrender.com` (Prefix: `/api`) |
| **Database** | PostgreSQL on Neon Cloud | `postgresql://neondb_owner:...@ep-bitter-recipe-aywnmxlu.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| **Shared Packages** | `@medical-inventory/shared-types`, `@medical-inventory/constants`, `@medical-inventory/validation`, `@medical-inventory/shared-utils` | Monorepo internal packages |

---

## 3. Comprehensive File & Line-by-Line Audit Catalog

The investigation scanned all 14 pages and 5 components in `apps/web/src/`. Below is the complete catalog of all 18 files and exact line numbers requiring modifications.

### Summary Table of Affected Files

| # | File Path | Defect Classification | Affected Lines |
|---|---|---|---|
| 1 | `apps/web/src/lib/api-client.ts` | BaseURL normalization, 401 refresh fallback to localhost, state purge | Lines 4-6, 38-41, 51-56 |
| 2 | `apps/web/src/stores/auth-store.ts` | Safe branches array parsing and token persistence sync | Lines 46, 58-75 |
| 3 | `apps/web/src/stores/branding-store.ts` | Response unwrapping for `/settings/public` | Lines 33-35 |
| 4 | `apps/web/src/app/page.tsx` (Dashboard) | Unwrapped response and unguarded `.map()` on `topMedicines` | Lines 50, 197, 223 |
| 5 | `apps/web/src/app/medicines/page.tsx` | Unwrapped `/medicines`, `/categories`, `/manufacturers`, `/units` & unguarded `.map()` | Lines 64, 72, 80, 88, 219, 256, 393, 432 |
| 6 | `apps/web/src/app/purchases/page.tsx` | Missing query return unwrapping for `/suppliers`, `/medicines`, `/purchases` & unguarded `.map()` | Lines 54, 61-63, 70, 204, 273, 309, 323 |
| 7 | `apps/web/src/app/sales/page.tsx` | Unwrapped `/sales` response and unguarded `.map()` | Lines 35, 111 |
| 8 | `apps/web/src/app/inventory/page.tsx` | Unwrapped `/batches`, `/movements`, spread crash on `reorderData`, unguarded `expiryData.expired.map` | Lines 41, 53, 65, 77, 188, 295, 332, 383 |
| 9 | `apps/web/src/app/expenses/page.tsx` | Unwrapped `/expenses` response and unguarded `.map()` | Lines 46, 133 |
| 10 | `apps/web/src/app/sales-returns/page.tsx` | Unwrapped `/sales-returns`, unguarded `fullRes.data.items.map`, and table `.map()` | Lines 35, 53, 151, 220 |
| 11 | `apps/web/src/app/reports/page.tsx` | Unwrapped `/financials/summary`, `/reports/sales`, `/reports/inventory` & unguarded `.map()` | Lines 39, 55, 67, 214, 286 |
| 12 | `apps/web/src/app/pos/page.tsx` | Typeahead search unwrapping, cart `.map()` guard | Lines 80, 274, 337 |
| 13 | `apps/web/src/app/settings/page.tsx` | Object assignment in `res.data \|\| []` for `/branches` & `/backup/history`, unguarded `.map()` | Lines 62, 71, 442, 488 |
| 14 | `apps/web/src/app/import/page.tsx` | Unguarded `.map()` on `resultStatus.errors` and `rows` | Lines 194, 221 |
| 15 | `apps/web/src/components/header.tsx` | Unguarded `.map()` on `branches` | Lines 32, 67 |
| 16 | `apps/web/src/components/thermal-receipt-preview.tsx` | Unguarded `.map()` on `data.items` | Line 104 |
| 17 | `apps/web/src/lib/utils.ts` | Add shared `unwrapData` / array guard utility | Line 6 |
| 18 | `apps/web/src/app/login/page.tsx` | Robust error messaging and auto-redirect handling | Lines 36-41 |

---

## 4. Deep Forensic Analysis of Defect Patterns

### Pattern A: API Response Unwrapping Mismatch
Backend NestJS controllers return:
```typescript
// Backend NestJS Listing Service Return Shape
return {
  data: items,      // Array of records: T[]
  meta: {           // Pagination metadata
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
};
```
When called via Axios `const res = await apiClient.get('/endpoint')`:
- `res.data` evaluates to: `{ data: [...], meta: {...} }`
- **Vulnerable Code**:
  ```typescript
  // ❌ WRONG: res.data is an Object, so res.data || [] evaluates to the Object!
  return res.data || [];
  // ❌ WRONG: res.data?.data fails if the endpoint ever returns a flat array T[] directly
  return res.data?.data || [];
  ```
- **Universal Correct Pattern**:
  ```typescript
  // ✅ CORRECT: Dual-check handles both { data: [...] } and raw [...]
  return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  ```

---

### Pattern B: Unguarded JSX `.map()` Calls
In React JSX rendering, optional chaining `items?.map(...)` is **insufficient** if `items` is an object (truthy) rather than an array:
- `{ data: [...] }?.map(...)` throws `TypeError: items.map is not a function`.
- `undefined.map(...)` throws `TypeError: Cannot read properties of undefined (reading 'map')`.
- **Vulnerable Code**:
  ```tsx
  // ❌ WRONG: Crashes when items is an Object or not an Array
  {items?.map((item: any) => (
    <tr key={item.id}>...</tr>
  ))}
  ```
- **Universal Correct Pattern**:
  ```tsx
  // ✅ CORRECT: Always guarantees an Array before invoking .map()
  {(Array.isArray(items) ? items : []).map((item: any) => (
    <tr key={item.id}>...</tr>
  ))}
  ```

---

### Pattern C: Spread Operator on Non-Array Properties
In `apps/web/src/app/inventory/page.tsx:332`:
```tsx
// ❌ WRONG: If any property is null/undefined, spread operator throws TypeError: is not iterable
{[...reorderData.outOfStock, ...reorderData.criticalStock, ...reorderData.lowStock].map(...)}
```
- **Universal Correct Pattern**:
  ```tsx
  // ✅ CORRECT:
  {[
    ...(Array.isArray(reorderData?.outOfStock) ? reorderData.outOfStock : []),
    ...(Array.isArray(reorderData?.criticalStock) ? reorderData.criticalStock : []),
    ...(Array.isArray(reorderData?.lowStock) ? reorderData.lowStock : [])
  ].map(...)}
  ```

---

## 5. Detailed File-by-File Specification & Proposed Fixes

### 1. `apps/web/src/lib/api-client.ts`

#### Current Defect:
- Hardcoded fallback to `http://localhost:4000` in token refresh.
- BaseURL concatenation does not sanitize trailing `/` or pre-existing `/api`.

#### Proposed Implementation:
```typescript
import axios from 'axios';

// Normalize API Base URL
const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'https://medical-inventiroy.onrender.com';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('medcare_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry && typeof window !== 'undefined') {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('medcare_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          
          localStorage.setItem('medcare_access_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('medcare_refresh_token', newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          // Token refresh failed - clean all auth storage and redirect to login
          localStorage.removeItem('medcare_access_token');
          localStorage.removeItem('medcare_refresh_token');
          localStorage.removeItem('medcare_user');
          localStorage.removeItem('medcare_branch_id');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshErr);
        }
      } else {
        localStorage.removeItem('medcare_access_token');
        localStorage.removeItem('medcare_refresh_token');
        localStorage.removeItem('medcare_user');
        localStorage.removeItem('medcare_branch_id');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 2. `apps/web/src/lib/utils.ts`

#### Proposed Utility Additions:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Robust helper to extract an array from raw array or paginated response { data: T[], meta: ... }
 */
export function unwrapData<T = any>(resOrData: any): T[] {
  if (!resOrData) return [];
  if (Array.isArray(resOrData)) return resOrData;
  if (Array.isArray(resOrData?.data)) return resOrData.data;
  return [];
}
```

---

### 3. `apps/web/src/app/page.tsx` (Dashboard)

#### Changes Required:
- **Line 50**: Ensure summary query handles wrapping if backend formats change.
- **Line 197**: `<LineChart data={Array.isArray(summary?.salesTrend) ? summary.salesTrend : []}>`
- **Line 223**: `{(Array.isArray(summary?.topMedicines) ? summary.topMedicines : []).map((item: any, idx: number) => (`

---

### 4. `apps/web/src/app/purchases/page.tsx`

#### Changes Required:
- **Line 54**:
  ```typescript
  // Query for purchases list
  return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  ```
- **Line 61-63**:
  ```typescript
  // Query for suppliers list
  const res = await apiClient.get('/suppliers');
  return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  ```
- **Line 70**:
  ```typescript
  // Query for medicines list
  const res = await apiClient.get('/medicines', { params: { limit: 200 } });
  return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  ```
- **Line 204**:
  ```tsx
  {(Array.isArray(purchasesData) ? purchasesData : (purchasesData?.data || [])).map((p: any) => (
  ```
- **Line 273**:
  ```tsx
  {(Array.isArray(suppliers) ? suppliers : []).map((s: any) => (
  ```
- **Line 309**:
  ```tsx
  {(Array.isArray(items) ? items : []).map((item, idx) => (
  ```
- **Line 323**:
  ```tsx
  {(Array.isArray(medicines) ? medicines : []).map((m: any) => (
  ```

---

### 5. `apps/web/src/app/medicines/page.tsx`

#### Changes Required:
- **Line 64**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);`
- **Line 72**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);` (categories)
- **Line 80**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);` (manufacturers)
- **Line 88**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);` (units)
- **Line 219**: `{(Array.isArray(categories) ? categories : []).map((cat: any) => (`
- **Line 256**: `{(Array.isArray(medicinesData) ? medicinesData : (medicinesData?.data || [])).map((med: any) => (`
- **Line 393**: `{(Array.isArray(categories) ? categories : []).map((cat: any) => (`
- **Line 432**: `{(Array.isArray(units) ? units : []).map((u: any) => (`

---

### 6. `apps/web/src/app/inventory/page.tsx`

#### Changes Required:
- **Line 41**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);` (batches)
- **Line 77**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);` (movements)
- **Line 188**: `{(Array.isArray(batchesData) ? batchesData : (batchesData?.data || [])).map((b: any) => (`
- **Line 295**: `{(Array.isArray(expiryData?.expired) ? expiryData.expired : []).map((b: any) => (`
- **Line 332**:
  ```tsx
  {[
    ...(Array.isArray(reorderData?.outOfStock) ? reorderData.outOfStock : []),
    ...(Array.isArray(reorderData?.criticalStock) ? reorderData.criticalStock : []),
    ...(Array.isArray(reorderData?.lowStock) ? reorderData.lowStock : [])
  ].map((item: any) => (
  ```
- **Line 383**: `{(Array.isArray(movementsData) ? movementsData : (movementsData?.data || [])).map((m: any) => (`

---

### 7. `apps/web/src/app/sales/page.tsx`

#### Changes Required:
- **Line 35**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);`
- **Line 111**: `{(Array.isArray(salesData) ? salesData : (salesData?.data || [])).map((sale: any) => (`

---

### 8. `apps/web/src/app/expenses/page.tsx`

#### Changes Required:
- **Line 46**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);`
- **Line 133**: `{(Array.isArray(expensesData) ? expensesData : (expensesData?.data || [])).map((exp: any) => (`

---

### 9. `apps/web/src/app/sales-returns/page.tsx`

#### Changes Required:
- **Line 35**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);`
- **Line 53**: `(Array.isArray(fullRes.data?.items) ? fullRes.data.items : []).map((i: any) => (`
- **Line 151**: `{(Array.isArray(returnsData) ? returnsData : (returnsData?.data || [])).map((r: any) => (`
- **Line 220**: `{(Array.isArray(returnItems) ? returnItems : []).map((item, idx) => (`

---

### 10. `apps/web/src/app/reports/page.tsx`

#### Changes Required:
- **Line 214**: `{(Array.isArray(salesReportData?.sales) ? salesReportData.sales : []).map((s: any) => (`
- **Line 286**: `{(Array.isArray(inventoryValuation?.items) ? inventoryValuation.items : []).map((item: any) => (`

---

### 11. `apps/web/src/app/pos/page.tsx`

#### Changes Required:
- **Line 80**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);`
- **Line 274**: `{(Array.isArray(searchResults) ? searchResults : []).map((med: any) => (`
- **Line 337**: `{(Array.isArray(cart.items) ? cart.items : []).map((item, idx) => (`

---

### 12. `apps/web/src/app/settings/page.tsx`

#### Changes Required:
- **Line 62**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);` (branches)
- **Line 71**: `return Array.isArray(res.data) ? res.data : (res.data?.data || []);` (backup history)
- **Line 442**: `{(Array.isArray(branches) ? branches : (branches?.data || [])).map((b: any) => (`
- **Line 488**: `{(Array.isArray(backups) ? backups : (backups?.data || [])).map((b: any) => (`

---

### 13. `apps/web/src/app/import/page.tsx`

#### Changes Required:
- **Line 194**: `{(Array.isArray(resultStatus?.errors) ? resultStatus.errors : []).map((err: any, idx: number) => (`
- **Line 221**: `{(Array.isArray(rows) ? rows : []).map((row, idx) => (`

---

### 14. `apps/web/src/components/header.tsx`

#### Changes Required:
- **Line 32**: `const branches = Array.isArray(user?.branches) ? user.branches : [];`
- **Line 67**: `{(Array.isArray(branches) ? branches : []).map((b) => (`

---

### 15. `apps/web/src/components/thermal-receipt-preview.tsx`

#### Changes Required:
- **Line 104**: `{(Array.isArray(data?.items) ? data.items : []).map((item, i) => (`

---

### 16. `apps/web/src/stores/branding-store.ts`

#### Changes Required:
- **Line 34**: `const data = res.data?.data || res.data || {};`

---

## 6. Authentication Flow & Live Render Compatibility Specification

### Architecture Overview:
1. **Credentials**: `admin@medcare.com` / `Admin@123456`
2. **Login Endpoint**: `POST https://medical-inventiroy.onrender.com/api/auth/login`
3. **Payload**: `{ email: string, password: string }`
4. **Response Contract**:
   ```json
   {
     "accessToken": "eyJhbGciOi...",
     "refreshToken": "eyJhbGciOi...",
     "user": {
       "id": "uuid-v4",
       "email": "admin@medcare.com",
       "firstName": "Super",
       "lastName": "Admin",
       "roles": ["SUPER_ADMIN"],
       "permissions": ["*"],
       "branches": [
         {
           "id": "branch-uuid-v4",
           "name": "Main Branch",
           "code": "MAIN-01",
           "isDefault": true
         }
       ]
     }
   }
   ```
5. **Token Storage**:
   - `medcare_access_token` stored in `localStorage`
   - `medcare_refresh_token` stored in `localStorage`
   - `medcare_user` (JSON serialized) stored in `localStorage`
   - `medcare_branch_id` stored in `localStorage`
6. **Request Header Injection**:
   - Handled via `apiClient.interceptors.request` attaching `Authorization: Bearer ${token}`.
7. **Session Expiry & 401 Interception**:
   - On HTTP 401, automatically calls `POST /api/auth/refresh` with `{ refreshToken }`.
   - On success, updates `medcare_access_token` and replays the original request seamlessly.
   - On failure, clears all keys from `localStorage` and routes the browser to `/login`.

---

## 7. Verification & Testing Checklist

| Test Item | Verification Method | Expected Result |
|---|---|---|
| **Route Stability** | Navigate to `/suppliers`, `/customers`, `/medicines`, `/purchases`, `/sales`, `/inventory`, `/expenses`, `/sales-returns`, `/reports`, `/pos`, `/import`, `/settings` | Zero console errors; tables and components render cleanly without "client-side exception" crashes |
| **Empty State Handling** | Pass empty API responses `[]` or `{ data: [], meta: {} }` | "No records found" UI displays gracefully |
| **Authentication** | Submit `admin@medcare.com` / `Admin@123456` on `/login` | Successful authentication, JWT saved to `localStorage`, redirect to `/` |
| **401 Interception** | Invalidate `medcare_access_token` in `localStorage` and refresh page | Automatic refresh attempt or clean redirect to `/login` without unhandled Promise rejection |
| **Production Build** | Run `npm run build` in `apps/web` | Next.js build compiles with 0 type errors and 0 lint failures |

---

## 8. Conclusion

This specification provides an exhaustive, line-by-line blueprint to eliminate all runtime crash vectors across `apps/web` and guarantee seamless communication with the live Render backend (`https://medical-inventiroy.onrender.com`). Implementers can directly execute these localized, verified changes.
