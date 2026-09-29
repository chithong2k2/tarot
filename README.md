# 🔮 Tarot Studio Manager (Hệ Thống Quản Lý Vận Hành & Doanh Thu Shop Tarot)

Hệ thống quản lý toàn diện chuyên biệt dành cho các **Studio / Shop Tarot**, giúp tự động hóa quy trình ghi nhận doanh thu, quản lý ca trực, đồng bộ chi phí quảng cáo Meta Ads, tính toán hoa hồng nhân sự và chi trả lương tự động qua chuẩn **VietQR (NAPAS 247)**.

---

## 🌟 Tính Năng Nổi Bật

### 1. 📊 Dashboard Tài Chính & Hiệu Quả Ads Thời Gian Thực
- **Chỉ số trọng yếu**: Tổng doanh thu, Chi phí quảng cáo (Meta Ads), Chi phí vận hành, Hoa hồng nhân sự, Lợi nhuận ròng (Net Profit) và tỷ lệ hoàn vốn quảng cáo (**ROAS**).
- **Phân tích theo ngày & tuần**: Lọc doanh thu từ Thứ 2 đến Chủ nhật, xem lại lịch sử các tuần trước đó đã được lưu trữ (Archive).
- **Tự động chốt sổ (Auto-Rollover)**: Tự động tổng hợp và lưu trữ dữ liệu doanh thu của tuần cũ lúc 00:00 sáng Thứ Hai để mở tuần mới tinh gọn.

### 2. ⚡ Nhập Đơn Bán Hàng Thông Minh (Smart Sale Entry)
- **Nhập cú pháp nhanh (Quick Parser)**: Gõ 1 dòng duy nhất dạng: `Khách 100k Reader, Sale` để hệ thống tự động bóc tách tên khách hàng, số tiền, Reader phụ trách và Sale tư vấn.
- **Phím tắt chọn gói cước**: Bảng chọn nhanh các gói dịch vụ (1 câu, 3 câu, 5 câu, 10 câu, gói tình duyên, định hướng sự nghiệp, gói năm, v.v.).
- **Ghi nhận Tip**: Hỗ trợ ghi nhận tiền Tip riêng biệt (100% tip chuyển thẳng cho Reader).

### 3. 👥 Quản Lý & Phân Quyền Nhân Sự Chặt Chẽ
- **3 Cấp phân quyền chuyên biệt**:
  - **Quản lý (`manager`)**: Xem toàn bộ báo cáo tài chính, quản lý nhân viên, cấu hình bảng giá, chi trả lương và cài đặt hệ thống.
  - **Reader (`reader`)**: Chỉ xem các đơn hàng mình phụ trách, xem tiền hoa hồng và tiền tip cá nhân, đăng ký ca trực tuần.
  - **Sale (`sale`)**: Nhập đơn doanh thu, theo dõi doanh số tư vấn và đăng ký ca trực.
- **Hồ sơ nhân sự**: Lưu trữ thông tin tài khoản ngân hàng, tỷ lệ % hoa hồng riêng của từng bạn.

### 4. ⏰ Quản Lý Lịch Trực & Đăng Ký Ca Linh Hoạt
- Thiết lập 4 khung ca: **Ca Sáng (09:00 - 13:00)**, **Ca Chiều (13:00 - 17:00)**, **Ca Tối (17:00 - 21:00)** và **Ca Đêm (21:00 - 01:00)**.
- Nhân sự chủ động đăng ký ca trong tuần; Quản trị viên dễ dàng theo dõi ma trận phân ca để đảm bảo luôn có người trực fanpage và trải bài.

### 5. 💳 Bảng Lương Tuần & Thanh Toán VietQR Tự Động
- **Công thức tính lương chuẩn**: 
  $$\text{Lương nhận} = (\text{Doanh số} \times \% \text{Hoa hồng}) + \text{100\% Tiền Tip}$$
- **Tạo mã VietQR tức thì**: Tự động sinh mã VietQR theo chuẩn Napas 247 tương thích với tất cả ứng dụng ngân hàng tại Việt Nam (MB, Vietcombank, Techcombank, TPBank, ACB, v.v.), tự điền đúng số tiền và nội dung chuyển khoản.
- **Theo dõi trạng thái thanh toán**: Đánh dấu "Đã thanh toán" / "Chưa thanh toán" và lưu trữ lịch sử trả lương minh bạch.

### 6. 🤖 Trợ Lý AI Nhận Diện Bảng Giá (Gemini Vision OCR)
- Quản trị viên chỉ cần tải lên ảnh chụp menu giá của shop, trợ lý AI (**Google Gemini Vision** / **Tesseract OCR**) sẽ tự động nhận diện và cập nhật danh sách gói dịch vụ vào hệ thống.

### 7. 📤 Xuất Dữ Liệu Chuyên Nghiệp
- **Xuất Excel đa sheet**: Xuất toàn bộ báo cáo doanh thu, chi phí và hiệu suất nhân sự ra file `.xlsx`.
- **Gói Báo Cáo .ZIP**: Đóng gói toàn bộ chứng từ, sao kê và báo cáo lương chỉ với 1 click.

