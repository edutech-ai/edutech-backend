// Coze type -> Backend enum mapping
const QUESTION_TYPE_MAP = {
  'single_choice': 'MCQ',
  'multiple_choice': 'MULTIPLE_ANSWER',
  'true_false': 'TRUE_FALSE',
  'MCQ': 'MCQ',
  'MULTIPLE_ANSWER': 'MULTIPLE_ANSWER',
  'TRUE_FALSE': 'TRUE_FALSE',
  'ESSAY': 'ESSAY',
  'FILL_BLANK': 'FILL_BLANK',
};

// Coze bloom levels -> Backend difficulty mapping
const BLOOM_LEVEL_MAP = {
  'recognition': 'KNOWLEDGE',
  'understanding': 'COMPREHENSION',
  'application': 'APPLICATION',
  'high_application': 'ANALYSIS',
  'knowledge': 'KNOWLEDGE',
  'comprehension': 'COMPREHENSION',
  'analysis': 'ANALYSIS',
  'synthesis': 'SYNTHESIS',
  'evaluation': 'EVALUATION',
  'KNOWLEDGE': 'KNOWLEDGE',
  'COMPREHENSION': 'COMPREHENSION',
  'APPLICATION': 'APPLICATION',
  'ANALYSIS': 'ANALYSIS',
  'SYNTHESIS': 'SYNTHESIS',
  'EVALUATION': 'EVALUATION',
};

const VALID_TYPES = ['MCQ', 'MULTIPLE_ANSWER', 'TRUE_FALSE', 'ESSAY', 'FILL_BLANK'];
const VALID_DIFFICULTIES = ['KNOWLEDGE', 'COMPREHENSION', 'APPLICATION', 'ANALYSIS', 'SYNTHESIS', 'EVALUATION'];

