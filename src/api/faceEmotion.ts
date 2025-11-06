export interface EmotionPrediction {
  emotion: string;
  confidence: number;
}

export interface MusicSuggestion {
  title: string;
  url: string;
}

export interface FaceEmotionResponse {
  predictions: EmotionPrediction[];
  music_suggestions: MusicSuggestion[];
}

export async function predictFaceEmotion(formData: FormData): Promise<FaceEmotionResponse> {
  const res = await fetch("http://localhost:5001/predict_face", {
    method: "POST",
    body: formData,
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch prediction: ${res.statusText}`);
  }
  
  return res.json();
}
