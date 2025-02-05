document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent page reload

    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    if (username === "admin" && password === "1234") {
        alert("Login successful! Redirecting to the file upload page...");
        window.location.href = "upload.html"; // Redirect to upload page (we will create this later)
    } else {
        alert("Invalid username or password. Try again.");
    }
});
