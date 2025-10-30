import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Mic, Camera, TrendingUp, Sparkles, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Music className="w-16 h-16 text-primary animate-pulse" />
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-emotion bg-clip-text text-transparent">
            Mood2Music
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
            Discover music that perfectly matches your emotions. 
            Analyze your mood through voice or facial expressions and get personalized song recommendations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 shadow-emotion hover:shadow-glow transition-all"
            >
              Get Started
              <Heart className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 w-full mt-16">
            <div className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-lg hover:shadow-emotion transition-all">
              <Mic className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">Voice Analysis</h3>
              <p className="text-muted-foreground">
                Speak your feelings and let our AI detect your emotional state through voice patterns
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-lg hover:shadow-emotion transition-all">
              <Camera className="w-12 h-12 text-secondary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">Face Detection</h3>
              <p className="text-muted-foreground">
                Show your face and we'll analyze your expressions to understand your mood
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-lg hover:shadow-emotion transition-all">
              <TrendingUp className="w-12 h-12 text-accent mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">Mood Tracking</h3>
              <p className="text-muted-foreground">
                Track your emotional patterns over time with beautiful charts and insights
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/30 backdrop-blur-sm py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Mood2Music. Music for every emotion.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
