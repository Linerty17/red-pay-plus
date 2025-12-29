import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Video, Save, ExternalLink, CreditCard, Key, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Payment settings
  const [paymentAmount, setPaymentAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // RPC settings
  const [rpcAccessCode, setRpcAccessCode] = useState('');
  const [savingRpc, setSavingRpc] = useState(false);

  // Admin PIN settings
  const [adminPin, setAdminPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) throw error;

      data?.forEach((setting) => {
        switch (setting.key) {
          case 'video_link':
            setVideoLink(setting.value);
            break;
          case 'payment_amount':
            setPaymentAmount(setting.value);
            break;
          case 'account_number':
            setAccountNumber(setting.value);
            break;
          case 'bank_name':
            setBankName(setting.value);
            break;
          case 'account_name':
            setAccountName(setting.value);
            break;
          case 'rpc_code':
            setRpcAccessCode(setting.value);
            break;
          case 'admin_pin':
            setAdminPin(setting.value);
            break;
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVideo = async () => {
    if (!videoLink.trim()) {
      toast.error('Please enter a video link');
      return;
    }

    setSaving(true);
    try {
      let embedLink = videoLink.trim();
      
      const shortLinkMatch = embedLink.match(/dai\.ly\/([a-zA-Z0-9]+)/);
      if (shortLinkMatch) {
        embedLink = `https://geo.dailymotion.com/player.html?video=${shortLinkMatch[1]}&mute=false`;
      }
      
      const videoMatch = embedLink.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
      if (videoMatch) {
        embedLink = `https://geo.dailymotion.com/player.html?video=${videoMatch[1]}&mute=false`;
      }

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'video_link', value: embedLink, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      setVideoLink(embedLink);
      toast.success('Video link updated successfully');
    } catch (error) {
      console.error('Error saving video link:', error);
      toast.error('Failed to save video link');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentDetails = async () => {
    if (!accountNumber.trim() || !bankName.trim() || !accountName.trim()) {
      toast.error('Please fill in all payment details');
      return;
    }

    setSavingPayment(true);
    try {
      const updates = [
        { key: 'payment_amount', value: paymentAmount.trim(), updated_at: new Date().toISOString() },
        { key: 'account_number', value: accountNumber.trim(), updated_at: new Date().toISOString() },
        { key: 'bank_name', value: bankName.trim(), updated_at: new Date().toISOString() },
        { key: 'account_name', value: accountName.trim(), updated_at: new Date().toISOString() },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }

      toast.success('Payment details updated successfully');
    } catch (error) {
      console.error('Error saving payment details:', error);
      toast.error('Failed to save payment details');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveRpcCode = async () => {
    if (!rpcAccessCode.trim()) {
      toast.error('Please enter an RPC access code');
      return;
    }

    setSavingRpc(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'rpc_code', value: rpcAccessCode.trim(), updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      toast.success('RPC access code updated successfully');
    } catch (error) {
      console.error('Error saving RPC access code:', error);
      toast.error('Failed to save RPC access code');
    } finally {
      setSavingRpc(false);
    }
  };

  const handleSaveAdminPin = async () => {
    if (!adminPin.trim()) {
      toast.error('Please enter an admin PIN');
      return;
    }

    if (adminPin.length !== 4 || !/^\d+$/.test(adminPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    setSavingPin(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'admin_pin', value: adminPin.trim(), updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Admin PIN updated successfully');
    } catch (error) {
      console.error('Error saving admin PIN:', error);
      toast.error('Failed to save admin PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const extractVideoId = (url: string): string | null => {
    const match = url.match(/video=([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage app settings and configurations</p>
      </div>

      {/* Payment Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Configure the bank account details shown on the payment instructions page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount (₦)</Label>
              <Input
                id="paymentAmount"
                placeholder="6700"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="Enter bank name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="Enter account name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <Button onClick={handleSavePaymentDetails} disabled={savingPayment || loading}>
            <Save className="h-4 w-4 mr-2" />
            {savingPayment ? 'Saving...' : 'Update Payment Details'}
          </Button>
        </CardContent>
      </Card>

      {/* Admin PIN Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin Access PIN
          </CardTitle>
          <CardDescription>
            Change the 4-digit PIN required to access the admin panel after login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminPin">Access PIN (4 digits)</Label>
            <div className="flex gap-2">
              <Input
                id="adminPin"
                type="password"
                placeholder="Enter 4-digit PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                disabled={loading}
              />
              <Button onClick={handleSaveAdminPin} disabled={savingPin || loading}>
                <Save className="h-4 w-4 mr-2" />
                {savingPin ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This PIN is required after admin login to access the dashboard
            </p>
          </div>
        </CardContent>
      </Card>

      {/* RPC Access Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            RPC Access Code
          </CardTitle>
          <CardDescription>
            This code is displayed on the payment approval page. When you change it here, it updates everywhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpcAccessCode">Access Code</Label>
            <div className="flex gap-2">
              <Input
                id="rpcAccessCode"
                placeholder="Enter RPC access code"
                value={rpcAccessCode}
                onChange={(e) => setRpcAccessCode(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleSaveRpcCode} disabled={savingRpc || loading}>
                <Save className="h-4 w-4 mr-2" />
                {savingRpc ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This code will be used for RPC verification across the app
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Video Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video Settings
          </CardTitle>
          <CardDescription>
            Update the Dailymotion video shown to users on the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="videoLink">Dailymotion Video Link</Label>
            <div className="flex gap-2">
              <Input
                id="videoLink"
                placeholder="https://dai.ly/VIDEO_ID or full embed URL"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleSaveVideo} disabled={saving || loading}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports dai.ly short links, dailymotion.com/video links, or full embed URLs
            </p>
          </div>

          {videoLink && extractVideoId(videoLink) && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="aspect-video max-w-md rounded-lg overflow-hidden border">
                <iframe
                  src={videoLink}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Video Preview"
                />
              </div>
              <a
                href={`https://www.dailymotion.com/video/${extractVideoId(videoLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View on Dailymotion
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}