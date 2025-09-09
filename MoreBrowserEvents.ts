enum PressedKeys {
    //% block="newly"
    newly,
    //% block="currently"
    currently
}
enum SelectionOptions {
    //% block="Select word at cursor"
    selectWordAtCursor,
    //% block="Select Current line"
    selectCurrentLine,
    //% block="Extend Selection to next word"
    extendSelectionToNextWord,
    //% block="Extend Selection to previous word"
    extendSelectionToPreviousWord,
    //% block="Extend Selection to next character"
    extendSelectionToNextChar,
    //% block="Extend Selection to next character"
    extendSelectionToPreviousChar,
    //% block="Delete Selection"
    deleteSelection,
}
enum Shortcuts {
    //% block="Select all"
    selectAll, // ctrl a
    //% block="Redo"
    redo, // ctrl y
    //% block="Undo"
    undo, // ctrl z
    //% block="Copy"
    copy, // ctrl c
    //% block="Cut"
    cut, // ctrl x
    //% block="paste"
    paste,
}

//% block="Live keyboard"
namespace LiveKeyboard {

    // ALL THE KEYS AT ONCE
    const allKeys: { [name: string]: browserEvents.KeyButton } = {
        "A": browserEvents.A, "B": browserEvents.B, "C": browserEvents.C, "D": browserEvents.D,
        "E": browserEvents.E, "F": browserEvents.F, "G": browserEvents.G, "H": browserEvents.H,
        "I": browserEvents.I, "J": browserEvents.J, "K": browserEvents.K, "L": browserEvents.L,
        "M": browserEvents.M, "N": browserEvents.N, "O": browserEvents.O, "P": browserEvents.P,
        "Q": browserEvents.Q, "R": browserEvents.R, "S": browserEvents.S, "T": browserEvents.T,
        "U": browserEvents.U, "V": browserEvents.V, "W": browserEvents.W, "X": browserEvents.X,
        "Y": browserEvents.Y, "Z": browserEvents.Z, "0": browserEvents.Zero, "1": browserEvents.One,
        "2": browserEvents.Two, "3": browserEvents.Three, "4": browserEvents.Four, "5": browserEvents.Five,
        "6": browserEvents.Six, "7": browserEvents.Seven, "8": browserEvents.Eight, "9": browserEvents.Nine,
        "Shift": browserEvents.Shift, "Ctrl": browserEvents.Control, "Alt": browserEvents.Alt,
        "Meta": browserEvents.Meta, "Enter": browserEvents.Enter, "Tab": browserEvents.Tab,
        "CapsLock": browserEvents.CapsLock, "Space": browserEvents.Space, "End": browserEvents.End,
        "Backspace": browserEvents.Backspace, "Delete": browserEvents.Delete,
        "ArrowUp": browserEvents.ArrowUp, "ArrowDown": browserEvents.ArrowDown,
        "ArrowLeft": browserEvents.ArrowLeft, "ArrowRight": browserEvents.ArrowRight,
        "PageDown": browserEvents.PageDown, "PageUp": browserEvents.PageUp,
        "/": browserEvents.ForwardSlash, "\\": browserEvents.BackSlash, ",": browserEvents.Comma,
        ".": browserEvents.Period, "[": browserEvents.OpenBracket, "]": browserEvents.CloseBracket,
        "=": browserEvents.Equals, ";": browserEvents.SemiColon, "-": browserEvents.Hyphen,
        "`": browserEvents.BackTick, "'": browserEvents.Apostrophe
    }
    // A bunch of variables
    let previousKeyStates: { [key: string]: boolean } = {}, typedString = "", cursorPosition = 0;
    export let history = [""], historyIndex = 0, keyBuffer: string[] = [];
    export let selectionStart = 0, selectionEnd = 0, hasSelection = false;
    let selectionAnchor = 0;
    export const MAX_HISTORY = 99, KEY_BUFFER_TIMEOUT = 100; // ill use KEY_BUFFER_TIMEOUT laterr
    export const KEY_REPEAT_DELAY = 450, KEY_REPEAT_RATE = 30;
    const MODIFIERS = ["Shift", "Ctrl", "Alt", "Meta"];

    let keyRepeatTimers: { [key: string]: number } = {}, repeatingKeys: { [key: string]: boolean } = {};
    let keyRepeatTimeouts: { [key: string]: number } = {};
    let keyRepeatIntervals: { [key: string]: number } = {};


