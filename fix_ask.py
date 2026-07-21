with open('frontend/src/pages/Ask.jsx', 'r') as f:
    text = f.read()

# Remove the old deleteChat and commitRename and toolsAvailable
old_block_start = "  const deleteChat = async (e, chatId) => {"
old_block_end = "  };" # We'll just find the end of toolsAvailable. Actually, I can use regex to remove from deleteChat to the end of toolsAvailable

import re
text = re.sub(r"  const deleteChat = async \(e, chatId\) => \{.*?\n  };\n\n  const sendMessage = useCallback", "  const handleDeleteChat = async (e, chatId) => {\n    e.stopPropagation();\n    try {\n      await deleteChat(chatId);\n    } catch (err) {}\n    setChats(prev => prev.filter(c => c.id !== chatId));\n    if (activeChatId === chatId) setActiveChatId(null);\n  };\n\n  const startRename = (e, chat) => {\n    e.stopPropagation();\n    setRenamingId(chat.id);\n    setRenameValue(chat.name || chat.title);\n  };\n\n  const commitRename = async (chatId) => {\n    if (renameValue.trim()) {\n      setChats(prev => prev.map(c => c.id === chatId ? { ...c, name: renameValue.trim(), title: renameValue.trim() } : c));\n    }\n    setRenamingId(null);\n  };\n\n  const sendMessage = useCallback", text, flags=re.DOTALL)

# Also rename deleteChat to handleDeleteChat in onClick
text = text.replace("onClick={e => deleteChat(e, chat.id)}", "onClick={e => handleDeleteChat(e, chat.id)}")

with open('frontend/src/pages/Ask.jsx', 'w') as f:
    f.write(text)
