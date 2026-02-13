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

ĐỊNH DẠNG TOÁN HỌC (BẮT BUỘC):
- Mọi biểu thức toán, công thức, ký hiệu toán học PHẢI được bọc trong dấu $...$ (LaTeX inline)
- Ví dụ ĐÚNG: "Giải phương trình $3x - 7 = 2x + 5$"
- Ví dụ SAI: "Giải phương trình 3x - 7 = 2x + 5"
- Ví dụ ĐÚNG option: "$x = 12$"
- Ví dụ SAI option: "x = 12"
- Dùng LaTeX chuẩn: $\\frac{1}{2}$, $\\sqrt{3}$, $\\Delta$, $x^2$, $\\alpha$, $\\leq$, $\\times$
- KHÔNG dùng Unicode toán học (², ×, Δ, √). LUÔN dùng LaTeX thay thế
- Phần text thường (không phải toán) thì viết bình thường, KHÔNG bọc trong $...$

Trả về dưới dạng JSON với cấu trúc:
{
  "questions": [
    {
      "qid": 1,
      "type": "MCQ",
      "content": "Cho phương trình bậc hai $y = 2x^2 - 4x + 1$. Giá trị delta của phương trình này là bao nhiêu?",
      "options": {"A": "$\\Delta = 16 - 8 = 8$", "B": "$\\Delta = (-4)^2 - 4 \\times 2 \\times 1 = 8$", "C": "...", "D": "..."},
      "answer": "A",
      "explanation": "Công thức tính delta: $\\Delta = b^2 - 4ac$ với $a = 2$, $b = -4$, $c = 1$.",
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

      if (chatRes.data.code !== 0 || !chatRes.data.data) {
        throw new Error(chatRes.data.msg || 'AI Initialization failed');
      }

      const { id: chatId, conversation_id: conversationId } = chatRes.data.data;

      // 2. Poll until completed
      let status = chatRes.data.data.status;
      while (status === 'in_progress' || status === 'created') {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await this.client.get('/v3/chat/retrieve', {
          params: { conversation_id: conversationId, chat_id: chatId },
        });

        if (pollRes.data.code !== 0 || !pollRes.data.data) {
          throw new Error(pollRes.data.msg || 'AI Polling failed');
        }

        status = pollRes.data.data.status;

        if (status === 'failed') {
          return { success: false, error: pollRes.data.data.last_error?.msg || 'AI Generation failed' };
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

  /**
   * Validate user prompt before generation
   * @param {string} prompt - User's input prompt
   * @returns {Object} Validation result
   */
  async validatePrompt(prompt) {
    if (!cozeConfig.promptBotId) {
      console.warn('Skipping prompt validation: COZE_BOT_VALIDATION_ID not set');
      return { success: true, skipped: true, data: { is_test_description: true } };
    }

    try {
      // 1. Create chat with VALIDATION bot
      const chatRes = await this.client.post('/v3/chat', {
        bot_id: cozeConfig.promptBotId,
        user_id: cozeConfig.defaultUserId,
        additional_messages: [{ role: 'user', content: prompt, content_type: 'text' }],
        stream: false,
        auto_save_history: true,
      });

      if (chatRes.data.code !== 0 || !chatRes.data.data) {
        console.error('Coze API Unexpected Response:', JSON.stringify(chatRes.data));
        throw new Error(chatRes.data.msg || 'Failed to initialize chat');
      }

      const { id: chatId, conversation_id: conversationId } = chatRes.data.data;

      // 2. Poll until completed
      let status = chatRes.data.data.status;
      while (status === 'in_progress' || status === 'created') {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await this.client.get('/v3/chat/retrieve', {
          params: { conversation_id: conversationId, chat_id: chatId },
        });

        if (pollRes.data.code !== 0 || !pollRes.data.data) {
          throw new Error(pollRes.data.msg || 'Validation Polling failed');
        }

        status = pollRes.data.data.status;

        if (status === 'failed') {
          return { success: false, error: pollRes.data.data.last_error?.msg || 'Validation failed' };
        }
      }

      // 3. Get messages
      const msgRes = await this.client.get('/v3/chat/message/list', {
        params: { conversation_id: conversationId, chat_id: chatId },
      });

      const answer = msgRes.data.data?.find(m => m.type === 'answer' && m.role === 'assistant');
      if (!answer) {
        return { success: false, error: 'No answer from Validation AI' };
      }

      // 4. Parse JSON
      const parsed = QuizNormalizer.safeParseJSON(answer.content);
      if (!parsed) {
        return {
          success: false,
          error: 'Invalid JSON from Validation AI',
          rawContent: answer.content
        };
      }

      return {
        success: true,
        data: parsed,
        chatId,
        conversationId,
      };

    } catch (error) {
      console.error('Coze API Error (validatePrompt):', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Analyze quiz quality and provide feedback
   * @param {Object} quizData - Quiz data with questions
   * @returns {Object} Analysis result from AI
   */
  async analyzeQuiz(quizData) {
    try {
      // Send the quiz data in clean JSON format
      const prompt = JSON.stringify(quizData, null, 2);

      // 1. Create chat with ANALYZE bot
      const chatRes = await this.client.post('/v3/chat', {
        bot_id: cozeConfig.analyzeBotId,
        user_id: cozeConfig.defaultUserId,
        conversation_id: cozeConfig.analyzeConversationId,
        additional_messages: [{ role: 'user', content: prompt, content_type: 'text' }],
        stream: false,
        auto_save_history: true,
      });

      if (chatRes.data.code !== 0 || !chatRes.data.data) {
        throw new Error(chatRes.data.msg || 'Analysis Initialization failed');
      }

      const { id: chatId, conversation_id: conversationId } = chatRes.data.data;

      // 2. Poll until completed
      let status = chatRes.data.data.status;
      while (status === 'in_progress' || status === 'created') {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await this.client.get('/v3/chat/retrieve', {
          params: { conversation_id: conversationId, chat_id: chatId },
        });

        if (pollRes.data.code !== 0 || !pollRes.data.data) {
          throw new Error(pollRes.data.msg || 'Analysis Polling failed');
        }

        status = pollRes.data.data.status;

        if (status === 'failed') {
          return { success: false, error: pollRes.data.data.last_error?.msg || 'Analysis failed' };
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

      // 4. Parse JSON response
      const parsed = QuizNormalizer.safeParseJSON(answer.content);
      if (!parsed) {
        return {
          success: false,
          error: 'Failed to parse JSON response',
          rawContent: answer.content
        };
      }

      return {
        success: true,
        data: parsed,
        chatId,
        conversationId,
      };
    } catch (error) {
      console.error('Coze API Error (analyzeQuiz):', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }
}

module.exports = new CozeService();
