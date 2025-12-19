# AI Service Analysis

## Cost Comparison (as of Dec 2024)

### OpenAI GPT Models
- **GPT-4o**: $2.50/1M input tokens, $10/1M output tokens
- **GPT-4o-mini**: $0.15/1M input, $0.60/1M output tokens
- **Pros**: Excellent instruction following, function calling
- **Free tier**: $5 credit for new accounts

### Anthropic Claude
- **Claude 3.5 Sonnet**: $3/1M input, $15/1M output tokens  
- **Claude 3.5 Haiku**: $0.25/1M input, $1.25/1M output tokens
- **Pros**: Strong reasoning, safety-focused
- **Free tier**: Limited web interface only

### Google Gemini
- **Gemini 1.5 Flash**: $0.075/1M input, $0.30/1M output tokens
- **Gemini 1.5 Pro**: $1.25/1M input, $5/1M output tokens
- **Pros**: Extremely cost-effective, good multilingual support
- **Free tier**: 15 requests/minute, 1500/day

### Recommendation for StudyPuck
**Primary**: Gemini 1.5 Flash for translation drills (lowest cost, good multilingual)
**Secondary**: GPT-4o-mini for complex reasoning tasks
**Estimated monthly cost**: $5-20 for hundreds of users

## Integration Architecture
**Recommended**: Proxy through Cloudflare Workers
- Keeps API keys secure
- Enables request logging/analytics  
- Allows model switching without frontend changes
- Can implement caching for common translations