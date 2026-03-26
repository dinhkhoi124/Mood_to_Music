// File: Frontend/pages/History.tsx - Đã sửa lỗi hiển thị thập phân

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Mic, Camera, Music, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Kiểu dữ liệu cho lịch sử
interface HistoryEntry {
  id: string;
  emotion_type: string;
  confidence: number;
  source: string;
  created_at: string;
  song_title: string | null;
  song_artist: string | null;
}

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const user = api.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      await fetchHistory();
    };

    checkUser();
  }, [navigate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.get("/emotion_history");
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await api.delete(`/emotion_history/${id}`);
      toast.success("Entry deleted");
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      happy: "bg-emotion-happy",
      sad: "bg-emotion-sad",
      energetic: "bg-emotion-energetic",
      calm: "bg-emotion-calm",
      neutral: "bg-emotion-neutral",
    };

    return colors[emotion.toLowerCase()] || "bg-primary";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-pulse text-xl">Loading history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-emotion bg-clip-text text-transparent">
            Emotion History
          </h1>
          <p className="text-muted-foreground">
            View all your past emotion analyses and music recommendations
          </p>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Music className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">No history yet</p>
              <p className="text-muted-foreground">
                Start analyzing your emotions to build your history
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {history.map((entry) => (
              <Card key={entry.id} className="hover:shadow-emotion transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {entry.source === "voice" ? (
                        <Mic className="w-5 h-5 text-primary" />
                      ) : (
                        <Camera className="w-5 h-5 text-secondary" />
                      )}

                      <div>
                        <CardTitle className="capitalize">{entry.emotion_type}</CardTitle>
                        <CardDescription>
                          {new Date(entry.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getEmotionColor(entry.emotion_type)}>
                        {entry.confidence.toFixed(1)}% confidence
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {entry.song_title && (
                  <CardContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Music className="w-4 h-4" />
                      <span className="font-medium">{entry.song_title}</span>
                      <span>•</span>

                      {entry.song_artist && entry.song_artist.startsWith("http") ? (
                        <a
                          href={entry.song_artist}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Open Link <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span>{entry.song_artist}</span>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