### 8. 🔗 Điều Hướng URL Chuẩn Doanh Nghiệp (SPA Path Routing)
- Hệ thống hỗ trợ đường dẫn URL độc lập (`/dashboard`, `/staff`, `/sales`, `/shifts`, `/history`, `/payroll`, `/costs`, `/settings`), giúp:
  - F5 (Reload trang) giữ nguyên màn hình hiện tại.
  - Hỗ trợ chia sẻ link trực tiếp và điều hướng Back/Forward trình duyệt.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons |
| **Biểu Đồ** | Recharts (AreaChart, BarChart, LineChart) |
| **Backend / API** | Node.js, Express.js, TSX, Vite Server Middleware |
| **Cơ sở dữ liệu** | Firebase Firestore (Đồng bộ thời gian thực với `onSnapshot`) |
| **AI & OCR** | Google GenAI SDK (`@google/genai`), Tesseract.js |
| **Quảng Cáo** | Meta Marketing Graph API |
| **Thanh toán & Tệp** | VietQR QuickLink (NAPAS 247), SheetJS (`xlsx`), JSZip |
| **Lập lịch (Cron)** | Node-cron, Vercel Cron Jobs |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18.x hoặc 20.x trở lên.
- **npm** / **yarn** / **pnpm**.

### 2. Cài Đặt Thư Viện
```bash
# Clone repository
git clone https://github.com/chithong2k2/tarot.git
cd tarot

# Cài đặt các dependencies
npm install
```

### 3. Cấu Hình Biến Môi Trường (`.env`)
Tạo file `.env` tại thư mục gốc của dự án với các thông số sau:

```env
# Port chạy Server
PORT=3000

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Meta Marketing API (Xem chi phí quảng cáo)
FB_ACCESS_TOKEN=your_facebook_system_user_token
FB_AD_ACCOUNT_ID=act_xxxxxxxxxxxxxxx

# Google Gemini API Key (Nhận diện Menu bằng AI)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Khởi Chạy Local
```bash
# Chạy ở chế độ phát triển (Full-stack Server + Vite)
npm run dev
```
Mở trình duyệt tại: **`http://localhost:3000`**

### 5. Build Sản Phẩm
```bash
# Kiểm tra lỗi TypeScript
npm run lint

# Build production
npm run build
```

---

## 📁 Cấu Trúc Thư Mục

```text
tarot/
├── api/                      # Vercel Serverless Functions
│   ├── cron-rollover.ts      # Cron job tự động lưu trữ tuần cũ
│   └── fb-insights.ts        # Endpoint đồng bộ chi phí Meta Ads
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx       # Thanh điều hướng với URL routing
│   │   ├── ConfirmModal.tsx  # Modal xác nhận thao tác
│   │   └── views/
│   │       ├── DashboardView.tsx     # Báo cáo tổng quan doanh thu & Ads
│   │       ├── StaffView.tsx         # Quản lý nhân viên & hoa hồng
│   │       ├── SaleEntryView.tsx     # Nhập đơn hàng & phân tích nhanh
│   │       ├── ShiftView.tsx         # Xếp ca & đăng ký ca trực
│   │       ├── SalesHistoryView.tsx  # Lịch sử chi tiết các đơn
│   │       ├── PayrollView.tsx       # Bảng lương & tạo mã VietQR
│   │       ├── CostsView.tsx         # Quản lý chi phí vận hành
│   │       ├── SettingsView.tsx      # Cài đặt shop, tài khoản, gói cước
│   │       └── LoginView.tsx         # Màn hình đăng nhập phong cách Tarot
│   ├── services/
│   │   ├── firebaseService.ts# Tầng thao tác dữ liệu Firestore
│   │   └── api.ts            # Tầng gọi API Meta Ads & OCR Menu
│   ├── utils/
│   │   ├── dashboard.ts      # Tính toán tài chính, hoa hồng, ROAS
│   │   ├── dateUtils.ts      # Xử lý ngày tháng theo múi giờ Việt Nam
│   │   └── menuOcrParser.ts  # Heuristic parser bóc tách bảng giá dịch vụ
│   ├── types.ts              # Định nghĩa TypeScript Types
│   ├── App.tsx               # Root component & bộ định tuyến SPA
│   └── main.tsx              # Điểm khởi chạy React
├── server.ts                 # Express Backend Server & Vite SSR/Middleware
├── vercel.json               # Cấu hình deployment & Cron Jobs trên Vercel
└── package.json
```

---

## 🔒 Bảo Mật & Phân Quyền
- Mọi dữ liệu tài chính nhạy cảm (chi phí Ads, báo cáo tài chính tổng, lương toàn shop) đều được ẩn hoàn toàn đối với tài khoản Reader và Sale.
- Tính năng bảo vệ URL: Nhân sự không có quyền quản trị nếu truy cập trực tiếp vào các route `/staff`, `/payroll`, `/costs` sẽ tự động được điều hướng về `/dashboard`.

---

## 📄 Bản Quyền & Giấy Phép
Dự án được xây dựng và sở hữu bởi **Tarot Studio** & [Dương Chí Thông](https://github.com/chithong2k2).
