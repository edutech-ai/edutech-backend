// Coze type -> Backend enum mapping
const QUESTION_TYPE_MAP = {
  // Coze outputs
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
  // Coze outputs
  'recognition': 'KNOWLEDGE',
  'understanding': 'COMPREHENSION',
  'application': 'APPLICATION',
  'high_application': 'ANALYSIS',
  // Alternative names
  'knowledge': 'KNOWLEDGE',
  'comprehension': 'COMPREHENSION',
  'analysis': 'ANALYSIS',
  'synthesis': 'SYNTHESIS',
  'evaluation': 'EVALUATION',
  // Already correct (passthrough)
  'KNOWLEDGE': 'KNOWLEDGE',
  'COMPREHENSION': 'COMPREHENSION',
  'APPLICATION': 'APPLICATION',
  'ANALYSIS': 'ANALYSIS',
  'SYNTHESIS': 'SYNTHESIS',
  'EVALUATION': 'EVALUATION',
};

// Valid backend enums
const VALID_TYPES = ['MCQ', 'MULTIPLE_ANSWER', 'TRUE_FALSE', 'ESSAY', 'FILL_BLANK'];
const VALID_DIFFICULTIES = ['KNOWLEDGE', 'COMPREHENSION', 'APPLICATION', 'ANALYSIS', 'SYNTHESIS', 'EVALUATION'];

