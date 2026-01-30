const axios = require('axios');
const cozeConfig = require('../config/coze');
const QuizNormalizer = require('../utils/quizNormalizer');

class CozeService {
  constructor() {
    this.client = axios.create({
      baseURL: cozeConfig.apiUrl,
      timeout: cozeConfig.timeout,
      headers: {
        'Authorization': `Bearer ${cozeConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate quiz and normalize for database
   */
  async generateAndNormalizeQuiz(params, quizId) {
    const {
      subject,
      grade,
      topic,
      numberOfQuestions = 10,
      questionTypes = ['MCQ'],
      difficulty = 'medium',
      customPrompt,
      quizMatrix,
    } = params;

    // Build prompt
    let prompt = customPrompt || '';

    // If no custom prompt, build default prompt
    if (!customPrompt) {
      prompt = `Tạo ${numberOfQuestions} câu hỏi trắc nghiệm cho môn ${subject} lớp ${grade}`;
      if (topic) prompt += ` về chủ đề: ${topic}`;
      prompt += `\n\nYêu cầu:
            - Loại câu hỏi: ${questionTypes.join(', ')}
            - Độ khó: ${difficulty}`;
    }

    // Add quiz matrix if provided
    if (quizMatrix) {
      prompt += `\n\nDựa theo ma trận đề sau:\n${JSON.stringify(quizMatrix, null, 2)}`;
    }

    // CRITICAL: Add strict instruction at the end (AI prioritizes last instructions)
    // This overrides any conflicting numbers in customPrompt
    prompt += `

⚠️ YÊU CẦU BẮT BUỘC - KHÔNG ĐƯỢC THAY ĐỔI:
- Số lượng câu hỏi: CHÍNH XÁC ${numberOfQuestions} câu (không nhiều hơn, không ít hơn)
- Nếu prompt trước đó có đề cập số khác, BỎ QUA và chỉ tạo đúng ${numberOfQuestions} câu

Trả về dưới dạng JSON với cấu trúc:
{
  "questions": [
    {
      "qid": 1,
      "type": "MCQ",
      "content": "Nội dung câu hỏi",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "answer": "A",
      "explanation": "Giải thích",
      "bloom": "understanding",
      "score": ${(10 / numberOfQuestions).toFixed(2)}
    }
  ],
  "total_questions": ${numberOfQuestions}
}`;

    try {
      // 1. Create chat
      const chatRes = await this.client.post('/v3/chat', {
        bot_id: cozeConfig.botId,
        user_id: cozeConfig.defaultUserId,
        conversation_id: cozeConfig.defaultConversationId,
        additional_messages: [{ role: 'user', content: prompt, content_type: 'text' }],
        stream: false,
        auto_save_history: true,
      });

      const { id: chatId, conversation_id: conversationId } = chatRes.data.data;

      // 2. Poll until completed
      let status = chatRes.data.data.status;
      while (status === 'in_progress' || status === 'created') {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await this.client.get('/v3/chat/retrieve', {
          params: { conversation_id: conversationId, chat_id: chatId },
        });
        status = pollRes.data.data.status;

        if (status === 'failed') {
          return { success: false, error: pollRes.data.data.last_error };
        }
      }

      // 3. Get messages
      const msgRes = await this.client.get('/v3/chat/message/list', {
        params: { conversation_id: conversationId, chat_id: chatId },
      });

      const answer = msgRes.data.data?.find(m => m.type === 'answer' && m.role === 'assistant');
      if (!answer) {
        return { success: false, error: 'No answer from AI' };
      }

      // 4. Parse and normalize
      const parsed = QuizNormalizer.safeParseJSON(answer.content);
      if (!parsed) {
        return { success: false, error: 'Failed to parse JSON', rawContent: answer.content };
      }

      const normalized = QuizNormalizer.normalizeQuiz(parsed, quizId);

      // 5. Enforce exact question count
      const actualCount = normalized.questions.length;
      let warning = null;

      if (actualCount > numberOfQuestions) {
        // Trim excess questions
        console.warn(`AI generated ${actualCount} questions, trimming to ${numberOfQuestions}`);
        normalized.questions = normalized.questions.slice(0, numberOfQuestions);
        warning = `Đã cắt bớt từ ${actualCount} xuống ${numberOfQuestions} câu`;
      } else if (actualCount < numberOfQuestions) {
        // Cannot auto-generate more, just warn
        console.warn(`AI only generated ${actualCount}/${numberOfQuestions} questions`);
        warning = `AI chỉ tạo được ${actualCount}/${numberOfQuestions} câu hỏi`;
      }

      // Update metadata
      normalized.metadata.total_questions = normalized.questions.length;

      return {
        success: true,
        data: normalized,
        chatId,
        conversationId,
        warning,
      };
    } catch (error) {
      // console.error('Coze API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }
}

module.exports = new CozeService();
