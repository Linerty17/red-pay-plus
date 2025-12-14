import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Video, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVideoLink();
  }, []);

  const fetchVideoLink = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'video_link')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setVideoLink(data.value);
      }
    } catch (error) {
      console.error('Error fetching video link:', error);
      toast.error('Failed to load video settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!videoLink.trim()) {
      toast.error('Please enter a video link');
      return;
    }

    setSaving(true);
    try {
      // Convert dai.ly short links to embed format
      let embedLink = videoLink.trim();
      
      // Handle short link format: https://dai.ly/VIDEO_ID
      const shortLinkMatch = embedLink.match(/dai\.ly\/([a-zA-Z0-9]+)/);
      if (shortLinkMatch) {
        embedLink = `https://geo.dailymotion.com/player.html?video=${shortLinkMatch[1]}&mute=false`;
      }
      
      // Handle dailymotion.com/video/ format
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
              <Button onClick={handleSave} disabled={saving || loading}>
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
