let age = 20;
let hasID = true;

if (age >= 18) {
    if (hasID) {
        console.log("You are allowed to enter.");
    } else {
        console.log("You need an ID to enter.");
    }
} else {
    if (age < 13) {
        console.log("Sorry, you are too young to enter.");
    } else {
        console.log("You must be at least 18 to enter.");
    }
}
