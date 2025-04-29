namespace inputs {

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
        "CapsLock": browserEvents.CapsLock, "Space": browserEvents.Space, "Backspace": browserEvents.End,
        "ArrowUp": browserEvents.ArrowUp, "ArrowDown": browserEvents.ArrowDown,
        "ArrowLeft": browserEvents.ArrowLeft, "ArrowRight": browserEvents.ArrowRight,
        "/": browserEvents.ForwardSlash, "\\": browserEvents.BackSlash, ",": browserEvents.Comma,
        ".": browserEvents.Period, "[": browserEvents.OpenBracket, "]": browserEvents.CloseBracket,
        "=": browserEvents.Equals, ";": browserEvents.SemiColon, "-": browserEvents.Hyphen,
        "`": browserEvents.BackTick, "'": browserEvents.Apostrophe
    }

    let previousKeyStates: { [key: string]: boolean } = {}, typedString = "", cursorPosition = 0;
    let history = [""], historyIndex = 0, keyBuffer: string[] = [];
    let selectionStart = 0, selectionEnd = 0, hasSelection = false;
    const MAX_HISTORY = 99, KEY_BUFFER_TIMEOUT = 100;
    const KEY_REPEAT_DELAY = 450, KEY_REPEAT_RATE = 30;
    let keyRepeatTimers: { [key: string]: number } = {}, repeatingKeys: { [key: string]: boolean } = {};
    const MODIFIERS = ["Shift", "Ctrl", "Alt", "Meta"];

    (function initKeyStates() {
        Object.keys(allKeys).forEach(key => {
            previousKeyStates[key] = false;
            repeatingKeys[key] = false;
        });
    })();

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
        keyRepeatTimers[key] = setTimeout(() => {
            repeatingKeys[key] = true;
            keyRepeatTimers[key] = setInterval(() => {
                if (allKeys[key].isPressed()) {
                    const char = keyToChar(key);
                    if (char) {
                        keyBuffer.push(char);
                        flushKeyBuffer();
                    } else if (key === "Backspace") {
                        if (hasSelection) {
                            deleteSelection();
                        } else if (typedString.length > 0) {
                            typedString = typedString.slice(0, -1);
                            cursorPosition = typedString.length;
                            saveToHistory();
                        }
                    }
                } else {
                    stopKeyRepeat(key);
                }
            }, KEY_REPEAT_RATE);
        }, KEY_REPEAT_DELAY);
    }

    function stopKeyRepeat(key: string) {
        if (keyRepeatTimers[key]) {
            clearTimeout(keyRepeatTimers[key]);
            clearInterval(keyRepeatTimers[key]);
            keyRepeatTimers[key] = 0;
            repeatingKeys[key] = false;
        }
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

    export function processKeyBuffer() {
        const currentPressed = currentKeys();
        const newKeys = newlyPressedKeys();
        if ((newKeys.length | currentPressed.length) === 0) return;

        if (currentPressed.indexOf("Ctrl") !== -1) {
            if (newKeys.indexOf("Z") !== -1) { undo(); return; }
            if (newKeys.indexOf("Y") !== -1) { redo(); return; }
            if (newKeys.indexOf("A") !== -1) { selectAll(); return; }
            if (["X", "C", "V"].some(k => newKeys.indexOf(k) !== -1)) return;
        }

        if (newKeys.indexOf("Backspace") !== -1) {
            if (hasSelection) {
                deleteSelection();
            } else if (typedString.length > 0) {
                typedString = typedString.slice(0, -1);
                cursorPosition = typedString.length;
            }
            saveToHistory();
            return;
        }

        const nonModifiers = newKeys.filter(k => MODIFIERS.indexOf(k) === -1);
        if (nonModifiers.length === 0) return;

        if (hasSelection) deleteSelection();

        nonModifiers.forEach(key => {
            const char = keyToChar(key);
            if (char) {
                keyBuffer.push(char);
                setTimeout(flushKeyBuffer, KEY_BUFFER_TIMEOUT);
            }
        });
    }

    export function flushKeyBuffer() {
        if (keyBuffer.length > 0) {
            typedString += keyBuffer.join('');
            cursorPosition = typedString.length;
            keyBuffer = [];
            saveToHistory();
        }
    }

    export function keyToChar(key: string): string {
        if (key === "Space") return " ";
        if (key === "Enter") return "\n";
        if (key === "Tab") return "\t";
        if (key.slice(0, 4) == "Arrow" || key === "Backspace" || key === "CapsLock") {
            return "";
        }
        const shiftPressed = previousKeyStates["Shift"];
        if (key.length === 1 && key >= "A" && key <= "Z") {
            return shiftPressed ? key : key.toLowerCase();
        }
        if (key.length === 1 && key >= "0" && key <= "9") {
            if (shiftPressed) {
                const shiftNumberMap: { [key: string]: string } = {
                    "1": "!",
                    "2": "@",
                    "3": "#",
                    "4": "$",
                    "5": "%",
                    "6": "",
                    "7": "&",
                    "8": "*",
                    "9": "(",
                    "0": ")"
                };
                return shiftNumberMap[key] || key;
            }
            return key;
        }

        // Handle punctuation and symbols
        if ([",", ".", "/", "\\", ";", "'", "[", "]", "-", "=", "`"].indexOf(key) !== -1) {
            if (shiftPressed) {
                const shiftSymbolMap: { [key: string]: string } = {
                    ",": "<",
                    ".": ">",
                    "/": "?",   // Funny story: when Shift+6 was pressed, it somehow sayed i was pressing '/' instead of 'shift+6'
                                // So while adding the other keys to the symbol map, I figured—why not try mapping '/' to '?'...
                                // And it actually worked! Total meme behavior, but hey—it works 🤷‍♂️😂
                    "\\": "|",
                    ";": ":",
                    "'": "\"",
                    "[": "{",
                    "]": "}",
                    "-": "_",
                    "=": "+",
                    "`": "~"
                };
                return shiftSymbolMap[key] || key;
            }
            return key;
        }

        return "";
    }

    export function getTypedString(): string {
        return typedString;
    }

    /**
     * Clears the typed string and resets cursor and selection.
     */
    //% block="clear typed string"
    //% group="Text"
    //% weight=99
    export function clearTypedString() {
        typedString = "";
        cursorPosition = 0;
        hasSelection = false;
        saveToHistory();
    }

    /**
     * Selects all the text.
     */
    //% block="select all text"
    //% group="Text"
    //% weight=98
    export function selectAll() {
        if (typedString.length > 0) {
            selectionStart = 0;
            selectionEnd = typedString.length;
            hasSelection = true;
        }
    }

    /**
     * Deletes the currently selected text.
     */
    //% block="delete selection"
    //% group="Text"
    //% weight=97
    export function deleteSelection() {
        if (hasSelection) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            typedString = typedString.slice(0, start) + typedString.slice(end);
            cursorPosition = start;
            hasSelection = false;
        }
    }

    /**
     * Undoes the last change.
     */
    //% block="undo"
    //% group="History"
    //% weight=96
    export function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            typedString = history[historyIndex];
            cursorPosition = typedString.length;
            hasSelection = false;
        }
    }

    /**
     * Redoes the last undone change.
     */
    //% block="redo"
    //% group="History"
    //% weight=95
    export function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            typedString = history[historyIndex];
            cursorPosition = typedString.length;
            hasSelection = false;
        }
    }

    /**
     * Converts a keybind array to a string representation.
     * For example: `["Shift", "A"]` becomes `"A"`, and `["Ctrl", "S"]` becomes `"Ctrl+S"`.
     * 
     * @param keybind The array of keybind components (e.g. ["Ctrl", "S"]).
     * @returns The formatted string version of the keybind.
     */
    //% block="convert keybind %keybind"
    //% group="Debug"
    //% weight=89
    export function convertKeybind(keybind: string[]): string {
        if (keybind.length === 0) return "";
        if (keybind.length === 1 && keybind[0].length === 1) return keybind[0].toLowerCase();
        if (keybind.length === 2 && keybind[0] === "Shift") return keybind[1];
        return keybind.join("+");
    }

    /**
     * Returns debug information including the current text, cursor position,
     * history index, and selection range if active.
     */
    //% block="get debug info"
    //% group="Debug"
    //% weight=90
    export function getDebugInfo(): string {
        let info = `Text: "${typedString}"\nCursor: ${cursorPosition}\nHistory: ${historyIndex + 1}/${history.length}`;
        if (hasSelection) info += `\nSelection: ${selectionStart}-${selectionEnd}`;
        return info;
    }

    /**
     * Starts processing input and runs a callback when the typed string updates.
     * @param handler a function that receives the current typed string.
     */
    //% blockId=inputs_start_key_logging 
    //% block="on typed key updates $str"
    //% str.defl=str
    //% str.shadow=variable_get
    //% draggableParameters
    export function startKeyLogging(handler: (str: string) => void): void {
        game.onUpdate(processKeyBuffer);
        game.onUpdateInterval(100, function () {
            const typed = getTypedString();
            handler(typed);
        });
    }

    /**
     * Adds a menu button handler to clear the typed string.
     */
    //% blockId=inputs_enable_clear_button 
    //% block="enable clear button"
    export function enableClearButton(): void {
        controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
            clearTypedString();
        });
    }
}