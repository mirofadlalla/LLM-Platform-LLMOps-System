
import logging

logger = logging.getLogger(__name__)

def render_prompt(template: str, variables: dict) -> str:
    try:
        logger.debug(f"Template: {repr(template)}")
        logger.debug(f"Variables: {variables}")
        result = template.format(**variables)
        logger.debug(f"Rendered result: {repr(result)}")
        return result
    except KeyError as e:
        raise ValueError(f"Missing variable: {e}")