    // Makes sure to remove all system keys, not knowing this one line made this project run a few months late
    keymap.setSystemKeys(0, 0, 0, 0)

    // cant forget to map all them keys
    Object.keys(allKeys).forEach(key => {
        previousKeyStates[key] = false;
        repeatingKeys[key] = false;
        keyRepeatTimeouts[key] = 0;
        keyRepeatIntervals[key] = 0;
    });


    // reapeating keys like thissssssssssssssssssssssssssssssssss
    export function startKeyRepeat(key: string) {
        stopKeyRepeat(key);
        keyRepeatTimeouts[key] = setTimeout(() => {
            repeatingKeys[key] = true;
            keyRepeatIntervals[key] = setInterval(() => {
                if (allKeys[key].isPressed()) {
                    const char = keyToChar(key);
                    if (char && char != "") {
                        keyBuffer.push(char);
                        flushKeyBuffer();
                    } else if (key === "Backspace") {
                        handleBackspace();
                    } else if (key === "Delete") {
                        handleDelete();
                    } else if (key === "ArrowLeft") {
                        handleArrowLeft();
                    } else if (key === "ArrowRight") {
                        handleArrowRight();
                    }
                } else {
                    stopKeyRepeat(key);
                }
            }, KEY_REPEAT_RATE);
        }, KEY_REPEAT_DELAY);
    }
    export function stopKeyRepeat(key: string) {
        if (keyRepeatTimeouts[key]) {
            clearTimeout(keyRepeatTimeouts[key]);
            keyRepeatTimeouts[key] = 0;
        }
        if (keyRepeatIntervals[key]) {
            clearInterval(keyRepeatIntervals[key]);
            keyRepeatIntervals[key] = 0;
        }
        repeatingKeys[key] = false;
    }

    export function saveToHistory() {
        if (history[historyIndex] !== typedString) {
            if (historyIndex < history.length - 1) {
                history = history.slice(0, historyIndex + 1);
            }
            history.push(typedString);
            historyIndex = history.length - 1;
            if (history.length > MAX_HISTORY) {
                history.shift();
                historyIndex--;
            }
        }
    }

    export function findNextWordBoundary(pos: number, forward: boolean = true): number {
        if (forward) {
            let i = pos;
            while (i < typedString.length && isWordChar(typedString[i])) i++;
            while (i < typedString.length && !isWordChar(typedString[i])) i++;
            return i;
        } else {
            let i = pos;
            while (i > 0 && !isWordChar(typedString[i - 1])) i--;
            while (i > 0 && isWordChar(typedString[i - 1])) i--;
            return i;
        }
    }
    export function isWordChar(char: string): boolean {
        if (char.length !== 1) return false;
        if (char >= 'A' && char <= 'Z') return true;
        if (char >= 'a' && char <= 'z') return true;
        if (char >= '0' && char <= '9') return true;
        if (char === '_') return true;
        return false;
    }
    export function startOrExtendSelection(newPos: number) {
        if (!hasSelection) {
            selectionAnchor = cursorPosition;
            hasSelection = true;
        }
        if (newPos < selectionAnchor) {
            selectionStart = newPos;
            selectionEnd = selectionAnchor;
        } else {
            selectionStart = selectionAnchor;
            selectionEnd = newPos;
        }
        cursorPosition = newPos;
    }
    export function clearSelectionAndMoveTo(newPos: number) {
        hasSelection = false;
        selectionStart = 0;
        selectionEnd = 0;
        cursorPosition = newPos;
    }
    export function handleArrowLeft() {
        const currentPressed = currentKeys();
        const shiftPressed = currentPressed.indexOf("Shift") !== -1;
        const ctrlPressed = currentPressed.indexOf("Ctrl") !== -1;

        let newPos: number;

        if (ctrlPressed) {
            newPos = findNextWordBoundary(cursorPosition, false);
        } else if (hasSelection && !shiftPressed) {
            newPos = Math.min(selectionStart, selectionEnd);
        } else {
            newPos = Math.max(0, cursorPosition - 1);
        }
        if (shiftPressed) {
            startOrExtendSelection(newPos);
        } else {
            clearSelectionAndMoveTo(newPos);
        }
    }
    export function handleArrowRight() {
        const currentPressed = currentKeys();
        const shiftPressed = currentPressed.indexOf("Shift") !== -1;
        const ctrlPressed = currentPressed.indexOf("Ctrl") !== -1;

        let newPos: number;

        if (ctrlPressed) {
            newPos = findNextWordBoundary(cursorPosition, true);
        } else if (hasSelection && !shiftPressed) {
            newPos = Math.max(selectionStart, selectionEnd);
        } else {
            newPos = Math.min(typedString.length, cursorPosition + 1);
        }
        if (shiftPressed) {
            startOrExtendSelection(newPos);
        } else {
            clearSelectionAndMoveTo(newPos);
        }
    }

