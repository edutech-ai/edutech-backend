/**
 * Template config cho phiếu trả lời 50 câu
 * Dựa trên Form_50_VI với 3 black squares alignment markers
 * 
 * Ảnh resolution: ~1500x2100px khi scan 300 DPI
 * Black squares: Top-left, Top-right, Bottom-left
 */

module.exports = {
  template_name: '50_questions_standard_v2',
  total_questions: 50,
  
  // Vùng QR code (không có trong phiếu này)
  qr_region: null,

  // Vùng số báo danh (góc trên bên phải, grid dọc)
  // Phiếu có 6 digits × 10 rows (0-9)
  student_id_region: {
    x: 1050,           // Góc phải
    y: 150,            // Từ trên xuống
    grid: {
      rows: 10,        // 0-9 cho mỗi digit
      cols: 6,         // 6 chữ số
      bubble_size: 20, // Size của mỗi bubble
      spacing_x: 25,   // Khoảng cách giữa các cột
      spacing_y: 25    // Khoảng cách giữa các hàng
    }
  },

  // Vùng mã đề (góc trên bên phải, bên cạnh số báo danh)
  // 3 digits × 10 rows
  exam_code_region: {
    x: 1250,           // Bên phải số báo danh
    y: 150,
    grid: {
      rows: 10,        // 0-9
      cols: 3,         // 3 chữ số
      bubble_size: 20,
      spacing_x: 25,
      spacing_y: 25
    }
  },

  // Vùng câu trả lời - Sau khi align, coordinates sẽ chuẩn
  answer_regions: {
    // Cột 1: Câu 1-25 (bên trái)
    column_1: {
      questions: [1, 25],
      start_x: 200,      // Cách lề trái
      start_y: 450,      // Bắt đầu từ đây
      row_height: 35,    // Mỗi câu cách nhau 35px
      bubble_diameter: 20,
      spacing: 45,       // Khoảng cách giữa A,B,C,D
      options: {
        A: { offset_x: 0 },
        B: { offset_x: 45 },
        C: { offset_x: 90 },
        D: { offset_x: 135 }
      }
    },

    // Cột 2: Câu 26-50 (bên phải)
    column_2: {
      questions: [26, 50],
      start_x: 550,      // Bắt đầu cột 2
      start_y: 450,      // Cùng hàng với cột 1
      row_height: 35,
      bubble_diameter: 20,
      spacing: 45,
      options: {
        A: { offset_x: 0 },
        B: { offset_x: 45 },
        C: { offset_x: 90 },
        D: { offset_x: 135 }
      }
    }
  },

  // Expected alignment
  alignment: {
    marker_distance: 600, // Distance between top-left and top-right markers
    expected_width: 1500,
    expected_height: 2100
  }
};
