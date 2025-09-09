# Missing / Underdeveloped Functions

Looking at the current implementation, many essentials are covered (history, selection, clipboard, cursor movement, undo/redo, key repeat).  
However, to get closer to a full text editor API, the following areas are missing:

---

## 🔑 Key Handling
- Arrow Up / Arrow Down → move cursor between lines, respecting column when possible  
- PageUp / PageDown → jump by larger chunks  
- Home / End with Ctrl → extend to "go to top of document" / "go to bottom"  
- Insert → toggle overwrite mode (replace instead of insert)  

---

## ✂️ Selection / Editing
- Select to beginning/end of line (Shift+Home / Shift+End)  
- Select to top/bottom of document (Shift+Ctrl+Home / Shift+Ctrl+End)  
- Word-wise deletion (Ctrl+Backspace / Ctrl+Delete – partially implemented)  
- Replace selection with text (explicit API call)  
- Toggle case of selection (upper, lower, capitalize)  
- Duplicate line / selection  

---

## 📋 Clipboard Extensions
- Clipboard history (multiple slots instead of single buffer)  
- Paste without formatting (future-proof if rich text added)  

---

## ⏳ Navigation / State
- Word jump (Ctrl+Left/Right → partially exists inside `handleArrow*`, but not exposed)  
- Paragraph jump (jump to blank-line boundaries)  
- Go to line/column  
- Scroll state (if viewport management added)  

---

## 🧩 Utility
- Overwrite mode toggle & status  
- Selection direction tracking (did selection extend left or right first)  
- Key chord detection (e.g., Ctrl+K, Ctrl+C sequences)  
- Repeat last action (like Emacs `C-x z`)  

---

## 📌 Priorities
1. **Line-based navigation** → Arrow Up/Down + line start/end selection  
2. **Selection to boundaries** → Shift+Home/End, Ctrl+Shift+Home/End  
3. **Direct text manipulation** → insert/replace API calls  

---


# Thank you ChatGPT 🫡 i will take on from now on

## More Events!
1. easyer detection of shortcuts
2. better version for getting the typed text, maybe adding 'start recording' and 'stop recording' options to only tracked the string between those lines, but you can already just use 'clear selection' to so nearly the same thing \\\_(-\_-)\_/

## Live Mouse!
1. maybe just some slightly more entuative code like a single event for any mouse clicks and also getting the position of it (or at least the last recoreded one)
2. a few blocks makes events for when the mouse is within an area it runs the code, maybe having that simple block but also having it with the option for different shapes if i make sense?