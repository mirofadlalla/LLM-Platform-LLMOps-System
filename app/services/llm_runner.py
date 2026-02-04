# app/services/llm_runner.py
from app.core.llm_singleton import LLMService

async def call_llama(prompt: str, model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"):
    llm = LLMService()  # نفس النسخة المشتركة
    output = llm.generate(prompt)
    return {
        "output": output,
        "tokens_in": len(prompt.split()),
        "tokens_out": len(output.split()),
    }