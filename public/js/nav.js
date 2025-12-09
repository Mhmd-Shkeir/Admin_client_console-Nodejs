
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



document.addEventListener("DOMContentLoaded", function () {
    const popup = document.getElementById("items-popup");
    const itemsList = document.getElementById("items-list");
    const closePopup = document.getElementById("close-popup");

    // Fetch and show order items when the price button is clicked
    document.querySelectorAll(".price-btn").forEach((button) => {
        button.addEventListener("click", async function () {
            const orderId = this.getAttribute("data-order-id");

            try {
                const response = await fetch(`/orders/items?orderId=${orderId}`);
                const data = await response.json();

                // Handle success or failure from the server
                if (data.success) {
                    // Populate the items in the popup
                    itemsList.innerHTML = data.items
                        .map(
                            (item) => `
                                <div>
                                    <strong>${item.product_name}</strong>: ${item.quantity} × $${parseFloat(item.price).toFixed(2)}
                                </div>
                            `
                        )
                        .join("");
                } else {
                    // Show the error message from the server
                    itemsList.innerHTML = `<p>${data.message}</p>`;
                }

                // Show the popup
                popup.style.display = "flex";
            } catch (error) {
                // Display a generic error message in case of fetch failure
                itemsList.innerHTML = `<p>Failed to load order items. Please try again later.</p>`;
                popup.style.display = "flex";
            }
        });
    });

    // Close the popup
    closePopup.addEventListener("click", function () {
        popup.style.display = "none";
    });
});


