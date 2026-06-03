# Graduation Invitation - Vercel + Neon PostgreSQL

Project này đã được cấu hình để deploy lên Vercel, có form xác nhận tham gia và dashboard xem danh sách.

## 1. Cài đặt local

```bash
npm install
```

Tạo file `.env.local` từ `.env.example`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DASHBOARD_PASSWORD=matkhaucuaban
```

Chạy local:

```bash
npm run dev
```

Mở:

- Trang chính: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard

## 2. Deploy lên Vercel

Đẩy code lên GitHub rồi Import Project trên Vercel.

Trong Vercel > Project > Settings > Environment Variables, thêm:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DASHBOARD_PASSWORD=matkhaucuaban
```

Sau đó bấm Deploy hoặc Redeploy.

## 3. Cấu hình Vercel quan trọng

Không cần file `.env` trên Vercel.

Không thêm runtime trong `vercel.json`.
File `vercel.json` đúng là:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/dashboard",
      "destination": "/dashboard.html"
    }
  ]
}
```

Nếu Vercel báo lỗi `Function Runtimes must have a valid version`, hãy kiểm tra GitHub chắc chắn đã push file `vercel.json` mới và không còn cấu hình `functions`, `builds`, hoặc `runtime` cũ.

## 4. API

- `POST /api/rsvp`: lưu xác nhận tham gia
- `GET /api/rsvp`: dashboard đọc danh sách, cần header `x-dashboard-password`

Database table `rsvps` sẽ được tự tạo nếu chưa có.

## Trang album kỷ niệm

Project đã có thêm trang `album.html` dạng cuốn sách lật trang.

Cách thêm ảnh:
1. Copy ảnh vào thư mục `assets/photos/`.
2. Mở file `data/album.js`.
3. Thêm ảnh vào mảng `window.ALBUM_PHOTOS`, ví dụ:

```js
{ src: "./assets/photos/ten-anh.jpg", caption: "Kỷ niệm với bạn bè" }
```

Trên trang chính đã có nút **📖 Xem album kỷ niệm** để mở album.
