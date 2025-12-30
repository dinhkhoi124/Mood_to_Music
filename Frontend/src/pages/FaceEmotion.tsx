// File: Frontend/pages/FaceEmotion.tsx (ĐÃ CHỈNH SỬA)

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  Loader2,
  Music,
  Upload,
  RefreshCw,
  ExternalLink,
  Volume2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  predictFaceEmotion,
  type EmotionPrediction,
  type MusicSuggestion,
} from "@/api/faceEmotion";

// Khai báo global cho YT và player
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

let youtubePlayer: any = null;

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

// ===============================================================
// >>> TTS & YOUTUBE PLAYER UTILITIES
// ===============================================================

function speakMessage(message: string) {
  if ("speechSynthesis" in window) {
    const synthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(message);

    synthesis.cancel();

    const setVoice = () => {
      const voices = synthesis.getVoices();
      let selectedVoice: SpeechSynthesisVoice | undefined;

      selectedVoice = voices.find(
        (voice) =>
          voice.lang === "vi-VN" &&
          (voice.name.includes("Female") ||
            voice.name.includes("Hồng") ||
            voice.name.includes("Nữ") ||
            voice.default)
      );

      if (!selectedVoice) {
        selectedVoice = voices.find((voice) => voice.lang === "vi-VN");
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        utterance.lang = "vi-VN";
        toast.warning("TTS: Không tìm thấy giọng Việt.");
      }

      utterance.rate = 1.0;
      synthesis.speak(utterance);
    };

    if (synthesis.getVoices().length === 0) {
      synthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  } else {
    toast.warning("Trình duyệt không hỗ trợ Web Speech API.");
  }
}

function playSuggestedMusic(
  suggestions: MusicSuggestion[],
  setCurrentPlayingVideoId: (id: string | null) => void
) {
  if (suggestions.length === 0) {
    setCurrentPlayingVideoId(null);
    return;
  }

  const randomIndex = Math.floor(Math.random() * suggestions.length);
  const videoId = suggestions[randomIndex].video_id;

  if (!videoId) {
    setCurrentPlayingVideoId(null);
    return;
  }

  if (typeof window.YT !== "undefined" && window.YT.Player) {
    if (!youtubePlayer) {
      youtubePlayer = new window.YT.Player("youtube-player", {
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
          onReady: (event: any) => {
            event.target.playVideo();
            setCurrentPlayingVideoId(videoId);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setCurrentPlayingVideoId(videoId);
            }
          },
          onError: () => {
            toast.error("Lỗi khi phát nhạc YouTube.");
            setCurrentPlayingVideoId(null);
          },
        },
      });
    } else {
      youtubePlayer.loadVideoById(videoId);
      setCurrentPlayingVideoId(videoId);
    }
  } else {
    setCurrentPlayingVideoId(null);
  }
}

// ===============================================================
// >>> COMPONENT CHÍNH
// ===============================================================

const FaceEmotion = () => {
  const navigate = useNavigate();
  const [isWebcamMode, setIsWebcamMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<EmotionPrediction | null>(null);
  const [musicSuggestions, setMusicSuggestions] = useState<MusicSuggestion[]>(
    []
  );
  const [message, setMessage] = useState("");
  const [currentPlayingVideoId, setCurrentPlayingVideoId] = useState<
    string | null
  >(null);

  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    checkUser();

    if (!document.getElementById("youtube-iframe-script")) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.id = "youtube-iframe-script";
      const first = document.getElementsByTagName("script")[0];
      first?.parentNode?.insertBefore(tag, first);
    }

    window.onYouTubeIframeAPIReady = () => {
      console.log("YT API Ready");
    };

    return () => {
      window.speechSynthesis.cancel();

      if (youtubePlayer?.destroy) {
        youtubePlayer.destroy();
        youtubePlayer = null;
      }

      setCurrentPlayingVideoId(null);
    };
  }, [navigate]);

  const captureWebcam = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture");
      return;
    }

    const blob = await fetch(imageSrc).then((r) => r.blob());
    const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });

    await analyzeImage(file);
  };

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    toast.info("Analyzing...");
    window.speechSynthesis.cancel();

    if (youtubePlayer?.stopVideo) youtubePlayer.stopVideo();
    setCurrentPlayingVideoId(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await predictFaceEmotion(formData);

      if (result.predictions?.length > 0) {
        const top = result.predictions[0];

        setPrediction(top);
        setMessage(result.message || "");
        setMusicSuggestions(result.music_suggestions || []);

        if (result.message) speakMessage(result.message);

        if (result.music_suggestions?.length > 0) {
          playSuggestedMusic(
            result.music_suggestions,
            setCurrentPlayingVideoId
          );
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const randomSong =
            result.music_suggestions?.[
              Math.floor(Math.random() * result.music_suggestions.length)
            ] || null;

          await supabase.from("emotion_history").insert({
            user_id: user.id,
            emotion_type: top.emotion,
            confidence: top.confidence,
            source: "face",
            song_title: randomSong?.title || null,
            song_artist: randomSong?.video_id
              ? `https://youtube.com/watch?v=${randomSong.video_id}`
              : null,
          });
        }

        toast.success("Analysis complete!");
      } else {
        toast.error("No emotion detected");
        setCurrentPlayingVideoId(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Cannot connect to Flask backend");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload .jpg or .png");
      return;
    }

    await analyzeImage(file);
    e.target.value = "";
  };

  const resetAnalysis = () => {
    setPrediction(null);
    setMusicSuggestions([]);
    setMessage("");
    setIsWebcamMode(false);

    window.speechSynthesis.cancel();
    if (youtubePlayer?.stopVideo) youtubePlayer.stopVideo();
    setCurrentPlayingVideoId(null);
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
            Show your face — AI will detect your emotion and recommend music 🎵
          </p>

          <div id="youtube-player" className="hidden"></div>

          {!prediction ? (
            <>
              {/* PHOTO CAPTURE CARD */}
              <Card className="shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle>Capture Your Expression</CardTitle>
                  <CardDescription>
                    Use your webcam or upload an image
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
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
                          <p className="text-sm text-muted-foreground">
                            Camera preview will appear here
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 justify-center">
                      {!isWebcamMode ? (
                        <Button
                          size="lg"
                          onClick={() => setIsWebcamMode(true)}
                          disabled={isAnalyzing}
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Start Webcam
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="lg"
                            onClick={captureWebcam}
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
                            onClick={() => setIsWebcamMode(false)}
                            disabled={isAnalyzing}
                          >
                            Stop Webcam
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="image-upload"
                        className="text-base font-semibold"
                      >
                        Upload Image File
                      </Label>

                      <div className="flex items-center gap-3">
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/png"
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
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* ANALYSIS RESULT CARD */}
              <div className="space-y-6">
                <Card className="shadow-lg rounded-2xl bg-gradient-to-br from-card to-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Analysis Results
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {message && (
                      <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-xl flex items-start gap-3">
                        <Volume2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-primary/80">
                            AI Message:
                          </p>
                          <p className="text-lg font-medium text-foreground">
                            {message}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="text-center p-6 bg-muted/50 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-2">
                        Detected Emotion
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-6xl">
                          {emotionEmojis[prediction.emotion.toLowerCase()] ||
                            "😊"}
                        </span>
                        <div className="text-left">
                          <p className="text-3xl font-bold capitalize">
                            {prediction.emotion}
                          </p>
                          <p className="text-lg text-muted-foreground">
                            {prediction.confidence.toFixed(1)}% confidence
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
                          {musicSuggestions.map((song, index) => (
                            <a
                              key={index}
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
                                <span className="font-medium">
                                  {song.title}
                                </span>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

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
