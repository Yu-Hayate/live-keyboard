// Tests are here

// Process keys every frame
game.onUpdate(function () {
    inputs.processKeyBuffer();
});

// Log the typed string every 100ms
game.onUpdateInterval(100, function () {
    // Get current active keys for debugging
    const currentKeys = inputs.currentKeys();

    // Show the typed string
    console.logValue("Typed", inputs.getTypedString());

    // Show debug info
    console.logValue("Info", inputs.getDebugInfo());

    // Also show current keys for debugging
    if (currentKeys.length > 0) {
        console.logValue("Active Keys", inputs.convertKeybind(currentKeys));
    }
});

// Add a button to clear the typed string
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
    inputs.clearTypedString();
    console.logValue("Typed", "Cleared");
});