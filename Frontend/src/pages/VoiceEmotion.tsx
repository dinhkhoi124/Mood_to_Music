// File: Frontend/pages/VoiceEmotion.tsx (ĐỒNG BỘ THEME FACEEMOTION MỨC 2)

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, Music, Upload, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Khai báo global cho YouTube API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

let youtubePlayer: any = null;

// =============================================================
// TYPES
// =============================================================
interface EmotionPrediction {
  emotion: string;
  confidence: number;
}

interface MusicSuggestion {
  title: string;
  url: string;
  video_id?: string;
}

interface AnalysisResult {
  predictions: EmotionPrediction[];
  music_suggestions: MusicSuggestion[];
  message?: string;
}

// Emotion emoji mapping (giống FaceEmotion)
const emotionEmojis: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  angry: "😡",
  fear: "😱",
  neutral: "😌",
  surprise: "😲",
  disgust: "🤢",
};

// =============================================================
// TTS
// =============================================================
function speakMessage(message: string) {
  if (!("speechSynthesis" in window)) {
    toast.warning("Trình duyệt không hỗ trợ Web Speech API.");
    return;
  }

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(message);
  synthesis.cancel();

  const setVoice = () => {
    const voices = synthesis.getVoices();
    let selectedVoice = voices.find(
      (voice) =>
        voice.lang === "vi-VN" &&
        (voice.name.includes("Female") ||
          voice.name.includes("Hồng") ||
          voice.name.includes("Nữ") ||
          voice.default)
    );
    if (!selectedVoice)
      selectedVoice = voices.find((voice) => voice.lang === "vi-VN");

    if (selectedVoice) utterance.voice = selectedVoice;
    else utterance.lang = "vi-VN";

    utterance.rate = 1.0;
    synthesis.speak(utterance);
  };

  if (synthesis.getVoices().length === 0) synthesis.onvoiceschanged = setVoice;
  else setVoice();
}

// =============================================================
// YouTube Music
// =============================================================
function playSuggestedMusic(
  suggestions: MusicSuggestion[],
  setCurrentPlayingVideoId: (id: string | null) => void
) {
  const valid = suggestions.filter((s) => s.video_id);
  if (valid.length === 0) return;

  const random = valid[Math.floor(Math.random() * valid.length)];
  const videoId = random.video_id;
  if (!videoId) return;

  setCurrentPlayingVideoId(videoId); // highlight bài nhạc đang phát

  if (window.YT && window.YT.Player) {
    if (!youtubePlayer) {
      youtubePlayer = new window.YT.Player("youtube-player-voice", {
        height: "0",
        width: "0",
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e: any) => e.target.playVideo(),
          onError: () => toast.error("Lỗi khi phát nhạc YouTube."),
        },
      });
    } else youtubePlayer.loadVideoById(videoId);
  }
}

