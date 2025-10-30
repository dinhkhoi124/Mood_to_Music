import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Loader2, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VoiceEmotion = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [song, setSong] = useState<{ title: string; artist: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkUser();
  }, [navigate]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await analyzeEmotion(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      toast.info("Recording stopped, analyzing...");
    }
  };

  const analyzeEmotion = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    
    try {
      // Call mock emotion detection API
      const { data, error } = await supabase.functions.invoke("predict-voice-emotion", {
        body: { audioData: "mock" },
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
          confidence: data.confidence || 0.85,
          source: "voice",
          song_title: recommendedSong.title,
          song_artist: recommendedSong.artist,
        });
      }

      toast.success("Analysis complete!");
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
          <h1 className="text-4xl font-bold mb-2 bg-gradient-warm bg-clip-text text-transparent">
            Voice Emotion Analysis
          </h1>
          <p className="text-muted-foreground mb-8">
            Speak your mind and we'll detect your emotion
          </p>

          <Card className="mb-8 shadow-emotion">
            <CardHeader>
              <CardTitle>Record Your Voice</CardTitle>
              <CardDescription>
                Click the button below to start recording. Speak for at least 3 seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="relative">
                <Button
                  size="lg"
                  className={`w-32 h-32 rounded-full ${isRecording ? 'animate-pulse' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-12 h-12" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </Button>
                {isRecording && (
                  <div className="absolute -inset-2 rounded-full border-4 border-primary animate-ping" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {isAnalyzing
                  ? "Analyzing your emotion..."
                  : isRecording
                  ? "Recording... Click to stop"
                  : "Click to start recording"}
              </p>
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

export default VoiceEmotion;