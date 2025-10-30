import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Mic, Camera, TrendingUp, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [emotionData, setEmotionData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0 });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchEmotionData();
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const fetchEmotionData = async () => {
    const { data, error } = await supabase
      .from("emotion_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching emotion data:", error);
      return;
    }

    // Process data for chart
    const emotionCounts = data.reduce((acc: any, entry: any) => {
      acc[entry.emotion_type] = (acc[entry.emotion_type] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(emotionCounts).map(([emotion, count]) => ({
      emotion,
      count,
    }));

    setEmotionData(chartData);

    // Calculate stats
    const today = new Date().toDateString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    setStats({
      total: data.length,
      today: data.filter((e: any) => new Date(e.created_at).toDateString() === today).length,
      thisWeek: data.filter((e: any) => new Date(e.created_at) >= weekAgo).length,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-emotion bg-clip-text text-transparent">
            Welcome Back!
          </h1>
          <p className="text-muted-foreground">
            Track your emotions and discover music that matches your mood
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">Emotions tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Emotion Distribution</CardTitle>
              <CardDescription>Your emotional patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              {emotionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={emotionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="emotion" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No emotion data yet. Start analyzing!
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Analyze your emotions now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full justify-start gap-3 h-auto py-6"
                onClick={() => navigate("/voice")}
              >
                <Mic className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Voice Analysis</div>
                  <div className="text-sm opacity-80">Speak your emotions</div>
                </div>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start gap-3 h-auto py-6"
                onClick={() => navigate("/face")}
              >
                <Camera className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Face Analysis</div>
                  <div className="text-sm opacity-80">Show your feelings</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;