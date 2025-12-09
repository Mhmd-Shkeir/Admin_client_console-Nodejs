
        // Remove a single item from the cart
        document.querySelectorAll(".remove-item").forEach((button) => {
            button.addEventListener("click", async function () {
                const itemId = this.dataset.itemId;
                const clientId = this.dataset.clientId;

                if (!confirm("Are you sure you want to remove this item?")) return;

                try {
                    const response = await fetch(`/admin/client-cart/${clientId}/remove-item`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ itemId }),
                    });

                    const result = await response.json();
                    if (result.success) {
                        alert("Item removed successfully.");
                        location.reload(); // Reload the page to reflect changes
                    } else {
                        alert("Error removing item.");
                    }
                } catch (err) {
                    console.error("Error:", err);
                    alert("An error occurred while removing the item.");
                }
            });
        });

        // Clear all items from the cart
        document.querySelector("#remove-all-btn").addEventListener("click", async () => {
            const clientId = document.querySelector("#clientId").value; // Ensure clientId is set
            if (!confirm("Are you sure you want to empty the cart?")) return;
            const response = await fetch(`/admin/client-cart/${clientId}/remove-all`, {
                method: "POST",
            });

            const data = await response.json();

            if (data.success) {
                alert("All items removed successfully!");
                location.reload(); // Reload the page to reflect changes
            } else {
                alert(data.message || "Failed to clear cart");
            }
        });

        // Update the total price dynamically when product or quantity changes
        document.getElementById("product-name").addEventListener("change", updatePrice);
        document.getElementById("quantity").addEventListener("input", updatePrice);

        function updatePrice() {
            const productSelect = document.getElementById("product-name");
            const quantityInput = document.getElementById("quantity");
            const price = parseFloat(productSelect.options[productSelect.selectedIndex].getAttribute("data-price"));
            const quantity = parseInt(quantityInput.value);
            const totalPrice = (price * quantity).toFixed(2);
            document.getElementById("total-price").innerText = `Total Price: $${totalPrice}`;
        }

        // Submit the form for adding item to cart
        document.getElementById('add-item').addEventListener('submit', async function (event) {
            event.preventDefault();

            const productId = document.getElementById('product-name').value;
            const quantity = document.getElementById('quantity').value;
            const price = parseFloat(document.getElementById('product-name').selectedOptions[0]?.getAttribute('data-price') || 0);

            if (!productId || !quantity || !price) {
                alert("All fields are required!");
                return;
            }

            const clientId = document.getElementById('clientId').value;
            const response = await fetch(`/admin/client-cart/${clientId}/add-item`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    quantity,
                    price
                }),
            });

            const result = await response.json();
            if (result.success) {
                alert('Item added to cart successfully!');
                location.reload(); // Reload to see the changes
            } else {
                alert(result.message || 'Error adding item.');
            }
        });

        // Increment or decrement item quantity
        document.querySelectorAll(".quantity-btn").forEach((button) => {
            button.addEventListener("click", async function () {
                const itemId = this.dataset.itemId;
                const clientId = this.dataset.clientId;
                const isIncrement = this.classList.contains("increase-btn");

                try {
                    const response = await fetch(`/admin/client-cart/${clientId}/update-quantity`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            itemId,
                            change: isIncrement ? 1 : -1, // +1 for increment, -1 for decrement
                        }),
                    });

                    const result = await response.json();
                    if (result.success) {
                        // Update quantity and total price dynamically without refreshing
                        const quantitySpan = this.parentElement.querySelector(".quantity-value");
                        const totalSpan = this.closest(".cart-item").querySelector(".item-total");

                        const newQuantity = result.newQuantity;
                        const itemPrice = parseFloat(result.itemPrice);

                        quantitySpan.innerText = newQuantity;
                        totalSpan.innerText = `Total: $${(newQuantity * itemPrice).toFixed(2)}`;
                    } else {
                        alert(result.message || "Error updating quantity.");
                    }
                } catch (err) {
                    console.error("Error:", err);
                    alert("An error occurred while updating quantity.");
                }
            });
        });
        document.querySelectorAll(".quantity-btn").forEach((button) => {
            button.addEventListener("click", async function () {
                const itemId = this.dataset.itemId;
                const clientId = this.dataset.clientId;
                const isIncrement = this.classList.contains("increase-btn");

                try {
                    const response = await fetch(`/admin/client-cart/${clientId}/update-quantity`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            itemId,
                            change: isIncrement ? 1 : -1, // +1 for increment, -1 for decrement
                        }),
                    });

                    const result = await response.json();
                    if (result.success) {
                        // Update quantity and total price dynamically
                        const quantitySpan = this.parentElement.querySelector(".quantity-value");
                        const totalSpan = this.closest(".cart-item").querySelector(".item-total");

                        const newQuantity = result.newQuantity;
                        const itemPrice = parseFloat(result.itemPrice);

                        quantitySpan.innerText = newQuantity;
                        totalSpan.innerText = `Total: $${(newQuantity * itemPrice).toFixed(2)}`;

                        // Update the overall cart summary
                        updateCartSummary();
                    } else {
                        alert(result.message || "Error updating quantity.");
                    }
                } catch (err) {
                    console.error("Error:", err);
                    alert("An error occurred while updating quantity.");
                }
            });
        });

        // Function to update the overall cart summary total
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
            const cartSummary = document.querySelector('#cart-summary h3');
            if (cartSummary) {
                cartSummary.innerText = `Total: $${total.toFixed(2)}`;
            }
        }


        // Handle the Checkout Action
        document.getElementById("checkout-btn").addEventListener("click", async function () {
            const clientId = document.getElementById("clientId").value;
            const totalPrice = parseFloat(document.querySelector("#cart-summary h3").innerText.replace("Total: $", "").trim());

            if (isNaN(totalPrice) || totalPrice <= 0) {
                alert("Please ensure there are items in the cart before proceeding.");
                return;
            }

            if (!confirm("Are you sure you want to proceed with the checkout?")) return;

            try {
                const response = await fetch(`/admin/client-cart/${clientId}/checkout`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        clientId,
                        totalPrice,
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    alert("Checkout successful! Redirecting to the orders page.");
                    window.location.href = "/orders"; // Redirect to orders page
                } else {
                    alert("Error processing checkout: " + result.message);
                }
            } catch (err) {
                console.error("Error during checkout:", err);
                alert("An error occurred while processing the checkout.");
            }
        });
    
        document.addEventListener('DOMContentLoaded', function () {
            const checkoutBtn = document.getElementById('checkout-btn');

            checkoutBtn.addEventListener('click', function () {
                const clientId = document.getElementById('clientId').value;

                // Proceed to Checkout
                fetch(`/admin/client-cart/${clientId}/checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // Send any additional payment details or data needed for the checkout
                        paymentDetails: {
                            // Example payment details structure
                            cardholder: 'John Doe',
                            cardNumber: '1234 5678 1234 5678',
                            expirationDate: '12/25',
                            cvc: '123'
                        }
                    }),
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Handle successful checkout (e.g., redirect to a confirmation page)
                            alert('Checkout successful! Proceeding to confirmation.');
                            window.location.href = `/order-confirmation/${data.orderId}`;
                        } else {
                            // Handle failure (e.g., show an error message)
                            alert('Error during checkout: ' + data.error);
                        }
                    })
                    .catch(error => {
                        alert('There was a problem with the checkout: ' + error);
                    });
            });
        });

    