# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import cv2
# import numpy as np
# import base64

# import os
# os.environ["TF_USE_LEGACY_KERAS"] = "1"

# from tensorflow.keras.models import load_model

# from tensorflow.keras.models import load_model
# from tensorflow.keras.preprocessing.image import img_to_array
# import mediapipe as mp
# import requests
# import random
# import os
# import traceback
# import subprocess
# import librosa
# from functools import lru_cache
# import os
# from dotenv import load_dotenv

from flask import Flask, request, jsonify
from flask_cors import CORS

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"

from dotenv import load_dotenv
load_dotenv()

import cv2
import numpy as np
import base64
import mediapipe as mp
import requests
import random
import traceback
import subprocess
import librosa

from functools import lru_cache

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array

# from mediapipe.tasks.python.vision import FaceDetector, FaceDetectorOptions
# from mediapipe.tasks.python.core.base_options import BaseOptions



# ✅ IMPORT DB
from database import get_db_connection

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
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# ================== Face Emotion ==================
MODEL_PATH_FACE = "refined_mini_xception.h5"
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

# LỖI
# mp_face_detection = mp.solutions.face_detection
# face_detection = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)

# VER2
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.5
)

# Khởi tạo FaceDetector
# base_options = BaseOptions(model_asset_path="E:\merged_partition_content\Khoi_Project\Mood2Music\Backend\refined_mini_xception.h5")
# options = FaceDetectorOptions(base_options=base_options)
# face_detection = FaceDetector.create_from_options(options)

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

# ================== EMOTION DATA ==================
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
        "message_vi": "Tôi chưa thể nhận diện rõ cảm xúc của bạn.",
        "keywords": ["popular songs", "top trending hits"]
    }
}

def get_emotion_info(emotion):
    return EMOTION_DATA.get(emotion.lower(), EMOTION_DATA["unknown"])

# ================== YOUTUBE ==================
@lru_cache(maxsize=32)
def search_youtube_music_cached(query):
    try:
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": 5,
            "key": YOUTUBE_API_KEY
        }
        response = requests.get(url, params=params)
        data = response.json()

        results = []
        for item in data.get("items", []):
            results.append({
                "title": item["snippet"]["title"],
                "video_id": item["id"]["videoId"]
            })
        return results
    except:
        return []

def search_youtube_music(emotion):
    keywords = get_emotion_info(emotion)["keywords"]
    return search_youtube_music_cached(random.choice(keywords))

# ================== FACE ==================
def predict_face_emotion(face_img):
    if model_face is None:
        return "Unknown", 0.0

    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, IMG_SIZE)
    normalized = resized.astype("float32") / 255.0
    reshaped = np.expand_dims(img_to_array(normalized), axis=0)

    preds = model_face.predict(reshaped, verbose=0)
    prob = np.max(preds)

    if prob < CONFIDENCE_THRESHOLD:
        return "Unknown", prob

    original = EMOTIONS_FACE[np.argmax(preds)]

    for k, v in GROUPED_EMOTIONS_FACE.items():
        if original in v:
            return k, prob

    return "Unknown", prob

# ================== API FACE ==================
@app.route('/predict_face', methods=['POST'])
def predict_face():
    try:
        image_base64 = request.json.get('image_base64')
        img_data = base64.b64decode(image_base64)
        np_img = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        results = face_detection.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))

        if not results.detections:
            return jsonify({"error": "No face detected"}), 400

        h, w, _ = img.shape
        bbox = results.detections[0].location_data.relative_bounding_box

        x, y = int(bbox.xmin*w), int(bbox.ymin*h)
        bw, bh = int(bbox.width*w), int(bbox.height*h)

        face = img[y:y+bh, x:x+bw]

        emotion, conf = predict_face_emotion(face)
        music = search_youtube_music(emotion)

        # ✅ SAVE DB
        try:
            conn = get_db_connection()
            cur = conn.cursor()

            cur.execute("""
                INSERT INTO emotion_history (emotion_type, source, confidence)
                VALUES (%s, %s, %s)
            """, (emotion, "face", float(conf)))

            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print("DB ERROR:", e)

        return jsonify({
            "emotion": emotion,
            "confidence": float(conf),
            "music": music
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ================== RUN ==================
if __name__ == '__main__':
    app.run(debug=True, port=5001)

