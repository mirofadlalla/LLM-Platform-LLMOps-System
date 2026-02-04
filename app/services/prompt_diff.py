from app.schemas.prompt import PromptDiffResponse
import difflib


import difflib


def diff_templates(old: str, new: str):
    '''
    Docstring for diff_templates
    
    :param old: Description
    :type old: str
    :param new: Description
    :type new: str
    :return: Description
    :rtype: List[str]
    ''' 
    old_lines = old.splitlines()
    new_lines = new.splitlines()

    diff = difflib.unified_diff(
        old_lines,
        new_lines,
        lineterm=""
    )

    return list(diff)