// LaTeX patterns for detection and conversion
const LATEX_PATTERNS = [
  /\$\$(.+?)\$\$/g,           // $$...$$ block
  /\$(.+?)\$/g,               // $...$ inline
  /\\begin\{.*?\}/,           // \begin{...}
  /\\frac\{/,                 // \frac{
  /\\sqrt\{/,                 // \sqrt{
  /\\[a-zA-Z]+/,              // \alpha, \beta, etc.
  /\^{.*?}/,                  // ^{...} superscript
  /_{.*?}/,                   // _{...} subscript
];

class QuizNormalizer {
  /**
   * Check if text contains LaTeX
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static containsLatex(text) {
    if (!text || typeof text !== 'string') return false;
    return LATEX_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Wrap LaTeX content in proper HTML span
   * Converts various LaTeX formats to consistent <span>...</span> format
   * @param {string} text - Text containing LaTeX
   * @returns {string} HTML formatted text
   */
  static wrapLatex(text) {
    if (!text || typeof text !== 'string') return text;

    let result = text;

    // Convert $$...$$ block LaTeX to <span>...</span>
    result = result.replace(/\$\$(.+?)\$\$/g, '<span>$1</span>');

    // Convert $...$ inline LaTeX to <span>...</span>
    result = result.replace(/\$(.+?)\$/g, '<span>$1</span>');

    // If still contains raw LaTeX (like \alpha, \frac) without delimiters,
    // wrap the entire content in span
    if (QuizNormalizer.containsLatex(result) && !result.includes('<span>')) {
      result = `<span>${result}</span>`;
    }

    return result;
  }

  /**
   * Wrap text content in HTML paragraph tag
   * Handles LaTeX content appropriately
   * @param {string} text - Text to wrap
   * @returns {string} HTML wrapped text
   */
  static wrapInHtml(text) {
    if (!text || typeof text !== 'string') return '<p></p>';

    // Already wrapped in HTML
    if (text.trim().startsWith('<p>') || text.trim().startsWith('<div>')) {
      return text;
    }

    // Process LaTeX first
    let processed = QuizNormalizer.wrapLatex(text.trim());

    // Wrap in paragraph
    return `<p>${processed}</p>`;
  }

  /**
   * Normalize question type from Coze format to Backend enum
   * @param {string} cozeType - Type from Coze output
   * @returns {string} Backend enum type
   */
  static normalizeType(cozeType) {
    if (!cozeType) return 'MCQ'; // Default

    const normalized = QUESTION_TYPE_MAP[cozeType.toLowerCase()] ||
                       QUESTION_TYPE_MAP[cozeType];

    if (!normalized || !VALID_TYPES.includes(normalized)) {
      console.warn(`Unknown question type: ${cozeType}, defaulting to MCQ`);
      return 'MCQ';
    }

    return normalized;
  }

  /**
   * Normalize bloom level/difficulty from Coze format to Backend enum
   * @param {string} cozeBloom - Bloom level from Coze output
   * @returns {string} Backend enum difficulty
   */
  static normalizeDifficulty(cozeBloom) {
    if (!cozeBloom) return 'COMPREHENSION'; // Default

    const normalized = BLOOM_LEVEL_MAP[cozeBloom.toLowerCase()] ||
                       BLOOM_LEVEL_MAP[cozeBloom];

    if (!normalized || !VALID_DIFFICULTIES.includes(normalized)) {
      console.warn(`Unknown bloom level: ${cozeBloom}, defaulting to COMPREHENSION`);
      return 'COMPREHENSION';
    }

    return normalized;
  }

  /**
   * Normalize options format
   * Coze return: { "A": "text", "B": "text" } or ["text1", "text2"] or [{key, value}]
   * Backend expects: ["<p>text1</p>", "<p>text2</p>"] - array of HTML strings
   * @param {Object|Array} options - Options from Coze
   * @returns {Object} { options: Array, keyMap: Object } - Normalized options and key mapping
   */
  static normalizeOptions(options) {
    if (!options) return { options: null, keyMap: {} };

    const keyMap = {}; // Maps "A", "B", etc. to actual content for answer lookup
    let normalizedOptions = [];

    // Already an array
    if (Array.isArray(options)) {
      // Check if array of {key, value} objects
      if (options.length > 0 && typeof options[0] === 'object' && options[0].key !== undefined) {
        options.forEach(opt => {
          const content = QuizNormalizer.wrapInHtml(opt.value);
          normalizedOptions.push(content);
          keyMap[opt.key] = content;
        });
      } else {
        // Array of strings
        const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        options.forEach((opt, idx) => {
          const content = QuizNormalizer.wrapInHtml(typeof opt === 'string' ? opt : String(opt));
          normalizedOptions.push(content);
          if (idx < keys.length) {
            keyMap[keys[idx]] = content;
          }
        });
      }
    }
    // Object format { A: "text", B: "text" }
    else if (typeof options === 'object') {
      // Sort keys to maintain order (A, B, C, D...)
      const sortedKeys = Object.keys(options).sort();
      sortedKeys.forEach(key => {
        const content = QuizNormalizer.wrapInHtml(options[key]);
        normalizedOptions.push(content);
        keyMap[key] = content;
      });
    }

    return { options: normalizedOptions.length > 0 ? normalizedOptions : null, keyMap };
  }

  /**
   * Normalize correct answer
   * Converts answer key (A, B, C, D) to actual HTML content
   * @param {*} answer - Answer from Coze (could be "A", "B", or actual content)
   * @param {string} type - Question type
   * @param {Object} keyMap - Mapping of keys to content from normalizeOptions
   * @returns {*} Normalized answer as HTML content
   */
  static normalizeAnswer(answer, type, keyMap = {}) {
    if (answer === undefined || answer === null) return null;

    // For true/false, normalize to HTML wrapped boolean
    if (type === 'TRUE_FALSE') {
      if (typeof answer === 'boolean') {
        return QuizNormalizer.wrapInHtml(answer ? 'True' : 'False');
      }
      const boolStr = String(answer).toLowerCase();
      if (boolStr === 'true' || boolStr === 'đúng' || boolStr === 'yes') {
        return QuizNormalizer.wrapInHtml('True');
      }
      return QuizNormalizer.wrapInHtml('False');
    }

    // For multiple choice (multiple answers), ensure array of content
    if (type === 'MULTIPLE_ANSWER') {
      const answers = Array.isArray(answer) ? answer : [answer];
      return answers.map(a => {
        // If answer is a key (A, B, C), convert to content
        if (typeof a === 'string' && keyMap[a.toUpperCase()]) {
          return keyMap[a.toUpperCase()];
        }
        // Otherwise wrap as HTML
        return QuizNormalizer.wrapInHtml(a);
      });
    }

    // For MCQ, convert key to content
    if (typeof answer === 'string') {
      const upperAnswer = answer.toUpperCase();
      // If answer is a key (A, B, C, D), get the actual content
      if (keyMap[upperAnswer]) {
        return keyMap[upperAnswer];
      }
      // If answer is already content, wrap in HTML
      return QuizNormalizer.wrapInHtml(answer);
    }

    return QuizNormalizer.wrapInHtml(String(answer));
  }

  /**
   * Normalize a single question from Coze output
   * @param {Object} cozeQuestion - Question from Coze
   * @param {string} quizId - Quiz ID to associate
   * @returns {Object} Normalized question for Backend
   */
  static normalizeQuestion(cozeQuestion, quizId) {
    // Handle different Coze output structures
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

    // Normalize options and get keyMap for answer conversion
    const { options: normalizedOptions, keyMap } = QuizNormalizer.normalizeOptions(rawOptions);

    return {
      quiz_id: quizId,
      content: QuizNormalizer.wrapInHtml(prompt),
      type: normalizedType,
      difficulty: QuizNormalizer.normalizeDifficulty(rawBloom),
      options: normalizedOptions,
      correct_answer: QuizNormalizer.normalizeAnswer(rawAnswer, normalizedType, keyMap),
      point: parseFloat(score) || 1.0,
      explanation: rawExplanation ? QuizNormalizer.wrapInHtml(rawExplanation) : '<p></p>',
      // Extra metadata (can be stored in JSON field if needed)
      metadata: {
        skill_tag: skillTag,
        original_qid: cozeQuestion.qid,
      }
    };
  }

  /**
   * Normalize full quiz output from Coze
   * @param {Object} cozeOutput - Full Coze response
   * @param {string} quizId - Quiz ID
   * @returns {Object} Normalized quiz data
   */
  static normalizeQuiz(cozeOutput, quizId) {
    // Handle case where cozeOutput is the questions array directly
    const questions = cozeOutput.question_matrix ||
                      cozeOutput.questions ||
                      (Array.isArray(cozeOutput) ? cozeOutput : []);

    const normalizedQuestions = questions.map(q => QuizNormalizer.normalizeQuestion(q, quizId));

    // Validate total score if provided
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
   * Parse JSON string safely
   * @param {string} jsonString - JSON string from Coze
   * @returns {Object|null} Parsed object or null
   */
  static safeParseJSON(jsonString) {
    if (!jsonString) return null;
    if (typeof jsonString !== 'string') return jsonString;

    try {
      // Remove markdown code blocks if present
      let cleaned = jsonString.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
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
