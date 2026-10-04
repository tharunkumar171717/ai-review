// Demo file with deliberate problems. Run `npm run demo` to see the reviewer flag them.

const password = "hunter2hunter2"; // P0: hardcoded secret

async function fetchUsers() {
  const res = await fetch("https://api.example.com/users"); // P2: hardcoded URL
  console.log("fetched users"); // P3: debug statement
  return res.json();
}

function applyDiscount(price) {
  return price * 0.85; // P2: magic number
}

// TODO: handle errors  <- P3
function formatUser(person) {
  const first = person.firstName.trim();
  const last = person.lastName.trim();
  const email = person.email.toLowerCase();
  const fullName = `${first} ${last}`;
  const initials = first.charAt(0) + last.charAt(0);
  const display = fullName.toUpperCase();
  return { fullName, initials, display, email };
}

// P1: duplicate of formatUser - should reuse it
function formatAdmin(person) {
  const first = person.firstName.trim();
  const last = person.lastName.trim();
  const email = person.email.toLowerCase();
  const fullName = `${first} ${last}`;
  const initials = first.charAt(0) + last.charAt(0);
  const display = fullName.toUpperCase();
  return { fullName, initials, display, email, role: "admin" };
}

module.exports = { password, fetchUsers, applyDiscount, formatUser, formatAdmin };
