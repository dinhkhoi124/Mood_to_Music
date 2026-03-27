# 🎧 Mood2Music — Emotion-Aware Music Recommendation System

> A full-stack AI system that recommends music based on **real-time human emotions** extracted from **face and voice**.

---

## 🚀 Overview

**Mood2Music** is an intelligent music recommendation system that leverages **Affective Computing** to deliver personalized music experiences. Instead of relying only on user history, the system dynamically adapts to the user’s **current emotional state** using:

- 🎭 **Facial Emotion Recognition (FER)**
- 🎤 **Speech Emotion Recognition (SER)**

By combining these modalities, Mood2Music provides **context-aware, real-time music recommendations**.

---

## 🧠 Key Features

- 🎥 **Face Emotion Detection** (via webcam)
- 🎙️ **Voice Emotion Detection** (via microphone)
- 🎵 Emotion-based **Music Recommendation**
- 🌐 Full-stack web application (Frontend + Backend + Supabase)
- ⚡ Lightweight models optimized for **real-time inference**
- 📊 Supports multiple emotions:
  - Happy 😄
  - Sad 😢
  - Angry 😠
  - Neutral 😐
  - Fear 😨
  - Surprise 😲
  - Disgust 🤢

---

## 🏗️ System Architecture
```
User (Webcam / Microphone)
↓
Frontend (React + Vite)
↓
API Layer
↓
Backend (Flask / Python)
↓
AI Models (FER + SER)
↓
Emotion Prediction
↓
Recommendation Engine
↓
Music Output 🎵

```
---
## 📁 Project Structure
```
.
├── 📁 Backend/                
│   ├── app.py                 
│   ├── database.py            
│   └── supabase_client.py     
├── 📁 Frontend/               
│   └── 📁 src/
│       ├── 📁 api/            
│       ├── 📁 components/     
│       ├── 📁 integrations/  
│       └── 📁 pages/          
├── 📁 supabase/              
│   ├── 📁 functions/          
│   │   ├── 📁 predict-face-emotion/   
│   │   ├── 📁 predict-voice-emotion/  
│   │   └── 📁 recommend-song/         
│   └── migrations/            
├── mood2music_schema.sql      
└── requirements.txt

```        


---

## 🤖 AI Models

### 🎭 Facial Emotion Recognition (FER)

- Model: **Mini-Xception (Modified)**
- Dataset: **FER2013**
- Input: 48×48 grayscale images
- Accuracy: ~67%
- Techniques:
  - Depthwise Separable Convolution
  - Mixup Augmentation
  - Batch Normalization + Dropout

👉 Designed for **lightweight & real-time inference**

---

### 🎤 Speech Emotion Recognition (SER)

- Model: **CNN + LSTM Hybrid**
- Dataset: **RAVDESS**
- Accuracy: ~92.89%
- Features:
  - MFCC
  - Chroma
  - Spectral Contrast
- Techniques:
  - SMOTE (class balancing)
  - Data augmentation (noise, pitch shift, time stretch)
  - Hyperparameter tuning

👉 Captures **temporal + acoustic patterns** in speech

---

## 🎵 Emotion → Music Mapping

| Emotion  | Music Type |
|----------|-----------|
| Happy    | Pop, EDM |
| Sad      | Acoustic, Piano |
| Angry    | Rock, Metal |
| Neutral  | Chill, Lo-fi |
| Fear     | Ambient |
| Surprise | Indie |
| Disgust  | Experimental |

---

## ⚙️ Installation

### 1. Clone repository

```bash
git clone https://github.com/your-username/mood2music.git
cd mood2music
```

### 2. Backend Setup

```
cd Backend
pip install -r requirements.txt
python app.py
```

### 3. Frontend Setup
```
cd Frontend
npm install
npm run dev
```

## 👤 Author
### Đinh Văn Anh Khôi

## ✍️ Interests
Computer Vision, Speech Processing, Recommender Systems, Multimodal AI system.
