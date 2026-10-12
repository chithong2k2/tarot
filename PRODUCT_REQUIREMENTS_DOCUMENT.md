# 🔮 PRODUCT REQUIREMENT DOCUMENT (PRD)
## Tarot Studio Manager — Nền tảng Quản trị Vận hành & Doanh thu Tự động cho Shop Tarot

---

### 1. Tổng quan Dự án (Project Overview)
- **Tên dự án**: **Tarot Studio Manager** (`projectAI/tarot`)
- **Loại sản phẩm**: Web Application (B2B SaaS / Internal Business Management System)
- **Khách hàng mục tiêu**: Các chủ shop/studio Tarot online & offline, quản lý fanpage Tarot, đội ngũ Reader và Telesale/Chăm sóc khách hàng.
- **Tầm nhìn sản phẩm (Vision)**: Xây dựng giải pháp phần mềm "all-in-one" giúp các Tarot Studio số hóa toàn bộ khâu vận hành — từ nhập đơn nhanh bằng văn bản tự nhiên, tính hoa hồng linh hoạt theo reader/sale, đồng bộ chi phí quảng cáo Meta Ads, trực quan hóa ROAS/lợi nhuận ròng, quản lý ca trực, cho đến tạo mã thanh toán lương VietQR Napas 247 chỉ với 1 click.

---

### 2. Vấn đề thị trường & Bài toán cần giải quyết (Problem Statement)
Các studio/shop Tarot hiện nay gặp các khó khăn vận hành đặc thù:
1. **Ghi nhận đơn hàng thủ công, phân tán**: Thường chat qua Zalo/Mess hoặc ghi Google Sheet, dễ thất thoát đơn, nhầm lẫn giữa Reader giải bài và Sale chốt khách.
2. **Tính toán hoa hồng & Tiền Tip phức tạp**: Mỗi Reader/Sale có tỷ lệ hoa hồng (% commission) khác nhau; tiền Tip khách gửi riêng cho Reader thường bị gộp chung khó bóc tách.
3. **Mù mờ về hiệu quả quảng cáo (ROAS & Net Profit)**: Chạy Meta Ads nhiều nhưng không đo lường được doanh thu theo ngày/tuần tương ứng, không trừ chi phí quảng cáo và vận hành theo thời gian thực để biết lãi/lỗ thực tế.
4. **Chia ca trực luân phiên rối rắm**: Các shop Tarot thường có ca đêm và ca ngoài giờ (09:00 - 01:00 sáng hôm sau), Reader đăng ký tự phát dẫn đến bỏ sót khách hoặc trùng ca.
5. **Chi trả lương chậm chạp, thủ công**: Cuối tuần/cuối tháng quản lý phải tự bấm máy tính và copy-paste STK ngân hàng từng bạn để chuyển khoản, dễ sai sót số tiền.
6. **Thay đổi menu gói cước liên tục**: Việc cập nhật biểu phí gói 1 câu, 3 câu, trải bài năm... tốn công sức nhập liệu.

---

### 3. Mục tiêu & Chỉ số Thành công (Goals & Success Metrics - OKRs / KPIs)
- **Mục tiêu vận hành (Efficiency)**:
  - Giảm **80%** thời gian nhập đơn hàng nhờ cơ chế Quick Parser (nhập 1 dòng tự động bóc tách).
  - Giảm **90%** thời gian chốt lương tuần và thanh toán nhờ tính năng tạo mã VietQR tự động.
  - Tự động hóa **100%** việc lấy chi phí Meta Ads và lưu trữ (Archive) dữ liệu doanh thu tuần lúc 00:00 sáng Thứ Hai.
- **Độ chính xác dữ liệu (Accuracy)**:
  - Đảm bảo đối soát doanh số, hoa hồng và tiền tip khớp 100% giữa Dashboard chủ shop và màn hình cá nhân của Reader/Sale.
- **Trải nghiệm người dùng (UX)**:
  - Giao diện trực quan, đậm chất huyền bí/nghệ thuật của Tarot nhưng chuẩn dashboard tài chính hiện đại (Tailwind CSS, Dark Mode theme, biểu đồ Recharts).

---

### 4. Đối tượng Người dùng & Phân quyền (User Personas & RBAC)

