
document.addEventListener('DOMContentLoaded', () => {
    const modifyProfileBtn = document.getElementById('modifyProfileBtn');
    const modifyProfileForm = document.getElementById('modifyProfileForm');
    const updateProfileForm = document.getElementById('updateProfileForm');
    const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
    const displayName = document.getElementById('displayName');
    const displayEmail = document.getElementById('displayEmail');
    const notificationBanner = document.getElementById('notificationBanner');

    // Show the modify profile form
    modifyProfileBtn.addEventListener('click', () => {
        modifyProfileForm.style.display = 'block';
        modifyProfileBtn.style.display = 'none';
    });

    // Cancel updating the profile
    cancelUpdateBtn.addEventListener('click', () => {
        modifyProfileForm.style.display = 'none';
        modifyProfileBtn.style.display = 'inline-block';
    });

    // Display the notification banner
    const showNotification = (message, isSuccess = true) => {
        notificationBanner.textContent = message;
        notificationBanner.classList.toggle('error', !isSuccess);
        notificationBanner.classList.add('show');

        // Hide the banner after 3 seconds
        setTimeout(() => {
            notificationBanner.classList.remove('show');
        }, 3000);
    };

    // Submit the form via AJAX
    updateProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(updateProfileForm);
        fetch('/profile/update', {
            method: 'POST',
            body: new URLSearchParams(formData),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    // Update the displayed name and email dynamically
                    displayName.textContent = formData.get('name');
                    displayEmail.textContent = formData.get('email');

                    // Hide the form and show the button again
                    modifyProfileForm.style.display = 'none';
                    modifyProfileBtn.style.display = 'inline-block';

                    // Show success notification
                    showNotification(data.message || 'Profile updated successfully!', true);
                } else {
                    // Show error notification
                    showNotification(data.message || 'Error updating profile.', false);
                }
            })
            .catch((err) => {
                console.error(err);
                showNotification('An error occurred. Please try again.', false);
            });
    });
});
