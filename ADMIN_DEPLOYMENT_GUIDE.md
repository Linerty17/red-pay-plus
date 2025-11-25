# RedPay Admin Panel - Deployment Guide

## 🎯 Admin Console URL

**Production Admin URL**: `https://redpay2026.netlify.app/admin/referrals`

Alternative admin routes:
- `/admin/referrals` - Referral management
- `/admin/payments` - Payment review and verification
- `/admin/push-notifications` - Push notification campaigns

## 🔐 Admin Account Credentials

**Email**: sundaychinemerem66@gmail.com  
**Password**: Chinemerem18$  
**Username**: admin

### First Time Setup

1. Navigate to: https://redpay2026.netlify.app
2. Click "Sign Up" (if not already registered)
3. Use the admin email above
4. The system will automatically assign admin role to this email
5. After signup, navigate to `/admin/referrals` to access admin panel

## 🗄️ Database Connection

The admin panel is connected to **the same production Lovable Cloud database** as the main app. All tables are shared:

- `users` - User profiles and balances
- `referrals` - Referral records with status tracking
- `transactions` - All financial transactions
- `rpc_purchases` - RPC payment attempts
- `audit_logs` - Admin action logging
- `push_subscriptions` - FCM tokens for push
- `push_notifications` - Push campaigns
- `push_notification_logs` - Delivery tracking
- `push_campaigns` - Campaign metadata

**Database URL**: tneqdznpappgpepkelav.supabase.co (Lovable Cloud)

## 🔧 Environment Variables Required

The following secrets must be configured in Lovable Cloud settings:

### Critical for Push Notifications

```
FCM_SERVER_KEY - Firebase Cloud Messaging server key (required for push)
FCM_PROJECT_ID - Firebase project ID
```

**To get FCM credentials:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Create or select your project
3. Go to Project Settings → Cloud Messaging
4. Copy the Server Key and Project ID
5. Add as secrets in Lovable Cloud

### Already Configured

```
SUPABASE_URL - Auto-configured by Lovable Cloud
SUPABASE_ANON_KEY - Auto-configured
SUPABASE_SERVICE_ROLE_KEY - Auto-configured (server-side only)
```

## 📡 API Endpoints Added

### Public Endpoints (No Auth Required)

- `POST /functions/v1/confirm-referral-activation`
  - Body: `{ newUserId: string, amount?: number }`
  - Confirms referral after user activation
  - Calls atomic `confirm_referral()` DB function

### Admin Endpoints (Require Admin Auth)

- `POST /functions/v1/manual-credit-referral`
  - Body: `{ referralId: string, notes: string }`
  - Manually credits a pending referral
  
- `POST /functions/v1/admin-send-push`
  - Body: `{ title, body, targetType, targetCriteria, imageUrl?, ctaUrl?, dataPayload? }`
  - Sends push notifications via FCM
  
- `POST /functions/v1/admin-repair-referrals`
  - Body: `{ action: 'repair', dryRun: boolean }`
  - Finds and fixes duplicate/incorrect referrals

## 🔐 Server-Side Referral Transaction (SQL)

