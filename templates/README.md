# OMR Answer Sheet Template

## Hướng dẫn setup

1. **Copy file PDF mẫu** vào thư mục này:
   - Tên file: `answer_sheet_template.pdf`
   - Đây là file phiếu thi trống có sẵn (Form 50 câu)

2. **File source**:
   - Lấy từ: `C:\Users\HP\Downloads\Form_50_VI_NOLABEL - BLACK.pdf`
   - Copy và đổi tên thành: `answer_sheet_template.pdf`

3. **Endpoint download**:
   ```
   GET /api/v1/omr/templates/blank
   ```
   - Endpoint này sẽ serve file PDF tĩnh này
   - Frontend/Student tải về, in ra, làm bài, chụp lại và upload

## Quy trình sử dụng

1. **Teacher**: Tạo exam batch với quiz
2. **Student**: Download template tĩnh này
3. **Student**: In phiếu, làm bài (tô đáp án)
4. **Student**: Chụp ảnh hoặc scan phiếu
5. **Student**: Upload lên hệ thống qua endpoint submit
6. **System**: OMR processing tự động chấm điểm
7. **Student/Teacher**: Xem kết quả

## Lưu ý

- File template phải là PDF chuẩn OMR với 50 câu x 4 đáp án (A/B/C/D)
- Phải có QR code region hoặc alignment markers để nhận diện
- Không cần fill thông tin sinh viên động (sinh viên tự ghi tay)
