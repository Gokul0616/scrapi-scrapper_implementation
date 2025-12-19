import re

# Read the original file
with open('/app/backend/routes/routes.py', 'r') as f:
    content = f.read()

# Read the new content (the function)
with open('/app/backend/routes/routes.py_new', 'r') as f:
    new_function = f.read().strip()

# Define the start and end of the function to replace
# We look for the decorator and the function definition
start_pattern = r'@router\.get\("/legal/{doc_id}"\)\s*async def get_legal_document\(doc_id: str\):'
# We look for the end of the function. The next function starts with @router or it's the end of file.
# In this file, get_legal_document seems to be near the end, but let's check what comes after.
# From the view_file output, it ends at line 2760, and there might be more content or it might be the last function.
# Let's check what's after 2760.

# Using a regex to match the whole function body is tricky with indentation.
# Instead, let's find the start index, and find the start of the NEXT decorator or EOF.

match = re.search(start_pattern, content)
if not match:
    print("Could not find get_legal_document function")
    exit(1)

start_index = match.start()

# Find the next @router decorator after this function
next_router = re.search(r'\n@router\.', content[start_index + 1:])
if next_router:
    end_index = start_index + 1 + next_router.start()
else:
    # Check for EOF or other top-level definitions
    end_index = len(content)

# Replace the content
new_content = content[:start_index] + new_function + "\n\n" + content[end_index:]

# Write back to routes.py
with open('/app/backend/routes/routes.py', 'w') as f:
    f.write(new_content)

print("Successfully updated get_legal_document in routes.py")