| Vai trò (Role) | Mô tả & Nhiệm vụ chính | Quyền hạn trong hệ thống |
| :--- | :--- | :--- |
| **Manager (Quản lý / Chủ Studio)** | Quản lý toàn bộ hoạt động kinh doanh, dòng tiền, nhân sự và cấu hình. | - Toàn quyền xem Dashboard tài chính (Doanh thu, Meta Ads, Chi phí, Net Profit, ROAS).<br>- Thêm/sửa/xóa và phân quyền nhân viên.<br>- Cấu hình tỷ lệ hoa hồng riêng cho từng nhân sự.<br>- Quản lý chi phí vận hành (Operating Costs).<br>- Xem bảng lương tổng và quét VietQR chi trả lương.<br>- Cấu hình bảng giá dịch vụ và kết nối API (Meta Ads, Gemini OCR). |
| **Reader (Người trải bài)** | Đọc bài, tư vấn trực tiếp cho khách hàng. | - Chỉ xem danh sách các đơn do mình phụ trách.<br>- Theo dõi hoa hồng cá nhân và 100% tiền tip nhận được.<br>- Đăng ký ca trực tuần theo lịch mở sẵn.<br>- Cập nhật thông tin tài khoản ngân hàng cá nhân nhận lương. |
| **Sale (Tư vấn / Chốt đơn)** | Trực page, tư vấn dịch vụ, chốt lịch hẹn. | - Nhập đơn bán hàng mới qua Quick Parser hoặc bảng chọn gói.<br>- Xem doanh số các đơn do mình tư vấn và hoa hồng được hưởng.<br>- Đăng ký ca trực page. |

---

### 5. Yêu cầu Tính năng Chi tiết (Detailed Functional Requirements)

#### 5.1. Dashboard Tài chính & Phân tích Hiệu quả (Financial Dashboard & Analytics)
- **Chỉ số thời gian thực (KPI Cards)**:
  - Tổng doanh thu (Gross Revenue), Doanh số dịch vụ (Service Amount), Tiền Tip khách tặng.
  - Tổng chi phí quảng cáo (Meta Ads Spend).
  - Chi phí vận hành khác (Operating Costs).
  - Hoa hồng chi trả (Reader Commission + Sale Commission).
  - Lợi nhuận ròng:  
    $$\text{Net Profit} = \text{Doanh thu} - (\text{Chi phí Ads} + \text{Chi phí vận hành} + \text{Hoa hồng})$$
  - Chỉ số hoàn vốn quảng cáo:  
    $$\text{ROAS} = \frac{\text{Doanh thu}}{\text{Chi phí Ads}}$$
- **Biểu đồ trực quan (Charts)**:
  - Doanh thu theo từng ngày trong tuần (Thứ 2 $\rightarrow$ Chủ nhật).
  - So sánh xu hướng Doanh thu vs Lợi nhuận vs Chi phí Ads (AreaChart / BarChart).
  - Bảng xếp hạng Top Reader và Top Sale có doanh số cao nhất tuần.
- **Bộ lọc & Lưu trữ (Filter & Archiving)**:
  - Xem tuần hiện tại hoặc tra cứu lại lịch sử các tuần trước đã đóng.
  - **Auto-Rollover**: Cronjob tự động đóng tuần cũ vào 00:00 Thứ Hai và mở bảng tuần mới sạch sẽ.

#### 5.2. Nhập Đơn Bán Hàng Thông Minh (Smart Sale Entry)
- **Trình bóc tách cú pháp nhanh (Quick Syntax Parser)**:
  - Cho phép nhân viên gõ 1 câu duy nhất, ví dụ:  
    `Khách Linh 150k Mai, Lan` $\rightarrow$ Tự bóc: Khách = *Linh*, Số tiền = *150.000đ*, Reader = *Mai*, Sale = *Lan*.
- **Chọn gói dịch vụ nhanh (Quick Package Picker)**:
  - Hiển thị danh mục gói dịch vụ thông dụng: *1 câu hỏi, 3 câu hỏi, Gói tình duyên chuyên sâu, Định hướng sự nghiệp, Trải bài tổng quan năm...*
  - Click chọn để tự điền tên gói và đơn giá.
