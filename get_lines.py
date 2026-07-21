with open('dashboard.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const loadChats =" in line:
        print(f"loadChats starts at {i}")
    if "const handleKeyDown =" in line:
        print(f"handleKeyDown starts at {i}")
    if "const getSystemPrompt" in line:
        print(f"getSystemPrompt starts at {i}")
    if "const getRoleTools =" in line:
        print(f"getRoleTools starts at {i}")
    if "const toolsAvailable =" in line:
        print(f"toolsAvailable starts at {i}")
    if "const callAI =" in line:
        print(f"callAI starts at {i}")
    if "const sendMessage =" in line:
        print(f"sendMessage starts at {i}")
    if "return (" in line and "return (" == line.strip():
        print(f"return starts at {i}")
