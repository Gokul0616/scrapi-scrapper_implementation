import logging
import os
from typing import Dict, Any, List
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class LeadChatService:
    """Service for AI-powered lead engagement advice using Gemini LLM."""

    def __init__(self):
        # Get Gemini API key
        gemini_key = os.getenv('GEMINI_API_KEY')
        
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=gemini_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        logger.info(f"LeadChatService initialized with Gemini LLM")
    
    async def get_engagement_advice(
        self,
        lead_data: Dict[str, Any],
        user_message: str,
        chat_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Get AI-powered advice on how to engage with a business lead.
        
        Args:
            lead_data: Business information (name, category, rating, etc.)
            user_message: User's question about the lead
            chat_history: Previous conversation history
        
        Returns:
            AI assistant's response
        """
        try:
            # Build system message with lead context
            system_message = self._build_system_message(lead_data)
            
            # Construct the full prompt including history
            full_prompt = system_message + "\n\n"
            
            # Add conversation history to prompt for context
            if chat_history and len(chat_history) > 0:
                full_prompt += "**PREVIOUS CONVERSATION (Remember this context):**\n"
                for msg in chat_history:
                    role = "USER" if msg.get('role') == 'user' else "ASSISTANT"
                    content = msg.get('content', '')
                    full_prompt += f"\n{role}: {content}\n"
                full_prompt += "\n**CURRENT USER MESSAGE:**\n"

            full_prompt += f"USER: {user_message}"

            # Generate response
            response = await self.model.generate_content_async(full_prompt)
            
            logger.info(f"Generated engagement advice for lead: {lead_data.get('title', 'Unknown')}")
            return response.text
        
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

        Args:
            lead_data: Business information
            channel: Communication channel (email, phone, linkedin)

        Returns:
            Personalized outreach template
        """
        try:
            system_message = self._build_system_message(lead_data)

            prompt = f"{system_message}\n\nCreate a personalized {channel} outreach template for this business. Make it professional, concise, and focused on value. Include placeholders for customization."

            # Generate response
            response = await self.model.generate_content_async(prompt)
            
            logger.info(f"Generated {channel} template for lead: {lead_data.get('title', 'Unknown')}")
            return response.text
        
        except Exception as e:
            logger.error(f"Error generating outreach template: {str(e)}")
            raise Exception(f"Failed to generate template: {str(e)}")
