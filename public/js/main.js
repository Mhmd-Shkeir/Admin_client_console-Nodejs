// Add event listener for "Add to Cart"
$(document).ready(function () {
    // Handle add to cart
    $('.add-to-cart-form').submit(function (event) {
        event.preventDefault();

        // Send AJAX request to add the item to the cart
        var form = $(this);
        $.ajax({
            url: '/cart/add',
            method: 'POST',
            data: form.serialize(),  // Send form data (itemId, name, price)
            success: function (response) {
                // Show alert with the response from the server
                alert(response);  // This should show 'Item added to cart' or 'Item quantity updated'
            },
            error: function () {
                alert('An error occurred while adding the item to the cart');
            }
        });
    });
});


// Remove a single item from the cart
$('.remove-item').on('click', function () {
    const confirmClear = confirm('Are you sure you want to remove this item from the cart?');
    if (confirmClear) {
        const itemId = $(this).data('item-id');
        $.ajax({
            url: '/remove-item',  // Ensure the correct server-side endpoint
            method: 'POST',
            data: { itemId: itemId },
            success: function (response) {
                // Remove the item from the cart UI
                $(`[data-item-id=${itemId}]`).closest('.cart-item').remove();

                // Update the total
                updateCartTotal();

                // Check if the cart is empty by inspecting the cart container
                if ($('.cart-item').length === 0) {
                    alert('Your cart is empty.');
                    location.reload();  // Reload the page to update the cart view
                }
            },
            error: function () {
                alert('Error removing item');
            }
        });
        
    }
});



function updateCartTotal() {
    let total = 0;
    $('.cart-item').each(function () {
        const price = parseFloat($(this).find('.price').text().substring(1));
        const quantity = parseInt($(this).find('.quantity').text());
        total += price * quantity;
    });
    $('#cart-summary').text(`Total: $${total.toFixed(2)}`);
}

// Clear the entire cart
$('#remove-all').on('click', function () {
    const confirmClear = confirm('Are you sure you want to clear the entire cart?');
    if (confirmClear) {
        $.ajax({
            url: '/remove-all',  // Updated route
            method: 'POST',
            success: function (response) {
                alert('Cart cleared');
                location.reload();  // Reload to update the cart view
            },
            error: function (error) {
                alert('Error clearing cart');
            }
        });
    }
});




document.addEventListener('DOMContentLoaded', function () {
    // Handle the increase and decrease of item quantity
    document.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', function () {
            const itemId = this.getAttribute('data-item-id');
            const inputField = document.querySelector(`.quantity-input[data-item-id="${itemId}"]`);
            let currentQuantity = parseInt(inputField.value);

            // Ensure currentQuantity is a valid number
            if (isNaN(currentQuantity)) {
                currentQuantity = 1; // Default to 1 if invalid
            }

            // Increase or decrease quantity
            if (this.classList.contains('increase')) {
                if (currentQuantity < 50) {
                    currentQuantity++;
                }
            } else if (this.classList.contains('decrease')) {
                if (currentQuantity > 1) {
                    currentQuantity--;
                }
            }

            // Update the quantity value in the input field
            inputField.value = currentQuantity;

            // Update the backend and UI
            updateQuantityInServer(itemId, currentQuantity);
        });
    });

    // Handle direct input changes
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('input', function () {
            const itemId = this.getAttribute('data-item-id');
            let currentQuantity = parseInt(this.value);

            // Ensure quantity is within the allowed range
            if (isNaN(currentQuantity) || currentQuantity < 1) {
                currentQuantity = 1;
            } else if (currentQuantity > 50) {
                currentQuantity = 50;
            }

            // Update the quantity value in the input field
            this.value = currentQuantity;

            // Update the backend and UI
            updateQuantityInServer(itemId, currentQuantity);
        });
    });

    // Function to send the updated quantity to the server
    function updateQuantityInServer(itemId, quantity) {
        $.ajax({
            url: '/cart/update', // Server-side route for updating the cart
            method: 'POST',
            data: { itemId: itemId, quantity: quantity },
            success: function (response) {
                // Update the total price in the UI
                const item = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
                const priceText = item.querySelector('.item-price').innerText.replace('Price: $', '').trim();
                const price = parseFloat(priceText);

                if (!isNaN(price)) {
                    const total = price * quantity;

                    // Update the total price for this item
                    const totalElement = item.querySelector('.item-total');
                    totalElement.innerText = `Total: $${total.toFixed(2)}`;

                    // Update the cart summary
                    updateCartSummary();
                } else {
                    console.error(`Invalid price for item ID: ${itemId}`);
                }
            },
            error: function (error) {
                console.error('Error updating quantity on server:', error);
                alert('Failed to update the cart. Please try again.');
            }
        });
    }

    // Function to update the cart summary total
    function updateCartSummary() {
        let total = 0;

        // Sum up the totals for all cart items
        document.querySelectorAll('.cart-item').forEach(item => {
            const itemTotalText = item.querySelector('.item-total').innerText.replace('Total: $', '').trim();
            const itemTotal = parseFloat(itemTotalText);

            if (!isNaN(itemTotal)) {
                total += itemTotal;
            }
        });

        // Update the cart summary total in the DOM
        const cartSummary = document.querySelector('#cart-summary');
        if (cartSummary) {
            cartSummary.innerText = `Total: $${total.toFixed(2)}`;
        }
    }
});