The atomic referral confirmation is implemented as a PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION public.confirm_referral(
  _new_user_id TEXT,
  _amount INTEGER DEFAULT 5000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
```

**Key Features:**
- Atomic transaction with row-level locking (`FOR UPDATE`)
- Prevents duplicate credits via unique index on `new_user_id`
- Updates referrer balance and count in single transaction
- Creates transaction record and audit log
- Returns success/failure status

**Flow:**
1. Lock pending referral for `new_user_id`
2. Lock referrer's user record
3. Update referral status to 'confirmed'
4. Increment referrer's balance and referral_count
5. Create transaction record
6. Create audit log entry
7. Commit or rollback as single unit

## 🚀 Admin Panel Features

### 1. Referral Management (`/admin/referrals`)

**Table Columns:**
- Referrer Name & ID
- Referrer Email
- New User Name & ID
- New User Email
- Amount (₦)
- Status (confirmed/pending/manual/rejected)
- Date Created
- Confirmed Date
- Notes

**Filters:**
- All referrals
- Confirmed (auto-credited)
- Pending (awaiting activation)
- Manual (admin-credited)
- Rejected (duplicates/invalid)

**Actions:**
- Manual Credit - Add ₦5,000 to referrer with audit notes
- Export CSV - Download filtered results
- Impersonate User - View app as that user

**Stats Dashboard:**
- Total referrals count
- Total earnings distributed
- Pending credits count
- Credits today

### 2. Payment Review (`/admin/payments`)

**Features:**
- View uploaded receipt images
- Payment details (account, payer name, bank, amount)
- Approve/Reject with notes
- Approving triggers referral confirmation if applicable

**Table Columns:**
- User Name & ID
- Email
- Phone
- Amount
- Account Number
- Proof Image (preview)
- Date
- Verification Status
- Admin Actions

### 3. Push Notifications (`/admin/push-notifications`)

**Compose:**
- Title (required)
- Body (required)
- CTA URL (optional)
- Image URL (optional)
- Data Payload (JSON)

**Targeting:**
- All users
- By country
- By referral count (e.g., ≥5 referrals)
- Single user (test)
- Custom segment

**Templates Provided:**
1. Referral Credited - "You earned ₦5,000!"
2. Welcome - "Welcome to RedPay"
3. Payment Reminder - "Complete activation"
4. System Update - "Maintenance notice"

**Features:**
- Test send to single device
- Preview notification
- Schedule for later
- View delivery logs (sent/delivered/failed)
- Analytics (click-through rates)

**Logs:**
- Per-user delivery status
- Error messages
- Timestamps (sent, delivered, clicked)

### 4. Audit Logging

All admin actions are logged to `audit_logs`:
- Manual credits
- User impersonation
- Push campaigns sent
- Payment approvals/rejections
- Referral repairs

**Log Fields:**
- Admin user ID
- Action type
- Timestamp
- Details (JSON metadata)

## 🛠️ Repair & Cleanup Script

**Endpoint:** `POST /admin-repair-referrals`

**Features:**
1. Find duplicate referrals (same `new_user_id`)
2. Verify `referral_count` matches confirmed referrals
3. Fix mismatched earnings
4. Mark duplicates as 'rejected'

**Usage:**
```javascript
// Dry run (preview only)
POST /admin-repair-referrals
{ "action": "repair", "dryRun": true }

// Execute repairs
POST /admin-repair-referrals
{ "action": "repair", "dryRun": false }
```

**Returns:**
```json
{
  "success": true,
  "dryRun": false,
  "results": {
    "duplicatesFound": [...],
    "earningsFixed": [...]
  },
  "summary": {
    "duplicates": 5,
    "earningsMismatches": 2
  }
}
```

## ✅ Verification Tests

### Test 1: Referral Flow
1. Create new user with `?ref=REF794833`
2. Complete activation/payment
3. Call `confirm-referral-activation` with `newUserId`
4. **Expected:**
   - Referral status → 'confirmed'
   - Referrer's `referral_count` +1
   - Referrer's `balance` +5000
   - Transaction record created
   - Audit log entry added

### Test 2: Duplicate Prevention
1. Try to create two referrals for same `new_user_id`
2. **Expected:**
   - Database rejects second (unique index violation)
   - Or server handles gracefully with error message

### Test 3: Manual Credit
1. Admin logs in
2. Navigate to `/admin/referrals`
3. Find pending referral
4. Click "Credit" and add notes
5. **Expected:**
   - Referral status → 'manual'
   - Referrer's balance updated
   - Audit log created with admin ID and notes

### Test 4: Push Notification
1. Admin composes test push
2. Selects "Single user" target
3. Sends test
4. **Expected:**
   - Campaign created in `push_campaigns`
   - FCM API called with token
   - Delivery logged in `push_notification_logs`
   - User receives notification on device

### Test 5: Role Protection
1. Regular user tries to access `/admin/referrals`
2. **Expected:**
   - Redirect to login or 403 Forbidden
   - `useAdminAuth` hook blocks access

### Test 6: Repair Script
1. Run with `dryRun: true`
2. **Expected:**
   - Returns list of issues found
   - No data modified
3. Run with `dryRun: false`
4. **Expected:**
   - Duplicates marked 'rejected'
   - Counts corrected
   - Audit logs created

## 🔒 Security Measures

1. **Row-Level Security (RLS):**
   - All tables have RLS policies
   - Admin role required for admin tables
   - Users can only see their own data

2. **Server-Side Validation:**
   - All referral credits happen in database functions
   - Client cannot modify balances directly
   - Edge functions verify admin role before actions

3. **Audit Trail:**
   - Every admin action logged
   - Cannot be deleted by admins
   - Includes timestamp, admin ID, and action details

4. **Password Security:**
   - ⚠️ **Warning:** Leaked password protection currently disabled
   - Recommend enabling in Supabase Auth settings
   - See: https://supabase.com/docs/guides/auth/password-security

## 📊 Admin Quick Reference

### How to Manually Credit a Referral

1. Log in to admin panel
2. Go to `/admin/referrals`
3. Filter for "Pending"
4. Find the referral to credit
5. Click "Credit" button
6. Enter notes explaining why (required)
7. Click "Credit ₦5,000"
8. System updates balance, count, and creates audit log

### How to Send Push Notification

1. Go to `/admin/push-notifications`
2. Click "Compose" tab
3. Fill in title and body
4. Select targeting (All, Country, Segment, Single)
5. Optional: Add CTA URL or image
6. Click "Preview" to see how it looks
7. Click "Send Test" to test on your device first
8. Click "Send to [X] users" when ready
9. View "Logs" tab to track delivery

### How to Export Referrals CSV

1. Go to `/admin/referrals`
2. Apply filters if needed (e.g., "Pending only")
3. Click "Export CSV" button
4. File downloads with columns:
   - Date, Referrer, New User, Amount, Status, Notes

### How to Impersonate User

1. Find user in referrals or payments table
2. Click "Impersonate" icon (user icon)
3. Redirected to dashboard as that user
4. Action logged in audit trail
5. Use for debugging user issues

### How to Review Payments

1. Go to `/admin/payments`
2. Click receipt image to view full size
3. Verify details match receipt
4. Click "Approve" if valid
5. System triggers referral confirmation if applicable
6. Or click "Reject" with reason

## 🚨 Troubleshooting

### Push Notifications Not Sending

**Issue:** Campaign created but delivery logs show "failed"

**Solution:**
1. Check `FCM_SERVER_KEY` is set in secrets
2. Check `FCM_PROJECT_ID` is set
3. Verify FCM key is valid in Firebase Console
4. Check user has valid `fcm_token` in `push_subscriptions`

### Admin Can't Access Panel

**Issue:** Redirected to login or 403 error

**Solution:**
1. Verify user email is `sundaychinemerem66@gmail.com`
2. Check `user_roles` table has entry with `role='admin'`
3. If missing, add role:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('[auth_user_id]', 'admin');
   ```

### Referrals Not Crediting

**Issue:** New users signing up but referrer not getting credit

**Solution:**
1. Check `referrals` table for pending record
2. Ensure `new_user_id` is unique (no duplicates)
3. Call `confirm-referral-activation` after user activation:
   ```javascript
   POST /confirm-referral-activation
   { "newUserId": "USR-123456" }
   ```
4. Check audit logs for errors

### Duplicate Referrals

**Issue:** Same user credited multiple times

**Solution:**
1. Run repair script in dry-run mode:
   ```javascript
   POST /admin-repair-referrals
   { "action": "repair", "dryRun": true }
   ```
2. Review duplicates found
3. Run with `dryRun: false` to fix
4. Unique index prevents future duplicates

## 📝 Notes

- **Logo:** Upload your RedPay logo to `src/assets/redpay-admin-logo.png`
- **Separate Admin Site:** To deploy admin on subdomain (e.g., admin-redpay2026.netlify.app), configure Netlify redirect rules
- **Database Backups:** Lovable Cloud handles automatic backups
- **Admin Access:** Only email `sundaychinemerem66@gmail.com` has admin role by default
- **Referral Amount:** Default ₦5,000 per referral, configurable in `confirm_referral()` function

## 🔗 Important Links

- **Admin Panel:** https://redpay2026.netlify.app/admin/referrals
- **Firebase Console:** https://console.firebase.google.com
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **FCM Docs:** https://firebase.google.com/docs/cloud-messaging

---

**Last Updated:** 2025-01-25  
**Database:** Lovable Cloud (tneqdznpappgpepkelav)  
**Admin Email:** sundaychinemerem66@gmail.com
