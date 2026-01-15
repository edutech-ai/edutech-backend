# Hệ Thống Quản Lý Lớp Học - API Documentation

## Tổng Quan

Hệ thống quản lý lớp học cung cấp các API để:
- Quản lý lớp học (tạo, sửa, xóa, xem)
- Quản lý học sinh
- Quản lý quan hệ học sinh-lớp học (N-N)
- Theo dõi hiệu suất học tập của học sinh

## Cấu Trúc Database

### 1. Bảng `classrooms` (Lớp Học)
```sql
- id: UUID (Primary Key)
- teacher_id: UUID (Foreign Key -> users.id)
- name: Tên lớp học
- school_year: Năm học
- description: Mô tả
- avatar_url: URL ảnh đại diện lớp
- status: Trạng thái (active/archived/unactive)
- created_at: Thời gian tạo
```

### 2. Bảng `students` (Học Sinh)
```sql
- id: UUID (Primary Key)
- full_name: Họ tên
- student_code: Mã học sinh (Unique)
- phone_number: Số điện thoại học sinh
- parent_phone_number: Số điện thoại phụ huynh
- is_active: Trạng thái hoạt động
```

### 3. Bảng `classroom_students` (Quan Hệ N-N)
```sql
- classroom_id: UUID (Primary Key, Foreign Key)
- student_id: UUID (Primary Key, Foreign Key)
- joined_at: Thời gian tham gia
- status: Trạng thái (active/completed/dropped)
```

### 4. Bảng `student_performance` (Hiệu Suất Học Tập)
```sql
- id: UUID (Primary Key)
- classroom_id: UUID (Foreign Key)
- student_id: UUID (Foreign Key)
- total_exams: Tổng số bài kiểm tra
- average_score: Điểm trung bình
- subject_performance: JSON - Hiệu suất theo môn học
- strong_topic: JSON - Chủ đề mạnh
- weak_topic: JSON - Chủ đề yếu
- last_calculated_at: Thời gian tính toán cuối
```

## APIs

### 📚 CLASSROOM APIs

#### 1. Tạo Lớp Học Mới
```http
POST /api/v1/classrooms
Authorization: Bearer {token}

Body:
{
  "name": "Lớp Toán 10A1",
  "school_year": "2025-2026",
  "description": "Lớp toán nâng cao",
  "avatar_url": "https://example.com/avatar.jpg",
  "status": "active"
}

Response 201:
{
  "success": true,
  "message": "Tạo lớp học thành công",
  "data": {
    "id": "uuid",
    "teacher_id": "uuid",
    "name": "Lớp Toán 10A1",
    ...
  }
}
```

#### 2. Lấy Danh Sách Lớp Học
```http
GET /api/v1/classrooms?page=1&limit=10&status=active
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "classrooms": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

#### 3. Lấy Thông Tin Lớp Học
```http
GET /api/v1/classrooms/{id}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Lớp Toán 10A1",
    "student_count": 30,
    ...
  }
}
```

#### 4. Cập Nhật Lớp Học
```http
PUT /api/v1/classrooms/{id}
Authorization: Bearer {token}

Body:
{
  "name": "Lớp Toán 10A2",
  "status": "archived"
}

Response 200:
{
  "success": true,
  "message": "Cập nhật lớp học thành công",
  "data": {...}
}
```

#### 5. Xóa Lớp Học
```http
DELETE /api/v1/classrooms/{id}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Xóa lớp học thành công"
}
```

### 👨‍🎓 STUDENT APIs

#### 1. Tạo Học Sinh Mới
```http
POST /api/v1/classrooms/students
Authorization: Bearer {token}

Body:
{
  "full_name": "Nguyễn Văn A",
  "student_code": "SV001",
  "phone_number": "0123456789",
  "parent_phone_number": "0987654321",
  "is_active": true
}

Response 201:
{
  "success": true,
  "message": "Tạo học sinh thành công",
  "data": {...}
}
```

#### 2. Lấy Danh Sách Học Sinh
```http
GET /api/v1/classrooms/students?page=1&limit=20&search=Nguyen
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "students": [...],
    "pagination": {...}
  }
}
```

#### 3. Lấy Thông Tin Học Sinh
```http
GET /api/v1/classrooms/students/{id}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "Nguyễn Văn A",
    ...
  }
}
```

#### 4. Cập Nhật Học Sinh
```http
PUT /api/v1/classrooms/students/{id}
Authorization: Bearer {token}

Body:
{
  "full_name": "Nguyễn Văn B",
  "phone_number": "0111222333"
}

Response 200:
{
  "success": true,
  "message": "Cập nhật học sinh thành công",
  "data": {...}
}
```

#### 5. Xóa Học Sinh
```http
DELETE /api/v1/classrooms/students/{id}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Xóa học sinh thành công"
}
```

### 🔗 CLASSROOM-STUDENT APIs (Quan Hệ N-N)

#### 1. Thêm Học Sinh Vào Lớp
```http
POST /api/v1/classrooms/{classroomId}/students
Authorization: Bearer {token}

Body:
{
  "student_id": "uuid",
  "status": "active"
}

Response 201:
{
  "success": true,
  "message": "Thêm học sinh vào lớp thành công",
  "data": {...}
}
```

#### 2. Lấy Danh Sách Học Sinh Trong Lớp
```http
GET /api/v1/classrooms/{classroomId}/students?status=active
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "classroom_id": "uuid",
      "student_id": "uuid",
      "joined_at": "2025-01-15T...",
      "status": "active",
      "student": {
        "id": "uuid",
        "full_name": "Nguyễn Văn A",
        "student_code": "SV001",
        ...
      }
    }
  ]
}
```

#### 3. Cập Nhật Trạng Thái Học Sinh Trong Lớp
```http
PUT /api/v1/classrooms/{classroomId}/students/{studentId}
Authorization: Bearer {token}

