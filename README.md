# 🛠️ HƯỚNG DẪN THIẾT LẬP MÔI TRƯỜNG DỰ ÁN (WINDOWS)

Tài liệu này hướng dẫn cách cài đặt công cụ cần thiết (FFmpeg) và kích hoạt môi trường ảo Python (`venv`) để chạy Backend (Flask) của dự án.

---

## 1. 🎵 Cài Đặt FFmpeg và Thêm vào PATH

FFmpeg là công cụ bắt buộc để Backend có thể chuyển đổi file âm thanh WebM sang WAV cho quá trình phân tích giọng nói.

### Phương pháp 1: Thêm vào System PATH (Khuyến nghị)

Đây là phương pháp sạch sẽ và dễ quản lý nhất.

1.  **Tải FFmpeg:**

    - Tru cập trang web chính thức hoặc nguồn uy tín (ví dụ: Bản dựng của Gyan) để tải xuống phiên bản nén **`ffmpeg-*-full_build.zip`** cho Windows.
    - Giải nén file ZIP.
    - Đổi tên thư mục giải nén thành **`ffmpeg`** và di chuyển nó đến một vị trí cố định, dễ tìm, ví dụ: **`C:\ffmpeg`**.

2.  **Thêm vào Biến Môi trường PATH:**

    - Nhấn `Windows` và gõ **"environment"**, sau đó chọn **"Edit the system environment variables"**.
    - Trong cửa sổ System Properties, chọn tab **Advanced**.
    - Nhấn nút **Environment Variables**.
    - Trong phần **System variables**, tìm và chọn biến **`Path`**, sau đó nhấn **Edit**.
    - Nhấn **New** và thêm đường dẫn đến thư mục **`bin`** bên trong thư mục FFmpeg của bạn:
      > **`C:\ffmpeg\bin`**
    - Nhấn **OK** để đóng tất cả cửa sổ.

3.  **Kiểm tra trong VS Code Terminal:**
    - **Bắt buộc:** Đóng hoàn toàn và mở lại **Terminal** trong VS Code.
    - Gõ lệnh:
      ```bash
      ffmpeg -version
      ```
    - Nếu hiển thị thông tin phiên bản, quá trình cài đặt đã thành công.

---

### Phương pháp 2: Thêm vào PATH của Môi trường Ảo (Tùy chọn)

Sử dụng khi bạn muốn giới hạn FFmpeg chỉ hoạt động trong môi trường ảo của dự án.

1.  **Cài đặt FFmpeg:** Thực hiện Bước 1 trong Phương pháp 1 (Tải và đặt ở `C:\ffmpeg\bin`).

2.  **Chỉnh sửa file kích hoạt:**

    - Mở file **`venv\Scripts\activate.bat`** (cho CMD Terminal) hoặc **`venv\Scripts\activate.ps1`** (cho PowerShell Terminal) bằng VS Code.
    - Thêm đường dẫn đến FFmpeg vào biến PATH của môi trường ảo:

    **a) Cho `activate.bat` (CMD/Command Prompt):**
    Thêm hai dòng sau **trước** dòng `set "PATH=%VIRTUAL_ENV%\Scripts;%PATH%"`.

    ```bat
    :: Thêm đường dẫn tới thư mục bin của FFmpeg
    set "FFMPEG_PATH=C:\ffmpeg\bin"
    set "PATH=%FFMPEG_PATH%;%PATH%"
    ```

    **b) Cho `activate.ps1` (PowerShell):**
    Thêm các dòng sau vào phần đầu file.

    ```powershell
    # Thêm đường dẫn tới thư mục bin của FFmpeg
    $ffmpegPath = "C:\ffmpeg\bin"
    $env:Path = "$ffmpegPath;$env:Path"
    ```

3.  **Kích hoạt và Kiểm tra:** Mở Terminal mới, kích hoạt `venv` và chạy `ffmpeg -version`.

---

## 2. 💻 Kích Hoạt Môi Trường Ảo (`venv`)

Sau khi FFmpeg đã sẵn sàng, bạn cần kích hoạt môi trường ảo để chạy Backend Python.

| Terminal trong VS Code   | Lệnh Kích hoạt                | Xử lý Lỗi thường gặp                                                                                                                                      |
| :----------------------- | :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Command Prompt (CMD)** | `venv\Scripts\activate.bat`   | Rất hiếm khi gặp lỗi.                                                                                                                                     |
| **PowerShell**           | `.\venv\Scripts\activate.ps1` | **Nếu gặp lỗi bảo mật:** Chạy `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` trong cửa sổ PowerShell. Sau đó chạy lại lệnh kích hoạt. |

**Ghi chú:** Khi môi trường ảo được kích hoạt thành công, bạn sẽ thấy **`(venv)`** ở đầu dòng lệnh.
