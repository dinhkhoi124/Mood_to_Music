import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Loader2, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FaceEmotion = () => {
  const navigate = useNavigate();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [song, setSong] = useState<{ title: string; artist: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkUser();

    return () => {
      stopCamera();
    };
  }, [navigate]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
      toast.success("Camera started");
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Could not access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;

    setIsAnalyzing(true);
    toast.info("Analyzing your expression...");

    try {
      // Call mock emotion detection API
      const { data, error } = await supabase.functions.invoke("predict-face-emotion", {
        body: { imageData: "mock" },
      });

      if (error) throw error;

      const detectedEmotion = data.emotion;
      const recommendedSong = data.song;

      setEmotion(detectedEmotion);
      setSong(recommendedSong);

      // Save to history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("emotion_history").insert({
          user_id: user.id,
          emotion_type: detectedEmotion,
          confidence: data.confidence || 0.82,
          source: "face",
          song_title: recommendedSong.title,
          song_artist: recommendedSong.artist,
        });
      }

      toast.success("Analysis complete!");
      stopCamera();
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      toast.error("Failed to analyze emotion");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-cool bg-clip-text text-transparent">
            Face Emotion Analysis
          </h1>
          <p className="text-muted-foreground mb-8">
            Show us your face and we'll detect your emotion
          </p>

          <Card className="mb-8 shadow-emotion">
            <CardHeader>
              <CardTitle>Capture Your Expression</CardTitle>
              <CardDescription>
                Enable your camera and capture a photo to analyze your emotion
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                {!isStreaming ? (
                  <Button size="lg" onClick={startCamera}>
                    <Camera className="w-5 h-5 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={captureAndAnalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          Capture & Analyze
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={stopCamera}
                      disabled={isAnalyzing}
                    >
                      Stop Camera
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {emotion && song && (
            <Card className="shadow-glow bg-gradient-hero">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Detected Emotion</p>
                  <p className="text-2xl font-bold capitalize">{emotion}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recommended Song</p>
                  <p className="text-xl font-semibold">{song.title}</p>
                  <p className="text-muted-foreground">{song.artist}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default FaceEmotion;