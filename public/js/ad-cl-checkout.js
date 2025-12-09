    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('confirmation-modal');
        const confirmBtn = document.getElementById('confirm-remove');
        const cancelBtn = document.getElementById('cancel-remove');
        const removeButtons = document.querySelectorAll('.remove-btn');
        let itemToRemove = null;

        // Show the confirmation dialog when "Remove" button is clicked
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                itemToRemove = e.target.dataset.itemId;
                modal.style.display = 'block';  // Show modal
            });
        });

        // Confirm the removal
        confirmBtn.addEventListener('click', () => {
            fetch(`/admin/remove-cart-item/${itemToRemove}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Item removed successfully!');
                        window.location.reload();  // Reload the page to reflect changes
                    } else {
                        alert('Error removing item.');
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('Error removing item.');
                });

            modal.style.display = 'none';  // Close modal after confirmation
        });

        // Cancel the removal
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';  // Hide modal if canceled
        });
    });


    document.addEventListener('DOMContentLoaded', () => {
        const payWalletBtn = document.getElementById('payWalletBtn');
        const modal = document.getElementById('confirmation-modal');
        const confirmPaymentBtn = document.getElementById('confirm-payment');
        const cancelPaymentBtn = document.getElementById('cancel-payment');

        const clientId = "<%= clientId %>"; // Pass the clientId dynamically to the script

        // Show the modal when the button is clicked
        payWalletBtn.addEventListener('click', () => {
            modal.style.display = 'flex'; // Show modal
        });

        // Confirm payment
        confirmPaymentBtn.addEventListener('click', () => {
            fetch(`/admin/admin-cl-checkout/${clientId}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Empty body for wallet payment
            })
                .then(response => {
                    if (response.ok) {
                        alert('Wallet payment successful!');
                        window.location.href = `/admin/client-orders/${clientId}`;
                    } else {
                        response.text().then(err => alert(`Error: ${err}`));
                    }
                })
                .catch(err => {
                    console.error('Error processing payment:', err);
                    alert('Error processing wallet payment. Please try again.');
                });

            modal.style.display = 'none'; // Hide modal
        });

        // Cancel payment
        cancelPaymentBtn.addEventListener('click', () => {
            modal.style.display = 'none'; // Hide modal
        });
    });

