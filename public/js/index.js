
// Get the user's login status from the data-loggedin attribute
const isLoggedIn = document.body.getAttribute('data-loggedin') === 'true';

document.getElementById('feedback-link').addEventListener('click', function (event) {
    event.preventDefault(); // Prevents default link behavior

    if (isLoggedIn) {
        // User is logged in, show the feedback form
        document.getElementById('feedback-section').style.display = 'flex';
    } else {
        // User is not logged in, show alert and redirect to login page
        alert('You must be logged in to provide feedback.');
        window.location.href = '/login';
    }
});

document.getElementById('close-feedback').addEventListener('click', function () {
    document.getElementById('feedback-section').style.display = 'none'; // Hide the feedback form
});

// Handle feedback form submission
document.getElementById('feedback-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const feedbackText = document.getElementById('feedback').value;

    fetch('/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedbackText }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert('Feedback submitted successfully!');
                document.getElementById('feedback').value = ''; // Clear textarea
                document.getElementById('feedback-section').style.display = 'none'; // Hide the form
            } else {
                alert(data.message || 'There was an error submitting your feedback.');
            }
        })
        .catch((err) => console.error('Error:', err));
});

// Prevent form submission and use AJAX to add item to cart
$('.add-to-cart-form').on('submit', function (event) {
    event.preventDefault();  // Prevent default form submission

    var $form = $(this);
    var itemId = $form.find('input[name="itemId"]').val();
    var name = $form.find('input[name="name"]').val();
    var price = $form.find('input[name="price"]').val();

    $.ajax({
        url: '/add-to-cart',  // Endpoint to handle adding item to cart
        method: 'POST',
        data: { itemId: itemId, name: name, price: price },
        success: function (response) {
            alert(response.message);  // Show the success message
        },
        error: function (xhr, status, error) {
            alert('Error adding item to cart');
            window.location.href = '/login';  // Redirect to login page if not logged in
        }
    });
});
