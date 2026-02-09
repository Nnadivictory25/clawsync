/**
 * Extract text from a PDF file
 * @param pdfBuffer - PDF file as ArrayBuffer or Buffer
 * @returns Extracted text content
 */
export async function extractTextFromPDF(pdfBuffer: ArrayBuffer | Buffer): Promise<string> {
  try {
    // Use require for CommonJS module compatibility
    const pdfParse = require('pdf-parse');
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Check if file type is PDF
 */
export function isPDFFile(fileType: string): boolean {
  return fileType === 'application/pdf' || fileType.endsWith('/pdf');
}