Body:
{
  "status": "completed"
}

Response 200:
{
  "success": true,
  "message": "Cập nhật trạng thái học sinh thành công",
  "data": {...}
}
```

#### 4. Xóa Học Sinh Khỏi Lớp
```http
DELETE /api/v1/classrooms/{classroomId}/students/{studentId}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Xóa học sinh khỏi lớp thành công"
}
```

### 📊 STUDENT PERFORMANCE APIs

#### 1. Lấy Thông Tin Học Lực
```http
GET /api/v1/classrooms/{classroomId}/students/{studentId}/performance
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "classroom_id": "uuid",
    "student_id": "uuid",
    "total_exams": 10,
    "average_score": 8.5,
    "subject_performance": {
      "math": 9.0,
      "physics": 8.0
    },
    "strong_topic": {
      "algebra": 9.5
    },
    "weak_topic": {
      "geometry": 7.0
    },
    "last_calculated_at": "2025-01-15T..."
  }
}
```

#### 2. Cập Nhật Thông Tin Học Lực
```http
PUT /api/v1/classrooms/{classroomId}/students/{studentId}/performance
Authorization: Bearer {token}

Body:
{
  "total_exams": 11,
  "average_score": 8.7,
  "subject_performance": {
    "math": 9.2,
    "physics": 8.2
  },
  "strong_topic": {
    "algebra": 9.5,
    "calculus": 9.0
  },
  "weak_topic": {
    "geometry": 7.5
  }
}

Response 200:
{
  "success": true,
  "message": "Cập nhật thông tin học lực thành công",
  "data": {...}
}
```

#### 3. Lấy Bảng Xếp Hạng Lớp
```http
GET /api/v1/classrooms/{classroomId}/leaderboard
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "average_score": 9.5,
      "total_exams": 10,
      "student": {
        "full_name": "Nguyễn Văn A",
        "student_code": "SV001"
      }
    },
    ...
  ]
}
```

## Validation Rules

### Classroom
- `name`: Bắt buộc, tối đa 255 ký tự
- `school_year`: Tùy chọn, tối đa 50 ký tự
- `avatar_url`: Tùy chọn, phải là URL hợp lệ
- `status`: Tùy chọn, chỉ chấp nhận: active, archived, unactive

### Student
- `full_name`: Bắt buộc, tối đa 255 ký tự
- `student_code`: Bắt buộc, tối đa 50 ký tự, phải unique
- `phone_number`: Tùy chọn, 10-11 chữ số
- `parent_phone_number`: Tùy chọn, 10-11 chữ số
- `is_active`: Tùy chọn, boolean

### Student Performance
- `total_exams`: Tùy chọn, số nguyên >= 0
- `average_score`: Tùy chọn, float 0-10
- `subject_performance`: Tùy chọn, object JSON
- `strong_topic`: Tùy chọn, object JSON
- `weak_topic`: Tùy chọn, object JSON

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Tên lớp học không được để trống",
      "param": "name",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Không tìm thấy lớp học"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi tạo lớp học",
  "error": "Error details..."
}
```

## Use Cases

### 1. Tạo Lớp Học và Thêm Học Sinh

```javascript
// Bước 1: Tạo lớp học
POST /api/v1/classrooms
{
  "name": "Lớp Toán 10A1",
  "school_year": "2025-2026"
}

// Bước 2: Tạo học sinh (nếu chưa có)
POST /api/v1/classrooms/students
{
  "full_name": "Nguyễn Văn A",
  "student_code": "SV001"
}

// Bước 3: Thêm học sinh vào lớp
POST /api/v1/classrooms/{classroomId}/students
{
  "student_id": "{studentId}"
}
```

### 2. Theo Dõi Hiệu Suất Học Sinh

```javascript
// Bước 1: Lấy danh sách học sinh trong lớp
GET /api/v1/classrooms/{classroomId}/students

// Bước 2: Cập nhật hiệu suất cho từng học sinh
PUT /api/v1/classrooms/{classroomId}/students/{studentId}/performance
{
  "total_exams": 5,
  "average_score": 8.5,
  "subject_performance": {
    "math": 9.0,
    "physics": 8.0
  }
}

// Bước 3: Xem bảng xếp hạng
GET /api/v1/classrooms/{classroomId}/leaderboard
```

### 3. Quản Lý Học Sinh Đã Hoàn Thành Khóa Học

```javascript
// Cập nhật trạng thái học sinh sang "completed"
PUT /api/v1/classrooms/{classroomId}/students/{studentId}
{
  "status": "completed"
}

// Lọc xem các học sinh đã hoàn thành
GET /api/v1/classrooms/{classroomId}/students?status=completed
```

## Notes

1. **Authentication**: Tất cả APIs đều yêu cầu Bearer token trong header
2. **Authorization**: Giáo viên chỉ có thể quản lý lớp học của mình
3. **Cascade Delete**: Khi xóa lớp học hoặc học sinh, các bản ghi liên quan cũng bị xóa
4. **Unique Constraint**: Mã học sinh (student_code) phải unique trong toàn hệ thống
5. **JSON Fields**: subject_performance, strong_topic, weak_topic có thể chứa cấu trúc dữ liệu tùy ý

## Testing với Swagger

Sau khi khởi động server, truy cập:
```
http://localhost:3000/docs
```

Tại đây bạn có thể test tất cả APIs với giao diện Swagger UI.
