

document.getElementById('deleteAccount').addEventListener('click', function () {
    if (confirm("Are you sure you want to delete your account? This action is irreversible.")) {
        fetch('/delete-account', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then((response) => response.json())
        .then((data) => {
            alert(data.message);
            if (data.success) {
                window.location.href = '/'; // Redirect to homepage or login
            }
        })
        .catch((error) => console.error('Error:', error));
    }
});



document.addEventListener("DOMContentLoaded", function () {
    // Get all the navigation links
    const navLinks = document.querySelectorAll('.nav-links a');

    // Get the current URL
    const currentUrl = window.location.pathname;

    // Loop through all links and add the 'active' class to the matching one
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentUrl) {
            link.classList.add('active');
        }
    });
});