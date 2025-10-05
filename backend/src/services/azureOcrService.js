const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');

class AzureOcrService {
  constructor() {
    this.client = null;
    this.initialize();
  }

  initialize() {
    const key = process.env.AZURE_OCR_KEY;
    const endpoint = process.env.AZURE_OCR_ENDPOINT;

    if (!key || !endpoint) {
      console.warn('Azure OCR credentials not provided. OCR functionality will be disabled.');
      return;
    }

    try {
      this.client = new ComputerVisionClient(
        new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
        endpoint
      );
      console.log('Azure OCR service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Azure OCR service:', error);
    }
  }

  async extractTextFromImage(imageBuffer) {
    if (!this.client) {
      throw new Error('Azure OCR service not initialized');
    }

    try {
      // Convert base64 to buffer if needed
      let buffer = imageBuffer;
      if (typeof imageBuffer === 'string') {
        buffer = Buffer.from(imageBuffer, 'base64');
      }

      // Use OCR to extract text
      const result = await this.client.readInStream(buffer);

      // Get the operation ID from the result
      const operationId = result.operationLocation.split('/').slice(-1)[0];

      // Poll for results
      let readResult;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        readResult = await this.client.getReadResult(operationId);

        if (readResult.status === 'failed') {
          throw new Error('OCR operation failed');
        }

        if (readResult.status === 'succeeded') {
          break;
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } while (readResult.status === 'running' && attempts < maxAttempts);

      if (readResult.status !== 'succeeded') {
        throw new Error('OCR operation timed out');
      }

      // Extract text from results
      let extractedText = '';

      if (readResult.analyzeResult && readResult.analyzeResult.readResults) {
        for (const page of readResult.analyzeResult.readResults) {
          for (const line of page.lines) {
            extractedText += line.text + '\n';
          }
        }
      }

      return extractedText.trim();

    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }

  async extractTextFromUrl(imageUrl) {
    if (!this.client) {
      throw new Error('Azure OCR service not initialized');
    }

    try {
      // Use OCR to extract text from URL
      const result = await this.client.read(imageUrl);

      // Get the operation ID from the result
      const operationId = result.operationLocation.split('/').slice(-1)[0];

      // Poll for results
      let readResult;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        readResult = await this.client.getReadResult(operationId);

        if (readResult.status === 'failed') {
          throw new Error('OCR operation failed');
        }

        if (readResult.status === 'succeeded') {
          break;
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } while (readResult.status === 'running' && attempts < maxAttempts);

      if (readResult.status !== 'succeeded') {
        throw new Error('OCR operation timed out');
      }

      // Extract text from results
      let extractedText = '';

      if (readResult.analyzeResult && readResult.analyzeResult.readResults) {
        for (const page of readResult.analyzeResult.readResults) {
          for (const line of page.lines) {
            extractedText += line.text + '\n';
          }
        }
      }

      return extractedText.trim();

    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error(`Failed to extract text from image URL: ${error.message}`);
    }
  }

  isAvailable() {
    return this.client !== null;
  }
}

module.exports = new AzureOcrService();