- **Tách bạch Tiền Tip (Tip Handling)**:
  - Cho phép nhập tiền tip riêng biệt; mặc định **100% tiền tip chuyển trọn vẹn cho Reader**, không tính khấu trừ vào shop.

#### 5.3. Bảng Lương Tuần & Thanh toán Tự động VietQR (Payroll & VietQR Payments)
- **Công thức lương tuần minh bạch**:
  - Đối với Reader: $\text{Lương} = (\text{Doanh số Reader} \times \% \text{Hoa hồng cá nhân}) + \text{100\% Tip}$.
  - Đối với Sale: $\text{Lương} = \text{Doanh số Sale} \times \% \text{Hoa hồng cá nhân}$.
- **Tạo mã VietQR Napas 247 tức thì**:
  - Dựa trên tên ngân hàng, số tài khoản của nhân viên và số tiền cần thanh toán để tạo link/ảnh VietQR chuẩn Napas 247.
  - Tự động điền nội dung: `[Tên Shop] Thanh toan luong T[SoTuan] - [TenNV]`.
  - Quản lý chỉ cần mở app ngân hàng quét mã, không sợ gõ sai STK hay số tiền.
- **Trạng thái chi trả**: Đánh dấu "Đã thanh toán" / "Chưa thanh toán" và xuất báo cáo đối soát.

#### 5.4. Quản lý Lịch Trực & Ma trận Ca làm (Shifts & Scheduling)
- **4 Khung ca trực tiêu chuẩn**:
  - Ca Sáng: 09:00 - 13:00
  - Ca Chiều: 13:00 - 17:00
  - Ca Tối: 17:00 - 21:00
  - Ca Đêm: 21:00 - 01:00 (đặc thù khách hàng Tarot hay xem đêm).
- **Quy trình đăng ký**:
  - Nhân viên tự chọn ngày trong tuần (Thứ 2 $\rightarrow$ CN) và tick ca muốn trực.
  - Quản trị viên theo dõi bảng ma trận lịch trực theo tuần để điều phối nhân sự hợp lý.

#### 5.5. Quản lý Chi phí Vận hành (Operating Costs Management)
- Ghi nhận chi phí phát sinh: Mặt bằng, điện nước, văn phòng phẩm, nến thơm, bài mới, trà bánh tiếp khách...
- Phân loại danh mục (Category), ngày phát sinh và đính kèm ghi chú.
- Dữ liệu chi phí tự động khấu trừ vào lợi nhuận ròng của tuần tương ứng.

#### 5.6. Trợ lý AI Bóc tách Menu Bảng giá (Gemini Vision OCR)
- Quản trị viên tải ảnh chụp bảng giá/menu dịch vụ của shop.
- Hệ thống gửi ảnh qua Google Gemini Vision API (hoặc Tesseract OCR dự phòng).
- AI tự động trích xuất: Tên gói, số tiền, mô tả $\rightarrow$ Điền vào bảng quản lý biểu phí chỉ trong vài giây.

#### 5.7. Xuất Báo cáo & Lưu trữ Dữ liệu (Export & Archiving)
- Xuất file **Excel (.xlsx)** đa sheet: Sheet Doanh thu chi tiết, Sheet Tổng hợp hoa hồng, Sheet Chi phí.
- Hỗ trợ đóng gói báo cáo dạng file nén **.ZIP** phục vụ lưu trữ kế toán định kỳ.

---

### 6. Kiến trúc Kỹ thuật & Công nghệ (Technical Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (React 19 SPA)              │
│  - Tailwind CSS v4, Framer Motion, Recharts, Lucide Icons   │
│  - Path Routing (/dashboard, /staff, /sales, /payroll, ...) │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     FIREBASE FIRESTORE        │ │     BACKEND / API LAYER   │
│  - Realtime Sync (onSnapshot) │ │  - Express.js / Node.js   │
│  - Collections: users, sales, │ │  - Vercel Serverless      │
│    costs, shifts, settings,   │ │  - Node-Cron Rollover     │
│    archive_weeks              │ └─────────────┬─────────────┘
└───────────────────────────────┘               │
                                                ▼
                                ┌─────────────────────────────┐
                                │     THIRD-PARTY SERVICES    │
                                │  - Meta Marketing Graph API │
                                │  - Google Gemini Vision API │
                                │  - VietQR QuickLink Service │
                                └─────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Recharts.
