function login() {
  // Get the input values
  const username = document.getElementById("username").value;
  const secureCode = document.getElementById("secureCode").value;

  // Validate inputs
  if (!username || !secureCode) {
    alert("Please enter both username and secure code");
    return;
  }

  // Make the API request
  fetch(`/api/login/user=${username}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ secureCode: secureCode }),
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid credentials");
        } else {
          throw new Error("Server error");
        }
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "ok") {
        // Store the session ID in localStorage
        localStorage.setItem("sessionId", data.logged_for_session);
        localStorage.setItem("username", username);

        // Redirect to dashboard with session ID in URL
        window.location.href = `/finder.html?l_s=${data.logged_for_session}`;
      } else {
        alert("Login failed: " + (data.message || "Unknown error"));
      }
    })
    .catch((error) => {
      console.error("Login error:", error);
      alert(error.message || "Login failed. Please try again.");
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const secureCodeInput = document.getElementById("secureCode");

  secureCodeInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });
});
