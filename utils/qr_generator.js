const QRCode = require('qrcode');

/**
 * Generate QR code as base64 data URL
 * @param {string} examCode - The exam code to encode in QR
 * @param {string} baseUrl - Base URL for the quiz join page (default from env)
 * @returns {Promise<string>} Base64 data URL of QR code
 */
async function generateQRCodeDataURL(examCode, baseUrl = null) {
    try {
        const url = baseUrl || process.env.FRONTEND_URL || 'https://aiedutech.vn';
        const quizJoinUrl = `${url}/quiz/join/${examCode}`;

        const qrCodeDataURL = await QRCode.toDataURL(quizJoinUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return qrCodeDataURL;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Generate QR code as buffer (for saving to file or uploading)
 * @param {string} examCode - The exam code to encode in QR
 * @param {string} baseUrl - Base URL for the quiz join page
 * @returns {Promise<Buffer>} QR code image buffer
 */
async function generateQRCodeBuffer(examCode, baseUrl = null) {
    try {
        const url = baseUrl || process.env.FRONTEND_URL || 'https://aiedutech.vn';
        const quizJoinUrl = `${url}/quiz/join/${examCode}`;

        const qrCodeBuffer = await QRCode.toBuffer(quizJoinUrl, {
            errorCorrectionLevel: 'M',
            type: 'png',
            width: 300,
            margin: 2
        });

        return qrCodeBuffer;
    } catch (error) {
        console.error('QR Code buffer generation error:', error);
        throw new Error('Failed to generate QR code buffer');
    }
}

/**
 * Generate QR code and upload to Cloudinary (optional)
 * @param {string} examCode - The exam code to encode in QR
 * @param {string} baseUrl - Base URL for the quiz join page
 * @returns {Promise<string>} Cloudinary URL or data URL
 */
async function generateAndUploadQRCode(examCode, baseUrl = null) {
    try {
        const dataURL = await generateQRCodeDataURL(examCode, baseUrl);

        // Frontend sẽ xử lý việc upload QR code lên Cloudinary
        return dataURL;
    } catch (error) {
        console.error('QR Code upload error:', error);
        throw new Error('Failed to upload QR code');
    }
}

module.exports = {
    generateQRCodeDataURL,
    generateQRCodeBuffer,
    generateAndUploadQRCode
};
