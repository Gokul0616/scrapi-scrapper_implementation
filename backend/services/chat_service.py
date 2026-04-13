import logging
import os
import json
from typing import Dict, Any, List
from datetime import datetime
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class LeadChatService:
    """Service for AI-powered lead engagement advice using unified LlmChat."""

    def __init__(self):
        # Determine LLM configuration
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY')
        self.gemini_key = os.getenv('GEMINI_API_KEY')
        self.emergent_key = os.getenv('EMERGENT_LLM_KEY')
        
        # Default configuration
        self.provider = "openai"
        self.model_name = "gpt-5.2"
        self.api_key = self.emergent_key
        
        # Prioritize OpenRouter if available
        if self.openrouter_key:
            self.api_key = self.openrouter_key
            self.provider = "openrouter"
            self.model_name = "google/gemma-4-26b-a4b-it:free"
            logger.info(f"LeadChatService initialized with OpenRouter: {self.model_name}")
        elif self.gemini_key:
            self.api_key = self.gemini_key
            self.provider = "gemini"
            self.model_name = "gemini-1.5-flash"
            logger.info(f"LeadChatService initialized with Gemini LLM")
        elif self.emergent_key:
            self.api_key = self.emergent_key
            self.provider = "openai"
            logger.info(f"LeadChatService initialized with Emergent LLM")
        else:
            raise ValueError("No LLM API key found (OPENROUTER_API_KEY, GEMINI_API_KEY or EMERGENT_LLM_KEY)")
        
        self.llm = LlmChat(
            api_key=self.api_key,
            provider=self.provider,
            model=self.model_name
        )
    
    async def get_engagement_advice(
        self,
        lead_data: Dict[str, Any],
        user_message: str,
        chat_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Get AI-powered advice on how to engage with a business lead.
        """
        try:
            # Build system message with lead context
            system_message = self._build_system_message(lead_data)
            self.llm.system_message = system_message
            
            # Format history for LlmChat
            history_list = []
            if chat_history:
                for msg in chat_history:
                    # Ensure roles are compatible with OpenAI/LlmChat format
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    history_list.append({"role": role, "content": content})

            # Define fallback sequence with robust provider switching
            fallbacks = []
            if self.provider == "openrouter":
                fallbacks.extend([
                    {"provider": "openrouter", "model": self.model_name, "api_key": self.api_key},
                    {"provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct:free", "api_key": self.api_key},
                    {"provider": "openrouter", "model": "openrouter/free", "api_key": self.api_key}
                ])
            else:
                fallbacks.append({"provider": self.provider, "model": self.model_name, "api_key": self.api_key})
                
            # Add Native Gemini as the ultimate safety net if key exists
            gemini_key = os.getenv('GEMINI_API_KEY')
            if gemini_key:
                fallbacks.append({"provider": "gemini", "model": "gemini-flash-latest", "api_key": gemini_key})

            response = None
            last_error = None
            
            for fback in fallbacks:
                try:
                    llm = LlmChat(api_key=fback["api_key"], provider=fback["provider"], model=fback["model"])
                    llm.system_message = system_message
                    llm.conversation_history = history_list.copy()
                    
                    response = await llm.send_message_async(user_message)
                    break
                except Exception as e:
                    last_error = e
                    logger.warning(f"Model {model} failed in lead chat: {str(e)}")
                    continue
            
            if response is None:
                response = "I'm currently experiencing high traffic rate limits across all my free brains. Please wait a minute and try again!"
                logger.error(f"All fallback models failed. Last error: {str(last_error)}")
            
            logger.info(f"Generated engagement advice for lead: {lead_data.get('title', 'Unknown')}")
            return response
        
        except Exception as e:
            logger.error(f"Error generating engagement advice: {str(e)}")
            raise Exception(f"Failed to generate advice: {str(e)}")
    
    def _build_system_message(self, lead_data: Dict[str, Any]) -> str:
        """Build system message with lead context."""
        
        # Extract key lead information
        business_name = lead_data.get('title', 'Unknown Business')
        category = lead_data.get('category', 'N/A')
        rating = lead_data.get('rating', 'N/A')
        reviews_count = lead_data.get('reviewsCount', 'N/A')
        address = lead_data.get('address', 'N/A')
        phone = lead_data.get('phone', 'N/A')
        email = lead_data.get('email', 'N/A')
        website = lead_data.get('website', 'N/A')
        
        system_message = f"""You are an expert sales and business development consultant helping with B2B lead engagement.

You're analyzing this specific business lead:

**Business Profile:**
- Name: {business_name}
- Type: {category}
- Rating: {rating} ⭐ ({reviews_count} reviews)
- Location: {address}
- Contact: Phone: {phone} | Email: {email}
- Website: {website}

**Your Expertise:**
Provide personalized, actionable advice for engaging with THIS specific business. Focus on:

1. **Personalized Approach**: Specific talking points based on their business type, rating, and location
2. **Communication Strategy**: Best method to reach them (email, phone call, visit) with reasoning
3. **Value Proposition**: How to position your product/service for their specific needs
4. **Conversation Starters**: Specific opening lines or questions that would resonate
5. **Pain Points**: Industry-specific challenges they likely face that you can address

**Response Style:**
- Keep responses conversational and concise (3-5 sentences unless more detail requested)
- Always reference specific details about THIS business (name, category, rating, location)
- Suggest practical next steps
- If asked for templates, create personalized ones using their actual business info
- Be direct and actionable, not generic

Example: Instead of "businesses in this category..." say "For {business_name}, a {category} business with {rating} stars..."

Help the user craft a winning approach to engage with {business_name}."""
        
        return system_message
    
    async def generate_outreach_template(self, lead_data: Dict[str, Any], channel: str = "email") -> str:
        """
        Generate a personalized outreach template.
        """
        try:
            system_message = self._build_system_message(lead_data)
            self.llm.system_message = system_message
            prompt = f"Create a personalized {channel} outreach template for this business. Make it professional, concise, and focused on value. Include placeholders for customization."

            # Define fallback sequence with robust provider switching
            fallbacks = []
            if self.provider == "openrouter":
                fallbacks.extend([
                    {"provider": "openrouter", "model": self.model_name, "api_key": self.api_key},
                    {"provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct:free", "api_key": self.api_key},
                    {"provider": "openrouter", "model": "openrouter/free", "api_key": self.api_key}
                ])
            else:
                fallbacks.append({"provider": self.provider, "model": self.model_name, "api_key": self.api_key})
                
            # Add Native Gemini as the ultimate safety net if key exists
            gemini_key = os.getenv('GEMINI_API_KEY')
            if gemini_key:
                fallbacks.append({"provider": "gemini", "model": "gemini-flash-latest", "api_key": gemini_key})

            response = None
            last_error = None
            
            for fback in fallbacks:
                try:
                    llm = LlmChat(api_key=fback["api_key"], provider=fback["provider"], model=fback["model"])
                    llm.system_message = system_message
                    response = await llm.send_message_async(prompt)
                    break
                except Exception as e:
                    last_error = e
                    continue
            
            if response is None:
                response = f"I'm currently hitting rate limits and can't generate the {channel} template right now. Please try again in a few minutes!"
            
            logger.info(f"Generated {channel} template for lead: {lead_data.get('title', 'Unknown')}")
            return response
        
        except Exception as e:
            logger.error(f"Error generating outreach template: {str(e)}")
            raise Exception(f"Failed to generate template: {str(e)}")
