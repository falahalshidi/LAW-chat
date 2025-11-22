// DeepSeek API Client
// Note: Replace with actual DeepSeek API endpoint when provided

const DEEPSEEK_API_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions'; // Placeholder
const DEEPSEEK_API_KEY = ''; // Will be set by user

class DeepSeekClient {
    constructor() {
        this.apiKey = DEEPSEEK_API_KEY;
        this.endpoint = DEEPSEEK_API_ENDPOINT;
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    async chat(userMessage, context = [], temperature = 0.3) {
        if (!this.apiKey) {
            throw new Error('مفتاح API غير مُعرّف. الرجاء إضافة مفتاح DeepSeek API.');
        }

        try {
            // Build the prompt with context
            const systemPrompt = this.buildSystemPrompt();
            const contextPrompt = this.buildContextPrompt(context);

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: contextPrompt + '\n\n' + userMessage }
            ];

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat', // Adjust model name based on actual API
                    messages: messages,
                    temperature: temperature,
                    max_tokens: 2000,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `خطأ في الاتصال بـ DeepSeek API: ${response.status} - ${errorData.error?.message || response.statusText}`
                );
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('لم يتم استلام رد من DeepSeek API');
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('DeepSeek API Error:', error);

            // User-friendly error messages
            if (error.message.includes('fetch')) {
                throw new Error('فشل الاتصال بخادم DeepSeek. تحقق من اتصالك بالإنترنت.');
            }

            throw error;
        }
    }

    buildSystemPrompt() {
        return `أنت مساعد ذكي متخصص في القوانين العمانية. مهمتك هي تقديم إجابات دقيقة ومفصلة بناءً على المستندات المرفقة.

قواعد الإجابة:
1. أجب باللغة العربية بشكل واضح ومهني
2. استخدم المعلومات من السياق المقدم فقط للإجابة
3. إذا كانت المعلومات غير كافية أو غير موجودة في السياق، اذكر ذلك بوضوح
4. اذكر المصدر أو رقم المادة القانونية عند الإمكان
5. قدم إجابات منظمة وسهلة الفهم
6. إذا كان السؤال غامضاً، اطلب توضيحاً
7. لا تقدم معلومات قانونية خارج السياق المقدم

هدفك: مساعدة المستخدمين في فهم القوانين العمانية بدقة واحترافية.`;
    }

    buildContextPrompt(contextChunks) {
        if (!contextChunks || contextChunks.length === 0) {
            return 'لم يتم العثور على سياق ذي صلة من المستندات المرفقة.';
        }

        let prompt = 'السياق من المستندات القانونية:\n\n';

        contextChunks.forEach((chunk, index) => {
            const source = chunk.metadata?.filename || 'مستند غير معروف';
            prompt += `--- مقتطف ${index + 1} من ${source} ---\n`;
            prompt += `${chunk.text}\n\n`;
        });

        return prompt;
    }

    // Method to test API connection
    async testConnection() {
        try {
            const response = await this.chat('مرحباً', [], 0.7);
            return { success: true, message: response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

export default new DeepSeekClient();
