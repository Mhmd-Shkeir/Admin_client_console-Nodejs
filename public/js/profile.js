document.addEventListener('DOMContentLoaded', () => {
    const showWalletRequestsBtn = document.getElementById('show-wallet-requests-btn');
    const walletRequestsModal = document.getElementById('wallet-requests-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const acceptBtns = document.querySelectorAll('.accept-request');
    const declineBtns = document.querySelectorAll('.decline-request');
    const confirmActionBtn = document.getElementById('confirm-action');
    const cancelActionBtn = document.getElementById('cancel-action');
    const closeWalletRequestsModalBtn = document.getElementById('close-wallet-requests-modal');
    let selectedRequestId = null;
    let selectedAction = null;

    // Open Wallet Requests Modal when button is clicked
    showWalletRequestsBtn.addEventListener('click', () => {
        walletRequestsModal.style.display = 'flex';  // Show the wallet requests modal
    });

    // Close Wallet Requests Modal
    closeWalletRequestsModalBtn.addEventListener('click', () => {
        walletRequestsModal.style.display = 'none';  // Close the modal
    });

    // Handle the accept or decline request button click
    acceptBtns.forEach(button => {
        button.addEventListener('click', (e) => {
            selectedRequestId = e.target.getAttribute('data-request-id');
            selectedAction = 'accept'; // Set action to 'accept' for wallet approval
            confirmationModal.style.display = 'flex'; // Show the confirmation modal
        });
    });

    declineBtns.forEach(button => {
        button.addEventListener('click', (e) => {
            selectedRequestId = e.target.getAttribute('data-request-id');
            selectedAction = 'decline'; // Set action to 'decline' for wallet rejection
            confirmationModal.style.display = 'flex'; // Show the confirmation modal
        });
    });

    // Confirm the action (Accept or Decline)
    confirmActionBtn.addEventListener('click', () => {
        if (selectedRequestId && selectedAction) {
            fetch(`/admin/handle-wallet-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: selectedRequestId,
                    action: selectedAction
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Request processed successfully!');
                        window.location.reload();  // Reload to reflect changes
                    } else {
                        alert('Error processing the request');
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('Error processing the request');
                });
        }
        confirmationModal.style.display = 'none'; // Close the confirmation modal
    });

    // Cancel the action (close the confirmation modal)
    cancelActionBtn.addEventListener('click', () => {
        confirmationModal.style.display = 'none'; // Close the confirmation modal
    });
});
