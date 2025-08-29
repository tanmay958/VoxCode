function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price;
    }
    return total;
}

const items = [
    { name: "apple", price: 1.5 },
    { name: "banana", price: 0.8 }
];

console.log(calculateTotal(items));
