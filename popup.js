let pyodideReady = false;
let pyodide = null;
let lastGenerated = "";

// Initialize Pyodide and load Python functions
async function initPyodide() {
  // START: Change - Use animated loading text
  document.getElementById("output").innerHTML =
    '<div class="loading-dots">Loading Python runtime<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>';
  // END: Change

  pyodide = await loadPyodide({
    indexURL: chrome.runtime.getURL("pyodide/")
  });

  const pyCode = `
import re, random, string

def check_password_strength(password):
    length_error = len(password) < 8
    digit_error = re.search(r"\\d", password) is None
    uppercase_error = re.search(r"[A-Z]", password) is None
    lowercase_error = re.search(r"[a-z]", password) is None
    symbol_error = re.search(r"[!@#$%^&*(),.?\\":{}|<>]", password) is None
    errors = [length_error, digit_error, uppercase_error, lowercase_error, symbol_error]
    score = 5 - sum(errors)
    if score == 5:
        strength = "Very Strong 💪"
    elif score == 4:
        strength = "Strong ✅"
    elif score == 3:
        strength = "Medium ⚠️"
    else:
        strength = "Weak ❌"
    feedback = []
    if length_error:
        feedback.append("Use at least 8 characters (12+ recommended).")
    if digit_error:
        feedback.append("Add digits (0-9).")
    if uppercase_error:
        feedback.append("Add uppercase letters.")
    if lowercase_error:
        feedback.append("Add lowercase letters.")
    if symbol_error:
        feedback.append("Add symbols (e.g. !@#$%).")
    return {"rating": strength, "score": score, "feedback": feedback}

def generate_password(length=12):
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(random.choice(characters) for _ in range(length))
    return password
  `;

  await pyodide.runPythonAsync(pyCode);
  pyodideReady = true;
  document.getElementById("output").textContent =
    "(ready) Enter a password or generate one.";
}

// Call Pyodide initialization
initPyodide();

// Run password check
function runCheck(pwd) {
  if (!pyodideReady) {
    document.getElementById("output").textContent = "Python still loading…";
    return;
  }
  const jsonStr = pyodide.runPython(
    `import json; json.dumps(check_password_strength(${JSON.stringify(pwd)}))`
  );
  const obj = JSON.parse(jsonStr);
  const outputEl = document.getElementById("output");

  // Update text content
  outputEl.textContent = `Password: ${pwd}\nRating: ${obj.rating}\nScore: ${
    obj.score
  }/5\nFeedback:\n - ${obj.feedback.join("\n - ")}`;

  // Apply glow effect based on score
  outputEl.className = "output"; // Reset classes first
  switch (obj.score) {
    case 5:
      outputEl.classList.add("glow-very-strong");
      break;
    case 4:
      outputEl.classList.add("glow-strong");
      break;
    case 3:
      outputEl.classList.add("glow-medium");
      break;
    default: // Scores 0, 1, 2
      outputEl.classList.add("glow-weak");
      break;
  }
}

// Run password generator
function runGen(len) {
  if (!pyodideReady) {
    document.getElementById("output").textContent = "Python still loading…";
    return "";
  }
  lastGenerated = pyodide.runPython(`generate_password(${Number(len)})`);
  document.getElementById(
    "output"
  ).textContent = `Generated password:\n${lastGenerated}\nClick "Use Generated" to check it.`;
}

// Event listeners for buttons
document.getElementById("checkBtn").addEventListener("click", () => {
  const pwd = document.getElementById("pwInput").value || "";
  runCheck(pwd);
});

document.getElementById("genBtn").addEventListener("click", () => {
  const len = parseInt(document.getElementById("genLen").value) || 12;
  runGen(len);
});

document.getElementById("useGen").addEventListener("click", () => {
  if (!lastGenerated) {
    document.getElementById("output").textContent =
      "No generated password yet.";
    return;
  }
  document.getElementById("pwInput").value = lastGenerated;
  runCheck(lastGenerated);
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = document.getElementById("pwInput").value || lastGenerated || "";
  const outputEl = document.getElementById("output");
  const tooltip = document.getElementById("copy-tooltip");

  if (!text) {
    outputEl.textContent = "Nothing to copy.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    // Show tooltip animation
    tooltip.classList.add("show");
    setTimeout(() => {
      tooltip.classList.remove("show");
    }, 2000); // Hide after 2 seconds
  } catch (err) {
    console.error("Failed to copy text: ", err);
    outputEl.textContent = "Failed to copy to clipboard.";
  }
});

// START: New Event Listener for Password Toggle
document.getElementById("togglePassword").addEventListener("click", () => {
  const pwInput = document.getElementById("pwInput");
  const toggleBtn = document.getElementById("togglePassword");

  if (pwInput.type === "password") {
    pwInput.type = "text";
    toggleBtn.textContent = "🙈"; // "Hide" icon
  } else {
    pwInput.type = "password";
    toggleBtn.textContent = "👁️"; // "Show" icon
  }
});
// END: New Event Listener
