const textElement = document.getElementById('typing-effect');
const staticText = "Hello "; // The static part of the text
const dynamicTextArray = ["World", "Kitty", "Universe", "Friend"]; // The changing part of the text
const typingDelay = 100; // Delay between typing each character
const erasingDelay = 50; // Delay between erasing each character
const newTextDelay = 2000; // Delay before starting the next text
let dynamicTextIndex = 0; // Index of the current dynamic text
let charIndex = 0; // Index of the current character being typed or erased

function type() {
    if (charIndex < dynamicTextArray[dynamicTextIndex].length) {
        // Append the next character to the static text
        textElement.textContent = staticText + dynamicTextArray[dynamicTextIndex].substring(0, charIndex + 1);
        charIndex++;
        setTimeout(type, typingDelay);
    } else {
        // Wait for a bit before starting to erase
        setTimeout(erase, newTextDelay);
    }
}

function erase() {
    if (charIndex > 0) {
        // Erase one character at a time
        textElement.textContent = staticText + dynamicTextArray[dynamicTextIndex].substring(0, charIndex - 1);
        charIndex--;
        setTimeout(erase, erasingDelay);
    } else {
        // Move to the next dynamic text
        dynamicTextIndex++;
        if (dynamicTextIndex < dynamicTextArray.length) {
            // Start typing the next dynamic text
            setTimeout(type, typingDelay);
        }
        // If dynamicTextIndex >= dynamicTextArray.length, the animation stops
    }
}

// Start the effect when the page loads
document.addEventListener("DOMContentLoaded", function () {
    if (dynamicTextArray.length) {
        setTimeout(type, newTextDelay);
    }
});