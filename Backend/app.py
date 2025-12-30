from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import mediapipe as mp
import requests
import random
import os
import traceback
import subprocess
import librosa
from functools import lru_cache

# ================== Cấu hình thư mục tạm ==================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp")

os.environ['TMPDIR'] = TEMP_DIR
os.environ['TEMP'] = TEMP_DIR
os.environ['TMP'] = TEMP_DIR

os.makedirs(TEMP_DIR, exist_ok=True)

# ================== Khởi tạo Flask app ==================
app = Flask(__name__)
CORS(app)

# ================== Cấu hình chung ==================
CONFIDENCE_THRESHOLD = 0.3
YOUTUBE_API_KEY = "AIzaSyAVWPPgYh0NgK4I0p3sBL2ZL0qFE-EDUJ8"

# ================== Face Emotion ==================
MODEL_PATH_FACE = "best_mini_xception_fer2013_balanced_mixup.h5"
IMG_SIZE = (48, 48)
GROUPED_EMOTIONS_FACE = {
    'Happy': ['Happy', 'Surprise'],
    'Sad': ['Sad', 'Angry', 'Disgust', 'Fear'],
    'Neutral': ['Neutral']
}
EMOTIONS_FACE = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

try:
    model_face = load_model(MODEL_PATH_FACE)
except Exception as e:
    print(f"WARNING: Could not load face model: {e}")
    model_face = None

mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)

# ================== Voice Emotion ==================
MODEL_PATH_VOICE = "cnn_lstm_model_optimized_final_v6.h5"
try:
    voice_model = load_model(MODEL_PATH_VOICE)
except Exception as e:
    print(f"WARNING: Could not load voice model: {e}")
    voice_model = None

VOICE_EMOTIONS = ['Neutral', 'Happy', 'Sad', 'Angry', 'Fear', 'Disgust', 'Surprise']
GROUPED_EMOTIONS_VOICE = {
    'Happy': ['Happy', 'Surprise'],
    'Sad': ['Sad', 'Angry', 'Disgust', 'Fear'],
    'Neutral': ['Neutral']
}

# ================== EMOTION MESSAGES & KEYWORDS ==================
EMOTION_DATA = {
    "happy": {
        "message_vi": "Tuyệt vời! Hãy tận hưởng những điều tuyệt vời đang diễn ra nhé.",
        "keywords": ["nhạc vui vẻ sôi động Việt Nam", "vibe tích cực chill", "Happy Pop hits"]
    },
    "sad": {
        "message_vi": "Không sao đâu, mọi chuyện rồi sẽ ổn thôi. Hãy nghe một chút nhạc nhẹ nhàng để thư giãn nhé.",
        "keywords": ["nhạc chill buồn nhẹ nhàng", "Acoustic Ballad Việt", "nhạc chữa lành"]
    },
    "neutral": {
        "message_vi": "Bạn đang ở trạng thái cân bằng. Cùng nghe nhạc Lo-fi để tập trung hơn nhé.",
        "keywords": ["lo-fi study beats", "ambient chill music", "nhạc tập trung làm việc"]
    },
    "angry": {
        "message_vi": "Hít thở sâu nào! Cùng nghe nhạc không lời để lấy lại sự bình tĩnh nhé.",
        "keywords": ["nhạc không lời giảm stress", "calm instrumental music", "nhạc thiền thư giãn"]
    },
    "fear": {
        "message_vi": "Hãy can đảm lên! Một bài hát mạnh mẽ sẽ giúp bạn quên đi nỗi lo.",
        "keywords": ["nhạc rock mạnh mẽ", "nhạc truyền cảm hứng", "energetic workout music"]
    },
    "disgust": {
        "message_vi": "Đừng để điều đó làm phiền bạn. Hãy nghe một bản nhạc vui để thay đổi tâm trạng.",
        "keywords": ["nhạc vui tươi K-pop", "upbeat J-Pop", "top trending hits"]
    },
    "surprise": {
        "message_vi": "Ồ, thật bất ngờ! Hãy cùng khuấy động không khí bằng một bản nhạc sôi động nào.",
        "keywords": ["nhạc EDM sôi động", "upbeat pop hits", "nhạc dance remix"]
    },
    "unknown": {
        "message_vi": "Tôi chưa thể nhận diện rõ cảm xúc của bạn. Mời bạn nghe thử danh sách nhạc phổ biến nhé.",
        "keywords": ["popular songs 2024", "top trending hits", "nhạc thịnh hành"]
    }
}


