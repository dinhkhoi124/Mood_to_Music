import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Loader2, Music, Upload, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { predictFaceEmotion, type EmotionPrediction, type MusicSuggestion } from "@/api/faceEmotion";

// Emotion emoji mapping
const emotionEmojis: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  angry: "😡",
  fear: "😱",
  neutral: "😌",
  surprise: "😲",
  disgust: "🤢",
};

const FaceEmotion = () => {
  const navigate = useNavigate();
  const [isWebcamMode, setIsWebcamMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<EmotionPrediction | null>(null);
  const [musicSuggestions, setMusicSuggestions] = useState<MusicSuggestion[]>([]);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkUser();
  }, [navigate]);

  const captureWebcam = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture image");
      return;
    }

    // Convert base64 to blob
    const blob = await fetch(imageSrc).then((res) => res.blob());
    const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });

    await analyzeImage(file);
  };

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    toast.info("Analyzing your expression...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await predictFaceEmotion(formData);

      if (result.predictions && result.predictions.length > 0) {
        const topPrediction = result.predictions[0];
        setPrediction(topPrediction);
        setMusicSuggestions(result.music_suggestions || []);

        // Save to history
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("emotion_history").insert({
            user_id: user.id,
            emotion_type: topPrediction.emotion,
            confidence: topPrediction.confidence / 100,
            source: "face",
            song_title: result.music_suggestions?.[0]?.title || null,
            song_artist: null,
          });
        }

        toast.success("Analysis complete!");
      } else {
        toast.error("No emotion detected");
      }
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      toast.error("Failed to connect to AI backend. Make sure Flask server is running on port 5001.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (.jpg or .png)");
      return;
    }

    await analyzeImage(file);
    
    // Reset input
    e.target.value = "";
  };

  const resetAnalysis = () => {
    setPrediction(null);
    setMusicSuggestions([]);
    setIsWebcamMode(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Face Emotion Analysis
          </h1>
          <p className="text-muted-foreground mb-8">
            Show us your face and we'll detect your emotion and recommend music
          </p>

          {!prediction ? (
            <Card className="shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle>Capture Your Expression</CardTitle>
                <CardDescription>
                  Use your webcam or upload an image file to analyze your emotion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Webcam Section */}
                <div className="space-y-4">
                  <div className="relative w-full aspect-video bg-muted rounded-xl overflow-hidden">
                    {isWebcamMode ? (
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{
                          facingMode: "user",
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <Camera className="w-16 h-16 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-center">
                    {!isWebcamMode ? (
                      <Button size="lg" onClick={() => setIsWebcamMode(true)} disabled={isAnalyzing}>
                        <Camera className="w-5 h-5 mr-2" />
                        Start Webcam
                      </Button>
                    ) : (
                      <>
                        <Button size="lg" onClick={captureWebcam} disabled={isAnalyzing}>
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
                          onClick={() => setIsWebcamMode(false)}
                          disabled={isAnalyzing}
                        >
                          Stop Webcam
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-3">
                  <Label htmlFor="image-upload" className="text-base font-semibold">
                    Upload Image File
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleFileUpload}
                      disabled={isAnalyzing}
                      className="cursor-pointer"
                    />
                    <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: .jpg, .png (max 10MB)
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Results Card */}
              <Card className="shadow-lg rounded-2xl bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Emotion Display */}
                  <div className="text-center p-6 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Detected Emotion</p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-6xl">{emotionEmojis[prediction.emotion.toLowerCase()] || "😊"}</span>
                      <div className="text-left">
                        <p className="text-3xl font-bold capitalize">{prediction.emotion}</p>
                        <p className="text-lg text-muted-foreground">
                          {prediction.confidence.toFixed(1)}% confidence
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Music Suggestions */}
                  {musicSuggestions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">
                        🎵 Recommended Music
                      </p>
                      <div className="space-y-2">
                        {musicSuggestions.map((song, index) => (
                          <a
                            key={index}
                            href={song.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <Music className="w-5 h-5 text-primary" />
                              <span className="font-medium">{song.title}</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Try Again Button */}
                  <Button size="lg" variant="outline" onClick={resetAnalysis} className="w-full">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <Card className="mt-6 shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-3/4 mx-auto" />
                  <Skeleton className="h-8 w-1/2 mx-auto" />
                  <Skeleton className="h-32 w-full" />
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