import logging
import google.generativeai as genai
from typing import List, Dict, Any
from backend.config.config import settings

logger = logging.getLogger("placementgpt")

# Configure Gemini API if key is available
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not configured. LLM query processing will fall back to default behavior.")

class QueryProcessor:
    @staticmethod
    async def rewrite_query(query: str, chat_history: List[Dict[str, Any]]) -> str:
        """
        Rewrites a conversational query based on chat history to make it a standalone search query.
        E.g. History: 'Tell me about Capgemini.' -> Query: 'What is the OA pattern?'
        Rewritten: 'What is the Capgemini online assessment pattern?'
        """
        if not chat_history or not settings.GEMINI_API_KEY:
            return query

        try:
            # Build conversation log string
            history_str = ""
            for msg in chat_history[-6:]:  # use last 6 messages (3 turns)
                sender = "Student" if msg["sender"] == "user" else "Assistant"
                history_str += f"{sender}: {msg['content']}\n"

            prompt = f"""Given the following conversation history and a follow-up question, rewrite the follow-up question to be a standalone query that can be searched in a database. Do NOT answer the question. Only return the rewritten query.

Conversation History:
{history_str}
Follow-up Question: {query}

Standalone Query:"""

            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0.1)
            )
            rewritten = response.text.strip()
            logger.info(f"Query rewritten: '{query}' -> '{rewritten}'")
            return rewritten if rewritten else query
            
        except Exception as e:
            logger.error(f"Error in query rewriting: {str(e)}. Using original query.")
            return query

    @staticmethod
    async def expand_query(query: str) -> List[str]:
        """
        Generates 2-3 semantically expanded search queries to improve retrieval recall.
        E.g. 'Capgemini OA pattern' -> ['Capgemini online test', 'Capgemini coding questions']
        """
        queries = [query]
        if not settings.GEMINI_API_KEY:
            return queries

        try:
            prompt = f"""Generate 3 alternative search queries/variations that are semantically equivalent to the query below. 
Focus on terms commonly used in company placement guides, resumes, job descriptions, and interview experiences.
Format: Return only the search terms, one per line. Do not add numbers, bullet points, quotes, or introductory text.

Query: {query}"""

            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0.2)
            )
            
            lines = [line.strip().replace('"', '').replace("'", "") for line in response.text.strip().split("\n")]
            variations = [line for line in lines if line and len(line) > 3]
            
            # Combine original and unique variations
            for var in variations[:3]:
                if var.lower() != query.lower():
                    queries.append(var)
                    
            logger.info(f"Expanded queries: {queries}")
            
        except Exception as e:
            logger.error(f"Error in query expansion: {str(e)}. Using original query only.")
            
        return queries
