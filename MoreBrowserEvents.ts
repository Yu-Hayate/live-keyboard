//% block="Live keyboard"
namespace LiveKeyboard {

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

    let previousKeyStates: { [key: string]: boolean } = {}, typedString = "", cursorPosition = 0;
    let history = [""], historyIndex = 0, keyBuffer: string[] = [];
    let selectionStart = 0, selectionEnd = 0, hasSelection = false;
    let selectionAnchor = 0;
    const MAX_HISTORY = 99, KEY_BUFFER_TIMEOUT = 100;
    const KEY_REPEAT_DELAY = 450, KEY_REPEAT_RATE = 30;
    let keyRepeatTimers: { [key: string]: number } = {}, repeatingKeys: { [key: string]: boolean } = {};
    const MODIFIERS = ["Shift", "Ctrl", "Alt", "Meta"];
    let keyRepeatTimeouts: { [key: string]: number } = {};
    let keyRepeatIntervals: { [key: string]: number } = {};

    keymap.setSystemKeys(0, 0, 0, 0)
    Object.keys(allKeys).forEach(key => {
        previousKeyStates[key] = false;
        repeatingKeys[key] = false;
        keyRepeatTimeouts[key] = 0;
        keyRepeatIntervals[key] = 0;
    });

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

    function startKeyRepeat(key: string) {
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

    function stopKeyRepeat(key: string) {
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

    function saveToHistory() {
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

    /**
     * Finds the next word boundary position from the given position
     */
    function findNextWordBoundary(pos: number, forward: boolean = true): number {
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

    /**
     * Checks if a character is part of a word (alphanumeric or underscore)
     */
    function isWordChar(char: string): boolean {
        if (char.length !== 1) return false;
        if (char >= 'A' && char <= 'Z') return true;
        if (char >= 'a' && char <= 'z') return true;
        if (char >= '0' && char <= '9') return true;
        if (char === '_') return true;
        return false;
    }

    /**
     * Starts or extends a selection
     */
    function startOrExtendSelection(newPos: number) {
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

    /**
     * Clears selection and moves cursor
     */
    function clearSelectionAndMoveTo(newPos: number) {
        hasSelection = false;
        selectionStart = 0;
        selectionEnd = 0;
        cursorPosition = newPos;
    }

    function handleArrowLeft() {
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

    function handleArrowRight() {
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

    function handleHome() {
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

    function handleEnd() {
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

    function handleBackspace() {
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

    function handleDelete() {
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

    let clipboard = "";

    /**
     * Cuts the selected text to clipboard
     */
    //% block="cut selection"
    //% group="Clipboard"
    //% weight=85
    export function cutSelection() {
        if (hasSelection) {
            clipboard = getSelection();
            deleteSelection();
        }
    }

    /**
     * Copies the selected text to clipboard
     */
    //% block="copy selection"
    //% group="Clipboard"
    //% weight=84
    export function copySelection() {
        if (hasSelection) {
            clipboard = getSelection();
        }
    }

    /**
     * Pastes text from clipboard
     */
    //% block="paste from clipboard"
    //% group="Clipboard"
    //% weight=83
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

    /**
     * Selects the word at the current cursor position
     */
    //% block="select word at cursor"
    //% group="Selection"
    //% weight=88
    export function selectWordAtCursor() {
        if (cursorPosition < typedString.length && isWordChar(typedString[cursorPosition])) {
            const wordStart = findNextWordBoundary(cursorPosition, false);
            const wordEnd = findNextWordBoundary(cursorPosition, true);
            setSelection(wordStart, wordEnd);
        }
    }

    /**
     * Selects the current line
     */
    //% block="select current line"
    //% group="Selection"
    //% weight=87
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

    /**
     * Extends selection to the next word boundary
     */
    //% block="extend selection to next word"
    //% group="Selection"
    //% weight=86
    export function extendSelectionToNextWord() {
        const nextBoundary = findNextWordBoundary(cursorPosition, true);
        if (!hasSelection) {
            selectionAnchor = cursorPosition;
            hasSelection = true;
        }
        startOrExtendSelection(nextBoundary);
    }

    /**
     * Extends selection to the previous word boundary
     */
    //% block="extend selection to previous word" 
    //% group="Selection"
    //% weight=85
    export function extendSelectionToPreviousWord() {
        const prevBoundary = findNextWordBoundary(cursorPosition, false);
        if (!hasSelection) {
            selectionAnchor = cursorPosition;
            hasSelection = true;
        }
        startOrExtendSelection(prevBoundary);
    }

    export function getTypedString(): string {
        if (cursorPosition > typedString.length) {
            cursorPosition = typedString.length;
        }
        return typedString;
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

    export function setCursorPosition(position: number) {
        cursorPosition = Math.max(0, Math.min(position, typedString.length));
        hasSelection = false;
        selectionStart = 0;
        selectionEnd = 0;
    }

    export function moveCursor(delta: number) {
        setCursorPosition(cursorPosition + delta);
    }

    export function setSelection(start: number, end: number) {
        start = Math.max(0, Math.min(start, typedString.length));
        end = Math.max(0, Math.min(end, typedString.length));

        selectionStart = start;
        selectionEnd = end;
        hasSelection = start !== end;
        cursorPosition = end;
        selectionAnchor = start;
    }

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

    export function selectAll() {
        if (typedString.length > 0) {
            selectionStart = 0;
            selectionEnd = typedString.length;
            hasSelection = true;
            cursorPosition = typedString.length;
            selectionAnchor = 0;
        }
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

    export function startKeyLogging(handler: (str: string) => void): void {
        game.onUpdate(processKeyBuffer);
        game.onUpdateInterval(100, function () {
            const typed = getTypedString();
            handler(typed);
        });
    }

    export function enableClearButton(): void {
        controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
            clearTypedString();
        });
    }

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