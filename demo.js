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
