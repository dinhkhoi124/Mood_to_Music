# Mood2Music API Documentation

## Base URL
```
https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📁 Endpoints

### 🧑‍💻 User Management

#### 1. Register New User
**POST** `/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "message": "Registration successful"
}
```

**cURL Example:**
```bash
curl -X POST https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"test123","full_name":"John Doe"}'
```

---

#### 2. Login
**POST** `/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "session": {
    "access_token": "jwt-token-here",
    "refresh_token": "refresh-token-here"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"test123"}'
```

---

#### 3. Get User Profile
**GET** `/user-profile`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": null,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**cURL Example:**
```bash
curl -X GET https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/user-profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### 🎧 Music Management

#### 4. Get All Songs
**GET** `/music?limit=50&offset=0&genre=pop`

**Query Parameters:**
- `limit` (optional): Number of songs to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `genre` (optional): Filter by genre

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "title": "Happy Song",
    "artist": "Artist Name",
    "album": "Album Name",
    "genre": "pop",
    "duration_ms": 180000,
    "popularity": 85,
    "energy": 0.8,
    "valence": 0.9,
    "tempo": 120,
    "spotify_url": "https://...",
    "youtube_url": "https://...",
    "preview_url": "https://..."
  }
]
```

**cURL Example:**
```bash
curl -X GET "https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/music?limit=10&genre=pop"
```

---

#### 5. Get Single Song
**GET** `/music/{song_id}`

**Response (200):**
```json
{
  "id": "uuid-here",
  "title": "Happy Song",
  "artist": "Artist Name",
  "album": "Album Name",
  "genre": "pop",
  "duration_ms": 180000,
  "popularity": 85
}
```

**cURL Example:**
```bash
curl -X GET https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/music/{song_id}
```

---

#### 6. Create New Song
**POST** `/music`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "New Song",
  "artist": "Artist Name",
  "album": "Album Name",
  "genre": "pop",
  "duration_ms": 200000,
  "energy": 0.7,
  "valence": 0.8,
  "tempo": 125,
  "popularity": 70
}
```

**Response (201):**
```json
{
  "id": "uuid-here",
  "title": "New Song",
  "artist": "Artist Name",
  ...
}
```

**cURL Example:**
```bash
curl -X POST https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/music \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Song","artist":"Artist Name","genre":"pop"}'
```

---

#### 7. Update Song
**PUT** `/music/{song_id}`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Updated Song Title",
  "popularity": 90
}
```

**cURL Example:**
```bash
curl -X PUT https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/music/{song_id} \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Song","popularity":90}'
```

---

#### 8. Delete Song
**DELETE** `/music/{song_id}`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Song deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/music/{song_id} \
  -H "Authorization: Bearer <jwt-token>"
```

---

### 😄 Emotion Prediction

#### 9. Predict Voice Emotion
**POST** `/predict-voice-emotion`

**Request Body:**
```json
{
  "audio_url": "https://example.com/audio.wav"
}
```
OR
```json
{
  "audio_base64": "base64-encoded-audio-data"
}
```

**Response (200):**
```json
{
  "emotion": "happy",
  "confidence": 0.87,
  "song": {
    "title": "Happy Song",
    "artist": "Artist Name"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/predict-voice-emotion \
  -H "Content-Type: application/json" \
  -d '{"audio_url":"https://example.com/audio.wav"}'
```