def get_emotion_info(emotion):
    """Lấy thông điệp và từ khóa nhạc dựa trên cảm xúc."""
    emotion_key = emotion.lower()
    return EMOTION_DATA.get(emotion_key, EMOTION_DATA["unknown"])


# ================== Hàm tiện ích (ĐÃ THÊM CACHING) ==================
@lru_cache(maxsize=32)
def search_youtube_music_cached(query):
    try:
        print(f"--- Calling YouTube API for query: {query} ---")
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": 8,  # Giữ nguyên 8 theo yêu cầu
            "key": YOUTUBE_API_KEY
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        music_suggestions = []
        for item in data.get("items", []):
            video_id = item["id"]["videoId"]
            title = item["snippet"]["title"]
            music_suggestions.append({"title": title, "video_id": video_id})

        return music_suggestions
    except Exception as e:
        print(f"Error during YouTube search: {str(e)}")
        return []


def search_youtube_music(emotion):
    """Chọn từ khóa ngẫu nhiên và gọi hàm cache."""
    emotion_info = get_emotion_info(emotion)
    keywords = emotion_info["keywords"]
    query = random.choice(keywords)  # Chọn 1 từ khóa ngẫu nhiên

    # Gọi hàm cache với từ khóa đã chọn
    return search_youtube_music_cached(query)


# ================== Face Emotion Logic ==================
def predict_face_emotion(face_img):
    if model_face is None:
        return "Unknown", 0.0
    try:
        gray_face = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        gray_face = cv2.equalizeHist(gray_face)
        gray_face = cv2.GaussianBlur(gray_face, (3, 3), 0)
        resized = cv2.resize(gray_face, IMG_SIZE)
        normalized = resized.astype("float32") / 255.0
        reshaped = img_to_array(normalized)
        reshaped = np.expand_dims(reshaped, axis=0)

        preds = model_face.predict(reshaped, verbose=0)
        max_prob = np.max(preds)
        if max_prob < CONFIDENCE_THRESHOLD:
            return "Unknown", max_prob

        original_emotion = EMOTIONS_FACE[np.argmax(preds)]
        for group_label, members in GROUPED_EMOTIONS_FACE.items():
            if original_emotion in members:
                return group_label, max_prob
        return "Unknown", max_prob
    except Exception as e:
        raise ValueError(f"Error during face emotion prediction: {str(e)}")


