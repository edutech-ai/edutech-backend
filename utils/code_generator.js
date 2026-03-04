function generateRandomCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate a random 3-digit exam code (100-999)
 * @returns {string} 3-digit code, e.g. "234"
 */
function generateThreeDigitCode() {
    const num = Math.floor(Math.random() * 900) + 100; // 100 - 999
    return String(num);
}

/**
 * Generate exam code with custom prefix
 * @param {string} prefix - Custom prefix (e.g., 'MATH', 'ENG')
 * @param {number} length - Length of random part (default 6)
 * @returns {string} Exam code with prefix
 */
function generateExamCodeWithPrefix(prefix = '', length = 6) {
    const randomPart = generateRandomCode(length);
    const code = prefix ? `${prefix.toUpperCase()}-${randomPart}` : randomPart;
    return code;
}

module.exports = {
    generateRandomCode,
    generateExamCodeWithPrefix,
    generateThreeDigitCode
};
