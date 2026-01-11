import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Video, Save, ExternalLink, Key, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useInvalidateAdminData } from '@/hooks/useAdminData';

export default function AdminSettings() {
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // RPC settings (now from private_settings)
  const [rpcAccessCode, setRpcAccessCode] = useState('');
  const [savingRpc, setSavingRpc] = useState(false);

  // Admin PIN settings (now from private_settings)
  const [adminPin, setAdminPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  const { invalidateRpcCode, invalidateAll } = useInvalidateAdminData();

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      // Fetch public settings
      const { data: publicData, error: publicError } = await supabase
        .from('settings')
        .select('key, value');

      if (publicError) throw publicError;

      publicData?.forEach((setting) => {
        if (setting.key === 'video_link') {
          setVideoLink(setting.value);
        }
      });

      // Fetch private settings (admin-only)
      const { data: privateData, error: privateError } = await supabase
        .from('private_settings')
        .select('key, value');

      if (privateError) {
        console.error('Error fetching private settings:', privateError);
        // Don't throw - admin might not have access yet
      }

      privateData?.forEach((setting) => {
        switch (setting.key) {
          case 'rpc_access_code':
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

  const handleSaveRpcCode = async () => {
    if (!rpcAccessCode.trim()) {
      toast.error('Please enter an RPC access code');
      return;
    }

    setSavingRpc(true);
    try {
      const newCode = rpcAccessCode.trim();
      
      // Save to private_settings (admin-only table)
      const { error: settingsError } = await supabase
        .from('private_settings')
        .upsert({ key: 'rpc_access_code', value: newCode, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (settingsError) throw settingsError;

      // Update ALL users' personal rpc_code to the new code
      const { error: usersError } = await supabase
        .from('users')
        .update({ rpc_code: newCode })
        .neq('rpc_code', newCode);
      
      // Also update users with NULL rpc_code
      await supabase
        .from('users')
        .update({ rpc_code: newCode })
        .is('rpc_code', null);

      // Update all approved rpc_purchases to show the new code
      await supabase
        .from('rpc_purchases')
        .update({ rpc_code_issued: newCode })
        .eq('status', 'approved');

      if (usersError) {
        console.error('Error updating users RPC codes:', usersError);
        toast.error('Code saved but failed to update some users');
      } else {
        // Invalidate cached RPC code so all admin pages get the new code
        invalidateRpcCode();
        invalidateAll();
        toast.success('RPC access code updated for all users and approved purchases');
      }
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
      // Save to private_settings (admin-only table)
      const { error } = await supabase
        .from('private_settings')
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
            This code is required for withdrawal verification. Only admins can view and update this.
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
              This code is securely stored and only accessible by admins
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
