const durationMinutes = "60";
const sum = 0 + durationMinutes;
console.log("sum is:", sum);
const slotStart = 600;
const slotEnd = slotStart + sum;
console.log("slotEnd is:", slotEnd);
const workEnd = 1080;
if (slotEnd > workEnd) console.log("slotEnd > workEnd is TRUE");
