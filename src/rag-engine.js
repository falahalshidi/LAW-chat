import * as pdfjsLib from 'pdfjs-dist';
import { pipeline, env } from '@xenova/transformers';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js`;

// Configure transformers to use local models
env.allowLocalModels = false;
env.allowRemoteModels = true;

class RAGEngine {
    constructor() {
        this.documents = [];
        this.chunks = [];
        this.embeddings = [];
        this.embeddingModel = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing embedding model...');
            this.embeddingModel = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2'
            );
            this.isInitialized = true;
            console.log('RAG Engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize RAG Engine:', error);
            throw error;
        }
    }

    async extractTextFromPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            const metadata = {
                filename: file.name,
                numPages: pdf.numPages,
                uploadDate: new Date().toISOString()
            };

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }

            return { text: fullText, metadata };
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error(`فشل استخراج النص من الملف: ${error.message}`);
        }
    }

    chunkText(text, chunkSize = 500, overlap = 50) {
        const words = text.split(/\s+/);
        const chunks = [];

        for (let i = 0; i < words.length; i += chunkSize - overlap) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            if (chunk.trim().length > 0) {
                chunks.push({
                    text: chunk,
                    startIndex: i,
                    endIndex: Math.min(i + chunkSize, words.length)
                });
            }
        }

        return chunks;
    }

    async generateEmbedding(text) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const output = await this.embeddingModel(text, {
                pooling: 'mean',
                normalize: true
            });

            return Array.from(output.data);
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    cosineSimilarity(vecA, vecB) {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }

    async addDocument(file) {
        try {
            // Extract text from PDF
            const { text, metadata } = await this.extractTextFromPDF(file);

            // Chunk the text
            const textChunks = this.chunkText(text);

            // Generate embeddings for each chunk
            const chunkData = [];
            for (let i = 0; i < textChunks.length; i++) {
                const chunk = textChunks[i];
                const embedding = await this.generateEmbedding(chunk.text);

                chunkData.push({
                    id: `${metadata.filename}-chunk-${i}`,
                    text: chunk.text,
                    embedding: embedding,
                    metadata: {
                        ...metadata,
                        chunkIndex: i,
                        totalChunks: textChunks.length
                    }
                });
            }

            // Store document and chunks
            this.documents.push({ file, metadata, text });
            this.chunks.push(...chunkData);
            this.embeddings.push(...chunkData.map(c => c.embedding));

            return {
                success: true,
                chunksAdded: chunkData.length,
                metadata
            };
        } catch (error) {
            console.error('Error adding document:', error);
            throw error;
        }
    }

    async search(query, topK = 3) {
        if (this.chunks.length === 0) {
            return [];
        }

        try {
            // Generate embedding for query
            const queryEmbedding = await this.generateEmbedding(query);

            // Calculate similarities
            const similarities = this.chunks.map((chunk, index) => ({
                chunk,
                similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
            }));

            // Sort by similarity and get top K
            similarities.sort((a, b) => b.similarity - a.similarity);
            const topResults = similarities.slice(0, topK);

            return topResults.map(result => ({
                text: result.chunk.text,
                metadata: result.chunk.metadata,
                similarity: result.similarity
            }));
        } catch (error) {
            console.error('Error searching:', error);
            throw error;
        }
    }

    getDocumentCount() {
        return this.documents.length;
    }

    clearAllDocuments() {
        this.documents = [];
        this.chunks = [];
        this.embeddings = [];
    }
}

export default new RAGEngine();
