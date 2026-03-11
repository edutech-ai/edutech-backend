module.exports = {
  apiUrl: process.env.COZE_API_URL || process.env.API_COZE_URL || 'https://api.coze.com',
  accessToken: process.env.COZE_ACCESS_TOKEN || process.env.API_COZE_API_KEY,

  // Bot for quiz generation
  botId: process.env.COZE_BOT_ID || process.env.API_COZE_CHATBOT_ID,
  defaultConversationId: process.env.COZE_CONVERSATION_ID || process.env.API_COZE_CONVERSATION_ID,

  // Bot for quiz analysis
  analyzeBotId: process.env.COZE_BOT_ANALYZE_ID,
  analyzeConversationId: process.env.COZE_CONVERSATION_ANALYZE_ID,

  // Bot for prompt validation
  promptBotId: process.env.COZE_BOT_VALIDATION_ID,

  // Bot for converting exam PDF to quiz
  convertBotId: process.env.COZE_BOT_CONVERT_ID,

  defaultUserId: process.env.COZE_DEFAULT_USER_ID || 'edutech_system',
  timeout: parseInt(process.env.COZE_TIMEOUT) || 60000,
  maxRetries: parseInt(process.env.COZE_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.COZE_RETRY_DELAY) || 1000,
};
