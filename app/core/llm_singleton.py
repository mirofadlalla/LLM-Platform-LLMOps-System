# app/core/llm_singleton.py
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class LLMService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            print("Loading model for the first time...")
            cls._instance = super(LLMService, cls).__new__(cls)

            model_name = "Qwen/Qwen2.5-1.5B-Instruct"
            cls._instance.tokenizer = AutoTokenizer.from_pretrained(model_name)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            cls._instance.device = device
            cls._instance.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype="auto",
                low_cpu_mem_usage=True,
            ).to(device)
        return cls._instance

    def generate(self, prompt: str, max_new_tokens: int = 150):
        messages = [{"role": "user", "content": prompt}]
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.device)
        generated_ids = self.model.generate(
            model_inputs.input_ids,
            max_new_tokens=max_new_tokens,
            do_sample=False,
        )
        generated_ids = [
            output_ids[len(input_ids):]
            for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        output = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return output