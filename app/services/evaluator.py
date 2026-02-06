import difflib
import logging
from .llm_runner import call_llama
from langchain_core.output_parsers import SimpleJsonOutputParser

logger = logging.getLogger(__name__)
# def similarity_score(excepted : str , actual: str) -> float:
#     """
#     Calculate a similarity score between two strings using SequenceMatcher.
#     Returns a float between 0 and 1, where 1 means identical strings.
#     """
#     return difflib.SequenceMatcher(None, excepted, actual).ratio()

system_prompt = """
You are an impartial evaluator. \
Your task is to compare a model output against an expected output \
for a given user input. \
Evaluate based on: \
- Task correctness \
- Completeness \
- Faithfulness to the expected output \
Return a JSON object ONLY with: \
{ \
  "score": float between 0 and 1, \
  "reason": short explanation, \
  "hallucination_rate": float between 0 and 1 indicating the degree of hallucination in the model output \
}
"""
def similarity_score(user_input: str, expected_output: str, model_output: str) -> dict:
    evaluation_prompt = f'''
User Input: {user_input}
Expected Output: {expected_output}
Model Output: {model_output}
Evaluate the model output against the expected output based on the criteria mentioned in the system prompt.
    '''
    logging.info(f"Evaluation prompt: {evaluation_prompt}")

    evaluation_result, _, _ = call_llama(evaluation_prompt, system_prompt=system_prompt)
    logging.info(f"Evaluation result (raw): {evaluation_result}")

    parser = SimpleJsonOutputParser()
    evaluation_result = parser.invoke(evaluation_result)

    return evaluation_result