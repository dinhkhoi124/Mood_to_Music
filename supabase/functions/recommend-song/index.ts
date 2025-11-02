import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { emotion } = await req.json();

    if (!emotion) {
      return new Response(
        JSON.stringify({ error: "Emotion is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get song recommendations based on emotion
    // First, get songs mapped to this emotion
    const { data: mappings, error: mappingError } = await supabase
      .from("emotion_song_mapping")
      .select("song_id, weight")
      .eq("emotion_type", emotion.toLowerCase())
      .order("weight", { ascending: false })
      .limit(10);

    if (mappingError) {
      console.error("Error fetching emotion mappings:", mappingError);
    }

    let recommendations = [];

    if (mappings && mappings.length > 0) {
      // Get song details for mapped songs
      const songIds = mappings.map((m) => m.song_id);
      const { data: songs, error: songsError } = await supabase
        .from("songs")
        .select("*")
        .in("id", songIds);

      if (songsError) {
        console.error("Error fetching songs:", songsError);
      } else {
        recommendations = songs || [];
      }
    }

    // If no mappings found, get popular songs based on emotion characteristics
    if (recommendations.length === 0) {
      const emotionCharacteristics: Record<string, any> = {
        happy: { minValence: 0.6, minEnergy: 0.5 },
        sad: { maxValence: 0.4, maxEnergy: 0.5 },
        energetic: { minEnergy: 0.7, minTempo: 120 },
        calm: { maxEnergy: 0.4, maxTempo: 100 },
        neutral: { minValence: 0.4, maxValence: 0.6 },
      };

      const chars = emotionCharacteristics[emotion.toLowerCase()] || {};

      let query = supabase.from("songs").select("*");

      if (chars.minValence !== undefined) {
        query = query.gte("valence", chars.minValence);
      }
      if (chars.maxValence !== undefined) {
        query = query.lte("valence", chars.maxValence);
      }
      if (chars.minEnergy !== undefined) {
        query = query.gte("energy", chars.minEnergy);
      }
      if (chars.maxEnergy !== undefined) {
        query = query.lte("energy", chars.maxEnergy);
      }
      if (chars.minTempo !== undefined) {
        query = query.gte("tempo", chars.minTempo);
      }
      if (chars.maxTempo !== undefined) {
        query = query.lte("tempo", chars.maxTempo);
      }

      const { data: songs, error: songsError } = await query
        .order("popularity", { ascending: false })
        .limit(10);

      if (songsError) {
        console.error("Error fetching songs by characteristics:", songsError);
      } else {
        recommendations = songs || [];
      }
    }

    console.log(`Found ${recommendations.length} recommendations for emotion: ${emotion}`);

    return new Response(
      JSON.stringify({
        emotion,
        recommendations,
        count: recommendations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in recommend-song function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
