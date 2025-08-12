// Tests are here

// Process keys every frame
game.onUpdate(function () {
    LiveKeyboard.processKeyBuffer();
});

// Log the typed string every 100ms
game.onUpdateInterval(100, function () {
    // Get current active keys for debugging
    const currentKeys = LiveKeyboard.currentKeys();

    // Show the typed string
    console.logValue("Typed", LiveKeyboard.getTypedString());

    // Show debug info
    console.logValue("Info", LiveKeyboard.getDebugInfo());

    // Also show current keys for debugging
    if (currentKeys.length > 0) {
        console.logValue("Active Keys", LiveKeyboard.convertKeybind(currentKeys));
    }
});

// Add a button to clear the typed string
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
    LiveKeyboard.clearTypedString();
    console.logValue("Typed", "Cleared");
});