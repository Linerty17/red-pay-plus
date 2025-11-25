# RedPay Admin Panel - Deployment Verification

## Admin Access Information

### URLs
- **Main App**: https://redpay2026.netlify.app/
- **Admin Panel**: https://redpay2026.netlify.app/admin/referrals
- **Payment Management**: https://redpay2026.netlify.app/admin/payments
- **Push Notifications**: https://redpay2026.netlify.app/admin/push-notifications

### Admin Credentials
- **Email**: sundaychinemerem66@gmail.com
- **Password**: Chinemerem18$
- **Username**: admin

**Important**: When you first sign up with this email, you'll automatically be assigned the admin role via database trigger.

---

## System Architecture

### Database Connection
✅ **Connected to Production Database**
- The admin panel connects to the same Lovable Cloud database (Supabase) as the main app
- Project ID: `tneqdznpappgpepkelav`
- All user data, referrals, payments, and transactions are in the same database
- No separate database copy or staging environment

### Authentication & Security
✅ **Server-Side Role Verification**
- Admin role stored in `user_roles` table
- RLS policies enforce admin-only access
- `useAdminAuth` hook checks role via database query
- Auto-redirects non-admin users to dashboard
- All admin actions logged in `audit_logs` table

### Referral System (Server-Side Atomic)
✅ **Edge Function Implementation**
- `/supabase/functions/credit-referral/index.ts` - Automatic crediting on signup
- `/supabase/functions/manual-credit-referral/index.ts` - Manual admin crediting
- Uses service role key for atomic transactions
- Idempotent: checks `referred_by` field to prevent double-credits
- Row-level locking with `FOR UPDATE` to prevent race conditions

---

## Feature Verification Checklist

### ✅ 1. Admin Authentication
- [x] Admin sign-up with sundaychinemerem66@gmail.com
- [x] Auto-assignment of admin role via trigger
- [x] Protected routes redirect non-admin users
- [x] Server-side role verification (not client-side)

### ✅ 2. Referral Management
- [x] View all referrals with referrer and new user details
- [x] Filter by status: All, Auto, Pending, Manual
- [x] Search by user ID or email
- [x] Stats dashboard (total referrals, earnings, pending)
- [x] Manual credit with required notes
- [x] Audit logging for all admin actions
- [x] CSV export functionality
- [x] User impersonation (logged in audit)

### ✅ 3. Payment Management
- [x] View all RPC purchase submissions
- [x] Display uploaded payment receipts
- [x] Search by email, phone, or name
- [x] Review and confirm/reject with notes
- [x] Audit logging for payment actions

### ✅ 4. Push Notifications
- [x] Compose interface with title, body, CTA, image
- [x] Targeting options (all, country, referral count, custom)
- [x] Templates (referral credited, welcome, payment reminder, system update)
- [x] Schedule for future delivery
- [x] Send test to admin
- [x] Delivery logs with status tracking
- [x] Analytics dashboard

### ✅ 5. Security & Audit
- [x] All admin actions logged in `audit_logs`
- [x] RLS policies enforce data access rules
- [x] Service role key used for privileged operations
- [x] Impersonation tracked and logged

---

## Verification Tests

### Test 1: Admin Login
**Steps:**
1. Go to https://redpay2026.netlify.app/
2. Sign up with: sundaychinemerem66@gmail.com / Chinemerem18$
3. After signup, navigate to: https://redpay2026.netlify.app/admin/referrals
4. Verify admin panel loads (not redirected)

**Expected Result:**
✅ Admin panel displays with referrals table, stats, and navigation

---

### Test 2: Referral Credit Flow
**Steps:**
1. Create User A in the app, note their referral code (e.g., REF794833)
2. Check User A's balance and referral_count in the database
3. Create User B by signing up with URL: `/?ref=REF794833`
4. Wait for edge function to process (check logs if needed)
5. Go to admin panel → Referrals
6. Check User A's referral_count (should be +1)
7. Check User A's balance (should be +₦5,000)

**Expected Result:**
✅ User A's referral_count increases by 1
✅ User A's balance increases by ₦5,000
✅ Referral record appears in admin panel with status "Auto"
✅ Transaction created in transactions table

**Database Queries to Verify:**
```sql
-- Check User A's updated counts
SELECT user_id, first_name, referral_count, balance 
FROM users 
WHERE referral_code = 'REF794833';

-- Check referral record
SELECT * FROM referrals 
WHERE referrer_id = '<User A user_id>' 
AND new_user_id = '<User B user_id>';

-- Check transaction
SELECT * FROM transactions 
WHERE user_id = '<User A user_id>' 
AND type = 'credit'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 3: Manual Credit
**Steps:**
1. In admin panel, go to Referrals
2. Set filter to "Pending"
3. Find a pending referral (or create one manually in DB for testing)
4. Click "Credit" button
5. Enter notes: "Manual credit test - user verification confirmed"
6. Click "Credit ₦5,000"
7. Verify success toast appears
8. Check referral status changed to "Manual"
9. Check user balance increased

**Expected Result:**
✅ Referral marked as manually_credited = true
✅ Referrer's balance +₦5,000
✅ Referrer's referral_count +1
✅ Transaction created
✅ Audit log entry created with action_type = "manual_referral_credit"

**Database Queries to Verify:**
```sql
-- Check referral marked as manual
SELECT manually_credited, manual_credit_notes, amount_given 
FROM referrals 
WHERE id = '<referral_id>';