// =============================================================
// COMPONENT
// =============================================================
const VoiceEmotion = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [message, setMessage] = useState("");
  const [currentPlayingVideoId, setCurrentPlayingVideoId] = useState<
    string | null
  >(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // =============================================================
  // USE EFFECT: CHECK LOGIN + LOAD YOUTUBE API + CLEANUP
  // =============================================================
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate("/auth");
    };
    checkUser();

    if (!document.getElementById("youtube-iframe-script-voice")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.id = "youtube-iframe-script-voice";
      document.body.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = () => console.log("YouTube API Ready");

    return () => {
      window.speechSynthesis.cancel();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      }
      if (youtubePlayer) {
        youtubePlayer.stopVideo?.();
        youtubePlayer.destroy?.();
        youtubePlayer = null;
      }
      setCurrentPlayingVideoId(null);
    };
  }, [navigate]);

  // =============================================================
  // RECORDING
  // =============================================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((t) => t.stop());
        await analyzeEmotion(audioBlob);
      };

      recorder.start(100);
      setIsRecording(true);
      setResults(null);
      setMessage("");
      window.speechSynthesis.cancel();
      youtubePlayer?.stopVideo?.();
      toast.success("Recording started");
    } catch {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Recording stopped, analyzing...");
    }
  };

  const stopVoice = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      const stream = mediaRecorderRef.current.stream;
      mediaRecorderRef.current.stop();
      stream?.getTracks().forEach((t) => t.stop());
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    window.speechSynthesis.cancel();
    if (youtubePlayer) {
      youtubePlayer.stopVideo?.();
      youtubePlayer.destroy?.();
      youtubePlayer = null;
    }
    setCurrentPlayingVideoId(null);
    toast.info("Voice recording stopped");
  };

  // =============================================================
  // ANALYZE AUDIO
  // =============================================================
  const analyzeEmotion = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setResults(null);
    setMessage("");
    window.speechSynthesis.cancel();
    youtubePlayer?.stopVideo?.();
    setCurrentPlayingVideoId(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () =>
          resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch("http://localhost:5001/predict_voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData: base64 }),
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);

      const data: AnalysisResult = await response.json();
      if (!data.predictions || data.predictions.length === 0) {
        toast.error("No prediction received");
        return;
      }

      setResults(data);
      setMessage(data.message || "");
      if (data.message) speakMessage(data.message);
      if (data.music_suggestions?.length > 0)
        playSuggestedMusic(data.music_suggestions, setCurrentPlayingVideoId);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const randomSong =
          data.music_suggestions[
            Math.floor(Math.random() * data.music_suggestions.length)
          ];
        const songUrl = randomSong?.video_id
          ? `https://youtube.com/watch?v=${randomSong.video_id}`
          : randomSong?.url || "N/A";
        await supabase.from("emotion_history").insert({
          user_id: user.id,
          emotion_type: data.predictions[0].emotion,
          confidence: data.predictions[0].confidence,
          source: "voice",
          song_title: randomSong?.title || "No song",
          song_artist: songUrl,
        });
      }

      toast.success("Analysis complete!");
    } catch (err: any) {
      toast.error("Failed to analyze emotion: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // =============================================================
  // FILE UPLOAD
  // =============================================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".wav") && !file.name.endsWith(".webm")) {
      toast.error("Please upload .wav or .webm file");
      return;
    }
    await analyzeEmotion(file);
    e.target.value = "";
  };

  const resetAnalysis = () => {
    setResults(null);
    setMessage("");
    setIsRecording(false);
    window.speechSynthesis.cancel();
    if (youtubePlayer) {
      youtubePlayer.stopVideo?.();
      youtubePlayer.destroy?.();
      youtubePlayer = null;
    }
    setCurrentPlayingVideoId(null);
  };

  const topPrediction = results?.predictions?.[0];
  const musicSuggestions = results?.music_suggestions || [];

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Voice Emotion Analysis
          </h1>
          <p className="text-muted-foreground mb-8">
            Speak your mind — AI will detect your emotion and recommend music 🎵
          </p>

          <div id="youtube-player-voice" className="hidden" />

          {!topPrediction ? (
            <Card className="shadow-lg rounded-2xl mb-8">
              <CardHeader>
                <CardTitle>Record Your Voice</CardTitle>
                <CardDescription>
                  Record or upload audio to analyze your emotion
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Button
                    size="lg"
                    className="w-32 h-32 rounded-full bg-green-500 hover:bg-green-600"
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
                    <Button
                      size="lg"
                      onClick={startRecording}
                      disabled={isAnalyzing}
                    >
                      <Mic className="w-5 h-5 mr-2" /> Start Recording
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        onClick={stopRecording}
                        className="bg-red-500 hover:bg-red-600"
                        disabled={isAnalyzing}
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
                    ? "Recording..."
                    : "Click to start recording"}
                </p>

                <div className="w-full border-t pt-6">
                  <Label
                    htmlFor="audio-upload"
                    className="text-base font-semibold"
                  >
                    Or Upload Audio File
                  </Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      id="audio-upload"
                      type="file"
                      accept=".wav,.webm"
                      onChange={handleFileUpload}
                      disabled={isAnalyzing || isRecording}
                    />
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: .wav or .webm
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg rounded-2xl bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5" /> Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {message && (
                  <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-xl flex gap-3">
                    <Volume2 className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-primary/80">
                        AI Message:
                      </p>
                      <p className="text-lg font-medium">{message}</p>
                    </div>
                  </div>
                )}

                <div className="text-center p-6 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">
                    Detected Emotion
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-6xl">
                      {emotionEmojis[topPrediction.emotion.toLowerCase()] ||
                        "😊"}
                    </span>
                    <div className="text-left">
                      <p className="text-3xl font-bold capitalize">
                        {topPrediction.emotion}
                      </p>
                      <p className="text-lg text-muted-foreground">
                        {topPrediction.confidence.toFixed(1)}% confidence
                      </p>
                    </div>
                  </div>
                </div>

                {musicSuggestions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      🎵 Recommended Music
                    </p>
                    <div className="space-y-2">
                      {musicSuggestions.map((song, i) => (
                        <a
                          key={i}
                          href={`https://youtube.com/watch?v=${song.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-between p-4 rounded-lg transition-colors group cursor-pointer ${
                            song.video_id === currentPlayingVideoId
                              ? "bg-primary/20 ring-2 ring-primary border border-primary"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Music className="w-5 h-5 text-primary" />
                            <span className="font-medium">{song.title}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetAnalysis}
                  className="w-full"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default VoiceEmotion;
