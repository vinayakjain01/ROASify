import os
import sys

# backend/*.py modules import each other flatly (e.g. `from data_cleaner import
# clean_meta`), matching how uvicorn runs main.py with backend/ as the working
# directory. Make the same true for pytest regardless of where it's invoked from.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
