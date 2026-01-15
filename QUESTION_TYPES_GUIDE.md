# 📝 Hướng Dẫn Tạo Câu Hỏi - Question Types Guide

## 🎯 Các Loại Câu Hỏi

Backend hỗ trợ 4 loại câu hỏi:
- **MCQ** - Multiple Choice Question (Trắc nghiệm 1 đáp án)
- **MULTIPLE_ANSWER** - Multiple Answer Question (Trắc nghiệm nhiều đáp án)
- **TRUE_FALSE** - True/False Question (Đúng/Sai)
- **ESSAY** - Essay Question (Tự luận)

---

## 📋 API Endpoints

### 1. Tạo 1 Câu Hỏi
```
POST /api/v1/questions
```

### 2. Tạo Nhiều Câu Hỏi Cùng Lúc
```
POST /api/v1/questions/bulk
```

---

## 🔷 1. MCQ - Multiple Choice Question (Trắc nghiệm 1 đáp án)

### 📌 Đặc điểm:
- Có nhiều lựa chọn (options)
- Chỉ có **1 đáp án đúng**
- `correct_answer` là **string** (giá trị của đáp án đúng)

### 📝 Ví dụ - Tạo 1 câu MCQ:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "document_id": "",
  "content": "2 + 2 = ?",
  "options": ["3", "4", "5", "6"],
  "correct_answer": "4",
  "type": "MCQ",
  "point": 1,
  "explanation": "Phép cộng cơ bản: 2 cộng 2 bằng 4"
}
```

### 📝 Ví dụ khác - MCQ với options là object:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "document_id": null,
  "content": "Thủ đô của Việt Nam là?",
  "options": [
    { "id": "A", "text": "Hà Nội" },
    { "id": "B", "text": "Hồ Chí Minh" },
    { "id": "C", "text": "Đà Nẵng" },
    { "id": "D", "text": "Huế" }
  ],
  "correct_answer": "A",
  "type": "MCQ",
  "point": 2,
  "explanation": "Hà Nội là thủ đô của Việt Nam từ năm 1010"
}
```

---

## 🔶 2. MULTIPLE_ANSWER - Multiple Answer (Trắc nghiệm nhiều đáp án)

### 📌 Đặc điểm:
- Có nhiều lựa chọn (options)
- Có **nhiều đáp án đúng**
- `correct_answer` là **array** (mảng các đáp án đúng)

### 📝 Ví dụ - Tạo 1 câu MULTIPLE_ANSWER:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "document_id": "",
  "content": "Các ngôn ngữ lập trình nào sau đây là ngôn ngữ Backend?",
  "options": ["JavaScript", "Python", "HTML", "Java", "CSS", "PHP"],
  "correct_answer": ["JavaScript", "Python", "Java", "PHP"],
  "type": "MULTIPLE_ANSWER",
  "point": 3,
  "explanation": "HTML và CSS là ngôn ngữ Frontend, không phải Backend"
}
```

### 📝 Ví dụ khác - MULTIPLE_ANSWER với options là object:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "content": "Chọn các số nguyên tố trong danh sách sau:",
  "options": [
    { "id": "A", "text": "2" },
    { "id": "B", "text": "4" },
    { "id": "C", "text": "7" },
    { "id": "D", "text": "9" },
    { "id": "E", "text": "11" }
  ],
  "correct_answer": ["A", "C", "E"],
  "type": "MULTIPLE_ANSWER",
  "point": 2.5
}
```

---

## 🔵 3. TRUE_FALSE - True/False Question (Đúng/Sai)

### 📌 Đặc điểm:
- Chỉ có 2 lựa chọn: Đúng/Sai
- `options` có thể bỏ qua hoặc là `["true", "false"]`
- `correct_answer` là **string**: `"true"` hoặc `"false"`

### 📝 Ví dụ - Tạo 1 câu TRUE_FALSE:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "document_id": "",
  "content": "JavaScript là ngôn ngữ lập trình Backend.",
  "options": ["true", "false"],
  "correct_answer": "false",
  "type": "TRUE_FALSE",
  "point": 1,
  "explanation": "JavaScript có thể dùng cho cả Frontend và Backend (Node.js)"
}
```

### 📝 Ví dụ không cần options:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "content": "Trái đất quay quanh mặt trời.",
  "correct_answer": "true",
  "type": "TRUE_FALSE",
  "point": 0.5,
  "explanation": "Trái đất quay quanh mặt trời trong 365 ngày"
}
```

---

## 🔴 4. ESSAY - Essay Question (Tự luận)