@app.route('/predict_face', methods=['POST'])
def predict_face():
    try:
        content_type = request.content_type or ""
        if content_type.startswith("multipart/form-data"):
            if 'image' not in request.files and 'file' not in request.files:
                return jsonify({"error": "No image provided"}), 400
            file = request.files.get('image') or request.files.get('file')
            np_img = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        elif content_type == "application/json":
            image_base64 = request.json.get('image_base64')
            if not image_base64:
                return jsonify({"error": "No image provided"}), 400
            img_data = base64.b64decode(image_base64)
            np_img = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        else:
            return jsonify({"error": "Unsupported Content-Type"}), 415

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_detection.process(img_rgb)

        if not results.detections:
            return jsonify({"error": "No face detected"}), 400

        predictions = []
        ih, iw, _ = img.shape
        for detection in results.detections:
            bboxC = detection.location_data.relative_bounding_box
            x = int(bboxC.xmin * iw)
            y = int(bboxC.ymin * ih)
            w = int(bboxC.width * iw)
            h = int(bboxC.height * ih)

            if w < 50 or h < 50 or x < 0 or y < 0:
                continue

            face_img = img[y:y + h, x:x + w]
            emotion, confidence = predict_face_emotion(face_img)
            predictions.append({"emotion": emotion, "confidence": round(confidence * 100, 2)})

        if not predictions:
            return jsonify({"error": "No valid face detected"}), 400

        primary_emotion = predictions[0]["emotion"]
        emotion_info = get_emotion_info(primary_emotion)
        message_to_speak = emotion_info["message_vi"]

        music_suggestions = search_youtube_music(primary_emotion)

        return jsonify({
            "predictions": predictions,
            "message": message_to_speak,
            "music_suggestions": music_suggestions
        }), 200
    except Exception as e:
        print("Error in predict_face:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ================== Voice Emotion Logic ==================
def convert_audio_to_wav(input_path, output_path):
    command = [
        'ffmpeg',
        '-i', input_path,
        '-f', 'wav',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-loglevel', 'error',
        '-y',
        output_path
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.strip() or f"FFmpeg exited with return code {e.returncode}"
        raise RuntimeError(f"FFmpeg conversion failed: {error_msg}")
    except FileNotFoundError:
        raise RuntimeError("FFmpeg executable not found. Ensure it is in system PATH.")


def preprocess_audio(file_path, n_mfcc=30, max_pad_len=150):
    try:
        y, sr = librosa.load(file_path, sr=16000)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
        pad_width = max_pad_len - mfccs.shape[1]
        if pad_width > 0:
            mfccs = np.pad(mfccs, pad_width=((0, 0), (0, pad_width)), mode='constant')
        elif pad_width < 0:
            mfccs = mfccs[:, :max_pad_len]
        mfccs_reshaped = np.expand_dims(mfccs, axis=0)
        mfccs_reshaped = np.expand_dims(mfccs_reshaped, axis=-1)
        return mfccs_reshaped
    except Exception as e:
        raise ValueError(f"Error during audio preprocessing: {str(e)}")


def group_emotion_voice(original_emotion):
    for group_label, members in GROUPED_EMOTIONS_VOICE.items():
        if original_emotion in members:
            return group_label
    return "Unknown"


@app.route('/predict_voice', methods=['POST'])
def predict_voice():
    if voice_model is None:
        return jsonify({"error": "Voice model not loaded."}), 503
    try:
        data = request.json or {}
        audio_base64 = data.get('audioData')
        if not audio_base64:
            return jsonify({"error": "No audio data provided"}), 400

        audio_bytes = base64.b64decode(audio_base64)

        input_rand = random.randint(1000, 9999)
        temp_input_path = os.path.join(TEMP_DIR, f"temp_audio_input_{input_rand}.webm")
        with open(temp_input_path, "wb") as f:
            f.write(audio_bytes)

        temp_wav_path = os.path.join(TEMP_DIR, f"temp_audio_output_{input_rand}.wav")
        convert_audio_to_wav(temp_input_path, temp_wav_path)

        processed = preprocess_audio(temp_wav_path)
        preds = voice_model.predict(processed, verbose=0)
        max_prob = np.max(preds)

        if max_prob < CONFIDENCE_THRESHOLD:
            grouped_emotion = "Unknown"
        else:
            idx = np.argmax(preds)
            original_emotion = VOICE_EMOTIONS[idx]
            grouped_emotion = group_emotion_voice(original_emotion)

        emotion_info = get_emotion_info(grouped_emotion)
        message_to_speak = emotion_info["message_vi"]

        music_suggestions = search_youtube_music(grouped_emotion)

        # Xóa file tạm (có kiểm tra tồn tại cho chắc)
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)

        return jsonify({
            "predictions": [{"emotion": grouped_emotion, "confidence": round(float(max_prob) * 100, 2)}],
            "message": message_to_speak,
            "music_suggestions": music_suggestions
        }), 200

    except Exception as e:
        print("Error in predict_voice:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ================== Chạy ứng dụng ==================
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001, debug=True)
