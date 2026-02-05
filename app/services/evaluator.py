import difflib


def similarity_score(excepted : str , actual: str) -> float:
    """
    Calculate a similarity score between two strings using SequenceMatcher.
    Returns a float between 0 and 1, where 1 means identical strings.
    """
    return difflib.SequenceMatcher(None, excepted, actual).ratio()