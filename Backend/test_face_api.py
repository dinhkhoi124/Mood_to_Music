# ================== Ví dụ kiểm tra bằng Python ==================

# Sử dụng thư viện requests để kiểm tra API
import requests

# Gửi ảnh dưới dạng form-data
url = "http://localhost:5001/predict_face"
# url = "http://localhost:5001/"

files = {'image': open('D:\\FALL25_KHOIIII\\DAT301m\\FinalProject_Mood2Music\\FACE\\image\\face.jpg', 'rb')}
response = requests.post(url, files=files)
print(response.json())

# Gửi ảnh dưới dạng base64
import base64
with open("D:\\FALL25_KHOIIII\\DAT301m\\FinalProject_Mood2Music\\FACE\\image\\face.jpg", "rb") as img_file:
    base64_string = base64.b64encode(img_file.read()).decode('utf-8')
response = requests.post(url, json={"image_base64": base64_string})
print(response.json())
