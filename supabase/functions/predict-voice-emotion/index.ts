import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock emotion detection - returns random emotion and song recommendation
const emotions = ["happy", "sad", "energetic", "calm", "neutral"];

const songRecommendations: Record<string, { title: string; artist: string }[]> = {
  happy: [
    { title: "Happy", artist: "Pharrell Williams" },
    { title: "Good Vibrations", artist: "The Beach Boys" },
    { title: "Walking on Sunshine", artist: "Katrina and the Waves" },
  ],
  sad: [
    { title: "Someone Like You", artist: "Adele" },
    { title: "Fix You", artist: "Coldplay" },
    { title: "The Scientist", artist: "Coldplay" },
  ],
  energetic: [
    { title: "Eye of the Tiger", artist: "Survivor" },
    { title: "Stronger", artist: "Kanye West" },
    { title: "Can't Hold Us", artist: "Macklemore" },
  ],
  calm: [
    { title: "Weightless", artist: "Marconi Union" },
    { title: "River Flows in You", artist: "Yiruma" },
    { title: "Clair de Lune", artist: "Claude Debussy" },
  ],
  neutral: [
    { title: "Lean On", artist: "Major Lazer" },
    { title: "Rather Be", artist: "Clean Bandit" },
    { title: "Counting Stars", artist: "OneRepublic" },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Mock emotion detection logic
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    const songs = songRecommendations[randomEmotion];
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    const confidence = 0.75 + Math.random() * 0.2; // Random confidence between 0.75 and 0.95

    console.log("Voice emotion detected:", randomEmotion);

    return new Response(
      JSON.stringify({
        emotion: randomEmotion,
        confidence: confidence,
        song: randomSong,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in voice emotion prediction:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});