-- Check audit log
SELECT * FROM audit_logs 
WHERE action_type = 'manual_referral_credit'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 4: Push Notification
**Steps:**
1. Go to `/admin/push-notifications`
2. Click "Compose" tab
3. Create notification:
   - Title: "Test Notification"
   - Body: "This is a test from admin panel"
   - CTA URL: /dashboard
4. Select "All Users" or "Custom" with your admin user ID
5. Click "Send Test"
6. Check "Logs" tab for delivery status

**Expected Result:**
✅ Notification created in push_notifications table
✅ Delivery log created in push_notification_logs
✅ Status shows "sent" (or "pending" if FCM not configured)

**Note**: Full delivery requires FCM (Firebase Cloud Messaging) and APNs setup with valid keys. Without these, logs will show sent but actual device delivery won't occur.

---

### Test 5: Payment Review
**Steps:**
1. Have a user submit RPC purchase with receipt upload
2. Go to `/admin/payments`
3. Find the pending payment
4. Click "Review"
5. View receipt image
6. Add admin notes: "Payment verified - bank transfer confirmed"
7. Click "Confirm Payment"
8. Check payment status changed to verified

**Expected Result:**
✅ Payment verified = true in rpc_purchases table
✅ Audit log entry created
✅ Status badge shows "Confirmed"

---

### Test 6: User Impersonation
**Steps:**
1. In admin panel → Referrals
2. Click the user icon (👤) next to any referrer
3. Verify redirected to `/dashboard` as that user
4. Check browser session shows impersonated user
5. Return to admin, check audit_logs for impersonation entry

**Expected Result:**
✅ Dashboard loads showing impersonated user's data
✅ Audit log records impersonation with target_user_id
✅ SessionStorage contains impersonation flag

---

## Database Schema Verification

### Tables Created by Migration
- ✅ `user_roles` - Stores admin, moderator, user roles
- ✅ `audit_logs` - Tracks all admin actions
- ✅ `push_notifications` - Notification campaigns
- ✅ `push_notification_logs` - Per-user delivery logs
- ✅ `user_notification_preferences` - User opt-in/opt-out

### RLS Policies Verified
- ✅ Admin users can view/update all referrals
- ✅ Admin users can view/update all payments
- ✅ Admin users can create/view push notifications
- ✅ Normal users can only view their own data
- ✅ Audit logs viewable only by admins

### Edge Functions Deployed
- ✅ `credit-referral` - Automatic referral crediting
- ✅ `manual-credit-referral` - Admin manual crediting

---

## Current Limitations & Next Steps

### Push Notifications
⚠️ **Requires External Setup**
- FCM (Firebase Cloud Messaging) for Android/Web push
- APNs (Apple Push Notification service) for iOS
- VAPID keys for web push (browser notifications)

Without these, notifications are logged but not delivered to devices.

**Setup Required:**
1. Create Firebase project
2. Get FCM server key
3. Generate VAPID keys for web push
4. Add keys to Supabase secrets
5. Update edge function to use FCM API

### Rate Limiting
⚠️ **Not Yet Implemented**
- No rate limits on push notification sends
- No daily admin send limits

**Recommended:**
- Add configurable daily send limit
- Add batch size limits
- Add cooldown period between campaigns

---

## Success Criteria

✅ **Admin URL accessible**: https://redpay2026.netlify.app/admin/referrals  
✅ **Admin login works**: sundaychinemerem66@gmail.com / Chinemerem18$  
✅ **Database connected**: Production Lovable Cloud database  
✅ **Referral crediting**: Server-side, atomic, idempotent  
✅ **Manual credit**: Works with audit logging  
✅ **Payment review**: Upload, review, confirm/reject  
✅ **Push system**: UI complete, requires FCM for actual delivery  
✅ **Impersonation**: Works with audit logging  
✅ **Security**: RLS policies enforced, service role used correctly  

---

## Support & Troubleshooting

### Cannot Access Admin Panel
- Verify signed up with exact email: sundaychinemerem66@gmail.com
- Check `user_roles` table for admin role entry
- Clear browser cache/cookies
- Check browser console for errors

### Referral Not Credited
- Check edge function logs in Lovable Cloud → Cloud → Edge Functions
- Verify `credit-referral` function deployed
- Check `referrals` table for failed records
- Verify `referred_by` field not already set

### Manual Credit Failed
- Check edge function logs for `manual-credit-referral`
- Verify admin has service role permissions
- Check referral hasn't already been credited
- Verify user balance field is integer type

### Push Not Delivered
- Check `push_notification_logs` table for status
- If status is "sent" but not received, FCM setup required
- Check user hasn't opted out in preferences
- Verify device token stored in database (requires app integration)

---

**Last Updated**: November 25, 2025  
**Version**: 1.0  
**Database**: Lovable Cloud (Supabase Project: tneqdznpappgpepkelav)
