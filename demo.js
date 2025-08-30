// Demo JavaScript code for testing Voice Explainer
// Select this function and right-click to "Explain Selected Code with Voice"

function calculateTotal(items) {
    let total = 0;
    
    // Loop through each item
    for (const item of items) {
        // Add item price multiplied by quantity
        total += item.price * item.quantity;
    }
    
    // Apply 10% discount if total is over $100
    if (total > 100) {
        total = total * 0.9;
    }
    
    return total;
}

// Test with sample data
const shoppingCart = [
    { name: "Laptop", price: 999, quantity: 1 },
    { name: "Mouse", price: 25, quantity: 2 },
    { name: "Keyboard", price: 75, quantity: 1 }
];

const finalTotal = calculateTotal(shoppingCart);
console.log(`Total: $${finalTotal.toFixed(2)}`);

/* 
To test the multi-language voices:
1. Run Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Search for "Select Voice Language & Style"
3. Choose from 150+ voices in 20+ languages:
   - 🇺🇸 English US (Natalie, Miles, Ken, etc.)
   - 🇬🇧 English UK (Ruby, Theo, Hazel, etc.)
   - 🇪🇸 Spanish (Diego, Valentina, Fernando, etc.)
   - 🇫🇷 French (Amelie, Antoine, Henri, etc.)
   - 🇩🇪 German (Klaus, Petra, Werner, etc.)
   - 🇮🇹 Italian (Alessandro, Chiara, Giuseppe, etc.)
   - And many more languages!
4. Select your preferred voice style (Conversational, Narration, Promo, etc.)
5. Try explaining the function above to hear your new voice!
*/