**Note:** This endpoint will attempt to connect to Flask API at `FLASK_API_URL` (default: http://localhost:5000/predict_voice). If Flask is unavailable, it will use mock data as fallback.

---

#### 10. Predict Face Emotion
**POST** `/predict-face-emotion`

**Request Body:**
```json
{
  "image_url": "https://example.com/face.jpg"
}
```
OR
```json
{
  "image_base64": "base64-encoded-image-data"
}
```

**Response (200):**
```json
{
  "emotion": "sad",
  "confidence": 0.82,
  "song": {
    "title": "Sad Song",
    "artist": "Artist Name"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/predict-face-emotion \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/face.jpg"}'
```

**Note:** This endpoint will attempt to connect to Flask API at `FLASK_API_URL` (default: http://localhost:5000/predict_face). If Flask is unavailable, it will use mock data as fallback.

---

### 🕓 History Management

#### 11. Get User History
**GET** `/history?limit=50&offset=0`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "user_id": "uuid-here",
    "emotion_type": "happy",
    "source": "voice",
    "confidence": 0.85,
    "song_title": "Happy Song",
    "song_artist": "Artist Name",
    "song_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET "https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/history?limit=20" \
  -H "Authorization: Bearer <jwt-token>"
```

---

#### 12. Create History Entry
**POST** `/history`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "emotion_type": "happy",
  "source": "voice",
  "confidence": 0.85,
  "song_title": "Happy Song",
  "song_artist": "Artist Name",
  "song_url": "https://spotify.com/..."
}
```

**Response (201):**
```json
{
  "id": "uuid-here",
  "user_id": "uuid-here",
  "emotion_type": "happy",
  "source": "voice",
  "confidence": 0.85,
  "song_title": "Happy Song",
  "song_artist": "Artist Name",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**cURL Example:**
```bash
curl -X POST https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/history \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"emotion_type":"happy","source":"voice","confidence":0.85,"song_title":"Happy Song","song_artist":"Artist"}'
```

---

### 💡 Song Recommendations

#### 13. Get Song Recommendations by Emotion
**POST** `/recommend-song`

**Request Body:**
```json
{
  "emotion": "happy"
}
```

**Response (200):**
```json
{
  "emotion": "happy",
  "recommendations": [
    {
      "id": "uuid-here",
      "title": "Happy Song 1",
      "artist": "Artist Name",
      "album": "Album",
      "genre": "pop",
      "energy": 0.8,
      "valence": 0.9
    }
  ],
  "count": 5
}
```

**cURL Example:**
```bash
curl -X POST https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1/recommend-song \
  -H "Content-Type: application/json" \
  -d '{"emotion":"happy"}'
```

---

## 📂 Folder Structure

```
supabase/functions/
├── register/
│   └── index.ts
├── login/
│   └── index.ts
├── user-profile/
│   └── index.ts
├── music/
│   └── index.ts
├── predict-voice-emotion/
│   └── index.ts
├── predict-face-emotion/
│   └── index.ts
├── history/
│   └── index.ts
└── recommend-song/
    └── index.ts
```

---

## 🚀 Deployment

All edge functions are automatically deployed when you push code to Lovable Cloud.

To manually test or deploy via Supabase CLI:

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy register
```

---

## 🔌 Flask Integration

The emotion prediction endpoints (`predict-voice-emotion` and `predict-face-emotion`) are designed to connect to your Flask AI model server.

**Flask Server Requirements:**

1. **Voice Emotion Endpoint:**
   - URL: `http://localhost:5000/predict_voice` (or set `FLASK_API_URL`)
   - Method: POST
   - Request: `{"audio_url": "...", "audio_base64": "..."}`
   - Response: `{"emotion": "happy", "confidence": 0.85}`

2. **Face Emotion Endpoint:**
   - URL: `http://localhost:5000/predict_face` (or set `FLASK_API_URL`)
   - Method: POST
   - Request: `{"image_url": "...", "image_base64": "..."}`
   - Response: `{"emotion": "sad", "confidence": 0.82}`

**Fallback Behavior:**
If Flask server is not available, the endpoints will automatically use mock data to return random emotions with confidence scores.

---

## 🧪 Testing with Postman

1. Import the collection using the endpoint examples above
2. Set environment variables:
   - `base_url`: `https://lpwydvsydvwlqluvxwei.supabase.co/functions/v1`
   - `jwt_token`: (get from login endpoint)
3. Test each endpoint sequentially

---

## ✅ Status

✅ Real backend API with Supabase Edge Functions  
✅ User authentication (register, login, profile)  
✅ Music CRUD operations  
✅ Emotion prediction (with Flask integration)  
✅ History tracking  
✅ Song recommendations  
✅ Ready for frontend integration  
✅ Ready for Flask AI model integration
