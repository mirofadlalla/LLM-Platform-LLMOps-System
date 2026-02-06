# app/services/llm_runner.py
import logging
from app.core.llm_singleton import LLMService

logger = logging.getLogger(__name__)

def call_llama(
    prompt: str,
    model_name: str = "Qwen/Qwen2.5-1.5B-Instruct",
    system_prompt: str = "",
    temperature: float = 0.2
):
    """
    Call the LLM (via HuggingFace Inference Client) to generate a response.
    
    Args:
        prompt: The user prompt to send to the model
        model_name: The model to use (note: currently singleton uses a fixed model)
        system_prompt: Optional system prompt for context
        temperature: Temperature for generation (0-1)
    
    Returns:
        tuple: (output_text, input_tokens, output_tokens)
    """
    try:
        llm = LLMService()
        output = llm.generate(
            prompt,
            system_prompt=system_prompt,
            temperature=temperature
        )
        
        # Estimate token counts (rough approximation)
        input_tokens = len(prompt.split())
        output_tokens = len(output.split())
        
        logger.info(f"LLM call successful. Input tokens: {input_tokens}, Output tokens: {output_tokens}")
        return output, input_tokens, output_tokens
    except Exception as e:
        logger.error(f"Error calling LLM: {str(e)}", exc_info=True)
        raise