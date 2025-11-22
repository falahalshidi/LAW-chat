# DeepSeek API Configuration Guide

## Default Configuration

The application is configured to use DeepSeek API. If you need to use a different endpoint or configuration, follow this guide.

## Changing API Endpoint

Edit `src/deepseek-api.js` and modify line 4:

```javascript
const DEEPSEEK_API_ENDPOINT = 'YOUR_API_ENDPOINT_HERE';
```

### Common API Endpoints

**DeepSeek Official:**
```javascript
const DEEPSEEK_API_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
```

**OpenAI Compatible APIs:**
If you're using an OpenAI-compatible API (like Together AI, Groq, etc.):
```javascript
const DEEPSEEK_API_ENDPOINT = 'https://api.together.xyz/v1/chat/completions';
// or
const DEEPSEEK_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
```

## Model Configuration

To change the model name, edit the `chat()` function in `src/deepseek-api.js` (around line 34):

```javascript
body: JSON.stringify({
  model: 'YOUR_MODEL_NAME', // Change this
  messages: messages,
  temperature: temperature,
  max_tokens: 2000,
  stream: false
})
```

### DeepSeek Models
- `deepseek-chat` - Latest chat model
- `deepseek-coder` - Code-specialized model

## API Key Management

The API key is requested from the user in the UI. They enter it once when the app loads.

If you want to hardcode it for testing (NOT RECOMMENDED for production):

```javascript
// In src/deepseek-api.js
const DEEPSEEK_API_KEY = 'YOUR_API_KEY'; // Line 5
```

> ⚠️ **Security Warning**: Never commit API keys to git!

## Testing API Connection

The application includes a `testConnection()` method. You can use browser console to test:

```javascript
// Open browser console
import deepseekClient from './src/deepseek-api.js';
deepseekClient.setApiKey('YOUR_KEY');
const result = await deepseekClient.testConnection();
console.log(result);
```

## Troubleshooting

### CORS Errors

If you get CORS errors, you might need a proxy. Add to `vite.config.js`:

```javascript
export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      '/api': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

Then change endpoint to `/api/v1/chat/completions`

### Authentication Errors

**401 Unauthorized**: Check your API key
**403 Forbidden**: API key might be invalid or expired
**429 Too Many Requests**: You've hit rate limits

### Response Format Errors

If the API returns a different format, you may need to adjust the response parsing in `chat()` function:

```javascript
// Current code expects:
data.choices[0].message.content

// Some APIs use:
data.response
// or
data.text
// or
data.message
```

## Alternative: Using Local Model

If you want to run completely offline, you could use a local model with Transformers.js:

1. Install text generation pipeline
2. Replace DeepSeek API calls with local generation
3. Note: This will be slower and require more memory

Example:
```javascript
import { pipeline } from '@xenova/transformers';
const generator = await pipeline('text-generation', 'Xenova/LaMini-Flan-T5-783M');
```

## Rate Limiting

To add rate limiting on client side:

```javascript
// Add to DeepSeekClient class
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async chat(userMessage, context = [], temperature = 0.3) {
  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - (now - lastRequestTime))
    );
  }
  lastRequestTime = Date.now();
  
  // ... rest of chat function
}
```

## Need Help?

If you encounter issues with API configuration:
1. Check API documentation
2. Verify endpoint URL format
3. Test with curl or Postman first
4. Review network tab in browser DevTools
