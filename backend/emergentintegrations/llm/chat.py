"""
Emergent Integrations LLM Chat Module
Provides unified interface for multiple LLM providers (OpenAI, Anthropic, Gemini)
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
import asyncio

# Import OpenAI
try:
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    OpenAI = None
    AsyncOpenAI = None

# Import Anthropic
try:
    from anthropic import Anthropic, AsyncAnthropic
except ImportError:
    Anthropic = None
    AsyncAnthropic = None

# Import Google Gemini
try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)


@dataclass
class UserMessage:
    """User message data class"""
    text: str
    
    def to_dict(self) -> Dict[str, str]:
        return {"role": "user", "content": self.text}


@dataclass
class AssistantMessage:
    """Assistant message data class"""
    text: str
    
    def to_dict(self) -> Dict[str, str]:
        return {"role": "assistant", "content": self.text}


class LlmChat:
    """
    Unified LLM Chat interface supporting OpenAI, Anthropic, and Gemini
    """
    
    def __init__(
        self,
        api_key: str,
        session_id: Optional[str] = None,
        system_message: Optional[str] = None,
        provider: str = "openai",
        model: str = "gpt-5.2"
    ):
        """
        Initialize LLM Chat
        
        Args:
            api_key: API key for the LLM provider (can be Emergent universal key)
            session_id: Unique session identifier
            system_message: System prompt/message
            provider: LLM provider (openai, anthropic, gemini)
            model: Model name
        """
        self.api_key = api_key
        self.session_id = session_id or "default"
        self.system_message = system_message or "You are a helpful assistant."
        self.provider = provider.lower()
        self.model = model
        self.conversation_history: List[Dict[str, str]] = []
        
        # Initialize client
        self._init_client()
        
        logger.info(f"LlmChat initialized with provider={self.provider}, model={self.model}")
    
    def _init_client(self):
        """Initialize the appropriate LLM client"""
        try:
            if self.provider == "openai":
                if OpenAI is None:
                    raise ImportError("OpenAI library not installed. Install with: pip install openai")
                # Handle both regular OpenAI keys and Emergent universal key
                if self.api_key.startswith("sk-emergent-"):
                    # Use Emergent proxy for universal key
                    self.client = OpenAI(
                        api_key=self.api_key,
                        base_url="https://api.emergent.sh/openai/v1"
                    )
                else:
                    self.client = OpenAI(api_key=self.api_key)
                    
            elif self.provider == "anthropic":
                if Anthropic is None:
                    raise ImportError("Anthropic library not installed. Install with: pip install anthropic")
                if self.api_key.startswith("sk-emergent-"):
                    # Use Emergent proxy for universal key
                    self.client = Anthropic(
                        api_key=self.api_key,
                        base_url="https://api.emergent.sh/anthropic"
                    )
                else:
                    self.client = Anthropic(api_key=self.api_key)
                    
            elif self.provider == "gemini":
                if genai is None:
                    raise ImportError("Google Generative AI library not installed. Install with: pip install google-generativeai")
                if self.api_key.startswith("sk-emergent-"):
                    # Configure with Emergent endpoint
                    genai.configure(
                        api_key=self.api_key,
                        transport="rest",
                        client_options={"api_endpoint": "https://api.emergent.sh/gemini"}
                    )
                else:
                    genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel(self.model)
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
                
        except Exception as e:
            logger.error(f"Failed to initialize {self.provider} client: {str(e)}")
            raise
    
    def with_model(self, provider: str, model: str) -> 'LlmChat':
        """
        Change the model and provider
        
        Args:
            provider: Provider name (openai, anthropic, gemini)
            model: Model name
            
        Returns:
            Self for method chaining
        """
        self.provider = provider.lower()
        self.model = model
        self._init_client()
        return self
    
    def send_message(self, message: Union[UserMessage, str]) -> str:
        """
        Send a message and get response (synchronous)
        
        Args:
            message: UserMessage object or string
            
        Returns:
            Response text from LLM
        """
        if isinstance(message, str):
            message = UserMessage(text=message)
        
        # Add user message to history
        self.conversation_history.append(message.to_dict())
        
        try:
            if self.provider == "openai":
                response = self._send_openai_message()
            elif self.provider == "anthropic":
                response = self._send_anthropic_message()
            elif self.provider == "gemini":
                response = self._send_gemini_message()
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
            
            # Add assistant response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": response
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            raise
    
    async def send_message_async(self, message: Union[UserMessage, str]) -> str:
        """
        Send a message and get response (asynchronous)
        
        Args:
            message: UserMessage object or string
            
        Returns:
            Response text from LLM
        """
        # For now, run sync version in thread pool
        return await asyncio.to_thread(self.send_message, message)
    
    def _send_openai_message(self) -> str:
        """Send message using OpenAI API"""
        messages = [{"role": "system", "content": self.system_message}]
        messages.extend(self.conversation_history)
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        
        return response.choices[0].message.content
    
    def _send_anthropic_message(self) -> str:
        """Send message using Anthropic API"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_message,
            messages=self.conversation_history
        )
        
        return response.content[0].text
    
    def _send_gemini_message(self) -> str:
        """Send message using Gemini API"""
        # Format conversation history for Gemini
        chat = self.client.start_chat(history=[])
        
        # Send the latest message
        latest_message = self.conversation_history[-1]["content"]
        response = chat.send_message(latest_message)
        
        return response.text
    
    async def stream_response(self, messages: List[Union[UserMessage, Dict]]):
        """
        Stream response token by token (async generator)
        
        Args:
            messages: List of messages
            
        Yields:
            Individual tokens from the response
        """
        # Build message history
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, UserMessage):
                formatted_messages.append(msg.to_dict())
            elif isinstance(msg, dict):
                formatted_messages.append(msg)
        
        try:
            if self.provider == "openai":
                async for token in self._stream_openai(formatted_messages):
                    yield token
            elif self.provider == "anthropic":
                async for token in self._stream_anthropic(formatted_messages):
                    yield token
            elif self.provider == "gemini":
                async for token in self._stream_gemini(formatted_messages):
                    yield token
                    
        except Exception as e:
            logger.error(f"Error streaming response: {str(e)}")
            raise
    
    async def _stream_openai(self, messages: List[Dict]):
        """Stream from OpenAI"""
        messages_with_system = [{"role": "system", "content": self.system_message}]
        messages_with_system.extend(messages)
        
        # Create async client if not already done
        if self.api_key.startswith("sk-emergent-"):
            async_client = AsyncOpenAI(
                api_key=self.api_key,
                base_url="https://api.emergent.sh/openai/v1"
            )
        else:
            async_client = AsyncOpenAI(api_key=self.api_key)
        
        stream = await async_client.chat.completions.create(
            model=self.model,
            messages=messages_with_system,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    async def _stream_anthropic(self, messages: List[Dict]):
        """Stream from Anthropic"""
        if self.api_key.startswith("sk-emergent-"):
            async_client = AsyncAnthropic(
                api_key=self.api_key,
                base_url="https://api.emergent.sh/anthropic"
            )
        else:
            async_client = AsyncAnthropic(api_key=self.api_key)
        
        async with async_client.messages.stream(
            model=self.model,
            max_tokens=4096,
            system=self.system_message,
            messages=messages
        ) as stream:
            async for text in stream.text_stream:
                yield text
    
    async def _stream_gemini(self, messages: List[Dict]):
        """Stream from Gemini"""
        # Gemini streaming would need async implementation
        # For now, yield the complete response
        latest_message = messages[-1]["content"] if messages else ""
        response = await asyncio.to_thread(
            self.client.generate_content,
            latest_message
        )
        yield response.text
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def get_history(self) -> List[Dict[str, str]]:
        """Get conversation history"""
        return self.conversation_history.copy()


# Convenience function
def create_chat(
    api_key: str,
    provider: str = "openai",
    model: str = "gpt-5.2",
    system_message: Optional[str] = None
) -> LlmChat:
    """
    Create a new LLM chat instance
    
    Args:
        api_key: API key (can be Emergent universal key)
        provider: Provider name
        model: Model name
        system_message: System prompt
        
    Returns:
        LlmChat instance
    """
    return LlmChat(
        api_key=api_key,
        provider=provider,
        model=model,
        system_message=system_message
    )
