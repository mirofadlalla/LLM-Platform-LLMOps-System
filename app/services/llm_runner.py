# app/services/llm_runner.py
from app.core.llm_singleton import LLMService

def call_llama(prompt: str, system_prompt: str = "", model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"):
    llm = LLMService()  # نفس النسخة المشتركة
    output = llm.generate(prompt , system_prompt=system_prompt , temperature=0.2)
    return output, len(prompt.split()), len(output.split())