### 📌 Đặc điểm:
- Không có options (câu trả lời tự do)
- `correct_answer` là **string** (đáp án mẫu hoặc hướng dẫn chấm)
- `options` để `null` hoặc bỏ qua

### 📝 Ví dụ - Tạo 1 câu ESSAY:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "document_id": "",
  "content": "Phân tích vai trò của giáo dục trong xã hội hiện đại.",
  "correct_answer": "Giáo dục có vai trò quan trọng trong việc phát triển nguồn nhân lực, nâng cao trình độ dân trí, và góp phần xây dựng xã hội văn minh, tiến bộ.",
  "type": "ESSAY",
  "point": 5,
  "explanation": "Cần phân tích ít nhất 3 vai trò chính của giáo dục với ví dụ cụ thể"
}
```

### 📝 Ví dụ khác - ESSAY với rubric chấm điểm:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "content": "Viết đoạn văn ngắn (150-200 từ) về lợi ích của việc học lập trình.",
  "correct_answer": "Rubric: Nội dung (3đ), Cấu trúc (1đ), Ngữ pháp (1đ)",
  "type": "ESSAY",
  "point": 5,
  "explanation": "Học sinh cần đề cập: tư duy logic, giải quyết vấn đề, cơ hội việc làm"
}
```

---

## 🚀 Bulk Create - Tạo Nhiều Câu Hỏi Cùng Lúc

### 📝 Ví dụ - Tạo nhiều câu hỏi khác loại:
```json
{
  "quiz_id": "019bbb61-1883-72fb-b3ce-749fc486c668",
  "questions": [
    {
      "content": "2 + 2 = ?",
      "options": ["3", "4", "5", "6"],
      "correct_answer": "4",
      "type": "MCQ",
      "point": 1
    },
    {
      "content": "Chọn các số chẵn:",
      "options": ["1", "2", "3", "4", "5", "6"],
      "correct_answer": ["2", "4", "6"],
      "type": "MULTIPLE_ANSWER",
      "point": 2
    },
    {
      "content": "JavaScript là ngôn ngữ biên dịch.",
      "correct_answer": "false",
      "type": "TRUE_FALSE",
      "point": 1,
      "explanation": "JavaScript là ngôn ngữ thông dịch (interpreted)"
    },
    {
      "content": "Giải thích khái niệm REST API.",
      "correct_answer": "REST API là kiến trúc phần mềm sử dụng HTTP protocol với các method GET, POST, PUT, DELETE để thao tác với tài nguyên.",
      "type": "ESSAY",
      "point": 5
    }
  ]
}
```

---

## 📊 Bảng Tổng Hợp

| Type | Options | correct_answer | Ví dụ correct_answer |
|------|---------|----------------|---------------------|
| **MCQ** | Array (bắt buộc) | String | `"4"` hoặc `"A"` |
| **MULTIPLE_ANSWER** | Array (bắt buộc) | Array | `["A", "C", "E"]` |
| **TRUE_FALSE** | Optional | String | `"true"` hoặc `"false"` |
| **ESSAY** | null/undefined | String | `"Đáp án mẫu..."` |

---

## ⚠️ Lưu Ý Quan Trọng

### ✅ Required Fields (Bắt buộc):
- `quiz_id` - ID của quiz
- `content` - Nội dung câu hỏi
- `correct_answer` - Đáp án đúng
- `type` - Loại câu hỏi

### 🔧 Optional Fields (Tùy chọn):
- `document_id` - Có thể để `null`, `""`, hoặc bỏ qua
- `options` - Tùy thuộc vào loại câu hỏi
- `point` - Mặc định là `1.0`
- `explanation` - Giải thích thêm cho câu hỏi

### 🎯 Tips:
1. **MCQ & MULTIPLE_ANSWER**: Luôn có `options`
2. **TRUE_FALSE**: `options` có thể bỏ qua
3. **ESSAY**: Không cần `options`
4. **correct_answer**: 
   - String cho MCQ, TRUE_FALSE, ESSAY
   - Array cho MULTIPLE_ANSWER
5. **point**: Có thể là số thập phân (0.5, 1.5, 2.5...)

---

## 🧪 Test với Swagger

1. Truy cập: `http://localhost:3000/docs`
2. Tìm endpoint `POST /api/v1/questions` hoặc `POST /api/v1/questions/bulk`
3. Click "Try it out"
4. Dán JSON mẫu ở trên
5. Click "Execute"

---

## 📞 Support

Nếu có lỗi hoặc thắc mắc, kiểm tra:
- ✅ `quiz_id` có tồn tại không?
- ✅ Bearer Token có đúng không?
- ✅ User có quyền teacher và sở hữu quiz không?
- ✅ Format JSON có đúng không?
