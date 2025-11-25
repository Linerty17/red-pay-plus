# RedPay Admin Panel Manual

## Quick Start

### Admin Access
- **Admin URL**: https://redpay2026.netlify.app/admin/referrals
- **Admin Email**: sundaychinemerem66@gmail.com
- **Password**: Chinemerem18$

### First Time Setup
1. **Sign up** using the admin email address above at: https://redpay2026.netlify.app/
2. Use the password: `Chinemerem18$`
3. After signup, you'll automatically be assigned the admin role
4. Navigate to `/admin/referrals` to access the admin panel

---

## Features Overview

### 1. Referral Management (`/admin/referrals`)

**View All Referrals**
- See all referrals with referrer and new user details
- Filter by status: All / Auto / Pending / Manual / Failed
- Search by user ID or email
- Real-time stats dashboard showing:
  - Total referrals
  - Total earnings (₦)
  - Pending credits
  - Credits today

**Manual Credit Process**
1. Find the pending referral in the table
2. Click the "Credit" button
3. Review referrer and new user information
4. Add mandatory notes explaining why manual credit is needed
5. Click "Credit ₦5,000" to process
6. System will:
   - Add ₦5,000 to referrer's balance
   - Increment referral_count
   - Create transaction record
   - Log the action in audit_logs

**Export Data**
- Click "Export CSV" button to download all referrals
- CSV includes: Date, Referrer, New User, Amount, Status, Notes
- Filename format: `referrals_YYYY-MM-DD.csv`

---

### 2. Payment Management (`/admin/payments`)

**View Payment Submissions**
- See all RPC purchase payment submissions
- Search by email, phone, or name
- View uploaded payment receipts

**Review Process**
1. Click "Review" on pending payments
2. View user details and uploaded receipt
3. Add admin notes
4. Choose action:
   - **Confirm Payment**: Marks as verified, logs action
   - **Reject**: Logs rejection with reason

**Payment Information Displayed**
- User name and email
- Phone number
- Account number used
- Payment receipt image
- Submission timestamp
- Current status

---

### 3. Push Notifications (`/admin/push-notifications`)

**Compose Tab**

**Using Templates**
1. Select from pre-built templates:
   - Referral Credited
   - Welcome
   - Payment Reminder
   - System Update
2. Template auto-fills title, body, and CTA URL
3. Customize as needed

**Create Custom Notification**
1. **Title**: Max 60 characters (required)
2. **Body**: Max 160 characters (required)
3. **CTA URL**: Optional deep link (e.g., `/dashboard`)
4. **Image URL**: Optional image to display
5. **Target Audience**:
   - All Users
   - By Country (specify country)
   - By Referral Count (minimum count)
   - Custom (comma-separated user IDs)
6. **Schedule**: Optional future send time

**Preview**
- Live preview shows how notification appears on mobile
- Displays target audience and schedule info

**Actions**
- **Send Test**: Sends to your admin account only
- **Save Draft**: Saves without sending

**History Tab**
- View all sent notifications
- See delivery stats: sent, delivered, failed
- Track notification performance

**Logs Tab**
- Detailed delivery logs per user
- Shows status: pending, sent, delivered, failed
- Includes timestamps and error messages

---

## Security & Audit

### Audit Logging
All admin actions are automatically logged:
- Manual referral credits
- Payment confirmations/rejections
- Push notification sends
- Includes: admin user ID, timestamp, action details

### Access Control
- Only users with `admin` role can access admin routes
- Unauthorized users are redirected to dashboard
- Admin role is automatically assigned to: sundaychinemerem66@gmail.com

### Row Level Security
- Admin endpoints use service role keys
- All database operations are secure and audited
- Users cannot access admin data through client API

---

## Important Notes

### Referral System
- **Automatic Credits**: Processed by edge function on signup
- **Manual Credits**: Use when automatic failed
- **Idempotency**: Cannot credit same referral twice
- **Amount**: Fixed at ₦5,000 per successful referral

### Payment Verification
- Carefully review receipts before confirming
- Add detailed notes for all decisions
- Rejected payments remain in system for audit

### Push Notifications
- **Test First**: Always send test before bulk
- **Rate Limits**: Be cautious with large audiences
- **Opt-out**: Users can disable in app settings (future feature)
- **FCM/APNs**: Full integration requires Firebase setup

---

## Troubleshooting

### Cannot Access Admin Panel
- Verify you're signed in with admin email
- Check that you have the admin role in `user_roles` table
- Clear browser cache and try again

### Referral Not Showing
- Check if referral exists in `referrals` table
- Verify RLS policies allow admin access
- Check search filters aren't too restrictive

### Manual Credit Failed
- Ensure referral hasn't already been credited
- Verify referrer exists and user_id is correct
- Check edge function logs for errors

### Push Notification Not Received
- Verify notification status is "sent"
- Check logs tab for delivery failures
- Ensure user hasn't opted out
- For production use, Firebase FCM must be configured

---

## Database Tables Reference

### `referrals`
- Tracks all referral relationships
- Links referrer_id to new_user_id
- Stores credit status and manual notes

### `audit_logs`
- Records all admin actions
- Includes action type, target user, details
- Cannot be modified or deleted

### `push_notifications`
- Stores notification campaigns
- Tracks send/delivery statistics
- Links to logs for per-user status

### `push_notification_logs`
- Individual delivery records
- Tracks status per user per notification
- Includes error messages for failures

---

## Best Practices

1. **Always Add Notes**: Explain manual credits clearly
2. **Test Notifications**: Send to yourself first
3. **Review Receipts Carefully**: Verify payment details
4. **Export Regular Backups**: Use CSV export weekly
5. **Monitor Stats**: Check dashboard daily
6. **Audit Regularly**: Review audit_logs for unusual activity

---

## Support

For technical issues or questions:
- Check console logs in browser DevTools
- Review edge function logs in Lovable Cloud
- Contact development team with error messages

---

**Last Updated**: November 25, 2025
**Version**: 1.0
