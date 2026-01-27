const StudentScore = require('../models/StudentScore');
const StudentHandRaise = require('../models/StudentHandRaise');
const StudentPerformance = require('../models/StudentPerformance');

/**
 * Tính toán và cập nhật performance của học sinh
 */
async function recalculatePerformance(classroomId, studentId) {
  try {
    // 1. Lấy thống kê điểm
    const scoreStats = await StudentScore.getStatistics(classroomId, studentId);
    
    // 2. Lấy thống kê giơ tay (đã tính avg per week dựa vào created_at)
    const handRaiseStats = await StudentHandRaise.getStatistics(classroomId, studentId);
    
    // 3. Tính performance level
    const performanceLevel = evaluatePerformanceLevel({
      average_score: scoreStats.average_score,
      avg_hand_raises_per_week: handRaiseStats.avg_hand_raises_per_week
    });
    
    // 4. Tạo đánh giá của hệ thống
    const systemEvaluation = generateSystemEvaluation({
      total_exams: scoreStats.total_exams,
      average_score: scoreStats.average_score,
      highest_score: scoreStats.highest_score,
      lowest_score: scoreStats.lowest_score,
      total_hand_raises: handRaiseStats.total_hand_raises,
      avg_hand_raises_per_week: handRaiseStats.avg_hand_raises_per_week,
      weeks_tracked: handRaiseStats.weeks_tracked,
      performance_level: performanceLevel
    });
    
    // 5. Cập nhật performance
    await StudentPerformance.upsert({
      classroom_id: classroomId,
      student_id: studentId,
      total_exams: scoreStats.total_exams || 0,
      average_score: scoreStats.average_score,
      highest_score: scoreStats.highest_score,
      lowest_score: scoreStats.lowest_score,
      total_weeks_tracked: handRaiseStats.weeks_tracked || 0,
      total_hand_raises: handRaiseStats.total_hand_raises || 0,
      avg_hand_raises_per_week: handRaiseStats.avg_hand_raises_per_week || 0,
      performance_level: performanceLevel,
      system_evaluation: systemEvaluation
    });
    
    return { success: true, performance_level: performanceLevel };
  } catch (error) {
    console.error('Error recalculating performance:', error);
    throw error;
  }
}

/**
 * Đánh giá mức độ performance
 */
function evaluatePerformanceLevel({ average_score, avg_hand_raises_per_week }) {
  const scoreWeight = 0.6;  // Điểm số chiếm 60%
  const participationWeight = 0.4;  // Tham gia chiếm 40%
  
  // Chuẩn hóa điểm (0-1)
  const scoreRating = average_score ? average_score / 10 : 0;
  
  // Chuẩn hóa tham gia (giả sử 10 lần/tuần là excellent)
  const participationRating = Math.min(avg_hand_raises_per_week / 10, 1);
  
  // Tính tổng điểm
  const totalScore = (scoreRating * scoreWeight) + (participationRating * participationWeight);
  
  // Phân loại
  if (totalScore >= 0.85) return 'excellent';
  if (totalScore >= 0.7) return 'good';
  if (totalScore >= 0.5) return 'average';
  if (totalScore >= 0.3) return 'needs_improvement';
  return 'at_risk';
}

/**
 * Tạo đánh giá chi tiết của hệ thống
 */
function generateSystemEvaluation(metrics) {
  const evaluations = [];
  
  // Đánh giá điểm số
  if (metrics.total_exams === 0 || !metrics.average_score) {
    evaluations.push("Chưa có dữ liệu điểm kiểm tra");
  } else {
    const avgScore = parseFloat(metrics.average_score) || 0;
    if (avgScore >= 9) {
      evaluations.push(`Điểm số xuất sắc (${avgScore.toFixed(2)}/10)`);
    } else if (avgScore >= 8) {
      evaluations.push(`Điểm số rất tốt (${avgScore.toFixed(2)}/10)`);
    } else if (avgScore >= 6.5) {
      evaluations.push(`Điểm số khá (${avgScore.toFixed(2)}/10)`);
    } else if (avgScore >= 5) {
      evaluations.push(`Điểm số trung bình (${avgScore.toFixed(2)}/10)`);
    } else {
      evaluations.push(`Cần cải thiện điểm số (${avgScore.toFixed(2)}/10)`);
    }
    
    if (metrics.total_exams > 0) {
      evaluations.push(`Đã hoàn thành ${metrics.total_exams} bài kiểm tra`);
    }
  }
  
  // Đánh giá tham gia
  if (!metrics.total_hand_raises || metrics.total_hand_raises === 0) {
    evaluations.push("Chưa có dữ liệu tham gia");
  } else {
    const avgRaises = parseFloat(metrics.avg_hand_raises_per_week) || 0;
    const totalRaises = metrics.total_hand_raises || 0;
    const weeksTracked = metrics.weeks_tracked || 0;
    
    evaluations.push(`Tổng ${totalRaises} lần giơ tay trong ${weeksTracked} tuần`);
    
    if (avgRaises >= 10) {
      evaluations.push(`Tham gia tích cực (${avgRaises.toFixed(1)} lần/tuần)`);
    } else if (avgRaises >= 5) {
      evaluations.push(`Tham gia khá tốt (${avgRaises.toFixed(1)} lần/tuần)`);
    } else if (avgRaises >= 2) {
      evaluations.push(`Tham gia trung bình (${avgRaises.toFixed(1)} lần/tuần)`);
    } else if (avgRaises > 0) {
      evaluations.push(`Cần tham gia nhiều hơn (${avgRaises.toFixed(1)} lần/tuần)`);
    }
  }
  
  // Đánh giá tổng quan và lời khuyên
  switch (metrics.performance_level) {
    case 'excellent':
      evaluations.push("🌟 Học sinh xuất sắc! Tiếp tục phát huy!");
      break;
    case 'good':
      evaluations.push("👍 Học sinh tốt. Phát huy thêm để đạt mức xuất sắc!");
      break;
    case 'average':
      evaluations.push("📚 Cần cố gắng hơn để nâng cao thành tích.");
      break;
    case 'needs_improvement':
      evaluations.push("⚡ Cần sự hỗ trợ và cải thiện đáng kể.");
      break;
    case 'at_risk':
      evaluations.push("⚠️ Học sinh cần được quan tâm đặc biệt và can thiệp kịp thời.");
      break;
  }
  
  return evaluations.join(". ");
}

/**
 * Tính toán performance cho tất cả học sinh trong lớp
 */
async function recalculateClassroomPerformance(classroomId) {
  try {
    // Lấy danh sách tất cả học sinh trong lớp
    const ClassroomStudent = require('../models/ClassroomStudent');
    const students = await ClassroomStudent.findByClassroomId(classroomId);
    
    const results = {
      success: [],
      errors: []
    };
    
    // Tính performance cho từng học sinh
    for (const student of students) {
      try {
        await recalculatePerformance(classroomId, student.student_id);
        results.success.push(student.student_id);
      } catch (error) {
        results.errors.push({
          student_id: student.student_id,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error recalculating classroom performance:', error);
    throw error;
  }
}

module.exports = {
  recalculatePerformance,
  recalculateClassroomPerformance,
  evaluatePerformanceLevel,
  generateSystemEvaluation
};
