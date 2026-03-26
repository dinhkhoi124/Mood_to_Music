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
# os.environ["TF_USE_LEGACY_KERAS"] = "1"

import keras


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

import jwt
import bcrypt
import datetime
from functools import wraps
from functools import lru_cache

# from tensorflow.keras.models import load_model
from keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array

from keras.utils.generic_utils import get_custom_objects
custom_objects = get_custom_objects()

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
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'super_secret_jwt_key_mood2music')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['sub']
        except Exception as e:
            return jsonify({'error': 'Token is invalid!'}), 401
            
        return f(current_user_id, *args, **kwargs)
    return decorated

def token_required_optional(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user_id = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                    current_user_id = data['sub']
                except Exception:
                    pass
        return f(current_user_id, *args, **kwargs)
    return decorated

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

import h5py
import json

def fix_keras_h5_compatibility(filepath):
    try:
        with h5py.File(filepath, 'r+') as f:
            if 'model_config' not in f.attrs:
                return
            model_config_raw = f.attrs.get('model_config')
            if isinstance(model_config_raw, bytes):
                model_config_raw = model_config_raw.decode('utf-8')
            else:
                model_config_raw = str(model_config_raw)
            
            model_config = json.loads(model_config_raw)
            
            # DEBUG: Dump the parsed config to a JSON file so we can inspect it safely
            import os
            base_name = os.path.basename(filepath)
            with open(f"debug_{base_name}.json", 'w') as out_f:
                json.dump(model_config, out_f, indent=2)
                
            fixed = False

            def clean_dict_recursively(d):
                is_fixed = False
                if isinstance(d, dict):
                    # Remove synchronized
                    if 'synchronized' in d:
                        del d['synchronized']
                        is_fixed = True
                    
                    # Fix DTypePolicy
                    if 'dtype' in d and isinstance(d['dtype'], dict):
                        if d['dtype'].get('class_name') in ['DTypePolicy', 'Policy']:
                            d['dtype'] = d['dtype'].get('config', {}).get('name', 'float32')
                            is_fixed = True
                    
                    # Recursion
                    for k, v in list(d.items()):
                        if isinstance(v, dict):
                            if v.get('class_name') in ['DTypePolicy', 'Policy']:
                                d[k] = v.get('config', {}).get('name', 'float32')
                                is_fixed = True
                            else:
                                if clean_dict_recursively(v):
                                    is_fixed = True
                        elif isinstance(v, list):
                            if clean_dict_recursively(v):
                                is_fixed = True

                elif isinstance(d, list):
                    for i in range(len(d)):
                        v = d[i]
                        if isinstance(v, dict):
                            if v.get('class_name') in ['DTypePolicy', 'Policy']:
                                d[i] = v.get('config', {}).get('name', 'float32')
                                is_fixed = True
                            else:
                                if clean_dict_recursively(v):
                                    is_fixed = True
                        elif isinstance(v, list):
                            if clean_dict_recursively(v):
                                is_fixed = True
                return is_fixed

            if clean_dict_recursively(model_config):
                fixed = True

            if 'config' in model_config and 'layers' in model_config['config']:
                for layer in model_config['config']['layers']:
                    if isinstance(layer, dict) and 'config' in layer:
                        is_input = layer.get('class_name') == 'InputLayer'
                        
                        if not is_input:
                            if 'batch_shape' in layer['config']:
                                del layer['config']['batch_shape']
                                fixed = True
                        else: # This means it's an InputLayer
                            if 'batch_shape' in layer['config']:
                                layer['config']['batch_input_shape'] = layer['config'].pop('batch_shape')
                                fixed = True

                            if 'cnn_lstm' in filepath.lower() or 'voice' in filepath.lower():
                                expected_shape = [None, 30, 150, 1]
                                if layer['config'].get('batch_input_shape') != expected_shape:
                                    layer['config']['batch_input_shape'] = expected_shape
                                    fixed = True
                            else: # For other input layers (like face model)
                                if 'batch_input_shape' not in layer['config']:
                                    layer['config']['batch_input_shape'] = [None, 48, 48, 1]
                                    fixed = True

                    # Down-convert inbound_nodes to legacy list of lists format
                    if isinstance(layer, dict) and 'inbound_nodes' in layer:
                        def extract_keras_tensors(item):
                            if isinstance(item, dict):
                                if item.get('class_name') == '__keras_tensor__':
                                    kh = item.get('config', {}).get('keras_history')
                                    if kh:
                                        # Keras legacy format expects 4 elements: [layer_name, node_idx, tensor_idx, kwargs]
                                        # But kh is just [layer_name, node_idx, tensor_idx]
                                        # So we append an empty dict for kwargs
                                        return kh + [{}]
                                    return item
                                else:
                                    return {k: extract_keras_tensors(v) for k, v in item.items()}
                            elif isinstance(item, list):
                                return [extract_keras_tensors(x) for x in item]
                            return item

                        # Extract any __keras_tensor__ dicts into legacy connection tuples
                        extracted = extract_keras_tensors(layer['inbound_nodes'])
                        
                        # Fix for Merge layers like Add, which Keras 3 nests in an extra list
                        new_extracted = []
                        for node in extracted:
                            if isinstance(node, list) and len(node) == 1 and isinstance(node[0], list):
                                if len(node[0]) > 0 and isinstance(node[0][0], list):
                                    new_extracted.append(node[0])
                                    fixed = True
                                    continue
                            new_extracted.append(node)
                        extracted = new_extracted
                        
                        # sometimes Keras 3 puts everything in single extra list wrapper, or handles masks.
                        # we can also remove the 'mask' argument.
                        def remove_mask(item):
                            if isinstance(item, list):
                                if len(item) == 4 and isinstance(item[-1], dict):
                                    if 'mask' in item[-1]:
                                        del item[-1]['mask']
                                        nonlocal fixed
                                        fixed = True
                                for x in item:
                                    remove_mask(x)
                        remove_mask(extracted)
                        
                        layer['inbound_nodes'] = extracted
            
            if fixed:
                f.attrs.modify('model_config', json.dumps(model_config).encode('utf-8'))
                print(f"Fixed {filepath}: Compatibility issues resolved in config")
    except Exception as e:
        print(f"Could not fix {filepath}: {e}")

import traceback

try:
    fix_keras_h5_compatibility(MODEL_PATH_FACE)
    model_face = load_model(MODEL_PATH_FACE, custom_objects=custom_objects, compile=False)
except Exception as e:
    print(f"WARNING: Could not load face model:")
    traceback.print_exc()
    model_face = None

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
    fix_keras_h5_compatibility(MODEL_PATH_VOICE)
    voice_model = load_model(MODEL_PATH_VOICE, custom_objects=custom_objects, compile=False)
except Exception as e:
    print(f"WARNING: Could not load voice model:")
    traceback.print_exc()
    voice_model = None

VOICE_EMOTIONS = ['Neutral', 'Calm', 'Happy', 'Sad', 'Angry', 'Fear', 'Disgust', 'Surprise']

GROUPED_EMOTIONS_VOICE = {
    'Happy': ['Happy', 'Surprise', 'Calm'],
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

# ================== VOICE ==================
def convert_audio_to_wav(input_path, output_path):
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    command = [
        ffmpeg_exe, '-i', input_path, '-f', 'wav', '-acodec', 'pcm_s16le',
        '-ar', '16000', '-ac', '1', '-loglevel', 'error', '-y', output_path
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
@token_required_optional
def predict_voice(current_user_id):
    if voice_model is None:
        return jsonify({"error": "Voice model not loaded."}), 503
    try:
        data = request.json or {}
        audio_base64 = data.get('audioData')
        if not audio_base64:
            return jsonify({"error": "No audio data provided"}), 400

        if ',' in audio_base64:
            audio_base64 = audio_base64.split(',')[1]

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
        message_to_speak = emotion_info.get("message_vi", "")
        music = search_youtube_music(grouped_emotion)

        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)

        # ✅ SAVE DB
        if current_user_id:
            try:
                conn = get_db_connection()
                cur = conn.cursor()

                cur.execute("""
                    INSERT INTO emotion_history (user_id, emotion_type, source, confidence)
                    VALUES (%s, %s, %s, %s)
                """, (current_user_id, grouped_emotion, "voice", float(max_prob)))

                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                print("DB ERROR:", e)

        return jsonify({
            "predictions": [{"emotion": grouped_emotion, "confidence": round(float(max_prob), 2)}],
            "message": message_to_speak,
            "music_suggestions": music
        }), 200

    except Exception as e:
        print("Error in predict_voice:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ================== AUTH API ==================
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name', '')
    
    if not email or not password:
        return jsonify({'error': 'Missing email or password'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        return jsonify({'error': 'Email already exists'}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    cur.execute(
        "INSERT INTO users (email, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id, email, full_name, avatar_url",
        (email, hashed_password, full_name)
    )
    new_user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    user_data = {
        'id': new_user[0], 'email': new_user[1], 'full_name': new_user[2], 'avatar_url': new_user[3]
    }
    token = jwt.encode({
        'sub': new_user[0],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'token': token, 'user': user_data}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, email, password_hash, full_name, avatar_url FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not bcrypt.checkpw(password.encode('utf-8'), user[2].encode('utf-8')):
        return jsonify({'error': 'Invalid email or password'}), 401

    user_data = {
        'id': user[0], 'email': user[1], 'full_name': user[3], 'avatar_url': user[4]
    }
    token = jwt.encode({
        'sub': user[0],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({'token': token, 'user': user_data}), 200

# ================== PROFILE API ==================
@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, email, full_name, avatar_url FROM users WHERE id = %s", (current_user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'id': user[0], 'email': user[1], 'full_name': user[2], 'avatar_url': user[3]}), 200

@app.route('/api/user/profile', methods=['PUT'])
@token_required
def update_profile(current_user_id):
    data = request.json
    full_name = data.get('full_name')
    avatar_url = data.get('avatar_url')
    
    conn = get_db_connection()
    cur = conn.cursor()
    if full_name is not None:
        cur.execute("UPDATE users SET full_name = %s WHERE id = %s", (full_name, current_user_id))
    if avatar_url is not None:
        cur.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (avatar_url, current_user_id))
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'Profile updated successfully'}), 200

# ================== EMOTION HISTORY API ==================
@app.route('/api/emotion_history', methods=['GET'])
@token_required
def get_history(current_user_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, emotion_type, source, confidence, created_at FROM emotion_history WHERE user_id = %s ORDER BY created_at DESC", (current_user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    history = []
    for r in rows:
        history.append({
            'id': r[0],
            'emotion_type': r[1],
            'source': r[2],
            'confidence': float(r[3]) if r[3] is not None else 0.0,
            'created_at': r[4].isoformat() if r[4] else None
        })
    return jsonify(history), 200

@app.route('/api/emotion_history/<string:history_id>', methods=['DELETE'])
@token_required
def delete_history(current_user_id, history_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM emotion_history WHERE id = %s AND user_id = %s", (history_id, current_user_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'History deleted successfully'}), 200

# ================== API FACE ==================
@app.route('/predict_face', methods=['POST'])
@token_required_optional
def predict_face(current_user_id):
    try:
        if 'file' in request.files:
            file = request.files['file']
            np_img = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        else:
            image_base64 = request.json.get('image_base64')
            if not image_base64:
                return jsonify({"error": "No image provided"}), 400
            
            # Remove data URI header if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
                
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
        if current_user_id:
            try:
                conn = get_db_connection()
                cur = conn.cursor()

                cur.execute("""
                    INSERT INTO emotion_history (user_id, emotion_type, source, confidence)
                    VALUES (%s, %s, %s, %s)
                """, (current_user_id, emotion, "face", float(conf)))

                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                print("DB ERROR:", e)

        emotion_info = get_emotion_info(emotion)
        message_to_speak = emotion_info.get("message_vi", "")

        return jsonify({
            "predictions": [{"emotion": emotion, "confidence": float(conf) * 100}],
            "message": message_to_speak,
            "music_suggestions": music
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ================== RUN ==================
if __name__ == '__main__':
    app.run(debug=True, port=5001)