class QuizNormalizer {
  /**
   * Convert Quill HTML / any HTML to plain text + $...$ LaTeX
   *
   * Handles:
   * - Quill formula: <span class="ql-formula" data-value="x^2">...</span> → $x^2$
   * - Generic <span> with LaTeX: <span>\alpha + \beta</span> → $\alpha + \beta$
   * - All other HTML tags stripped, text preserved
   * - HTML entities decoded
   *
   * @param {string} html - HTML string (from Quill editor or AI output)
   * @returns {string} Plain text with $...$ LaTeX
   */
  static stripHtml(html) {
    if (!html || typeof html !== 'string') return '';

    let result = html;

    // 1. Quill formula spans → $...$
    //    <span class="ql-formula" data-value="x^2 + 1">rendered content</span>
    result = result.replace(
      /<span[^>]*class="ql-formula"[^>]*data-value="([^"]*)"[^>]*>.*?<\/span>/gi,
      ' $$$1$$ '
    );

    // 2. Generic <span> containing LaTeX (from older normalizer or manual input)
    //    <span>\frac{1}{2}</span> → $\frac{1}{2}$
    result = result.replace(
      /<span[^>]*>((?:[^<])*(?:\\[a-zA-Z]+|[\\^_{}])[^<]*)<\/span>/gi,
      ' $$$1$$ '
    );

    // 3. <br> and block tags → newline
    result = result.replace(/<br\s*\/?>/gi, '\n');
    result = result.replace(/<\/(p|div|li|h[1-6])>/gi, '\n');

    // 4. Strip all remaining HTML tags
    result = result.replace(/<[^>]+>/g, '');

    // 5. Decode HTML entities
    result = result.replace(/&amp;/g, '&');
    result = result.replace(/&lt;/g, '<');
    result = result.replace(/&gt;/g, '>');
    result = result.replace(/&quot;/g, '"');
    result = result.replace(/&#39;/g, "'");
    result = result.replace(/&nbsp;/g, ' ');

    // 6. Clean up: collapse whitespace, trim, remove blank lines
    result = result.replace(/[ \t]+/g, ' ');
    result = result.replace(/\n\s*\n/g, '\n');
    result = result.trim();

    return result;
  }

  /**
   * Normalize any text input to plain text + $...$ LaTeX
   * Works with: Quill HTML, plain text, raw LaTeX, or already-normalized text
   *
   * @param {string} text - Input text (any format)
   * @returns {string} Clean plain text with $...$ LaTeX
   */
  static normalizeText(text) {
    if (!text || typeof text !== 'string') return '';

    const trimmed = text.trim();

    // Contains HTML tags → strip and convert
    if (/<[^>]+>/.test(trimmed)) {
      return QuizNormalizer.stripHtml(trimmed);
    }

    // Plain text with raw LaTeX (no $...$ delimiters)
    // Only wrap if the ENTIRE string looks like a LaTeX expression
    // e.g. "\alpha + \beta" → "$\alpha + \beta$"
    // but "Giải phương trình: 3x - 7 = 2x + 5" → kept as-is
    if (!/\$[^$]+\$/.test(trimmed) && /^\\[a-zA-Z]/.test(trimmed)) {
      return `$${trimmed}$`;
    }

    return trimmed;
  }

  static normalizeType(cozeType) {
    if (!cozeType) return 'MCQ';
    const normalized = QUESTION_TYPE_MAP[cozeType.toLowerCase()] || QUESTION_TYPE_MAP[cozeType];
    if (!normalized || !VALID_TYPES.includes(normalized)) {
      console.warn(`Unknown question type: ${cozeType}, defaulting to MCQ`);
      return 'MCQ';
    }
    return normalized;
  }

  static normalizeDifficulty(cozeBloom) {
    if (!cozeBloom) return 'COMPREHENSION';
    const normalized = BLOOM_LEVEL_MAP[cozeBloom.toLowerCase()] || BLOOM_LEVEL_MAP[cozeBloom];
    if (!normalized || !VALID_DIFFICULTIES.includes(normalized)) {
      console.warn(`Unknown bloom level: ${cozeBloom}, defaulting to COMPREHENSION`);
      return 'COMPREHENSION';
    }
    return normalized;
  }

  /**
   * Normalize options from various AI/editor formats
   * Output: plain string array + keyMap for answer lookup
   *
   * Input formats:
   *   { "A": "text", "B": "text" }
   *   ["text1", "text2"]
   *   [{key: "A", value: "text"}, ...]
   *
   * Output: ["plain text with $latex$", ...]
   */
  static normalizeOptions(options) {
    if (!options) return { options: null, keyMap: {} };

    const keyMap = {};
    const normalizedOptions = [];

    if (Array.isArray(options)) {
      if (options.length > 0 && typeof options[0] === 'object' && options[0].key !== undefined) {
        options.forEach(opt => {
          const content = QuizNormalizer.normalizeText(opt.value);
          normalizedOptions.push(content);
          keyMap[opt.key] = content;
        });
      } else {
        const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        options.forEach((opt, idx) => {
          const content = QuizNormalizer.normalizeText(typeof opt === 'string' ? opt : String(opt));
          normalizedOptions.push(content);
          if (idx < keys.length) keyMap[keys[idx]] = content;
        });
      }
    } else if (typeof options === 'object') {
      Object.keys(options).sort().forEach(key => {
        const content = QuizNormalizer.normalizeText(options[key]);
        normalizedOptions.push(content);
        keyMap[key] = content;
      });
    }

    return { options: normalizedOptions.length > 0 ? normalizedOptions : null, keyMap };
  }

  /**
   * Normalize correct answer: convert key (A/B/C/D) to actual content
   */
  static normalizeAnswer(answer, type, keyMap = {}) {
    if (answer === undefined || answer === null) return null;

    if (type === 'TRUE_FALSE') {
      if (typeof answer === 'boolean') return answer ? 'True' : 'False';
      const s = String(answer).toLowerCase();
      return (s === 'true' || s === 'đúng' || s === 'yes') ? 'True' : 'False';
    }

    if (type === 'MULTIPLE_ANSWER') {
      const answers = Array.isArray(answer) ? answer : [answer];
      return answers.map(a => {
        if (typeof a === 'string' && keyMap[a.toUpperCase()]) return keyMap[a.toUpperCase()];
        return QuizNormalizer.normalizeText(String(a));
      });
    }

    if (typeof answer === 'string') {
      if (keyMap[answer.toUpperCase()]) return keyMap[answer.toUpperCase()];
      return QuizNormalizer.normalizeText(answer);
    }

    return QuizNormalizer.normalizeText(String(answer));
  }

  /**
   * Normalize a single question from Coze AI output
   * All fields stored as plain text + $...$ LaTeX
   */
  static normalizeQuestion(cozeQuestion, quizId) {
    const contentObj = cozeQuestion.content || cozeQuestion;
    const prompt = contentObj.prompt || contentObj.question || contentObj.text ||
                   (typeof cozeQuestion.content === 'string' ? cozeQuestion.content : '');
    const rawType = contentObj.type || cozeQuestion.type;
    const rawBloom = contentObj.bloom || cozeQuestion.bloom || cozeQuestion.difficulty;
    const rawOptions = contentObj.options || cozeQuestion.options;
    const rawAnswer = contentObj.answer || contentObj.correct_answer || cozeQuestion.answer || cozeQuestion.correct_answer;
    const score = contentObj.score || cozeQuestion.score || cozeQuestion.point || 1.0;
    const rawExplanation = contentObj.explanation || cozeQuestion.explanation || null;
    const skillTag = contentObj.skill_tag || cozeQuestion.skill_tag || null;

    const normalizedType = QuizNormalizer.normalizeType(rawType);
    const { options: normalizedOptions, keyMap } = QuizNormalizer.normalizeOptions(rawOptions);

    return {
      quiz_id: quizId,
      content: QuizNormalizer.normalizeText(prompt),
      type: normalizedType,
      difficulty: QuizNormalizer.normalizeDifficulty(rawBloom),
      options: normalizedOptions,
      correct_answer: QuizNormalizer.normalizeAnswer(rawAnswer, normalizedType, keyMap),
      point: parseFloat(score) || 1.0,
      explanation: rawExplanation ? QuizNormalizer.normalizeText(rawExplanation) : '',
      metadata: {
        skill_tag: skillTag,
        original_qid: cozeQuestion.qid,
      }
    };
  }

  /**
   * Normalize full quiz output from Coze
   */
  static normalizeQuiz(cozeOutput, quizId) {
    const questions = cozeOutput.question_matrix ||
                      cozeOutput.questions ||
                      (Array.isArray(cozeOutput) ? cozeOutput : []);

    const normalizedQuestions = questions.map(q => QuizNormalizer.normalizeQuestion(q, quizId));

    const expectedTotal = cozeOutput.total_score;
    if (expectedTotal) {
      const actualTotal = normalizedQuestions.reduce((sum, q) => sum + q.point, 0);
      if (Math.abs(actualTotal - expectedTotal) > 0.01) {
        console.warn(`Score mismatch: expected ${expectedTotal}, got ${actualTotal}`);
      }
    }

    return {
      metadata: {
        subject: cozeOutput.subject,
        grade: cozeOutput.grade,
        total_questions: cozeOutput.total_questions || questions.length,
        total_score: cozeOutput.total_score,
        time_limit_minutes: cozeOutput.time_limit_minutes,
        units: cozeOutput.units,
        question_types_allowed: cozeOutput.question_types_allowed,
        bloom_levels: cozeOutput.bloom_levels,
      },
      questions: normalizedQuestions
    };
  }

  /**
   * Parse JSON string safely (strips markdown code blocks)
   */
  static safeParseJSON(jsonString) {
    if (!jsonString) return null;
    if (typeof jsonString !== 'string') return jsonString;

    try {
      let cleaned = jsonString.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse JSON from Coze:', error.message);
      console.error('Raw content:', jsonString.substring(0, 500));
      return null;
    }
  }
}

module.exports = QuizNormalizer;
