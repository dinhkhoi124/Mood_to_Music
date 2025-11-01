import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, Music, Upload } from "lucide-react";
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await analyzeEmotion(audioBlob);
      };

      // Start recording with timeslice to ensure ondataavailable fires
      mediaRecorder.start(100);
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Recording stopped, analyzing...");
    }
  };

  const stopVoice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const stream = mediaRecorderRef.current.stream;
      mediaRecorderRef.current.stop();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      toast.info("Voice recording stopped");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
      }
    };
  }, []);

  const analyzeEmotion = async (audioBlob?: Blob) => {
    setIsAnalyzing(true);
    
    try {
      let audioData = "mock";
      
      // Convert audio blob to base64 if provided
      if (audioBlob) {
        const reader = new FileReader();
        audioData = await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data:audio/webm;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
      }

      // Call emotion detection API
      const { data, error } = await supabase.functions.invoke("predict-voice-emotion", {
        body: { audioData },
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.wav')) {
      toast.error("Please upload a .wav file");
      return;
    }

    toast.info("Analyzing uploaded audio...");
    await analyzeEmotion();
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
                Record your voice or upload a .wav file to analyze your emotion
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="relative">
                <Button
                  size="lg"
                  className="w-32 h-32 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                  onClick={startRecording}
                  disabled={isAnalyzing || isRecording}
                >
                  <Mic className="w-12 h-12 text-white" />
                </Button>
                {isRecording && (
                  <div className="absolute -inset-2 rounded-full border-4 border-red-500 animate-ping" />
                )}
              </div>

              <div className="flex gap-4">
                {!isRecording ? (
                  <Button size="lg" onClick={startRecording} disabled={isAnalyzing}>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={stopRecording}
                      disabled={isAnalyzing}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Square className="w-5 h-5 mr-2" />
                          Stop & Analyze
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={stopVoice}
                      disabled={isAnalyzing}
                    >
                      Stop Voice
                    </Button>
                  </>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground font-medium">
                {isAnalyzing
                  ? "Analyzing your emotion..."
                  : isRecording
                  ? "Recording in progress..."
                  : "Click to start recording"}
              </p>

              <div className="w-full border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="audio-upload" className="text-base font-semibold">
                    Or Upload Audio File
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="audio-upload"
                      type="file"
                      accept=".wav"
                      onChange={handleFileUpload}
                      disabled={isAnalyzing || isRecording}
                      className="cursor-pointer"
                    />
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported format: .wav files only
                  </p>
                </div>
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

export default VoiceEmotion;