    export function handleHome() {
        const currentPressed = currentKeys();
        const shiftPressed = currentPressed.indexOf("Shift") !== -1;
        const ctrlPressed = currentPressed.indexOf("Ctrl") !== -1;

        let newPos: number;
        if (ctrlPressed) {
            newPos = 0;
        } else {
            let lineStart = cursorPosition;
            while (lineStart > 0 && typedString[lineStart - 1] !== '\n') {
                lineStart--;
            }
            newPos = lineStart;
        }
        if (shiftPressed) {
            startOrExtendSelection(newPos);
        } else {
            clearSelectionAndMoveTo(newPos);
        }
    }
    export function handleEnd() {
        const currentPressed = currentKeys();
        const shiftPressed = currentPressed.indexOf("Shift") !== -1;
        const ctrlPressed = currentPressed.indexOf("Ctrl") !== -1;

        let newPos: number;

        if (ctrlPressed) {
            newPos = typedString.length;
        } else {
            let lineEnd = cursorPosition;
            while (lineEnd < typedString.length && typedString[lineEnd] !== '\n') {
                lineEnd++;
            }
            newPos = lineEnd;
        }
        if (shiftPressed) {
            startOrExtendSelection(newPos);
        } else {
            clearSelectionAndMoveTo(newPos);
        }
    }
    export function handleBackspace() {
        const currentPressed = currentKeys();
        const ctrlPressed = currentPressed.indexOf("Ctrl") !== -1;

        if (hasSelection) {
            deleteSelection();
        } else if (ctrlPressed && cursorPosition > 0) {
            const wordStart = findNextWordBoundary(cursorPosition, false);
            typedString = typedString.slice(0, wordStart) + typedString.slice(cursorPosition);
            cursorPosition = wordStart;
        } else if (cursorPosition > 0) {
            typedString = typedString.slice(0, cursorPosition - 1) + typedString.slice(cursorPosition);
            cursorPosition--;
        }
        saveToHistory();
    }
    export function handleDelete() {
        const currentPressed = currentKeys();
        const ctrlPressed = currentPressed.indexOf("Ctrl") !== -1;

        if (hasSelection) {
            deleteSelection();
        } else if (ctrlPressed && cursorPosition < typedString.length) {
            const wordEnd = findNextWordBoundary(cursorPosition, true);
            typedString = typedString.slice(0, cursorPosition) + typedString.slice(wordEnd);
        } else if (cursorPosition < typedString.length) {
            typedString = typedString.slice(0, cursorPosition) + typedString.slice(cursorPosition + 1);
        }
        saveToHistory();
    }
    export function processKeyBuffer() {
        const currentPressed = currentKeys();
        const newKeys = newlyPressedKeys();
        if ((newKeys.length | currentPressed.length) === 0) return;

        if (currentPressed.indexOf("Ctrl") !== -1) {
            if (newKeys.indexOf("Z") !== -1) { undo(); return; }
            if (newKeys.indexOf("Y") !== -1) { redo(); return; }
            if (newKeys.indexOf("A") !== -1) { selectAll(); return; }
            if (newKeys.indexOf("X") !== -1) { cutSelection(); return; }
            if (newKeys.indexOf("C") !== -1) { copySelection(); return; }
            if (newKeys.indexOf("V") !== -1) { pasteFromClipboard(); return; }
        }
        if (newKeys.indexOf("ArrowLeft") !== -1) {
            handleArrowLeft();
            return;
        }
        if (newKeys.indexOf("ArrowRight") !== -1) {
            handleArrowRight();
            return;
        }
        if (newKeys.indexOf("End") !== -1) {
            handleEnd();
            return;
        }
        if (newKeys.indexOf("Home") !== -1) {
            handleHome();
            return;
        }
        if (newKeys.indexOf("Backspace") !== -1) {
            handleBackspace();
            return;
        }
        if (newKeys.indexOf("Delete") !== -1) {
            handleDelete();
            return;
        }
        const nonModifiers = newKeys.filter(k => MODIFIERS.indexOf(k) === -1 &&
            k !== "ArrowLeft" && k !== "ArrowRight" &&
            k !== "ArrowUp" && k !== "ArrowDown" &&
            k !== "End" && k !== "Backspace" && k !== "Delete");
        if (nonModifiers.length === 0) return;
        if (hasSelection) deleteSelection();
        const newChars: string[] = [];
        nonModifiers.forEach(key => {
            const char = keyToChar(key);
            if (char) {
                newChars.push(char);
            }
        });
        if (newChars.length > 0) {
            for (let char of newChars) {
                keyBuffer.push(char);
            }
            flushKeyBuffer();
        }
    }
    export function flushKeyBuffer() {
        if (keyBuffer.length > 0) {
            const newText = keyBuffer.join('');
            typedString = typedString.slice(0, cursorPosition) + newText + typedString.slice(cursorPosition);
            cursorPosition += newText.length;
            keyBuffer = [];
            saveToHistory();
        }
    }
    export function keyToChar(key: string): string {
        if (key === "Space") return " ";
        if (key === "Enter") return "\n";
        if (key === "Tab") return "\t";
        if (key.slice(0, 4) == "Arrow" || key === "Backspace" || key === "Delete" || key === "CapsLock" || key === "End") {
            return "";
        }
        const shiftPressed = previousKeyStates["Shift"];
        if (key.length === 1 && key >= "A" && key <= "Z") {
            return shiftPressed ? key : key.toLowerCase();
        }
        if (key.length === 1 && key >= "0" && key <= "9") {
            if (shiftPressed) {
                const shiftNumberMap: { [key: string]: string } = {
                    "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
                    "6": "^", "7": "&", "8": "*", "9": "(", "0": ")"
                };
                return shiftNumberMap[key] || key;
            }
            return key;
        }

        if ([",", ".", "/", "\\", ";", "'", "[", "]", "-", "=", "`"].indexOf(key) !== -1) {
            if (shiftPressed) {
                const shiftSymbolMap: { [key: string]: string } = {
                    ",": "<", ".": ">", "/": "?", "\\": "|", ";": ":",
                    "'": "\"", "[": "{", "]": "}", "-": "_", "=": "+", "`": "~"
                };
                return shiftSymbolMap[key] || key;
            }
            return key;
        }

        return "";
    }
    // Dw man, ill add a clipboard history... some day
    export let clipboard = "";
    
    
    /**
     * Returns A LIST of all newly pressed keys!
     * can be used to detect typing
     */
    //% block="get $k pressed keys"
    //% group="keys"
    export function getPressedKeys(k: PressedKeys): string[] {
        switch (k) {
            case PressedKeys.newly:
                return newlyPressedKeys()
            case PressedKeys.currently:
                return currentKeys()
            default:
                return [];
        }
    }
    export function currentKeys(): string[] {
        const pressed = Object.keys(allKeys).filter(name => allKeys[name].isPressed());
        const modifierPriority = MODIFIERS;

        return pressed.sort((a, b) => {
            const ai = modifierPriority.indexOf(a);
            const bi = modifierPriority.indexOf(b);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return a < b ? -1 : a > b ? 1 : 0;
        });
    }
    export function newlyPressedKeys(): string[] {
        const currentPressed = currentKeys();
        const newlyPressed: string[] = [];

        for (const key of currentPressed) {
            if (!previousKeyStates[key]) {
                newlyPressed.push(key);
                previousKeyStates[key] = true;
                if (MODIFIERS.indexOf(key) === -1) startKeyRepeat(key);
            }
        }

        Object.keys(allKeys).forEach(key => {
            if (currentPressed.indexOf(key) === -1 && previousKeyStates[key]) {
                previousKeyStates[key] = false;
                stopKeyRepeat(key);
            }
        });

        return newlyPressed;
    }

   
    //% block="$k"
    //% group="Clipboard"
    export function executeShortcut(k: Shortcuts) {
        switch (k) {
            case Shortcuts.selectAll:
                selectAll()
                break;
            case Shortcuts.redo:
                redo()
                break;
            case Shortcuts.undo:
                undo()
                break;
            case Shortcuts.copy:
                copySelection()
                break;
            case Shortcuts.cut:
                cutSelection()
                break;
            case Shortcuts.paste:
                pasteFromClipboard()
                break;
            default:
            break
        }
    }
    export function cutSelection() {
        if (hasSelection) {
            clipboard = getSelection();
            deleteSelection();
        }
    }
    export function copySelection() {
        if (hasSelection) {
            clipboard = getSelection();
        }
    }
    export function pasteFromClipboard() {
        if (clipboard.length > 0) {
            if (hasSelection) {
                deleteSelection();
            }
            typedString = typedString.slice(0, cursorPosition) + clipboard + typedString.slice(cursorPosition);
            cursorPosition += clipboard.length;
            saveToHistory();
        }
    }
    export function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            typedString = history[historyIndex];
            cursorPosition = typedString.length;
            hasSelection = false;
            selectionStart = 0;
            selectionEnd = 0;
            selectionAnchor = 0;
        }
    }
    export function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            typedString = history[historyIndex];
            cursorPosition = typedString.length;
            hasSelection = false;
            selectionStart = 0;
            selectionEnd = 0;
            selectionAnchor = 0;
        }
    }
    export function selectAll() {
        if (typedString.length > 0) {
            selectionStart = 0;
            selectionEnd = typedString.length;
            hasSelection = true;
            cursorPosition = typedString.length;
            selectionAnchor = 0;
        }
    }
    /**
     * Gets the clipboard content
     */
    //% block="get clipboard content"
    //% group="Clipboard"
    //% weight=82
    export function getClipboard(): string {
        return clipboard;
    }
    /**
     * Sets the clipboard content
     */
    //% block="set clipboard to %text"
    //% group="Clipboard" 
    //% weight=81
    export function setClipboard(text: string) {
        clipboard = text;
    }
    //% block="$k"
    //% group="Selection"
    //% weight=88
    export function executeSelectionAction(k: SelectionOptions) {
        switch (k) {
            case SelectionOptions.selectWordAtCursor:
                selectWordAtCursor()
                break;
            case SelectionOptions.selectCurrentLine:
                selectCurrentLine()
                break;
            case SelectionOptions.extendSelectionToNextWord:
                extendSelectionToNextWord()
                break;
            case SelectionOptions.extendSelectionToPreviousWord:
                extendSelectionToPreviousWord()
                break;
            case SelectionOptions.extendSelectionToNextChar:
                if (hasSelection) selectionEnd = Math.min(selectionEnd + 1, typedString.length)
                break;
            case SelectionOptions.extendSelectionToPreviousChar:
                if (hasSelection) selectionStart = Math.max(selectionStart - 1, 0)
                break;
            case SelectionOptions.deleteSelection:
                deleteSelection()
                break
        }
    }
    export function selectWordAtCursor() {
        if (cursorPosition < typedString.length && isWordChar(typedString[cursorPosition])) {
            const wordStart = findNextWordBoundary(cursorPosition, false);
            const wordEnd = findNextWordBoundary(cursorPosition, true);
            setSelection(wordStart, wordEnd);
        }
    }
    export function selectCurrentLine() {
        let lineStart = cursorPosition;
        while (lineStart > 0 && typedString[lineStart - 1] !== '\n') {
            lineStart--;
        }

        let lineEnd = cursorPosition;
        while (lineEnd < typedString.length && typedString[lineEnd] !== '\n') {
            lineEnd++;
        }

        setSelection(lineStart, lineEnd);
    }
    export function extendSelectionToNextWord() {
        const nextBoundary = findNextWordBoundary(cursorPosition, true);
        if (!hasSelection) {
            selectionAnchor = cursorPosition;
            hasSelection = true;
        }
        startOrExtendSelection(nextBoundary);
    }
    export function extendSelectionToPreviousWord() {
        const prevBoundary = findNextWordBoundary(cursorPosition, false);
        if (!hasSelection) {
            selectionAnchor = cursorPosition;
            hasSelection = true;
        }
        startOrExtendSelection(prevBoundary);
    }
    export function deleteSelection() {
        if (hasSelection) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            typedString = typedString.slice(0, start) + typedString.slice(end);
            cursorPosition = start;
            hasSelection = false;
            selectionStart = 0;
            selectionEnd = 0;
            selectionAnchor = 0;
        }
    }
    /**
     * Gets the currently typed text
     */
    //% block="get typed text"
    export function getTypedString(): string {
        if (cursorPosition > typedString.length) {
            cursorPosition = typedString.length;
        }
        return typedString;
    }
    /**
     * clear the typed text
     */
    //% block="clear typed text"
    export function clearTypedString() {
        typedString = "";
        cursorPosition = 0;
        hasSelection = false;
        selectionStart = 0;
        selectionEnd = 0;
        selectionAnchor = 0;
        history = [""];
        historyIndex = 0;
        saveToHistory();
    }
    export function getCursorInfo(): { cursor: number, hasSelection: boolean, selectedText: string, selectionStart: number, selectionEnd: number } {
        let selectedText = "";
        if (hasSelection) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            selectedText = typedString.slice(start, end);
        }

        return {
            cursor: cursorPosition,
            hasSelection: hasSelection,
            selectedText: selectedText,
            selectionStart: selectionStart,
            selectionEnd: selectionEnd
        };
    }
    /**
     * Sets the position of the cursor inside of the typed string
     */
    //% block="set cursor position to $position"
    export function setCursorPosition(position: number) {
        cursorPosition = Math.max(0, Math.min(position, typedString.length));
        hasSelection = false;
        selectionStart = 0;
        selectionEnd = 0;
    }
    /**
     * Moves the cursor by a delta
     * `CursorPosition += delta`
     */
    //% block="move cursor position by $delta"
    export function moveCursor(delta: number) {
        setCursorPosition(cursorPosition + delta);
    }
    /**
     * sets the selection start and end
     */
    //% block="set Selection start $start and end $end"
    export function setSelection(start: number, end: number) {
        start = Math.max(0, Math.min(start, typedString.length));
        end = Math.max(0, Math.min(end, typedString.length));

        selectionStart = start;
        selectionEnd = end;
        hasSelection = start !== end;
        cursorPosition = end;
        selectionAnchor = start;
    }
    
    /**
     * Converts a list of keys into a keybind
     * idk what the use could be but its here if you need it
     */
    //% block="convert Keys into keybind $keybind"
    //% keybind.defl=["shift","A"]
    //% group="keys"
    export function convertKeybind(keybind: string[]): string {
        if (keybind.length === 0) return "";
        if (keybind.length === 1 && keybind[0].length === 1) return keybind[0].toLowerCase();
        if (keybind.length === 2 && keybind[0] === "Shift") return keybind[1];
        return keybind.join("+");
    }

    export function getDebugInfo(): string {
        let info = `Text: "${typedString}"\nCursor: ${cursorPosition}\nHistory: ${historyIndex + 1}/${history.length}`;
        if (hasSelection) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            info += `\nSelection: ${start}-${end} ("${typedString.slice(start, end)}")`;
            info += `\nAnchor: ${selectionAnchor}`;
        }
        info += `\nClipboard: "${clipboard}"`;
        return info;
    }
    /**
     * Starts processing input and runs a callback when the typed string updates.
     * @param handler a function that receives the current typed string.
     */
    //% block="on input text update $str"
    //% str.defl=str
    //% str.shadow=variable_get
    //% draggableParameters
    export function startKeyLogging(handler: (str: string) => void): void {
        let lastTypedString = "";

        game.onUpdate(() => {
            processKeyBuffer();
            const currentTyped = getTypedString();
            if (currentTyped !== lastTypedString) {
                lastTypedString = currentTyped;
                handler(currentTyped);
            }
        });
    }
    /**
     *  Enable menu to reset the typed text
     */
    //% block="enable menu button to reset typed text"
    export function enableClearButton(): void {
        controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
            clearTypedString();
        });
    }
    /**
     *  Gets the cursor's position
     */
    //% block="Get current cursor position"
    export function getCursorPosition() {
        return cursorPosition;
    }

    /**
     * Gets the currently selected text
     */
    //% block="get selected text"
    //% group="Selection"
    //% weight=90
    export function getSelection(): string {
        if (hasSelection) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            return typedString.slice(start, end);
        }
        return "";
    }
}