- **State & Database**: Firebase Firestore (sử dụng listeners `onSnapshot` để dữ liệu cập nhật theo thời gian thực không cần reload).
- **Backend**: Node.js + Express.js (Local & Production Serverless trên Vercel).
- **Tích hợp bên ngoài**:
  - **Meta Marketing API**: Tự động fetch `spend` theo `ad_account_id` và dải ngày.
  - **Google Gemini API**: Bóc tách hình ảnh menu (`gemini-1.5-flash` / `gemini-pro-vision`).
  - **VietQR QuickLink API**: Chuẩn tạo QR động Napas 247 không cần đăng ký cổng trung gian rườm rà.

---

### 7. Yêu cầu Phi Chức năng (Non-Functional Requirements - NFR)
1. **Hiệu năng (Performance)**:
   - Tốc độ tải trang ban đầu $\le 1.5$ giây.
   - Thao tác nhập đơn và phản hồi UI tức thì ($< 200\text{ms}$).
2. **Bảo mật & Phân quyền (Security)**:
   - Dữ liệu tài chính nhạy cảm (Lợi nhuận ròng, chi phí Ads) chỉ hiển thị cho tài khoản `role: manager`.
   - Token Meta Ads và API Key Google Gemini được bảo vệ qua biến môi trường hoặc lưu trữ mã hóa.
3. **Độ tin cậy & Khả dụng (Reliability & Availability)**:
   - Hỗ trợ cơ chế Fallback: Nếu Gemini AI gặp sự cố quota, chuyển sang Tesseract OCR client-side.
   - Cơ chế lưu trữ tuần (Rollover) có log kiểm tra tránh mất mát dữ liệu đơn hàng.
4. **Trải nghiệm di động (Mobile-Friendly)**:
   - Reader và Sale chủ yếu sử dụng điện thoại để nhập đơn và check ca trực, giao diện phải tối ưu responsive hoàn hảo trên màn hình smartphone.

---

### 8. Lộ trình Phát triển & Triển khai (Roadmap)

| Giai đoạn | Mục tiêu chính | Trạng thái / Deliverables |
| :--- | :--- | :--- |
| **Giai đoạn 1: Core Foundation** | Hoàn thiện DB Firestore, Phân quyền Role, Nhập đơn Quick Parser, Dashboard tài chính cơ bản. | ✅ Đã hoàn thành trong codebase hiện tại |
| **Giai đoạn 2: Tự động hóa & Tích hợp** | Đồng bộ Meta Ads API, Bảng lương VietQR, AI OCR Menu, Xếp ca trực. | ✅ Đã triển khai và hoạt động |
| **Giai đoạn 3: Tối ưu & Mở rộng** | - Tích hợp webhook nhận thông báo biến động số dư ngân hàng (SeABank/MB/Casso) để tự đối soát đơn đã thanh toán.<br>- Thông báo nhắc ca trực tự động qua Telegram/Zalo Bot.<br>- Báo cáo CRM phân tích khách hàng thân thiết (tần suất xem bài, xu hướng câu hỏi). | ⏳ Kế hoạch phiên bản tiếp theo |

---

### 9. Rủi ro & Giải pháp Dự phòng (Risks & Mitigations)
- **Rủi ro 1: Token Meta Ads bị hết hạn (Expired Token)**
  - *Giải pháp*: Cho phép nhập thủ công số tiền Ads Spend dự phòng trong ngày tại màn hình Cài đặt khi API bị gián đoạn; hướng dẫn tạo System User Token vĩnh viễn.
- **Rủi ro 2: Reader/Sale nhập sai cú pháp Quick Parser**
  - *Giải pháp*: Hiển thị hộp thoại xem trước (Preview) bóc tách dữ liệu trước khi bấm Lưu, kèm tùy chọn chọn dropdown truyền thống.
- **Rủi ro 3: Trùng ca hoặc thiếu người trực ca đêm**
  - *Giải pháp*: Hiển thị cảnh báo số lượng nhân sự tối thiểu trên từng ca trong ma trận ca trực.
