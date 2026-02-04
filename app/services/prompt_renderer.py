
def render_prompt(template: str, variables: dict) -> str:
    try:
        print(f"DEBUG - Template: {repr(template)}")
        print(f"DEBUG - Variables: {variables}")
        result = template.format(**variables)
        print(f"DEBUG - Result: {repr(result)}")
        return result
    except KeyError as e:
        raise ValueError(f"Missing variable: {e}")
