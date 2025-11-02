import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Flask API endpoint (change this to your deployed Flask server URL)
const FLASK_API_URL = Deno.env.get("FLASK_API_URL") || "http://localhost:5000/predict_face";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_url, image_base64 } = await req.json();

    if (!image_url && !image_base64) {
      return new Response(
        JSON.stringify({ error: "image_url or image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emotion = "neutral";
    let confidence = 0.8;

    // Try to call Flask API for real prediction
    try {
      const flaskResponse = await fetch(FLASK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url, image_base64 }),
      });

      if (flaskResponse.ok) {
        const result = await flaskResponse.json();
        emotion = result.emotion || emotion;
        confidence = result.confidence || confidence;
        console.log("Face emotion from Flask API:", emotion, confidence);
      } else {
        console.warn("Flask API call failed, using fallback");
        // Fallback to mock if Flask is not available
        const emotions = ["happy", "sad", "energetic", "calm", "neutral"];
        emotion = emotions[Math.floor(Math.random() * emotions.length)];
        confidence = 0.70 + Math.random() * 0.25;
      }
    } catch (flaskError) {
      console.error("Error calling Flask API:", flaskError);
      // Fallback to mock
      const emotions = ["happy", "sad", "energetic", "calm", "neutral"];
      emotion = emotions[Math.floor(Math.random() * emotions.length)];
      confidence = 0.70 + Math.random() * 0.25;
    }

    // Get song recommendation from Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: mappings } = await supabase
      .from("emotion_song_mapping")
      .select("song_id")
      .eq("emotion_type", emotion.toLowerCase())
      .limit(5);

    let song = { title: "Unknown", artist: "Unknown" };

    if (mappings && mappings.length > 0) {
      const randomMapping = mappings[Math.floor(Math.random() * mappings.length)];
      const { data: songData } = await supabase
        .from("songs")
        .select("title, artist")
        .eq("id", randomMapping.song_id)
        .single();

      if (songData) {
        song = songData;
      }
    }

    console.log("Face emotion detected:", emotion, "Song:", song.title);

    return new Response(
      JSON.stringify({
        emotion,
        confidence,
        song,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in face emotion prediction:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});