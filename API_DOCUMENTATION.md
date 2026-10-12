# 📡 API SPECIFICATION DOCUMENT
## Tarot Studio Manager — Tài Liệu Đặc Tả Giao Diện Lập Trình Ứng Dụng (API)

---

### 1. Tổng quan Kiến trúc API (Architecture Overview)

Hệ thống **Tarot Studio Manager** vận hành theo mô hình kiến trúc lai (**Hybrid Backend Architecture**):
1. **Core Database & Realtime Layer (Firebase Firestore)**:
   - Dùng trực tiếp từ client SDK (`src/services/firebaseService.ts`) để đồng bộ thời gian thực (`onSnapshot`) cho dữ liệu: Người dùng (`users`), Đơn bán hàng (`sales`), Chi phí vận hành (`operating_costs`), Bảng lương lưu trữ (`payrolls`), Lịch trực (`shifts`, `reader_shifts`, `sale_shifts`), Cài đặt (`settings`).
2. **Backend Server & Edge Services (Node.js Express / Vercel Serverless)**:
   - File chính: [server.ts](file:///d:/ProjectAI/tarot/server.ts) (Local / Docker) và [api/cron-rollover.ts](file:///d:/ProjectAI/tarot/api/cron-rollover.ts) (Vercel Serverless).
   - Xử lý các tác vụ yêu cầu bảo mật Secret Key hoặc tác vụ tính toán nặng: Đồng bộ chi phí Meta Marketing Graph API, Phân tích OCR Menu bảng giá (Google Gemini Vision + Tesseract.js), Cronjob tự động đóng sổ tuần (00:00 Thứ Hai).
3. **Google Apps Script Backup API (Tùy chọn / Legacy Integration)**:
   - File: [GAS_API_CODE.js](file:///d:/ProjectAI/tarot/GAS_API_CODE.js), cho phép lưu trữ và đồng bộ dự phòng trực tiếp vào Google Spreadsheet qua Web App URL.

---

### 2. Tiêu chuẩn & Quy ước chung (Conventions)

- **Base URL**:
  - Môi trường phát triển nội bộ: `http://localhost:3000`
  - Môi trường Production (Vercel): `https://<ten-domain-cua-ban>.vercel.app`
- **Định dạng dữ liệu**: `Content-Type: application/json; charset=utf-8` (Hỗ trợ body lên đến 50MB cho ảnh Base64).
- **Múi giờ mặc định**: `Asia/Ho_Chi_Minh` (GMT+7). Tất cả tính toán đầu tuần/cuối tuần tuân thủ quy ước Thứ Hai $\rightarrow$ Chủ Nhật.
- **Quy chuẩn mã lỗi HTTP**:
  - `200 OK`: Yêu cầu thực thi thành công.
  - `400 Bad Request`: Thiếu tham số, cú pháp sai hoặc chưa cấu hình Token/Key.
  - `401 Unauthorized / 403 Forbidden`: Sai quyền truy cập hoặc phiên đăng nhập hết hạn.
  - `500 Internal Server Error`: Lỗi phát sinh từ server nội bộ hoặc bên thứ ba.

---

### 3. Danh mục API Server nội bộ (Internal Server Endpoints)

---

#### 3.1. Phân tích Bảng Giá Dịch vụ bằng AI & OCR (Analyze Price Menu)
Phân tích ảnh chụp menu giá của shop bằng **Google Gemini Vision API** (ưu tiên) và tự động fallback sang **Tesseract OCR offline** nếu không có API key.

- **Endpoint**: `POST /api/analyze-price-menu`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Body**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  | :--- | :--- | :---: | :--- |
  | `imageBase64` | `string` | **Có** | Chuỗi Base64 của ảnh menu (chấp nhận tiền tố `data:image/...;base64,` hoặc chuỗi raw). |
  | `mimeType` | `string` | Không | Định dạng ảnh: `image/jpeg` (mặc định), `image/png`, `image/webp`. |
  | `geminiApiKey`| `string` | Không | Gemini API key ghi đè tạm thời (nếu không truyền sẽ lấy từ Firestore hoặc `.env`). |

- **Request Example**:
  ```json
  {
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
    "mimeType": "image/jpeg",
    "geminiApiKey": "AIzaSy..."
  }
  ```

- **Response Success (200 OK - Phương thức Gemini Vision)**:
  ```json
  {
    "success": true,
    "method": "gemini",
    "message": "AI Gemini đã nhận diện thành công 4 gói dịch vụ từ ảnh!",
    "packages": [
      {
        "id": "pkg_ai_1728532400000_0",
        "name": "1 câu",
        "label": "1 Câu Hỏi Cụ Thể",
        "price": 35000,
        "popular": false
      },
      {
        "id": "pkg_ai_1728532400000_1",
        "name": "3 câu",
        "label": "Gói 3 Câu Hỏi Sâu",
        "price": 99000,
        "popular": true
      },
      {
        "id": "pkg_ai_1728532400000_2",
        "name": "30p",
        "label": "30 Phút Tương Tác 1-1",
        "price": 150000,
        "popular": false
      }
    ]
  }
  ```

- **Response Fallback (200 OK - Phương thức Tesseract OCR offline)**:
  ```json
  {
    "success": true,
    "method": "ocr",
    "rawText": "BANG GIA TAROT\n1 cau: 35k\n3 cau: 100k...",
    "packages": [
      {
        "id": "pkg_ocr_1728532400000_0",
        "name": "1 câu",
        "label": "1 Câu",
        "price": 35000,
        "popular": false
      }
    ],
    "message": "Hệ thống OCR đã phân tích và tìm thấy 1 gói dịch vụ từ ảnh!"
  }
  ```

- **Response Error (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Vui lòng cung cấp dữ liệu hình ảnh (imageBase64)."
  }
  ```

---

#### 3.2. Đồng bộ Chi phí Meta Ads theo Tuần vào Database (Sync Meta Ads)
Gọi trực tiếp Meta Marketing API v19.0, lấy chi phí quảng cáo từng ngày trong tuần hiện tại (`this_week_mon_today`) và lưu vào collection `ad_history` trên Firestore.

- **Endpoint**: `POST /api/sync-fb-ads`
- **Request Body**: Trống hoặc `{}` (Tự động lấy Access Token và Ad Account ID từ Firestore settings hoặc `.env`).
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Đã cập nhật chi phí Ads cho 5 ngày thành công!",
    "days": [
      { "date": "2026-10-05", "spend": 125000 },
      { "date": "2026-10-06", "spend": 140000 },
      { "date": "2026-10-07", "spend": 110000 },
      { "date": "2026-10-08", "spend": 135000 },
      { "date": "2026-10-09", "spend": 98000 }
    ]
  }
  ```
- **Response Error (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Chưa cấu hình FB_ACCESS_TOKEN và FB_AD_ACCOUNT_ID (trong Cài Đặt hoặc file .env)"
  }
  ```

---

#### 3.3. Kiểm tra Kết nối Tài khoản Meta Ads (Test FB Connection)
Kiểm tra tính hợp lệ của Facebook Token, lấy thông tin tên tài khoản, tiền tệ và trạng thái hoạt động.

- **Endpoint**: `POST /api/test-fb-ads`
- **Request Body** (Tùy chọn truyền tạm để test hoặc bỏ trống để dùng cấu hình đã lưu):
  ```json
  {
    "accessToken": "EAA...",
    "adAccountId": "act_1234567890"
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "account": {
      "id": "act_1234567890",
      "name": "Tarot Studio Official",
      "currency": "VND",
      "status": "Hoạt động bình thường (ACTIVE)",
      "amount_spent": "45200000",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "message": "Kết nối thành công tới tài khoản \"Tarot Studio Official\" (VND) - Hoạt động bình thường (ACTIVE)"
  }
  ```
- **Response Error (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Lỗi kết nối Facebook: Error validating access token: Session has expired..."
  }
  ```

---

#### 3.4. Lấy Chi phí Meta Ads hôm nay (Get Today Ad Spend)
Lấy nhanh số tiền chi tiêu quảng cáo trong ngày hôm nay.

- **Endpoint**: `GET /api/fb-spend`
- **Response Success (200 OK)**:
  ```json
  {
    "spend": 145000
  }
  ```

---

#### 3.5. Kích hoạt Lưu trữ Tuần cũ & Mở Tuần Mới (Cron Rollover)
Chạy quy trình chốt sổ doanh thu, tính hoa hồng, lợi nhuận ròng tuần trước và lưu vào `payrolls/{period_id}`, đồng thời dọn sạch ma trận ca trực (`reader_shifts`, `sale_shifts`) để đón tuần mới.

- **Endpoint**: `GET /api/cron-rollover`
- **Trigger**: Tự động gọi qua Node-cron lúc **00:00 Thứ Hai hàng tuần** hoặc gọi qua Vercel Cron.
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Đã tự động lưu tuần cũ và reset ca trực tuần mới thành công."
  }
  ```

---

### 4. Đặc tả Tích hợp Dịch vụ Bên Thứ Ba (Third-party Integrations)

---

#### 4.1. Chuẩn Thanh Toán VietQR (NAPAS 247 QuickLink)
Hệ thống sử dụng chuẩn URL mở VietQR không cần đăng ký tài khoản trung gian thanh toán:

- **Format URL**:
  `https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NUMBER>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<MESSAGE>&accountName=<ACCOUNT_NAME>`
- **Tham số quy chuẩn**:
  - `BANK_BIN`: Mã BIN ngân hàng hoặc tên rút gọn viết liền (ví dụ: `MBBank`, `ICB`, `VCB`, `TCB`, `TPB`).
  - `ACCOUNT_NUMBER`: Số tài khoản ngân hàng của nhân viên.
  - `TEMPLATE`: Giao diện QR (thường dùng `compact2` hoặc `qr_only`).
  - `amount`: Số tiền thực nhận sau hoa hồng + tip.
  - `addInfo`: Cú pháp nội dung: `TarotStudio Luong T<SoTuan> <TenNV>`.
  - `accountName`: Tên chủ tài khoản không dấu (URL Encoded).

---

#### 4.2. Meta Marketing Graph API v19.0
- **Base URL**: `https://graph.facebook.com/v19.0`
- **Endpoint Insights**: `GET /{act_AD_ACCOUNT_ID}/insights`
- **Query Params**:
  - `fields=spend`
  - `date_preset=this_week_mon_today` (hoặc `today`)
  - `time_increment=1` (để bóc tách từng ngày riêng biệt)
  - `access_token={FB_ACCESS_TOKEN}`

---

### 5. Đặc tả Mô hình Dữ liệu Firebase Firestore (Firestore Schema)

```
Firestore Database
 ├── users/{userId}               # Danh sách nhân sự & hoa hồng
 ├── sales/{saleId}               # Dữ liệu từng lượt trải bài
 ├── operating_costs/{costId}     # Chi phí vận hành phát sinh
 ├── ad_history/{YYYY-MM-DD}      # Chi phí Facebook Ads lưu theo ngày
 ├── shifts/{shiftId}             # Danh mục các ca làm việc
 ├── reader_shifts/{regId}        # Đăng ký ca của Reader
 ├── sale_shifts/{regId}          # Đăng ký ca của Sale
 ├── payrolls/{payroll_YYYY-MM-DD}# Hồ sơ chốt sổ & bảng lương tuần đã đóng
 └── settings/global              # Cấu hình hệ thống, bảng giá, token
```

#### 5.1. Collection: `users`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | ID định danh nhân sự |
| `username` | `string` | Tên đăng nhập |
| `password` | `string` | Mật khẩu xác thực |
| `role` | `'manager' \| 'reader' \| 'sale'` | Vai trò trong shop |
| `full_name` | `string` | Tên đầy đủ hiển thị |
| `commission_percent` | `number` | Tỷ lệ hoa hồng (%) được hưởng trên đơn |
| `bank_name` | `string` | Tên ngân hàng nhận lương (ví dụ: `MBBank`) |
| `bank_account` | `string` | Số tài khoản ngân hàng |
| `bank_account_name` | `string` | Tên chủ tài khoản in hoa không dấu |
| `status` | `'active' \| 'inactive'` | Trạng thái làm việc |

#### 5.2. Collection: `sales`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | ID đơn hàng |
| `customer_name` | `string` | Tên khách hàng |
| `package_name` | `string` | Gói dịch vụ đã chọn |
| `amount` | `number` | Giá trị đơn cước dịch vụ (VNĐ) |
| `tip` | `number` | Tiền Tip khách tặng riêng cho Reader (VNĐ) |
| `reader_id` | `string` | ID hoặc tên của Reader thực hiện |
| `sale_id` | `string` | ID hoặc tên của Sale tư vấn |
| `date` | `string` | Ngày ghi nhận định dạng `YYYY-MM-DD` |
| `created_at` | `string` | ISO Timestamp thời điểm tạo đơn |

#### 5.3. Collection: `payrolls` (Lưu trữ tuần - Archive)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Ví dụ: `payroll_2026-10-05` |
| `title` | `string` | Tiêu đề tuần, ví dụ: `Tuần (05/10 - 11/10)` |
| `start_date` / `end_date` | `string` | Ngày bắt đầu & kết thúc (`YYYY-MM-DD`) |
| `total_revenue` | `number` | Tổng doanh thu tuần ($\text{Doanh số} + \text{Tip}$) |
| `total_payout` | `number` | Tổng hoa hồng + tip trả cho toàn bộ nhân sự |
| `total_ad_spend` | `number` | Tổng tiền quảng cáo Meta Ads tuần đó |
| `owner_net_profit` | `number` | Lợi nhuận ròng của shop sau khi trừ mọi chi phí |
| `items` | `Array<PayrollItem>` | Chi tiết số tiền nhận, STK và cờ `is_paid` của từng bạn |

---

### 6. Cấu hình Biến Môi trường (.env Specification)

```env
# 1. Cấu hình Cổng chạy
PORT=3000
NODE_ENV=development

# 2. Firebase SDK Credentials
VITE_FIREBASE_API_KEY=AIzaSyA9avmK...
VITE_FIREBASE_AUTH_DOMAIN=tarot-5719b.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tarot-5719b
VITE_FIREBASE_STORAGE_BUCKET=tarot-5719b.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=30679561256
VITE_FIREBASE_APP_ID=1:30679561256:web:392561ac7f849bbe2f311d

# 3. Meta Marketing Graph API
FB_ACCESS_TOKEN=EAAG...
FB_AD_ACCOUNT_ID=act_1234567890123

# 4. Trợ lý AI Vision OCR
GEMINI_API_KEY=AIzaSy...

# 5. (Tùy chọn) Google Apps Script Backup URL
VITE_GAS_API_URL=https://script.google.com/macros/s/.../exec
```
