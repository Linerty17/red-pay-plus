# Firebase Cloud Messaging Setup Guide

This guide will help you complete the Firebase Cloud Messaging (FCM) integration for push notifications.

## Quick Start

Your admin panel is now fully functional with:
- ✅ Secure authentication via Lovable Cloud
- ✅ Push notification composer
- ✅ Notification analytics dashboard
- ✅ User management (referrals, payments, transactions)
- ✅ Audit logging for all admin actions
- ✅ Error boundaries and loading states
- ✅ User notification preferences on profile page

## Firebase Setup (Required for Push Notifications)

To enable push notifications, you need to set up Firebase:

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. No Google Analytics needed

### Step 2: Get VAPID Key

1. Firebase Console > Project Settings > Cloud Messaging
2. Scroll to "Web Push certificates"
3. Click "Generate key pair"
4. Copy the key pair value

### Step 3: Update VAPID Key

Edit `src/components/NotificationSetup.tsx` line 50:

```typescript
applicationServerKey: urlBase64ToUint8Array(
  'YOUR_VAPID_PUBLIC_KEY_HERE' // Replace with your actual VAPID key
),
```

### Step 4: FCM Server Key (Already Set)

The `FCM_SERVER_KEY` should already be configured in your Lovable secrets.
If not, get it from: Firebase Console > Project Settings > Cloud Messaging > Server key

## How to Use

### For Admins

1. **Login**: Use your admin credentials at `/admin/login`
2. **Send Notifications**: Go to Admin > Send Push
3. **View Analytics**: Check Admin > Notification Stats
4. **Manage Users**: Use Referrals, Payments, and Transactions pages

### For Users

1. **Enable Notifications**: Go to Profile page
2. **Click "Enable Notifications"**
3. **Accept browser permission**
4. **Done!** You'll receive push notifications

## Admin Features

### Dashboard
- View total users, referrals, pending payments, transactions
- Quick stats overview

### Referrals Management
- View all referrals with status
- Manual credit for pending referrals
- Export to CSV
- Search and filter by status

### Payment Verification
- Approve/reject RPC purchases
- View payment proof images
- Automatic RPC code generation
- Auto-trigger referral bonus on approval

### Send Push Notifications
- Compose rich notifications
- Add call-to-action URLs
- Target specific audiences (all/active/inactive)
- Real-time preview

### Notification Analytics
- Total subscribers count
- Delivery success rate
- Recent notification history
- Failed delivery tracking

### Transaction History
- View all user transactions
- Filter and search
- Export capabilities

### Audit Logs
- Track all admin actions
- View action details and timestamps

## Security Features

✅ Role-based access control (admin role required)
✅ Server-side authentication via Lovable Cloud
✅ RLS policies on all database tables
✅ Audit logging for accountability
✅ Error boundaries for graceful error handling
✅ Input validation and sanitization

## Troubleshooting

### Can't login to admin panel?
- Ensure you have admin role in `user_roles` table
- Check auth credentials are correct
- Clear browser cache

### Notifications not working?
1. Check VAPID key is set correctly
2. Verify FCM_SERVER_KEY secret is configured
3. Ensure user granted browser permission
4. Check service worker is registered (DevTools > Application)

### Push sending fails?
- Verify FCM_SERVER_KEY is valid
- Check edge function logs in Lovable Cloud
- Ensure users have active subscriptions

## Next Steps

1. ✅ Complete Firebase VAPID key setup
2. Test notifications end-to-end
3. Customize notification templates
4. Set up automated notifications
5. Implement user segmentation

## Support

Check edge function logs for detailed error messages:
- Lovable Cloud > Functions > send-push-notification

All admin actions are logged in the `audit_logs` table for debugging.

