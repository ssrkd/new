with open('frontend/src/pages/Ask.jsx', 'r') as f:
    text = f.read()

# Change 'content: m.content' to 'text: m.content' in loadMessages
text = text.replace("content: m.content, // keeping it as content, not text, for markdown renderer", "text: m.content,")

# Change 'content: textStr' to 'text: textStr' in sendMessage
text = text.replace("content: textStr,", "text: textStr,")

# Change 'content: finalResponseText' to 'text: finalResponseText' in sendMessage
text = text.replace("content: finalResponseText,", "text: finalResponseText,")

with open('frontend/src/pages/Ask.jsx', 'w') as f:
    f.write(text)

